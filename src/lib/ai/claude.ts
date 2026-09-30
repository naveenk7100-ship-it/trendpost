import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { ContentIdea, NormalizedTopic } from '@/types';
import { logger } from '@/lib/logger';
import { APP_CONFIG, formatToIST, nowUTC } from '@/lib/config';

// Strict Zod schema validating Claude's structured response
export const GeneratedContentSchema = z.object({
  hook: z.string().min(5, 'Hook must be at least 5 characters'),
  reel_script: z.object({
    hook_3s: z.string().min(5, 'Reel hook in first 3s is required'),
    body_30s: z.string().min(20, 'Reel 30s body is required'),
    payoff: z.string().min(10, 'Reel payoff is required'),
    cta: z.string().min(5, 'Reel CTA is required'),
    estimated_duration_seconds: z.number().int().min(20).max(60).default(30),
    visual_cues: z.array(z.string()).optional(),
  }),
  captions: z.tuple([
    z.string().min(10, 'Caption 1 required'),
    z.string().min(10, 'Caption 2 required'),
    z.string().min(10, 'Caption 3 required'),
  ]),
  hashtags: z.array(z.string()).length(15, 'Exactly 15 hashtags are required'),
  carousel_outline: z.object({
    hook_slide: z.object({
      slide_number: z.literal(1),
      type: z.literal('hook'),
      headline: z.string().min(5),
      content: z.string().min(5),
      visual_suggestion: z.string().optional(),
    }),
    content_slides: z.array(
      z.object({
        slide_number: z.number().int().min(2),
        type: z.literal('content'),
        headline: z.string().min(3),
        content: z.string().min(10),
        visual_suggestion: z.string().optional(),
      })
    ).min(2).max(8),
    cta_slide: z.object({
      slide_number: z.number().int(),
      type: z.literal('cta'),
      headline: z.string().min(3),
      content: z.string().min(5),
      visual_suggestion: z.string().optional(),
    }),
  }),
  recommended_post_time: z.object({
    date: z.string(), // YYYY-MM-DD
    time: z.string(), // HH:mm
    iso_timestamp: z.string(),
    timezone: z.string().default('Asia/Kolkata'),
    reasoning: z.string().min(10),
  }),
  content_angle: z.enum([
    'educational',
    'funny',
    'news-style',
    'relatable',
    'curiosity',
    'contrarian',
    'behind-the-scenes'
  ]),
});

export type GeneratedContentOutput = z.infer<typeof GeneratedContentSchema>;

export class ClaudeContentGenerator {
  private client: Anthropic | null = null;
  private apiKey: string;
  private model: string;

