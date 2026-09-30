import { TrendProvider } from './base';
import { RawTrendItem, TrendSource } from '@/types';

export class XProvider extends TrendProvider {
  readonly name: TrendSource = 'x';
  readonly displayName = 'X (Twitter Trends)';

  private bearerToken: string;

  constructor(bearerToken?: string) {
    super();
    this.bearerToken = bearerToken || process.env.X_BEARER_TOKEN || '';
  }

  setBearerToken(token: string) {
    this.bearerToken = token;
  }

  async testConnection(): Promise<{ success: boolean; message: string; details?: unknown }> {
    if (!this.bearerToken) {
      return {
        success: false,
        message: 'X Bearer Token is not configured. Please add your token in Settings -> API Keys.',
      };
    }

    try {
      const res = await fetch('https://api.twitter.com/2/users/by/username/Twitter', {
        headers: {
          'Authorization': `Bearer ${this.bearerToken}`,
        },
      });

      if (res.status === 401 || res.status === 403) {
        return {
          success: false,
          message: 'Invalid X Bearer Token or insufficient permissions.',
        };
      }

      if (res.ok) {
        return { success: true, message: 'Successfully authenticated with X API v2.' };
      }

      return { success: false, message: `X API returned HTTP ${res.status}` };
    } catch (err) {
      return { success: false, message: err instanceof Error ? err.message : String(err) };
    }
  }

  async fetchTrends(options?: { limit?: number }): Promise<RawTrendItem[]> {
    if (!this.bearerToken) {
      throw new Error('X_BEARER_TOKEN_REQUIRED: Please configure X API Bearer Token in settings');
    }

    const limit = options?.limit || 20;

    // Use X API v2 search recent or trends endpoint
    const url = `https://api.twitter.com/2/tweets/search/recent?query=place_country:IN%20-is:retweet&max_results=${Math.min(limit, 50)}&tweet.fields=public_metrics,created_at`;

    return await this.retryWithBackoff(async () => {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.bearerToken}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`X API returned HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      if (!data.data || !Array.isArray(data.data)) {
        return [];
      }

      const results: RawTrendItem[] = [];

      for (const tweet of data.data) {
        const text = tweet.text?.trim();
        if (!text) continue;

        const metrics = tweet.public_metrics || {};
        const impressions = metrics.impression_count || metrics.retweet_count * 50 || 1000;
        const engagements = (metrics.like_count || 0) + (metrics.retweet_count || 0) * 3 + (metrics.reply_count || 0) * 2;
        const sourceTimestamp = tweet.created_at || new Date().toISOString();

        const hoursAgo = Math.max(0.5, (Date.now() - new Date(sourceTimestamp).getTime()) / (1000 * 60 * 60));
        const velocity = Math.round(engagements / hoursAgo);

        // Extract main title or topic from tweet text
        const title = text.split('\n')[0].substring(0, 80);

        results.push({
          source: 'x',
          external_id: `x-${tweet.id}`,
          title,
          description: text.substring(0, 280),
          url: `https://x.com/i/web/status/${tweet.id}`,
          source_timestamp: sourceTimestamp,
          raw_metadata: {
            tweetId: tweet.id,
            metrics,
          },
          region: 'IN',
          category: 'Social Conversations',
          volume: impressions,
          velocity,
        });
      }

      return results;
    });
  }
}
