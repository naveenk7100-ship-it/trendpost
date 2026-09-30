import { NextRequest, NextResponse } from 'next/server';
import { runTelegramDeliveryPipeline } from '@/lib/pipeline/delivery-pipeline';
import { repository } from '@/lib/db/repository';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
  try {
    const ideas = await repository.getContentIdeas();
    const users = await repository.getUsers();

    if (ideas.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No content ideas available to deliver. Run trend pipeline first.',
      }, { status: 400 });
    }

    const result = await runTelegramDeliveryPipeline({
      ideas,
      users,
      limit: 5,
    });

    // Save deliveries
    await repository.saveDeliveries(result.deliveries);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logger.error({
      service: 'api/pipeline/deliver',
      event: 'DELIVER_ERROR',
      message: errorMsg,
    });
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
