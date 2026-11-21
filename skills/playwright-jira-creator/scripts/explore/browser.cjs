// Starts a visible Chrome that stays open, with remote debugging on port 9333, so step.cjs can drive it
// one small script at a time while keeping the signed-in session. Run in the background:
//   node .claude/skills/playwright-jira-creator/scripts/explore/browser.cjs [startUrl]
const path = require('path');
const os = require('os');
const repo = path.resolve(__dirname, '../../../../..');
const { chromium } = require(path.join(repo, 'node_modules/playwright'));

(async () => {
  const profile = path.join(os.tmpdir(), 'playwright-jira-creator-profile');
  const ctx = await chromium.launchPersistentContext(profile, {
    headless: false,
    viewport: { width: 1600, height: 950 },
    args: ['--remote-debugging-port=9333'],
  });
  const page = ctx.pages()[0] || await ctx.newPage();
  if (process.argv[2]) await page.goto(process.argv[2]);
  console.log('READY - debugging on http://127.0.0.1:9333, profile ' + profile);
  await new Promise(() => {});
})();
