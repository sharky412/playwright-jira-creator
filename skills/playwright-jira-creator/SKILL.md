---
name: playwright-jira-creator
description: Turns a Jira bug (e.g. PROJ-12345) into a verified Playwright "bug recorder" test - reads the ticket and its documented root cause, picks a test environment that still has the bug, reproduces the defect in Chrome/Firefox, writes tests/<ID>.spec.ts plus its data file asserting the CURRENT buggy behaviour (so it fails once fixed), runs it, cleans up test data and reports. Use this whenever the user gives a Jira ticket ID and wants it reproduced, recorded, automated, or turned into a Playwright test, invokes /launch-playwright-jira-creator, or says things like "record this bug", "write a test for PROJ-xxxxx", "automate this Jira", "try PROJ-xxxxx next".
---

# Playwright Jira bug recorder

Input: one Jira key (e.g. `PROJ-12345`). Output: a verified, self-cleaning Playwright spec that **records the bug as it exists today**,
plus a short report. Work autonomously; ask the user only for decisions or blockers you cannot resolve safely
(missing credentials, no environment that has the bug, a destructive step on data you didn't create, ambiguous expected behaviour).

Repo root = the directory containing `playwright.config.ts` (this skill lives in `<repo>/.claude/skills/playwright-jira-creator`).
Script paths below are relative to the repo root.

Read these references when you reach the step that needs them (fill them in for your project - they hold hard-won specifics so
they are not rediscovered every run):
- `references/environments.md` - environments, versions, credentials (`.env` vars), sign-in flows, browser notes
- `references/repo-conventions.md` - file layout, fixtures, how to run
- `references/ui-patterns.md` - proven locators and flows for your application, plus cleanup
- `assets/spec-template.ts` - starting point for the spec

## Why "bug recorder"

These tests document defects before a fix ships. The assertion encodes the **buggy** behaviour that was actually observed, so:
- before the fix the test passes (the bug is reproduced),
- after the fix it fails at that assertion, which tells the team the defect is gone.

So never assert the expected/fixed behaviour, never weaken the assertion to "something failed", and never assume the bug
exists without seeing it. If the bug is not reproducible on any available environment, say so instead of writing a test that
passes for the wrong reason. If the user later asks to flip the test after a fix, only then rewrite the assertion.

## Workflow

Track these as todo items and keep the user posted with one short line per phase.

### 1. Read the ticket
```bash
python3 .claude/skills/playwright-jira-creator/scripts/jira_fetch.py <ID> --attachments "${TMPDIR:-/tmp}/playwright-jira-creator/<ID>-jira"
```
(Not `test-results/` - every Playwright run wipes it. If Jira MCP tools are loaded in the session you may use them instead.)
Extract: summary, steps, expected vs actual, affected/fix versions, linked issues, and any root-cause analysis in the comments.
Treat the documented root cause as the primary reference - use it to decide what to observe, not to re-investigate. Look at
screenshot attachments when the steps are vague. If the ticket is an enhancement request or by-design behaviour, the "bug" to
record is the current behaviour the customer objects to - state that in the spec header.

Write down in one or two sentences the **observable symptom** you will assert (e.g. "after moving ChildTopic under ParentTopic,
the parent card is still missing for a restricted user"). Everything else serves that.

### 2. Check for existing coverage
Search the repo for the key and the feature words (see repo-conventions.md). If a spec for `<ID>` already exists, back it up
(e.g. `backup/<ID>-<date>/`) before changing anything, and improve it rather than duplicating it.

### 3. Pick the environment and access
Use `references/environments.md`. The environment must (a) run a version that still has the bug and (b) give the access the
steps need (admin, a restricted user, a licensed feature...). Confirm the version in the product itself. Prefer an admin user
for setup; when the bug is about a restricted user, create a disposable one (e.g. with a user-creation fixture). Never change
shared configuration (environment settings, other users, existing shared objects) to force a reproduction - create your own
objects. Never run automation against customer environments. If nothing fits, stop and report the blocker with the environment table.

### 4. Reproduce interactively first
Drive a visible browser step by step before writing the spec - it is far faster than iterating on full test runs:
```bash
node .claude/skills/playwright-jira-creator/scripts/explore/browser.cjs <BASE_URL> &      # run in background, keep it open
node .claude/skills/playwright-jira-creator/scripts/explore/step.cjs <scratchpad>/s1.js   # each step = small script
```
Steps get `page`, `ctx`, `env`, `dump(page, name)` (screenshot + visible text + data-testids). Sign in once, then explore.
Prefer locators from `references/ui-patterns.md` and from existing specs. Name every object you create with a recognisable
prefix (e.g. `zz<Feature>_<suffix>`) so you can find and delete it later.

Confirm the symptom matches Jira and the root cause. If it doesn't reproduce, check setup, permissions, data, environment
version and browser before concluding it's not reproducible. Compare against a control where it helps (e.g. one language vs
another) - a control makes the assertion meaningful.

Delete your exploration objects as soon as you no longer need them (step 7 rules apply).

### 5. Write the spec and data
- `data/<ID>.json`: `[{ "tcName": "TC01", ...names, languages, folders... }]` - every value the test uses.
- `tests/<ID>.spec.ts` from `assets/spec-template.ts`: Jira key in the header, issue annotation, a unique suffix on every
  created name, existing fixtures/helpers, stable `data-testid` locators, `expect(...)` waits and `toPass` only for
  eventually-consistent checks, everything inside `try { } finally { cleanup }`.
- The key assertion carries a message starting with `<ID> bug:` so a post-fix failure is self-explanatory.
- Keep the test focused on this defect; one or two control assertions are fine, unrelated checks are not.

### 6. Run and verify
```bash
npx tsc --noEmit -p . 2>&1 | grep <ID>
.claude/skills/playwright-jira-creator/scripts/run-spec.sh <ID> [env] [--headed]
```
Iterate until it passes **because the bug reproduces**. Read every failure before changing anything - screenshot, error-context,
trace (`test-results/`). Classify it: assertion (bug not as expected), authentication, setup/locator, timeout/flaky UI,
environment. Fix the cause, not the symptom: never loosen the bug assertion to make it pass. Run in both Chrome and Firefox when
the feature is browser-independent; if one browser cannot sign in, run the other and report the limitation.
A test only counts as verified after a real passing run you observed.

### 7. Cleanup
The spec deletes everything it creates (UI cleanup first, API last - an API login can end the browser session of the same user).
After the final run, verify nothing is left (API helper or UI). Also remove leftovers from failed runs and exploration.
Only delete objects whose names carry this run's prefixes/suffixes and that you created; never pre-existing or shared data.
If something can't be deleted, list it in the report. Stop the exploration browser.

### 8. Review
`git status` / `git diff`: only the new spec, data file (and backups) should be new or changed - no product code,
no `playwright.config.ts`, no `.env` (unless the user asked for credentials there), no stray exploration files.
Re-read the spec once: Jira key, header, bug assertion with `<ID> bug:` message, cleanup in `finally`.

### 9. Report
Use this structure, concisely, with facts only (never claim a run or reproduction that didn't happen):

1. **Jira issue** - ID, summary, status, affected/fix versions
2. **Reproduction** - reproduced or not, on which env/version, what was observed (one or two sentences)
3. **Browsers** - Chrome / Firefox results and limitations
4. **Test file** - `tests/<ID>.spec.ts` (+ data file)
5. **Assertion** - the buggy behaviour recorded, and what failing after a fix will mean
6. **Execution** - actual run results (pass/fail, duration, how many runs)
7. **Cleanup** - what the test deletes, what you verified is gone, anything left
8. **Blockers** - unresolved issues, unverified steps
9. **Changes** - files created/modified

### 10. Tracking row (optional)
If your team tracks recorded tests in a table (wiki page, spreadsheet), output one ready-to-paste row after a verified, passing
test, e.g.:

| S/N | Create Date | Reporter | JIRA# | Case ID | Customer | Description | .ts filename |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `<next>` | 2026-01-15 | `<your name>` | [PROJ-12345](https://<your-jira>/browse/PROJ-12345) | `<Case ID>` | `<customer>` | One sentence with the recorded behaviour in product terms. | `PROJ-12345.spec.ts` |

Never invent values (case IDs, S/N) - leave placeholders and tell the user. Give no row when no verified test was created.

## Interpreting a later failure

If the user runs the test after a product fix and it fails: check the failure is at the `<ID> bug:` assertion and that the
observed value is the fixed behaviour. Auth errors, timeouts, missing data or a different assertion failing are not evidence
of the fix - say so. Don't rewrite the assertion unless asked.
