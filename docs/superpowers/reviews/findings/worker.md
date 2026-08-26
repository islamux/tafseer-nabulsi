# Worker API Review Findings (WRK)

Scope: `workers/tafsir-api/` — `src/index.js` (122 LOC), `src/schema.sql`, `wrangler.jsonc`. Read-only review; client contract cross-checked against `web/src/api/worker.js`.

## Findings

### WRK-001 | High | security | M
- **Location:** `workers/tafsir-api/src/index.js:57-63`
- **Evidence:**
```js
const deviceId = url.searchParams.get('device_id')
if (!deviceId) return error('device_id required', 400, cors)
const { results } = await env.DB.prepare(
  'SELECT surah_id, ayah_number, created_at FROM bookmarks WHERE device_id = ? ORDER BY surah_id, ayah_number'
).bind(deviceId).all()
```
- **Why it matters:** There is no authentication or authorization on any endpoint; the client-supplied `device_id` is the only identity and acts as an all-powerful bearer credential. Anyone who learns or leaks a victim's device ID can read their full bookmarks/progress (`GET`), insert rows into their account (`POST`/`PUT`), or silently delete them (`DELETE`) — writes at index.js:73-75, 86-88, 108-113 bind attacker-chosen `device_id` with zero verification. Worse, the ID is passed in URL query strings (index.js:58, 93) where it lands in access logs, proxies, and history, making "secret" capture routine. The origin allowlist provides no protection since CORS is browser-enforced only.
- **Suggested fix:** Treat device IDs as secrets and add real auth: issue a signed token per device (HMAC of `device_id` with a Worker secret via `crypto.subtle`, verified timing-safely), send it in a header instead of query params, and derive row ownership from the verified token server-side. At minimum, move IDs to headers and document the spoofing threat model.
- **Verified:** yes — re-read of `src/index.js:44-122` and `wrangler.jsonc` confirms no auth/signature check exists anywhere; all five handlers trust raw client-supplied `device_id`.

### WRK-002 | Medium | security | S
- **Location:** `workers/tafsir-api/src/index.js:118-120`
- **Evidence:**
```js
    } catch (err) {
      return json({ error: err.message }, 500, cors)
    }
```
- **Why it matters:** Raw internal exception messages are returned to clients. D1/bind errors expose table names, column constraints, binding type mismatches (e.g. binding an object for `device_id`, see WRK-003), aiding probing of the schema.
- **Suggested fix:** Log `err.message` + stack server-side (structured JSON log / observability), return a generic `{ error: 'internal error' }` with 500.

### WRK-003 | Medium | bugs | S
- **Location:** `workers/tafsir-api/src/index.js:70`
- **Evidence:**
```js
if (!device_id || !isValidSurah(surah_id) || !isValidAyah(ayah_number)) {
```
- **Why it matters:** `device_id` is only falsy-checked (same pattern at lines 59, 83, 94, 105): no `typeof === 'string'`, no length bound. A JSON body like `{device_id: {}}` passes validation and then throws inside D1 `.bind()`, producing a 500 that leaks the raw driver error (compounding WRK-002); multi-kilobyte strings are accepted as IDs, allowing unbounded row bloat. `surah_id`/`ayah_number` are properly integer-checked, so only the ID field is the gap.
- **Suggested fix:** Validate `typeof device_id === 'string' && device_id.length >= 8 && device_id.length <= 128` in a shared helper used by all five handlers.

### WRK-004 | Medium | security | M
- **Location:** `workers/tafsir-api/src/index.js:66-77`
- **Evidence:**
```js
await env.DB.prepare(
  'INSERT OR IGNORE INTO bookmarks (device_id, surah_id, ayah_number) VALUES (?, ?, ?)'
).bind(device_id, surah_id, ayah_number).run()
return json({ ok: true }, 201, cors)
```
- **Why it matters:** No rate limiting anywhere. Combined with unbounded `ayah_number` values (WRK-005) each anonymous caller can flood D1 with rows (unique `(device_id, surah_id, ayah_number)` triplets are effectively unlimited), then amplify cost via unpaginated `GET` reads (index.js:60-62). On a free-tier D1 database this is a cheap denial-of-storage/service attack against the project's quota.
- **Suggested fix:** Add per-IP/per-device limits (e.g. Workers Rate Limiting binding or Turnstile on writes), plus sane per-device row caps enforced before insert.

### WRK-005 | Low | bugs | S
- **Location:** `workers/tafsir-api/src/index.js:40-42`
- **Evidence:**
```js
function isValidAyah(n) {
  return Number.isInteger(n) && n > 0
}
```
- **Why it matters:** No upper bound, so `ayah_number: 9007199254740991` is stored happily (schema CHECK at `schema.sql:4,14` only requires `> 0`). Progress/bookmark data becomes semantically garbage and inflates GET payloads. Consistent with schema, so not a mismatch bug — a domain-validation gap.
- **Suggested fix:** Bound by max surah length (286) or per-surah ayah counts table; mirror the same CHECK in `schema.sql`.

### WRK-006 | Low | bugs | S
- **Location:** `workers/tafsir-api/src/index.js:76`
- **Evidence:**
```js
return json({ ok: true }, 201, cors)
```
- **Why it matters:** `POST` always answers `201 Created` even when `INSERT OR IGNORE` ignored a duplicate (nothing was created); symmetrically `DELETE` (lines 86-89) returns `{ok:true}` even when zero rows matched. Clients can't distinguish "created/deleted" from "already existed/no-op", masking sync drift between localStorage and D1.
- **Suggested fix:** Inspect `result.meta.changes` from `.run()` and return 200 vs 201 (and optionally `created: false`), or 404 on delete of nonexistent rows.

