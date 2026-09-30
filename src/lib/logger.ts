import { SystemLog } from '@/types';

// In-memory ring buffer for instant fast retrieval on dashboard + Supabase database persistence
const MAX_IN_MEMORY_LOGS = 500;
const globalForLogs = globalThis as unknown as { __trendpost_logs__?: SystemLog[] };
const inMemoryLogs: SystemLog[] = globalForLogs.__trendpost_logs__ ?? [];
globalForLogs.__trendpost_logs__ = inMemoryLogs;

export interface LogEntryOptions {
  service: string;
  event: string;
  message: string;
  metadata?: Record<string, unknown>;
  runId?: string;
  durationMs?: number;
}

export function log(level: 'debug' | 'info' | 'warn' | 'error', options: LogEntryOptions): SystemLog {
  const timestamp = new Date().toISOString();
  const entry: SystemLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    level,
    service: options.service,
    event: options.event,
    message: options.message,
    metadata: {
      ...options.metadata,
      runId: options.runId,
      durationMs: options.durationMs,
    },
    created_at: timestamp,
  };

  // Prepend to ring buffer
  inMemoryLogs.unshift(entry);
  if (inMemoryLogs.length > MAX_IN_MEMORY_LOGS) {
    inMemoryLogs.pop();
  }

  // Console output formatted as structured JSON for Docker/Cloud observability
  const consolePayload = {
    timestamp,
    level,
    service: options.service,
    event: options.event,
    message: options.message,
    runId: options.runId,
    durationMs: options.durationMs,
    metadata: options.metadata,
  };

  if (level === 'error') {
    console.error(JSON.stringify(consolePayload));
  } else if (level === 'warn') {
    console.warn(JSON.stringify(consolePayload));
  } else {
    console.log(JSON.stringify(consolePayload));
  }

  return entry;
}

export const logger = {
  debug: (options: LogEntryOptions) => log('debug', options),
  info: (options: LogEntryOptions) => log('info', options),
  warn: (options: LogEntryOptions) => log('warn', options),
  error: (options: LogEntryOptions) => log('error', options),
  getRecentLogs: (limit = 100, level?: string, service?: string): SystemLog[] => {
    return inMemoryLogs.filter(l => {
      if (level && l.level !== level) return false;
      if (service && l.service !== service) return false;
      return true;
    }).slice(0, limit);
  },
};
