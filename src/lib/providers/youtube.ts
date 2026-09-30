import { TrendProvider } from './base';
import { RawTrendItem, TrendSource } from '@/types';

export class YouTubeProvider extends TrendProvider {
  readonly name: TrendSource = 'youtube';
  readonly displayName = 'YouTube Trending (India)';

  private apiKey: string;
  private regionCode: string;

  constructor(apiKey?: string, regionCode = 'IN') {
    super();
    this.apiKey = apiKey || process.env.YOUTUBE_API_KEY || '';
    this.regionCode = regionCode;
  }

  setApiKey(key: string) {
    this.apiKey = key;
  }

  async testConnection(): Promise<{ success: boolean; message: string; details?: unknown }> {
    if (!this.apiKey) {
      return {
        success: false,
        message: 'YouTube API Key is not configured. Please add your API key in Settings -> API Keys.',
      };
    }

    try {
      const url = `https://www.googleapis.com/youtube/v3/videoCategories?part=snippet&regionCode=${this.regionCode}&key=${this.apiKey}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) {
        return {
          success: false,
          message: data.error?.message || `YouTube API returned HTTP ${res.status}`,
          details: data.error,
        };
      }
      return {
        success: true,
        message: 'Successfully authenticated with YouTube Data API v3.',
        details: { itemsCount: data.items?.length },
      };
    } catch (err) {
      return {
        success: false,
        message: err instanceof Error ? err.message : String(err),
      };
    }
  }

  async fetchTrends(options?: { region?: string; limit?: number }): Promise<RawTrendItem[]> {
    if (!this.apiKey) {
      throw new Error('YOUTUBE_API_KEY_REQUIRED: Please configure YouTube API Key in settings');
    }

    const region = options?.region || this.regionCode;
    const limit = Math.min(options?.limit || 20, 50);

    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&chart=mostPopular&regionCode=${region}&maxResults=${limit}&key=${this.apiKey}`;

    return await this.retryWithBackoff(async () => {
      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || `YouTube API returned ${response.status}`);
      }

      if (!data.items || !Array.isArray(data.items)) {
        return [];
      }

      const results: RawTrendItem[] = [];

      for (const item of data.items) {
        const snippet = item.snippet || {};
        const stats = item.statistics || {};
        const title = snippet.title?.trim();
        if (!title) continue;

        const viewCount = parseInt(stats.viewCount || '0', 10);
        const likeCount = parseInt(stats.likeCount || '0', 10);
        const commentCount = parseInt(stats.commentCount || '0', 10);

        const publishedAt = snippet.publishedAt || new Date().toISOString();
        const hoursAgo = Math.max(0.5, (Date.now() - new Date(publishedAt).getTime()) / (1000 * 60 * 60));
        const velocity = Math.round(viewCount / hoursAgo);

        results.push({
          source: 'youtube',
          external_id: `yt-${item.id}`,
          title,
          description: snippet.description?.substring(0, 300) || `Trending video on YouTube India by ${snippet.channelTitle}`,
          url: `https://www.youtube.com/watch?v=${item.id}`,
          source_timestamp: publishedAt,
          raw_metadata: {
            videoId: item.id,
            channelTitle: snippet.channelTitle,
            tags: snippet.tags?.slice(0, 10),
            viewCount,
            likeCount,
            commentCount,
            thumbnails: snippet.thumbnails,
          },
          region,
          category: snippet.categoryId || 'Entertainment',
          volume: viewCount,
          velocity,
        });
      }

      return results;
    });
  }
}
