import { NormalizedTopic } from '@/types';
import { GeneratedContentOutput, GeneratedContentSchema } from './claude';
import { logger } from '@/lib/logger';
import { formatToIST } from '@/lib/config';

export class DevelopmentAiGenerator {
  readonly name = 'development_ai_generator';

  /**
   * Generates compliant, validated TEST content for a trending topic.
   * Every generated text is clearly marked as [DEVELOPMENT TEST CONTENT].
   * Conforms 100% to GeneratedContentSchema (Zod).
   */
  async generateContentForTopic(
    topic: NormalizedTopic,
    options?: { runId?: string }
  ): Promise<GeneratedContentOutput> {
    const runId = options?.runId || `dev-gen-${Date.now()}`;

    logger.info({
      service: 'ai/dev-generator',
      event: 'DEV_GENERATE_START',
      message: `[FREE MODE] Generating DEVELOPMENT TEST CONTENT for: "${topic.title}"`,
      metadata: { topicId: topic.id, title: topic.title, mode: 'FREE_DEVELOPMENT' },
      runId,
    });

    // Derive realistic angle based on category
    const cat = (topic.category || '').toLowerCase();
    let angle: GeneratedContentOutput['content_angle'] = 'curiosity';
    if (cat.includes('science') || cat.includes('tech')) angle = 'educational';
    else if (cat.includes('entertain') || cat.includes('movie')) angle = 'relatable';
    else if (cat.includes('sport') || cat.includes('cricket')) angle = 'news-style';

    // Build raw test payload
    const testPayload = {
      hook: `[DEVELOPMENT TEST CONTENT] Why "${topic.title}" is breaking the internet in India today`,
      reel_script: {
        hook_3s: `[DEVELOPMENT TEST CONTENT] Stop scrolling! ${topic.title} just triggered massive reactions across India.`,
        body_30s: `Here is the development test breakdown for ${topic.title}. Metrics report a virality score of ${topic.virality_score}/100 and velocity of ${topic.velocity.toLocaleString()} interactions per hour. Production Claude 3.5 Sonnet generation will automatically replace this simulated content once ANTHROPIC_API_KEY is configured in Settings.`,
        payoff: `This trend highlights a major cultural and public interest shift currently playing out nationwide.`,
        cta: `Follow TrendPost for daily high-signal Indian trend intelligence! Drop your thoughts below.`,
        estimated_duration_seconds: 30,
        visual_cues: [
          '[DEVELOPMENT TEST CUE] Headline text popup with virality score badge',
          '[DEVELOPMENT TEST CUE] Animated screen recording of search trends surge'
        ],
      },
      captions: [
        `[DEVELOPMENT TEST CONTENT] Option 1 (Punchy): Major buzz around ${topic.title}. What is your take on this?`,
        `[DEVELOPMENT TEST CONTENT] Option 2 (Deep Dive): Full breakdown of why ${topic.title} is dominating trending charts today with ${topic.virality_score}/100 virality score.`,
        `[DEVELOPMENT TEST CONTENT] Option 3 (Debate): Is ${topic.title} the most significant story this week? Join the discussion below.`
      ] as [string, string, string],
      hashtags: [
        '#trendpost_dev',
        '#development_test_content',
        '#india',
        '#trending',
        '#viral',
        '#dailyupdates',
        '#explorepage',
        '#reelsindia',
        '#techindia',
        '#contentcreator',
        '#breaking',
        '#news',
        '#insights',
        '#analysis',
        '#creatoreconomy'
      ],
      carousel_outline: {
        hook_slide: {
          slide_number: 1 as const,
          type: 'hook' as const,
          headline: `[DEV TEST] ${topic.title}`,
          content: 'Everything you need to know about this trending topic.',
          visual_suggestion: 'High-contrast text card with trend source icon',
        },
        content_slides: [
          {
            slide_number: 2,
            type: 'content' as const,
            headline: '1. What Happened',
            content: topic.description || 'Rapidly expanding discussion detected across Google Trends and social feeds.',
            visual_suggestion: 'Source snippet preview and key points checklist',
          },
          {
            slide_number: 3,
            type: 'content' as const,
            headline: '2. The Data Breakdown',
            content: `Scored with Virality: ${topic.virality_score}/100 and Velocity: +${topic.velocity.toLocaleString()}/hr across ${topic.source}.`,
            visual_suggestion: 'Component score metric cards graphic',
          },
        ],
        cta_slide: {
          slide_number: 4,
          type: 'cta' as const,
          headline: 'Save This Post',
          content: 'Follow TrendPost for daily automated trend curation and viral content creation.',
          visual_suggestion: 'Bookmark icon and profile handle',
        },
      },
      recommended_post_time: {
        date: new Date().toISOString().split('T')[0],
        time: '18:30',
        iso_timestamp: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
        timezone: 'Asia/Kolkata',
        reasoning: 'Peak evening transit and social media engagement across Indian metros (18:30 - 20:30 IST)',
      },
      content_angle: angle,
    };

    // Strictly validate with Zod schema to ensure no deviations from production specification
    const validated = GeneratedContentSchema.parse(testPayload);

    logger.info({
      service: 'ai/dev-generator',
      event: 'DEV_GENERATE_SUCCESS',
      message: `[FREE MODE] Successfully validated development test content for "${topic.title}"`,
      metadata: { hook: validated.hook },
      runId,
    });

    return validated;
  }
}
