import { NextResponse } from 'next/server';
import { createRequest, startSourcing, validateRequest } from '@/lib/agent';
import { limited } from '@/lib/ratelimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const l = limited(req, 'run');
  if (l) return l;
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  try {
    if (!b) throw new Error('Invalid JSON');
    const request = await createRequest(validateRequest(b), 'form');
    const runId = await startSourcing(request.id);
    return NextResponse.json({ id: request.id, runId });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed' }, { status: 400 });
  }
}
