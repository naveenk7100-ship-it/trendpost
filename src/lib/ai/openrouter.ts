import { z } from 'zod';
import { NormalizedTopic } from '@/types';
import { logger } from '@/lib/logger';
import { APP_CONFIG, formatToIST, nowUTC } from '@/lib/config';
import { GeneratedContentOutput, GeneratedContentSchema } from './claude';

export { GeneratedContentSchema };
export type { GeneratedContentOutput };

export interface OpenRouterGeneratorOptions {
  apiKey?: string;
  model?: string;
  baseUrl?: string;
}

export class OpenRouterContentGenerator {
  private apiKey: string;
  private model: string;
  private baseUrl: string;

  constructor(apiKey?: string, model?: string, baseUrl = 'https://openrouter.ai/api/v1') {
    this.apiKey = apiKey || process.env.OPENROUTER_API_KEY || '';
    this.model = model || process.env.OPENROUTER_MODEL || 'openrouter/free';
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 5);
  }

  getModel(): string {
    return this.model;
  }

  /**
   * Minimal live verification against OpenRouter's auth endpoint.
   * Reports CONNECTED only when the API responds with a successful authenticated status.
   */
  async testConnection(): Promise<{ success: boolean; message: string; details?: unknown }> {
    if (!this.isConfigured()) {
      return {
        success: false,
        message: 'OpenRouter API Key is not configured. Please add OPENROUTER_API_KEY in settings or environment.',
      };
    }

    try {
      const response = await fetch(`${this.baseUrl}/auth/key`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'HTTP-Referer': 'https://trendpost.app',
          'X-Title': 'TrendPost SaaS',
        },
      });

      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        return {
          success: true,
          message: `Connected to OpenRouter API successfully (Active model: ${this.model})`,
          details: {
            model: this.model,
            label: data?.data?.label,
            limit: data?.data?.limit,
            usage: data?.data?.usage,
          },
        };
      }

      const errorText = await response.text().catch(() => '');
      let errorMsg = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson?.error?.message) {
          errorMsg = errorJson.error.message;
        }
      } catch {
        if (errorText) errorMsg += ` - ${errorText.slice(0, 100)}`;
      }

      return {
        success: false,
        message: `OpenRouter authentication failed: ${errorMsg}`,
      };
    } catch (err) {
      return {
        success: false,
        message: err instanceof Error ? err.message : String(err),
      };
    }
  }

  /**
   * Generates production-ready original social media package for a trending topic.
   */
  async generateContentForTopic(
    topic: NormalizedTopic,
    options?: { runId?: string; maxRetries?: number }
  ): Promise<GeneratedContentOutput> {
    const runId = options?.runId || `openrouter-${Date.now()}`;
    const maxRetries = options?.maxRetries ?? 2;

    if (!this.isConfigured()) {
      throw new Error('OPENROUTER_API_KEY_REQUIRED: OpenRouter API key is not configured.');
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
  "content_angle": "curiosity"
}`;

    let lastError: unknown;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const startTime = Date.now();
      try {
        logger.info({
          service: 'openrouter',
          event: 'GENERATE_START',
          message: `Calling OpenRouter (${this.model}) for topic: "${topic.title}" (Attempt ${attempt + 1}/${maxRetries + 1})`,
          metadata: { topicId: topic.id, title: topic.title, model: this.model },
          runId,
        });

        // Request with response_format json_object where supported
        const requestPayload: Record<string, unknown> = {
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.7,
        };

        const res = await fetch(`${this.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
            'HTTP-Referer': 'https://trendpost.app',
            'X-Title': 'TrendPost SaaS',
          },
          body: JSON.stringify(requestPayload),
        });

        // Handle Rate Limiting (429)
        if (res.status === 429) {
          const retryAfterSec = parseInt(res.headers.get('Retry-After') || '2', 10);
          const backoffWait = Math.max(retryAfterSec * 1000, 2000 * Math.pow(2, attempt));
          logger.warn({
            service: 'openrouter',
            event: 'RATE_LIMIT_DETECTED',
            message: `OpenRouter rate limit (429) hit. Backing off for ${backoffWait}ms...`,
            metadata: { attempt, backoffWait, model: this.model },
            runId,
          });

          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, backoffWait));
            continue;
          }
          throw new Error('OPENROUTER_RATE_LIMIT: Daily free limit or concurrency exceeded.');
        }

        if (!res.ok) {
          const errBody = await res.text().catch(() => '');
          throw new Error(`OpenRouter HTTP ${res.status}: ${errBody.slice(0, 200)}`);
        }

        const data = await res.json();
        const contentText = data?.choices?.[0]?.message?.content || '';

        // Safe extraction and repair
        const parsedOutput = await this.parseAndValidate(contentText, {
          attemptCorrection: attempt < maxRetries,
          originalPrompts: { systemPrompt, userPrompt },
        });

        const durationMs = Date.now() - startTime;
        logger.info({
          service: 'openrouter',
          event: 'GENERATE_SUCCESS',
          message: `Successfully generated content via OpenRouter for "${topic.title}" in ${durationMs}ms`,
          metadata: { topicId: topic.id, title: topic.title, model: this.model, durationMs },
          runId,
          durationMs,
        });

        return parsedOutput;
      } catch (err) {
        lastError = err;
        const errMsg = err instanceof Error ? err.message : String(err);
        logger.warn({
          service: 'openrouter',
          event: 'GENERATE_ATTEMPT_FAILED',
          message: `OpenRouter generation attempt ${attempt + 1} failed: ${errMsg}`,
          metadata: { attempt, error: errMsg, model: this.model },
          runId,
        });

        if (attempt < maxRetries) {
          // Exponential backoff
          const waitMs = 1500 * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, waitMs));
        }
      }
    }

    throw lastError instanceof Error ? lastError : new Error(String(lastError));
  }

  /**
   * Safely repairs, parses, and validates OpenRouter output against GeneratedContentSchema.
   * If parsing fails, optionally sends a concise correction request.
   */
  private async parseAndValidate(
    rawText: string,
    options: {
      attemptCorrection: boolean;
      originalPrompts: { systemPrompt: string; userPrompt: string };
    }
  ): Promise<GeneratedContentOutput> {
    try {
      // 1. Strip markdown fences or extract first valid JSON block
      const cleanJsonString = this.extractJsonString(rawText);
      const rawJson = JSON.parse(cleanJsonString);

      // 2. Normalize and ensure exactly 15 hashtags
      if (Array.isArray(rawJson.hashtags)) {
        let tags = rawJson.hashtags.map((t: unknown) => {
          const str = String(t || '').trim();
          return str.startsWith('#') ? str : `#${str}`;
        }).filter((t: string) => t.length > 1);

        if (tags.length < 15) {
          const fallbackTags = [
            '#trendpost', '#india', '#trending', '#viral', '#dailyupdates',
            '#tech', '#news', '#insights', '#explorepage', '#reelsindia',
            '#contentcreator', '#discussion', '#latestnews', '#breaking', '#analysis'
          ];
          for (const fb of fallbackTags) {
            if (tags.length >= 15) break;
            if (!tags.includes(fb)) tags.push(fb);
          }
        }
        rawJson.hashtags = tags.slice(0, 15);
      }

      // 3. Fallback defaults for missing fields if minor
      if (!rawJson.content_angle) {
        rawJson.content_angle = 'curiosity';
      }
      if (!rawJson.recommended_post_time?.timezone) {
        rawJson.recommended_post_time = {
          date: new Date().toISOString().split('T')[0],
          time: '18:30',
          iso_timestamp: new Date().toISOString(),
          timezone: 'Asia/Kolkata',
          reasoning: 'Peak evening commuter engagement across Indian metros',
          ...(rawJson.recommended_post_time || {}),
        };
      }

      // 4. Validate strictly using Zod
      return GeneratedContentSchema.parse(rawJson);
    } catch (parseError) {
      if (options.attemptCorrection) {
        // Attempt correction request
        logger.info({
          service: 'openrouter',
          event: 'ATTEMPTING_CORRECTION',
          message: 'Output failed schema validation. Sending concise correction request to OpenRouter...',
        });

        const correctionRes = await fetch(`${this.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
            'HTTP-Referer': 'https://trendpost.app',
            'X-Title': 'TrendPost SaaS',
          },
          body: JSON.stringify({
            model: this.model,
            messages: [
              { role: 'system', content: options.originalPrompts.systemPrompt },
              { role: 'user', content: options.originalPrompts.userPrompt },
              { role: 'assistant', content: rawText },
              {
                role: 'user',
                content: `Your previous response was invalid. Error: ${parseError instanceof Error ? parseError.message : String(parseError)}. Please output ONLY the raw valid JSON object adhering strictly to the schema.`,
              },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.2,
          }),
        });

        if (correctionRes.ok) {
          const corrData = await correctionRes.json();
          const corrText = corrData?.choices?.[0]?.message?.content || '';
          const cleaned = this.extractJsonString(corrText);
          const parsed = JSON.parse(cleaned);
          return GeneratedContentSchema.parse(parsed);
        }
      }

      throw parseError;
    }
  }

  /**
   * Helper to strip markdown and isolate JSON object text
   */
  private extractJsonString(text: string): string {
    const trimmed = text.trim();
    // Check if wrapped in ```json ... ```
    const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch && codeBlockMatch[1]) {
      return codeBlockMatch[1].trim();
    }
    // Check for outermost curly braces
    const firstBrace = trimmed.indexOf('{');
    const lastBrace = trimmed.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      return trimmed.substring(firstBrace, lastBrace + 1);
    }
    return trimmed;
  }
}
