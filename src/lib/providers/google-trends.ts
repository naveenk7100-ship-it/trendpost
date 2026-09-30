import { XMLParser } from 'fast-xml-parser';
import { TrendProvider } from './base';
import { RawTrendItem, TrendSource } from '@/types';

export class GoogleTrendsProvider extends TrendProvider {
  readonly name: TrendSource = 'google_trends';
  readonly displayName = 'Google Trends (India)';

  private geo: string;

  constructor(geo = 'IN') {
    super();
    this.geo = process.env.GOOGLE_TRENDS_GEO || geo;
  }

  async testConnection(): Promise<{ success: boolean; message: string; details?: unknown }> {
    try {
      const url = `https://trends.google.com/trending/rss?geo=${this.geo}`;
      const res = await fetch(url, { method: 'HEAD', headers: { 'User-Agent': 'TrendPost/1.0' } });
      if (res.ok) {
        return { success: true, message: `Connected to Google Trends RSS (Geo: ${this.geo})` };
      }
      return { success: false, message: `HTTP ${res.status}: ${res.statusText}` };
    } catch (err) {
      return { success: false, message: err instanceof Error ? err.message : String(err) };
    }
  }

  async fetchTrends(options?: { region?: string; limit?: number }): Promise<RawTrendItem[]> {
    const geo = options?.region || this.geo;
    const limit = options?.limit || 20;
    const feedUrl = `https://trends.google.com/trending/rss?geo=${geo}`;

    return await this.retryWithBackoff(async () => {
      const response = await fetch(feedUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/rss+xml, application/xml, text/xml',
        },
      });

      if (!response.ok) {
        throw new Error(`Google Trends returned HTTP ${response.status}: ${response.statusText}`);
      }

      const xmlText = await response.text();
      const parser = new XMLParser({
        ignoreAttributes: false,
        removeNSPrefix: true,
      });
      const parsed = parser.parse(xmlText);

      const items = parsed?.rss?.channel?.item;
      if (!items) {
        return [];
      }

      const rawItems = Array.isArray(items) ? items : [items];
      const results: RawTrendItem[] = [];

      for (const item of rawItems.slice(0, limit)) {
        const title = String(item.title || '').trim();
        if (!title) continue;

        // Parse approx traffic: "100K+" -> 100000, "2M+" -> 2000000
        const trafficStr = String(item.approx_traffic || '').replace('+', '').trim();
        let volume = 10000;
        if (trafficStr.endsWith('M')) {
          volume = parseFloat(trafficStr) * 1000000;
        } else if (trafficStr.endsWith('K')) {
          volume = parseFloat(trafficStr) * 1000;
        } else if (!isNaN(Number(trafficStr)) && Number(trafficStr) > 0) {
          volume = Number(trafficStr);
        }

        // Pub date
        let sourceTimestamp = new Date().toISOString();
        if (item.pubDate) {
          const parsedDate = new Date(item.pubDate);
          if (!isNaN(parsedDate.getTime())) {
            sourceTimestamp = parsedDate.toISOString();
          }
        }

        // Description / snippet
        let description = '';
        if (typeof item.description === 'string') {
          description = item.description.replace(/<[^>]*>/g, '').trim();
        } else if (item.news_item?.news_item_title) {
          description = String(item.news_item.news_item_title);
        }

        const externalId = `gt-${geo}-${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

        // Compute velocity heuristic based on publication recency
        const hoursAgo = Math.max(0.5, (Date.now() - new Date(sourceTimestamp).getTime()) / (1000 * 60 * 60));
        const velocity = Math.round(volume / hoursAgo);

        results.push({
          source: 'google_trends',
          external_id: externalId,
          title,
          description: description || `Trending on Google Trends India with ${trafficStr || 'high'} search volume.`,
          url: item.link || `https://trends.google.com/trends/trendingsearches/daily?geo=${geo}`,
          source_timestamp: sourceTimestamp,
          raw_metadata: {
            approx_traffic: item.approx_traffic,
            picture: item.picture,
            news_items: item.news_item,
          },
          region: geo,
          category: 'Search Trends',
          volume,
          velocity,
        });
      }

      return results;
    });
  }
}
