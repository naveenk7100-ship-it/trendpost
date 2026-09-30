import { describe, it, expect } from 'vitest';
import {
  calculateFreshnessScore,
  calculateVolumeScore,
  calculateVelocityScore,
  calculateInstagramFitScore,
  calculateCrossPlatformScore,
  computeScoreComponents,
  scoreAndRankTopics
} from '@/lib/scoring/scorer';
import { NormalizedTopic } from '@/types';

describe('Transparent Virality Scoring Engine', () => {
  it('calculates freshness decay accurately', () => {
    const recent = new Date().toISOString();
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const threeDaysAgo = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();

    const scoreRecent = calculateFreshnessScore(recent);
    const scoreOneDay = calculateFreshnessScore(oneDayAgo);
    const scoreThreeDays = calculateFreshnessScore(threeDaysAgo);

    expect(scoreRecent).toBeGreaterThanOrEqual(95);
    expect(scoreOneDay).toBeLessThan(scoreRecent);
    expect(scoreThreeDays).toBeLessThan(scoreOneDay);
  });

  it('calculates logarithmic volume and velocity scores between 0 and 100', () => {
    expect(calculateVolumeScore(100)).toBeGreaterThan(0);
    expect(calculateVolumeScore(10000000)).toBeLessThanOrEqual(100);

    expect(calculateVelocityScore(10)).toBeGreaterThan(0);
    expect(calculateVelocityScore(50000)).toBeLessThanOrEqual(100);
  });

  it('rewards Instagram and creator-friendly topics', () => {
    const highFit = calculateInstagramFitScore('New Apple iPhone AI Trailer Launch', 'Viral tech gadget reveal');
    const lowFit = calculateInstagramFitScore('Municipal Council Minutes Meeting', 'Administrative agenda');

    expect(highFit).toBeGreaterThan(lowFit);
  });

  it('computes transparent weighted composite virality score', () => {
    const topic = {
      title: 'Virat Kohli Century IPL Final',
      description: 'Viral cricket match climax',
      category: 'Sports',
      volume: 500000,
      velocity: 15000,
      source_timestamp: new Date().toISOString(),
      sources_matched: ['google_trends', 'youtube', 'x'] as any,
    };

    const scores = computeScoreComponents(topic);

    expect(scores.virality_score).toBeGreaterThan(60);
    expect(scores.cross_platform_score).toBe(85);
    expect(scores.virality_score).toBeLessThanOrEqual(100);
  });

  it('ranks topics and marks exactly top N as is_top_10', () => {
    const sampleTopics: NormalizedTopic[] = Array.from({ length: 15 }, (_, i) => ({
      source: 'google_trends',
      external_id: `id-${i}`,
      title: `Topic ${i}`,
      normalized_title: `topic ${i}`,
      category: 'General',
      volume: (i + 1) * 10000,
      velocity: (i + 1) * 500,
      source_timestamp: new Date().toISOString(),
      fetched_at: new Date().toISOString(),
      freshness_score: 80,
      volume_score: 50,
      velocity_score: 50,
      instagram_fit_score: 50,
      cross_platform_score: 30,
      virality_score: 0,
      is_top_10: false,
      raw_metadata: {},
      region: 'IN',
    }));

    const ranked = scoreAndRankTopics(sampleTopics, 10);

    const top10 = ranked.filter(t => t.is_top_10);
    expect(top10).toHaveLength(10);
    // Should be sorted in descending order of virality score
    for (let i = 0; i < ranked.length - 1; i++) {
      expect(ranked[i].virality_score).toBeGreaterThanOrEqual(ranked[i + 1].virality_score);
    }
  });
});
