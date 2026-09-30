import { NextRequest, NextResponse } from 'next/server';
import { repository } from '@/lib/db/repository';
import { generateContentUnified } from '@/lib/ai';
import { fetchAllTrendProviders } from '@/lib/providers';
import { normalizeAndDeduplicate } from '@/lib/normalization/deduplicator';
import { scoreAndRankTopics } from '@/lib/scoring/scorer';
import { ContentIdea, NormalizedTopic } from '@/types';
import { logger } from '@/lib/logger';
import { nowUTC } from '@/lib/config';

export async function POST(req: NextRequest) {
  try {
    const runId = `ideas-gen-${Date.now()}`;
    let topics = await repository.getTopics();
    const existingIdeas = await repository.getContentIdeas();

    // If no topics exist in the repository yet, fetch and score fresh trends
    if (topics.length === 0) {
      logger.info({
        service: 'api/ideas/generate',
        event: 'FETCHING_TRENDS_FOR_IDEAS',
        message: 'No topics in store. Fetching fresh trends before generating ideas.',
        runId,
      });
      const fetchResult = await fetchAllTrendProviders({ runId });
      const normalized = normalizeAndDeduplicate(fetchResult.items);
      topics = scoreAndRankTopics(normalized, 10);
      await repository.saveTopics(topics);
    }

    const topTopics = topics.filter(t => t.is_top_10);
    const topicsToProcess = topTopics.length > 0 ? topTopics : topics.slice(0, 10);

    const generatedIdeas: ContentIdea[] = [];

    for (const topic of topicsToProcess) {
      const topicId = topic.id || `topic-${topic.external_id}`;
      
      // Check if an idea already exists for this topic
      const existing = existingIdeas.find(i =>
        i.topic_id === topicId ||
        (i.topic?.normalized_title && i.topic.normalized_title === topic.normalized_title)
      );

      if (existing && existing.generation_status !== 'failed') {
        generatedIdeas.push(existing);
        continue;
      }

      const ideaId = `idea-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const { content, isDevelopmentContent, providerUsed, modelUsed, generationStatus } = await generateContentUnified(topic, {
        runId,
      });

      const newIdea: ContentIdea = {
        id: ideaId,
        topic_id: topicId,
        topic,
        reel_script: content.reel_script,
        hook: content.hook,
        captions: content.captions,
        hashtags: content.hashtags,
        carousel_outline: content.carousel_outline,
        recommended_post_time: content.recommended_post_time.iso_timestamp,
        post_time_timezone: content.recommended_post_time.timezone,
        content_angle: content.content_angle,
        generation_status: generationStatus,
        delivery_status: 'pending',
        approval_status: 'pending',
        is_development_content: isDevelopmentContent,
        ai_provider_used: providerUsed,
        ai_model: modelUsed,
        created_at: nowUTC(),
        updated_at: nowUTC(),
      };

      generatedIdeas.push(newIdea);
    }

    await repository.saveContentIdeas(generatedIdeas);

    logger.info({
      service: 'api/ideas/generate',
      event: 'IDEAS_GENERATED_SUCCESS',
      message: `Generated ${generatedIdeas.length} content packages for ranked topics`,
      metadata: { count: generatedIdeas.length },
      runId,
    });

    return NextResponse.json({
      success: true,
      ideasCount: generatedIdeas.length,
      ideas: generatedIdeas,
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logger.error({
      service: 'api/ideas/generate',
      event: 'IDEAS_GENERATE_ERROR',
      message: errorMsg,
    });
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
