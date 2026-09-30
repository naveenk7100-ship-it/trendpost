import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { OpenRouterContentGenerator } from '@/lib/ai/openrouter';
import { generateContentUnified } from '@/lib/ai';
import { GeneratedContentSchema } from '@/lib/ai/claude';
import { NormalizedTopic } from '@/types';
import { repository } from '@/lib/db/repository';

const mockTopic: NormalizedTopic = {
  id: 'topic-test-1',
  source: 'google_trends',
  external_id: 'gt-in-openrouter-test',
  title: 'OpenAI and OpenRouter Free Model Announcement',
  normalized_title: 'openai and openrouter free model announcement',
  description: 'Major buzz around open model routing for developers in India',
  category: 'Technology',
  volume: 50000,
  velocity: 4500,
  source_timestamp: new Date().toISOString(),
  fetched_at: new Date().toISOString(),
  freshness_score: 95,
  volume_score: 75,
  velocity_score: 80,
  instagram_fit_score: 85,
  cross_platform_score: 60,
  virality_score: 79,
  is_top_10: true,
  region: 'IN',
  raw_metadata: {},
};

const validGeneratedJson = {
  hook: 'Why everyone in India is talking about this new open AI routing breakthrough',
  reel_script: {
    hook_3s: 'Stop scrolling: This free model router changes everything for creators.',
    body_30s: 'Developers across India just gained zero-cost access to state of the art models. It handles viral hooks, captions, and scripts automatically without credit cards.',
    payoff: 'You can now run full automated content pipelines completely free.',
    cta: 'Share this with a fellow creator and drop your thoughts below!',
    estimated_duration_seconds: 30,
    visual_cues: ['Popup badge', 'Screen recording of dashboard'],
  },
  captions: [
    'Option 1 (Punchy): Free AI models just leveled the playing field for creators.',
    'Option 2 (Deep Dive): Full technical breakdown of how open router routing works.',
    'Option 3 (Debate): Will free open models surpass proprietary ones this year? Comment below.',
  ],
  hashtags: [
    '#openrouter', '#ai', '#freeai', '#india', '#trending',
    '#techindia', '#contentcreator', '#viral', '#reelsindia', '#creatoreconomy',
    '#innovation', '#automation', '#news', '#insights', '#dailyupdates'
  ],
  carousel_outline: {
    hook_slide: {
      slide_number: 1,
      type: 'hook',
      headline: 'The Free AI Revolution in 2026',
      content: 'How creators are building automated pipelines with zero cost.',
      visual_suggestion: 'Dark mode terminal graphic',
    },
    content_slides: [
      {
        slide_number: 2,
        type: 'content',
        headline: '1. What Happened',
        content: 'OpenRouter announced free model routing endpoints for global developers.',
        visual_suggestion: 'Feature bullet cards',
      },
      {
        slide_number: 3,
        type: 'content',
        headline: '2. The Direct Benefit',
        content: 'Lower costs and higher throughput without paid API subscription barriers.',
        visual_suggestion: 'Comparison bar chart',
      },
    ],
    cta_slide: {
      slide_number: 4,
      type: 'cta',
      headline: 'Save & Follow TrendPost',
      content: 'Daily curated trend intelligence for viral creators.',
      visual_suggestion: 'Bookmark icon and handle',
    },
  },
  recommended_post_time: {
    date: '2026-09-30',
    time: '18:30',
    iso_timestamp: '2026-09-30T13:00:00Z',
    timezone: 'Asia/Kolkata',
    reasoning: 'Peak evening engagement in Indian metros',
  },
  content_angle: 'curiosity',
};

