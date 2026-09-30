import { formatInTimeZone, toDate } from 'date-fns-tz';

export const APP_CONFIG = {
  name: 'TrendPost',
  version: '1.0.0',
  timezone: process.env.DEFAULT_TIMEZONE || 'Asia/Kolkata',
  defaultAiModel: process.env.DEFAULT_AI_MODEL || 'claude-3-5-sonnet-latest',
  cronDailyScanTime: '07:00', // IST
  cronTelegramDeliveryTime: '07:30', // IST
  spikeDetectionIntervalHours: 2,
  spikeScoreChangeThreshold: 20,
  spikeVelocityThreshold: 40,
  minimumSignificance: 60,
  dailyGenerationLimit: 10,
  refreshCooldownSeconds: 300,
  topDeliveriesCount: 5,
};

/**
 * Formats any UTC timestamp or Date object into human-readable IST (Asia/Kolkata) string.
 * Example: "29 Sep 2026, 07:30 AM IST"
 */
export function formatToIST(
  dateInput: string | Date | number,
  formatPattern: string = 'dd MMM yyyy, hh:mm a'
): string {
  try {
    const date = typeof dateInput === 'string' || typeof dateInput === 'number' 
      ? new Date(dateInput) 
      : dateInput;
    
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    const formatted = formatInTimeZone(date, APP_CONFIG.timezone, formatPattern);
    return `${formatted} IST`;
  } catch {
    return 'Invalid Date';
  }
}

/**
 * Get current UTC ISO timestamp string
 */
export function nowUTC(): string {
  return new Date().toISOString();
}

/**
 * Validates environment variables and provides status
 */
export function getEnvStatus() {
  return {
    openrouterConfigured: Boolean(process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY.trim().length > 5),
    openrouterModel: process.env.OPENROUTER_MODEL || 'openrouter/free',
    claudeConfigured: Boolean(process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.startsWith('sk-ant')),
    telegramConfigured: Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_BOT_TOKEN.includes(':')),
    youtubeConfigured: Boolean(process.env.YOUTUBE_API_KEY && process.env.YOUTUBE_API_KEY.length > 10),
    redditConfigured: Boolean(process.env.REDDIT_CLIENT_ID || process.env.REDDIT_USER_AGENT),
    xConfigured: Boolean(process.env.X_BEARER_TOKEN && process.env.X_BEARER_TOKEN.length > 20),
  };
}

/**
 * Returns true if the system is currently running in Free / Development Mode
 * (i.e. Paid/configured credentials for OpenRouter/Claude and Telegram are not both set)
 */
export function isFreeDevelopmentMode(): boolean {
  const env = getEnvStatus();
  return !(env.openrouterConfigured && env.telegramConfigured);
}