### WRK-007 | Low | bugs | S
- **Location:** `workers/tafsir-api/src/index.js:117`
- **Evidence:**
```js
return error('not found', 404, cors)
```
- **Why it matters:** Known paths hit with unsupported methods (e.g. `PUT /api/bookmarks`, `DELETE /api/progress`) fall through to the catch-all and return 404 Not Found instead of 405 Method Not Allowed with an `Allow` header — incorrect status codes mislead API consumers and debuggers.
- **Suggested fix:** Match routes by path first, then method; return 405 + `Allow` listing supported methods when the path exists but the method doesn't.

### WRK-008 | Medium | solid/clean-code | S
- **Location:** `workers/tafsir-api/src/index.js:57`
- **Evidence:**
```js
if (path === '/api/bookmarks' && request.method === 'GET') {
```
- **Why it matters:** Five near-identical `path === '...' && request.method === '...'` magic-string branches (lines 57, 66, 79, 92, 101), each repeating the same validate → prepare → bind → run → json sequence and the same `device_id` extraction/error strings. Adding one endpoint or renaming a route means touching many copy-pasted blocks; divergence risk (e.g. one handler forgetting a validation) grows with each.
- **Suggested fix:** Replace with a declarative route table (`{ method, pattern, handler }` array) plus shared helpers: `getDeviceId(request|url)`, `validateBookmark(body)`; handlers reduce to a few lines each.

### WRK-009 | Low | security | S
- **Location:** `workers/tafsir-api/src/index.js:8`
- **Evidence:**
```js
const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
```
- **Why it matters:** For disallowed origins the ACAO header is still emitted — pinned to `https://islamux.github.io` — rather than omitted, so misconfigurations look identical to success in curl/browser devtools. Responses also lack `Vary: Origin` even though headers vary by request Origin; harmless today (no caching layer in the Worker) but a cache-poisoning hazard if response caching is ever added.
- **Suggested fix:** Return headers without `Access-Control-Allow-Origin` when origin isn't allowlisted, and add `'Vary': 'Origin'` to all responses.

### WRK-010 | Low | improvements | S
- **Location:** `workers/tafsir-api/wrangler.jsonc:1-13`
- **Evidence:**
```jsonc
{
  "$schema": "...",
  "name": "tafsir-api",
  "main": "src/index.js",
  "compatibility_date": "2025-07-01",
  "d1_databases": [ ... ]
}
```
- **Why it matters:** No `observability` block and no structured logging anywhere in the handler — production errors are invisible except via the leaked 500 bodies (WRK-002). Cloudflare recommends enabling observability with a head sampling rate; there is also no way to count usage/abuse (ties into WRK-004).
- **Suggested fix:** Add `"observability": { "enabled": true, "head_sampling_rate": 1 }` to wrangler.jsonc and `console.log` structured JSON lines for request start/end and caught errors.

### WRK-011 | Low | improvements | S
- **Location:** `workers/tafsir-api/wrangler.jsonc:5`
- **Evidence:**
```jsonc
"compatibility_date": "2025-07-01",
```
- **Why it matters:** Compatibility date is ~14 months old relative to today (2026-08); new Workers features/bugfixes gated behind newer dates stay disabled, and the gap grows each release. Also `"database_id": ""` (line 10) is an empty placeholder — deploys fail until manually edited locally, inviting accidental commits of environment-specific values.
- **Suggested fix:** Bump `compatibility_date` to current on each periodic maintenance pass; keep `database_id` out of the committed config (e.g. `[env.production]` or documented local override).

### WRK-012 | Low | improvements | M
- **Location:** `workers/tafsir-api/src/index.js:60-62`
- **Evidence:**
```js
'SELECT surah_id, ayah_number, created_at FROM bookmarks WHERE device_id = ? ORDER BY surah_id, ayah_number'
```
- **Why it matters:** Both list endpoints (bookmarks here; progress at lines 95-97) return unbounded result sets with no pagination. Normal users have hundreds of rows, but abuse (WRK-004) or long-tail accumulation makes responses arbitrarily large — memory and egress grow without limit.
- **Suggested fix:** Support `?limit=` (default 500, max 1000) + cursor/offset pagination with a `next` token in the response.

### WRK-013 | Low | improvements | M
- **Location:** `workers/tafsir-api/src/index.js:66-77`
- **Evidence:**
```js
if (path === '/api/bookmarks' && request.method === 'POST') {
```
- **Why it matters:** Sync is strictly one-row-per-request; the client issues individual POST/DELETE calls per toggle (`web/src/api/worker.js:42-54`). Restoring favorites after switching devices, or first-time upload of a large local set, serializes into dozens of network round trips through a single Worker handler.
- **Suggested fix:** Add a batch endpoint (e.g. `POST /api/bookmarks/sync` accepting `{device_id, add: [...], remove: [...]}`) executed as one D1 batch (`env.DB.batch`).

## Checked and clean

- SQL injection: every query uses `?` placeholders with `.bind()` (index.js:60-62, 73-75, 86-88, 95-97, 108-113); no string interpolation of user input.
- Schema/query consistency: all selected/inserted columns exist in `schema.sql`; `ON CONFLICT(device_id, surah_id)` (index.js:111) matches the `PRIMARY KEY (device_id, surah_id)` (schema.sql:16); JS validators match CHECK constraints (except ayah upper bound, WRK-005).
- Upsert races: `INSERT OR IGNORE` and `ON CONFLICT DO UPDATE` are atomic in SQLite/D1; no read-modify-write races.
- Promises: all awaits are inside try/catch; `parseBody` self-catches; no floating promises.
- Trailing-slash paths normalized (index.js:54); DELETE-with-body works on Workers and matches the shipped client (`web/src/api/worker.js:50-53`).
