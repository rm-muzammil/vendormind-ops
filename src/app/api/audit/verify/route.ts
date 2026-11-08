import { NextResponse } from 'next/server';
import { verifyChain } from '@/lib/ledger';
import { snapshot } from '@/lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const db = await snapshot();
  const oldestFirst = [...db.traces].reverse(); // stored newest-first
  const result = verifyChain(oldestFirst);
  return NextResponse.json(result);
}
