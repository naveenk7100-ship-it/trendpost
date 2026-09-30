import { describe, it, expect, beforeEach, vi } from 'vitest';
import { runDailyPipeline } from '@/lib/pipeline/daily-pipeline';
import { runTelegramDeliveryPipeline } from '@/lib/pipeline/delivery-pipeline';
import { ClaimManager } from '@/lib/claims/claim-manager';
import { repository } from '@/lib/db/repository';
import { TelegramBotService } from '@/lib/telegram/bot';
import { User, RawTrendItem, ContentIdea } from '@/types';

// Mock trend providers to return deterministic mock raw trends instantly
vi.mock('@/lib/providers', () => ({
  fetchAllTrendProviders: vi.fn().mockResolvedValue({
    items: [
      {
        source: 'google_trends',
        external_id: 'gt-101',
        title: 'Chandrayaan 4 Mission Launch',
        description: 'ISRO announces lunar sample return mission timeline',
        url: 'https://trends.google.com/sample',
        source_timestamp: new Date().toISOString(),
        raw_metadata: {},
        region: 'IN',
        category: 'Science & Tech',
        volume: 250000,
        velocity: 12000,
      },
      {
        source: 'reddit',
        external_id: 'reddit-101',
        title: 'Chandrayaan 4 Mission Launch Updates',
        description: 'Discussion on r/india regarding ISRO timeline',
        url: 'https://reddit.com/r/india/sample',
        source_timestamp: new Date().toISOString(),
        raw_metadata: {},
        region: 'IN',
        category: 'India Communities',
        volume: 50000,
        velocity: 6000,
      },
      {
        source: 'youtube',
        external_id: 'yt-101',
        title: 'New Electric SUV Released in India',
        description: 'Automobile review and pricing details',
        url: 'https://youtube.com/watch?v=sample',
        source_timestamp: new Date().toISOString(),
        raw_metadata: {},
        region: 'IN',
        category: 'Autos',
        volume: 80000,
        velocity: 4000,
      },
      {
        source: 'x',
        external_id: 'x-101',
        title: 'IPL 2026 Mega Auction Rules',
        description: 'BCCI announces retention regulations',
        url: 'https://x.com/sample',
        source_timestamp: new Date().toISOString(),
        raw_metadata: {},
        region: 'IN',
        category: 'Sports',
        volume: 400000,
        velocity: 18000,
      }
    ] as RawTrendItem[],
    providersSucceeded: ['google_trends', 'reddit', 'youtube', 'x'],
    providersFailed: [],
    totalRawCount: 4,
  }),
}));

// Mock Claude generator to immediately return compliant structured output without external API delays
vi.mock('@/lib/ai/claude', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/ai/claude')>();
  return {
    ...actual,
    ClaudeContentGenerator: class {
      async testConnection() {
        return { success: true, message: 'Mocked Claude Connected' };
      }
      async generateContentForTopic(topic: any) {
        return {
          hook: `Why everyone in India is talking about ${topic.title}`,
          reel_script: {
            hook_3s: `Wait till you hear this about ${topic.title}...`,
            body_30s: `Here is the full breakdown of what just happened regarding ${topic.title}. Across India, millions of people are reacting to these new updates.`,
            payoff: `This sets a brand new milestone for the entire industry.`,
            cta: `Drop your thoughts below and follow TrendPost!`,
            estimated_duration_seconds: 30,
            visual_cues: ['Visual Headline', 'Data Infographic'],
          },
          captions: [
            `Option 1: Major update on ${topic.title}. What is your take?`,
            `Option 2: Everything you need to know about ${topic.title} in 60 seconds.`,
            `Option 3: Is this the biggest development of the week? Comment below.`,
          ] as [string, string, string],
          hashtags: [
            '#trendpost', '#india', '#trending', '#viral', '#dailyupdates',
            '#tech', '#news', '#insights', '#explorepage', '#reelsindia',
            '#contentcreator', '#discussion', '#latestnews', '#breaking', '#analysis'
          ],
          carousel_outline: {
            hook_slide: {
              slide_number: 1,
              type: 'hook',
              headline: topic.title,
              content: 'What you need to know today.',
            },
            content_slides: [
              {
                slide_number: 2,
                type: 'content',
                headline: 'The Core Story',
                content: topic.description || 'Details emerging from multiple sources.',
              },
              {
                slide_number: 3,
                type: 'content',
                headline: 'Why It Matters',
                content: `Virality score of ${topic.virality_score}/100 indicates massive public engagement.`,
              },
            ],
            cta_slide: {
              slide_number: 4,
              type: 'cta',
              headline: 'Save This Post',
              content: 'Follow for daily high-signal trend reports.',
            },
          },
          recommended_post_time: {
            date: '2026-09-30',
            time: '18:30',
            iso_timestamp: '2026-09-30T13:00:00Z',
            timezone: 'Asia/Kolkata',
            reasoning: 'Peak evening commuter engagement across Indian metros',
          },
          content_angle: 'news-style',
        };
      }
    },
  };
});

