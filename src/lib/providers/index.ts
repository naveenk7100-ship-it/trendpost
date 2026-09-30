import { GoogleTrendsProvider } from './google-trends';
import { YouTubeProvider } from './youtube';
import { RedditProvider } from './reddit';
import { XProvider } from './x';
import { TrendProvider } from './base';
import { RawTrendItem } from '@/types';
import { logger } from '@/lib/logger';

export { GoogleTrendsProvider, YouTubeProvider, RedditProvider, XProvider, TrendProvider };

export interface FetchAllResult {
  items: RawTrendItem[];
  providersSucceeded: string[];
  providersFailed: { provider: string; error: string }[];
  totalRawCount: number;
}

export async function fetchAllTrendProviders(options?: {
  runId?: string;
  youtubeApiKey?: string;
  xBearerToken?: string;
}): Promise<FetchAllResult> {
  const runId = options?.runId || `run-${Date.now()}`;
  const google = new GoogleTrendsProvider();
  const youtube = new YouTubeProvider(options?.youtubeApiKey);
  const reddit = new RedditProvider();
  const x = new XProvider(options?.xBearerToken);

  const providers = [google, youtube, reddit, x];

  logger.info({
    service: 'pipeline',
    event: 'PROVIDERS_START',
    message: `Launching concurrent trend fetch across ${providers.length} providers`,
    metadata: { providers: providers.map(p => p.name) },
    runId,
  });

  const promises = providers.map(async (provider) => {
    const result = await provider.safeFetch({ runId });
    return {
      provider: provider.name,
      displayName: provider.displayName,
      ...result,
    };
  });

  const settled = await Promise.allSettled(promises);

  const items: RawTrendItem[] = [];
  const providersSucceeded: string[] = [];
  const providersFailed: { provider: string; error: string }[] = [];

  settled.forEach((res, index) => {
    const providerName = providers[index].name;
    if (res.status === 'fulfilled') {
      const val = res.value;
      if (val.success && val.data.length > 0) {
        providersSucceeded.push(providerName);
        items.push(...val.data);
      } else {
        providersFailed.push({
          provider: providerName,
          error: val.error || 'No trends returned or credentials required',
        });
      }
    } else {
      providersFailed.push({
        provider: providerName,
        error: res.reason instanceof Error ? res.reason.message : String(res.reason),
      });
    }
  });

  logger.info({
    service: 'pipeline',
    event: 'PROVIDERS_FINISHED',
    message: `Fetch complete. Succeeded: [${providersSucceeded.join(', ')}]. Failed: [${providersFailed.map(f => f.provider).join(', ')}]`,
    metadata: {
      totalFound: items.length,
      succeededCount: providersSucceeded.length,
      failedCount: providersFailed.length,
    },
    runId,
  });

  return {
    items,
    providersSucceeded,
    providersFailed,
    totalRawCount: items.length,
  };
}
