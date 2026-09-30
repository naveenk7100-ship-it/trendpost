import { RawTrendItem, NormalizedTopic, TrendSource } from '@/types';
import { nowUTC } from '@/lib/config';

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'in', 'on', 'at', 'for', 'to', 'of', 'and', 'or', 'by',
  'with', 'from', 'is', 'are', 'was', 'were', 'it', 'this', 'that', 'as',
  'be', 'been', 'has', 'have', 'had', 'do', 'does', 'did', 'live', 'update',
  'updates', 'breaking', 'news', 'watch', 'video', 'full', 'exclusive',
  'official', 'today', '2026', 'vs', 'versus', 'new', 'launch'
]);

/**
 * Normalizes title into a clean sequence of core tokens.
 * Example: "iPhone 18 launch in India today!" -> "iphone 18 india"
 */
export function normalizeTitle(title: string): string {
  if (!title) return '';
  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 1 && !STOP_WORDS.has(word))
    .join(' ')
    .trim();
}

/**
 * Computes token similarity between two strings using Jaccard coefficient + token containment.
 * Returns score between 0.0 and 1.0.
 */
export function calculateTopicSimilarity(titleA: string, titleB: string): number {
  const normA = normalizeTitle(titleA);
  const normB = normalizeTitle(titleB);

  if (normA === normB) return 1.0;
  if (!normA || !normB) return 0.0;

  const tokensA = new Set(normA.split(' '));
  const tokensB = new Set(normB.split(' '));

  const intersection = new Set([...tokensA].filter(x => tokensB.has(x)));
  const union = new Set([...tokensA, ...tokensB]);

  const jaccard = intersection.size / union.size;

  // Check if one token set is a complete subset of the other (e.g. "iphone 18" in "iphone 18 launch india")
  const isSubset = [...tokensA].every(t => tokensB.has(t)) || [...tokensB].every(t => tokensA.has(t));
  if (isSubset && intersection.size >= 2) {
    return Math.max(jaccard, 0.75); // High similarity boost for subset matches with >= 2 significant tokens
  }

  return jaccard;
}

/**
 * Normalizes and clusters raw trend items into deduplicated topics.
 */
export function normalizeAndDeduplicate(
  items: RawTrendItem[],
  similarityThreshold = 0.55
): NormalizedTopic[] {
  const clusters: {
    canonical: RawTrendItem;
    sources: Set<TrendSource>;
    items: RawTrendItem[];
    highestVolume: number;
    highestVelocity: number;
  }[] = [];

  for (const item of items) {
    let matchedCluster: (typeof clusters)[0] | null = null;
    let highestSim = 0;

    for (const cluster of clusters) {
      const sim = calculateTopicSimilarity(item.title, cluster.canonical.title);
      if (sim >= similarityThreshold && sim > highestSim) {
        highestSim = sim;
        matchedCluster = cluster;
      }
    }

    if (matchedCluster) {
      // Add to existing cluster
      matchedCluster.items.push(item);
      matchedCluster.sources.add(item.source);
      matchedCluster.highestVolume = Math.max(matchedCluster.highestVolume, item.volume || 0);
      matchedCluster.highestVelocity = Math.max(matchedCluster.highestVelocity, item.velocity || 0);

      // Prefer canonical title that is clear and concise
      if (item.title.length < matchedCluster.canonical.title.length && item.title.length > 10) {
        matchedCluster.canonical = item;
      }
    } else {
      // Create new cluster
      clusters.push({
        canonical: item,
        sources: new Set([item.source]),
        items: [item],
        highestVolume: item.volume || 0,
        highestVelocity: item.velocity || 0,
      });
    }
  }

  // Convert clusters into NormalizedTopic structures
  const fetchedAt = nowUTC();
  const normalizedTopics: NormalizedTopic[] = clusters.map(cluster => {
    const canonical = cluster.canonical;
    const sourcesList = Array.from(cluster.sources);
    const isMultiSource = sourcesList.length > 1;

    // Pick best description from cluster items
    const bestDescription = cluster.items.find(i => (i.description?.length || 0) > 40)?.description 
      || canonical.description 
      || `Trending discussion regarding ${canonical.title}`;

    return {
      source: isMultiSource ? 'multi_source' : canonical.source,
      sources_matched: sourcesList,
      external_id: canonical.external_id,
      title: canonical.title,
      normalized_title: normalizeTitle(canonical.title),
      description: bestDescription,
      url: canonical.url,
      category: canonical.category || 'General',
      volume: cluster.highestVolume,
      velocity: cluster.highestVelocity,
      source_timestamp: canonical.source_timestamp,
      fetched_at: fetchedAt,
      raw_metadata: {
        cluster_size: cluster.items.length,
        sources_matched: sourcesList,
        sample_urls: cluster.items.map(i => i.url).filter(Boolean).slice(0, 3),
      },
      region: canonical.region || 'IN',
      freshness_score: 0,
      volume_score: 0,
      velocity_score: 0,
      instagram_fit_score: 0,
      cross_platform_score: 0,
      virality_score: 0,
      is_top_10: false,
    };
  });

  return normalizedTopics;
}
