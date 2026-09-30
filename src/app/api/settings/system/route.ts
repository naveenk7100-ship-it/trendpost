import { NextRequest, NextResponse } from 'next/server';
import { repository } from '@/lib/db/repository';

export async function GET() {
  const settings = await repository.getSettings();
  return NextResponse.json({ success: true, data: settings });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const updated = await repository.updateSettings(body);
    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
