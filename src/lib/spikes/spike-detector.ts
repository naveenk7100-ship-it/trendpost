import { NormalizedTopic, SpikeEvent, User } from '@/types';
import { TelegramBotService } from '@/lib/telegram/bot';
import { logger } from '@/lib/logger';
import { APP_CONFIG, nowUTC } from '@/lib/config';

// Track recently alerted topics to prevent spamming
const recentAlerts = new Map<string, number>(); // key: normalized_title, val: timestamp

export interface SpikeDetectionOptions {
  scoreChangeThreshold?: number;
  velocityThreshold?: number;
  minimumSignificance?: number;
  runId?: string;
}

export class SpikeDetector {
  private bot: TelegramBotService;

  constructor(bot?: TelegramBotService) {
    this.bot = bot || new TelegramBotService();
  }

  /**
   * Compares current fresh topics against previous run's topics to detect genuine spikes.
   */
  detectSpikes(
    currentTopics: NormalizedTopic[],
    previousTopics: NormalizedTopic[],
    options?: SpikeDetectionOptions
  ): SpikeEvent[] {
    const scoreThreshold = options?.scoreChangeThreshold ?? APP_CONFIG.spikeScoreChangeThreshold;
    const velocityThreshold = options?.velocityThreshold ?? APP_CONFIG.spikeVelocityThreshold;
    const minSignificance = options?.minimumSignificance ?? APP_CONFIG.minimumSignificance;

    const previousMap = new Map<string, NormalizedTopic>();
    for (const prev of previousTopics) {
      previousMap.set(prev.normalized_title, prev);
    }

    const detectedSpikes: SpikeEvent[] = [];
    const now = Date.now();

    for (const current of currentTopics) {
      const prev = previousMap.get(current.normalized_title);
      const prevScore = prev ? prev.virality_score : 20; // baseline if newly appeared
      const scoreChange = current.virality_score - prevScore;
      const prevVelocity = prev ? prev.velocity : 0;
      const velocityChange = current.velocity - prevVelocity;

      // Condition 1: Substantial score surge AND current topic meets minimum significance
      // Condition 2: Or massive sudden velocity breakout
      const isScoreSpike = scoreChange >= scoreThreshold && current.virality_score >= minSignificance;
      const isVelocityBreakout = velocityChange >= velocityThreshold && current.velocity > 1000;

      if (isScoreSpike || isVelocityBreakout) {
        // Prevent duplicate alerts within 12 hours
        const lastAlertTime = recentAlerts.get(current.normalized_title);
        if (lastAlertTime && (now - lastAlertTime) < 12 * 60 * 60 * 1000) {
          continue;
        }

        let severity: 'medium' | 'high' | 'critical' = 'high';
        if (scoreChange >= 35 || current.virality_score >= 90) {
          severity = 'critical';
        } else if (scoreChange < 25) {
          severity = 'medium';
        }

        const spikeReason = isVelocityBreakout
          ? `Velocity surged by +${velocityChange.toLocaleString()} interactions/hr`
          : `Virality score escalated from ${prevScore} to ${current.virality_score} (+${scoreChange} pts)`;

        const suggestedAngle = current.category?.toLowerCase().includes('tech') 
          ? 'curiosity' 
          : (current.category?.toLowerCase().includes('entertainment') ? 'relatable' : 'news-style');

        const spikeEvent: SpikeEvent = {
          id: `spike-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          topic_id: current.id || `topic-${current.external_id}`,
          topic: current,
          previous_score: prevScore,
          current_score: current.virality_score,
          score_change: scoreChange,
          detected_at: nowUTC(),
          alerted: false,
          severity,
          raw_context: {
            previous_velocity: prevVelocity,
            current_velocity: current.velocity,
            suggested_angle: suggestedAngle,
            spike_reason: spikeReason,
          },
        };

        detectedSpikes.push(spikeEvent);
      }
    }

    return detectedSpikes;
  }

  /**
   * Broadcasts Telegram alerts to both Person A and Person B.
   */
  async broadcastSpikeAlerts(
    spikes: SpikeEvent[],
    recipients: User[]
  ): Promise<{ sentCount: number; errors: string[] }> {
    let sentCount = 0;
    const errors: string[] = [];

    for (const spike of spikes) {
      if (spike.alerted) continue;

      const title = spike.topic?.title || 'Trending Topic';
      const reason = spike.raw_context.spike_reason || 'Rapid breakout across multiple sources';
      const angle = spike.raw_context.suggested_angle || 'Curiosity';

      const alertMessage = 
        `🚨 *MAJOR TREND SPIKE DETECTED* 🚨\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `📌 *TOPIC:*\n${title}\n\n` +
        `📈 *SCORE SURGE:*\n+${spike.score_change} pts (${spike.previous_score} → ${spike.current_score}/100)\n\n` +
        `⚡ *WHY IT SPIKED:*\n${reason}\n\n` +
        `💡 *RECOMMENDED ANGLE:*\n${angle.toUpperCase()}\n\n` +
        `⚡ *ACTION:* Check dashboard now to generate and claim exclusive content!`;

      const isDevAlert = !this.bot.isConfigured();

      if (isDevAlert) {
        logger.info({
          service: 'spike_detector',
          event: 'DEV_SPIKE_ALERT_SAVED',
          message: `[FREE MODE] Spike alert for "${title}" recorded in dashboard (Telegram bot token waiting)`,
          metadata: { spikeId: spike.id, title, scoreChange: spike.score_change },
        });
        sentCount += recipients.filter(r => r.telegram_enabled).length;
      } else {
        for (const user of recipients) {
          if (!user.telegram_chat_id || !user.telegram_enabled) continue;

          try {
            const res = await this.bot.sendMessage(user.telegram_chat_id, alertMessage);
            if (res.success) {
              sentCount++;
            } else if (res.error) {
              errors.push(`Failed sending to ${user.name}: ${res.error}`);
            }
          } catch (err) {
            errors.push(`Error alerting ${user.name}: ${err instanceof Error ? err.message : String(err)}`);
          }
        }
      }

      // Mark alerted
      spike.alerted = true;
      if (spike.topic?.normalized_title) {
        recentAlerts.set(spike.topic.normalized_title, Date.now());
      }

      logger.info({
        service: 'spike_detector',
        event: 'SPIKE_ALERT_BROADCAST',
        message: `Alert broadcast for spike "${title}" to ${recipients.length} recipients`,
        metadata: { spikeId: spike.id, title, scoreChange: spike.score_change },
      });
    }

    return { sentCount, errors };
  }
}
