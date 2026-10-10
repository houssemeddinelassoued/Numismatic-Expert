/* End-to-end test of the Cabinet page in jsdom with a mocked claude.ai runtime.
   Usage: npm install, then  node tests/e2e.js <your Numista export.csv>
   The assertions name items of the owner's collection (AF-P60b, TN-KM104-1851...), so run it on that export. */
const fs = require("fs"), path = require("path");
const { JSDOM, VirtualConsole } = require("jsdom");
const APP = path.join(__dirname, ".."), CSV = process.argv[2] || process.env.NUMISTA_CSV;
if (!CSV || !fs.existsSync(CSV)) { console.error("usage: node tests/e2e.js <Numista export.csv>"); process.exit(2); }
const errors = [], logs = [];
const vc = new VirtualConsole();
vc.on("jsdomError", (e) => { if (!/Not implemented/.test(e.message)) errors.push("jsdomError: " + e.message); });
vc.on("error", (...a) => errors.push("console.error: " + a.map(String).join(" ")));
vc.on("warn", (...a) => logs.push("warn: " + a.map(String).join(" ")));
const html = fs.readFileSync(path.join(APP, "cabinet-numismatique.html"), "utf8").replace(/<script src="[^"]+"><\/script>/g, "");
const dom = new JSDOM("<!doctype html><html><head></head><body>" + html + "</body></html>", { url: "https://claude.ai/artifact/test", pretendToBeVisual: true, virtualConsole: vc, runScripts: "outside-only" });
const w = dom.window;
w.TextEncoder = TextEncoder; w.TextDecoder = TextDecoder; w.scrollTo = () => {};
w.IntersectionObserver = class { observe() {} disconnect() {} };
const NPH_FILE = path.join(APP, "numista-photos/index.json");
const NPH = fs.existsSync(NPH_FILE) ? JSON.parse(fs.readFileSync(NPH_FILE, "utf8")) : { cols: 8, rows: 8, series: {}, t: {} };
const WORLD = JSON.parse(fs.readFileSync(path.join(APP, "data/world.json"), "utf8"));
w.fetch = async (u) => (String(u).startsWith("numista-photos/index.json") ? { ok: true, json: async () => NPH } : String(u).startsWith("data/world.json") ? { ok: true, json: async () => WORLD } : { ok: false, status: 404 });
w.matchMedia = () => ({ matches: false, addEventListener() {} });
w.HTMLCanvasElement.prototype.getContext = () => ({ fillRect() {}, fillStyle: "" });
w.HTMLCanvasElement.prototype.toDataURL = () => "data:image/png;base64,AA==";
w.jspdf = { jsPDF: class { addPage() {} addImage() {} setFont() {} setFontSize() {} setTextColor() {} text() {} splitTextToSize(t) { return [String(t)]; } output() { return new w.Blob(["%PDF-mock"], { type: "application/pdf" }); } } };
w.qrcode = () => ({ addData() {}, make() {}, getModuleCount: () => 21, isDark: (r, c) => (r + c) % 2 === 0 });
w.URL.createObjectURL = () => "blob:fake"; w.URL.revokeObjectURL = () => {};
w.addEventListener("error", (e) => errors.push("window.error: " + (e.error && e.error.stack || e.message)));
const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms));

