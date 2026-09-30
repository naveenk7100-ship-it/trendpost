import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const level = searchParams.get('level') || undefined;
  const service = searchParams.get('service') || undefined;
  const limit = parseInt(searchParams.get('limit') || '100', 10);

  const logs = logger.getRecentLogs(limit, level, service);
  return NextResponse.json({ success: true, count: logs.length, data: logs });
}
