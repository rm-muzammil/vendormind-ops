import { expireQuotes, startDelayScan } from './agent';
import { isoDay } from './catalog';
import { log, mutate, snapshot } from './store';

const g = globalThis as unknown as { __vmSched?: boolean };
const EVERY_MS = Number(process.env.SCHEDULER_SECONDS ?? 60) * 1000;

/** Background autonomy: closes expired quote windows and (if Autopilot is on) chases late orders. */
export function startScheduler() {
  if (g.__vmSched) return;
  g.__vmSched = true;
  const timer = setInterval(() => {
    tick().catch(() => {});
  }, EVERY_MS);
  timer.unref?.();
}

async function tick() {
  const db = await snapshot();
  const now = Date.now();

  for (const run of db.runs.filter((r) => r.status === 'waiting_quotes')) {
    const rfqs = db.rfqs.filter((r) => r.runId === run.id);
    if (rfqs.length && rfqs.every((r) => Date.parse(r.deadline) < now)) {
      await mutate((d) => log(d, 'action', `Quote window expired for ${run.subject}: scheduler is closing it`));
      await expireQuotes(run.id).catch(() => {});
    }
  }

  if (db.settings.autopilot) {
    const today = isoDay(0);
    const due = db.orders.some(
      (o) => o.status !== 'delivered' && o.expectedDate < today && (!o.lastFollowUpAt || now - Date.parse(o.lastFollowUpAt) > 24 * 3_600_000),
    );
    const recent = db.settings.lastAutoScanAt && now - Date.parse(db.settings.lastAutoScanAt) < 3_600_000;
    if (due && !recent) {
      await mutate((d) => {
        d.settings.lastAutoScanAt = new Date().toISOString();
        log(d, 'action', 'Autopilot: late orders detected, starting follow-up agent');
      });
      await startDelayScan().catch(() => {});
    }
  }
}
