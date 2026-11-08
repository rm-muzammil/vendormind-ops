import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

let cache: { t: number; body: unknown } | null = null;

export async function GET() {
  if (cache && Date.now() - cache.t < 15_000) return NextResponse.json(cache.body);

  let inference: 'online' | 'auth-failed' | 'unreachable' | 'unconfigured' = 'unconfigured';
  const key = process.env.VULTR_API_KEY;
  if (key && key !== 'REPLACE_ME') {
    try {
      const base = process.env.VULTR_BASE_URL ?? 'https://api.vultrinference.com/v1';
      const res = await fetch(`${base}/models`, { headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(4000) });
      inference = res.ok ? 'online' : res.status === 401 || res.status === 403 ? 'auth-failed' : 'unreachable';
    } catch {
      inference = 'unreachable';
    }
  }
  const body = { inference, model: process.env.VULTR_MODEL ?? 'llama-3.1-70b-instruct' };
  cache = { t: Date.now(), body };
  return NextResponse.json(body);
}
