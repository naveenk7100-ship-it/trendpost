import { TelegramBotService } from './bot';
import { ClaimManager } from '@/lib/claims/claim-manager';
import { logger } from '@/lib/logger';
import { User } from '@/types';

// Set of processed callback IDs to prevent duplicate webhook delivery execution
const processedCallbacks = new Set<string>();

export interface TelegramWebhookUpdate {
  update_id: number;
  callback_query?: {
    id: string;
    from: {
      id: number;
      is_bot: boolean;
      first_name: string;
      last_name?: string;
      username?: string;
    };
    message?: {
      message_id: number;
      chat: {
        id: number;
        first_name?: string;
        username?: string;
      };
      text?: string;
    };
    data?: string;
  };
}

export class TelegramWebhookHandler {
  private bot: TelegramBotService;

  constructor(bot?: TelegramBotService) {
    this.bot = bot || new TelegramBotService();
  }

  async handleUpdate(
    update: TelegramWebhookUpdate,
    getUserByTelegramChatId: (chatId: string) => Promise<User | null>
  ): Promise<{ status: string; action?: string; message: string }> {
    const callback = update.callback_query;
    if (!callback) {
      return { status: 'ignored', message: 'No callback query in update' };
    }

    const callbackId = callback.id;
    if (processedCallbacks.has(callbackId)) {
      logger.warn({
        service: 'telegram',
        event: 'DUPLICATE_WEBHOOK',
        message: `Ignoring duplicate Telegram callback query ${callbackId}`,
      });
      return { status: 'duplicate', message: 'Callback query already processed' };
    }
    processedCallbacks.add(callbackId);

    // Keep memory bounded
    if (processedCallbacks.size > 2000) {
      const firstKey = processedCallbacks.values().next().value;
      if (firstKey) processedCallbacks.delete(firstKey);
    }

    const data = callback.data || '';
    const [action, ideaId] = data.split(':');
    const chatId = String(callback.message?.chat.id || callback.from.id);
    const messageId = String(callback.message?.message_id || '');

    logger.info({
      service: 'telegram',
      event: 'CALLBACK_RECEIVED',
      message: `Telegram callback: action=${action}, ideaId=${ideaId}, from=${callback.from.first_name} (${chatId})`,
      metadata: { action, ideaId, chatId, messageId },
    });

    // Resolve user from telegram chat id
    const user = await getUserByTelegramChatId(chatId);
    const fallbackUser: User = user || {
      id: `tg-user-${chatId}`,
      email: `${callback.from.username || callback.from.first_name.toLowerCase()}@telegram.user`,
      name: callback.from.first_name + (callback.from.last_name ? ` ${callback.from.last_name}` : ''),
      role: 'member',
      telegram_chat_id: chatId,
      telegram_enabled: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (action === 'claim') {
      const claimResult = await ClaimManager.claimIdea(ideaId, fallbackUser);

      if (claimResult.success) {
        await this.bot.answerCallbackQuery(callbackId, '✅ You claimed this idea!', false);

        // Update message text & keyboard to show claimed status
        if (callback.message?.text) {
          const updatedText = callback.message.text + `\n\n🔒 *CLAIMED BY:* ${fallbackUser.name}`;
          const updatedKeyboard = this.bot.getInlineKeyboard(ideaId, true, true);
          await this.bot.editMessageText(chatId, messageId, updatedText, updatedKeyboard);
        }

        return { status: 'success', action: 'claim', message: `Idea claimed by ${fallbackUser.name}` };
      } else {
        // Already claimed by the other person
        await this.bot.answerCallbackQuery(
          callbackId,
          `⚠️ Already claimed by ${claimResult.claimerName || 'another team member'}!`,
          true
        );
        return { status: 'conflict', action: 'claim', message: claimResult.message };
      }
    }

    if (action === 'unclaim') {
      const releaseResult = await ClaimManager.releaseClaim(ideaId, fallbackUser.id);
      if (releaseResult.success) {
        await this.bot.answerCallbackQuery(callbackId, '🔓 Idea released!', false);
        const originalText = (callback.message?.text || '').replace(/\n\n🔒 \*CLAIMED BY:\* .*$/g, '');
        const updatedKeyboard = this.bot.getInlineKeyboard(ideaId, false, false);
        await this.bot.editMessageText(chatId, messageId, originalText, updatedKeyboard);
        return { status: 'success', action: 'unclaim', message: 'Idea released' };
      } else {
        await this.bot.answerCallbackQuery(callbackId, releaseResult.message, true);
        return { status: 'error', action: 'unclaim', message: releaseResult.message };
      }
    }

    if (action === 'approve') {
      await this.bot.answerCallbackQuery(callbackId, '✅ Content idea approved!', false);
      logger.info({
        service: 'telegram',
        event: 'IDEA_APPROVED',
        message: `Idea ${ideaId} approved by ${fallbackUser.name}`,
        metadata: { ideaId, userId: fallbackUser.id, messageId },
      });
      return { status: 'success', action: 'approve', message: `Idea ${ideaId} approved` };
    }

    if (action === 'reject') {
      await this.bot.answerCallbackQuery(callbackId, '❌ Content idea marked as rejected.', false);
      logger.info({
        service: 'telegram',
        event: 'IDEA_REJECTED',
        message: `Idea ${ideaId} rejected by ${fallbackUser.name}`,
        metadata: { ideaId, userId: fallbackUser.id, messageId },
      });
      return { status: 'success', action: 'reject', message: `Idea ${ideaId} rejected` };
    }

    if (action === 'noop') {
      await this.bot.answerCallbackQuery(callbackId, 'This idea is already claimed.', false);
      return { status: 'noop', message: 'No action taken' };
    }

    return { status: 'unknown', message: `Unhandled action: ${action}` };
  }
}