/* ---- mock db ---- */
function makeDb() {
  const docs = new Map(); const listeners = []; let writes = 0;
  const clone = (x) => JSON.parse(JSON.stringify(x));
  const merge = (t, s) => { for (const [k, v] of Object.entries(s)) { if (v && typeof v === "object" && !Array.isArray(v) && t[k] && typeof t[k] === "object" && !Array.isArray(t[k])) merge(t[k], v); else t[k] = clone(v); } return t; };
  const colOf = (p) => p.split("/").slice(0, -1).join("/");
  const size = (d) => Buffer.byteLength(JSON.stringify(d));
  const notify = () => setTimeout(() => listeners.slice().forEach((l) => l()), 0);
  const snap = (p) => { const d = docs.get(p); return { id: p.split("/").pop(), exists: !!d, data: () => (d ? clone(d) : undefined), metadata: { fromCache: false, hasPendingWrites: false } }; };
  function query(cp, filters = [], order = null, lim = null) {
    const run = () => { let l = [...docs.keys()].filter((p) => colOf(p) === cp).map(snap);
      for (const [f, op, v] of filters) l = l.filter((s) => (op === "==" ? s.data()[f] === v : true));
      if (order) l.sort((a, b) => { const x = a.data()[order[0]], y = b.data()[order[0]]; return (x > y ? 1 : x < y ? -1 : 0) * (order[1] === "desc" ? -1 : 1); });
      if (lim) l = l.slice(0, lim); return { docs: l, size: l.length, empty: !l.length, docChanges: () => [], metadata: {} }; };
    return { where: (f, o, v) => query(cp, [...filters, [f, o, v]], order, lim), orderBy: (f, d = "asc") => query(cp, filters, [f, d], lim), limit: (n) => query(cp, filters, order, n),
      get: async () => run(), onSnapshot: (fn) => { const l = () => fn(run()); listeners.push(l); setTimeout(l, 0); return () => listeners.splice(listeners.indexOf(l), 1); },
      doc: (id) => ref(cp + "/" + (id || Math.random().toString(36).slice(2, 14))) };
  }
  function ref(p) {
    if (p.split("/").length % 2) throw new TypeError("doc path parity " + p);
    return { id: p.split("/").pop(), path: p, get: async () => snap(p),
      set: async (d) => { if (size(d) > 262144) throw { code: "invalid_argument", message: "too big " + size(d) }; writes++; docs.set(p, clone(d)); notify(); },
      update: async (d) => { if (!docs.has(p)) throw { code: "invalid_argument" }; const n = merge(clone(docs.get(p)), d); if (size(n) > 262144) throw { code: "invalid_argument" }; writes++; docs.set(p, n); notify(); },
      delete: async () => { docs.delete(p); notify(); }, collection: (s) => query(p + "/" + s) };
  }
  return { doc: ref, collection: (p) => query(p), _docs: docs, _writes: () => writes };
}
const db = makeDb();
/* previous version's private data, to test migration */
db._docs.set("data/users/u_me/cabinet/appraisals/old1", { createdMs: 1760000000000, form: { type: "coin", country: "Tunisie", year: "1891", denom: "5 centimes", grade: "VF-20", probes: [], notes: "" }, result: { title: { fr: "Tunisie · 5 centimes 1891", en: "Tunisia · 5 centimes 1891", ar: "تونس · 5 سنتيم 1891" }, grade: "VF-20", confidence: "medium", value: { low: 10, high: 15, currency: "USD" }, ladder: [{ grade: "F-12", low: 6, high: 8 }, { grade: "VF-20", low: 10, high: 15 }, { grade: "MS-63", low: 40, high: 60 }, { grade: "MS-65", low: 80, high: 120 }], specs: [], summary: { fr: "Résumé", en: "Summary", ar: "ملخص" }, factors: { fr: ["a"], en: ["a"], ar: ["a"] }, history: { fr: "h", en: "h", ar: "h" }, specifics: null, advice: { fr: [], en: [], ar: [] }, questions: { fr: [], en: [], ar: [] } }, thumbs: [] });
const downloads = []; const prompts = []; let assetN = 0;
const RES = {
  afgh: { title: "Afghanistan · 500 Afghanis 1990 (P# 60b)", kind: "note", iso2: "AF", country: "Afghanistan", refs: { km: "", pick: "P# 60b", numista: "N# 202088", other: "" }, year: "1990", grade: "UNC", confidence: "medium", value: { low: 1, high: 2.5, currency: "USD" }, ladder: [{ grade: "VF", low: 0.3, high: 0.6 }, { grade: "XF", low: 0.5, high: 1 }, { grade: "UNC", low: 1, high: 2.5 }], specs: [{ label: "Imprimeur", value: "Goznak" }], summary: "Billet courant.", sources: [{ name: "Numista", ref: "N# 202088", says: "UNC ≈ 1 USD" }, { name: "Pick SCWPM", ref: "P# 60b", says: "Variété 1990" }], factors: ["Tirage énorme"], history: "Histoire.", specifics: "Variétés UV.", advice: ["Conserver à plat"], questions: ["Combien de plis ?"] },
  tn: { title: "Tunisie · 6½ Nasri 1851", kind: "coin", iso2: "TN", country: "Tunisia", refs: { km: "KM# 104", pick: "", numista: "", other: "" }, year: "1851", grade: "VF", confidence: "high", value: { low: 20, high: 30, currency: "USD" }, ladder: [{ grade: "F", low: 12, high: 18 }, { grade: "VF", low: 20, high: 30 }, { grade: "XF", low: 35, high: 50 }, { grade: "UNC", low: 90, high: 140 }], specs: [], summary: "Bronze beylical.", sources: [{ name: "Lecompte", ref: "", says: "Courant" }], factors: [], history: "", specifics: "", advice: [], questions: [] },
  us: { title: "États-Unis · 1 cent 1909-S VDB", kind: "coin", iso2: "US", country: "United States", refs: { km: "KM# 132", pick: "", numista: "", other: "" }, year: "1909", grade: "VF", confidence: "medium", value: { low: 1150, high: 1400, currency: "USD" }, ladder: [{ grade: "VF", low: 1150, high: 1400 }], specs: [], summary: "Date clé.", sources: [], factors: [], history: "", specifics: "", advice: [], questions: [] },
};
let next = "afgh";
const sample = async () => ({ text: "x", truncated: false });
sample.json = async (input, opts) => {
  prompts.push(input); if (opts && opts.onText) opts.onText({ text: "{...}", delta: "{...}" }); await tick(5);
  if (/^Translate/.test(input)) { const src = JSON.parse(input.slice(input.indexOf("{"))); return Object.assign({}, src, { summary: "[EN] " + src.summary, title: "[EN] " + src.title }); }
  return JSON.parse(JSON.stringify(RES[next]));
};
sample.limits = async () => ({ maxPromptBytes: 262144, images: { maxCount: 5, maxInputBytes: 2e7, mediaTypes: ["image/jpeg", "image/png"] } });
w.claude = { use: async (n) => ({
  db, user: { isOwner: async () => true, id: async () => "u_me", canEdit: async () => true, can: async () => true },
  assets: { upload: async (b) => { assetN++; const id = String(assetN).padStart(32, "a"); return { id, url: "/_blob/" + id, sizeBytes: b.size, contentType: b.type }; }, list: async () => ({ assets: [], usage: { files: assetN, bytes: 1048576 * assetN, maxFiles: 5000, maxBytes: 1073741824 } }), delete: async () => ({ deleted: true }) },
  downloads: { save: async (r) => { downloads.push(r); return { status: "saved" }; } }, sample }[n] || null) };

