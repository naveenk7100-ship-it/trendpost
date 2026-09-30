import { NextRequest, NextResponse } from 'next/server';
import { runDailyPipeline } from '@/lib/pipeline/daily-pipeline';
import { repository } from '@/lib/db/repository';
import { logger } from '@/lib/logger';
import { nowUTC } from '@/lib/config';

// Server-side rate limiter / cooldown tracker
let lastManualRefreshTime = 0;

export async function POST(req: NextRequest) {
  try {
    const settings = await repository.getSettings();
    const cooldownMs = (settings.refresh_cooldown_seconds || 300) * 1000;
    const now = Date.now();
    const timeSinceLast = now - lastManualRefreshTime;

    if (timeSinceLast < cooldownMs) {
      const remainingSec = Math.ceil((cooldownMs - timeSinceLast) / 1000);
      return NextResponse.json(
        {
          success: false,
          error: `Cooldown active. Please wait ${remainingSec} seconds before triggering another live update.`,
          cooldownActive: true,
          remainingSeconds: remainingSec,
        },
        { status: 429 }
      );
    }

    lastManualRefreshTime = now;
    const runId = `manual-refresh-${now}`;

    logger.info({
      service: 'pipeline/refresh',
      event: 'MANUAL_REFRESH_START',
      message: 'User initiated "Get updates now" scan',
      runId,
    });

    const result = await runDailyPipeline({
      type: 'manual_refresh',
      customRunId: runId,
    });

    // Save newly emerging topics and content ideas
    await repository.saveTopics(result.topics);
    await repository.saveContentIdeas(result.contentIdeas);

    return NextResponse.json({
      success: true,
      message: `Trend scan completed! Discovered ${result.topicsFound} topics, generated ${result.contentIdeasGenerated} content packages.`,
      data: result,
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logger.error({
      service: 'pipeline/refresh',
      event: 'REFRESH_ERROR',
      message: errorMsg,
    });
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
