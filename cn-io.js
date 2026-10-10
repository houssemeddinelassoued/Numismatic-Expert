/* Cabinet Numismatique: Numista CSV import, exports, JSON backup and restore. */
(function () {
  "use strict";
  const CN = window.CN; const L = CN.logic; const { $, h } = CN;
  const I = CN.imp = { name: "", parsed: null, map: {}, currency: "", policy: "update", running: false, done: null, err: "" };
  const NUM_FIELDS = ["iso", "kind", "country", "issuer", "ruler", "cur", "face", "ref", "n", "title", "ntype", "yrange", "comp", "weight", "year", "gyear", "refs", "comment", "qty", "exch", "grade", "coll", "set", "buy", "est", "pcom", "pubcom", "store", "place", "adate", "serial"];
  const FIELD_LABEL = { country: "fCountry", issuer: "fIssuer", ruler: "fRuler", cur: "fCur", face: "fFace", ref: "fRef", n: "fN", title: "fTitle", ntype: "fNtype", yrange: "fYrange", comp: "fComp", weight: "fWeight", year: "fYearI", gyear: "fGyear", refs: "fRefsI", comment: "fComment", qty: "fQty", exch: "fExch", grade: "fGrade", coll: "tabCollection", set: "fRefsI", buy: "fBuy", est: "fEst", pcom: "fPcom", pubcom: "fPubcom", store: "fStore", place: "fPlace", adate: "fAdate", serial: "fSerial" };
  const pickNum = (it) => { const o = {}; for (const k of NUM_FIELDS) o[k] = it[k]; return o; };

  async function readText(file) {
    const buf = await file.arrayBuffer();
    let text = new TextDecoder("utf-8").decode(buf);
    if ((text.match(/\uFFFD/g) || []).length > 3) text = new TextDecoder("windows-1252").decode(buf);
    return text;
  }
  async function onFile(file) {
    Object.assign(I, { name: file.name, parsed: null, done: null, err: "" });
    try {
      const parsed = L.parseCSV(await readText(file));
      if (!parsed.headers.length || !parsed.rows.length) throw new Error("empty");
      const { map, currency } = L.mapHeaders(parsed.headers);
      if (Object.keys(map).length < 5) throw new Error("not numista");
      Object.assign(I, { parsed, map, currency });
    } catch (e) { I.err = "impBad"; }
    renderStep();
  }
  function existingNumista() { let n = 0; for (const it of CN.state.items.values()) if (it.nkey) n++; return n; }
  function previewRows() {
    const used = new Set(CN.state.items.keys());
    return I.parsed.rows.slice(0, 6).map((r) => { const it = L.rowToItem(r, I.map); const id = L.uniqueId(L.makeBaseId(it), it.kind, it.gyear, (x) => used.has(x)); used.add(id); return Object.assign(it, { id }); });
  }
  function renderStep() {
    const box = $("#impStep"); box.replaceChildren();
    if (I.err) { box.append(h("p", { class: "msg err" }, CN.t(I.err))); return; }
    if (I.done) {
      const d = I.done;
      box.append(h("div", { class: "ok-box" }, h("b", {}, CN.t("impDone", { c: d.created, u: d.updated, s: d.skipped })), d.missing ? h("span", {}, CN.t("impMissing", { n: d.missing })) : null,
        h("div", {}, h("button", { type: "button", class: "btn pri", onclick: () => CN.go("collection") }, CN.t("impSee")))));
      return;
    }
    if (!I.parsed) return;
    const P = I.parsed; const nCols = Object.keys(I.map).length;
    box.append(h("p", {}, h("b", {}, I.name), " · ", CN.t("impParsed", { rows: CN.num(P.rows.length, 0), cols: nCols, total: P.headers.length, cur: I.currency || "—" })));
    const mapBox = h("div", { class: "maptbl" });
    for (const [f] of L.NUMISTA_FIELDS) {
      const s = h("select", { "aria-label": f }, h("option", { value: "" }, CN.t("impIgnore")), P.headers.map((hd, i) => h("option", { value: String(i) }, hd)));
      s.value = I.map[f] != null ? String(I.map[f]) : "";
      s.addEventListener("change", () => { if (s.value === "") delete I.map[f]; else I.map[f] = +s.value; renderStep(); });
      mapBox.append(h("label", { class: "fld" }, h("span", { class: "lab" }, CN.t(FIELD_LABEL[f] || "fComment"), " · ", h("span", { class: "mono" }, f)), s));
    }
    box.append(h("details", { class: "more" }, h("summary", {}, CN.t("impMapping"), " (" + nCols + "/" + L.NUMISTA_FIELDS.length + ")"), mapBox));
    const prev = previewRows(); const nc = I.currency;
    box.append(h("div", { class: "fld" }, h("span", { class: "lab" }, CN.t("impPreview")), h("div", { class: "prevw" }, h("table", {},
      h("thead", {}, h("tr", {}, ["fId", "fTitle", "fCountry", "fGyear", "fGrade", "fBuy"].map((k) => h("th", {}, CN.t(k))))),
      h("tbody", {}, prev.map((it) => h("tr", {}, h("td", { class: "id" }, it.id), h("td", {}, it.title), h("td", {}, it.country), h("td", {}, it.gyear || it.year), h("td", {}, CN.gradeChip(it.grade)), h("td", { class: "mono" }, it.buy != null ? CN.money(it.buy, nc || CN.settings.refCur) : ""))))))));
    if (existingNumista()) {
      const pol = h("div", { class: "pol", role: "radiogroup", "aria-label": CN.t("impPolicy") }, h("span", { class: "lab" }, CN.t("impPolicy")));
      for (const [v, k] of [["update", "polUpdate"], ["skip", "polSkip"], ["new", "polNew"]]) {
        const r = h("input", { type: "radio", name: "impPol", value: v }); r.checked = I.policy === v; r.addEventListener("change", () => { I.policy = v; });
        pol.append(h("label", {}, r, CN.t(k)));
      }
      box.append(pol);
    }
    const can = CN.rt.db && CN.state.owner && CN.state.ready;
    box.append(h("div", { class: "actions" }, h("button", { type: "button", class: "btn pri", id: "impRun", disabled: !can || I.running, onclick: runImport }, CN.ic("upload"), CN.t("impRun", { n: CN.num(P.rows.length, 0) }))),
      h("div", { class: "prog", id: "impProg", hidden: !I.running }, h("i")), h("p", { class: "msg", id: "impMsg" }, can ? "" : CN.t(CN.rt.db ? (CN.state.owner ? "loadingColl" : "notOwner") : "unavailable")));
  }

  /* bulk write: build final chunk contents locally, then write each touched chunk once */
  async function writeBulk(apply, onProgress) {
    const S = CN.state; const work = new Map(S.chunks); const touched = new Set();
    const edit = (cid) => { if (!touched.has(cid)) { work.set(cid, Object.assign({}, work.get(cid))); touched.add(cid); } return work.get(cid); };
    const res = apply({ edit, work });
    let fill = null;
    const room = (cid) => Object.keys(work.get(cid) || {}).length < CN.CHUNK_CAP;
    for (const it of res.newItems) {
      if (!fill || !room(fill)) { fill = [...work.keys()].find((cid) => room(cid) && (touched.has(cid) || CN.chunkBytes(work.get(cid)) < CN.CHUNK_SOFT - 20000)) || null; }
      if (!fill) { fill = CN.nextChunkId([...work.keys()]); work.set(fill, {}); touched.add(fill); }
      edit(fill)[it.id] = it;
    }
    for (const cid of [...touched]) {
      let its = work.get(cid);
      while (CN.chunkBytes(its) > CN.CHUNK_SOFT) {
        const keys = Object.keys(its); const half = keys.slice(Math.floor(keys.length / 2));
        const ncid = CN.nextChunkId([...work.keys()]); const moved = {};
        for (const k of half) { moved[k] = its[k]; delete its[k]; }
        work.set(ncid, moved); touched.add(ncid);
      }
    }
    const list = [...touched]; let i = 0;
    for (const cid of list) { await CN.writeChunk(cid, work.get(cid)); onProgress(++i, list.length); }
    return res;
  }
  async function runImport() {
    if (I.running) return; I.running = true; renderStep();
    const prog = () => $("#impProg i"), msg = () => $("#impMsg");
    try {
      const S = CN.state; const rows = I.parsed.rows; const now = Date.now();
      const res = await writeBulk(({ edit }) => {
        const byKey = new Map(); for (const it of S.items.values()) if (it.nkey) byKey.set(it.nkey, it.id);
        const used = new Set(S.items.keys()); const occ = {}; const seen = new Set();
        const out = { newItems: [], created: 0, updated: 0, skipped: 0, missing: 0 };
        rows.forEach((row, idx) => {
          const base = L.rowToItem(row, I.map);
          const fp = L.fingerprint(base); occ[fp] = (occ[fp] || 0) + 1; const nkey = fp + "#" + occ[fp];
          const exId = I.policy !== "new" ? byKey.get(nkey) : null;
          if (exId) {
            seen.add(exId);
            if (I.policy === "skip") { out.skipped++; return; }
            const old = CN.normItem(S.items.get(exId));
            if (JSON.stringify(pickNum(old)) === JSON.stringify(pickNum(Object.assign({}, old, pickNum(base))))) { out.skipped++; return; }
            const merged = Object.assign(old, pickNum(base), { nkey, ums: now });
            edit(S.loc.get(exId))[exId] = merged; out.updated++;
          } else {
            const it = CN.normItem(Object.assign(base, { nkey, src: "numista", cms: now - idx, ums: now }));
            it.id = L.uniqueId(L.makeBaseId(it), it.kind, it.gyear, (x) => used.has(x)); used.add(it.id);
            out.newItems.push(it); out.created++;
          }
        });
        if (I.policy !== "new") for (const it of S.items.values()) if (it.src === "numista" && !seen.has(it.id)) out.missing++;
        return out;
      }, (i, n) => { const p = prog(); if (p) p.style.width = Math.round((i / n) * 100) + "%"; const m = msg(); if (m) m.textContent = CN.t("impProgress", { i, n }); });
      const patch = { numista: { headers: I.parsed.headers, delim: I.parsed.delim, file: I.name, ms: now, rows: rows.length } };
      if (I.currency) { patch.numCur = I.currency; if (!CN.settings.numista) patch.refCur = I.currency; }
      await CN.saveSettings(patch);
      I.done = res;
    } catch (e) { I.err = ""; const m = msg(); if (m) { m.className = "msg err"; m.textContent = CN.t(CN.errKey(e)); } I.running = false; return; }
    I.running = false; renderStep();
  }

  /* ---------- exports ---------- */
  const day = () => new Date().toISOString().slice(0, 10);
  const sorted = (filter) => [...CN.state.items.values()].filter(filter || (() => true)).sort((a, b) => (a.country || "").localeCompare(b.country || "") || (a.title || "").localeCompare(b.title || "") || (a.gyear || "").localeCompare(b.gyear || ""));
  async function save(filename, data) {
    const m = $("#expMsg");
    if (!CN.rt.dl) { m.className = "msg err"; m.textContent = CN.t("unavailable"); return; }
    try { await CN.rt.dl.save({ filename, data }); m.className = "msg"; m.textContent = CN.t("expDone"); return true; }
    catch (e) { if (!e || e.code !== "declined") { m.className = "msg err"; m.textContent = CN.t("expFail"); } }
  }
  function exportNumista() {
    const items = sorted((it) => it.st === "col"); if (!items.length) { $("#expMsg").textContent = CN.t("expNone"); return; }
    const cur = CN.settings.numCur || CN.settings.refCur;
    const headers = (CN.settings.numista && CN.settings.numista.headers) || L.NUMISTA_HEADERS_EN.map((x) => x.replace("{cur}", cur));
    save(`numista-cabinet-${day()}.csv`, L.toCSV([headers, ...items.map((it) => L.itemToRow(it, headers))]));
  }
  function exportFull() {
    const items = sorted(); if (!items.length) { $("#expMsg").textContent = CN.t("expNone"); return; }
    const nc = CN.settings.numCur || CN.settings.refCur, rc = CN.settings.refCur;
    const head = ["Cabinet ID", "Status", "Kind", "ISO", "Country", "Issuer", "Title", "Face value", "Currency", "Year", "Gregorian year", "Reference", "References", "N#", "Numista link", "Grade", "Quantity", `Buying price (${nc})`, `Numista estimate (${nc})`, `Cabinet estimate low (${rc})`, `Cabinet estimate high (${rc})`, "Cabinet estimate low (USD)", "Cabinet estimate high (USD)", "Last appraisal", "Appraisals", "Storage location", "Acquisition place", "Acquisition date", "Serial number", "Comment", "Private comment", "Public comment", "Links", "Images"];
    const nl = CN.settings.nlang || "en";
    const rows = items.map((it) => { const ap = it.ap && typeof it.ap.lo === "number" ? it.ap : null; const r2 = (v) => (v == null ? "" : Math.round(v * 100) / 100);
      return [it.id, it.st, it.kind, it.iso, it.country, it.issuer, it.title, it.face, it.cur, it.year, it.gyear, it.ref, it.refs, it.n, it.n ? `https://${nl}.numista.com/${it.n}` : "", it.grade, it.qty, it.buy, it.est, ap ? r2(CN.fromUSD(ap.lo)) : "", ap ? r2(CN.fromUSD(ap.hi)) : "", ap ? ap.lo : "", ap ? ap.hi : "", ap ? new Date(ap.ms).toISOString().slice(0, 10) : "", ap ? ap.n : "", it.store, it.place, it.adate, it.serial, it.comment, it.pcom, it.pubcom, (it.links || []).map((l) => l.u).join(" "), (it.imgs || []).length]; });
    save(`cabinet-numismatique-${day()}.csv`, "﻿" + L.toCSV([head, ...rows]));
  }
  async function exportJson() {
    if (!CN.state.items.size) { $("#expMsg").textContent = CN.t("expNone"); return; }
    let appraisals = [];
    try { appraisals = (await CN.rt.db.collection("appr").get()).docs.map((d) => Object.assign({ id: d.id }, d.data())); } catch (e) { appraisals = []; }
    const data = { app: "cabinet-numismatique", version: 3, exportedAt: new Date().toISOString(), settings: CN.settings, items: [...CN.state.items.values()], appraisals };
    if (await save(`cabinet-sauvegarde-${day()}.json`, JSON.stringify(data))) CN.saveSettings({ lastBackup: Date.now() }).catch(() => {});
  }
  async function restore(file) {
    const m = $("#restMsg"); m.className = "msg"; m.textContent = "…";
    let d; try { d = JSON.parse(await file.text()); } catch (e) { d = null; }
    if (!d || d.app !== "cabinet-numismatique" || d.version !== 3 || !Array.isArray(d.items)) { m.className = "msg err"; m.textContent = CN.t("restoreBad"); return; }
    try {
      const S = CN.state; let nItems = 0;
      await writeBulk(({ edit }) => {
        const out = { newItems: [] };
        for (const raw of d.items) {
          const it = CN.normItem(raw); it.id = L.cleanId(it.id); if (!it.id) continue; nItems++;
          const cid = S.loc.get(it.id);
          if (cid) edit(cid)[it.id] = it; else out.newItems.push(it);
        }
        return out;
      }, (i, n) => { m.textContent = CN.t("impProgress", { i, n }); });
      let nA = 0;
      for (const a of Array.isArray(d.appraisals) ? d.appraisals : []) {
        if (!a || !a.item || !a.result || !/^[A-Za-z0-9_\-.~:@+]{1,120}$/.test(a.id || "")) continue;
        const doc = Object.assign({}, a); delete doc.id;
        try { await CN.addAppraisal(doc, a.id); nA++; } catch (e) { /* skip */ }
      }
      if (d.settings && typeof d.settings === "object") await CN.saveSettings({ refCur: d.settings.refCur || CN.settings.refCur, usdRate: d.settings.usdRate || CN.settings.usdRate, numCur: d.settings.numCur || CN.settings.numCur, numista: d.settings.numista || CN.settings.numista, nlang: d.settings.nlang || CN.settings.nlang });
      m.textContent = CN.t("restoreDone", { n: nItems, a: nA });
    } catch (e) { m.className = "msg err"; m.textContent = CN.t(CN.errKey(e)); }
  }

  CN.initIO = () => {
    const drop = $("#impDrop"), file = $("#impFile");
    file.addEventListener("change", () => { const f = file.files && file.files[0]; file.value = ""; if (f) onFile(f); });
    drop.addEventListener("dragover", (e) => { e.preventDefault(); drop.classList.add("drag"); });
    drop.addEventListener("dragleave", () => drop.classList.remove("drag"));
    drop.addEventListener("drop", (e) => { e.preventDefault(); drop.classList.remove("drag"); const f = [...(e.dataTransfer.files || [])][0]; if (f) onFile(f); });
    $("#expNumista").addEventListener("click", exportNumista);
    $("#expFull").addEventListener("click", exportFull);
    $("#expJson").addEventListener("click", exportJson);
    $("#restFile").addEventListener("change", (e) => { const f = e.target.files && e.target.files[0]; e.target.value = ""; if (f) restore(f); });
    CN.on("lang", renderStep);
    CN.on("runtime", renderStep);
    CN.on("items", () => { if (!I.running && I.parsed && !I.done) { const b = $("#impRun"); if (b) b.disabled = !(CN.rt.db && CN.state.owner && CN.state.ready); } });
  };
})();
