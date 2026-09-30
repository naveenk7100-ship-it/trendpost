import { NextRequest, NextResponse } from 'next/server';
import { OpenRouterContentGenerator } from '@/lib/ai/openrouter';
import { ClaudeContentGenerator } from '@/lib/ai/claude';
import { GoogleTrendsProvider, YouTubeProvider, RedditProvider, XProvider } from '@/lib/providers';
import { TelegramBotService } from '@/lib/telegram/bot';
import { repository } from '@/lib/db/repository';
import { nowUTC } from '@/lib/config';

export async function POST(req: NextRequest) {
  try {
    const { provider, customKey, model } = await req.json();

    let result: { success: boolean; message: string; details?: unknown } = {
      success: false,
      message: 'Unknown provider',
    };

    switch (provider) {
      case 'openrouter': {
        const generator = new OpenRouterContentGenerator(customKey, model);
        result = await generator.testConnection();
        break;
      }
      case 'claude': {
        const generator = new ClaudeContentGenerator(customKey);
        result = await generator.testConnection();
        break;
      }
      case 'google_trends': {
        const gt = new GoogleTrendsProvider();
        result = await gt.testConnection();
        break;
      }
      case 'youtube': {
        const yt = new YouTubeProvider(customKey);
        result = await yt.testConnection();
        break;
      }
      case 'reddit': {
        const reddit = new RedditProvider();
        result = await reddit.testConnection();
        break;
      }
      case 'x': {
        const x = new XProvider(customKey);
        result = await x.testConnection();
        break;
      }
      case 'telegram': {
        const tg = new TelegramBotService(customKey);
        result = await tg.testConnection();
        break;
      }
      default:
        return NextResponse.json({ success: false, message: 'Invalid provider' }, { status: 400 });
    }

    // Update status in repository
    if (provider) {
      await repository.updateApiKeyStatus(
        provider,
        result.success ? 'active' : 'failed',
        nowUTC()
      );
    }

    return NextResponse.json(result);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, message: errorMsg }, { status: 500 });
  }
}
