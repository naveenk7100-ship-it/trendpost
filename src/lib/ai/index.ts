import { OpenRouterContentGenerator } from './openrouter';
import { ClaudeContentGenerator, GeneratedContentOutput, GeneratedContentSchema } from './claude';
import { DevelopmentAiGenerator } from './dev-generator';
import { NormalizedTopic } from '@/types';
import { logger } from '@/lib/logger';

export { OpenRouterContentGenerator, ClaudeContentGenerator, DevelopmentAiGenerator, GeneratedContentSchema };
export type { GeneratedContentOutput };

export interface AiGenerationResult {
  content: GeneratedContentOutput;
  isDevelopmentContent: boolean;
  providerUsed: 'openrouter' | 'claude' | 'development';
  modelUsed: string;
  generationStatus: 'success' | 'fallback';
}

/**
 * Unified AI Content Router:
 * Priority 1: OpenRouter (Default Production AI Engine using configurable model e.g. openrouter/free)
 * Priority 2: Anthropic Claude (if configured and OpenRouter is not set)
 * Priority 3: Development AI Generator (Deterministic offline fallback)
 *
 * If the primary AI call fails after exponential retries:
 * Logs the genuine error and seamlessly falls back to DevelopmentAiGenerator,
 * marking the payload as DEVELOPMENT FALLBACK.
 */
export async function generateContentUnified(
  topic: NormalizedTopic,
  options?: { apiKey?: string; model?: string; runId?: string }
): Promise<AiGenerationResult> {
  const openRouterKey = options?.apiKey || process.env.OPENROUTER_API_KEY;
  const configuredModel = options?.model || process.env.OPENROUTER_MODEL || 'openrouter/free';
  const isOpenRouterAvailable = Boolean(openRouterKey && openRouterKey.trim().length > 5);

  // 1. Try OpenRouter if configured
  if (isOpenRouterAvailable) {
    try {
      const openRouter = new OpenRouterContentGenerator(openRouterKey, configuredModel);
      const content = await openRouter.generateContentForTopic(topic, { runId: options?.runId });
      return {
        content,
        isDevelopmentContent: false,
        providerUsed: 'openrouter',
        modelUsed: openRouter.getModel(),
        generationStatus: 'success',
      };
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      logger.warn({
        service: 'ai',
        event: 'OPENROUTER_FAILED_FALLBACK_TO_DEV',
        message: `OpenRouter call failed (${errMsg}). Falling back to Development Test Content.`,
        metadata: { topic: topic.title, error: errMsg, model: configuredModel },
        runId: options?.runId,
      });

      // Seamless fallback to development test generator
      const devGen = new DevelopmentAiGenerator();
      const content = await devGen.generateContentForTopic(topic, { runId: options?.runId });
      return {
        content,
        isDevelopmentContent: true,
        providerUsed: 'development',
        modelUsed: 'development_test',
        generationStatus: 'fallback',
      };
    }
  }

  // 2. Fallback to Claude if Anthropic key is explicitly provided and OpenRouter is not set
  const claudeKey = process.env.ANTHROPIC_API_KEY;
  if (claudeKey && claudeKey.startsWith('sk-ant')) {
    try {
      const claude = new ClaudeContentGenerator(claudeKey);
      const content = await claude.generateContentForTopic(topic, { runId: options?.runId });
      return {
        content,
        isDevelopmentContent: false,
        providerUsed: 'claude',
        modelUsed: 'claude-3-5-sonnet',
        generationStatus: 'success',
      };
    } catch (err) {
      logger.warn({
        service: 'ai',
        event: 'CLAUDE_CALL_FAILED_FALLBACK_TO_DEV',
        message: `Claude call failed (${err instanceof Error ? err.message : String(err)}). Falling back to Development.`,
        metadata: { topic: topic.title },
        runId: options?.runId,
      });
    }
  }

  // 3. Zero-Config FREE MODE: Development Test Generator
  const devGen = new DevelopmentAiGenerator();
  const content = await devGen.generateContentForTopic(topic, { runId: options?.runId });
  return {
    content,
    isDevelopmentContent: true,
    providerUsed: 'development',
    modelUsed: 'development_test',
    generationStatus: 'fallback',
  };
}