  constructor(apiKey?: string, model?: string) {
    this.apiKey = apiKey || process.env.ANTHROPIC_API_KEY || '';
    this.model = model || APP_CONFIG.defaultAiModel;

    if (this.apiKey) {
      this.client = new Anthropic({ apiKey: this.apiKey });
    }
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.apiKey) {
      return { success: false, message: 'Claude API Key is not configured in settings or environment.' };
    }
    try {
      if (!this.client) {
        this.client = new Anthropic({ apiKey: this.apiKey });
      }
      const response = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 20,
        messages: [{ role: 'user', content: 'Reply with "OK" if connected.' }],
      });
      const text = response.content[0]?.type === 'text' ? response.content[0].text : '';
      return { success: true, message: `Connected to Claude API: ${text.trim()}` };
    } catch (err) {
      return { success: false, message: err instanceof Error ? err.message : String(err) };
    }
  }

  /**
   * Generates production-ready original social media content for a trending topic.
   */
  async generateContentForTopic(
    topic: NormalizedTopic,
    options?: { runId?: string; maxRetries?: number }
  ): Promise<GeneratedContentOutput> {
    const runId = options?.runId || `gen-${Date.now()}`;
    const maxRetries = options?.maxRetries ?? 2;

    if (!this.apiKey || !this.client) {
      throw new Error('CLAUDE_API_KEY_REQUIRED: Claude API key is not configured.');
    }

    const systemPrompt = `You are TrendPost's elite viral social media content creator specializing in Indian & global audiences on Instagram, YouTube Shorts, and LinkedIn.
CRITICAL MANDATES:
1. All generated content MUST be 100% ORIGINAL.
2. NEVER copy source articles, tweets, Reddit posts, captions, scripts, or existing creator content.
3. Use the trending topic solely as high-level inspiration and context.
4. Output MUST be valid JSON strictly matching the requested schema. No markdown backticks, no commentary.
5. All hashtags must start with '#' and be exactly 15 in total.
6. The timezone for recommended posting time must be Asia/Kolkata (IST).`;

    const userPrompt = `Generate a high-converting, original social media package for this trending topic:

TOPIC DETAILS:
- Title: "${topic.title}"
- Description: "${topic.description || 'Trending discussion'}"
- Category: "${topic.category}"
- Virality Score: ${topic.virality_score}/100
- Velocity: ${topic.velocity}
- Region: ${topic.region}

Return a single JSON object with this exact structure:
{
  "hook": "Strong 1-sentence viral hook",
  "reel_script": {
    "hook_3s": "Hook delivered in first 3 seconds (stopping scroll)",
    "body_30s": "Fast-paced, engaging 30-second body explaining the angle/story without fluff",
    "payoff": "The insightful or surprising climax/reveal",
    "cta": "Engaging call to action for comments/shares",
    "estimated_duration_seconds": 30,
    "visual_cues": ["Visual cue 1", "Visual cue 2"]
  },
  "captions": [
    "Option 1: Punchy, short & high curiosity",
    "Option 2: Deep value, storytelling & context",
    "Option 3: Relatable question driving comment debate"
  ],
  "hashtags": [
    "#hashtag1", "#hashtag2", "#hashtag3", "#hashtag4", "#hashtag5",
    "#hashtag6", "#hashtag7", "#hashtag8", "#hashtag9", "#hashtag10",
    "#hashtag11", "#hashtag12", "#hashtag13", "#hashtag14", "#hashtag15"
  ],
  "carousel_outline": {
    "hook_slide": {
      "slide_number": 1,
      "type": "hook",
      "headline": "Scroll-stopping slide 1 headline",
      "content": "Short compelling subtext",
      "visual_suggestion": "Graphic idea"
    },
    "content_slides": [
      {
        "slide_number": 2,
        "type": "content",
        "headline": "Core Insight 1",
        "content": "Clear breakdown",
        "visual_suggestion": "Chart or diagram"
      },
      {
        "slide_number": 3,
        "type": "content",
        "headline": "Core Insight 2",
        "content": "Actionable takeaway",
        "visual_suggestion": "Before/After or bullet list"
      }
    ],
    "cta_slide": {
      "slide_number": 4,
      "type": "cta",
      "headline": "Save this for later",
      "content": "Follow for more daily trend breakdowns & share with a friend",
      "visual_suggestion": "Save button icon & profile avatar"
    }
  },
  "recommended_post_time": {
    "date": "${new Date().toISOString().split('T')[0]}",
    "time": "18:30",
    "iso_timestamp": "${new Date().toISOString()}",
    "timezone": "Asia/Kolkata",
    "reasoning": "Peak evening commute and mobile engagement in India (6:30 PM - 8:30 PM IST)"
  },
  "content_angle": "curiosity" // one of: educational, funny, news-style, relatable, curiosity, contrarian, behind-the-scenes
}`;

    let lastError: unknown;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const startTime = Date.now();
      try {
        logger.info({
          service: 'claude',
          event: 'GENERATE_START',
          message: `Calling Claude for topic: "${topic.title}" (Attempt ${attempt + 1}/${maxRetries + 1})`,
          metadata: { topicId: topic.id, title: topic.title },
          runId,
        });

        const response = await this.client.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 3000,
          temperature: 0.7,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
        });

        const responseText = response.content
          .filter(block => block.type === 'text')
          .map(block => (block as { type: 'text'; text: string }).text)
          .join('\n');

        // Extract JSON from response (strip any accidental backticks or conversational wraps)
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('Claude response did not contain a valid JSON block');
        }

        const rawJson = JSON.parse(jsonMatch[0]);

        // Fix hashtags if fewer or more than 15
        if (Array.isArray(rawJson.hashtags)) {
          let tags = rawJson.hashtags.map((t: string) => t.startsWith('#') ? t : `#${t}`);
          if (tags.length < 15) {
            const generic = ['#trending', '#trendpost', '#india', '#viral', '#explore', '#contentcreator', '#dailyupdates'];
            for (const g of generic) {
              if (tags.length >= 15) break;
              if (!tags.includes(g)) tags.push(g);
            }
          }
          rawJson.hashtags = tags.slice(0, 15);
        }

        // Validate strictly using Zod
        const parsedData = GeneratedContentSchema.parse(rawJson);

        const durationMs = Date.now() - startTime;
        logger.info({
          service: 'claude',
          event: 'GENERATE_SUCCESS',
          message: `Successfully generated content for: "${topic.title}"`,
          metadata: { hook: parsedData.hook, durationMs },
          runId,
          durationMs,
        });

        return parsedData;
      } catch (err) {
        lastError = err;
        const durationMs = Date.now() - startTime;
        const errMsg = err instanceof Error ? err.message : String(err);

        logger.warn({
          service: 'claude',
          event: 'GENERATE_ATTEMPT_FAILED',
          message: `Attempt ${attempt + 1} failed for "${topic.title}": ${errMsg}`,
          metadata: { error: errMsg },
          runId,
          durationMs,
        });

        if (attempt < maxRetries) {
          // Exponential backoff with jitter
          const delayMs = Math.pow(2, attempt) * 1500 + Math.random() * 500;
          await new Promise(r => setTimeout(r, delayMs));
        }
      }
    }

    logger.error({
      service: 'claude',
      event: 'GENERATE_FINAL_FAILURE',
      message: `Failed all ${maxRetries + 1} attempts for "${topic.title}"`,
      metadata: { error: lastError instanceof Error ? lastError.message : String(lastError) },
      runId,
    });

    throw lastError;
  }
}
