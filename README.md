# playwright-jira-creator

A [Claude Code](https://claude.com/claude-code) skill that turns a Jira bug into a verified Playwright **bug recorder** test:
a spec that asserts the bug's *current* behaviour, so it passes while the bug exists and fails once the fix ships.

Workflow: read the ticket and its root cause, pick an environment that still has the bug, reproduce it interactively in a
visible browser, write the spec and data file, run it in Chrome/Firefox until it passes because the bug reproduces,
clean up all test data, and report.

## Install

Copy into your Playwright repo:

```bash
cp -r skills/playwright-jira-creator <repo>/.claude/skills/
cp commands/launch-playwright-jira-creator.md <repo>/.claude/commands/
```

Then fill in the project-specific references:

- `references/environments.md` - your environments, `.env` variable names, versions, sign-in flows
- `references/repo-conventions.md` - test/data folders, fixtures (defaults: `tests/`, `data/`)
- `references/ui-patterns.md` - proven locators for your app (grows as tests pass)
- `scripts/api-cleanup.example.cjs` and `assets/spec-template.ts` - your API's login/delete endpoints

## Requirements

- Node + `@playwright/test`, `playwright`, `dotenv`, `@faker-js/faker` in the repo
- Python 3 for `scripts/jira_fetch.py`
- Jira access: `JIRA_URL` + `JIRA_PERSONAL_TOKEN` env vars, or a `jira` MCP server (mcp-atlassian) configured in Claude
- `.env` with `BASE_URL`, `ADMIN_USERNAME`, `ADMIN_PASSWORD` (and `<ENV>_BASE_URL/_USERNAME/_PASSWORD` for other environments)

## Use

```
/launch-playwright-jira-creator PROJ-12345
```
or just ask Claude to "record PROJ-12345 as a Playwright bug test".

## Scripts

| Script | Purpose |
|---|---|
| `scripts/jira_fetch.py <ID> [--attachments DIR]` | Print the issue (fields, comments, links) as Markdown; download attachments |
| `scripts/explore/browser.cjs [url]` | Start a persistent visible Chrome with CDP on port 9333 |
| `scripts/explore/step.cjs <step.js>` | Run one small exploration step against that browser |
| `scripts/run-spec.sh <ID> [env] [args]` | Run one spec against an environment, log to `$TMPDIR` |
| `scripts/api-cleanup.example.cjs` | Example REST helper for finding/deleting test data |
