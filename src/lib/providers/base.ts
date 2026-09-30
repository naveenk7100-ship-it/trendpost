import { RawTrendItem, TrendSource } from '@/types';
import { logger } from '@/lib/logger';

export abstract class TrendProvider {
  abstract readonly name: TrendSource;
  abstract readonly displayName: string;

  /**
   * Main fetch method implemented by each subclass.
   */
  abstract fetchTrends(options?: { region?: string; limit?: number }): Promise<RawTrendItem[]>;

  /**
   * Health check / credentials validation method.
   */
  abstract testConnection(): Promise<{ success: boolean; message: string; details?: unknown }>;

  /**
   * Protected execution with strict timeout, retry with exponential backoff, and structured logging.
   */
  async safeFetch(options?: { region?: string; limit?: number; timeoutMs?: number; runId?: string }): Promise<{
    success: boolean;
    data: RawTrendItem[];
    error?: string;
  }> {
    const startTime = Date.now();
    const timeoutMs = options?.timeoutMs || 12000; // 12 seconds safe timeout
    const runId = options?.runId || `run-${Date.now()}`;

    logger.info({
      service: this.name,
      event: 'FETCH_START',
      message: `Fetching trends from ${this.displayName}...`,
      runId,
    });

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      // Execute with timeout race
      const fetchPromise = this.fetchTrends(options);
      const timeoutPromise = new Promise<never>((_, reject) => {
        controller.signal.addEventListener('abort', () => {
          reject(new Error(`${this.displayName} request timed out after ${timeoutMs}ms`));
        });
      });

      const data = await Promise.race([fetchPromise, timeoutPromise]);
      clearTimeout(timer);

      const durationMs = Date.now() - startTime;
      logger.info({
        service: this.name,
        event: 'FETCH_SUCCESS',
        message: `Successfully fetched ${data.length} trends from ${this.displayName}`,
        metadata: { count: data.length },
        runId,
        durationMs,
      });

      return {
        success: true,
        data,
      };
    } catch (err: unknown) {
      const durationMs = Date.now() - startTime;
      const errorMessage = err instanceof Error ? err.message : String(err);

      logger.error({
        service: this.name,
        event: 'FETCH_ERROR',
        message: `Failed to fetch trends from ${this.displayName}: ${errorMessage}`,
        metadata: { error: errorMessage },
        runId,
        durationMs,
      });

      return {
        success: false,
        data: [],
        error: errorMessage,
      };
    }
  }

  /**
   * Exponential backoff retry utility for API calls
   */
  protected async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries = 2,
    baseDelayMs = 1000
  ): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (err) {
        lastError = err;
        if (attempt < maxRetries) {
          const delay = baseDelayMs * Math.pow(2, attempt) + Math.random() * 200;
          await new Promise((res) => setTimeout(res, delay));
        }
      }
    }
    throw lastError;
  }
}
