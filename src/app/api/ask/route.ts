import { NextResponse } from 'next/server';
import { askCopilot } from '@/lib/agent';
import { limited } from '@/lib/ratelimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const l = limited(req, 'run');
  if (l) return l;
  const b = (await req.json().catch(() => null)) as { question?: string } | null;
  try {
    const q = String(b?.question ?? '').trim();
    if (q.length < 3) throw new Error('Ask a question about your requests, orders or vendors');
    return NextResponse.json({ answer: await askCopilot(q) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed' }, { status: 400 });
  }
}
