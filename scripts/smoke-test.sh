#!/usr/bin/env bash
# Quick end-to-end check of the running app. Usage: bash scripts/smoke-test.sh [base-url]
BASE="${1:-http://127.0.0.1:3000}"
echo "health:"; curl -fsS "$BASE/api/health"; echo
echo "state:"; curl -fsS "$BASE/api/state" | python3 -c 'import sys,json; d=json.load(sys.stdin); print({k: len(d[k]) for k in ("vendors","requests","orders","approvals","emails","runs","rfqs","traces")})'
echo "delay scan:"; curl -fsS -X POST "$BASE/api/actions" -H 'Content-Type: application/json' -d '{"type":"scan"}'; echo
