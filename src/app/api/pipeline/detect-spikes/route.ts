import { NextRequest, NextResponse } from 'next/server';
import { SpikeDetector } from '@/lib/spikes/spike-detector';
import { fetchAllTrendProviders } from '@/lib/providers';
import { normalizeAndDeduplicate } from '@/lib/normalization/deduplicator';
import { scoreAndRankTopics } from '@/lib/scoring/scorer';
import { repository } from '@/lib/db/repository';
import { logger } from '@/lib/logger';
import { nowUTC } from '@/lib/config';

export async function POST(req: NextRequest) {
  try {
    const runId = `spike-scan-${Date.now()}`;
    const previousTopics = await repository.getTopics();
    const settings = await repository.getSettings();
    const users = await repository.getUsers();

    logger.info({
      service: 'spike_detector',
      event: 'SPIKE_SCAN_START',
      message: 'Running 2-hour trend spike detection scan',
      runId,
    });

    // 1. Fetch fresh trends
    const fetchResult = await fetchAllTrendProviders({ runId });
    const normalized = normalizeAndDeduplicate(fetchResult.items);
    const currentTopics = scoreAndRankTopics(normalized, 10);

    // 2. Detect spikes against previous topics
    const detector = new SpikeDetector();
    const spikes = detector.detectSpikes(currentTopics, previousTopics, {
      scoreChangeThreshold: settings.spike_score_change_threshold,
      velocityThreshold: settings.spike_velocity_threshold,
      minimumSignificance: settings.minimum_significance,
      runId,
    });

    // 3. Broadcast Telegram alert to Person A and Person B if spikes detected
    let alertResult = { sentCount: 0, errors: [] as string[] };
    if (spikes.length > 0) {
      alertResult = await detector.broadcastSpikeAlerts(spikes, users);
      await repository.saveSpikeEvents(spikes);
    }

    // Save updated topics
    await repository.saveTopics(currentTopics);

    // Ensure content ideas exist for top ranked topics
    const existingIdeas = await repository.getContentIdeas();
    const missingTopTopics = currentTopics.filter(
      t => t.is_top_10 && !existingIdeas.some(i => i.topic_id === (t.id || `topic-${t.external_id}`) || i.topic?.normalized_title === t.normalized_title)
    );
    if (missingTopTopics.length > 0) {
      const { generateContentUnified } = await import('@/lib/ai');
      const newIdeas = [];
      for (const topic of missingTopTopics.slice(0, 5)) {
        try {
          const { content, isDevelopmentContent, providerUsed, modelUsed, generationStatus } = await generateContentUnified(topic, { runId });
          newIdeas.push({
            id: `idea-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            topic_id: topic.id || `topic-${topic.external_id}`,
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
            delivery_status: 'pending' as const,
            approval_status: 'pending' as const,
            is_development_content: isDevelopmentContent,
            ai_provider_used: providerUsed,
            ai_model: modelUsed,
            created_at: nowUTC(),
            updated_at: nowUTC(),
          });
        } catch {
          // ignore single failure
        }
      }
      if (newIdeas.length > 0) {
        await repository.saveContentIdeas(newIdeas);
      }
    }

    logger.info({
      service: 'spike_detector',
      event: 'SPIKE_SCAN_COMPLETE',
      message: `Spike scan finished. Spikes detected: ${spikes.length}. Alerts dispatched: ${alertResult.sentCount}`,
      metadata: {
        spikesDetected: spikes.length,
        spikes: spikes.map(s => ({
          title: s.topic?.title,
          scoreChange: s.score_change,
          currentScore: s.current_score,
        })),
      },
      runId,
    });

    return NextResponse.json({
      success: true,
      spikesDetected: spikes.length,
      spikes,
      alertsDispatched: alertResult.sentCount,
      alertErrors: alertResult.errors,
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logger.error({
      service: 'spike_detector',
      event: 'SPIKE_SCAN_ERROR',
      message: errorMsg,
    });
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