describe('End-to-End Pipeline Integration Test', () => {
  const users: User[] = [
    {
      id: 'a0000000-0000-0000-0000-000000000001',
      email: 'person.a@trendpost.local',
      name: 'Person A',
      role: 'admin',
      telegram_chat_id: '123456781',
      telegram_enabled: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'b0000000-0000-0000-0000-000000000002',
      email: 'person.b@trendpost.local',
      name: 'Person B',
      role: 'member',
      telegram_chat_id: '123456782',
      telegram_enabled: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  beforeEach(() => {
    ClaimManager.resetForTesting();
  });

  it('runs complete flow: fetch -> score -> top 10 -> generate -> save -> claim -> deliver', async () => {
    // 1. Run Daily Pipeline
    const pipelineResult = await runDailyPipeline({
      type: 'scheduled_daily',
      customRunId: 'integration-test-run-1',
    });

    expect(pipelineResult.runId).toBe('integration-test-run-1');
    expect(pipelineResult.topicsFound).toBeGreaterThanOrEqual(3);
    expect(pipelineResult.top10Count).toBeLessThanOrEqual(10);
    expect(pipelineResult.contentIdeas).toHaveLength(pipelineResult.top10Count);

    // 2. Verify all generated ideas have complete structured fields
    for (const idea of pipelineResult.contentIdeas) {
      expect(idea.hook).toBeDefined();
      expect(idea.reel_script.hook_3s).toBeDefined();
      expect(idea.reel_script.body_30s).toBeDefined();
      expect(idea.captions).toHaveLength(3);
      expect(idea.hashtags).toHaveLength(15);
      expect(idea.carousel_outline.hook_slide).toBeDefined();
      expect(idea.recommended_post_time).toBeDefined();
      expect(idea.post_time_timezone).toBe('Asia/Kolkata');
    }

    // 3. Save to database repository
    await repository.saveTopics(pipelineResult.topics);
    await repository.saveContentIdeas(pipelineResult.contentIdeas);

    const savedIdeas = await repository.getContentIdeas();
    expect(savedIdeas.length).toBeGreaterThanOrEqual(pipelineResult.contentIdeas.length);

    // 4. Test atomic claim by Person A on the first idea
    const firstIdea = savedIdeas[0];
    const claimRes = await repository.claimIdea(firstIdea.id, users[0].id);
    expect(claimRes.success).toBe(true);

    // Person B attempting to claim must be blocked
    const claimResB = await repository.claimIdea(firstIdea.id, users[1].id);
    expect(claimResB.success).toBe(false);

    // 5. Test Telegram delivery of Top 5
    const mockBot = new TelegramBotService();
    mockBot.sendMessage = async (chatId, text, markup) => {
      return { success: true, messageId: `msg-${Date.now()}` };
    };

    const deliveryResult = await runTelegramDeliveryPipeline({
      ideas: savedIdeas,
      users,
      limit: 5,
      bot: mockBot,
    });

    expect(deliveryResult.totalDelivered).toBeGreaterThan(0);
    expect(deliveryResult.deliveries.length).toBeGreaterThan(0);

    // Verify delivered format
    const sampleDelivery = deliveryResult.deliveries[0];
    expect(sampleDelivery.delivery_status).toBe('sent');
    expect(sampleDelivery.user_id).toBeDefined();
    expect(sampleDelivery.telegram_message_id).toBeDefined();
  });
});
