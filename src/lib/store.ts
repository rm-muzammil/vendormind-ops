import fs from 'node:fs/promises';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import type { AppEvent, DB } from './types';
import { seedDB } from './seed';

const FILE = path.join(process.cwd(), 'data', 'db.json');

// Route bundles may each load this module separately, so the lock lives on globalThis.
const g = globalThis as unknown as { __vmLock?: Promise<unknown> };

export const uid = (prefix: string) => `${prefix}-${randomBytes(3).toString('hex')}`;

async function write(db: DB) {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  const tmp = `${FILE}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(db, null, 2));
  await fs.rename(tmp, FILE); // atomic replace
}

async function read(): Promise<DB> {
  try {
    const parsed = JSON.parse(await fs.readFile(FILE, 'utf-8')) as Partial<DB>;
    const d = seedDB();
    // Drop traces/rfqs written by an older schema (missing the hash chain / negotiation fields) rather than crash on them.
    const traces = parsed.traces?.every((t) => typeof t.hash === 'string' && typeof t.prevHash === 'string') ? parsed.traces : d.traces;
    const rfqs = parsed.rfqs?.every((r) => Array.isArray(r.offers) && typeof r.round === 'number') ? parsed.rfqs : d.rfqs;
    return { ...d, ...parsed, traces, rfqs, settings: { ...d.settings, ...(parsed.settings ?? {}) } } as DB; // backfills new fields, drops incompatible old-schema records
  } catch {
    const db = seedDB();
    await write(db);
    return db;
  }
}

/** Serialized read-modify-write. All state changes go through here. */
export function mutate<T>(fn: (db: DB) => T | Promise<T>): Promise<T> {
  const prev = g.__vmLock ?? Promise.resolve();
  const next = prev
    .catch(() => {})
    .then(async () => {
      const db = await read();
      const out = await fn(db);
      await write(db);
      return out;
    });
  g.__vmLock = next;
  return next;
}

export async function snapshot(): Promise<DB> {
  await (g.__vmLock ?? Promise.resolve()).catch(() => {});
  return read();
}

export function resetDB() {
  return mutate((db) => {
    Object.assign(db, seedDB());
  });
}

export function log(db: DB, level: AppEvent['level'], message: string) {
  db.events.unshift({ id: uid('ev'), ts: new Date().toISOString(), level, message });
  if (db.events.length > 200) db.events.length = 200;
}
