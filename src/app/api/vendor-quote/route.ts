import { NextResponse } from 'next/server';
import { submitVendorQuote, vendorPortalInfo } from '@/lib/agent';
import { limited } from '@/lib/ratelimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get('token') ?? '';
  const info = token ? await vendorPortalInfo(token) : null;
  if (!info) return NextResponse.json({ error: 'This quote link is not valid' }, { status: 404 });
  return NextResponse.json(info);
}

export async function POST(req: Request) {
  const l = limited(req, 'vendor', 30);
  if (l) return l;
  const b = (await req.json().catch(() => null)) as { token?: string; unitPrice?: number; leadDays?: number; notes?: string } | null;
  try {
    if (!b?.token) throw new Error('Missing token');
    await submitVendorQuote(String(b.token), Number(b.unitPrice), Number(b.leadDays), String(b.notes ?? ''));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed' }, { status: 400 });
  }
}
