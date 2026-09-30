import { describe, it, expect, beforeEach } from 'vitest';
import { TelegramWebhookHandler, TelegramWebhookUpdate } from '@/lib/telegram/webhook';
import { TelegramBotService } from '@/lib/telegram/bot';
import { ClaimManager } from '@/lib/claims/claim-manager';
import { User } from '@/types';

describe('Telegram Webhook & Inline Button Handling', () => {
  let webhookHandler: TelegramWebhookHandler;
  let bot: TelegramBotService;

  const mockUser: User = {
    id: 'user-tg-1',
    email: 'person.a@trendpost.local',
    name: 'Person A',
    role: 'admin',
    telegram_chat_id: '123456781',
    telegram_enabled: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  beforeEach(() => {
    ClaimManager.resetForTesting();
    bot = new TelegramBotService();
    webhookHandler = new TelegramWebhookHandler(bot);
  });

  it('processes claim action from Telegram button callback', async () => {
    const update: TelegramWebhookUpdate = {
      update_id: 1001,
      callback_query: {
        id: 'cb-unique-1',
        from: { id: 123456781, is_bot: false, first_name: 'Person A' },
        message: {
          message_id: 555,
          chat: { id: 123456781 },
          text: 'Topic: Apple Event',
        },
        data: 'claim:idea-tg-101',
      },
    };

    const result = await webhookHandler.handleUpdate(update, async () => mockUser);

    expect(result.status).toBe('success');
    expect(result.action).toBe('claim');

    // Confirm atomic claim was registered
    const activeClaim = ClaimManager.getActiveClaim('idea-tg-101');
    expect(activeClaim?.user_id).toBe(mockUser.id);
  });

  it('rejects duplicate Telegram webhook callbacks (idempotency)', async () => {
    const update: TelegramWebhookUpdate = {
      update_id: 1002,
      callback_query: {
        id: 'cb-duplicate-check-777',
        from: { id: 123456781, is_bot: false, first_name: 'Person A' },
        message: {
          message_id: 556,
          chat: { id: 123456781 },
          text: 'Topic: AI Launch',
        },
        data: 'approve:idea-tg-102',
      },
    };

    // First attempt: succeeds
    const firstRes = await webhookHandler.handleUpdate(update, async () => mockUser);
    expect(firstRes.status).toBe('success');

    // Second identical attempt (network retry): ignored as duplicate
    const secondRes = await webhookHandler.handleUpdate(update, async () => mockUser);
    expect(secondRes.status).toBe('duplicate');
    expect(secondRes.message).toContain('already processed');
  });

  it('formats Telegram idea message with all required fields', () => {
    const formatted = bot.formatIdeaMessage({
      id: 'idea-fmt',
      topic_id: 't-1',
      topic: { title: 'Chandrayaan 4 Mission' } as any,
      hook: 'Is India about to land on the dark side of the moon again?',
      captions: ['Here is the mission roadmap', 'Full details inside', 'What do you think?'],
      hashtags: ['#isro', '#space', '#india'],
      carousel_outline: {} as any,
      reel_script: {} as any,
      recommended_post_time: '2026-09-30T13:00:00Z',
      post_time_timezone: 'Asia/Kolkata',
      content_angle: 'news-style',
      generation_status: 'completed',
      delivery_status: 'pending',
      approval_status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    expect(formatted).toContain('TOPIC:');
    expect(formatted).toContain('HOOK:');
    expect(formatted).toContain('CAPTION:');
    expect(formatted).toContain('HASHTAGS:');
    expect(formatted).toContain('RECOMMENDED POST TIME:');
    expect(formatted).toContain('IST');
  });
});
