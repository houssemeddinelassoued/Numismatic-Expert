#!/usr/bin/env node
/* Cabinet Numismatique: Numista API sync (personal project, Numista API licence 8.4).
 *
 *   node tools/numista_sync.js pull  --cache DIR --key FILE
 *       Fetches your Numista collection (2 API requests) into DIR/collection.json.
 *   node tools/numista_sync.js sync  --cache DIR --key FILE --db DIR --out DIR [--prices N] [--currency TND]
 *       Merges DIR/collection.json into the exported chunks (--db, files c001.json...),
 *       optionally fetches Numista price estimates per grade for the N most valuable items (N requests),
 *       and writes the changed chunks plus report.json into --out.
 *   node tools/numista_sync.js push  --cache DIR --key FILE --db DIR [--apply]
 *       Lists the fields edited in the Cabinet that differ from Numista; --apply sends them (PATCH).
 *
 * The API key is read from --key and never written elsewhere. Tokens and API data stay in --cache.
 */
"use strict";
const fs = require("fs"), path = require("path");
const L = require(path.join(__dirname, "..", "cn-logic.js"));
const API = "https://api.numista.com/v3";
const CAP = 120;
const cmd = process.argv[2];
const args = {}; for (let i = 3; i < process.argv.length; i++) { const a = process.argv[i]; if (a.startsWith("--")) { const nx = process.argv[i + 1]; args[a.slice(2)] = nx && !nx.startsWith("--") ? (i++, nx) : true; } }
const readJSON = (p, d) => { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch (e) { return d; } };
const writeJSON = (p, o) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, JSON.stringify(o)); };
const key = () => fs.readFileSync(args.key, "utf8").trim();
let calls = 0;

async function call(p, params, opts = {}) {
  const url = API + p + (params ? "?" + new URLSearchParams(params) : "");
  const headers = { "Numista-API-Key": key(), "User-Agent": "CabinetNumismatique/1.0 (personal project)" };
  if (opts.token) headers.Authorization = "Bearer " + opts.token;
  if (opts.body) headers["Content-Type"] = "application/json";
  for (let attempt = 0; attempt < 4; attempt++) {
    calls++;
    const r = await fetch(url, { method: opts.method || "GET", headers, body: opts.body ? JSON.stringify(opts.body) : undefined });
    const text = await r.text();
    if (r.status === 429 && attempt < 3) { await new Promise((s) => setTimeout(s, 8000 * (attempt + 1))); continue; }
    if (!r.ok) { const e = new Error(`HTTP ${r.status} ${opts.method || "GET"} ${p}: ${text.slice(0, 160)}`); e.status = r.status; throw e; }
    return text ? JSON.parse(text) : null;
  }
}
async function token(scope) {
  const p = path.join(args.cache, "token.json"); const t = readJSON(p, null);
  if (t && t.scope === scope && t.exp > Date.now() + 86400000) return t;
  const r = await call("/oauth_token", { grant_type: "client_credentials", scope });
  const out = { access_token: r.access_token, user_id: r.user_id, scope, exp: Date.now() + r.expires_in * 1000 };
  writeJSON(p, out); return out;
}

