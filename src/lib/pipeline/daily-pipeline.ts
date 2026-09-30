import { fetchAllTrendProviders } from '@/lib/providers';
import { normalizeAndDeduplicate } from '@/lib/normalization/deduplicator';
import { scoreAndRankTopics } from '@/lib/scoring/scorer';
import { generateContentUnified } from '@/lib/ai';
import { ContentIdea, NormalizedTopic } from '@/types';
import { repository } from '@/lib/db/repository';
import { logger } from '@/lib/logger';
import { nowUTC } from '@/lib/config';

export interface DailyPipelineResult {
  runId: string;
  status: 'completed' | 'partial' | 'failed';
  topicsFound: number;
  top10Count: number;
  contentIdeasGenerated: number;
  providersSucceeded: string[];
  providersFailed: { provider: string; error: string }[];
  topics: NormalizedTopic[];
  contentIdeas: ContentIdea[];
  durationMs: number;
}

// Global flag to prevent concurrent duplicate pipeline executions
const globalForPipeline = globalThis as unknown as { __trendpost_pipeline_running__?: boolean };

export async function runDailyPipeline(options?: {
  type?: 'scheduled_daily' | 'manual_refresh';
  customRunId?: string;
  openRouterApiKey?: string;
  openRouterModel?: string;
  anthropicApiKey?: string;
  youtubeApiKey?: string;
  xBearerToken?: string;
}): Promise<DailyPipelineResult> {
  const startTime = Date.now();
  const runId = options?.customRunId || `run-${Date.now()}`;
  const runType = options?.type || 'scheduled_daily';

  if (globalForPipeline.__trendpost_pipeline_running__) {
    logger.warn({
      service: 'pipeline',
      event: 'PIPELINE_CONCURRENCY_BLOCKED',
      message: 'A pipeline execution is already in progress. Ignoring duplicate trigger.',
      runId,
    });
    // Return last recorded run or empty safely
    const existingTopics = await repository.getTopics();
    const existingIdeas = await repository.getContentIdeas();
    return {
      runId,
      status: 'completed',
      topicsFound: existingTopics.length,
      top10Count: existingTopics.filter(t => t.is_top_10).length,
      contentIdeasGenerated: existingIdeas.length,
      providersSucceeded: ['cached'],
      providersFailed: [],
      topics: existingTopics,
      contentIdeas: existingIdeas,
      durationMs: 0,
    };
  }

  globalForPipeline.__trendpost_pipeline_running__ = true;

  try {
    logger.info({
      service: 'pipeline',
      event: 'PIPELINE_START',
      message: `Starting ${runType} pipeline (Run ID: ${runId})`,
      runId,
    });

    // Step 1: Concurrent fetch across providers
    const fetchResult = await fetchAllTrendProviders({
      runId,
      youtubeApiKey: options?.youtubeApiKey,
      xBearerToken: options?.xBearerToken,
    });

    // Step 2: Normalize and deduplicate across platforms
    const normalized = normalizeAndDeduplicate(fetchResult.items);

    // Step 3: Transparent virality scoring and top-10 ranking
    const scoredTopics = scoreAndRankTopics(normalized, 10);
    const top10Topics = scoredTopics.filter(t => t.is_top_10);

    logger.info({
      service: 'pipeline',
      event: 'SCORING_FINISHED',
      message: `Scored ${scoredTopics.length} deduplicated topics. Selected Top ${top10Topics.length} for AI content generation`,
      metadata: {
        totalDeduplicated: scoredTopics.length,
        top10Titles: top10Topics.map(t => `${t.title} (${t.virality_score})`),
      },
      runId,
    });

    // Step 4: AI Generation (OpenRouter primary, Development AI fallback)
    // Rate-limit protection: Reuse existing content ideas if already generated for this topic
    const existingIdeas = await repository.getContentIdeas();
    const contentIdeas: ContentIdea[] = [];

    for (const topic of top10Topics) {
      const topicId = topic.id || `topic-${topic.external_id}`;

      // Check if idea was already generated for this topic to protect daily quota
      const existing = existingIdeas.find(i =>
        i.topic_id === topicId ||
        (i.topic?.normalized_title && i.topic.normalized_title === topic.normalized_title)
      );

      if (existing && existing.generation_status !== 'failed') {
        logger.info({
          service: 'pipeline',
          event: 'REUSING_EXISTING_IDEA',
          message: `Reusing existing content idea for "${topic.title}" to protect rate limits`,
          metadata: { topicId, ideaId: existing.id },
          runId,
        });
        contentIdeas.push(existing);
        continue;
      }

      const ideaId = `idea-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      try {
        const { content: generated, isDevelopmentContent, providerUsed, modelUsed, generationStatus } = await generateContentUnified(topic, {
          apiKey: options?.openRouterApiKey,
          model: options?.openRouterModel,
          runId,
        });

        contentIdeas.push({
          id: ideaId,
          topic_id: topicId,
          topic,
          reel_script: generated.reel_script,
          hook: generated.hook,
          captions: generated.captions,
          hashtags: generated.hashtags,
          carousel_outline: generated.carousel_outline,
          recommended_post_time: generated.recommended_post_time.iso_timestamp,
          post_time_timezone: generated.recommended_post_time.timezone,
          content_angle: generated.content_angle,
          generation_status: generationStatus,
          delivery_status: 'pending',
          approval_status: 'pending',
          is_development_content: isDevelopmentContent,
          ai_provider_used: providerUsed,
          ai_model: modelUsed,
          created_at: nowUTC(),
          updated_at: nowUTC(),
        });
      } catch (genError) {
        const errMsg = genError instanceof Error ? genError.message : String(genError);
        logger.warn({
          service: 'pipeline',
          event: 'AI_GENERATION_TOPIC_FAILED',
          message: `AI generation failed for topic "${topic.title}": ${errMsg}`,
          metadata: { topic: topic.title, error: errMsg },
          runId,
        });

        contentIdeas.push({
          id: ideaId,
          topic_id: topicId,
          topic,
          reel_script: {
            hook_3s: `Wait till you hear about ${topic.title}...`,
            body_30s: `Here is what is currently trending across India regarding ${topic.title}.`,
            payoff: 'Stay tuned for more updates on this story.',
            cta: 'Drop your opinion in the comments below!',
            estimated_duration_seconds: 30,
          },
          hook: `Everything you need to know about ${topic.title}`,
          captions: [
            `Major developments around ${topic.title}. What are your thoughts?`,
            `Trending right now: ${topic.title}. Full breakdown inside.`,
            `Is this the biggest story today? Let's discuss ${topic.title}.`,
          ],
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
              content: topic.description || 'Trending discussion breakdown',
            },
            content_slides: [
              {
                slide_number: 2,
                type: 'content',
                headline: 'What Happened?',
                content: topic.description || 'Details emerging from multiple sources.',
              },
              {
                slide_number: 3,
                type: 'content',
                headline: 'Why It Matters',
                content: `Virality score of ${topic.virality_score}/100 indicates significant public engagement.`,
              },
            ],
            cta_slide: {
              slide_number: 4,
              type: 'cta',
              headline: 'Save & Share',
              content: 'Follow for daily high-signal trend reports.',
            },
          },
          recommended_post_time: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
          post_time_timezone: 'Asia/Kolkata',
          content_angle: 'news-style',
          generation_status: 'failed',
          delivery_status: 'pending',
          approval_status: 'pending',
          is_development_content: true,
          ai_provider_used: 'development',
          ai_model: 'fallback',
          created_at: nowUTC(),
          updated_at: nowUTC(),
        });
      }
    }

    const durationMs = Date.now() - startTime;
    const status = fetchResult.providersFailed.length === 0 ? 'completed' : 'partial';

    logger.info({
      service: 'pipeline',
      event: 'PIPELINE_COMPLETE',
      message: `Pipeline finished in ${durationMs}ms with status: ${status}`,
      metadata: {
        topicsFound: scoredTopics.length,
        top10Count: top10Topics.length,
        contentIdeasGenerated: contentIdeas.length,
      },
      runId,
      durationMs,
    });

    // Persist topics and content ideas directly so they are always stored regardless of caller
    await repository.saveTopics(scoredTopics);
    await repository.saveContentIdeas(contentIdeas);

    return {
      runId,
      status,
      topicsFound: scoredTopics.length,
      top10Count: top10Topics.length,
      contentIdeasGenerated: contentIdeas.length,
      providersSucceeded: fetchResult.providersSucceeded,
      providersFailed: fetchResult.providersFailed,
      topics: scoredTopics,
      contentIdeas,
      durationMs,
    };
  } finally {
    globalForPipeline.__trendpost_pipeline_running__ = false;
  }
}
