import { NextRequest, NextResponse } from 'next/server';
import { TelegramWebhookHandler, TelegramWebhookUpdate } from '@/lib/telegram/webhook';
import { repository } from '@/lib/db/repository';
import { logger } from '@/lib/logger';

const webhookHandler = new TelegramWebhookHandler();

export async function POST(req: NextRequest) {
  try {
    // Verify optional Telegram secret token header if configured
    const secretToken = req.headers.get('x-telegram-bot-api-secret-token');
    const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;

    if (expectedSecret && secretToken && secretToken !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized secret token' }, { status: 401 });
    }

    const update: TelegramWebhookUpdate = await req.json();

    const result = await webhookHandler.handleUpdate(update, async (chatId: string) => {
      return await repository.getUserByTelegramChatId(chatId);
    });

    return NextResponse.json({ ok: true, result });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logger.error({
      service: 'telegram/webhook',
      event: 'WEBHOOK_EXCEPTION',
      message: errorMsg,
    });
    return NextResponse.json({ ok: false, error: errorMsg }, { status: 500 });
  }
}
