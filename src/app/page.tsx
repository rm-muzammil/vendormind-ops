'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { AlertTriangle, Bot, CheckCircle2, Circle, Clock, Loader2, Mail, Package, Play, ShieldCheck, Sparkles, XCircle, Zap } from 'lucide-react';
import type { DB, Quote, Rfq, Run, Step } from '@/lib/types';

type AppState = DB & {
  config: { threshold: number; model: string; categories: Record<string, { base: number; unit: string }> };
  today: string;
  savings: number;
  metrics: { llmCalls: number; okRate: number; avgMs: number };
};
interface Health {
  inference: 'online' | 'auth-failed' | 'unreachable' | 'unconfigured';
  model: string;
}
type Tab = 'runs' | 'approvals' | 'orders' | 'outbox' | 'audit' | 'activity';

const money = (n: number) => `${n < 0 ? '-' : ''}$${Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;

async function post(url: string, body: unknown) {
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error ?? `Request failed (${r.status})`);
  return d;
}

const STATUS_STYLE: Record<string, string> = {
  new: 'text-slate-300 border-slate-700',
  sourcing: 'text-blue-300 border-blue-800',
  running: 'text-blue-300 border-blue-800',
  awaiting_quotes: 'text-amber-300 border-amber-800',
  waiting_quotes: 'text-amber-300 border-amber-800',
  awaiting_approval: 'text-amber-300 border-amber-800',
  waiting_approval: 'text-amber-300 border-amber-800',
  pending: 'text-amber-300 border-amber-800',
  sent: 'text-slate-300 border-slate-700',
  quoted: 'text-emerald-300 border-emerald-800',
  simulated: 'text-indigo-300 border-indigo-800',
  ordered: 'text-emerald-300 border-emerald-800',
  completed: 'text-emerald-300 border-emerald-800',
  approved: 'text-emerald-300 border-emerald-800',
  delivered: 'text-emerald-300 border-emerald-800',
  open: 'text-slate-300 border-slate-700',
  delayed: 'text-rose-300 border-rose-800',
  rejected: 'text-rose-300 border-rose-800',
  failed: 'text-rose-300 border-rose-800',
};
function Pill({ children, status }: { children: ReactNode; status: string }) {
  return <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full border bg-slate-950 whitespace-nowrap ${STATUS_STYLE[status] ?? 'text-slate-300 border-slate-700'}`}>{children}</span>;
}

function StepIcon({ s }: { s: Step['status'] }) {
  if (s === 'done') return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
  if (s === 'running') return <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />;
  if (s === 'waiting') return <Clock className="w-4 h-4 text-amber-400" />;
  if (s === 'failed') return <XCircle className="w-4 h-4 text-rose-400" />;
  return <Circle className={`w-4 h-4 ${s === 'skipped' ? 'text-slate-600' : 'text-slate-700'}`} />;
}

