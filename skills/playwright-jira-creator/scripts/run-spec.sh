#!/bin/bash
# Runs one spec against a chosen environment.
#   .claude/skills/playwright-jira-creator/scripts/run-spec.sh <ID> [env] [extra playwright args...]
#   env: default (uses BASE_URL/ADMIN_* from .env) or any name with <ENV>_BASE_URL/_USERNAME/_PASSWORD in .env
# - for env != default, maps <ENV>_BASE_URL/_USERNAME/_PASSWORD from .env onto BASE_URL/ADMIN_* for this run only
# - writes the full log to $TMPDIR/playwright-jira-creator/<ID>-<env>.log (test-results/ is wiped by each run) and prints a short summary
# Adjust TEST_DIR / DATA_DIR / PROJECT to your repo.
set -u
TEST_DIR="${TEST_DIR:-tests}"; DATA_DIR="${DATA_DIR:-data}"; PROJECT="${PROJECT:-}"
ID="$1"; ENV="${2:-default}"; shift; [ $# -gt 0 ] && shift
REPO="$(cd "$(dirname "$0")/../../../.." && pwd)"
cd "$REPO" || exit 1
[ -f "$DATA_DIR/$ID.json" ] || { echo "BLOCKER: $DATA_DIR/$ID.json not found"; exit 1; }
[ -f "$TEST_DIR/$ID.spec.ts" ] || { echo "BLOCKER: $TEST_DIR/$ID.spec.ts not found"; exit 1; }

if [ "$ENV" != "default" ]; then
  PREFIX=$(echo "$ENV" | tr '[:lower:]' '[:upper:]')
  eval "$(python3 -I - "$PREFIX" <<'EOF'
import re, sys, shlex
p = sys.argv[1]
vals = {}
for line in open('.env'):
    m = re.match(r'(\w+)=(.*)', line.strip())
    if m:
        v = m.group(2).strip()
        if len(v) >= 2 and v[0] == v[-1] and v[0] in "'\"":
            v = v[1:-1]
        vals[m.group(1)] = v
for src, dst in [('BASE_URL', 'BASE_URL'), ('USERNAME', 'ADMIN_USERNAME'), ('PASSWORD', 'ADMIN_PASSWORD')]:
    if f'{p}_{src}' in vals:
        print(f'export {dst}={shlex.quote(vals[p + "_" + src])}')
EOF
)"
fi

LOG_DIR="${TMPDIR:-/tmp}/playwright-jira-creator"; mkdir -p "$LOG_DIR"
LOG="$LOG_DIR/$ID-$ENV.log"
npx playwright test ${PROJECT:+--project=$PROJECT} "$ID" --reporter=line "$@" > "$LOG" 2>&1
STATUS=$?
grep -E "passed|failed|flaky|skipped" "$LOG" | tail -3
grep -n -A14 "^  1) \[" "$LOG" | head -24
echo "Full log: $LOG (exit $STATUS)"
exit $STATUS
