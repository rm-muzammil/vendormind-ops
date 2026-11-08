import { NextResponse } from 'next/server';
import { createRequest, parseIntake, startSourcing } from '@/lib/agent';
import { limited } from '@/lib/ratelimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const l = limited(req, 'run');
  if (l) return l;
  const b = (await req.json().catch(() => null)) as { text?: string } | null;
  try {
    const text = String(b?.text ?? '').trim();
    if (text.length < 8) throw new Error('Describe what you need, e.g. "30 monitors by Dec 1, budget $10k"');
    const input = await parseIntake(text);
    const request = await createRequest(input, 'natural-language');
    const runId = await startSourcing(request.id);
    return NextResponse.json({ id: request.id, runId, parsed: input });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed' }, { status: 400 });
  }
}
