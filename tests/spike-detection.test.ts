import { describe, it, expect } from 'vitest';
import { SpikeDetector } from '@/lib/spikes/spike-detector';
import { NormalizedTopic } from '@/types';

describe('2-Hour Spike Detection Engine', () => {
  const detector = new SpikeDetector();

  it('detects a major score surge exceeding the threshold', () => {
    const previousTopics: NormalizedTopic[] = [
      {
        source: 'google_trends',
        external_id: 'top-1',
        title: 'DeepSeek Breakthrough',
        normalized_title: 'deepseek breakthrough',
        virality_score: 50,
        velocity: 1000,
        volume: 20000,
        source_timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        fetched_at: new Date().toISOString(),
        category: 'Tech',
        region: 'IN',
        raw_metadata: {},
        is_top_10: true,
        freshness_score: 70,
        volume_score: 50,
        velocity_score: 50,
        instagram_fit_score: 80,
        cross_platform_score: 30,
      }
    ];

    const currentTopics: NormalizedTopic[] = [
      {
        ...previousTopics[0],
        virality_score: 85, // +35 pts surge
        velocity: 12000,
      }
    ];

    const spikes = detector.detectSpikes(currentTopics, previousTopics, {
      scoreChangeThreshold: 20,
      minimumSignificance: 60,
    });

    expect(spikes).toHaveLength(1);
    expect(spikes[0].score_change).toBe(35);
    expect(spikes[0].current_score).toBe(85);
    expect(spikes[0].severity).toBe('critical');
    expect(spikes[0].raw_context.spike_reason).toBeDefined();
  });

  it('ignores minor incremental changes below the threshold', () => {
    const previousTopics: NormalizedTopic[] = [
      {
        source: 'reddit',
        external_id: 'top-2',
        title: 'Daily Commute Discussion',
        normalized_title: 'daily commute discussion',
        virality_score: 40,
        velocity: 200,
        volume: 5000,
        source_timestamp: new Date().toISOString(),
        fetched_at: new Date().toISOString(),
        category: 'General',
        region: 'IN',
        raw_metadata: {},
        is_top_10: false,
        freshness_score: 60,
        volume_score: 30,
        velocity_score: 30,
        instagram_fit_score: 40,
        cross_platform_score: 30,
      }
    ];

    const currentTopics: NormalizedTopic[] = [
      {
        ...previousTopics[0],
        virality_score: 45, // Only +5 pts surge
        velocity: 250,
      }
    ];

    const spikes = detector.detectSpikes(currentTopics, previousTopics, {
      scoreChangeThreshold: 20,
      minimumSignificance: 60,
    });

    expect(spikes).toHaveLength(0);
  });
});