function RunCard({ run, rfqs, origin, busy, onSimulate, onClose }: { run: Run; rfqs: Rfq[]; origin: string; busy: boolean; onSimulate: () => void; onClose: () => void }) {
  return (
    <div className="bg-slate-950 border border-slate-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="min-w-0">
          <div className="text-sm font-semibold truncate">{run.kind === 'sourcing' ? 'Sourcing' : 'Delay follow-up'}: {run.subject}</div>
          <div className="text-[11px] text-slate-500 font-mono">{run.id} · {new Date(run.createdAt).toLocaleTimeString()}</div>
        </div>
        <Pill status={run.status}>{run.status.replace('_', ' ')}</Pill>
      </div>
      <ol className="space-y-2">
        {run.steps.map((s) => (
          <li key={s.key} className="flex gap-2">
            <div className="pt-0.5"><StepIcon s={s.status} /></div>
            <div className="min-w-0">
              <div className="text-xs text-slate-200 flex items-center gap-2">
                {s.title}
                {s.llm && <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-950 border border-indigo-800 text-indigo-300 font-mono">VULTR LLM</span>}
              </div>
              {s.detail && <div className="text-[11px] text-slate-400 break-words">{s.detail}</div>}
            </div>
          </li>
        ))}
      </ol>
      {run.status === 'waiting_quotes' && (
        <div className="mt-3 border border-amber-900/50 bg-amber-950/10 rounded-lg p-3 space-y-2">
          <div className="text-[11px] text-amber-300">Waiting on vendors. Each vendor answers through its own secure link:</div>
          <ul className="space-y-1">
            {rfqs.map((q) => (
              <li key={q.id} className="flex items-center justify-between gap-2 text-xs">
                <span className="truncate">{q.vendorName}</span>
                <span className="flex items-center gap-2 shrink-0">
                  <Pill status={q.status}>{q.status}</Pill>
                  {q.status === 'sent' ? (
                    <a href={`${origin}/quote/${q.token}`} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">open vendor portal ↗</a>
                  ) : (
                    <span className="text-slate-400">{q.quote ? `$${q.quote.unitPrice} · ${q.quote.leadDays}d` : ''}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
          <div className="flex gap-2 pt-1">
            <button disabled={busy} onClick={onSimulate} className="text-xs bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-2.5 py-1 rounded-md">Simulate vendor replies</button>
            <button disabled={busy} onClick={onClose} className="text-xs bg-slate-800 hover:bg-slate-700 disabled:opacity-50 px-2.5 py-1 rounded-md">Close quoting now</button>
          </div>
        </div>
      )}
    </div>
  );
}

function QuoteTable({ quotes, highlight }: { quotes: Quote[]; highlight?: string }) {
  return (
    <div className="overflow-auto rounded border border-slate-800">
      <table className="w-full text-xs">
        <thead className="bg-slate-900 text-slate-400">
          <tr>{['Vendor', 'Unit', 'Total', 'Delivery', 'Score', 'Flags'].map((h) => <th key={h} className="px-2 py-1 text-left font-medium">{h}</th>)}</tr>
        </thead>
        <tbody>
          {quotes.map((q) => (
            <tr key={q.vendorId} className={`border-t border-slate-800 ${q.vendorId === highlight ? 'bg-emerald-950/30' : ''}`}>
              <td className="px-2 py-1 whitespace-nowrap">{q.vendorName}</td>
              <td className="px-2 py-1">{money(q.unitPrice)}</td>
              <td className="px-2 py-1">{money(q.total)}</td>
              <td className="px-2 py-1 whitespace-nowrap">{q.deliveryDate}</td>
              <td className="px-2 py-1 font-mono">{q.score}</td>
              <td className="px-2 py-1 text-amber-300">{q.flags.join(', ') || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Dashboard() {
  const [state, setState] = useState<AppState | null>(null);
  const [health, setHealth] = useState<Health | null>(null);
  const [tab, setTab] = useState<Tab>('runs');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [origin, setOrigin] = useState('');
  const [nl, setNl] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [form, setForm] = useState({ item: '', category: 'monitors', qty: 20, budget: 7000, neededInDays: 21, requester: 'IT Team' });

  const refresh = useCallback(async () => {
    try {
      setState(await (await fetch('/api/state', { cache: 'no-store' })).json());
    } catch { /* keep last state */ }
  }, []);
  const refreshHealth = useCallback(async () => {
    try { setHealth(await (await fetch('/api/health')).json()); } catch { setHealth(null); }
  }, []);

  useEffect(() => {
    setOrigin(window.location.origin);
    refresh();
    refreshHealth();
    const a = setInterval(refresh, 2000);
    const b = setInterval(refreshHealth, 20000);
    return () => { clearInterval(a); clearInterval(b); };
  }, [refresh, refreshHealth]);

  const act = async (key: string, fn: () => Promise<unknown>, goto?: Tab) => {
    setBusy(key);
    setError(null);
    try {
      await fn();
      if (goto) setTab(goto);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setBusy(null);
    }
  };

  if (!state) {
    return <div className="min-h-screen flex items-center justify-center text-slate-500 text-sm"><Loader2 className="w-4 h-4 animate-spin mr-2" />Loading workspace…</div>;
  }

  const pendingApprovals = state.approvals.filter((a) => a.status === 'pending');
  const delayed = state.orders.filter((o) => o.status === 'delayed');
  const openReqs = state.requests.filter((r) => ['new', 'sourcing', 'awaiting_quotes', 'awaiting_approval'].includes(r.status)).length;
  const agentSpend = state.orders.filter((o) => o.requestId).reduce((s, o) => s + o.total, 0);
  const inferenceUp = health?.inference === 'online';
  const autopilot = state.settings.autopilot;

  const tabs: [Tab, string][] = [
    ['runs', 'Agent runs'],
    ['approvals', `Approvals${pendingApprovals.length ? ` (${pendingApprovals.length})` : ''}`],
    ['orders', 'Orders'],
    ['outbox', `Outbox (${state.emails.length})`],
    ['audit', 'AI audit'],
    ['activity', 'Activity'],
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <header className="max-w-7xl mx-auto flex flex-wrap gap-3 items-center justify-between pb-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg"><Bot className="w-6 h-6" /></div>
          <div>
            <h1 className="text-xl font-bold tracking-wide">VendorMind Ops</h1>
            <p className="text-xs text-slate-400">Autonomous procurement agents on Vultr: sourcing, approvals and delay follow-ups</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-full">
            <span className={`w-2 h-2 rounded-full ${inferenceUp ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            <span className="text-slate-300">Vultr Serverless Inference · {health?.inference ?? 'checking'}</span>
          </div>
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-full text-slate-300">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />Approval limit {money(state.config.threshold)}
          </div>
          <button
            onClick={() => act('auto', () => post('/api/actions', { type: 'autopilot', enabled: !autopilot }))}
            className={`flex items-center gap-2 border px-3 py-1.5 rounded-full ${autopilot ? 'bg-emerald-950/40 border-emerald-700 text-emerald-300' : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-600'}`}
            title="When on, a background scheduler chases late orders and closes expired quote windows without human input"
          >
            <Zap className="w-3.5 h-3.5" />Autopilot {autopilot ? 'ON' : 'OFF'}
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-5 gap-3 mt-5">
        {[
          ['Open requests', String(openReqs), ''],
          ['Awaiting approval', String(pendingApprovals.length), ''],
          ['Delayed orders', String(delayed.length), ''],
          ['Spend ordered by agent', money(agentSpend), ''],
          ['Savings vs market baseline', money(state.savings), state.savings >= 0 ? 'text-emerald-400' : 'text-rose-400'],
        ].map(([k, v, c]) => (
          <div key={k} className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3">
            <div className="text-[11px] text-slate-400">{k}</div>
            <div className={`text-xl font-semibold ${c}`}>{v}</div>
          </div>
        ))}
      </div>

      {error && (
        <div className="max-w-7xl mx-auto mt-4 bg-rose-950/40 border border-rose-900 rounded-lg px-4 py-2 text-sm text-rose-300 flex gap-2 items-center">
          <AlertTriangle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}

      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 mt-5">
        <div className="lg:col-span-5 space-y-6">
          <section className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-blue-400 mb-1 flex items-center gap-2"><Sparkles className="w-4 h-4" />Describe what you need</h2>
            <p className="text-[11px] text-slate-500 mb-2">Plain English. The agent extracts the request and starts sourcing.</p>
            <textarea className="w-full h-16 bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs focus:outline-none focus:border-blue-500" placeholder='e.g. "We need 30 monitors for the new office by December 1, budget around $10k"' value={nl} onChange={(e) => setNl(e.target.value)} />
            <button
              disabled={busy !== null || nl.trim().length < 8}
              onClick={() => act('nl', async () => { await post('/api/intake', { text: nl }); setNl(''); }, 'runs')}
              className="w-full mt-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-sm font-medium py-2 rounded-lg flex items-center justify-center gap-2"
            >
              {busy === 'nl' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}Understand &amp; run sourcing agent
            </button>
          </section>

          <section className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-slate-300 mb-3">Or use the form</h2>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <input className="col-span-2 bg-slate-950 border border-slate-800 rounded-lg p-2 focus:outline-none focus:border-blue-500" placeholder="Item, e.g. 27-inch monitors" value={form.item} onChange={(e) => setForm({ ...form, item: e.target.value })} />
              <select className="bg-slate-950 border border-slate-800 rounded-lg p-2" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {Object.keys(state.config.categories).map((c) => <option key={c}>{c}</option>)}
              </select>
              <input className="bg-slate-950 border border-slate-800 rounded-lg p-2" placeholder="Requester" value={form.requester} onChange={(e) => setForm({ ...form, requester: e.target.value })} />
              <label className="text-slate-400">Quantity<input type="number" min={1} className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100" value={form.qty} onChange={(e) => setForm({ ...form, qty: Number(e.target.value) })} /></label>
              <label className="text-slate-400">Budget ($)<input type="number" min={1} className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100" value={form.budget} onChange={(e) => setForm({ ...form, budget: Number(e.target.value) })} /></label>
              <label className="col-span-2 text-slate-400">Needed in (days)<input type="number" min={1} className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100" value={form.neededInDays} onChange={(e) => setForm({ ...form, neededInDays: Number(e.target.value) })} /></label>
            </div>
            <button
              disabled={busy !== null || form.item.trim().length < 2}
              onClick={() => act('create', () => post('/api/requests', form), 'runs')}
              className="w-full mt-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-sm font-medium py-2 rounded-lg flex items-center justify-center gap-2"
            >
              {busy === 'create' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}Create &amp; run sourcing agent
            </button>
          </section>

          <section className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-blue-400 mb-3">Purchase requests</h2>
            <ul className="space-y-2">
              {state.requests.map((r) => (
                <li key={r.id} className="bg-slate-950 border border-slate-800 rounded-lg p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm truncate">{r.qty} × {r.item}</div>
                    <div className="text-[11px] text-slate-500">{r.id} · {r.requester} · budget {money(r.budget)} · by {r.neededBy}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Pill status={r.status}>{r.status.replace('_', ' ')}</Pill>
                    {['new', 'failed'].includes(r.status) && (
                      <button disabled={busy !== null} onClick={() => act(`src-${r.id}`, () => post('/api/actions', { type: 'source', id: r.id }), 'runs')} className="text-xs bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-2.5 py-1 rounded-md">
                        {busy === `src-${r.id}` ? '…' : 'Run agent'}
                      </button>
                    )}
                  </div>
                </li>
              ))}
              {state.requests.length === 0 && <li className="text-xs text-slate-500">No requests yet.</li>}
            </ul>
          </section>

          <section className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-blue-400 mb-1 flex items-center gap-2"><Bot className="w-4 h-4" />Procurement copilot</h2>
            <p className="text-[11px] text-slate-500 mb-2">Answers only from your live requests, orders and vendors.</p>
            <div className="flex gap-2">
              <input className="flex-1 bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs focus:outline-none focus:border-blue-500" placeholder="Which orders are late and what should I do?" value={question} onChange={(e) => setQuestion(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && question.trim().length >= 3 && busy === null) act('ask', async () => setAnswer((await post('/api/ask', { question })).answer)); }} />
              <button disabled={busy !== null || question.trim().length < 3} onClick={() => act('ask', async () => setAnswer((await post('/api/ask', { question })).answer))} className="text-xs bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-3 rounded-lg">{busy === 'ask' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Ask'}</button>
            </div>
            {answer && <p className="mt-3 text-xs text-slate-200 bg-slate-950 border border-slate-800 rounded-lg p-3 whitespace-pre-wrap">{answer}</p>}
          </section>
        </div>

        <section className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-5 self-start">
          <div className="flex flex-wrap gap-1 mb-4 border-b border-slate-800 pb-3">
            {tabs.map(([k, label]) => (
              <button key={k} onClick={() => setTab(k)} className={`text-xs px-3 py-1.5 rounded-md ${tab === k ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'}`}>{label}</button>
            ))}
          </div>

          {tab === 'runs' && (
            <div className="space-y-3">
              {state.runs.map((r) => (
                <RunCard
                  key={r.id}
                  run={r}
                  rfqs={state.rfqs.filter((q) => q.runId === r.id)}
                  origin={origin}
                  busy={busy !== null}
                  onSimulate={() => act(`sim-${r.id}`, () => post('/api/actions', { type: 'simulate-quotes', id: r.id }))}
                  onClose={() => act(`close-${r.id}`, () => post('/api/actions', { type: 'close-quotes', id: r.id }))}
                />
              ))}
              {state.runs.length === 0 && <p className="text-sm text-slate-500 text-center py-10">No runs yet. Describe a need on the left, run a request, or scan orders for delays.</p>}
            </div>
          )}

          {tab === 'approvals' && (
            <div className="space-y-3">
              {state.approvals.map((a) => (
                <div key={a.id} className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold">{a.qty} × {a.item} <span className="text-slate-500 font-normal">· budget {money(a.budget)}</span></div>
                    <Pill status={a.status}>{a.status}</Pill>
                  </div>
                  <div className="text-xs text-amber-300">Why a human is needed: {a.reasons.join('; ')}</div>
                  <div className="text-xs text-slate-300">{a.rationale}</div>
                  <QuoteTable quotes={[a.recommendation, ...a.alternatives]} highlight={a.recommendation.vendorId} />
                  {a.status === 'pending' && (
                    <div className="flex gap-2">
                      <button disabled={busy !== null} onClick={() => act(`ap-${a.id}`, () => post('/api/actions', { type: 'approve', id: a.id }), 'runs')} className="text-xs bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 px-3 py-1.5 rounded-md">Approve &amp; place order</button>
                      <button disabled={busy !== null} onClick={() => act(`rj-${a.id}`, () => post('/api/actions', { type: 'reject', id: a.id }), 'runs')} className="text-xs bg-slate-800 hover:bg-slate-700 disabled:opacity-50 px-3 py-1.5 rounded-md">Reject</button>
                    </div>
                  )}
                </div>
              ))}
              {state.approvals.length === 0 && <p className="text-sm text-slate-500 text-center py-10">Nothing waiting. A large or flagged order will land here for a human decision.</p>}
            </div>
          )}

          {tab === 'orders' && (
            <div>
              <div className="flex items-center justify-between gap-3 mb-3">
                <p className="text-xs text-slate-400">The delay agent finds late orders, emails vendors and escalates critical ones. Turn Autopilot on to do this without clicking.</p>
                <button disabled={busy !== null} onClick={() => act('scan', () => post('/api/actions', { type: 'scan' }), 'runs')} className="text-xs bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-3 py-1.5 rounded-md flex items-center gap-1.5 shrink-0">
                  {busy === 'scan' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Package className="w-3.5 h-3.5" />}Scan delays &amp; follow up
                </button>
              </div>
              <div className="overflow-auto rounded border border-slate-800">
                <table className="w-full text-xs">
                  <thead className="bg-slate-950 text-slate-400">
                    <tr>{['PO', 'Vendor', 'Item', 'Total', 'Expected', 'Status', 'Follow-ups'].map((h) => <th key={h} className="px-2 py-2 text-left font-medium">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {state.orders.map((o) => (
                      <tr key={o.id} className="border-t border-slate-800 align-top">
                        <td className="px-2 py-2 font-mono">{o.id}</td>
                        <td className="px-2 py-2">{o.vendorName}</td>
                        <td className="px-2 py-2">{o.qty} × {o.item}</td>
                        <td className="px-2 py-2">{money(o.total)}</td>
                        <td className="px-2 py-2 whitespace-nowrap">{o.expectedDate}</td>
                        <td className="px-2 py-2"><Pill status={o.status}>{o.status}{o.status === 'delayed' ? ` ${o.delayDays}d` : ''}</Pill>{o.escalated && <div className="text-[10px] text-rose-300 mt-1">{o.note}</div>}</td>
                        <td className="px-2 py-2 text-center">{o.followUps}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'outbox' && (
            <div className="space-y-2">
              <p className="text-[11px] text-slate-500">Emails are written by the agents and logged here. Delivery is simulated in this demo; the portal links inside RFQs are live.</p>
              {state.emails.map((m) => (
                <details key={m.id} className="bg-slate-950 border border-slate-800 rounded-lg p-3">
                  <summary className="cursor-pointer text-xs flex items-center gap-2 flex-wrap">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <Pill status={m.kind === 'escalation' ? 'delayed' : 'open'}>{m.kind}</Pill>
                    <span className="text-slate-200">{m.subject}</span>
                    <span className="text-slate-500">→ {m.to}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-400 font-mono">{m.generatedBy === 'llm' ? 'VULTR LLM' : 'TEMPLATE'}</span>
                  </summary>
                  <pre className="mt-2 text-xs text-slate-300 whitespace-pre-wrap font-sans">{m.body.split('{{BASE}}').join(origin)}</pre>
                </details>
              ))}
              {state.emails.length === 0 && <p className="text-sm text-slate-500 text-center py-10">No emails yet.</p>}
            </div>
          )}

          {tab === 'audit' && (
            <div>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {[
                  ['Model calls', String(state.metrics.llmCalls)],
                  ['Success rate', `${Math.round(state.metrics.okRate * 100)}%`],
                  ['Avg latency', `${(state.metrics.avgMs / 1000).toFixed(1)}s`],
                ].map(([k, v]) => (
                  <div key={k} className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2">
                    <div className="text-[10px] text-slate-400">{k}</div>
                    <div className="text-sm font-semibold">{v}</div>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-slate-500 mb-2">Every Vultr Serverless Inference call the agents make, with the model that actually answered. Money decisions are rule-based; the model writes and explains.</p>
              <div className="overflow-auto rounded border border-slate-800 max-h-96">
                <table className="w-full text-xs">
                  <thead className="bg-slate-950 text-slate-400">
                    <tr>{['Time', 'Purpose', 'Model', 'Latency', 'Tokens', 'Result'].map((h) => <th key={h} className="px-2 py-2 text-left font-medium">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {state.traces.map((t) => (
                      <tr key={t.id} className="border-t border-slate-800">
                        <td className="px-2 py-1.5 whitespace-nowrap text-slate-400">{new Date(t.ts).toLocaleTimeString()}</td>
                        <td className="px-2 py-1.5 font-mono">{t.purpose}</td>
                        <td className="px-2 py-1.5">{t.model}</td>
                        <td className="px-2 py-1.5">{(t.ms / 1000).toFixed(1)}s</td>
                        <td className="px-2 py-1.5">{t.tokens ?? '—'}</td>
                        <td className="px-2 py-1.5">{t.ok ? <span className="text-emerald-400">ok</span> : <span className="text-rose-400">empty/failed → template</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {state.traces.length === 0 && <p className="text-sm text-slate-500 text-center py-8">No model calls yet.</p>}
              </div>
            </div>
          )}

          {tab === 'activity' && (
            <ul className="space-y-1.5 max-h-[32rem] overflow-auto">
              {state.events.map((e) => (
                <li key={e.id} className="text-xs flex gap-2">
                  <span className="text-slate-600 font-mono shrink-0">{new Date(e.ts).toLocaleTimeString()}</span>
                  <span className={e.level === 'warn' ? 'text-amber-300' : e.level === 'action' ? 'text-emerald-300' : 'text-slate-300'}>{e.message}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      <footer className="max-w-7xl mx-auto mt-6 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
        <span>Runs on a Vultr Cloud Compute VM with Vultr Serverless Inference. Email delivery is simulated; vendors can answer RFQs through the live portal links or use &quot;Simulate vendor replies&quot;.</span>
        <button onClick={() => { if (confirm('Reset the demo workspace?')) act('reset', () => post('/api/actions', { type: 'reset' })); }} className="underline hover:text-slate-300">Reset demo data</button>
      </footer>
    </div>
  );
}
