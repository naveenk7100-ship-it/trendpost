import { describe, it, expect } from 'vitest';
import { GeneratedContentSchema } from '@/lib/ai/claude';

describe('AI Content Generation Zod Schema Validation', () => {
  it('validates a complete, compliant Claude AI generation payload', () => {
    const validPayload = {
      hook: 'Most people have no idea how close India is to this energy milestone.',
      reel_script: {
        hook_3s: 'Stop scrolling: This changes Indian energy forever.',
        body_30s: 'Today a massive solar corridor went live across Rajasthan. It generates enough clean gigawatts to power 40 million homes with zero emissions.',
        payoff: 'India just crossed 50% renewable capacity 4 years ahead of schedule.',
        cta: 'Share this with someone proud of Indian innovation!',
        estimated_duration_seconds: 30,
        visual_cues: ['Drone shot of solar field', 'Infographic counter'],
      },
      captions: [
        'Option 1: Clean energy revolution in India is happening faster than predicted.',
        'Option 2: Deep dive into the new green energy corridors powering 40M homes.',
        'Option 3: Are we witnessing the biggest infrastructure leap of the decade? Let us know below.',
      ],
      hashtags: [
        '#india', '#renewableenergy', '#cleanenergy', '#greenindia', '#solarpower',
        '#infrastructure', '#sustainability', '#techindia', '#innovations', '#futureenergy',
        '#makeinindia', '#energytransition', '#greenfuture', '#viralindia', '#dailyupdates'
      ],
      carousel_outline: {
        hook_slide: {
          slide_number: 1,
          type: 'hook',
          headline: 'How India Beat Its Own 2030 Clean Energy Goal in 2026',
          content: 'A breakthrough nobody saw coming.',
        },
        content_slides: [
          {
            slide_number: 2,
            type: 'content',
            headline: 'The Rajasthan Corridor',
            content: '40 gigawatts of peak capacity connected to the national grid.',
          },
          {
            slide_number: 3,
            type: 'content',
            headline: 'What It Means for You',
            content: 'Lower grid costs and accelerated EV adoption.',
          },
        ],
        cta_slide: {
          slide_number: 4,
          type: 'cta',
          headline: 'Save this post for reference',
          content: 'Follow TrendPost for daily breakdowns of viral stories.',
        },
      },
      recommended_post_time: {
        date: '2026-09-30',
        time: '19:00',
        iso_timestamp: '2026-09-30T13:30:00Z',
        timezone: 'Asia/Kolkata',
        reasoning: 'Peak evening commuter engagement across Indian metros',
      },
      content_angle: 'educational',
    };

    const parsed = GeneratedContentSchema.safeParse(validPayload);
    expect(parsed.success).toBe(true);
  });

  it('rejects payload if hashtags count is not exactly 15', () => {
    const invalidHashtagsPayload = {
      hook: 'Valid Hook for test',
      reel_script: {
        hook_3s: 'Hook 3s',
        body_30s: 'Body text exceeding minimum characters requirement',
        payoff: 'Payoff conclusion',
        cta: 'CTA follow',
        estimated_duration_seconds: 30,
      },
      captions: ['Cap 1 option text', 'Cap 2 option text', 'Cap 3 option text'],
      hashtags: ['#onlythree', '#tags', '#here'], // INVALID: only 3 instead of 15
      carousel_outline: {
        hook_slide: { slide_number: 1, type: 'hook', headline: 'Head', content: 'Cont' },
        content_slides: [
          { slide_number: 2, type: 'content', headline: 'H2', content: 'Content body details' },
          { slide_number: 3, type: 'content', headline: 'H3', content: 'Content body details' },
        ],
        cta_slide: { slide_number: 4, type: 'cta', headline: 'CTA', content: 'Follow us' },
      },
      recommended_post_time: {
        date: '2026-09-30',
        time: '19:00',
        iso_timestamp: '2026-09-30T13:30:00.000Z',
        timezone: 'Asia/Kolkata',
        reasoning: 'Good engagement window',
      },
      content_angle: 'curiosity',
    };

    const parsed = GeneratedContentSchema.safeParse(invalidHashtagsPayload);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.some(i => i.message.includes('15 hashtags'))).toBe(true);
    }
  });

  it('rejects payload if captions are fewer than 3 options', () => {
    const invalidCaptionsPayload = {
      hook: 'Valid Hook for test',
      reel_script: {
        hook_3s: 'Hook 3s',
        body_30s: 'Body text exceeding minimum characters requirement',
        payoff: 'Payoff conclusion',
        cta: 'CTA follow',
        estimated_duration_seconds: 30,
      },
      captions: ['Single Caption Only'], // INVALID
      hashtags: Array.from({ length: 15 }, (_, i) => `#tag${i}`),
      carousel_outline: {
        hook_slide: { slide_number: 1, type: 'hook', headline: 'Head', content: 'Cont' },
        content_slides: [
          { slide_number: 2, type: 'content', headline: 'H2', content: 'Content body details' },
          { slide_number: 3, type: 'content', headline: 'H3', content: 'Content body details' },
        ],
        cta_slide: { slide_number: 4, type: 'cta', headline: 'CTA', content: 'Follow us' },
      },
      recommended_post_time: {
        date: '2026-09-30',
        time: '19:00',
        iso_timestamp: '2026-09-30T13:30:00.000Z',
        timezone: 'Asia/Kolkata',
        reasoning: 'Reasoning string here',
      },
      content_angle: 'curiosity',
    };

    const parsed = GeneratedContentSchema.safeParse(invalidCaptionsPayload);
    expect(parsed.success).toBe(false);
  });

  it('verifies DevelopmentAiGenerator creates valid test content clearly marked as [DEVELOPMENT TEST CONTENT]', async () => {
    const { DevelopmentAiGenerator } = await import('@/lib/ai/dev-generator');
    const devGen = new DevelopmentAiGenerator();

    const topic = {
      source: 'google_trends' as const,
      external_id: 'gt-test',
      title: 'India Semi-Conductor Fabrication Plant',
      normalized_title: 'india semi conductor fabrication plant',
      description: 'Major industrial tech manufacturing announcement in Gujarat',
      category: 'Tech',
      volume: 120000,
      velocity: 8000,
      source_timestamp: new Date().toISOString(),
      fetched_at: new Date().toISOString(),
      freshness_score: 90,
      volume_score: 75,
      velocity_score: 70,
      instagram_fit_score: 85,
      cross_platform_score: 65,
      virality_score: 78,
      is_top_10: true,
      raw_metadata: {},
      region: 'IN',
    };

    const output = await devGen.generateContentForTopic(topic);

    expect(output.hook).toContain('[DEVELOPMENT TEST CONTENT]');
    expect(output.reel_script.hook_3s).toContain('[DEVELOPMENT TEST CONTENT]');
    expect(output.captions).toHaveLength(3);
    expect(output.captions[0]).toContain('[DEVELOPMENT TEST CONTENT]');
    expect(output.hashtags).toHaveLength(15);
    expect(output.hashtags).toContain('#trendpost_dev');
    expect(output.carousel_outline.hook_slide).toBeDefined();
    expect(output.recommended_post_time.timezone).toBe('Asia/Kolkata');
  });
});
