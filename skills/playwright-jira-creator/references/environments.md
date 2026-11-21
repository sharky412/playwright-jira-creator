# Test environments

Fill this in for your project. Credentials live in the repo `.env` (never commit real secrets to a public repo).
Never print password values into the conversation. Record how to check the product version in the UI.

| Env | Base URL / `.env` vars | Version (as of <date>) | Notes |
|---|---|---|---|
| env1 (default) | `BASE_URL`, `ADMIN_USERNAME`, `ADMIN_PASSWORD` | `<x.y.z>` | Admin in all departments. Features available: ... |
| env2 | `ENV2_BASE_URL`, `ENV2_USERNAME`, `ENV2_PASSWORD` | `<x.y.z>` | Features missing / licences: ... |
| env3 | `ENV3_BASE_URL`, `ENV3_USERNAME`, `ENV3_PASSWORD` | `<x.y.z>` | Non-admin user, single department. Local login URL: ... |

Features no internal environment has (licence-gated etc.): list them here, so the skill reports a blocker instead of searching.
Never use customer tenants, dev ones included.

## Choosing an environment

1. Bug recorder tests must show the bug, so the environment must run a version that still has it.
   Compare Jira "Affects versions" / "Fix versions" with the env versions above (re-check in the UI; versions change).
   - Env older than the affected version: the bug may never have existed there - verify, do not assume.
   - Env at/after the fix version: the bug is fixed there - a bug recorder cannot be verified there.
2. Prefer the default env (broadest access) unless the ticket needs a feature it lacks.
3. If no environment has both the buggy version and the needed access, stop and report the blocker with this table.

## Browsers

- `playwright.config.ts` projects may default to Chrome; a spec can override with `test.use({ browserName: 'firefox', ... })`.
- Record known SSO/browser quirks here (e.g. "fresh Chrome profile fails SSO with error X - run Firefox and report it").
- Firefox often needs: `permissions: []` (Chrome-only clipboard permissions break it), an explicit large `viewport`,
  and a little `slowMo`.
- Install browsers if missing: `npx playwright install chromium firefox`.

## Sign-in flows

Document each env's flow, e.g.:
- `page.goto(BASE_URL)`, fill username/password, submit with **Enter** (buttons can be covered), wait for the env host.
- IdPs sometimes ask for credentials twice - loop up to 2 times.
- Don't `goto` the IdP URL directly (no SAML/OIDC request).
- Switching users in one test: sign out of the current session only (not "end all sessions", which can kill a fixture's API session).
- API logins that force a new session can end a browser session of the same user: do UI cleanup first, API cleanup last.
