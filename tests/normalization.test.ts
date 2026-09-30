import { describe, it, expect } from 'vitest';
import {
  normalizeTitle,
  calculateTopicSimilarity,
  normalizeAndDeduplicate
} from '@/lib/normalization/deduplicator';
import { RawTrendItem } from '@/types';

describe('Trend Normalization & Cross-Platform Deduplication', () => {
  it('normalizes titles by removing punctuation and stop-words', () => {
    const raw = 'iPhone 18 launch in India today!';
    const normalized = normalizeTitle(raw);
    expect(normalized).toBe('iphone 18 india');
  });

  it('detects high similarity between closely related topic variations', () => {
    const similarity1 = calculateTopicSimilarity('iPhone 18', 'iPhone 18 launch');
    const similarity2 = calculateTopicSimilarity('iPhone 18', 'iPhone 18 India');
    const similarity3 = calculateTopicSimilarity('iPhone 18', 'Stock Market Crash');

    expect(similarity1).toBeGreaterThanOrEqual(0.7);
    expect(similarity2).toBeGreaterThanOrEqual(0.7);
    expect(similarity3).toBeLessThan(0.3);
  });

  it('clusters and deduplicates similar topics across multiple sources', () => {
    const rawItems: RawTrendItem[] = [
      {
        source: 'google_trends',
        external_id: 'gt-1',
        title: 'iPhone 18',
        volume: 100000,
        velocity: 5000,
        source_timestamp: new Date().toISOString(),
        raw_metadata: {},
      },
      {
        source: 'reddit',
        external_id: 'reddit-1',
        title: 'iPhone 18 launch',
        volume: 25000,
        velocity: 3000,
        source_timestamp: new Date().toISOString(),
        raw_metadata: {},
      },
      {
        source: 'youtube',
        external_id: 'yt-1',
        title: 'iPhone 18 India',
        volume: 80000,
        velocity: 9000,
        source_timestamp: new Date().toISOString(),
        raw_metadata: {},
      },
      {
        source: 'google_trends',
        external_id: 'gt-2',
        title: 'Budget 2026 Announcement',
        volume: 50000,
        velocity: 2000,
        source_timestamp: new Date().toISOString(),
        raw_metadata: {},
      }
    ];

    const deduplicated = normalizeAndDeduplicate(rawItems);

    // Expect 2 distinct clusters: iPhone 18 cluster and Budget 2026 cluster
    expect(deduplicated.length).toBe(2);

    const iphoneCluster = deduplicated.find(t => t.normalized_title.includes('iphone'));
    expect(iphoneCluster).toBeDefined();
    expect(iphoneCluster?.source).toBe('multi_source');
    expect(iphoneCluster?.sources_matched).toHaveLength(3);
    // Highest volume should be 100,000 and highest velocity 9,000
    expect(iphoneCluster?.volume).toBe(100000);
    expect(iphoneCluster?.velocity).toBe(9000);
  });
});
