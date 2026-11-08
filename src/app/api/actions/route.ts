import { NextResponse } from 'next/server';
import { closeQuotes, decideApproval, startDelayScan, startSourcing } from '@/lib/agent';
import { limited } from '@/lib/ratelimit';
import { log, mutate, resetDB } from '@/lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { type?: string; id?: string; enabled?: boolean } | null;
  const type = body?.type;
  const id = typeof body?.id === 'string' ? body.id : '';
  try {
    switch (type) {
      case 'source': {
        const l = limited(req, 'run');
        if (l) return l;
        if (!id) throw new Error('id required');
        return NextResponse.json({ runId: await startSourcing(id) });
      }
      case 'approve':
        if (!id) throw new Error('id required');
        await decideApproval(id, true);
        return NextResponse.json({ ok: true });
      case 'reject':
        if (!id) throw new Error('id required');
        await decideApproval(id, false);
        return NextResponse.json({ ok: true });
      case 'simulate-quotes':
        if (!id) throw new Error('id required');
        await closeQuotes(id, true);
        return NextResponse.json({ ok: true });
      case 'close-quotes':
        if (!id) throw new Error('id required');
        await closeQuotes(id, false);
        return NextResponse.json({ ok: true });
      case 'scan': {
        const l = limited(req, 'run');
        if (l) return l;
        return NextResponse.json(await startDelayScan());
      }
      case 'autopilot':
        await mutate((db) => {
          db.settings.autopilot = !!body?.enabled;
          log(db, 'action', `Autopilot ${db.settings.autopilot ? 'enabled: late orders will be chased automatically' : 'disabled'}`);
        });
        return NextResponse.json({ ok: true });
      case 'reset':
        await resetDB();
        return NextResponse.json({ ok: true });
      default:
        throw new Error('Unknown action');
    }
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed' }, { status: 400 });
  }
}
