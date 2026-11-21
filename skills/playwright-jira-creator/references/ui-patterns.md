# Proven UI patterns

Fill this in as tests pass: each snippet here should come from a passing test, so later runs reuse it instead of exploring.
Name the specs that contain full flows. Suggested sections:

1. Navigation (console URLs per area, left nav, tours/popups to dismiss)
2. Core objects your bugs touch (create / edit / publish / delete) with their `data-testid` locators
3. Opening customer-facing pages (popups, new tabs) and eventually-consistent checks
4. Admin (users, roles, languages)
5. Cleanup (REST endpoints: login, delete per object type, logout)
6. Gotchas

Example entry:
```ts
await page.getByTestId('button-items-add').click();
await page.getByTestId('text-input-name').fill(name);
await page.getByTestId('button-save').click();
await page.waitForURL(/\/item\/\d+/); const itemId = page.url().match(/\/item\/(\d+)/)![1];
```

## Generic Playwright gotchas

- `strict mode violation`: scope locators (menu items inside their own toggle, dialog-scoped options).
- Hover-only controls (row context menus): hover the row, then `click({ force: true })`.
- "element is not stable" on animated buttons: retry with `toPass` and `force: true`.
- A click that "performs" but nothing opens: retry until the expected element appears (`toPass`).
- Dropdowns that ignore early clicks: wrap open + "option visible" in `expect(async () => {...}).toPass()`.
- Forms that reset fields asynchronously after a change (e.g. language): set that field first, then the rest.
- Virtualised lists: off-screen items are not in the DOM - filter/search first.
- Popups: pair the listener with its trigger - `const [popup] = await Promise.all([page.waitForEvent('popup'), button.click()])` -
  otherwise a rejected wait can skip `finally` cleanup.
- Chrome PDF viewer replaces the response body - re-fetch the URL with `context.request.get`.
- Minified bundles: plain `grep` may treat them as binary - use `grep -a`.
- Explore steps (step.cjs) cannot `require` - hard-code paths in the step file.
