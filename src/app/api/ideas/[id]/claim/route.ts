import { NextRequest, NextResponse } from 'next/server';
import { repository } from '@/lib/db/repository';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const userId = body.userId || 'a0000000-0000-0000-0000-000000000001'; // Default Person A if not provided

    const result = await repository.claimIdea(id, userId);

    if (!result.success) {
      return NextResponse.json(result, { status: 409 }); // 409 Conflict
    }

    return NextResponse.json(result);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
