export interface Vendor {
  id: string;
  name: string;
  email: string;
  rating: number; // 0-5
  onTimeRate: number; // 0-1
  leadDays: number;
  priceIndex: number; // 1.0 = market baseline
  categories: string[];
  approved: boolean;
}

export type RequestStatus = 'new' | 'sourcing' | 'awaiting_quotes' | 'awaiting_approval' | 'ordered' | 'rejected' | 'failed';

export interface PurchaseRequest {
  id: string;
  item: string;
  category: string;
  qty: number;
  budget: number;
  neededBy: string; // yyyy-mm-dd
  requester: string;
  status: RequestStatus;
  runId?: string;
  createdVia?: 'form' | 'natural-language' | 'seed';
  createdAt: string;
}

export interface Quote {
  vendorId: string;
  vendorName: string;
  unitPrice: number;
  total: number;
  leadDays: number;
  deliveryDate: string;
  score: number;
  flags: string[];
}

export interface Order {
  id: string;
  requestId?: string;
  vendorId: string;
  vendorName: string;
  category: string;
  item: string;
  qty: number;
  total: number;
  orderedAt: string;
  expectedDate: string;
  status: 'open' | 'delayed' | 'delivered';
  delayDays: number;
  followUps: number;
  lastFollowUpAt?: string;
  escalated?: boolean;
  note?: string;
  baselineTotal?: number;
}

export interface Approval {
  id: string;
  requestId: string;
  runId: string;
  item: string;
  qty: number;
  budget: number;
  reasons: string[];
  rationale: string;
  recommendation: Quote;
  alternatives: Quote[];
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  decidedAt?: string;
}

export interface Email {
  id: string;
  to: string;
  subject: string;
  body: string;
  kind: 'rfq' | 'followup' | 'po' | 'escalation';
  relatedId: string;
  generatedBy: 'llm' | 'template';
  createdAt: string;
}

export interface Step {
  key: string;
  title: string;
  llm?: boolean;
  status: 'pending' | 'running' | 'done' | 'failed' | 'skipped' | 'waiting';
  detail?: string;
  startedAt?: string;
  endedAt?: string;
}

export interface Run {
  id: string;
  kind: 'sourcing' | 'delay-followup';
  subject: string;
  refId: string;
  status: 'running' | 'waiting_quotes' | 'waiting_approval' | 'completed' | 'failed';
  steps: Step[];
  createdAt: string;
  updatedAt: string;
}

export interface AppEvent {
  id: string;
  ts: string;
  level: 'info' | 'warn' | 'action';
  message: string;
}

export interface Rfq {
  id: string;
  token: string;
  requestId: string;
  runId: string;
  vendorId: string;
  vendorName: string;
  vendorEmail: string;
  status: 'sent' | 'quoted' | 'simulated';
  quote?: { unitPrice: number; leadDays: number; notes?: string; submittedAt: string };
  deadline: string;
  createdAt: string;
}

export interface Trace {
  id: string;
  ts: string;
  purpose: string;
  model: string;
  ms: number;
  ok: boolean;
  tokens?: number;
}

export interface Settings {
  autopilot: boolean;
  lastAutoScanAt?: string;
}

export interface DB {
  vendors: Vendor[];
  requests: PurchaseRequest[];
  orders: Order[];
  approvals: Approval[];
  emails: Email[];
  runs: Run[];
  events: AppEvent[];
  rfqs: Rfq[];
  traces: Trace[];
  settings: Settings;
}
