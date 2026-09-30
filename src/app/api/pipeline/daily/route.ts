import { NextRequest, NextResponse } from 'next/server';
import { runDailyPipeline } from '@/lib/pipeline/daily-pipeline';
import { repository } from '@/lib/db/repository';
import { logger } from '@/lib/logger';
import { nowUTC } from '@/lib/config';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const runId = `daily-${Date.now()}`;

    // Record trend run start
    await repository.recordTrendRun({
      id: runId,
      type: 'scheduled_daily',
      started_at: nowUTC(),
      status: 'running',
      topics_found: 0,
      providers_succeeded: [],
      providers_failed: [],
      metadata: { trigger: body.trigger || 'manual_or_cron' },
    });

    const result = await runDailyPipeline({
      type: 'scheduled_daily',
      customRunId: runId,
    });

    // Save topics & ideas to repository
    await repository.saveTopics(result.topics);
    await repository.saveContentIdeas(result.contentIdeas);

    // Update run record
    await repository.recordTrendRun({
      id: runId,
      type: 'scheduled_daily',
      started_at: new Date(Date.now() - result.durationMs).toISOString(),
      completed_at: nowUTC(),
      status: result.status,
      topics_found: result.topicsFound,
      providers_succeeded: result.providersSucceeded,
      providers_failed: result.providersFailed.map(f => f.provider),
      metadata: {
        top10Count: result.top10Count,
        contentIdeasGenerated: result.contentIdeasGenerated,
      },
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.error({
      service: 'api/pipeline/daily',
      event: 'DAILY_PIPELINE_ERROR',
      message: errorMessage,
    });
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
