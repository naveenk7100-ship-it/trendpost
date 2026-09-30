import { NextRequest, NextResponse } from 'next/server';
import { repository } from '@/lib/db/repository';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const status = body.status; // 'approved' | 'rejected'

    if (status !== 'approved' && status !== 'rejected') {
      return NextResponse.json({ success: false, message: 'Invalid status' }, { status: 400 });
    }

    const success = await repository.updateIdeaApprovalStatus(id, status);
    return NextResponse.json({ success, status });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
