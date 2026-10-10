/* Cabinet Numismatique: buying mode (phone first): "do I have it?", quick add, recent purchases and budget. */
(function () {
  "use strict";
  const CN = window.CN; const L = CN.logic; const { $, h } = CN;
  const B = CN.buy = { kind: "note", grade: "", photo: null };
  const isoDay = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const today = () => isoDay(new Date());
  const norm = (x) => String(x || "").toLowerCase().replace(/[^a-z0-9.]/g, "");
  const base = (x) => norm(x).replace(/[a-z]+\d*$/, "");
  const owned = () => [...CN.state.items.values()].filter((it) => it.st === "col");

  /* "TN P# 86", "p60b", "km 104", "N# 202088", "202088", "afghanistan 500" */
  function parseQuery(q) {
    q = q.trim();
    let m = q.match(/(?:^|\s)(p|km|tbb|n|y)\s*#?\s*([0-9][\w.\/]*)/i);
    if (!m && /^\d{5,}$/.test(q)) m = [q, "n", q];
    if (!m) return { text: q };
    const idx = m.index != null ? m.index : 0;
    return { s: m[1].toLowerCase(), n: m[2], text: (q.slice(0, idx) + " " + q.slice(idx + m[0].length)).trim() };
  }
  function search(q) {
    const P = parseQuery(q); const terms = P.text.toLowerCase().split(/\s+/).filter(Boolean);
    const textOk = (it) => !terms.length || terms.every((t) => CN.hay(it).includes(t));
    const items = owned(); const exact = [], near = [];
    if (P.s) {
      for (const it of items) {
        if (!textOk(it)) continue;
        if (P.s === "n") { if (it.n === P.n.replace(/\D/g, "")) exact.push(it); continue; }
        const have = L.parseRefs(it.ref + ", " + it.refs);
        if (have.some((x) => x.s === P.s && norm(x.n) === norm(P.n))) exact.push(it);
        else if (have.some((x) => x.s === P.s && base(x.n) === base(P.n))) near.push(it);
      }
    } else if (terms.length) { for (const it of items) if (textOk(it)) { exact.push(it); if (exact.length >= 40) break; } }
    return { P, exact, near };
  }
  function row(it) {
    const est = CN.bestValue(it);
    return h("button", { type: "button", class: "rrow", onclick: () => CN.openItem(it.id) },
      h("div", { class: "th" }, CN.thumb(it)),
      h("div", { style: "min-width:0" }, h("div", { class: "t" }, CN.itemTitle(it)),
        h("div", { class: "m" }, h("span", { class: "mono" }, it.id), " · ", [it.country, it.gyear || it.year].filter(Boolean).join(" · "))),
      h("div", { class: "bmeta" }, CN.gradeChip(it.grade), (it.qty || 1) > 1 ? " ×" + it.qty : "",
        h("div", { class: "m" }, CN.t("bPaidEst", { p: it.buy != null ? CN.money(it.buy, CN.settings.numCur || CN.settings.refCur) : "—", e: est ? CN.money(est.v, CN.settings.refCur) : "—" }))));
  }
  function renderResults() {
    const box = $("#bRes"); const q = $("#bQ").value;
    if (!q.trim()) { box.replaceChildren(); return; }
    if (!CN.state.ready) { box.replaceChildren(h("p", { class: "muted" }, CN.t(CN.state.unavailable ? "unavailable" : "loadingColl"))); return; }
    const { P, exact, near } = search(q); const kids = [];
    if (exact.length) {
      const pieces = exact.reduce((a, it) => a + (it.qty || 1), 0);
      kids.push(h("div", { class: "bhave yes" }, CN.ic("check"), h("b", {}, CN.t(P.s ? "bHave" : "bMore", { n: pieces }))), h("div", { class: "blist" }, exact.slice(0, 40).map(row)));
    } else {
      const links = L.verifyLinks({ country: P.text, title: P.text, refMain: P.s ? P.s.toUpperCase() + "# " + P.n : "", n: P.s === "n" ? P.n.replace(/\D/g, "") : "", kind: B.kind }, CN.settings.nlang).filter((l) => ["numista", "ebay", "images"].includes(l.k));
      kids.push(h("div", { class: "bhave no" }, h("b", {}, CN.t("bNotHave"))), h("div", { class: "vlinks" }, links.map((l) => h("a", { class: "vchip", href: l.url, target: "_blank", rel: "noopener noreferrer" }, CN.ic("ext"), l.label))));
      if (P.s && P.s !== "n") { $("#bRefs").value = P.s.toUpperCase() + "# " + P.n; }
      if (P.s === "n") { $("#bRefs").value = "N# " + P.n.replace(/\D/g, ""); }
      if (P.text && !$("#bCountry").value) { const iso = L.isoOf(P.text); if (iso) $("#bCountry").value = P.text; }
    }
    if (near.length) kids.push(h("p", { class: "lab" }, CN.t("bNear")), h("div", { class: "blist" }, near.slice(0, 20).map(row)));
    box.replaceChildren(...kids);
  }

  /* quick add */
  function renderForm() {
    const kind = $("#bKind"); kind.replaceChildren();
    for (const [k, key] of [["note", "kNote"], ["coin", "kCoin"], ["other", "kOther"]]) {
      const inp = h("input", { type: "radio", name: "bKind", value: k }); inp.checked = B.kind === k;
      inp.addEventListener("change", () => { B.kind = k; });
      kind.append(h("label", {}, inp, CN.ic(k === "note" ? "note" : k === "other" ? "other" : "coin"), CN.t(key)));
    }
    const gr = $("#bGrades"); gr.replaceChildren();
    for (const g of [...L.GRADES, "?"]) {
      const info = CN.GRADE_INFO[g];
      gr.append(h("button", { type: "button", class: "gr", "aria-pressed": String(B.grade === g || (g === "?" && !B.grade)), "data-tip": info ? CN.tx(info.name) + " — " + CN.tx(B.kind === "note" ? info.note : info.coin) : CN.t("gUnsureTip"), onclick: () => { B.grade = g === "?" ? "" : g; renderForm(); } }, g));
    }
    const slot = $("#bPhoto"); slot.replaceChildren();
    const inp = h("input", { type: "file", accept: "image/*", capture: "environment", "aria-label": CN.t("bTake") });
    inp.addEventListener("change", () => { const f = inp.files && inp.files[0]; if (f) { if (B.photo) URL.revokeObjectURL(B.photo.url); B.photo = { file: f, url: URL.createObjectURL(f) }; renderForm(); } });
    slot.append(B.photo ? h("img", { src: B.photo.url, alt: "" }) : h("span", {}, CN.ic("image"), " ", CN.t("bTake")), inp);
    if (B.photo) slot.append(h("button", { type: "button", class: "x", "aria-label": CN.t("photoRemove"), html: CN.icon("close"), onclick: (e) => { e.preventDefault(); URL.revokeObjectURL(B.photo.url); B.photo = null; renderForm(); } }));
  }
  async function add(andAppraise) {
    const msg = $("#bMsg"); msg.className = "msg"; msg.textContent = "";
    const country = $("#bCountry").value.trim(), denom = $("#bDenom").value.trim(), refsIn = $("#bRefs").value.trim(), year = $("#bYear").value.trim();
    if (!country || (!denom && !refsIn)) { msg.className = "msg err"; msg.textContent = CN.t("bNeed"); return; }
    if (!CN.rt.db || !CN.state.owner) { msg.className = "msg err"; msg.textContent = CN.t(CN.rt.db ? "notOwner" : "unavailable"); return; }
    const parsed = L.parseRefs(refsIn);
    const n = ((parsed.find((r) => r.s === "n") || {}).n || "").replace(/\D/g, "");
    const ref = parsed.filter((r) => r.s !== "n").map((r) => (r.s.length <= 3 ? r.s.toUpperCase() : r.s) + "# " + r.n).join(", ");
    const kind = B.kind; const iso = L.isoOf(country) || L.fallbackIso(country);
    const gyear = /^\d{3,4}$/.test(year) ? year : "";
    const id = L.uniqueId(L.makeBaseId({ iso, kind, ref, refs: ref, n, gyear }), kind, gyear, (x) => CN.state.items.has(x));
    const price = L.num($("#bPrice").value);
    const item = CN.normItem({ id, iso, kind, st: "col", country, title: denom || ref, face: denom, ref, n, year, gyear, grade: B.grade, buy: price, place: $("#bSeller").value.trim(), store: $("#bStore").value.trim(), adate: today(), comment: $("#bNote").value.trim(), src: "manual", qty: 1 });
    const btns = [...document.querySelectorAll("#bForm .actions button")]; btns.forEach((b) => (b.disabled = true));
    try {
      if (B.photo) { try { item.imgs = [await CN.uploadImage(B.photo.file)]; } catch (e) { CN.toast(CN.t("imgFail"), true); } }
      await CN.saveItem(item);
      CN.toast(CN.t("bAdded", { id }));
      for (const f of ["bDenom", "bRefs", "bYear", "bPrice", "bNote"]) $("#" + f).value = "";
      if (B.photo) { URL.revokeObjectURL(B.photo.url); B.photo = null; }
      B.grade = ""; renderForm(); renderRecent();
      if (andAppraise) CN.appraiseItem(id);
    } catch (e) { msg.className = "msg err"; msg.textContent = CN.t(CN.errKey(e)); }
    finally { btns.forEach((b) => (b.disabled = false)); }
  }

  /* recent purchases and budget */
  function renderRecent() {
    const box = $("#bRecent"); if (!box) return;
    const t = today(), weekAgo = isoDay(new Date(Date.now() - 6 * 864e5)), month = t.slice(0, 7);
    const items = owned(); const nc = CN.settings.numCur || CN.settings.refCur;
    const sum = (f) => items.filter(f).reduce((a, it) => a + (it.buy || 0), 0);
    const sDay = sum((it) => it.adate === t), sWeek = sum((it) => it.adate >= weekAgo && it.adate <= t), sMonth = sum((it) => (it.adate || "").startsWith(month));
    const budget = Number(CN.settings.budget) || 0;
    const recent = items.filter((it) => it.adate >= weekAgo && it.adate <= t).sort((a, b) => (b.adate || "").localeCompare(a.adate || "") || b.cms - a.cms);
    box.replaceChildren(
      h("div", { class: "dtiles" },
        h("div", { class: "dtile" }, h("span", { class: "dt-l" }, CN.fmtDate(t)), h("b", { class: "dt-v" }, CN.money(sDay, nc))),
        h("div", { class: "dtile" }, h("span", { class: "dt-l" }, CN.t("bWeek")), h("b", { class: "dt-v" }, CN.money(sWeek, nc))),
        h("div", { class: "dtile" + (budget && sMonth > budget ? " over" : "") }, h("span", { class: "dt-l" }, CN.t("dThisMonth")), h("b", { class: "dt-v" }, CN.money(sMonth, nc)), h("span", { class: "dt-s" }, budget ? CN.t("dBudgetOf", { b: CN.money(budget, nc) }) : CN.t("dNoBudget")))),
      budget ? h("div", { class: "meter dbudget", "aria-hidden": "true" }, h("i", { style: "width:" + Math.min(100, (sMonth / budget) * 100) + "%" })) : null,
      recent.length ? h("div", { class: "blist" }, recent.slice(0, 30).map(row)) : h("p", { class: "muted" }, CN.t("bNoneRecent")));
  }

  CN.renderBuy = () => { renderForm(); renderResults(); renderRecent(); };
  CN.initBuy = () => {
    let t;
    $("#bQ").addEventListener("input", () => { clearTimeout(t); t = setTimeout(renderResults, 120); });
    $("#bForm").addEventListener("submit", (e) => { e.preventDefault(); add(false); });
    $("#bAddAppr").addEventListener("click", () => add(true));
    renderForm();
    let t2; CN.on("items", () => { clearTimeout(t2); t2 = setTimeout(() => { if (CN.tab === "buy") { renderResults(); renderRecent(); } }, 150); });
    CN.on("lang", () => { renderForm(); renderResults(); renderRecent(); });
    CN.on("settings", renderRecent);
  };
})();
