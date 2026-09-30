import { NextRequest, NextResponse } from 'next/server';
import { repository } from '@/lib/db/repository';
import { logger } from '@/lib/logger';

export async function GET() {
  const keys = await repository.getApiKeys();
  return NextResponse.json({ success: true, data: keys });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { provider, key, enabled, metadata } = body;

    if (!provider) {
      return NextResponse.json({ success: false, message: 'Provider is required' }, { status: 400 });
    }

    const updated = await repository.updateApiKey(provider, key, enabled !== false, metadata);

    logger.info({
      service: 'settings',
      event: 'API_KEY_UPDATED',
      message: `Updated credentials for ${provider}`,
      metadata: { provider, masked: updated.masked_key },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
