import { NormalizedTopic, ScoreComponents, TrendSource } from '@/types';

// High-affinity visual/Instagram creator keywords
const INSTAGRAM_FIT_KEYWORDS = [
  'trailer', 'movie', 'teaser', 'launch', 'release', 'apple', 'iphone', 'ai',
  'chatgpt', 'google', 'cricket', 'ipl', 'virat', 'rohit', 'bollywood',
  'netflix', 'actor', 'actress', 'viral', 'meme', 'fashion', 'tech', 'gadget',
  'box office', 'review', 'leak', 'features', 'update', 'money', 'crypto',
  'scam', 'game', 'gaming', 'car', 'electric'
];

/**
 * Calculates Freshness Score (0-100) based on hours elapsed since creation/detection.
 */
export function calculateFreshnessScore(sourceTimestamp: string): number {
  try {
    const timestampMs = new Date(sourceTimestamp).getTime();
    if (isNaN(timestampMs)) return 50;

    const hoursAgo = Math.max(0, (Date.now() - timestampMs) / (1000 * 60 * 60));

    if (hoursAgo <= 2) return Math.round(95 + (2 - hoursAgo) * 2.5); // 95 - 100
    if (hoursAgo <= 6) return Math.round(80 + (6 - hoursAgo) * 3.75); // 80 - 95
    if (hoursAgo <= 12) return Math.round(65 + (12 - hoursAgo) * 2.5); // 65 - 80
    if (hoursAgo <= 24) return Math.round(40 + (24 - hoursAgo) * 2.0); // 40 - 64
    if (hoursAgo <= 48) return Math.round(20 + (48 - hoursAgo) * 0.8); // 20 - 40
    return Math.max(5, Math.round(20 - (hoursAgo - 48) * 0.2));
  } catch {
    return 50;
  }
}

/**
 * Calculates Volume Score (0-100) using smooth logarithmic scaling.
 */
export function calculateVolumeScore(volume: number): number {
  if (!volume || volume <= 0) return 10;
  // Log base 10: 1K=3 (score ~40), 10K=4 (~55), 100K=5 (~70), 1M=6 (~85), 10M=7 (100)
  const logVol = Math.log10(Math.max(1, volume));
  const score = Math.round(((logVol - 1) / 6) * 100);
  return Math.min(100, Math.max(10, score));
}

/**
 * Calculates Velocity Score (0-100) based on rate of interactions per hour.
 */
export function calculateVelocityScore(velocity: number): number {
  if (!velocity || velocity <= 0) return 15;
  // Log base 10 of velocity per hour
  const logVel = Math.log10(Math.max(1, velocity));
  const score = Math.round(((logVel - 1) / 5) * 100);
  return Math.min(100, Math.max(15, score));
}

/**
 * Calculates Instagram Relevance Score (0-100) evaluating visual storytelling and creator affinity.
 */
export function calculateInstagramFitScore(title: string, description = '', category = ''): number {
  const text = `${title} ${description} ${category}`.toLowerCase();
  let matches = 0;

  for (const kw of INSTAGRAM_FIT_KEYWORDS) {
    if (text.includes(kw)) {
      matches++;
    }
  }

  // Base score 40 + 15 points per matched keyword up to 95
  let score = 40 + matches * 15;

  // Bonus for short, punchy titles that translate well to Reel hooks
  if (title.length >= 10 && title.length <= 50) {
    score += 5;
  }

  return Math.min(100, Math.max(25, score));
}

/**
 * Calculates Cross-Platform Score (0-100) based on number of distinct sources.
 */
export function calculateCrossPlatformScore(sources: TrendSource[] = []): number {
  const count = new Set(sources).size;
  if (count >= 4) return 100;
  if (count === 3) return 85;
  if (count === 2) return 65;
  return 30; // Single platform
}

/**
 * Computes composite transparent virality score and component breakdown.
 */
export function computeScoreComponents(
  topic: Pick<NormalizedTopic, 'source_timestamp' | 'volume' | 'velocity' | 'title' | 'description' | 'category' | 'sources_matched'>
): ScoreComponents {
  const freshness_score = calculateFreshnessScore(topic.source_timestamp);
  const volume_score = calculateVolumeScore(topic.volume);
  const velocity_score = calculateVelocityScore(topic.velocity);
  const instagram_fit_score = calculateInstagramFitScore(topic.title, topic.description, topic.category);
  const cross_platform_score = calculateCrossPlatformScore(topic.sources_matched || []);

  // Transparent composite formula:
  // Freshness (20%) + Velocity (25%) + Volume (20%) + Instagram Fit (20%) + Cross-Platform (15%)
  const virality_score = Math.round(
    freshness_score * 0.20 +
    velocity_score * 0.25 +
    volume_score * 0.20 +
    instagram_fit_score * 0.20 +
    cross_platform_score * 0.15
  );

  return {
    freshness_score,
    volume_score,
    velocity_score,
    instagram_fit_score,
    cross_platform_score,
    virality_score: Math.min(100, Math.max(0, virality_score)),
  };
}

/**
 * Scores and ranks topics, marking the top N (default 10) as is_top_10.
 */
export function scoreAndRankTopics(topics: NormalizedTopic[], topN = 10): NormalizedTopic[] {
  const scoredTopics = topics.map(topic => {
    const scores = computeScoreComponents(topic);
    return {
      ...topic,
      ...scores,
    };
  });

  // Sort descending by virality score
  scoredTopics.sort((a, b) => b.virality_score - a.virality_score);

  // Mark top N
  return scoredTopics.map((topic, index) => ({
    ...topic,
    is_top_10: index < topN,
  }));
}
