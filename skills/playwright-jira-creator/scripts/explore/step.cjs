// Runs one exploration step against the Chrome started by browser.cjs.
//   node .claude/skills/playwright-jira-creator/scripts/explore/step.cjs <step.js>
// The step file is the body of an async function with these in scope:
//   page  - the most recently opened tab (a new tab is opened if none exist)
//   ctx   - the browser context (ctx.pages(), ctx.waitForEvent('page'), ...)
//   env   - process.env with the repo .env loaded (BASE_URL, ADMIN_*, <ENV>_*)
//   dump  - async (p, name) => writes <name>.png / <name>.txt (visible text + data-testids) next to the step file
// Keep steps small and print what you need with console.log. Never print password fields.
const path = require('path');
const fs = require('fs');
const repo = path.resolve(__dirname, '../../../../..');
const { chromium } = require(path.join(repo, 'node_modules/playwright'));
require(path.join(repo, 'node_modules/dotenv')).config({ path: path.join(repo, '.env'), quiet: true });

(async () => {
  const stepFile = path.resolve(process.argv[2]);
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9333');
  const ctx = browser.contexts()[0];
  let pages = ctx.pages();
  const page = pages.length ? pages[pages.length - 1] : await ctx.newPage();
  page.setDefaultTimeout(30000);
  const outDir = path.dirname(stepFile);
  const dump = async (p, name) => {
    await p.screenshot({ path: path.join(outDir, name + '.png') });
    const ids = await p.locator('[data-testid]').evaluateAll(e => e.filter(x => x.offsetParent).map(x => x.getAttribute('data-testid')));
    fs.writeFileSync(path.join(outDir, name + '.txt'), (await p.locator('body').innerText()) + '\n\nTESTIDS:\n' + [...new Set(ids)].join('\n'));
  };
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  const fn = new AsyncFunction('page', 'ctx', 'env', 'dump', fs.readFileSync(stepFile, 'utf8'));
  try {
    await fn(page, ctx, process.env, dump);
  } catch (e) {
    console.log('STEP ERROR: ' + e.message.split('\n').slice(0, 8).join('\n'));
  }
  console.log('URL: ' + page.url());
  process.exit(0);
})().catch(e => { console.log('CONNECT ERROR (is browser.cjs running?): ' + e.message); process.exit(1); });
