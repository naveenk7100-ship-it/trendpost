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
