/* Cabinet Numismatique: collection view and item drawer. */
(function () {
  "use strict";
  const CN = window.CN; const L = CN.logic; const { $, $$, h } = CN;
  const C = CN.col = { q: "", kind: "all", f: { country: "", grade: "", store: "", place: "", st: "", exch: false, img: "", appr: false, issue: "" }, sort: CN.store.get("sort", "recent"), view: CN.store.get("view", "grid"), limit: 120, list: [] };
  const SORTS = [["recent", "sortRecent"], ["updated", "sortUpdated"], ["country", "sortCountry"], ["id", "sortId"], ["year", "sortYear"], ["value", "sortValue"], ["buy", "sortBuy"], ["gain", "sortGain"]];
  const coll = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
  const hayC = new Map();
  const hay = (it) => { const c = hayC.get(it.id); if (c && c.u === it.ums) return c.s; const s = CN.hay(it); hayC.set(it.id, { u: it.ums, s }); return s; };
  const yearNum = (it) => { const m = /\d{3,4}/.exec(it.gyear || it.year || ""); return m ? +m[0] : null; };

  function filtered() {
    const terms = C.q.trim().toLowerCase().split(/\s+/).filter(Boolean); const f = C.f; const out = [];
    for (const it of CN.state.items.values()) {
      if (C.kind !== "all" && it.kind !== C.kind) continue;
      if (f.country && it.country !== f.country) continue;
      if (f.grade && (it.grade || "∅") !== f.grade) continue;
      if (f.store && (it.store || "∅") !== f.store) continue;
      if (f.place && (it.place || "∅") !== f.place) continue;
      if (f.st && it.st !== f.st) continue;
      if (f.exch && !it.exch) continue;
      if (f.img) {
        const own = CN.hasOwnImg(it), num = !!CN.nphoto(it);
        if (f.img === "with" && !own && !num) continue;
        if (f.img === "without" && (own || num)) continue;
        if (f.img === "own" && !own) continue;
        if (f.img === "numista" && (own || !num)) continue;
      }
      if (f.appr && !it.ap) continue;
      if (f.issue && CN.ISSUES && CN.ISSUES[f.issue] && !CN.ISSUES[f.issue](it)) continue;
      if (terms.length) { const s = hay(it); if (!terms.every((t) => s.includes(t))) continue; }
      out.push(it);
    }
    const val = (it) => { const v = CN.itemValue(it); return v ? v.mid : null; };
    const desc = (a, b) => (a == null ? 1 : b == null ? -1 : b - a);
    const cmp = {
      recent: (a, b) => (b.adate || "").localeCompare(a.adate || "") || b.cms - a.cms,
      updated: (a, b) => b.ums - a.ums,
      country: (a, b) => coll.compare(a.country || "", b.country || "") || coll.compare(a.id, b.id),
      id: (a, b) => coll.compare(a.id, b.id),
      year: (a, b) => { const x = yearNum(a), y = yearNum(b); return x == null ? 1 : y == null ? -1 : x - y; },
      value: (a, b) => desc(val(a), val(b)),
      buy: (a, b) => desc(a.buy, b.buy),
      gain: (a, b) => desc(val(a) != null && a.buy != null ? val(a) - a.buy : null, val(b) != null && b.buy != null ? val(b) - b.buy : null),
    }[C.sort] || ((a, b) => 0);
    return out.sort(cmp);
  }

  /* ---------- toolbar ---------- */
  function renderKind() {
    const n = { all: 0, coin: 0, note: 0, other: 0 }; for (const it of CN.state.items.values()) { n.all++; n[it.kind] = (n[it.kind] || 0) + 1; }
    const box = $("#cKind"); box.replaceChildren();
    for (const [k, key] of [["all", "kAll"], ["coin", "kCoins"], ["note", "kNotes"], ["other", "kOthers"]]) {
      if (k === "other" && !n.other) continue;
      box.append(h("button", { type: "button", "aria-pressed": String(C.kind === k), onclick: () => { C.kind = k; C.limit = 120; renderAll(); } }, CN.t(key), h("span", { class: "mono muted", style: "font-size:.75rem" }, String(n[k] || 0))));
    }
  }
  function opts(field) {
    const m = new Map(); for (const it of CN.state.items.values()) { const v = it[field] || "∅"; m.set(v, (m.get(v) || 0) + 1); }
    return [...m.entries()].sort((a, b) => coll.compare(a[0], b[0]));
  }
  function renderFilters() {
    const body = $("#cFbody"); body.replaceChildren();
    const sel = (key, field, entries, label) => {
      const s = h("select", { "aria-label": CN.t(key) }, h("option", { value: "" }, CN.t("fltAny")), entries.map(([v, n]) => h("option", { value: v }, (label ? label(v) : v) + (n != null ? "  (" + n + ")" : ""))));
      s.value = C.f[field]; s.addEventListener("change", () => { C.f[field] = s.value; C.limit = 120; renderAll(); });
      return h("label", { class: "fld" }, h("span", { class: "lab" }, CN.t(key)), s);
    };
    body.append(
      sel("fltCountry", "country", opts("country").filter(([v]) => v !== "∅")),
      sel("fltGrade", "grade", [...L.GRADES.map((g) => [g, null]), ["∅", null]], (g) => (g === "∅" ? "—" : g + " · " + CN.tx(CN.GRADE_INFO[g].name))),
      sel("fltStore", "store", opts("store")),
      sel("fltPlace", "place", opts("place")),
      sel("fltStatus", "st", [["col", null], ["study", null], ["sold", null]], (v) => CN.t({ col: "stCol", study: "stStudy", sold: "stSold" }[v])),
      sel("fltImg", "img", [["with", null], ["without", null], ["own", null], ["numista", null]], imgLabel),
      sel("fltIssue", "issue", Object.keys(CN.ISSUE_LABEL || {}).map((k) => [k, null]), (v) => CN.t(CN.ISSUE_LABEL[v])));
    const chk = (key, field) => { const c = h("input", { type: "checkbox" }); c.checked = !!C.f[field]; c.addEventListener("change", () => { C.f[field] = c.checked; C.limit = 120; renderAll(); }); return h("label", { class: "chip" }, c, CN.t(key)); };
    body.append(h("div", { class: "fchecks" }, chk("fltExch", "exch"), chk("fltAppr", "appr"), h("button", { type: "button", class: "btn sm ghost", onclick: clearFilters }, CN.t("clearFilters"))));
  }
  function imgLabel(v) { return CN.t({ with: "fltImg", without: "fltNoImg", own: "fltOwnImg", numista: "fltNumImg" }[v] || "fltImg"); }
  function clearFilters() { C.f = { country: "", grade: "", store: "", place: "", st: "", exch: false, img: "", appr: false, issue: "" }; C.limit = 120; renderAll(); }
  function renderChips() {
    const box = $("#cChips"); box.replaceChildren(); let n = 0;
    const lab = { country: "fltCountry", grade: "fltGrade", store: "fltStore", place: "fltPlace", st: "fltStatus", img: "fltImg", exch: "fltExch", appr: "fltAppr", issue: "fltIssue" };
    for (const [k, v] of Object.entries(C.f)) {
      if (!v) continue; n++;
      let txt = typeof v === "boolean" ? CN.t(lab[k]) : CN.t(lab[k]) + " : " + (k === "st" ? CN.t({ col: "stCol", study: "stStudy", sold: "stSold" }[v]) : v === "∅" ? "—" : v);
      if (k === "img") txt = imgLabel(v);
      if (k === "issue") txt = CN.t("fltIssue") + " : " + CN.t((CN.ISSUE_LABEL || {})[v] || "fltIssue");
      box.append(h("button", { type: "button", class: "fchip", "aria-label": CN.t("clearFilters") + " : " + txt, onclick: () => { C.f[k] = typeof v === "boolean" ? false : ""; renderAll(); } }, txt, CN.ic("close")));
    }
    $("#cFbadge").textContent = n ? String(n) : "";
  }
  function renderSortView() {
    const s = $("#cSort"); s.replaceChildren(...SORTS.map(([v, k]) => h("option", { value: v }, CN.t(k)))); s.value = C.sort;
    const vb = $("#cView"); vb.replaceChildren();
    for (const [v, ic, k] of [["grid", "grid", "viewGrid"], ["list", "list", "viewList"]]) vb.append(h("button", { type: "button", "aria-pressed": String(C.view === v), "data-tip": CN.t(k), "aria-label": CN.t(k), html: CN.icon(ic), onclick: () => { C.view = v; CN.store.set("view", v); renderAll(); } }));
  }

  /* ---------- stats & results ---------- */
  function renderStats(list) {
    let qty = 0, buy = 0, est = 0, lo = 0, hi = 0, nAp = 0; const countries = new Set();
    for (const it of list) {
      qty += it.qty || 1; if (it.country) countries.add(it.country);
      if (typeof it.buy === "number") buy += it.buy; if (typeof it.est === "number") est += it.est;
      if (it.ap && typeof it.ap.lo === "number") { nAp++; lo += it.ap.lo; hi += typeof it.ap.hi === "number" ? it.ap.hi : it.ap.lo; }
    }
    const nc = CN.settings.numCur || CN.settings.refCur;
    const st = (k, v, small) => h("div", { class: "cstat", "data-tip": CN.t("stTip") }, h("span", {}, CN.t(k)), h("b", {}, v), small ? h("small", {}, small) : null);
    $("#cStats").replaceChildren(
      st("stItems", CN.num(list.length, 0)), st("stQty", CN.num(qty, 0)), st("stCountries", CN.num(countries.size, 0)),
      st("stBuy", CN.money(buy, nc)), st("stNumista", CN.money(est, nc)),
      st("stCabinet", nAp ? CN.range(CN.fromUSD(lo), CN.fromUSD(hi), null, true) : "—", CN.t("stAppraised", { n: nAp })));
  }
  function valueText(it) { const v = CN.itemValue(it); return v ? (v.src === "cabinet" ? CN.range(v.lo, v.hi, v.cur, true) : CN.money(v.mid, v.cur)) : ""; }
  function card(it) {
    return h("button", { type: "button", class: "card", onclick: () => CN.openItem(it.id) },
      h("div", { class: "cthumb" }, CN.thumb(it, true)),
      h("div", { class: "cbody" },
        h("div", { class: "cid" }, it.id),
        h("div", { class: "ctitle", title: CN.itemTitle(it) }, CN.itemTitle(it)),
        h("div", { class: "cmeta" }, h("span", {}, [it.country, it.gyear || it.year].filter(Boolean).join(" · ")), CN.gradeChip(it.grade)),
        h("div", { class: "cval" }, valueText(it), it.ap ? h("span", { class: "muted", "data-tip": CN.t("stCabinet") }, " ✦") : null)));
  }
  function table(list) {
    const nc = CN.settings.numCur || CN.settings.refCur;
    const head = [["", ""], ["fId", ""], ["fTitle", ""], ["fCountry", ""], ["fYear", ""], ["fGrade", ""], ["fQty", "n"], ["fBuy", "n"], ["fEst", "n"], ["stCabinet", "n"], ["fStore", ""]];
    return h("div", { class: "tblw" }, h("table", { class: "clist" },
      h("thead", {}, h("tr", {}, head.map(([k]) => h("th", { scope: "col" }, k ? CN.t(k) : "")))),
      h("tbody", {}, list.map((it) => h("tr", { tabindex: "0", onclick: () => CN.openItem(it.id), onkeydown: (e) => { if (e.key === "Enter") CN.openItem(it.id); } },
        h("td", {}, h("div", { class: "th" }, CN.thumb(it))), h("td", { class: "id" }, it.id), h("td", { class: "t" }, CN.itemTitle(it)),
        h("td", {}, it.country), h("td", {}, it.gyear || it.year), h("td", {}, CN.gradeChip(it.grade)), h("td", { class: "n" }, String(it.qty || 1)),
        h("td", { class: "n" }, typeof it.buy === "number" ? CN.money(it.buy, nc) : ""), h("td", { class: "n" }, typeof it.est === "number" ? CN.money(it.est, nc) : ""),
        h("td", { class: "n" }, it.ap && typeof it.ap.lo === "number" ? CN.range(CN.fromUSD(it.ap.lo), CN.fromUSD(it.ap.hi), null, true) : ""), h("td", {}, it.store))))));
  }
  let io = null;
  function renderResults() {
    const box = $("#cResults"); if (io) { io.disconnect(); io = null; }
    if (CN.state.unavailable) { box.replaceChildren(h("div", { class: "empty" }, CN.t("unavailable"))); return; }
    if (!CN.state.ready) { box.replaceChildren(h("div", { class: "empty" }, CN.t("loadingColl"))); return; }
    if (!CN.state.items.size) { box.replaceChildren(h("div", { class: "empty" }, h("p", {}, CN.t("emptyColl")), h("button", { type: "button", class: "btn pri", onclick: () => CN.go("import") }, CN.t("goImport")))); return; }
    const list = C.list; const shown = list.slice(0, C.limit);
    if (!list.length) { box.replaceChildren(h("div", { class: "empty" }, CN.t("noResults"), h("button", { type: "button", class: "btn sm", onclick: clearFilters }, CN.t("clearFilters")))); return; }
    const content = C.view === "list" ? table(shown) : h("div", { class: "cgrid" }, shown.map(card));
    const kids = [content];
    if (list.length > C.limit) {
      const more = h("div", { class: "more-row" }, h("button", { type: "button", class: "btn", onclick: () => { C.limit += 240; renderResults(); } }, CN.t("showMore"), " (" + (list.length - C.limit) + ")"));
      kids.push(more);
      if ("IntersectionObserver" in window) { io = new IntersectionObserver((en) => { if (en.some((e) => e.isIntersecting)) { C.limit += 240; renderResults(); } }, { rootMargin: "600px" }); setTimeout(() => io && io.observe(more), 50); }
    }
    if (CN.nph) kids.push(h("p", { class: "hintline nph-note" }, CN.t("nphNote")));
    box.replaceChildren(...kids);
  }
  function renderAll() {
    if (!$("#cResults")) return;
    C.list = filtered();
    renderKind(); renderChips(); renderStats(C.list); renderResults();
    $("#cCount").textContent = CN.t("results", { n: CN.num(C.list.length, 0) });
    if ($("#cFilters").open) renderFilters();
    $("#tabCount").textContent = CN.state.items.size ? String(CN.state.items.size) : "";
  }
  CN.renderCollection = renderAll;

  /* ---------- drawer ---------- */
  const D = CN.dr = { id: null, draft: null, isNew: false, tab: "sheet", dirty: false, cur: 0, apprs: null, confirm: null, warnClose: false, linkForm: false, busyImg: false };
  const FIELDS = [
    ["grpIdent", [["id", "fId", "id", "span2"], ["st", "fStatus", "status"], ["kind", "fKind", "kind"], ["country", "fCountry", "text"], ["iso", "fIso", "iso"], ["issuer", "fIssuer", "text"], ["ruler", "fRuler", "text"], ["title", "fTitle", "text", "span2"], ["face", "fFace", "text"], ["cur", "fCur", "text"], ["ntype", "fNtype", "text"], ["comp", "fComp", "text"], ["year", "fYearI", "text"], ["gyear", "fGyear", "text"], ["yrange", "fYrange", "text"], ["weight", "fWeight", "text"], ["ref", "fRef", "text"], ["refs", "fRefsI", "text"], ["n", "fN", "text"]]],
    ["grpSpecimen", [["grade", "fGrade", "grade"], ["qty", "fQty", "int"], ["serial", "fSerial", "text"], ["exch", "fExch", "bool"], ["comment", "fComment", "area", "span2"]]],
    ["grpAcq", [["buy", "fBuy", "money"], ["est", "fEst", "money"], ["adate", "fAdate", "date"], ["place", "fPlace", "list"], ["store", "fStore", "list", "span2"]]],
    ["grpNotes", [["pcom", "fPcom", "area", "span2"], ["pubcom", "fPubcom", "area", "span2"]]],
  ];
  CN.openItem = (id) => {
    const it = CN.state.items.get(id); if (!it) return;
    Object.assign(D, { id, draft: CN.normItem(it), isNew: false, tab: "sheet", dirty: false, cur: 0, apprs: null, confirm: null, warnClose: false, linkForm: false });
    showDrawer(); renderDrawer(); loadAppr();
  };
  CN.newItem = () => {
    Object.assign(D, { id: null, draft: CN.normItem({ kind: "coin", st: "col", src: "manual", cur: "" }), isNew: true, tab: "sheet", dirty: false, cur: 0, apprs: [], confirm: null, warnClose: false, linkForm: false });
    showDrawer(); renderDrawer(); setTimeout(() => { const el = $("#drawer [data-f='country']"); if (el) el.focus(); }, 50);
  };
  function showDrawer() { $("#drawer").hidden = false; $("#scrim").hidden = false; }
  CN.closeDrawer = (force) => {
    if (!force && D.dirty) { D.warnClose = true; renderFoot(); return; }
    $("#drawer").hidden = true; $("#scrim").hidden = true; D.id = null; D.draft = null;
  };
  CN.drawerOpen = () => !$("#drawer").hidden;
  async function loadAppr() { if (!D.id || !CN.rt.db) { D.apprs = []; return; } const id = D.id; try { const list = await CN.getAppraisals(id); if (D.id === id) { D.apprs = list; if (D.tab === "history") renderBody(); renderTabs(); } } catch (e) { D.apprs = []; } }
  function markDirty() { if (!D.dirty) { D.dirty = true; renderFoot(); } }

  function renderDrawer() {
    const it = D.draft; const dr = $("#drawer"); dr.replaceChildren();
    dr.append(h("header", { class: "dr-head" }, CN.kindIcon(it.kind),
      h("div", { class: "ttl" }, h("code", {}, it.id || CN.t("newItem")), h("h3", { id: "drTitle" }, CN.itemTitle(it) || "—")),
      !D.isNew ? h("button", { type: "button", class: "ibtn", "data-tip": CN.t("lblBtn"), "aria-label": CN.t("lblBtn"), html: CN.icon("tag"), onclick: () => CN.openLabels([CN.state.items.get(D.id)]) }) : null,
      !D.isNew ? h("button", { type: "button", class: "btn sm pri", onclick: () => { if (D.dirty) { D.warnClose = true; renderFoot(); return; } const id = D.id; CN.closeDrawer(true); CN.appraiseItem(id); } }, CN.ic("spark"), CN.t("btnAppraise")) : null,
      h("button", { type: "button", class: "ibtn", "aria-label": CN.t("close"), html: CN.icon("close"), onclick: () => CN.closeDrawer() })));
    dr.append(mediaEl());
    dr.append(h("div", { class: "dr-tabs", role: "tablist", id: "drTabs" }));
    dr.append(h("div", { class: "dr-body", id: "drBody" }));
    dr.append(h("footer", { class: "dr-foot", id: "drFoot" }));
    renderTabs(); renderBody(); renderFoot();
  }
  function renderTabs() {
    const box = $("#drTabs"); if (!box) return; box.replaceChildren();
    for (const [k, key] of [["sheet", "itemTabSheet"], ["history", "itemTabHistory"]]) {
      if (k === "history" && D.isNew) continue;
      const n = k === "history" ? (D.apprs ? D.apprs.length : (D.draft.ap && D.draft.ap.n) || 0) : null;
      box.append(h("button", { type: "button", role: "tab", "aria-selected": String(D.tab === k), onclick: () => { D.tab = k; renderTabs(); renderBody(); } }, CN.t(key), n != null ? " (" + n + ")" : ""));
    }
  }

  /* media: images + links */
  function mediaEl() {
    const it = D.draft; const imgs = it.imgs || []; const np = CN.nphoto(it);
    const media = imgs.map((id) => ({ t: "a", id })).concat(np ? ["o", "r"].filter((s) => np[s]).map((s) => ({ t: "n", s })) : []);
    const curM = media[D.cur] || media[0] || null; const cur = curM && curM.t === "a" ? curM.id : null;
    const cover = h("div", { class: "dr-cover dr-drop" }, curM ? (curM.t === "a" ? h("img", { src: CN.imgUrl(curM.id), alt: "" }) : CN.nphotoEl(it, curM.s)) : CN.thumb(it, true));
    const thumbs = h("div", { class: "dr-thumbs" }, media.map((m, i) => h("button", { type: "button", class: "dr-thumb", "aria-current": String(m === curM), "data-tip": m.t === "n" ? CN.t(m.s === "o" ? "nphObv" : "nphRev") + " · " + CN.nphCredit(it, m.s) : null, onclick: () => { D.cur = i; D.confirm = null; refreshMedia(); } }, m.t === "a" ? h("img", { src: CN.imgUrl(m.id), alt: "" }) : CN.nphotoEl(it, m.s))));
    if (CN.rt.assets) {
      const inp = h("input", { type: "file", accept: "image/jpeg,image/png,image/webp,image/gif", multiple: true, "aria-label": CN.t("imgAdd") });
      inp.addEventListener("change", async () => { for (const f of [...(inp.files || [])]) await addImage(f); });
      thumbs.append(h("label", { class: "dr-add", "data-tip": CN.t("imgAdd"), html: CN.icon("plus") }, inp));
    }
    const acts = h("div", { class: "dr-imgacts" });
    if (cur && CN.rt.assets) {
      if (D.cur > 0) acts.append(h("button", { type: "button", class: "btn sm", onclick: () => makeCover(D.cur) }, CN.t("imgMakeCover")));
      acts.append(D.confirm === "img:" + cur ? h("button", { type: "button", class: "btn sm danger", onclick: () => delImage(cur) }, CN.t("confirm")) : h("button", { type: "button", class: "btn sm ghost", onclick: () => { D.confirm = "img:" + cur; refreshMedia(); } }, CN.ic("trash"), CN.t("imgDelete")));
    }
    const side = h("div", { class: "dr-side" }, thumbs, acts,
      h("p", { class: "hintline" }, D.busyImg ? CN.t("imgUploading") : CN.rt.assets ? CN.t("imgPasteHint") : CN.t("noAssets")),
      curM && curM.t === "n" ? h("p", { class: "hintline" }, h("a", { href: "https://" + (CN.settings.nlang || "en") + ".numista.com/" + it.n, target: "_blank", rel: "noopener noreferrer" }, CN.nphCredit(it, curM.s))) : it.n && !np ? h("p", { class: "hintline" }, CN.t("imgNumistaHint")) : null, linksEl());
    const wrap = h("div", { class: "dr-media", id: "drMedia" }, cover, side);
    for (const el of [cover, wrap]) {
      el.addEventListener("dragover", (e) => { if (CN.rt.assets) { e.preventDefault(); cover.classList.add("drag"); } });
      el.addEventListener("dragleave", () => cover.classList.remove("drag"));
      el.addEventListener("drop", async (e) => { e.preventDefault(); cover.classList.remove("drag"); for (const f of [...(e.dataTransfer.files || [])].filter((x) => /^image\//.test(x.type))) await addImage(f); });
    }
    return wrap;
  }
  function refreshMedia() { const m = $("#drMedia"); if (m) m.replaceWith(mediaEl()); }
  function linksEl() {
    const it = D.draft;
    const r0 = L.parseRefs(it.refs)[0] || L.parseRefs(it.ref)[0];
    const auto = L.verifyLinks({ country: it.country, title: it.title || it.face, year: it.gyear || it.year, refMain: r0 ? r0.s.toUpperCase() + "# " + r0.n : "", n: it.n, kind: it.kind }, CN.settings.nlang).filter((l) => ["numista", "ebay", "images"].includes(l.k));
    const box = h("div", { class: "links" });
    for (const l of auto) box.append(h("span", { class: "lchip" }, h("a", { href: l.url, target: "_blank", rel: "noopener noreferrer" }, CN.ic("ext"), l.label)));
    (it.links || []).forEach((l, i) => box.append(h("span", { class: "lchip" }, h("a", { href: l.u, target: "_blank", rel: "noopener noreferrer" }, CN.ic("link"), l.l || l.u.replace(/^https?:\/\//, "").slice(0, 28)), h("button", { type: "button", "aria-label": CN.t("del"), onclick: () => setLinks(it.links.filter((_, j) => j !== i)) }, "×"))));
    if (!D.linkForm) box.append(h("button", { type: "button", class: "btn sm ghost", onclick: () => { D.linkForm = true; refreshMedia(); } }, CN.ic("plus"), CN.t("lnkAdd")));
    const out = h("div", { class: "stack" }, box);
    if (D.linkForm) {
      const lab = h("input", { type: "text", placeholder: CN.t("lnkLabelPh"), "aria-label": CN.t("lnkLabelPh") }); const url = h("input", { type: "url", placeholder: "https://…", "aria-label": "URL" });
      const err = h("p", { class: "msg err" });
      const add = () => { const u = url.value.trim(); if (!/^https:\/\/[^\s]+\.[^\s]+/.test(u)) { err.textContent = CN.t("lnkBad"); return; } D.linkForm = false; setLinks([...(it.links || []), { l: lab.value.trim().slice(0, 40), u: u.slice(0, 500) }]); };
      url.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); add(); } });
      out.append(h("div", { class: "lnkform" }, lab, url, h("button", { type: "button", class: "btn sm pri", onclick: add }, CN.t("save"))), err);
      setTimeout(() => lab.focus(), 30);
    }
    return out;
  }
  async function persistMedia(patch) {
    Object.assign(D.draft, patch);
    if (D.isNew) { markDirty(); refreshMedia(); return; }
    try { const base = CN.normItem(CN.state.items.get(D.id)); await CN.saveItem(Object.assign(base, patch)); } catch (e) { CN.toast(CN.t(CN.errKey(e)), true); }
    refreshMedia();
  }
  function setLinks(links) { persistMedia({ links }); }
  async function addImage(file) {
    if (!CN.rt.assets || !D.draft) return;
    D.busyImg = true; refreshMedia();
    try { const id = await CN.uploadImage(file); const imgs = [...(D.draft.imgs || []), id]; D.cur = imgs.length - 1; D.busyImg = false; await persistMedia({ imgs }); }
    catch (e) { D.busyImg = false; refreshMedia(); CN.toast(CN.t(e && e.code === "quota_or_state" ? "quota" : "imgFail"), true); }
  }
  D.paste = addImage;
  function makeCover(i) { const imgs = [...D.draft.imgs]; const [x] = imgs.splice(i, 1); imgs.unshift(x); D.cur = 0; persistMedia({ imgs }); }
  async function delImage(id) {
    D.confirm = null; const imgs = D.draft.imgs.filter((x) => x !== id); D.cur = 0;
    await persistMedia({ imgs });
    const usedElsewhere = [...CN.state.items.values()].some((o) => o.id !== D.id && (o.imgs || []).includes(id)) || (D.apprs || []).some((a) => (a.imgs || []).includes(id));
    if (!usedElsewhere && CN.rt.assets && !D.isNew) { try { await CN.rt.assets.delete(id); } catch (e) { /* ignore */ } }
  }

  /* sheet form */
  function input(f, type) {
    const it = D.draft; let el;
    const set = (v) => { it[f] = v; markDirty(); if (f === "title" || f === "face" || f === "cur") { const t = $("#drTitle"); if (t) t.textContent = CN.itemTitle(it) || "—"; } };
    if (type === "area") { el = h("textarea", { rows: "2", "data-f": f }); el.value = it[f] || ""; el.addEventListener("input", () => set(el.value)); }
    else if (type === "bool") { el = h("input", { type: "checkbox", "data-f": f }); el.checked = !!it[f]; el.addEventListener("change", () => set(el.checked)); }
    else if (type === "int" || type === "money") { el = h("input", { type: "number", step: type === "int" ? "1" : "0.01", min: "0", "data-f": f, inputmode: "decimal" }); el.value = it[f] == null ? "" : String(it[f]); el.addEventListener("input", () => { const v = L.num(el.value); set(type === "int" ? Math.max(1, Math.round(v || 1)) : v); }); }
    else if (type === "date") { el = h("input", { type: "date", "data-f": f }); el.value = /^\d{4}-\d{2}-\d{2}$/.test(it[f] || "") ? it[f] : ""; el.addEventListener("input", () => set(el.value)); }
    else if (type === "grade") { el = h("select", { "data-f": f }, h("option", { value: "" }, "—"), L.GRADES.map((g) => h("option", { value: g }, g + " · " + CN.tx(CN.GRADE_INFO[g].name)))); el.value = it[f] || ""; el.addEventListener("change", () => set(el.value)); }
    else if (type === "status") { el = h("select", { "data-f": f }, [["col", "stCol"], ["study", "stStudy"], ["sold", "stSold"]].map(([v, k]) => h("option", { value: v }, CN.t(k)))); el.value = it[f] || "col"; el.addEventListener("change", () => set(el.value)); }
    else if (type === "kind") { el = h("select", { "data-f": f }, [["coin", "kCoin"], ["note", "kNote"], ["other", "kOther"]].map(([v, k]) => h("option", { value: v }, CN.t(k)))); el.value = it[f] || "coin"; el.addEventListener("change", () => set(el.value)); }
    else if (type === "iso") { el = h("input", { type: "text", maxlength: "2", "data-f": f, class: "mono", style: "text-transform:uppercase" }); el.value = it[f] || ""; el.addEventListener("input", () => set(el.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 2))); }
    else if (type === "list") { el = h("input", { type: "text", "data-f": f, list: f === "store" ? "dlStore" : "dlPlace", autocomplete: "off" }); el.value = it[f] || ""; el.addEventListener("input", () => set(el.value)); }
    else { el = h("input", { type: "text", "data-f": f, autocomplete: "off" }); el.value = it[f] == null ? "" : String(it[f]); el.addEventListener("input", () => set(f === "n" ? el.value.replace(/\D/g, "") : el.value)); }
    return el;
  }
  function sheetForm() {
    const it = D.draft; const frag = [];
    const nc = CN.settings.numCur || CN.settings.refCur;
    if ((it.np && it.np.p && Object.keys(it.np.p).length) || it.mintage) frag.push(npBlock(it));
    for (const [gk, fields] of FIELDS) {
      const fs = h("fieldset", { class: "fgroup" }, h("legend", {}, CN.t(gk)));
      for (const [f, key, type, cls] of fields) {
        if (type === "id") {
          const inp = h("input", { type: "text", "data-f": "id", autocomplete: "off", spellcheck: "false" }); inp.value = it.id || "";
          inp.addEventListener("input", () => { it.id = inp.value; markDirty(); });
          const regen = h("button", { type: "button", class: "btn sm", "data-tip": CN.t("fIdTip"), onclick: () => { inp.value = it.id = L.uniqueId(L.makeBaseId({ iso: it.iso || L.isoOf(it.issuer, it.country) || L.fallbackIso(it.country), kind: it.kind, ref: it.ref, refs: it.refs, n: it.n, gyear: it.gyear }), it.kind, it.gyear, (x) => x !== D.id && CN.state.items.has(x)); markDirty(); } }, CN.ic("refresh"), CN.t("regenId"));
          fs.append(h("div", { class: "fld span2" }, h("span", { class: "lab" }, CN.t(key), h("button", { type: "button", class: "tipi", "data-tip": CN.t("fIdTip") }, "i")), h("div", { class: "idrow" }, inp, regen)));
          continue;
        }
        if (type === "bool") { fs.append(h("label", { class: "checkline" + (cls ? " " + cls : "") }, input(f, type), CN.t(key))); continue; }
        const label = type === "money" ? CN.t(key) + (nc ? " (" + nc + ")" : "") : CN.t(key);
        fs.append(h("label", { class: "fld" + (cls ? " " + cls : "") }, h("span", { class: "lab" }, label), input(f, type)));
      }
      frag.push(fs);
    }
    return frag;
  }
  function npBlock(it) {
    const box = h("div", { class: "npbox" });
    if (it.np && it.np.p && Object.keys(it.np.p).length) {
      box.append(h("span", { class: "lab" }, CN.t("npTitle")),
        h("div", { class: "nprow" }, L.GRADES.filter((g) => typeof it.np.p[g] === "number").map((g) => h("span", { class: "npc" + (g === it.grade ? " me" : ""), "data-tip": CN.tx(CN.GRADE_INFO[g].name) }, h("b", {}, g), CN.money(it.np.p[g], it.np.cur || CN.settings.refCur)))),
        h("p", { class: "hintline" }, CN.t("npDate", { d: CN.fmtDate(it.np.ms) })));
    }
    if (it.mintage) box.append(h("p", {}, h("span", { class: "lab" }, CN.t("fMintage")), " ", h("span", { class: "mono" }, CN.num(it.mintage, 0))));
    return box;
  }
  function historyEl() {
    if (!D.apprs) return [h("p", { class: "muted" }, CN.t("loadingColl"))];
    if (!D.apprs.length) return [h("div", { class: "empty" }, h("p", {}, CN.t("histEmpty")), h("button", { type: "button", class: "btn pri", onclick: () => { const id = D.id; CN.closeDrawer(true); CN.appraiseItem(id); } }, CN.ic("spark"), CN.t("btnAppraise")))];
    const out = [];
    const pts = D.apprs.filter((a) => a.result && typeof (a.result.value || {}).low === "number").map((a) => ({ ms: a.ms, lo: CN.fromUSD(a.result.value.low), hi: CN.fromUSD(a.result.value.high) })).sort((a, b) => a.ms - b.ms);
    if (pts.length) out.push(h("section", { class: "sh-sec" }, h("h4", {}, CN.t("histChart")), chart(pts)));
    out.push(h("div", { class: "hlist" }, D.apprs.map((a) => {
      const r = (a.tr && a.tr[CN.lang]) ? Object.assign({}, a.result, a.tr[CN.lang]) : a.result || {}; const v = r.value || {};
      return h("div", { class: "hrow" },
        h("div", { style: "min-width:0" }, h("div", { class: "d" }, CN.fmtDate(a.ms)), h("div", {}, CN.gradeChip(r.grade !== "?" ? r.grade : ""), " ", typeof v.low === "number" ? CN.range(CN.fromUSD(v.low), CN.fromUSD(v.high)) : CN.t("noValue"), " ", h("span", { class: "pill conf-" + r.confidence, style: "font-size:.72rem" }, CN.t("conf_" + (r.confidence || "low"))))),
        h("button", { type: "button", class: "btn sm", onclick: () => CN.viewAppraisal(a) }, CN.t("histView")),
        D.confirm === "ap:" + a.id ? h("button", { type: "button", class: "btn sm danger", onclick: () => delAppr(a.id) }, CN.t("confirm")) : h("button", { type: "button", class: "btn sm ghost", "aria-label": CN.t("del"), html: CN.icon("trash"), onclick: () => { D.confirm = "ap:" + a.id; renderBody(); } }));
    })));
    return out;
  }
  async function delAppr(aid) {
    D.confirm = null;
    try { await CN.deleteAppraisal(aid); D.apprs = D.apprs.filter((a) => a.id !== aid); await CN.recomputeAp(D.id); D.draft.ap = (CN.state.items.get(D.id) || {}).ap || null; renderTabs(); renderBody(); CN.toast(CN.t("deleted")); }
    catch (e) { CN.toast(CN.t(CN.errKey(e)), true); }
  }
  function chart(pts) {
    const W = 560, H = 170, pl = 52, pr = 12, pt = 12, pb = 26;
    const est = D.draft.est; const sameCur = !CN.settings.numCur || CN.settings.numCur === CN.settings.refCur;
    const maxV = Math.max(...pts.map((p) => p.hi), typeof est === "number" && sameCur ? est : 0) * 1.12 || 1;
    const t0 = pts[0].ms, t1 = pts[pts.length - 1].ms; const span = t1 - t0 || 1;
    const x = (ms) => (pts.length === 1 ? (pl + W - pr) / 2 : pl + ((ms - t0) / span) * (W - pl - pr));
    const y = (v) => pt + (1 - v / maxV) * (H - pt - pb);
    const ns = "http://www.w3.org/2000/svg"; const el = (tag, a, txt) => { const e = document.createElementNS(ns, tag); for (const [k, v] of Object.entries(a)) e.setAttribute(k, v); if (txt != null) e.textContent = txt; return e; };
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, class: "hchart", role: "img", "aria-label": CN.t("histChart") });
    for (const f of [0, 0.5, 1]) { const yy = y(maxV * f); svg.append(el("line", { x1: pl, x2: W - pr, y1: yy, y2: yy, class: "grid" }), el("text", { x: pl - 6, y: yy + 3, "text-anchor": "end" }, CN.money(maxV * f, CN.settings.refCur, true))); }
    if (pts.length > 1) {
      const band = pts.map((p) => `${x(p.ms)},${y(p.hi)}`).join(" ") + " " + pts.slice().reverse().map((p) => `${x(p.ms)},${y(p.lo)}`).join(" ");
      svg.append(el("polygon", { points: band, class: "band" }), el("polyline", { points: pts.map((p) => `${x(p.ms)},${y((p.lo + p.hi) / 2)}`).join(" "), class: "mid" }));
    } else svg.append(el("rect", { x: x(pts[0].ms) - 6, y: y(pts[0].hi), width: 12, height: Math.max(2, y(pts[0].lo) - y(pts[0].hi)), class: "band" }));
    if (typeof est === "number" && sameCur) svg.append(el("line", { x1: pl, x2: W - pr, y1: y(est), y2: y(est), class: "nline" }), el("text", { x: W - pr, y: y(est) - 4, "text-anchor": "end" }, CN.t("histNumista") + " " + CN.money(est, CN.settings.refCur, true)));
    pts.forEach((p, i) => svg.append(el("circle", { cx: x(p.ms), cy: y((p.lo + p.hi) / 2), r: 4, class: "dot" + (i === pts.length - 1 ? " last" : "") })));
    svg.append(el("text", { x: pl, y: H - 6 }, CN.fmtDate(t0)));
    if (pts.length > 1) svg.append(el("text", { x: W - pr, y: H - 6, "text-anchor": "end" }, CN.fmtDate(t1)));
    return svg;
  }
  function renderBody() { const b = $("#drBody"); if (!b) return; b.replaceChildren(...(D.tab === "history" ? historyEl() : sheetForm())); }
  function renderFoot() {
    const f = $("#drFoot"); if (!f) return; f.replaceChildren();
    const status = h("span", { class: "grow", id: "drMsg" }, D.dirty ? CN.t("unsaved") : "");
    f.append(status);
    if (D.warnClose) f.append(h("button", { type: "button", class: "btn sm ghost", onclick: () => { D.dirty = false; CN.closeDrawer(true); } }, CN.t("close") + " ×"));
    if (!D.isNew) f.append(D.confirm === "item" ? h("button", { type: "button", class: "btn sm danger", onclick: delItem }, CN.t("confirmDeleteItem")) : h("button", { type: "button", class: "btn sm ghost", onclick: () => { D.confirm = "item"; renderFoot(); } }, CN.ic("trash"), CN.t("btnDeleteItem")));
    if (D.dirty) f.append(h("button", { type: "button", class: "btn sm", onclick: () => (D.isNew ? CN.closeDrawer(true) : CN.openItem(D.id)) }, CN.t("cancel")));
    f.append(h("button", { type: "button", class: "btn sm pri", disabled: !D.dirty && !D.isNew, onclick: save }, CN.ic("check"), CN.t("save")));
  }
  async function save() {
    const it = D.draft; it.id = L.cleanId(it.id); const msg = $("#drMsg");
    if (!it.id) { msg.textContent = CN.t("idEmpty"); return; }
    if ((D.isNew || it.id !== D.id) && CN.state.items.has(it.id)) { msg.textContent = CN.t("idTaken"); return; }
    if (!it.iso) it.iso = L.isoOf(it.issuer, it.country) || "";
    try {
      await CN.saveItem(it, D.isNew ? null : D.id);
      Object.assign(D, { id: it.id, isNew: false, dirty: false, warnClose: false, draft: CN.normItem(CN.state.items.get(it.id) || it) });
      renderDrawer(); CN.toast(CN.t("saved"));
    } catch (e) { msg.textContent = CN.t(CN.errKey(e)); }
  }
  async function delItem() {
    const id = D.id; D.confirm = null;
    try { await CN.deleteItem(id); CN.closeDrawer(true); CN.toast(CN.t("deleted")); } catch (e) { CN.toast(CN.t(CN.errKey(e)), true); renderFoot(); }
  }
  function renderDatalists() {
    const fill = (id, field) => { const dl = $("#" + id); if (dl) dl.replaceChildren(...opts(field).filter(([v]) => v !== "∅").map(([v]) => h("option", { value: v }))); };
    fill("dlStore", "store"); fill("dlPlace", "place");
  }

  /* ---------- init ---------- */
  CN.initCollection = () => {
    let t;
    $("#cSearch").addEventListener("input", (e) => { clearTimeout(t); t = setTimeout(() => { C.q = e.target.value; C.limit = 120; renderAll(); }, 140); });
    $("#cSort").addEventListener("change", (e) => { C.sort = e.target.value; CN.store.set("sort", C.sort); renderAll(); });
    $("#cFilters").addEventListener("toggle", () => { if ($("#cFilters").open) renderFilters(); });
    document.addEventListener("click", (e) => { const d = $("#cFilters"); if (d.open && !d.contains(e.target)) d.open = false; });
    $("#cNew").addEventListener("click", () => CN.newItem());
    $("#cLabels").addEventListener("click", () => CN.openLabels(C.list));
    $("#scrim").addEventListener("click", () => CN.closeDrawer());
    renderSortView(); renderAll();
    let it2;
    CN.on("items", () => { clearTimeout(it2); it2 = setTimeout(() => { renderAll(); renderDatalists(); }, 60); });
    CN.on("lang", () => { renderSortView(); renderAll(); if (CN.drawerOpen()) renderDrawer(); });
    CN.on("settings", () => { renderAll(); if (CN.drawerOpen()) renderDrawer(); });
    CN.on("nphotos", () => { renderAll(); if (CN.drawerOpen()) refreshMedia(); });
  };
})();