describe('OpenRouter Provider Integration Tests', () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env = { ...originalEnv };
  });

  it('1. Constructs correct OpenRouter request with default model openrouter/free and json_object response format', async () => {
    let capturedUrl = '';
    let capturedHeaders: Record<string, string> = {};
    let capturedBody: any = null;

    globalThis.fetch = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      capturedUrl = url;
      capturedHeaders = (init?.headers as Record<string, string>) || {};
      capturedBody = JSON.parse((init?.body as string) || '{}');

      return {
        ok: true,
        status: 200,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify(validGeneratedJson),
              },
            },
          ],
        }),
      } as Response;
    });

    const generator = new OpenRouterContentGenerator('sk-or-v1-testkey123', 'openrouter/free');
    const result = await generator.generateContentForTopic(mockTopic);

    expect(capturedUrl).toBe('https://openrouter.ai/api/v1/chat/completions');
    expect(capturedHeaders['Authorization']).toBe('Bearer sk-or-v1-testkey123');
    expect(capturedHeaders['HTTP-Referer']).toBe('https://trendpost.app');
    expect(capturedBody.model).toBe('openrouter/free');
    expect(capturedBody.response_format).toEqual({ type: 'json_object' });
    expect(result.hook).toBe(validGeneratedJson.hook);
    expect(result.hashtags).toHaveLength(15);
  });

  it('2. Falls back to Development AI when OPENROUTER_API_KEY is missing', async () => {
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;

    const result = await generateContentUnified(mockTopic);

    expect(result.isDevelopmentContent).toBe(true);
    expect(result.providerUsed).toBe('development');
    expect(result.modelUsed).toBe('development_test');
    expect(result.generationStatus).toBe('fallback');
    expect(result.content.hook).toContain('[DEVELOPMENT TEST CONTENT]');
    expect(result.content.hashtags).toHaveLength(15);
  });

  it('3. Successfully parses and strictly validates OpenRouter response matching GeneratedContentSchema', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify(validGeneratedJson),
            },
          },
        ],
      }),
    } as Response);

    const generator = new OpenRouterContentGenerator('sk-or-v1-testkey');
    const output = await generator.generateContentForTopic(mockTopic);

    // Schema validation assertion
    const validated = GeneratedContentSchema.safeParse(output);
    expect(validated.success).toBe(true);
    expect(output.reel_script.estimated_duration_seconds).toBe(30);
    expect(output.captions).toHaveLength(3);
  });

  it('4. Handles malformed JSON with markdown backticks via safe repair extraction', async () => {
    const wrappedInMarkdown = "Here is your requested content:\n```json\n" + JSON.stringify(validGeneratedJson) + "\n```\nHope you find this useful!";

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [
          {
            message: {
              content: wrappedInMarkdown,
            },
          },
        ],
      }),
    } as Response);

    const generator = new OpenRouterContentGenerator('sk-or-v1-testkey');
    const output = await generator.generateContentForTopic(mockTopic);

    expect(output.hook).toBe(validGeneratedJson.hook);
    expect(output.captions).toHaveLength(3);
    expect(output.hashtags).toHaveLength(15);
  });

  it('5. Handles Zod validation failure by attempting concise correction retry', async () => {
    let callCount = 0;

    globalThis.fetch = vi.fn().mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        // Missing required captions array
        return {
          ok: true,
          status: 200,
          json: async () => ({
            choices: [
              {
                message: {
                  content: JSON.stringify({ hook: 'Short' }), // invalid payload
                },
              },
            ],
          }),
        } as Response;
      }

      // Correction returns valid content
      return {
        ok: true,
        status: 200,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify(validGeneratedJson),
              },
            },
          ],
        }),
      } as Response;
    });

    const generator = new OpenRouterContentGenerator('sk-or-v1-testkey');
    const output = await generator.generateContentForTopic(mockTopic);

    expect(callCount).toBe(2);
    expect(output.hook).toBe(validGeneratedJson.hook);
  });

  it('6. Handles OpenRouter rate-limiting (HTTP 429) with backoff and retry', async () => {
    let attempts = 0;

    globalThis.fetch = vi.fn().mockImplementation(async () => {
      attempts++;
      if (attempts === 1) {
        return {
          ok: false,
          status: 429,
          headers: new Headers({ 'Retry-After': '1' }),
          text: async () => 'Rate limit exceeded',
        } as Response;
      }

      return {
        ok: true,
        status: 200,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify(validGeneratedJson),
              },
            },
          ],
        }),
      } as Response;
    });

    const generator = new OpenRouterContentGenerator('sk-or-v1-testkey');
    const output = await generator.generateContentForTopic(mockTopic, { maxRetries: 2 });

    expect(attempts).toBe(2);
    expect(output.hook).toBe(validGeneratedJson.hook);
  });

  it('7. Falls back to DevelopmentAiGenerator when OpenRouter API throws persistent error', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network connection timeout'));

    process.env.OPENROUTER_API_KEY = 'sk-or-v1-active-key';

    const result = await generateContentUnified(mockTopic);

    expect(result.isDevelopmentContent).toBe(true);
    expect(result.providerUsed).toBe('development');
    expect(result.modelUsed).toBe('development_test');
    expect(result.generationStatus).toBe('fallback');
    expect(result.content.hook).toContain('[DEVELOPMENT TEST CONTENT]');
  });

  it('8. Accurately records provider, model, and generation_status metadata', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify(validGeneratedJson),
            },
          },
        ],
      }),
    } as Response);

    const result = await generateContentUnified(mockTopic, {
      apiKey: 'sk-or-v1-custom-key',
      model: 'openrouter/free',
    });

    expect(result.providerUsed).toBe('openrouter');
    expect(result.modelUsed).toBe('openrouter/free');
    expect(result.generationStatus).toBe('success');
    expect(result.isDevelopmentContent).toBe(false);
  });

  it('9. Successfully verifies connection test against OpenRouter auth endpoint', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          label: 'TrendPost Production Key',
          limit: 100,
          usage: 5,
        },
      }),
    } as Response);

    const generator = new OpenRouterContentGenerator('sk-or-v1-testkey');
    const testResult = await generator.testConnection();

    expect(testResult.success).toBe(true);
    expect(testResult.message).toContain('Connected to OpenRouter API');
  });

  it('10. Reports failed connection test if key is invalid', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      text: async () => JSON.stringify({ error: { message: 'Invalid API key provided' } }),
    } as Response);

    const generator = new OpenRouterContentGenerator('sk-or-v1-invalid-key');
    const testResult = await generator.testConnection();

    expect(testResult.success).toBe(false);
    expect(testResult.message).toContain('Invalid API key provided');
  });
});
