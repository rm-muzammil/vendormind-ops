export const CATEGORIES: Record<string, { base: number; unit: string }> = {
  laptops: { base: 1200, unit: 'laptop' },
  monitors: { base: 300, unit: 'monitor' },
  'office chairs': { base: 250, unit: 'chair' },
  'printer paper': { base: 35, unit: 'box' },
  cables: { base: 8, unit: 'cable' },
};

export const APPROVAL_THRESHOLD = Number(process.env.APPROVAL_THRESHOLD ?? 10000);

/** yyyy-mm-dd, offset days from now (UTC) */
export function isoDay(offset = 0): string {
  return new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);
}

export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);
}
