import { NextResponse } from 'next/server';
import { snapshot } from '@/lib/store';
import { APPROVAL_THRESHOLD, CATEGORIES, isoDay } from '@/lib/catalog';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const db = await snapshot();
  const ok = db.traces.filter((t) => t.ok);
  const savings = db.orders
    .filter((o) => o.requestId)
    .reduce((s, o) => s + ((o.baselineTotal ?? (CATEGORIES[o.category]?.base ?? 0) * o.qty) - o.total), 0);
  return NextResponse.json({
    ...db,
    emails: db.emails.slice(0, 40),
    runs: db.runs.slice(0, 12),
    events: db.events.slice(0, 50),
    rfqs: db.rfqs.slice(0, 60),
    traces: db.traces.slice(0, 40),
    metrics: {
      llmCalls: db.traces.length,
      okRate: db.traces.length ? ok.length / db.traces.length : 1,
      avgMs: ok.length ? Math.round(ok.reduce((s, t) => s + t.ms, 0) / ok.length) : 0,
    },
    savings: Math.round(savings * 100) / 100,
    config: { threshold: APPROVAL_THRESHOLD, model: process.env.VULTR_MODEL ?? 'llama-3.1-70b-instruct', categories: CATEGORIES },
    today: isoDay(0),
  });
}
