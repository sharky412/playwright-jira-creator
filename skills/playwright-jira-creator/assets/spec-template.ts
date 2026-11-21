// TEMPLATE for tests/<JIRA-ID>.spec.ts - copy, then replace every <...> and delete what the scenario does not need.
import { test, expect, request } from '@playwright/test';
import input from '../data/<JIRA-ID>.json' assert { type: 'json' }
import { faker } from '@faker-js/faker';

// <JIRA-ID>: <one-line Jira summary>
// Defect: <what goes wrong, in product terms, citing the Jira root cause>
// BUG RECORDER: this test asserts the CURRENT (buggy) behaviour observed on <env> <version> on <date>.
// It passes while the bug exists and is expected to FAIL at the "<JIRA-ID> bug" assertion once the fix ships.
// Do not flip the assertion to the fixed behaviour unless explicitly asked.
// Runs on <env> as <user>; <browser notes>.

test.use({
  // browserName: 'firefox', permissions: [], viewport: { width: 1920, height: 1080 }, launchOptions: { slowMo: 300 },
});

for (const data of input) {
  test(`test ${data['tcName']}`, { annotation: { type: 'issue', description: 'https://<your-jira>/browse/<JIRA-ID>' } }, async ({ page }) => {
      test.setTimeout(15 * 60 * 1000);
      const uniqueIndex = "_" + faker.string.alphanumeric(10)
      const created: { items: string[] } = { items: [] };

      // ---- Sign in (see references/environments.md) ----

      try {
        // ---- Setup: create only the data the reproduction needs; push every created id into `created` right away ----

        // ---- Reproduce: follow the Jira steps ----

        // ---- <JIRA-ID> bug: assert the buggy behaviour that was verified manually ----
        // expect(<observable symptom>, '<JIRA-ID> bug: <what is wrong>').<matcher>(<buggy value>);
      } finally {
        // ---- Cleanup: UI cleanup first, then API deletes of ids in `created` (adapt endpoints to your API) ----
        const api = await request.newContext({ extraHTTPHeaders: { 'Content-Type': 'application/json', Accept: 'application/json' } });
        const login = await api.post(process.env.BASE_URL + '/<login-endpoint>', {
          data: { userName: process.env.ADMIN_USERNAME, password: process.env.ADMIN_PASSWORD },
        });
        const headers = { '<session-header>': login.headers()['<session-header>'] };
        for (const id of created.items) console.log(`Delete item ${id}: ` + (await api.delete(`${process.env.BASE_URL}/<items-endpoint>/${id}`, { headers })).status());
        await api.dispose();
      }
   });
}
