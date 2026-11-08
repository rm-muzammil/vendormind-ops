import type { DB } from './types';
import { isoDay } from './catalog';

export function seedDB(): DB {
  const now = new Date().toISOString();
  return {
    vendors: [
      { id: 'northwind', name: 'Northwind Office Supply', email: 'sales@northwind.example', rating: 4.6, onTimeRate: 0.94, leadDays: 5, priceIndex: 1.05, categories: ['office chairs', 'printer paper', 'cables'], approved: true },
      { id: 'techsource', name: 'TechSource Global', email: 'quotes@techsource.example', rating: 4.3, onTimeRate: 0.88, leadDays: 7, priceIndex: 0.97, categories: ['laptops', 'monitors', 'cables'], approved: true },
      { id: 'brightedge', name: 'BrightEdge Distribution', email: 'rfq@brightedge.example', rating: 4.1, onTimeRate: 0.81, leadDays: 4, priceIndex: 0.92, categories: ['laptops', 'monitors', 'office chairs'], approved: true },
      { id: 'apex', name: 'Apex Industrial Direct', email: 'orders@apex.example', rating: 3.6, onTimeRate: 0.7, leadDays: 10, priceIndex: 0.85, categories: ['cables', 'printer paper', 'monitors'], approved: true },
      { id: 'quickship', name: 'QuickShip Wholesale', email: 'desk@quickship.example', rating: 4.4, onTimeRate: 0.91, leadDays: 3, priceIndex: 1.28, categories: ['laptops', 'monitors', 'office chairs', 'printer paper', 'cables'], approved: true },
      { id: 'shadow', name: 'Shadow Traders Ltd', email: 'info@shadowtraders.example', rating: 3.0, onTimeRate: 0.6, leadDays: 2, priceIndex: 0.7, categories: ['laptops', 'office chairs', 'monitors'], approved: false },
    ],
    requests: [
      { id: 'REQ-201', item: 'Ergonomic office chairs', category: 'office chairs', qty: 14, budget: 4500, neededBy: isoDay(21), requester: 'Facilities Team', status: 'new', createdVia: 'seed', createdAt: now },
      { id: 'REQ-202', item: 'Laptops for new hires', category: 'laptops', qty: 25, budget: 32000, neededBy: isoDay(30), requester: 'IT Team', status: 'new', createdVia: 'seed', createdAt: now },
    ],
    orders: [
      { id: 'PO-1001', vendorId: 'apex', vendorName: 'Apex Industrial Direct', category: 'printer paper', item: 'Printer paper (A4)', qty: 200, total: 5950, orderedAt: isoDay(-18), expectedDate: isoDay(-4), status: 'open', delayDays: 0, followUps: 0 },
      { id: 'PO-1002', vendorId: 'techsource', vendorName: 'TechSource Global', category: 'monitors', item: 'Monitors 27"', qty: 10, total: 2910, orderedAt: isoDay(-25), expectedDate: isoDay(-9), status: 'open', delayDays: 0, followUps: 0 },
      { id: 'PO-1003', vendorId: 'northwind', vendorName: 'Northwind Office Supply', category: 'cables', item: 'USB-C cables', qty: 150, total: 1260, orderedAt: isoDay(-20), expectedDate: isoDay(-6), status: 'delivered', delayDays: 0, followUps: 0 },
      { id: 'PO-1004', vendorId: 'brightedge', vendorName: 'BrightEdge Distribution', category: 'office chairs', item: 'Task chairs', qty: 8, total: 1840, orderedAt: isoDay(-3), expectedDate: isoDay(6), status: 'open', delayDays: 0, followUps: 0 },
    ],
    approvals: [],
    emails: [],
    runs: [],
    rfqs: [],
    traces: [],
    settings: { autopilot: false },
    events: [{ id: 'ev-seed', ts: now, level: 'info', message: 'Workspace initialised with sample vendors, purchase requests and open orders.' }],
  };
}
