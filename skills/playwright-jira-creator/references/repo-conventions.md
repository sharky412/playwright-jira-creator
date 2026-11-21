# Repo conventions

Adjust paths to your repo; the scripts assume the layout below.

## Layout for one Jira ticket

| File | Purpose |
|---|---|
| `tests/<JIRA-ID>.spec.ts` | Runnable spec |
| `data/<JIRA-ID>.json` | Test data array; each entry has `tcName` (`"TC01"`) |

If your repo generates specs from codegen recordings with a transformer, never put a hand-written spec in the transformer's
input folder - the next transform run would overwrite the real test.

## Spec skeleton conventions

- `import input from '../data/<ID>.json' assert { type: 'json' }`
- `for (const data of input) { test(\`test ${data['tcName']}\`, async (...) => { ... }) }`
- `const uniqueIndex = "_" + faker.string.alphanumeric(10)` appended to every name the test creates.
- When the bug needs a dedicated non-admin user, use a user-creation fixture that creates the user via API before the test and
  deletes it after (options via `test.use({ userOptions: {...} })`). Otherwise sign in with the env's admin/test credentials.
- Credentials only from `process.env` (never literals in specs).
- Header comment: Jira ID, one-line defect, that the test asserts the CURRENT buggy behaviour and must fail once fixed,
  environment and browser, and why.
- Wrap the scenario in `try { ... } finally { cleanup }` so cleanup runs on failure.
- Waits: prefer `expect(...).toBeVisible()`, `waitForURL`, `expect(async () => {...}).toPass()` for eventually-consistent
  checks (search indexing etc.). Fixed waits only where the UI resets state asynchronously - comment why.

## Running

```bash
.claude/skills/playwright-jira-creator/scripts/run-spec.sh <ID>                # default env
.claude/skills/playwright-jira-creator/scripts/run-spec.sh <ID> env2           # maps ENV2_* onto BASE_URL/ADMIN_*
.claude/skills/playwright-jira-creator/scripts/run-spec.sh <ID> env1 --headed
```
Type-check first: `npx tsc --noEmit -p . 2>&1 | grep <ID>`.
To run the same spec in the other browser, temporarily change `browserName` in `test.use` - do not edit `playwright.config.ts`.

## Existing coverage to check before writing

`grep -rli "<JIRA-ID>\|<key words>" tests data` and reuse locators from related specs. Don't add a spec that duplicates an existing one.

## Git

Don't commit unless asked. Never stage `.env` unless the user asks.
