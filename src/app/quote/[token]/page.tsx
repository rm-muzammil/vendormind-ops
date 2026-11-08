'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { CheckCircle2, Loader2, Package } from 'lucide-react';

interface Offer {
  round: number;
  by: 'vendor' | 'agent';
  unitPrice?: number;
  leadDays?: number;
  message: string;
  ts: string;
}
interface Info {
  vendorName: string;
  item: string;
  qty: number;
  neededBy: string;
  deadline: string;
  status: 'sent' | 'negotiating' | 'quoted' | 'simulated';
  round: number;
  open: boolean;
  counterMessage?: string;
  offers: Offer[];
  quote?: { unitPrice: number; leadDays: number };
}

export default function VendorPortal() {
  const { token } = useParams<{ token: string }>();
  const [info, setInfo] = useState<Info | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [unitPrice, setUnitPrice] = useState('');
  const [leadDays, setLeadDays] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await fetch(`/api/vendor-quote?token=${encodeURIComponent(token)}`, { cache: 'no-store' });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) setLoadError(d.error ?? 'This quote link is not valid');
    else setInfo(d as Info);
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch('/api/vendor-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, unitPrice: Number(unitPrice), leadDays: Number(leadDays), notes }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error ?? 'Submission failed');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Submission failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-lg"><Package className="w-5 h-5" /></div>
          <div>
            <h1 className="font-semibold">Request for Quotation</h1>
            <p className="text-xs text-slate-400">Acme Procurement · powered by VendorMind Ops</p>
          </div>
        </div>

        {loadError && <p className="text-sm text-rose-300">{loadError}</p>}
        {!info && !loadError && <p className="text-sm text-slate-500 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Loading…</p>}

        {info && (
          <>
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm space-y-1">
              <div className="text-slate-400 text-xs">Quote for {info.vendorName}</div>
              <div className="font-medium">{info.qty} × {info.item}</div>
              <div className="text-xs text-slate-400">Needed by {info.neededBy} · window closes {info.deadline.slice(0, 16).replace('T', ' ')} UTC</div>
            </div>

            {info.status === 'negotiating' && info.counterMessage && (
              <div className="bg-amber-950/20 border border-amber-900 rounded-lg p-3 text-xs text-amber-200 space-y-1">
                <div className="font-semibold text-amber-300">Message from Acme Procurement (round {info.round})</div>
                <p>{info.counterMessage}</p>
              </div>
            )}

            {info.status === 'quoted' && info.quote ? (
              <div className="flex items-start gap-2 text-sm text-emerald-300 bg-emerald-950/30 border border-emerald-900 rounded-lg p-3">
                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                <span>Quote received: ${info.quote.unitPrice} per unit, {info.quote.leadDays} day lead time. Thank you, the buyer has been notified.</span>
              </div>
            ) : !info.open ? (
              <p className="text-sm text-amber-300">The quote window for this request is closed.</p>
            ) : (
              <div className="space-y-3 text-xs">
                <label className="block text-slate-400">Unit price (USD)
                  <input type="number" min={0} step="0.01" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 text-sm focus:outline-none focus:border-blue-500" />
                </label>
                <label className="block text-slate-400">Lead time (days)
                  <input type="number" min={0} step="1" value={leadDays} onChange={(e) => setLeadDays(e.target.value)} className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 text-sm focus:outline-none focus:border-blue-500" />
                </label>
                <label className="block text-slate-400">Notes (optional)
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={300} className="mt-1 w-full h-16 bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 text-sm focus:outline-none focus:border-blue-500" />
                </label>
                {error && <p className="text-rose-300">{error}</p>}
                <button disabled={busy || !unitPrice || !leadDays} onClick={submit} className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-sm font-medium py-2 rounded-lg flex items-center justify-center gap-2">
                  {busy && <Loader2 className="w-4 h-4 animate-spin" />}{info.status === 'negotiating' ? 'Submit best and final offer' : 'Submit quote'}
                </button>
                <p className="text-[11px] text-slate-500">Your quote is private. You cannot see other vendors&apos; prices.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
