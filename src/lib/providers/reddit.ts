import { TrendProvider } from './base';
import { RawTrendItem, TrendSource } from '@/types';

export class RedditProvider extends TrendProvider {
  readonly name: TrendSource = 'reddit';
  readonly displayName = 'Reddit (r/all & r/india)';

  private userAgent: string;
  private clientId?: string;
  private clientSecret?: string;

  constructor(userAgent = 'TrendPost/1.0.0 (by /u/trendpost_dev)') {
    super();
    this.userAgent = process.env.REDDIT_USER_AGENT || userAgent;
    this.clientId = process.env.REDDIT_CLIENT_ID;
    this.clientSecret = process.env.REDDIT_CLIENT_SECRET;
  }

  async testConnection(): Promise<{ success: boolean; message: string; details?: unknown }> {
    try {
      const res = await fetch('https://www.reddit.com/r/india/hot.json?limit=1', {
        headers: { 'User-Agent': this.userAgent },
      });
      if (res.ok) {
        return { success: true, message: 'Successfully connected to Reddit API endpoint.' };
      }
      return { success: false, message: `Reddit returned HTTP ${res.status}: ${res.statusText}` };
    } catch (err) {
      return { success: false, message: err instanceof Error ? err.message : String(err) };
    }
  }

  async fetchTrends(options?: { limit?: number }): Promise<RawTrendItem[]> {
    const limitPerSub = Math.min(options?.limit || 15, 25);
    const subreddits = ['all', 'india'];
    const results: RawTrendItem[] = [];

    for (const sub of subreddits) {
      const url = `https://www.reddit.com/r/${sub}/hot.json?limit=${limitPerSub}`;
      
      try {
        const response = await this.retryWithBackoff(async () => {
          const res = await fetch(url, {
            headers: {
              'User-Agent': this.userAgent,
              'Accept': 'application/json',
            },
          });
          if (!res.ok) {
            throw new Error(`Reddit HTTP ${res.status} for r/${sub}`);
          }
          return res.json();
        });

        const children = response?.data?.children;
        if (!children || !Array.isArray(children)) continue;

        for (const child of children) {
          const post = child.data;
          if (!post || post.stickied || post.over_18) continue;

          const title = (post.title || '').trim();
          if (!title) continue;

          const score = Number(post.score || 0);
          const numComments = Number(post.num_comments || 0);
          const createdUtc = post.created_utc ? post.created_utc * 1000 : Date.now();
          const sourceTimestamp = new Date(createdUtc).toISOString();

          const hoursAgo = Math.max(0.5, (Date.now() - createdUtc) / (1000 * 60 * 60));
          // Velocity = (Score + 2 * Comments) / hoursAgo
          const velocity = Math.round((score + numComments * 2) / hoursAgo);

          results.push({
            source: 'reddit',
            external_id: `reddit-${post.id}`,
            title,
            description: post.selftext ? post.selftext.substring(0, 300) : `Hot discussion on r/${sub} with ${numComments} comments.`,
            url: `https://reddit.com${post.permalink}`,
            source_timestamp: sourceTimestamp,
            raw_metadata: {
              subreddit: post.subreddit,
              score,
              upvote_ratio: post.upvote_ratio,
              num_comments: numComments,
              author: post.author,
            },
            region: sub === 'india' ? 'IN' : 'GLOBAL',
            category: sub === 'india' ? 'India Communities' : 'Global Discussions',
            volume: score + numComments,
            velocity,
          });
        }
      } catch (err) {
        // Individual subreddit fail shouldn't abort the other subreddit
        console.warn(`Reddit r/${sub} fetch error:`, err);
      }
    }

    return results;
  }
}
