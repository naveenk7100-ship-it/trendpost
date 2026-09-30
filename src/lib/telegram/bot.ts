import { ContentIdea, Delivery } from '@/types';
import { formatToIST } from '@/lib/config';
import { logger } from '@/lib/logger';

export interface TelegramInlineButton {
  text: string;
  callback_data: string;
}

export class TelegramBotService {
  private botToken: string;
  private baseUrl: string;

  constructor(token?: string) {
    this.botToken = token || process.env.TELEGRAM_BOT_TOKEN || '';
    this.baseUrl = `https://api.telegram.org/bot${this.botToken}`;
  }

  isConfigured(): boolean {
    return Boolean(this.botToken && this.botToken.includes(':'));
  }

  async testConnection(): Promise<{ success: boolean; message: string; botInfo?: unknown }> {
    if (!this.isConfigured()) {
      return {
        success: false,
        message: 'Telegram Bot Token is not configured. Create a bot with @BotFather and set the token in Settings.',
      };
    }

    try {
      const res = await fetch(`${this.baseUrl}/getMe`);
      const data = await res.json();
      if (!data.ok) {
        return {
          success: false,
          message: data.description || 'Failed to authenticate with Telegram API.',
        };
      }
      return {
        success: true,
        message: `Connected to Telegram bot: @${data.result.username} (${data.result.first_name})`,
        botInfo: data.result,
      };
    } catch (err) {
      return {
        success: false,
        message: err instanceof Error ? err.message : String(err),
      };
    }
  }

  /**
   * Formats a standard TrendPost daily content idea for Telegram delivery.
   */
  formatIdeaMessage(idea: ContentIdea, claimerName?: string | null): string {
    const topicTitle = idea.topic?.title || 'Trending Topic';
    const hook = idea.hook;
    const caption = idea.captions[0]; // Primary punchy caption
    const hashtags = idea.hashtags.join(' ');
    const postTimeIST = formatToIST(idea.recommended_post_time);

    let statusLine = '';
    if (claimerName) {
      statusLine = `\n🔒 *CLAIMED BY:* ${claimerName}\n`;
    }

    return (
      `🔥 *TRENDPOST DAILY DISPATCH*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `📌 *TOPIC:*\n${topicTitle}\n\n` +
      `🎯 *HOOK:*\n"${hook}"\n\n` +
      `✍️ *CAPTION:*\n${caption}\n\n` +
      `🏷️ *HASHTAGS:*\n${hashtags}\n\n` +
      `⏰ *RECOMMENDED POST TIME:*\n${postTimeIST}` +
      statusLine
    );
  }

  /**
   * Generates Telegram Inline Keyboard buttons.
   */
  getInlineKeyboard(ideaId: string, isClaimed = false, isClaimedByMe = false): { inline_keyboard: TelegramInlineButton[][] } {
    const claimButton: TelegramInlineButton = isClaimed
      ? (isClaimedByMe
          ? { text: '🔓 Release Claim', callback_data: `unclaim:${ideaId}` }
          : { text: '🔒 Claimed', callback_data: `noop:${ideaId}` })
      : { text: '🔒 Claim Idea', callback_data: `claim:${ideaId}` };

    return {
      inline_keyboard: [
        [
          { text: '✅ Approve', callback_data: `approve:${ideaId}` },
          { text: '❌ Reject', callback_data: `reject:${ideaId}` },
          claimButton,
        ],
      ],
    };
  }

  /**
   * Sends a message with inline buttons to a chat ID.
   */
  async sendMessage(
    chatId: string,
    text: string,
    replyMarkup?: { inline_keyboard: TelegramInlineButton[][] }
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.isConfigured()) {
      return { success: false, error: 'Telegram Bot Token not configured' };
    }

    try {
      const response = await fetch(`${this.baseUrl}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'Markdown',
          reply_markup: replyMarkup,
        }),
      });

      const data = await response.json();
      if (!data.ok) {
        return { success: false, error: data.description || 'Telegram sendMessage error' };
      }

      return {
        success: true,
        messageId: String(data.result.message_id),
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  /**
   * Edits an existing message text and keyboard in-place upon button interaction.
   */
  async editMessageText(
    chatId: string,
    messageId: string,
    text: string,
    replyMarkup?: { inline_keyboard: TelegramInlineButton[][] }
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.isConfigured()) {
      return { success: false, error: 'Telegram Bot Token not configured' };
    }

    try {
      const response = await fetch(`${this.baseUrl}/editMessageText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: messageId,
          text,
          parse_mode: 'Markdown',
          reply_markup: replyMarkup,
        }),
      });

      const data = await response.json();
      return { success: data.ok, error: data.ok ? undefined : data.description };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  /**
   * Acknowledges a Telegram callback query with feedback notification/alert.
   */
  async answerCallbackQuery(
    callbackQueryId: string,
    text: string,
    showAlert = false
  ): Promise<boolean> {
    if (!this.isConfigured()) return false;
    try {
      const response = await fetch(`${this.baseUrl}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callback_query_id: callbackQueryId,
          text,
          show_alert: showAlert,
        }),
      });
      const data = await response.json();
      return Boolean(data.ok);
    } catch {
      return false;
    }
  }
}
