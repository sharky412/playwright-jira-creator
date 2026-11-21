// EXAMPLE REST helper for finding and deleting test data. Adapt the endpoints to your application's API.
//   node api-cleanup.example.cjs <env> find <kind> <namePrefix>
//   node api-cleanup.example.cjs <env> delete <kind> <id> [<id>...]
// env: default (BASE_URL/ADMIN_*) or <ENV>_BASE_URL/_USERNAME/_PASSWORD from the repo .env
// Only delete IDs that the test or this session created.
const path = require('path');
const repo = path.resolve(__dirname, '../../../..');
require(path.join(repo, 'node_modules/dotenv')).config({ path: path.join(repo, '.env'), quiet: true });
const { request } = require(path.join(repo, 'node_modules/playwright'));

// ---- adapt these to your API ----
const LOGIN = '/api/auth/login';                       // POST { userName, password } -> session header/token
const LOGOUT = '/api/auth/logout';
const SESSION_HEADER = 'x-session';                     // header returned by login and sent on later calls
const ENDPOINTS = { item: '/api/items', folder: '/api/folders' };  // GET ?name=<prefix> lists, DELETE /<id> deletes
// ---------------------------------

const [envName = 'default', cmd, kind, ...args] = process.argv.slice(2);
const pick = (k) => envName === 'default'
  ? process.env[{ BASE_URL: 'BASE_URL', USERNAME: 'ADMIN_USERNAME', PASSWORD: 'ADMIN_PASSWORD' }[k]]
  : process.env[`${envName.toUpperCase()}_${k}`];
const B = pick('BASE_URL'), U = pick('USERNAME'), P = pick('PASSWORD');
if (!B || !U || !P) { console.log(`BLOCKER: missing credentials for ${envName} in .env`); process.exit(1); }

(async () => {
  const c = await request.newContext({ extraHTTPHeaders: { 'Content-Type': 'application/json', Accept: 'application/json' } });
  const l = await c.post(B + LOGIN, { data: { userName: U, password: P } });
  if (!l.ok()) { console.log(`BLOCKER: API login failed for ${envName} (${l.status()})`); process.exit(1); }
  const h = { [SESSION_HEADER]: l.headers()[SESSION_HEADER] };
  try {
    const ep = ENDPOINTS[kind];
    if (!ep) throw new Error(`kind must be one of ${Object.keys(ENDPOINTS).join('|')}`);
    if (cmd === 'find') {
      const r = await c.get(B + ep, { headers: h, params: { name: args[0] } });
      console.log(JSON.stringify(await r.json(), null, 2).slice(0, 4000));
    } else if (cmd === 'delete') {
      for (const id of args) {
        const r = await c.delete(`${B}${ep}/${id}`, { headers: h });
        console.log(`delete ${kind} ${id}: ${r.status()} ${r.ok() ? '' : (await r.text()).slice(0, 200)}`);
      }
    } else {
      console.log('usage: node api-cleanup.example.cjs <env> find <kind> <prefix> | delete <kind> <id...>');
    }
  } finally {
    await c.delete(B + LOGOUT, { headers: h });
  }
})();