(async () => {
  for (const f of ["cn-logic.js", "cn-i18n.js", "cn-i18n-ext.js", "cn-content.js", "cn-core.js", "cn-appraise.js", "cn-collection.js", "cn-io.js", "cn-dash.js", "cn-buy.js", "cn-labels.js", "cn-main.js"]) w.eval(fs.readFileSync(path.join(APP, f), "utf8") + "\n//# sourceURL=" + f);
  await tick(50);
  const CN = w.CN, $ = (s) => w.document.querySelector(s), $$ = (s) => [...w.document.querySelectorAll(s)];
  const ok = (cond, msg) => { console.log((cond ? "PASS " : "FAIL ") + msg); if (!cond) process.exitCode = 1; };
  await CN.runtimePromise; await tick(100);
  ok(CN.tab === "appraise" && !$("#v-appraise").hidden, "boots on the Appraise tab");
  ok(w.document.documentElement.getAttribute("data-ui") === "light", "light theme by default");
  ok($$("#apGrades .gr").map((b) => b.textContent).join(",") === "G,VG,F,VF,XF,AU,UNC,?", "grade bar G→UNC with a single UNC");
  ok($("#sheetPane .recent") && /Tunisi/.test($("#sheetPane .recent").textContent), "idle pane lists recent appraisals (migrated one)");
  ok(CN.state.ready && CN.state.items.size === 1, "migration of previous-version appraisal created 1 item (" + CN.state.items.size + ")");
  const mig = [...CN.state.items.values()][0];
  ok(mig && mig.iso === "TN" && mig.ap && mig.ap.grade === "VF" && mig.st === "study", "migrated item: " + (mig && [mig.id, mig.iso, mig.ap && mig.ap.grade, mig.st].join(" ")));

  /* import */
  CN.go("import");
  const file = new w.File([fs.readFileSync(CSV)], "export.csv", { type: "text/csv" });
  if (!file.arrayBuffer) file.arrayBuffer = async () => fs.readFileSync(CSV).buffer.slice(0);
  const drop = new w.Event("drop", { bubbles: true, cancelable: true }); Object.defineProperty(drop, "dataTransfer", { value: { files: [file] } });
  $("#impDrop").dispatchEvent(drop); await tick(300);
  ok(/2[\s\u202f\u00a0,.]?709/.test($("#impStep").textContent) && /TND/.test($("#impStep").textContent), "parsed summary: " + $("#impStep p").textContent.slice(0, 90));
  ok($$("#impStep .prevw tbody tr").length === 6, "preview shows 6 rows; first ID " + ($("#impStep .prevw td.id") || {}).textContent);
  const t0 = Date.now(); $("#impRun").click();
  for (let i = 0; i < 200 && !CN.imp.done && !/err/.test(($("#impMsg") || {}).className || ""); i++) await tick(50);
  ok(CN.imp.done && CN.imp.done.created === 2709, "import created " + (CN.imp.done && CN.imp.done.created) + " in " + (Date.now() - t0) + " ms; db writes " + db._writes());
  await tick(200);
  const chunks = [...db._docs.keys()].filter((p) => p.startsWith("inv/"));
  ok(CN.state.items.size === 2710, "collection has 2710 items (2709 + migrated)");
  ok(chunks.length >= 23 && chunks.every((p) => Buffer.byteLength(JSON.stringify(db._docs.get(p))) < 200000), chunks.length + " chunks, max " + Math.max(...chunks.map((p) => Buffer.byteLength(JSON.stringify(db._docs.get(p))))) + " bytes");
  ok(CN.settings.numCur === "TND" && CN.settings.refCur === "TND" && CN.settings.numista.headers.length === 29, "settings: numCur TND, 29 headers kept");

  /* collection */
  CN.go("collection"); await tick(150);
  ok($$("#cResults .card").length === 120, "grid renders the first 120 cards");
  ok(/2[\s\u202f\u00a0,.]?710/.test($("#cStats").textContent), "stats: " + $$("#cStats .cstat b").map((b) => b.textContent).join(" | "));
  $("#cSearch").value = "afghan"; $("#cSearch").dispatchEvent(new w.Event("input")); await tick(300);
  ok(CN.col.list.length > 5 && CN.col.list.every((it) => /afghan/i.test(CN.hay(it))), "search 'afghan' → " + CN.col.list.length);
  $("#cSearch").value = ""; $("#cSearch").dispatchEvent(new w.Event("input")); await tick(300);
  CN.col.f.grade = "UNC"; CN.renderCollection(); ok(CN.col.list.length === 1261, "filter grade UNC → " + CN.col.list.length);
  CN.col.f.grade = ""; CN.col.view = "list"; CN.renderCollection(); await tick(20);
  ok($$("#cResults table.clist tbody tr").length === 120, "list view renders a table");
  CN.col.view = "grid";
  if (Object.keys(NPH.t).length) { /* Numista catalogue photos (only when the sprite sheets exist locally) */
  const withN = [...CN.state.items.values()].filter((it) => NPH.t[it.n] && !(it.imgs || []).length).length;
  CN.col.sort = "id"; CN.renderCollection(); await tick(20);
  const firstNph = $("#cResults .card .nph");
  ok(firstNph && /numista-photos\/(n|c)-o-\d\d\.webp/.test(firstNph.style.backgroundImage) && /%/.test(firstNph.style.backgroundPosition), "cards show Numista sprite: " + (firstNph && firstNph.style.backgroundImage));
  ok($("#cResults .nph-note"), "attribution note under the grid");
  CN.col.f.img = "numista"; CN.renderCollection(); ok(CN.col.list.length === withN, "filter 'Numista photo only' → " + CN.col.list.length + " / expected " + withN);
  CN.col.f.img = ""; CN.col.sort = "recent"; CN.renderCollection();
  const nItem = [...CN.state.items.values()].find((it) => NPH.t[it.n]);
  CN.openItem(nItem.id); await tick(50);
  ok($$("#drawer .dr-thumb .nph").length === 2 && /Numista/.test($("#drawer .dr-side").textContent) && $("#drawer .dr-cover .nph"), "drawer shows Numista obverse + reverse with credit");
  CN.closeDrawer(true);
  }

  /* drawer edit */
  CN.openItem("AF-P60b"); await tick(100);
  ok(!$("#drawer").hidden && /AF-P60b/.test($("#drawer .dr-head").textContent), "drawer opens on AF-P60b");
  ok($$("#drawer .lchip a").some((a) => a.href === "https://fr.numista.com/202088"), "Numista short link present");
  const store = $("#drawer [data-f='store']"); store.value = "Album Asie 2"; store.dispatchEvent(new w.Event("input"));
  [...$$("#drFoot button")].find((b) => /Enregistrer|Save/.test(b.textContent)).click(); await tick(150);
  ok(CN.state.items.get("AF-P60b").store === "Album Asie 2", "edit saved to the chunk");

  /* appraisal linked to an item */
  CN.closeDrawer(true); next = "afgh"; CN.appraiseItem("AF-P60b"); await tick(50);
  ok(CN.tab === "appraise" && /AF-P60b/.test($("#apLinked").textContent) && $("#apCountry").value === "Afghanistan", "appraiseItem prefills the form");
  $("#apGo").click(); for (let i = 0; i < 60 && !(CN.ap.ctx && CN.ap.ctx.saved); i++) await tick(50);
  ok(CN.ap.ctx && CN.ap.ctx.saved && CN.ap.ctx.itemId === "AF-P60b" && CN.ap.ctx.n === 1, "appraisal 1 saved on AF-P60b");
  ok(/Numista N# 202088/.test(prompts[0]) && /Numista estimate/.test(prompts[0]) && /Write every text field in (French|English)/.test(prompts[0]), "prompt carries the Numista record and output language");
  ok($("#sheetPane .attach") && /AF-P60b/.test($("#sheetPane .attach").textContent), "attach bar shows the item");
  $("#apGo").click(); for (let i = 0; i < 60 && !(CN.ap.ctx && CN.ap.ctx.n === 2); i++) await tick(50);
  ok(CN.ap.ctx.n === 2 && CN.state.items.get("AF-P60b").ap.n === 2 && /depuis|since/.test($("#sheetPane .attach").textContent), "re-appraisal → history n=2 with delta");

  /* auto-match an existing coin, then a new item */
  $("#apReset").click(); next = "tn"; $("#apCountry").value = "Tunisie"; $("#apDenom").value = "6½ nasri"; $("#apGo").click();
  for (let i = 0; i < 60 && !(CN.ap.ctx && CN.ap.ctx.saved && CN.ap.ctx.result.title.includes("Nasri")); i++) await tick(50);
  ok(CN.ap.ctx.itemId === "TN-KM104-1851" && !CN.ap.ctx.isNew, "auto-matched to " + CN.ap.ctx.itemId);
  $("#apReset").click(); next = "us"; $("#apCountry").value = "USA"; $("#apDenom").value = "1 cent"; $("#apGo").click();
  for (let i = 0; i < 60 && !(CN.ap.ctx && CN.ap.ctx.saved && CN.ap.ctx.result.title.includes("1909")); i++) await tick(50);
  ok(CN.ap.ctx.isNew && CN.ap.ctx.itemId === "US-KM132-1909" && CN.state.items.get("US-KM132-1909").st === "study", "new item " + CN.ap.ctx.itemId + " created as 'under study'");

  /* language & translation */
  CN.setLang("ar"); await tick(30);
  ok(w.document.documentElement.dir === "rtl" && /تقييم/.test($(".tab[data-tab='appraise']").textContent), "Arabic: RTL and labels");
  ok($("#sheetPane .trbar"), "sheet written in French offers translation when UI is Arabic");
  $("#sheetPane .trbar button").click(); for (let i = 0; i < 40 && $("#sheetPane .trbar"); i++) await tick(50);
  ok(!$("#sheetPane .trbar") && /\[EN\]/.test($("#sheetPane .slab-title").textContent), "translation applied and cached");
  CN.setLang("fr");

  /* history tab */
  CN.openItem("AF-P60b"); await tick(150);
  [...$$("#drTabs button")][1].click(); await tick(50);
  ok($$("#drBody .hrow").length === 2 && $("#drBody svg.hchart"), "history tab: 2 appraisals + chart");
  CN.closeDrawer(true);

  /* exports */
  CN.go("import"); $("#expNumista").click(); await tick(50); $("#expFull").click(); await tick(50); $("#expJson").click(); await tick(100);
  const [num, full, js] = downloads;
  const orig = fs.readFileSync(CSV, "utf8").split(/\r?\n/)[0];
  ok(num && num.data.split("\r\n")[0] === orig && num.data.split("\r\n").length === 2710, "Numista CSV: same header, " + (num && num.data.split("\r\n").length - 1) + " rows (in-collection only)");
  ok(full && /Cabinet ID/.test(full.data) && full.data.split("\r\n").length === 2712, "full CSV rows " + (full && full.data.split("\r\n").length - 1));
  const back = js && JSON.parse(js.data); ok(back && back.items.length === 2711 && back.appraisals.length === 5, "JSON backup: " + (back && back.items.length) + " items, " + (back && back.appraisals.length) + " appraisals");

  /* re-import same file: no duplicates */
  CN.imp.done = null; $("#impDrop").dispatchEvent(drop); await tick(300); $("#impRun").click();
  for (let i = 0; i < 200 && !CN.imp.done; i++) await tick(50);
  ok(CN.imp.done && CN.imp.done.created === 0 && CN.imp.done.updated === 1 && CN.state.items.size === 2711, "re-import: created " + (CN.imp.done && CN.imp.done.created) + ", updated " + (CN.imp.done && CN.imp.done.updated) + ", unchanged " + (CN.imp.done && CN.imp.done.skipped));

  /* ===== v6 features ===== */
  CN.setLang("fr");
  /* Numista prices + mintage in the drawer */
  const pit = CN.normItem(CN.state.items.get("AF-P60b")); pit.np = { cur: "TND", ms: Date.now(), p: { VF: 2.1, XF: 3.4, UNC: 7.7 } }; pit.mintage = 950000; pit.nid = "75613870";
  await CN.saveItem(pit); await tick(80);
  CN.openItem("AF-P60b"); await tick(60);
  ok($("#drawer .npbox") && /7,7|7\.7/.test($("#drawer .npbox").textContent) && /950/.test($("#drawer .npbox").textContent), "drawer shows Numista prices by grade and mintage");
  CN.closeDrawer(true);
  ok(CN.state.items.get("AF-P60b").nid === "75613870", "synced field nid survives a save (normItem keeps it)");
  /* dashboard */
  CN.go("dash"); await tick(150);
  const dash = $("#dashBody");
  ok(dash && $("#dashBody .dhero .dh-v") && /TND|DT/.test($("#dashBody .dhero").textContent), "dashboard hero: " + ($("#dashBody .dh-v") || {}).textContent);
  ok($$("#dashBody .dcard").length >= 10, "dashboard cards: " + $$("#dashBody .dcard").length);
  ok($$("#dashBody .cols .col").length >= 1 && $$("#dashBody .dv-row").length >= 1, "monthly columns + seller diverging bars rendered (" + $$("#dashBody .dv-row").length + " sellers)");
  ok($("#dashBody .map-svg") && $$("#dashBody .map-svg path").length > 150, "world map rendered with " + $$("#dashBody .map-svg path").length + " paths");
  ok($$("#dashBody .qrow").length >= 1, "data-quality rows: " + $$("#dashBody .qrow").map((r) => r.textContent).join(" | ").slice(0, 120));
  const tgl = [...$$("#dashBody .dc-head button")][0]; tgl.click(); await tick(20);
  ok($("#dashBody .dtbl"), "chart → table toggle works");
  [...$$("#dashBody .dfilters .seg")][0].querySelectorAll("button")[4].click(); await tick(30);
  ok(CN.dash.period === "30" && !errors.length, "period filter (30 days) re-renders without errors");
  [...$$("#dashBody .dfilters .seg")][0].querySelectorAll("button")[0].click(); await tick(30);
  const qBtn = $("#dashBody .qrow button"); const qLabel = $("#dashBody .qrow span").textContent; const qN = +$("#dashBody .qrow b").textContent.replace(/\D/g, "");
  qBtn.click(); await tick(60);
  ok(CN.tab === "collection" && CN.col.f.issue && CN.col.list.length === qN, "quality '" + qLabel + "' opens the collection filtered (" + CN.col.list.length + "/" + qN + ")");
  CN.col.f.issue = ""; CN.col.kind = "all"; CN.renderCollection();
  CN.go("dash"); await tick(80);
  const nd = downloads.length; [...$$("#dashBody button")].find((b) => /CSV/.test(b.textContent)).click(); await tick(50);
  ok(downloads.length === nd + 1 && /^﻿"N#"/.test(downloads[downloads.length - 1].data), "swap list exported as CSV (" + downloads[downloads.length - 1].data.split("\r\n").length + " lines)");
  /* buying mode */
  CN.go("buy"); await tick(50);
  $("#bQ").value = "P# 60b"; $("#bQ").dispatchEvent(new w.Event("input")); await tick(200);
  ok($("#bRes .bhave.yes") && /AF-P60b/.test($("#bRes").textContent), "'Do I have it?' finds P# 60b");
  $("#bQ").value = "Afghanistan P# 60"; $("#bQ").dispatchEvent(new w.Event("input")); await tick(200);
  ok($("#bRes") && /AF-P60/.test($("#bRes").textContent), "country + base P# shows the close varieties");
  $("#bQ").value = "P# 99999z"; $("#bQ").dispatchEvent(new w.Event("input")); await tick(200);
  ok($("#bRes .bhave.no") && $("#bRefs").value === "P# 99999z", "unknown reference → 'not in collection' and prefilled quick add");
  $("#bCountry").value = "Tunisie"; $("#bDenom").value = "10 Dinars"; $("#bYear").value = "2020"; $("#bPrice").value = "35"; $("#bSeller").value = "SH";
  const before = CN.state.items.size; $("#bForm").dispatchEvent(new w.Event("submit", { cancelable: true })); await tick(200);
  const added = [...CN.state.items.values()].find((it) => it.ref === "P# 99999z");
  ok(CN.state.items.size === before + 1 && added && added.id === "TN-P99999z" && added.buy === 35 && added.place === "SH" && added.st === "col", "quick add created " + (added && added.id) + " (" + (added && added.adate) + ")");
  ok(/TN-P99999z/.test($("#bRecent").textContent), "recent purchases list shows the new item");
  /* labels */
  CN.openLabels([...CN.state.items.values()].slice(0, 30)); await tick(30);
  const nl = downloads.length; [...$$("#dlgLabelsBody button")].find((b) => /PDF/.test(b.textContent)).click(); await tick(120);
  ok(downloads.length === nl + 1 && /\.pdf$/.test(downloads[downloads.length - 1].filename), "labels PDF generated: " + (downloads[downloads.length - 1] || {}).filename);
  CN.closeDialog("dlgLabels");
  /* second opinion */
  next = "afgh"; CN.appraiseItem("AF-P60b"); await tick(30); $("#apDbl").checked = true;
  const np0 = prompts.length; $("#apGo").click();
  for (let i = 0; i < 80 && !(CN.ap.ctx && CN.ap.ctx.saved && CN.ap.ctx.alt); i++) await tick(50);
  ok(prompts.length === np0 + 2 && CN.ap.ctx.alt && CN.ap.ctx.cons && $("#sheetPane .sh-sec.alt"), "second opinion: 2 calls, consensus " + JSON.stringify(CN.ap.ctx.cons));
  ok(/Numista price estimates for this issue/.test(prompts[np0]) && /Mintage \(Numista\): 950000/.test(prompts[np0]), "prompt includes Numista prices by grade and mintage");

  /* guide, settings, theme */
  $("#btnGuide").click(); await tick(20); ok($("#dlgGuide").hasAttribute("open") && $$("#dlgGuideBody tbody tr").length === 7, "guide dialog: 7 grade rows");
  [...$$("#dlgGuideBody .gtabs button")][3].click(); await tick(10); ok($$("#dlgGuideBody .gcard").length === 10, "glossary: 10 terms"); CN.closeDialog("dlgGuide");
  $("#btnSet").click(); await tick(50); ok($("#setRate") && $("#setRate").value === "2.92" && /MB/.test($("#dlgSetBody").textContent), "settings dialog: rate 2.92 and storage meter"); CN.closeDialog("dlgSet");
  $("#themeSeg button[data-m=dark]").click(); ok(w.document.documentElement.getAttribute("data-ui") === "dark", "dark mode toggle"); $("#themeSeg button[data-m=light]").click();

  /* delete */
  await CN.deleteItem("US-KM132-1909"); await tick(100);
  ok(!CN.state.items.has("US-KM132-1909"), "item deleted with its appraisal");
  console.log("\nerrors:", errors.length ? errors.slice(0, 10) : "none");
  if (logs.length) console.log("warnings:", logs.slice(0, 5));
  process.exit();
})().catch((e) => { console.error("HARNESS FAILURE", e && (e.stack || e.message || JSON.stringify(e))); console.log("errors:", errors.slice(0, 10)); process.exit(1); });
