import { ContentIdea, Delivery, User } from '@/types';
import { TelegramBotService } from '@/lib/telegram/bot';
import { logger } from '@/lib/logger';
import { nowUTC } from '@/lib/config';

export interface DeliveryPipelineResult {
  runId: string;
  totalDelivered: number;
  totalFailed: number;
  deliveries: Delivery[];
  errors: string[];
}

export async function runTelegramDeliveryPipeline(options?: {
  ideas: ContentIdea[];
  users: User[];
  limit?: number;
  bot?: TelegramBotService;
  runId?: string;
}): Promise<DeliveryPipelineResult> {
  const runId = options?.runId || `delivery-${Date.now()}`;
  const limit = options?.limit || 5;
  const bot = options?.bot || new TelegramBotService();
  const ideasToDeliver = (options?.ideas || []).slice(0, limit);
  const users = options?.users || [];

  logger.info({
    service: 'telegram',
    event: 'DELIVERY_PIPELINE_START',
    message: `Starting daily Telegram delivery of ${ideasToDeliver.length} ideas to ${users.length} users`,
    runId,
  });

  const deliveries: Delivery[] = [];
  const errors: string[] = [];
  let totalDelivered = 0;
  let totalFailed = 0;

  for (const idea of ideasToDeliver) {
    const formattedMessage = bot.formatIdeaMessage(idea);
    const keyboard = bot.getInlineKeyboard(idea.id, false, false);

    for (const user of users) {
      if (!user.telegram_chat_id || !user.telegram_enabled) {
        continue;
      }

      const isDevDelivery = !bot.isConfigured();

      const deliveryEntry: Delivery = {
        id: `del-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        idea_id: idea.id,
        idea,
        user_id: user.id,
        user: { id: user.id, name: user.name, email: user.email },
        telegram_chat_id: user.telegram_chat_id,
        delivery_status: 'sent',
        delivered_at: nowUTC(),
        action: null,
        action_at: null,
        is_development_delivery: isDevDelivery,
        telegram_payload_preview: formattedMessage,
        telegram_message_id: isDevDelivery ? `sim-msg-${Date.now()}` : undefined,
        created_at: nowUTC(),
      };

      if (isDevDelivery) {
        // FREE MODE: Simulated Telegram dispatch
        logger.info({
          service: 'telegram',
          event: 'DEV_DELIVERY_SIMULATED',
          message: `[FREE MODE] Created DEVELOPMENT DELIVERY for ${user.name} (Waiting for TELEGRAM_BOT_TOKEN)`,
          metadata: { userId: user.id, ideaId: idea.id },
          runId,
        });
        totalDelivered++;
      } else {
        // PRODUCTION MODE: Real Telegram API dispatch
        try {
          const sendResult = await bot.sendMessage(user.telegram_chat_id, formattedMessage, keyboard);

          if (sendResult.success) {
            deliveryEntry.telegram_message_id = sendResult.messageId;
            deliveryEntry.delivery_status = 'sent';
            totalDelivered++;
          } else {
            deliveryEntry.delivery_status = 'failed';
            deliveryEntry.error_message = sendResult.error;
            totalFailed++;
            errors.push(`Failed for user ${user.name}: ${sendResult.error}`);
          }
        } catch (err) {
          deliveryEntry.delivery_status = 'failed';
          deliveryEntry.error_message = err instanceof Error ? err.message : String(err);
          totalFailed++;
          errors.push(`Exception for user ${user.name}: ${deliveryEntry.error_message}`);
        }
      }

      deliveries.push(deliveryEntry);
    }
  }

  logger.info({
    service: 'telegram',
    event: 'DELIVERY_PIPELINE_COMPLETE',
    message: `Delivery finished. Delivered: ${totalDelivered}, Failed: ${totalFailed}`,
    metadata: { totalDelivered, totalFailed, ideasCount: ideasToDeliver.length },
    runId,
  });

  return {
    runId,
    totalDelivered,
    totalFailed,
    deliveries,
    errors,
  };
}
