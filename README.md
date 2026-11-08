# VendorMind Ops: Autonomous Procurement on Vultr

**Vultr Agent Rush · Challenge: Powering the Future of Work (Procurement)**

Procurement teams lose days to email: asking vendors for quotes, comparing replies, chasing late
deliveries, and getting approvals. VendorMind Ops runs that work with agents and keeps a human in charge
of every decision that moves real money.

## What makes it a platform, not a demo

| Capability | How it works |
|---|---|
| **Multi-party workflow** | Each RFQ email carries a secure vendor-portal link (`/quote/<token>`). Vendors submit price and lead time themselves; the workflow genuinely **waits** for them, then continues. Vendors never see each other's prices or the buyer's budget. |
| **Human-in-the-loop governance** | Orders above the approval limit, or with flagged quotes (over budget, misses deadline, price >15% over baseline, vendor <80% on-time), pause for an approver with a full quote comparison. |
| **Autopilot** | A background scheduler (Next.js instrumentation hook) closes expired quote windows and chases late orders with no one clicking. Toggle it in the header. It will not re-email a vendor chased in the last 20 hours. |
| **Plain-English intake** | "We need 30 monitors by Dec 1, around $10k" becomes a validated structured request and starts sourcing. |
| **Procurement copilot** | Ask questions about live requests, orders and vendors; answers come only from workspace data. |
| **AI audit trail** | Every Vultr Serverless Inference call is logged with purpose, the model that actually answered, latency, tokens and outcome. |
| **Business impact** | Dashboard shows spend and savings versus market baseline. |
| **Autonomous negotiation** | If the best quote is over budget but close (within 25%), the agent counters automatically instead of escalating. The vendor gets one best-and-final round via their portal link. Only after that does it fall back to human approval. All thresholds and the over-budget % are computed deterministically; the LLM only writes the wording the vendor sees. |
| **Tamper-evident decision ledger** | Every inference call is hash-chained (`sha256(prevHash + record)`), like a minimal blockchain. The **AI audit** tab recomputes and verifies the whole chain live; editing one historic record anywhere breaks verification and names the broken record. Judges can watch this fail live by corrupting `data/db.json` on the server (see Demo). |

## Agent workflows

**Sourcing:** analyze need → shortlist approved vendors → draft and send RFQs → **collect vendor quotes (waits,
and negotiates automatically on near-miss quotes)** → score and recommend → policy and anomaly checks →
approval routing → issue PO.

**Delay follow-up:** scan open orders → draft vendor follow-ups → send → escalate orders 7+ days late with an alternate-vendor suggestion.

Quote scoring is deterministic: 50% cost, 25% meets deadline, 25% vendor on-time rate.

## Architecture

```
 Buyer dashboard ─┐                          ┌─► Vultr Serverless Inference (OpenAI-compatible)
 Vendor portal  ──┼─► Next.js 16 on Vultr ───┤     spec analysis · RFQ/follow-up emails · rationale · intake · copilot
 (public links)   │   Cloud Compute VM       └─► Rules engine: shortlist · scoring · policy · escalation (no LLM)
                  │   behind Caddy (HTTPS)
                  └─► Workflow engine + scheduler (src/lib/agent.ts, scheduler.ts)
                          State: serialized atomic JSON store on the VM; audit trace of every model call
```

**Design principle: the model writes and explains; rules decide.** Anything involving money or policy is
deterministic and testable. If inference is unavailable, every LLM step falls back to a template and the UI
labels the output `TEMPLATE` instead of `VULTR LLM`.

**Security notes**
- Vendor-supplied text (portal notes) is stored for humans and never placed in an LLM prompt, so vendors cannot prompt-inject the recommendation.
- Portal tokens are random 96-bit values; a quote can be submitted once, only while the window is open.
- Per-IP rate limits on every endpoint that spends inference tokens; at most 3 concurrent agent runs.
- The demo dashboard shows portal links so judges can play the vendor. In production they would only travel by email.

## Run the demo (5 minutes)

1. **Chairs (REQ-201):** Run agent. The agent writes RFQs and **waits for vendors**. Click *open vendor portal* on one vendor and submit a quote **about 10-15% over the request's budget** — watch it flip to "negotiating" and send a counter automatically. Submit a lower best-and-final offer on the same link to finish that vendor, then **Simulate vendor replies** for the rest.
2. **Laptops (REQ-202):** Run agent and simulate replies. The total exceeds the limit, so it lands in **Approvals** with a quote comparison. Approve and the PO is issued.
3. **Plain English:** type *"20 monitors by next month, budget $7k"* and watch the request appear.
4. Turn **Autopilot ON**: within about a minute the agent chases PO-1001 (4 days late) and escalates PO-1002 (9 days late) with an alternate-vendor suggestion. Or use *Scan delays* in the Orders tab.
5. Ask the **copilot**: *"Which orders are late and what should I do?"*
6. Open **AI audit**: a green banner confirms the decision ledger is hash-chained and intact. To prove it isn't just a claim, on the server run:
   ```bash
   python3 -c "import json; d=json.load(open('data/db.json')); d['traces'][0]['purpose']='TAMPERED'; json.dump(d, open('data/db.json','w'))"
   ```
   Refresh the tab (or wait 15s) and the banner turns red, naming the exact record that was altered.
7. **Outbox** for every email the agents wrote, including the negotiation counter.

## Setup

```bash
npx create-next-app@latest agent-rush-app --ts --tailwind --app --src-dir
cd agent-rush-app
npm install openai lucide-react
npm install -D tailwindcss @tailwindcss/postcss postcss
# copy this repo's files over the scaffold
cp .env.example .env.local     # set VULTR_API_KEY and VULTR_MODEL
npm run dev
```

### Deploy on Vultr
Ubuntu 24.04 VM: `bash scripts/deploy.sh` (Node 20, PM2, build, firewall), then
`bash scripts/enable-https.sh` (Caddy with automatic Let's Encrypt on `<ip>.sslip.io`, or `DOMAIN=...`).
Check with `bash scripts/smoke-test.sh`.

## Honest scope

- **Simulated:** email delivery (messages are logged to the Outbox, not sent over SMTP) and the optional "Simulate vendor replies" shortcut. Vendor replies through the portal are real.
- **Storage:** one JSON file on the VM keeps the demo dependency-free. Production path: Vultr Managed PostgreSQL.
- **Access:** the demo has no login. Add SSO and roles before using real data.

## Roadmap
Real SMTP/IMAP and ERP connectors, invoice three-way matching against POs, multi-tenant workspaces with
roles, Vultr Managed PostgreSQL, and Vultr Object Storage for quote attachments.