/* ---------- local data ---------- */
const DEFAULTS = { id: "", iso: "", kind: "coin", st: "col", country: "", issuer: "", ruler: "", cur: "", face: "", ref: "", n: "", title: "", ntype: "", yrange: "", comp: "", weight: "", year: "", gyear: "", refs: "", comment: "", qty: 1, exch: false, grade: "", coll: "", set: "", buy: null, est: null, pcom: "", pubcom: "", store: "", place: "", adate: "", serial: "", links: [], imgs: [], ap: null, nkey: "", src: "manual", nid: "", nissue: "", npics: [], np: null, mintage: null, cms: 0, ums: 0 };
const norm = (it) => { const o = {}; for (const [k, d] of Object.entries(DEFAULTS)) o[k] = it[k] === undefined ? (Array.isArray(d) ? [] : d) : it[k]; return o; };
function loadDb(dir) {
  const chunks = new Map();
  for (const f of fs.readdirSync(dir).filter((x) => /^c\d+\.json$/.test(x)).sort()) { const o = readJSON(path.join(dir, f)); chunks.set(path.basename(f, ".json"), Object.assign({}, (o.data || o).items || {})); }
  return chunks;
}
const kindOf = (cat) => (cat === "banknote" ? "note" : cat === "exonumia" ? "other" : "coin");
function apiFields(a, numcur) {
  const iss = a.issue || {}, price = a.price || {};
  const f = {
    nid: String(a.id), n: String((a.type || {}).id || ""), nissue: iss.id != null ? String(iss.id) : "",
    qty: a.quantity || 1, exch: !!a.for_swap, grade: L.normGrade(a.grade || ""),
    pcom: a.private_comment || "", pubcom: a.public_comment || "", store: a.storage_location || "",
    place: a.acquisition_place || "", adate: a.acquisition_date || "", serial: a.serial_number || "",
    npics: (a.pictures || []).map((p) => p.url || p.thumbnail_url).filter((u) => u && !/\.pdf(\?|$)/i.test(u)).slice(0, 4),
  };
  if (price.value != null && (!price.currency || price.currency === numcur)) f.buy = Number(price.value);
  if (iss.year != null) f.year = String(iss.year);
  if (iss.gregorian_year != null) f.gyear = String(iss.gregorian_year);
  if (iss.mintage != null && isFinite(+iss.mintage)) f.mintage = +iss.mintage;
  return f;
}
function score(loc, f) {
  if (loc.nid && loc.nid === f.nid) return 1000;
  let s = 0;
  if (f.adate && loc.adate === f.adate) s += 5;
  if (f.place && loc.place === f.place) s += 4;
  if ((f.gyear && loc.gyear === f.gyear) || (f.year && loc.year === f.year)) s += 3;
  if (f.serial && loc.serial === f.serial) s += 3;
  if (f.grade && loc.grade === f.grade) s += 2;
  if (f.buy != null && loc.buy != null && Math.abs(f.buy - loc.buy) < 0.005) s += 2;
  if ((loc.qty || 1) === f.qty) s += 1;
  if (f.store && loc.store === f.store) s += 1;
  return s;
}
const SYNC_FIELDS = ["nid", "nissue", "qty", "exch", "grade", "pcom", "pubcom", "store", "place", "adate", "serial", "npics", "buy", "year", "gyear", "mintage"];
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

async function pull() {
  const t = await token("view_collection");
  const data = await call(`/users/${t.user_id}/collected_items`, { lang: "en" }, { token: t.access_token });
  writeJSON(path.join(args.cache, "collection.json"), Object.assign({ fetchedAt: new Date().toISOString(), user_id: t.user_id }, data));
  const items = data.items || [];
  console.log(`user ${t.user_id}: ${items.length} items (response keys: ${Object.keys(data).join(", ")}); API calls: ${calls}`);
  console.log("item keys:", items[0] ? Object.keys(items[0]).join(", ") : "-");
  console.log("issue keys:", items[0] && items[0].issue ? Object.keys(items[0].issue).join(", ") : "-");
  console.log("pictures attached:", items.reduce((a, it) => a + (it.pictures || []).length, 0), "on", items.filter((it) => (it.pictures || []).length).length, "items");
}

