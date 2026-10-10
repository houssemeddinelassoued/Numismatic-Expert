/* Cabinet Numismatique: core (DOM helpers, language, theme, tooltips, data layer, images). */
(function () {
  "use strict";
  const CN = window.CN; const L = CN.logic;

  /* ---------- DOM ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === "class") el.className = v;
      else if (k === "html") el.innerHTML = v;
      else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? "" : v);
    }
    for (const c of kids.flat(Infinity)) { if (c != null && c !== false) el.append(c instanceof Node ? c : String(c)); }
    return el;
  }
  Object.assign(CN, { $, $$, h });
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  CN.sleep = sleep;

  /* ---------- icons ---------- */
  const P = {
    coin: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="5.3" stroke-dasharray="1.4 2"/>',
    note: '<rect x="2.5" y="6.5" width="19" height="11" rx="1.5"/><circle cx="12" cy="12" r="2.5"/><path d="M5.5 9.5v5M18.5 9.5v5"/>',
    other: '<circle cx="12" cy="14.5" r="6"/><path d="M9 2.5l2 6M15 2.5l-2 6"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>',
    plus: '<path d="M12 5v14M5 12h14"/>', close: '<path d="M6 6l12 12M18 6L6 18"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.6 9.4a2.5 2.5 0 1 1 3.4 2.4c-.7.3-1 .9-1 1.6v.5M12 17v.2"/>',
    gear: '<circle cx="12" cy="12" r="3.2"/><path d="M12 3v2.5M12 18.5V21M4.2 7.5l2.2 1.2M17.6 15.3l2.2 1.2M4.2 16.5l2.2-1.2M17.6 8.7l2.2-1.2"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6L6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4"/>',
    moon: '<path d="M19.5 14.5A7.5 7.5 0 0 1 9.5 4.5a7.5 7.5 0 1 0 10 10z"/>',
    auto: '<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5a8.5 8.5 0 0 1 0 17z" fill="currentColor" stroke="none"/>',
    grid: '<rect x="4" y="4" width="7" height="7" rx="1.2"/><rect x="13" y="4" width="7" height="7" rx="1.2"/><rect x="4" y="13" width="7" height="7" rx="1.2"/><rect x="13" y="13" width="7" height="7" rx="1.2"/>',
    list: '<path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01"/>',
    ext: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
    image: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><circle cx="9" cy="10" r="1.7"/><path d="M20 16l-5-5-8 8"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    filter: '<path d="M4 5h16l-6 8v5l-4 2v-7z"/>', upload: '<path d="M12 16V4M7 9l5-5 5 5M4 20h16"/>',
    download: '<path d="M12 4v12M7 11l5 5 5-5M4 20h16"/>', check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    refresh: '<path d="M20 12a8 8 0 1 1-2.3-5.6M20 4v5h-5"/>', tag: '<path d="M3.5 12.5V4.5a1 1 0 0 1 1-1h8l8 8-9 9z"/><circle cx="8" cy="8" r="1.6"/>', chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>', cart: '<path d="M3 4h2l2.4 11h11l2-8H6.3"/><circle cx="9" cy="19.5" r="1.4"/><circle cx="17" cy="19.5" r="1.4"/>', spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6"/>',
  };
  CN.icon = (name) => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${P[name] || ""}</svg>`;
  CN.ic = (name) => { const s = document.createElement("span"); s.innerHTML = CN.icon(name); return s.firstChild; };

  /* ---------- storage, events ---------- */
  CN.store = {
    get(k, d) { try { const v = localStorage.getItem("cn:" + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("cn:" + k, JSON.stringify(v)); } catch (e) { /* storage blocked */ } },
  };
  const bus = {};
  CN.on = (ev, fn) => { (bus[ev] = bus[ev] || []).push(fn); };
  CN.emit = (ev, d) => { for (const fn of bus[ev] || []) { try { fn(d); } catch (e) { console.error(e); } } };

  /* ---------- language ---------- */
  const LI = { fr: 0, en: 1, ar: 2 };
  CN.lang = "fr";
  CN.t = (key, vars) => {
    const a = CN.T[key]; let s = a ? (a[LI[CN.lang]] || a[0]) : key;
    if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : ""));
    return s;
  };
  CN.tx = (v) => (Array.isArray(v) ? v[LI[CN.lang]] || v[0] : v && typeof v === "object" ? v[CN.lang] || v.fr || v.en || "" : v == null ? "" : String(v));
  CN.applyLabels = (root) => {
    root = root || document;
    for (const el of $$("[data-t]", root)) el.textContent = CN.t(el.dataset.t);
    for (const el of $$("[data-ph]", root)) el.placeholder = CN.t(el.dataset.ph);
    for (const el of $$("[data-tip-t]", root)) el.setAttribute("data-tip", CN.t(el.dataset.tipT));
    for (const el of $$("[data-aria-t]", root)) { const s = CN.t(el.dataset.ariaT); el.setAttribute("aria-label", s); }
  };
  CN.setLang = (l) => {
    CN.lang = LI[l] != null ? l : "fr";
    const r = document.documentElement;
    r.lang = CN.lang; r.dir = CN.lang === "ar" ? "rtl" : "ltr";
    CN.store.set("lang", CN.lang);
    CN.applyLabels();
    CN.emit("lang");
  };

  /* ---------- theme ---------- */
  CN.setTheme = (m) => {
    m = ["light", "dark", "auto"].includes(m) ? m : "light";
    const r = document.documentElement;
    if (m === "auto") r.removeAttribute("data-ui"); else r.setAttribute("data-ui", m);
    CN.store.set("theme", m);
    for (const b of $$(".theme button")) b.setAttribute("aria-pressed", String(b.dataset.m === m));
  };

  /* ---------- settings & formatting ---------- */
  CN.settings = { refCur: "TND", usdRate: 2.92, nlang: "fr", numCur: "", numista: null, migratedV2: false, budget: 0, dblMin: 500, lastBackup: 0, nsync: null, appUrl: "https://claude.ai/artifact/NDCAZRcJNMmQSVrDUshND2" };
  const LOC = { fr: "fr-FR", en: "en-US", ar: "ar-TN" };
  CN.money = (n, cur, compact) => {
    if (typeof n !== "number" || !isFinite(n)) return "—";
    cur = (cur || CN.settings.refCur || "USD").toUpperCase();
    const digits = compact ? 1 : Math.abs(n) < 100 ? 2 : 0;
    try { return new Intl.NumberFormat(LOC[CN.lang], { style: "currency", currency: cur, maximumFractionDigits: digits, minimumFractionDigits: 0, notation: compact ? "compact" : "standard" }).format(n); }
    catch (e) { return n.toFixed(digits) + " " + cur; }
  };
  CN.range = (lo, hi, cur, compact) => {
    if (typeof lo !== "number") return "—";
    return typeof hi === "number" && hi !== lo ? CN.money(lo, cur, compact) + " – " + CN.money(hi, cur, compact) : CN.money(lo, cur, compact);
  };
  CN.num = (n, d) => (typeof n === "number" && isFinite(n) ? new Intl.NumberFormat(LOC[CN.lang], { maximumFractionDigits: d == null ? 2 : d }).format(n) : "—");
  CN.fmtDate = (v) => {
    if (v == null || v === "") return "";
    const d = typeof v === "number" ? new Date(v) : /^\d{4}-\d{2}-\d{2}/.test(v) ? new Date(v + "T12:00:00") : null;
    if (!d || isNaN(d)) return String(v);
    try { return new Intl.DateTimeFormat(LOC[CN.lang], { dateStyle: "medium" }).format(d); } catch (e) { return d.toISOString().slice(0, 10); }
  };
  CN.fromUSD = (n) => {
    if (typeof n !== "number") return null;
    const cur = (CN.settings.refCur || "USD").toUpperCase();
    return cur === "USD" ? n : n * (Number(CN.settings.usdRate) || 1);
  };

  /* ---------- tooltips ---------- */
  function initTips() {
    const tip = $("#tip"); let cur = null;
    const place = (el) => {
      const r = el.getBoundingClientRect(); const tw = tip.offsetWidth, th = tip.offsetHeight;
      let top = r.top - th - 8; if (top < 8) top = r.bottom + 8;
      let left = r.left + r.width / 2 - tw / 2; left = Math.max(8, Math.min(left, innerWidth - tw - 8));
      tip.style.top = top + "px"; tip.style.left = left + "px";
    };
    const show = (el) => { const s = el.getAttribute("data-tip"); if (!s) return; cur = el; tip.textContent = s; tip.hidden = false; place(el); };
    const hide = () => { cur = null; tip.hidden = true; };
    document.addEventListener("pointerover", (e) => {
      if (e.pointerType === "touch") return;
      const el = e.target.closest && e.target.closest("[data-tip]");
      if (el && el !== cur) show(el); else if (!el && cur) hide();
    });
    document.addEventListener("focusin", (e) => { const el = e.target.closest && e.target.closest("[data-tip]"); if (el) show(el); });
    document.addEventListener("focusout", hide);
    document.addEventListener("click", (e) => {
      const el = e.target.closest && e.target.closest(".tipi");
      if (el) { e.preventDefault(); if (cur === el) hide(); else show(el); }
      else if (cur) hide();
    }, true);
    addEventListener("scroll", hide, true);
    CN.hideTip = hide;
  }

  /* ---------- toast, dialogs ---------- */
  let toastT;
  CN.toast = (text, err) => {
    const el = $("#toast"); el.textContent = text; el.className = "toast on" + (err ? " err" : "");
    clearTimeout(toastT); toastT = setTimeout(() => { el.className = "toast"; }, 3200);
  };
  CN.openDialog = (id) => { const d = document.getElementById(id); if (d && !d.open) { try { d.showModal(); } catch (e) { d.setAttribute("open", ""); } } };
  CN.closeDialog = (id) => { const d = document.getElementById(id); if (d) { try { d.close(); } catch (e) { d.removeAttribute("open"); } } };
  CN.errKey = (e) => {
    const c = e && e.code;
    if (c === "quota_exceeded" || c === "quota_or_state") return "quota";
    if (c === "not_granted" || c === "invalid_argument" && !CN.state.owner) return "notOwner";
    return "saveFail";
  };

  /* ---------- items ---------- */
  const ITEM_DEFAULTS = { id: "", iso: "", kind: "coin", st: "col", country: "", issuer: "", ruler: "", cur: "", face: "", ref: "", n: "", title: "", ntype: "", yrange: "", comp: "", weight: "", year: "", gyear: "", refs: "", comment: "", qty: 1, exch: false, grade: "", coll: "", set: "", buy: null, est: null, pcom: "", pubcom: "", store: "", place: "", adate: "", serial: "", links: [], imgs: [], ap: null, nkey: "", src: "manual", nid: "", nissue: "", npics: [], np: null, mintage: null, cms: 0, ums: 0 };
  CN.normItem = (it) => {
    const o = {};
    for (const [k, d] of Object.entries(ITEM_DEFAULTS)) {
      let v = it ? it[k] : undefined;
      if (v === undefined) v = d;
      o[k] = Array.isArray(v) ? v.map((x) => (x && typeof x === "object" ? { ...x } : x)) : v && typeof v === "object" ? { ...v } : v;
    }
    return o;
  };
  CN.itemTitle = (it) => it.title || [it.face, it.cur].filter(Boolean).join(" ") || it.id;
  CN.itemValue = (it) => {
    if (it.ap && typeof it.ap.lo === "number") {
      const lo = CN.fromUSD(it.ap.lo), hi = CN.fromUSD(typeof it.ap.hi === "number" ? it.ap.hi : it.ap.lo);
      return { lo, hi, mid: (lo + hi) / 2, cur: CN.settings.refCur, src: "cabinet" };
    }
    const b = CN.bestValue(it);
    return b ? { lo: b.v, hi: b.v, mid: b.v, cur: CN.settings.numCur || CN.settings.refCur, src: b.src } : null;
  };
  /* Best available value of an item in the display currency: own appraisal, else Numista price for its grade, else Numista estimate. */
  CN.bestValue = (it) => {
    if (it.ap && typeof it.ap.lo === "number") { const lo = CN.fromUSD(it.ap.lo), hi = CN.fromUSD(typeof it.ap.hi === "number" ? it.ap.hi : it.ap.lo); return { v: (lo + hi) / 2, src: "cabinet" }; }
    const ref = String(CN.settings.refCur || "").toUpperCase();
    if (it.np && it.np.p && it.grade && typeof it.np.p[it.grade] === "number" && (!it.np.cur || it.np.cur === ref)) return { v: it.np.p[it.grade], src: "numista-api" };
    if (typeof it.est === "number") return { v: it.est, src: "numista" };
    return null;
  };
  CN.kindIcon = (k) => { const s = h("span", { class: "kic" }); s.innerHTML = CN.icon(k === "note" ? "note" : k === "other" ? "other" : "coin"); return s; };
  CN.gradeChip = (g) => (g ? h("span", { class: "gchip", "data-g": g, "data-tip": CN.tx((CN.GRADE_INFO[g] || {}).name) }, g) : null);
  /* Numista catalogue photos: sprite sheets published with the page (numista-photos/), keyed by N#. */
  CN.nph = null;
  CN.loadNumistaPhotos = async () => {
    try { const r = await fetch("numista-photos/index.json", { cache: "no-cache" }); if (!r.ok) return; CN.nph = await r.json(); CN.emit("nphotos"); }
    catch (e) { /* no catalogue photos published */ }
  };
  CN.nphoto = (it) => (CN.nph && it && it.n && CN.nph.t[it.n]) || null;
  CN.nphCredit = (it, side) => {
    const e = CN.nphoto(it); if (!e) return "";
    const c = e["c" + side], l = e["l" + side];
    return CN.t("nphSource") + " · N# " + it.n + (c ? " · © " + c : "") + (l ? " · " + l : "");
  };
  CN.nphotoEl = (it, side) => {
    const e = CN.nphoto(it); const ref = e && e[side || "o"]; if (!ref) return null;
    const [series, sheet, cell] = ref; const N = CN.nph, cols = N.cols, rows = N.rows;
    const col = cell % cols, row = Math.floor(cell / cols);
    const url = "numista-photos/" + series + "-" + (side || "o") + "-" + String(sheet).padStart(2, "0") + ".webp";
    const el = h("div", { class: "nph " + series, role: "img", "aria-label": CN.itemTitle(it) + " · " + CN.t("nphSource"), "data-tip": CN.nphCredit(it, side || "o") });
    el.style.backgroundImage = "url(" + url + ")";
    el.style.backgroundSize = cols * 100 + "% " + rows * 100 + "%";
    el.style.backgroundPosition = (cols > 1 ? (col / (cols - 1)) * 100 : 0) + "% " + (rows > 1 ? (row / (rows - 1)) * 100 : 0) + "%";
    return h("div", { class: "nph-wrap" }, el);
  };
  CN.hasOwnImg = (it) => !!(it.imgs && it.imgs.length);
  CN.thumb = (it, big) => {
    const id = (it.imgs || [])[0];
    if (id) return h("img", { src: CN.imgUrl(id), alt: "", loading: "lazy", decoding: "async" });
    const np = CN.nphotoEl(it, "o"); if (np) return np;
    const label = [it.face, big ? it.cur : ""].filter(Boolean).join(" ") || it.id;
    return h("div", { class: "ph " + (it.kind || "coin") }, h("span", {}, label));
  };
  CN.hay = (it) => [it.id, it.title, it.country, it.issuer, it.ruler, it.cur, it.face, it.ref, it.refs, it.n ? "N# " + it.n + " n" + it.n : "", it.year, it.gyear, it.comment, it.serial, it.store, it.place, it.pcom, it.pubcom].join(" ").toLowerCase();

  /* ---------- runtime & data ---------- */
  const S = CN.state = { items: new Map(), chunks: new Map(), loc: new Map(), ready: false, unavailable: false, owner: false, recent: [] };
  CN.rt = { db: null, user: null, assets: null, dl: null, sample: null };
  const CAP = 120, SOFT = 190000;
  const enc = typeof TextEncoder !== "undefined" ? new TextEncoder() : null;
  const bytes = (o) => { const s = JSON.stringify(o); return enc ? enc.encode(s).length : s.length * 2; };
  CN.chunkBytes = bytes; CN.CHUNK_CAP = CAP; CN.CHUNK_SOFT = SOFT;

  let q = Promise.resolve();
  CN.enqueue = (fn) => { const p = q.then(fn, fn); q = p.catch(() => {}); return p; };

  function rebuild() {
    const items = new Map(), loc = new Map();
    for (const [cid, its] of S.chunks) for (const [id, it] of Object.entries(its || {})) { if (!it) continue; items.set(id, Object.assign({}, it, { id })); loc.set(id, cid); }
    S.items = items; S.loc = loc;
  }
  function applyLocal(cid, its) { S.chunks.set(cid, its); rebuild(); CN.emit("items"); }
  CN.applyLocalChunk = applyLocal;
  CN.nextChunkId = (taken) => {
    let max = 0; for (const cid of taken || S.chunks.keys()) { const m = /^c(\d+)$/.exec(cid); if (m) max = Math.max(max, +m[1]); }
    return "c" + String(max + 1).padStart(3, "0");
  };
  const db = () => { if (!CN.rt.db) throw { code: "unavailable" }; return CN.rt.db; };

  async function placeNew(item) {
    let target = null;
    for (const [cid, its] of S.chunks) { if (Object.keys(its || {}).length < CAP && bytes(its) < SOFT - 4000) { target = cid; break; } }
    if (target) {
      await db().doc("inv/" + target).update({ items: { [item.id]: item } });
      applyLocal(target, Object.assign({}, S.chunks.get(target), { [item.id]: item }));
    } else {
      const cid = CN.nextChunkId();
      await db().doc("inv/" + cid).set({ items: { [item.id]: item } });
      applyLocal(cid, { [item.id]: item });
    }
  }
  CN.saveItem = (input, prevId) => CN.enqueue(async () => {
    const item = CN.normItem(input); const now = Date.now();
    item.ums = now; if (!item.cms) item.cms = now;
    const id = item.id;
    if (prevId && prevId !== id) {
      const cid = S.loc.get(prevId);
      if (cid) { const its = Object.assign({}, S.chunks.get(cid)); delete its[prevId]; its[id] = item; await db().doc("inv/" + cid).set({ items: its }); applyLocal(cid, its); }
      else await placeNew(item);
      const snap = await db().collection("appr").where("item", "==", prevId).get();
      for (const d of snap.docs) await db().doc("appr/" + d.id).update({ item: id });
      return item;
    }
    const cid = S.loc.get(id);
    if (!cid) { await placeNew(item); return item; }
    try {
      await db().doc("inv/" + cid).update({ items: { [id]: item } });
      applyLocal(cid, Object.assign({}, S.chunks.get(cid), { [id]: item }));
    } catch (e) {
      if (!e || e.code !== "invalid_argument") throw e;
      const its = Object.assign({}, S.chunks.get(cid)); delete its[id];
      const ncid = CN.nextChunkId();
      await db().doc("inv/" + ncid).set({ items: { [id]: item } }); applyLocal(ncid, { [id]: item });
      await db().doc("inv/" + cid).set({ items: its }); applyLocal(cid, its);
    }
    return item;
  });
  CN.deleteItem = (id) => CN.enqueue(async () => {
    const it = S.items.get(id); const cid = S.loc.get(id);
    if (cid) { const its = Object.assign({}, S.chunks.get(cid)); delete its[id]; await db().doc("inv/" + cid).set({ items: its }); applyLocal(cid, its); }
    let apprs = [];
    try { apprs = (await db().collection("appr").where("item", "==", id).get()).docs; } catch (e) { apprs = []; }
    for (const d of apprs) { try { await db().doc("appr/" + d.id).delete(); } catch (e) { /* keep going */ } }
    const keep = new Set(); for (const [oid, o] of S.items) if (oid !== id) for (const x of o.imgs || []) keep.add(x);
    const ids = new Set([...((it && it.imgs) || []), ...apprs.flatMap((d) => (d.data() || {}).imgs || [])]);
    if (CN.rt.assets) for (const a of ids) if (!keep.has(a)) { try { await CN.rt.assets.delete(a); } catch (e) { /* already gone */ } }
  });
  CN.writeChunk = (cid, its) => CN.enqueue(async () => { await db().doc("inv/" + cid).set({ items: its }); applyLocal(cid, its); });

  CN.addAppraisal = (doc, id) => CN.enqueue(async () => {
    const ref = id ? db().collection("appr").doc(id) : db().collection("appr").doc();
    await ref.set(doc); return ref.id;
  });
  CN.getAppraisals = async (itemId) => {
    const snap = await db().collection("appr").where("item", "==", itemId).get();
    return snap.docs.map((d) => Object.assign({ id: d.id }, d.data())).sort((a, b) => b.ms - a.ms);
  };
  CN.updateAppraisal = (aid, patch) => CN.enqueue(() => db().doc("appr/" + aid).update(patch));
  CN.deleteAppraisal = (aid) => CN.enqueue(() => db().doc("appr/" + aid).delete());
  CN.saveSettings = (patch) => {
    Object.assign(CN.settings, patch || {}); CN.emit("settings");
    if (!CN.rt.db || !S.owner) return Promise.resolve();
    return CN.enqueue(() => db().doc("meta/settings").set(JSON.parse(JSON.stringify(CN.settings))));
  };

  /* ---------- images (assets) ---------- */
  CN.imgUrl = (id) => "/_blob/" + id;
  async function downscale(file, max, quality) {
    const okType = /^image\/(jpeg|png|webp)$/.test(file.type);
    const url = URL.createObjectURL(file);
    try {
      const img = new Image(); img.src = url; await img.decode();
      const w = img.naturalWidth, hgt = img.naturalHeight;
      if (okType && Math.max(w, hgt) <= max && file.size < 1200000) return file;
      const k = Math.min(1, max / Math.max(w, hgt));
      const c = document.createElement("canvas"); c.width = Math.max(1, Math.round(w * k)); c.height = Math.max(1, Math.round(hgt * k));
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      return await new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej({ code: "invalid_request" })), "image/jpeg", quality));
    } finally { URL.revokeObjectURL(url); }
  }
  CN.uploadImage = async (file) => {
    if (!CN.rt.assets) throw { code: "not_granted" };
    const blob = await downscale(file, 1600, 0.86);
    const type = /^image\/(jpeg|png|webp|gif)$/.test(blob.type) ? blob.type : "image/jpeg";
    try { return (await CN.rt.assets.upload(blob, { type })).id; }
    catch (e) {
      if (e && e.code === "store_unavailable") { await sleep(900); return (await CN.rt.assets.upload(blob, { type })).id; }
      throw e;
    }
  };
  CN.assetBlob = async (id) => { const r = await fetch(CN.imgUrl(id)); if (!r.ok) throw new Error("asset " + r.status); return r.blob(); };
  CN.dataUrlToBlob = (u) => {
    const m = /^data:([^;,]+)(;base64)?,(.*)$/.exec(u || ""); if (!m) return null;
    const bin = m[2] ? atob(m[3]) : decodeURIComponent(m[3]); const a = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
    return new Blob([a], { type: m[1] });
  };

  /* ---------- boot of the runtime ---------- */
  CN.initRuntime = async () => {
    const has = window.claude && typeof window.claude.use === "function";
    if (!has) { S.unavailable = true; CN.emit("runtime"); CN.emit("items"); return; }
    const names = ["db", "user", "assets", "downloads", "sample"];
    const got = await Promise.all(names.map((n) => window.claude.use(n).catch(() => null)));
    CN.rt = { db: got[0], user: got[1], assets: got[2], dl: got[3], sample: got[4] };
    S.owner = CN.rt.user ? await CN.rt.user.isOwner().catch(() => false) : false;
    CN.emit("runtime");
    if (!CN.rt.db) { S.unavailable = true; CN.emit("items"); return; }
    try { const s = await CN.rt.db.doc("meta/settings").get(); if (s.exists) Object.assign(CN.settings, s.data()); } catch (e) { /* defaults */ }
    CN.emit("settings");
    let first = true;
    CN.rt.db.collection("inv").onSnapshot((snap) => {
      const chunks = new Map(); for (const d of snap.docs) chunks.set(d.id, (d.data() || {}).items || {});
      S.chunks = chunks; rebuild(); S.ready = true; CN.emit("items");
      if (first) { first = false; migrateV2().catch((e) => console.warn("migration", e)); }
    }, () => { S.unavailable = true; CN.emit("items"); });
    CN.rt.db.collection("appr").orderBy("ms", "desc").limit(8).onSnapshot((snap) => {
      S.recent = snap.docs.map((d) => Object.assign({ id: d.id }, d.data())); CN.emit("recent");
    }, () => {});
  };

  /* Appraisals saved by the previous version of the page (private per viewer) become items + history. */
  async function migrateV2() {
    if (CN.settings.migratedV2 || !S.owner || !CN.rt.user) return;
    const uid = await CN.rt.user.id(); if (!uid) return;
    let docs = [];
    try { docs = (await CN.rt.db.doc("data/users/" + uid + "/cabinet").collection("appraisals").get()).docs; } catch (e) { return; }
    for (const d of docs) {
      const o = d.data() || {}, f = o.form || {}, r = o.result || {};
      const kind = f.type === "note" ? "note" : f.type === "medal" ? "other" : "coin";
      const iso = L.isoOf(f.country) || L.fallbackIso(f.country);
      const conv = (lang) => {
        const p = (x) => (x && typeof x === "object" && !Array.isArray(x) ? x[lang] : x);
        const lad = {}; for (const x of r.ladder || []) { const g = L.normGrade(x.grade); if (!g || typeof x.low !== "number") continue; const c = lad[g]; lad[g] = c ? { grade: g, low: Math.min(c.low, x.low), high: Math.max(c.high, x.high || x.low) } : { grade: g, low: x.low, high: x.high || x.low }; }
        return { title: p(r.title) || "", kind, iso2: iso, country: f.country || "", refs: { km: "", pick: "", numista: "", other: "" }, year: f.year || "", grade: L.normGrade(r.grade) || "?", confidence: r.confidence || "low", value: r.value || {}, ladder: L.GRADES.filter((g) => lad[g]).map((g) => lad[g]), specs: (r.specs || []).map((s) => ({ label: p(s.label) || "", value: String(s.value || "") })), summary: p(r.summary) || "", sources: [], factors: p(r.factors) || [], history: p(r.history) || "", specifics: p(r.specifics) || "", advice: p(r.advice) || [], questions: p(r.questions) || [] };
      };
      const imgs = [];
      for (const u of o.thumbs || []) { const b = CN.dataUrlToBlob(u); if (b && CN.rt.assets) { try { imgs.push((await CN.rt.assets.upload(b, { type: b.type })).id); } catch (e) { /* skip */ } } }
      const res = conv("fr");
      const id = L.uniqueId(L.makeBaseId({ iso, kind, gyear: f.year }), kind, f.year, (x) => S.items.has(x));
      const ms = o.createdMs || Date.now();
      await CN.saveItem({ id, iso, kind, st: "study", country: f.country || "", title: res.title, face: f.denom || "", year: f.year || "", gyear: /^\d{3,4}$/.test(f.year || "") ? f.year : "", grade: L.normGrade(f.grade) || res.grade.replace("?", ""), imgs, src: "appraisal", cms: ms, ap: res.value && typeof res.value.low === "number" ? { n: 1, ms, grade: res.grade, lo: res.value.low, hi: res.value.high, conf: res.confidence } : null });
      await CN.addAppraisal({ item: id, ms, lang: "fr", form: { kind, country: f.country || "", year: f.year || "", denom: f.denom || "", mark: f.mark || "", material: f.material || "", refs: "", grade: L.normGrade(f.grade), probes: [], notes: f.notes || "" }, result: res, tr: { en: conv("en"), ar: conv("ar") }, imgs, v: 3 }, d.id);
    }
    await CN.saveSettings({ migratedV2: true });
  }

  document.addEventListener("DOMContentLoaded", initTips);
  if (document.readyState !== "loading") initTips();
})();
