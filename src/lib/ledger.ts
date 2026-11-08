import { createHash } from 'node:crypto';
import type { Trace } from './types';

export const GENESIS_HASH = '0'.repeat(64);

/** Canonical, order-stable string for hashing one trace record (excludes hash/prevHash themselves). */
function canonical(t: Omit<Trace, 'hash' | 'prevHash'>): string {
  return JSON.stringify({ id: t.id, ts: t.ts, purpose: t.purpose, model: t.model, ms: t.ms, ok: t.ok, tokens: t.tokens ?? null });
}

export function nextHash(prevHash: string, record: Omit<Trace, 'hash' | 'prevHash'>): string {
  return createHash('sha256').update(prevHash + canonical(record)).digest('hex');
}

/**
 * Verifies the chain oldest -> newest. Traces are stored newest-first, so this expects
 * them reversed (oldest first) before calling, or pass `traces.slice().reverse()`.
 */
export function verifyChain(tracesOldestFirst: Trace[]): { ok: boolean; brokenAt: string | null; checked: number } {
  let prev = GENESIS_HASH;
  for (const t of tracesOldestFirst) {
    const expected = nextHash(prev, t);
    if (t.hash !== expected || t.prevHash !== prev) {
      return { ok: false, brokenAt: t.id, checked: tracesOldestFirst.length };
    }
    prev = t.hash;
  }
  return { ok: true, brokenAt: null, checked: tracesOldestFirst.length };
}