async function sync() {
  const col = readJSON(path.join(args.cache, "collection.json"));
  if (!col) throw new Error("run pull first");
  const numcur = args.currency || "TND"; const now = Date.now();
  const chunks = loadDb(args.db); const changed = new Set();
  const all = new Map(), loc = new Map();
  for (const [cid, its] of chunks) for (const [id, it] of Object.entries(its)) { all.set(id, it); loc.set(id, cid); }
  const byN = new Map(); for (const it of all.values()) if (it.n) (byN.get(it.n) || byN.set(it.n, []).get(it.n)).push(it);
  const apiByN = new Map(); for (const a of col.items || []) { const f = apiFields(a, numcur); (apiByN.get(f.n) || apiByN.set(f.n, []).get(f.n)).push({ a, f }); }
  const rep = { matched: 0, updated: 0, fieldChanges: {}, created: [], notInNumista: [], pictures: 0, prices: 0, apiCalls: 0 };
  const put = (it) => { const cid = loc.get(it.id); chunks.get(cid)[it.id] = it; changed.add(cid); };
  for (const [n, apis] of apiByN) {
    const locals = byN.get(n) || [];
    const pairs = [];
    for (const x of apis) for (const l of locals) { const s = score(l, x.f); if (s >= 6 || (apis.length === 1 && locals.length === 1)) pairs.push([s, x, l]); }
    pairs.sort((p, q) => q[0] - p[0]);
    const usedA = new Set(), usedL = new Set();
    const apply = (x, l) => {
      usedA.add(x); usedL.add(l); rep.matched++;
      const it = norm(l); let diff = false;
      for (const k of SYNC_FIELDS) if (x.f[k] !== undefined && !same(it[k], x.f[k])) { it[k] = x.f[k]; diff = true; rep.fieldChanges[k] = (rep.fieldChanges[k] || 0) + 1; }
      all.set(it.id, it);
      if (diff) { it.ums = now; put(it); rep.updated++; }
      rep.pictures += x.f.npics.length;
    };
    for (const [, x, l] of pairs) if (!usedA.has(x) && !usedL.has(l)) apply(x, l);
    /* second pass: leftovers of the same type were edited on one side; pair them by best remaining score */
    const rest = [];
    for (const x of apis) if (!usedA.has(x)) for (const l of locals) if (!usedL.has(l)) rest.push([score(l, x.f), x, l]);
    rest.sort((p, q) => q[0] - p[0]);
    for (const [, x, l] of rest) if (!usedA.has(x) && !usedL.has(l)) { apply(x, l); rep.secondPass = (rep.secondPass || 0) + 1; }
    for (const x of apis) if (!usedA.has(x)) {
      const t = x.a.type || {}; const issuer = (t.issuer && (t.issuer.name || t.issuer.code)) || "";
      const kind = kindOf(t.category); const iso = L.isoOf(issuer) || L.fallbackIso(issuer);
      const it = norm(Object.assign({ iso, kind, st: "col", country: issuer, issuer, title: t.title || "", src: "numista", cms: now, ums: now }, x.f));
      it.id = L.uniqueId(L.makeBaseId({ iso, kind, ref: "", refs: "", n, gyear: it.gyear }), kind, it.gyear, (z) => all.has(z));
      let cid = [...chunks.keys()].find((c) => Object.keys(chunks.get(c)).length < CAP);
      if (!cid) { cid = "c" + String(Math.max(0, ...[...chunks.keys()].map((c) => +c.slice(1))) + 1).padStart(3, "0"); chunks.set(cid, {}); }
      all.set(it.id, it); loc.set(it.id, cid); put(it); rep.created.push(it.id + " " + it.title);
    }
  }
  const apiNids = new Set((col.items || []).map((a) => String(a.id)));
  for (const it of all.values()) if (it.src === "numista" && !(it.nid && apiNids.has(it.nid)) && !rep.created.includes(it.id)) rep.notInNumista.push(it.id + " " + it.title);

  const topN = +args.prices || 0;
  if (topN) {
    const val = (it) => Math.max(it.est || 0, it.buy || 0, it.ap ? ((it.ap.lo + it.ap.hi) / 2) * 2.92 : 0);
    const seen = new Set(); const todo = [];
    for (const it of [...all.values()].filter((x) => x.n && x.nissue).sort((a, b) => val(b) - val(a))) {
      const k = it.n + "/" + it.nissue; if (seen.has(k)) continue; seen.add(k);
      const cached = readJSON(path.join(args.cache, "prices", it.n + "-" + it.nissue + ".json"), null);
      if (cached && cached.currency === numcur && Date.now() - cached.ms < 30 * 864e5) { todo.push([k, cached]); continue; }
      if (todo.filter((x) => !x[1]).length >= topN) continue;
      todo.push([k, null]);
    }
    for (const entry of todo) {
      if (entry[1]) continue;
      const [n, issue] = entry[0].split("/");
      try {
        const r = await call(`/types/${n}/issues/${issue}/prices`, { currency: numcur });
        entry[1] = { currency: r.currency || numcur, ms: Date.now(), prices: r.prices || [] };
        writeJSON(path.join(args.cache, "prices", n + "-" + issue + ".json"), entry[1]);
      } catch (e) { if (e.status === 429) { console.log("quota or rate limit reached: stopping price requests"); break; } }
    }
    const byKey = new Map(todo.filter((x) => x[1]).map((x) => [x[0], x[1]]));
    for (const it of all.values()) {
      const pr = byKey.get(it.n + "/" + it.nissue); if (!pr) continue;
      const p = {}; for (const x of pr.prices) { const g = L.normGrade(x.grade); if (g && typeof x.price === "number") p[g] = x.price; }
      const np = { cur: pr.currency, ms: pr.ms, p };
      if (!same(it.np, np)) { const n2 = norm(it); n2.np = np; n2.ums = now; put(n2); all.set(it.id, n2); rep.prices++; }
    }
  }
  rep.apiCalls = calls;
  fs.mkdirSync(args.out, { recursive: true });
  for (const cid of [...changed].sort()) writeJSON(path.join(args.out, cid + ".json"), { items: chunks.get(cid) });
  const sizes = [...changed].map((c) => Buffer.byteLength(JSON.stringify({ items: chunks.get(c) })));
  writeJSON(path.join(args.out, "report.json"), Object.assign(rep, { changedChunks: [...changed].sort(), maxChunkBytes: Math.max(0, ...sizes) }));
  console.log(JSON.stringify(Object.assign({}, rep, { created: rep.created.length, notInNumista: rep.notInNumista.length, createdSample: rep.created.slice(0, 5), notInNumistaSample: rep.notInNumista.slice(0, 5) }), null, 1));
}

