import { NextResponse } from 'next/server';

const g = globalThis as unknown as { __vmRl?: Map<string, number[]> };

/** Simple per-IP sliding window for endpoints that spend inference tokens. Returns a 429 response or null. */
export function limited(req: Request, key: string, limit = 12, windowMs = 600_000): Response | null {
  const map = (g.__vmRl ??= new Map<string, number[]>());
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'local';
  const k = `${key}:${ip}`;
  const now = Date.now();
  const hits = (map.get(k) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    map.set(k, hits);
    return NextResponse.json({ error: 'Rate limit reached. Please wait a few minutes.' }, { status: 429 });
  }
  hits.push(now);
  map.set(k, hits);
  return null;
}