async function push() {
  const col = readJSON(path.join(args.cache, "collection.json"));
  const chunks = loadDb(args.db); const byNid = new Map((col.items || []).map((a) => [String(a.id), apiFields(a, args.currency || "TND")]));
  const FIELDS = { qty: "quantity", exch: "for_swap", grade: "grade", pcom: "private_comment", pubcom: "public_comment", store: "storage_location", place: "acquisition_place", adate: "acquisition_date", serial: "serial_number" };
  const todo = [];
  for (const its of chunks.values()) for (const it of Object.values(its)) {
    const f = it.nid && byNid.get(it.nid); if (!f) continue;
    const body = {};
    for (const [k, apiK] of Object.entries(FIELDS)) if (it[k] !== undefined && !same(it[k], f[k])) body[apiK] = k === "grade" ? String(it[k]).toLowerCase() : it[k];
    if (Object.keys(body).length) todo.push([it.id, it.nid, body]);
  }
  console.log(todo.length + " items differ from Numista:"); for (const x of todo.slice(0, 30)) console.log("  " + x[0] + " → " + JSON.stringify(x[2]));
  if (!args.apply || !todo.length) return;
  const t = await token("view_collection,edit_collection");
  for (const [id, nid, body] of todo) { await call(`/users/${t.user_id}/collected_items/${nid}`, null, { token: t.access_token, method: "PATCH", body }); console.log("  updated " + id); }
}

({ pull, sync, push }[cmd] || (() => { console.log("usage: pull | sync | push (see header)"); }))().catch((e) => { console.error(e.message); process.exit(1); });
