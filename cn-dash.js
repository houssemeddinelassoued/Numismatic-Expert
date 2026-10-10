/* Cabinet Numismatique: dashboard. One filter row (period, kind) scopes every tile, chart and table below it.
   Charts: single series in --viz-1, polarity in the blue/red diverging pair, the map in a sequential blue ramp.
   Every chart has a hover/focus tooltip and a table view. */
(function () {
  "use strict";
  const CN = window.CN; const L = CN.logic; const { $, h } = CN;
  const DS = CN.dash = { period: CN.store.get("dPeriod", "all"), kind: "all", tbl: {}, surplus: true };
  const CONT = {
    EU: "ADALATAXBABEBGBYCHCYCZDEDKEEESFIFOFRGBGGGIGRHRHUIEIMISITJELILTLULVMCMDMEMKMTNLNOPLPTRORSSESISJSKSMUAVAXK",
    AS: "AEAFAMAZBDBHBNBTCCCNCXGEHKIDILINIOIQIRJOJPKGKHKPKRKWKZLALBLKMMMNMOMVMYNPOMPHPKPSQARUSASGSYTHTJTMTRTWUZVNYE",
    NA: "AGAIAWBBBLBMBQBSBZCACRCUCWDMDOGDGLGPGTHNHTJMKNKYLCMFMQMSMXNIPAPMPRSVSXTCTTUSVCVGVI",
    AF: "AOBFBIBJBWCDCFCGCICMCVDJDZEGEHERETGAGHGMGNGQGWKEKMLRLSLYMAMGMLMRMUMWMZNANENGRERWSCSDSHSLSNSOSSSTSZTDTGTNTZUGYTZAZMZW",
    AN: "AQBVGSHMTF", SA: "ARBOBRCLCOECFKGFGYPEPYSRUYVE", OC: "ASAUCKFJFMGUKIMHMPNCNFNRNUNZPFPGPNPWSBTKTLTOTVUMVUWFWS",
  };
  const CONT_OF = {};
  for (const [c, s] of Object.entries(CONT)) for (let i = 0; i < s.length; i += 2) CONT_OF[s.slice(i, i + 2)] = c;
  Object.assign(CONT_OF, { RU: "EU", SU: "EU", YU: "EU", CS: "EU", DD: "EU", XT: "EU", XU: "EU", EU: "EU", XK: "EU", OT: "AS", XS: "AS", XI: "AS", AB: "AS", XA: "AF", XO: "AF", XW: "AF", XG: "AF", XM: "AF", RH: "AF", ZR: "AF", XB: "AF", XR: "NA", XD: "NA", AN: "NA" });
  const ERAS = [["e1", -1e9, 1799], ["e2", 1800, 1899], ["e3", 1900, 1945], ["e4", 1946, 1999], ["e5", 2000, 1e9]];
  const GRANK = { G: 1, VG: 2, F: 3, VF: 4, XF: 5, AU: 6, UNC: 7 };
  let WORLD = null, worldTried = false;

  /* ---------- helpers ---------- */
  const loc = () => ({ fr: "fr-FR", en: "en-US", ar: "ar-TN" }[CN.lang] || "fr-FR");
  const money = (v) => CN.money(v, CN.settings.refCur);
  const moneyC = (v) => CN.money(v, CN.settings.refCur, true);
  const intf = (v) => CN.num(v, 0);
  const pct = (v) => new Intl.NumberFormat(loc(), { style: "percent", maximumFractionDigits: 0, signDisplay: "exceptZero" }).format(v);
  const pctU = (v) => new Intl.NumberFormat(loc(), { style: "percent", maximumFractionDigits: 0 }).format(v);
  const isoDay = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const today = () => isoDay(new Date());
  const yearOf = (it) => { const m = /\d{3,4}/.exec(it.gyear || it.year || ""); return m ? +m[0] : null; };
  const estOf = (it) => { if (it.np && it.np.p && it.grade && typeof it.np.p[it.grade] === "number") return it.np.p[it.grade]; return typeof it.est === "number" ? it.est : null; };
  const regionName = (code) => { try { return new Intl.DisplayNames([CN.lang], { type: "region", fallback: "none" }).of(code) || null; } catch (e) { return null; } };
  function niceMax(m) { if (!(m > 0)) return 1; const p = Math.pow(10, Math.floor(Math.log10(m))); for (const s of [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (s * p >= m) return s * p; return 10 * p; }
  function range(p) {
    const now = new Date();
    if (p === "year") return [now.getFullYear() + "-01-01", today()];
    const days = { "12m": 365, "90": 90, "30": 30 }[p];
    return days ? [isoDay(new Date(now - days * 864e5)), today()] : null;
  }
  function prevRange(r) {
    if (!r) return null;
    const a = new Date(r[0] + "T12:00:00"), b = new Date(r[1] + "T12:00:00"), span = b - a;
    return [isoDay(new Date(a - span - 864e5)), isoDay(new Date(a - 864e5))];
  }
  const inRange = (it, r) => !r || (it.adate && it.adate >= r[0] && it.adate <= r[1]);

  /* ---------- small components ---------- */
  function card(titleKey, opts, ...body) {
    opts = opts || {};
    const head = h("div", { class: "dc-head" }, h("h3", {}, CN.t(titleKey)));
    let content = body;
    if (opts.table) {
      const key = titleKey; const showT = !!DS.tbl[key];
      head.append(h("button", { type: "button", class: "btn sm ghost", "aria-pressed": String(showT), onclick: () => { DS.tbl[key] = !DS.tbl[key]; render(); } }, CN.t(showT ? "dChart" : "dTable")));
      content = showT ? [opts.table] : body;
    }
    return h("section", { class: "panel dcard " + (opts.span || "s12") }, head, opts.note ? h("p", { class: "dc-note" }, opts.note) : null, ...content);
  }
  function table(heads, rows, onRow) {
    return h("div", { class: "dtbl" }, h("table", {},
      h("thead", {}, h("tr", {}, heads.map(([k, n]) => h("th", { class: n ? "n" : null, scope: "col" }, CN.t(k))))),
      h("tbody", {}, rows.map((r) => h("tr", onRow ? { tabindex: "0", class: "click", onclick: () => onRow(r), onkeydown: (e) => { if (e.key === "Enter") onRow(r); } } : {}, r.cells.map((c, i) => h("td", { class: heads[i] && heads[i][1] ? "n" : null }, c)))))));
  }
  function tile(label, value, sub, tip, cls) {
    return h("div", { class: "dtile" + (cls ? " " + cls : ""), "data-tip": tip || null }, h("span", { class: "dt-l" }, label), h("b", { class: "dt-v" }, value), sub ? h("span", { class: "dt-s" }, sub) : null);
  }
  function hbars(rows, fmt, onClick) {
    const mx = Math.max(1e-9, ...rows.map((r) => r.v));
    return h("div", { class: "hb" }, rows.map((r) => h("div", {
      class: "hb-row" + (onClick ? " click" : ""), tabindex: "0", "data-tip": r.tip || r.label + " · " + fmt(r.v),
      onclick: onClick ? () => onClick(r) : null, onkeydown: onClick ? (e) => { if (e.key === "Enter") onClick(r); } : null,
    }, h("span", { class: "hb-l", title: r.label }, r.label), h("span", { class: "hb-t" }, h("i", { style: "width:" + Math.max(0.6, (r.v / mx) * 100) + "%" })), h("span", { class: "hb-v" }, fmt(r.v)))));
  }
  function columns(rows, budget) {
    const mx = niceMax(Math.max(1, budget || 0, ...rows.map((r) => r.v)));
    const iMax = rows.reduce((b, r, i) => (r.v > rows[b].v ? i : b), 0), iLast = rows.length - 1;
    const plot = h("div", { class: "cols-plot" });
    for (const f of [0.5, 1]) plot.append(h("div", { class: "cols-grid", style: "bottom:" + f * 100 + "%" }, h("span", {}, moneyC(mx * f))));
    if (budget) plot.append(h("div", { class: "cols-budget", style: "bottom:" + Math.min(100, (budget / mx) * 100) + "%" }, h("span", {}, CN.t("dBudgetLine") + " · " + moneyC(budget))));
    plot.append(h("div", { class: "cols-bars" }, rows.map((r, i) => h("div", { class: "col", tabindex: "0", "data-tip": r.tip },
      (i === iMax || (i === iLast && r.v / mx > 0.12)) && r.v ? h("em", { style: "bottom:" + (r.v / mx) * 100 + "%" }, moneyC(r.v)) : null,
      h("i", { style: "height:" + (r.v ? Math.max(0.8, (r.v / mx) * 100) : 0) + "%" })))));
    const step = Math.max(1, Math.ceil(rows.length / 6));
    return h("div", { class: "cols" }, plot, h("div", { class: "cols-axis" }, rows.map((r, i) => h("span", {}, i % step === 0 || i === iLast ? r.label : ""))));
  }
  function diverging(rows, fmt) {
    const mx = Math.max(0.05, ...rows.map((r) => Math.abs(r.v)));
    return h("div", { class: "dv" },
      h("div", { class: "dv-legend" }, h("span", { class: "key neg" }, CN.t("dBelow")), h("span", { class: "key pos" }, CN.t("dAbove"))),
      rows.map((r) => {
        const w = (Math.abs(r.v) / mx) * 50;
        return h("div", { class: "dv-row", tabindex: "0", "data-tip": r.tip },
          h("span", { class: "dv-l", title: r.label }, r.label),
          h("span", { class: "dv-t" }, h("b", { class: "dv-mid" }), h("i", { class: r.v < 0 ? "neg" : "pos", style: (r.v < 0 ? "inset-inline-end:50%;" : "inset-inline-start:50%;") + "width:" + Math.max(0.6, w) + "%" })),
          h("span", { class: "dv-v" }, fmt(r.v)));
      }));
  }
  function lineChart(pts) {
    const W = 600, H = 150, n = pts.length, my = niceMax(Math.max(1, ...pts.map((p) => p.y)));
    const X = (i) => (n === 1 ? W / 2 : (i / (n - 1)) * W), Y = (v) => H - (v / my) * H;
    const d = pts.map((p, i) => (i ? "L" : "M") + X(i).toFixed(1) + "," + Y(p.y).toFixed(1)).join("");
    const ns = "http://www.w3.org/2000/svg"; const mk = (t, a) => { const e = document.createElementNS(ns, t); for (const [k, v] of Object.entries(a)) e.setAttribute(k, v); return e; };
    const svg = mk("svg", { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: "none", class: "ln-svg", "aria-hidden": "true" });
    svg.append(mk("path", { d: d + `L${X(n - 1)},${H}L${X(0)},${H}Z`, class: "ln-area" }), mk("path", { d, class: "ln-line", "vector-effect": "non-scaling-stroke" }));
    const last = pts[n - 1];
    return h("div", { class: "ln" },
      h("div", { class: "ln-plot" },
        h("div", { class: "cols-grid", style: "bottom:50%" }, h("span", {}, intf(my / 2))), h("div", { class: "cols-grid", style: "bottom:100%" }, h("span", {}, intf(my))),
        svg, h("span", { class: "ln-dot", style: `inset-inline-start:${(X(n - 1) / W) * 100}%;bottom:${(last.y / my) * 100}%` }), h("em", { class: "ln-end", style: `bottom:${(last.y / my) * 100}%` }, intf(last.y)),
        h("div", { class: "ln-hit" }, pts.map((p) => h("span", { tabindex: "0", "data-tip": p.label + " · " + intf(p.y) })))),
      h("div", { class: "cols-axis" }, pts.map((p, i) => h("span", {}, i === 0 || i === n - 1 || i % Math.max(1, Math.ceil(n / 6)) === 0 ? p.label : ""))));
  }
  async function loadWorld() { if (worldTried) return; worldTried = true; try { const r = await fetch("data/world.json"); if (r.ok) { WORLD = await r.json(); render(); } } catch (e) { /* map unavailable */ } }
  function mapEl(counts) {
    if (!WORLD) { loadWorld(); return h("p", { class: "dc-note" }, "…"); }
    const vals = Object.entries(counts).filter(([k]) => WORLD.paths[k]).map(([, v]) => v).sort((a, b) => a - b);
    const q = (f) => vals[Math.min(vals.length - 1, Math.floor(f * vals.length))] || 1;
    const th = [...new Set([q(0.2), q(0.4), q(0.6), q(0.8)])].filter((x) => x > 0);
    const cls = (v) => (v ? 1 + th.filter((t) => v > t).length : 0);
    const ns = "http://www.w3.org/2000/svg"; const mk = (t, a) => { const e = document.createElementNS(ns, t); for (const [k, v] of Object.entries(a)) e.setAttribute(k, v); return e; };
    const svg = mk("svg", { viewBox: `0 0 ${WORLD.w} ${WORLD.h}`, class: "map-svg", role: "img", "aria-label": CN.t("dMap") });
    svg.append(mk("path", { d: WORLD.sphere, class: "map-sphere" }));
    for (const [code, d] of Object.entries(WORLD.paths)) {
      const n = counts[code] || 0; const p = mk("path", { d, class: "mc" + cls(n) });
      p.setAttribute("data-tip", (regionName(code) || code) + " · " + intf(n)); svg.append(p);
    }
    const edges = [0, ...th]; const keys = [h("span", { class: "mk" }, h("i", { class: "mc0" }), "0")];
    for (let i = 0; i < edges.length; i++) { const lo = edges[i] + 1, hi = th[i]; keys.push(h("span", { class: "mk" }, h("i", { class: "mc" + (i + 1) }), hi != null ? (lo === hi ? intf(lo) : intf(lo) + "–" + intf(hi)) : "> " + intf(edges[i]))); }
    return h("div", { class: "map" }, svg, h("div", { class: "map-legend" }, keys));
  }

  /* ---------- swaps (shared with the collection export) ---------- */
  CN.swapList = (withSurplus) => {
    const col = [...CN.state.items.values()].filter((it) => it.st === "col");
    const out = []; const seen = new Set();
    for (const it of col) if (it.exch) { out.push({ it, qty: it.qty || 1, why: "marked" }); seen.add(it.id); }
    const groups = new Map(); for (const it of col) { const k = it.n || it.id; (groups.get(k) || groups.set(k, []).get(k)).push(it); }
    let types = 0, extra = 0;
    for (const g of groups.values()) {
      const pieces = g.reduce((a, x) => a + (x.qty || 1), 0); if (pieces < 2) continue;
      types++; extra += pieces - 1;
      if (!withSurplus) continue;
      g.sort((a, b) => (GRANK[b.grade] || 0) - (GRANK[a.grade] || 0) || (b.buy || 0) - (a.buy || 0));
      g.forEach((x, i) => { const q = i === 0 ? (x.qty || 1) - 1 : x.qty || 1; if (q > 0 && !seen.has(x.id)) out.push({ it: x, qty: q, why: "surplus" }); });
    }
    return { list: out, marked: col.filter((x) => x.exch).length, types, extra };
  };
  function swapCSV() {
    const { list } = CN.swapList(DS.surplus); const nl = CN.settings.nlang || "en";
    const rows = [["N#", "Numista", "Country", "Title", "Year", "Grade", "Quantity", "References", "Cabinet ID", "Reason"]];
    for (const { it, qty, why } of list) rows.push([it.n ? "N# " + it.n : "", it.n ? `https://${nl}.numista.com/${it.n}` : "", it.country, it.title, it.gyear || it.year, it.grade, qty, [it.ref, it.refs].filter(Boolean).join(" / "), it.id, why]);
    return "﻿" + L.toCSV(rows);
  }
  function swapText() {
    return CN.swapList(DS.surplus).list.map(({ it, qty }) => [it.n ? "N# " + it.n : it.id, it.country, it.title, it.gyear || it.year, it.grade, qty > 1 ? "×" + qty : ""].filter(Boolean).join(" · ")).join("\n");
  }
  async function exportSwaps(btn) {
    if (!CN.rt.dl) { CN.toast(CN.t("unavailable"), true); return; }
    try { await CN.rt.dl.save({ filename: "liste-echange-" + today() + ".csv", data: swapCSV() }); CN.toast(CN.t("expDone")); }
    catch (e) { if (!e || e.code !== "declined") CN.toast(CN.t("expFail"), true); }
  }
  function copySwaps(holder) {
    const text = swapText();
    const fallback = () => { const ta = h("textarea", { class: "swap-text", rows: "6", readonly: true }); ta.value = text; holder.replaceChildren(ta); ta.focus(); ta.select(); CN.toast(CN.t("xCopyFail"), true); };
    try { navigator.clipboard.writeText(text).then(() => CN.toast(CN.t("xCopied")), fallback); } catch (e) { fallback(); }
  }

  /* ---------- data quality ---------- */
  CN.ISSUES = {
    noGrade: (it) => !it.grade,
    noEst: (it) => !CN.bestValue(it),
    noBuy: (it) => it.buy == null,
    noDate: (it) => !it.adate,
    future: (it) => !!it.adate && it.adate > today(),
    noStore: (it) => !it.store,
    noPhoto: (it) => !(it.imgs && it.imgs.length),
  };
  const ISSUE_LABEL = { noGrade: "qNoGrade", noEst: "qNoEst", noBuy: "qNoBuy", noDate: "qNoDate", future: "qFuture", noStore: "qNoStore", noPhoto: "qNoPhoto" };
  CN.ISSUE_LABEL = ISSUE_LABEL;

  /* ---------- render ---------- */
  function filterRow() {
    const per = h("div", { class: "seg", role: "group", "aria-label": CN.t("dPeriod") });
    for (const [k, key] of [["all", "dAll"], ["12m", "d12m"], ["year", "dYear"], ["90", "d90"], ["30", "d30"]]) per.append(h("button", { type: "button", "aria-pressed": String(DS.period === k), onclick: () => { DS.period = k; CN.store.set("dPeriod", k); render(); } }, CN.t(key)));
    const kind = h("div", { class: "seg", role: "group", "aria-label": CN.t("fKind") });
    for (const [k, key] of [["all", "kAll"], ["coin", "kCoins"], ["note", "kNotes"], ["other", "kOthers"]]) kind.append(h("button", { type: "button", "aria-pressed": String(DS.kind === k), onclick: () => { DS.kind = k; render(); } }, CN.t(key)));
    return h("div", { class: "dfilters" }, h("span", { class: "lab" }, CN.t("dPeriod")), per, kind);
  }
  function notices() {
    const s = CN.settings; const out = [];
    const last = s.lastBackup || 0;
    if (!last || Date.now() - last > 30 * 864e5) out.push(h("div", { class: "dnote warn" }, h("span", {}, CN.t("dBackup", { d: last ? CN.fmtDate(last) : CN.t("dNever") }), " · ", CN.t("dBackupOld")), h("button", { type: "button", class: "btn sm", onclick: () => CN.go("import") }, CN.t("dBackupNow"))));
    if (s.nsync && s.nsync.ms) out.push(h("div", { class: "dnote" }, h("span", {}, CN.t("dSync", { d: CN.fmtDate(s.nsync.ms), n: intf(s.nsync.items || 0), p: intf(s.nsync.prices || 0) }), " ", h("span", { class: "muted" }, CN.t("dSyncHow")))));
    return out;
  }
  function render() {
    const box = $("#dashBody"); if (!box || CN.tab !== "dash") return;
    if (CN.state.unavailable) { box.replaceChildren(h("div", { class: "empty" }, CN.t("unavailable"))); return; }
    if (!CN.state.ready) { box.replaceChildren(h("div", { class: "empty" }, CN.t("loadingColl"))); return; }
    const col = [...CN.state.items.values()].filter((it) => it.st === "col" && (DS.kind === "all" || it.kind === DS.kind));
    if (!col.length) { box.replaceChildren(filterRow(), h("div", { class: "empty" }, h("p", {}, CN.t("dEmpty")), h("button", { type: "button", class: "btn pri", onclick: () => CN.go("import") }, CN.t("goImport")))); return; }
    const r = range(DS.period), pr = prevRange(r);
    const items = col.filter((it) => inRange(it, r));
    const kids = [filterRow(), ...notices()];
    if (!items.length) { box.replaceChildren(...kids, h("div", { class: "empty" }, CN.t("dNoData"))); return; }
    const sum = (arr, f) => arr.reduce((a, x) => a + (f(x) || 0), 0);

    /* figures */
    let value = 0, nValued = 0; for (const it of items) { const b = CN.bestValue(it); if (b) { value += b.v * (it.qty || 1); nValued++; } }
    const cost = sum(items, (it) => it.buy);
    const pairs = items.filter((it) => typeof it.buy === "number" && it.buy > 0 && estOf(it) > 0);
    const pB = sum(pairs, (it) => it.buy), pE = sum(pairs, estOf);
    const spentPrev = pr ? sum(col.filter((it) => inRange(it, pr)), (it) => it.buy) : null;
    const nBuy = items.filter((it) => typeof it.buy === "number").length;
    const month = today().slice(0, 7); const spentMonth = sum(col.filter((it) => (it.adate || "").startsWith(month)), (it) => it.buy);
    const budget = Number(CN.settings.budget) || 0;
    const countries = new Set(items.map((it) => it.iso || it.country)).size;
    const pieces = sum(items, (it) => it.qty || 1);
    kids.push(h("section", { class: "dhero s12" },
      h("div", { class: "dh-main", "data-tip": CN.t("dHeroTip") }, h("span", { class: "dt-l" }, CN.t("dHero")), h("b", { class: "dh-v" }, money(value)), h("span", { class: "dt-s" }, CN.t("dHeroSub", { n: intf(nValued), t: intf(items.length), c: money(cost) }))),
      h("div", { class: "dtiles" },
        tile(CN.t("dItems"), intf(items.length), CN.t("dPieces", { n: intf(pieces) })),
        tile(CN.t("dCountriesN"), intf(countries)),
        tile(CN.t("dSpent"), money(cost), spentPrev != null && spentPrev > 0 ? CN.t("dVsPrev", { d: pct((cost - spentPrev) / spentPrev) }) : null),
        tile(CN.t("dAvgPrice"), nBuy ? money(cost / nBuy) : "—"),
        tile(CN.t("dPremium"), pE ? pct((pB - pE) / pE) : "—", pairs.length ? CN.t("dOnN", { n: intf(pairs.length) }) : null, CN.t("dPremiumTip")),
        tile(CN.t("dThisMonth"), money(spentMonth), budget ? CN.t("dBudgetOf", { b: money(budget) }) : CN.t("dNoBudget"), null, budget && spentMonth > budget ? "over" : ""),
      ),
      budget ? h("div", { class: "meter dbudget", "aria-hidden": "true" }, h("i", { style: "width:" + Math.min(100, (spentMonth / budget) * 100) + "%" })) : null));

    /* spending per month */
    const months = new Map();
    const tday = today();
    for (const it of items) { if (!it.adate || it.buy == null || it.adate > tday) continue; const m = it.adate.slice(0, 7); const e = months.get(m) || { v: 0, n: 0 }; e.v += it.buy; e.n++; months.set(m, e); }
    const mk = [...months.keys()].sort();
    if (mk.length) {
      const all = []; let [y, mo] = mk[0].split("-").map(Number); const [y2, m2] = mk[mk.length - 1].split("-").map(Number);
      while (y < y2 || (y === y2 && mo <= m2)) { all.push(y + "-" + String(mo).padStart(2, "0")); mo++; if (mo > 12) { mo = 1; y++; } }
      const rows = all.slice(-24).map((m) => { const e = months.get(m) || { v: 0, n: 0 }; const lab = new Intl.DateTimeFormat(loc(), { month: "short", year: "2-digit" }).format(new Date(m + "-15T12:00:00")); return { label: lab, v: e.v, n: e.n, tip: lab + " · " + money(e.v) + " · " + CN.t("dPieces", { n: intf(e.n) }) }; });
      kids.push(card("dMonthly", { span: "s8", note: CN.t("dMonthlyNote"), table: table([["thMonth"], ["thSpent", 1], ["thItems", 1]], rows.slice().reverse().map((x) => ({ cells: [x.label, money(x.v), intf(x.n)] }))) }, columns(rows, budget)));
    }

    /* kinds as figures */
    const byKind = { note: 0, coin: 0, other: 0 }; for (const it of items) byKind[it.kind] = (byKind[it.kind] || 0) + 1;
    kids.push(card("dKinds", { span: "s4" }, h("div", { class: "dtiles one" }, tile(CN.t("kNotes"), intf(byKind.note), pctU(byKind.note / items.length)), tile(CN.t("kCoins"), intf(byKind.coin), pctU(byKind.coin / items.length)), byKind.other ? tile(CN.t("kOthers"), intf(byKind.other), pctU(byKind.other / items.length)) : null)));

    /* sellers */
    const sellers = new Map();
    for (const it of items) { const k = it.place || ""; const e = sellers.get(k) || { n: 0, spent: 0, nb: 0, pb: 0, pe: 0 }; e.n++; if (typeof it.buy === "number") { e.spent += it.buy; e.nb++; } const es = estOf(it); if (typeof it.buy === "number" && it.buy > 0 && es > 0) { e.pb += it.buy; e.pe += es; } sellers.set(k, e); }
    const sl = [...sellers.entries()].map(([k, e]) => ({ k, label: k || CN.t("dUnknown"), ...e, gap: e.pe ? (e.pb - e.pe) / e.pe : null })).sort((a, b) => b.spent - a.spent);
    const divRows = sl.filter((s) => s.k && s.gap != null && s.n >= 5).slice(0, 12).map((s) => ({ label: s.label, v: s.gap, tip: s.label + " · " + pct(s.gap) + " · " + CN.t("dPieces", { n: intf(s.n) }) + " · " + money(s.spent) }));
    if (sl.length) kids.push(card("dSellers", { note: CN.t("dSellersNote"), table: table([["thSeller"], ["thItems", 1], ["thSpent", 1], ["thAvg", 1], ["thGap", 1], ["thShare", 1]], sl.map((s) => ({ s, cells: [s.label, intf(s.n), money(s.spent), s.nb ? money(s.spent / s.nb) : "—", s.gap != null ? pct(s.gap) : "—", cost ? pctU(s.spent / cost) : "—"] })), (row) => showPlace(row.s.k)) },
      divRows.length ? diverging(divRows, pct) : h("p", { class: "dc-note" }, "—")));

    /* growth */
    if (mk.length > 1) {
      const allM = []; let [y, mo] = mk[0].split("-").map(Number); const [y2, m2] = mk[mk.length - 1].split("-").map(Number);
      while (y < y2 || (y === y2 && mo <= m2)) { allM.push(y + "-" + String(mo).padStart(2, "0")); mo++; if (mo > 12) { mo = 1; y++; } }
      const shownM = allM.slice(-36); const first = shownM[0] + "-01";
      let acc = col.filter((it) => it.adate && it.adate < first).length; const pts = [];
      const perMonth = new Map(); for (const it of items) if (it.adate && it.adate <= tday) { const m = it.adate.slice(0, 7); perMonth.set(m, (perMonth.get(m) || 0) + 1); }
      for (const m of shownM) { acc += perMonth.get(m) || 0; pts.push({ label: new Intl.DateTimeFormat(loc(), { month: "short", year: "2-digit" }).format(new Date(m + "-15T12:00:00")), y: acc }); }
      kids.push(card("dGrowth", { span: "s6", note: CN.t("dGrowthNote"), table: table([["thMonth"], ["thItems", 1]], pts.slice().reverse().map((p) => ({ cells: [p.label, intf(p.y)] }))) }, lineChart(pts)));
    }

    /* grades */
    const gr = {}; for (const it of items) gr[it.grade || "∅"] = (gr[it.grade || "∅"] || 0) + 1;
    const gRows = [...L.GRADES, "∅"].filter((g) => gr[g]).map((g) => ({ g, label: g === "∅" ? CN.t("dUnknown") : g + " · " + CN.tx(CN.GRADE_INFO[g].name), v: gr[g] }));
    kids.push(card("dGrades", { span: "s6", table: table([["fGrade"], ["thCount", 1], ["thShare", 1]], gRows.map((x) => ({ cells: [x.label, intf(x.v), pctU(x.v / items.length)] }))) }, hbars(gRows, intf, (row) => showFilter({ grade: row.g }))));

    /* map + continents */
    const byIso = {}; for (const it of items) if (it.iso) byIso[it.iso] = (byIso[it.iso] || 0) + 1;
    const hist = new Map(); for (const it of items) if (it.iso && WORLD && !WORLD.paths[it.iso]) { const k = it.issuer || it.country || it.iso; hist.set(k, (hist.get(k) || 0) + 1); }
    const cRows = Object.entries(byIso).sort((a, b) => b[1] - a[1]).map(([c, n]) => ({ cells: [regionName(c) || c, c, intf(n)] }));
    kids.push(card("dMap", { note: CN.t("dMapNote"), table: table([["fCountry"], ["fIso"], ["thCount", 1]], cRows) }, mapEl(byIso),
      hist.size ? h("div", { class: "dhist" }, h("span", { class: "lab" }, CN.t("dHistoric")), h("div", { class: "chips" }, [...hist.entries()].sort((a, b) => b[1] - a[1]).map(([k, n]) => h("button", { type: "button", class: "chip", onclick: () => showSearch(k) }, k + " · " + intf(n))))) : null));
    const cont = {}; for (const it of items) { const c = CONT_OF[it.iso] || "XX"; cont[c] = (cont[c] || 0) + 1; }
    const contRows = Object.entries(cont).sort((a, b) => b[1] - a[1]).map(([c, n]) => ({ label: CN.t("c" + c), v: n }));
    kids.push(card("dContinents", { span: "s6", table: table([["dContinents"], ["thCount", 1], ["thShare", 1]], contRows.map((x) => ({ cells: [x.label, intf(x.v), pctU(x.v / items.length)] }))) }, hbars(contRows, intf)));

    /* top countries */
    const byCountry = new Map(); for (const it of items) { const k = it.country || CN.t("dUnknown"); const e = byCountry.get(k) || { n: 0, v: 0 }; e.n++; const b = CN.bestValue(it); if (b) e.v += b.v * (it.qty || 1); byCountry.set(k, e); }
    const ctr = [...byCountry.entries()].sort((a, b) => b[1].n - a[1].n);
    kids.push(card("dCountries", { span: "s6", table: table([["fCountry"], ["thCount", 1], ["thValue", 1]], ctr.map(([k, e]) => ({ k, cells: [k, intf(e.n), money(e.v)] })), (row) => showFilter({ country: row.k })) },
      hbars(ctr.slice(0, 15).map(([k, e]) => ({ k, label: k, v: e.n, tip: k + " · " + intf(e.n) + " · " + money(e.v) })), intf, (row) => showFilter({ country: row.k }))));

    /* eras + albums */
    const eras = {}; for (const it of items) { const y = yearOf(it); const e = y == null ? "e0" : ERAS.find(([, a, b]) => y >= a && y <= b)[0]; eras[e] = (eras[e] || 0) + 1; }
    const eRows = ["e1", "e2", "e3", "e4", "e5", "e0"].filter((k) => eras[k]).map((k) => ({ label: CN.t(k), v: eras[k] }));
    kids.push(card("dEras", { span: "s6", table: table([["dEras"], ["thCount", 1]], eRows.map((x) => ({ cells: [x.label, intf(x.v)] }))) }, hbars(eRows, intf)));
    const alb = new Map(); for (const it of items) { const k = it.store || ""; const e = alb.get(k) || { n: 0, v: 0 }; e.n++; const b = CN.bestValue(it); if (b) e.v += b.v * (it.qty || 1); alb.set(k, e); }
    const aRows = [...alb.entries()].sort((a, b) => b[1].n - a[1].n).map(([k, e]) => ({ k, label: k || CN.t("dUnknown"), v: e.n, tip: (k || CN.t("dUnknown")) + " · " + intf(e.n) + " · " + money(e.v), val: e.v }));
    kids.push(card("dAlbums", { span: "s6", table: table([["fStore"], ["thCount", 1], ["thValue", 1]], aRows.map((x) => ({ x, cells: [x.label, intf(x.v), money(x.val)] })), (row) => showFilter({ store: row.x.k || "∅" })) }, hbars(aRows, intf, (row) => showFilter({ store: row.k || "∅" }))));

    /* deals */
    const withGap = pairs.map((it) => ({ it, d: estOf(it) - it.buy }));
    const dealRow = (x) => ({ id: x.it.id, cells: [h("span", { class: "mono" }, x.it.id), CN.itemTitle(x.it), money(x.it.buy), money(estOf(x.it)), money(x.d)] });
    const dHeads = [["fId"], ["fTitle"], ["thPaid", 1], ["thEst", 1], ["thDiff", 1]];
    kids.push(card("dDeals", { span: "s6" }, table(dHeads, withGap.filter((x) => x.d > 0).sort((a, b) => b.d - a.d).slice(0, 10).map(dealRow), (row) => CN.openItem(row.id))));
    kids.push(card("dOverpaid", { span: "s6" }, table(dHeads, withGap.filter((x) => x.d < 0).sort((a, b) => a.d - b.d).slice(0, 10).map(dealRow), (row) => CN.openItem(row.id))));

    /* value concentration + top items */
    const valued = items.map((it) => ({ it, v: (CN.bestValue(it) || { v: 0 }).v * (it.qty || 1) })).filter((x) => x.v > 0).sort((a, b) => b.v - a.v);
    if (valued.length) {
      const k = Math.max(1, Math.round(valued.length * 0.1)); const topV = valued.slice(0, k).reduce((a, x) => a + x.v, 0); const tot = valued.reduce((a, x) => a + x.v, 0);
      kids.push(card("dTopValue", { span: "s6", note: CN.t("dConcentration", { p: "10", v: Math.round((topV / tot) * 100) }) },
        table([["fId"], ["fTitle"], ["fGrade"], ["thValue", 1]], valued.slice(0, 12).map((x) => ({ id: x.it.id, cells: [h("span", { class: "mono" }, x.it.id), CN.itemTitle(x.it), x.it.grade || "—", money(x.v)] })), (row) => CN.openItem(row.id))));
    }
    /* rarity */
    const rare = items.filter((it) => typeof it.mintage === "number" && it.mintage > 0).sort((a, b) => a.mintage - b.mintage);
    if (rare.length) kids.push(card("dRarity", { span: "s6", note: CN.t("dRarityNote", { n: intf(rare.length) }) },
      table([["fId"], ["fTitle"], ["fYear"], ["thMintage", 1]], rare.slice(0, 12).map((it) => ({ id: it.id, cells: [h("span", { class: "mono" }, it.id), CN.itemTitle(it), it.gyear || it.year, intf(it.mintage)] })), (row) => CN.openItem(row.id))));

    /* data quality */
    const q = Object.keys(CN.ISSUES).map((k) => [k, items.filter(CN.ISSUES[k]).length]).filter(([, n]) => n);
    kids.push(card("dQuality", { span: "s6" }, q.length ? h("div", { class: "qlist" }, q.map(([k, n]) => h("div", { class: "qrow" }, h("span", {}, CN.t(ISSUE_LABEL[k])), h("b", {}, intf(n)), h("button", { type: "button", class: "btn sm", onclick: () => showFilter({ issue: k }) }, CN.t("qSee"))))) : h("p", { class: "dc-note" }, CN.t("qAllGood"))));

    /* swaps */
    const sw = CN.swapList(DS.surplus); const holder = h("div", {});
    const inc = h("input", { type: "checkbox" }); inc.checked = DS.surplus; inc.addEventListener("change", () => { DS.surplus = inc.checked; render(); });
    kids.push(card("dExchange", { span: "s6" },
      h("div", { class: "dtiles" }, tile(CN.t("xMarked"), intf(sw.marked)), tile(CN.t("xDup"), intf(sw.types)), tile(CN.t("xExtra"), intf(sw.extra), null, CN.t("xExtraTip"))),
      h("label", { class: "checkline" }, inc, CN.t("xInclude")),
      h("div", { class: "actions" }, h("button", { type: "button", class: "btn sm", onclick: () => showFilter({ exch: true }) }, CN.t("qSee")), h("button", { type: "button", class: "btn sm", onclick: (e) => exportSwaps(e.currentTarget) }, CN.ic("download"), CN.t("xExport")), h("button", { type: "button", class: "btn sm", onclick: () => copySwaps(holder) }, CN.t("xCopy"))),
      holder));

    box.replaceChildren(...kids);
  }
  function showFilter(f) {
    CN.col.f = Object.assign({ country: "", grade: "", store: "", place: "", st: "", exch: false, img: "", appr: false, issue: "" }, f);
    CN.col.kind = DS.kind; CN.col.limit = 120; CN.go("collection");
  }
  function showPlace(k) { showFilter({ place: k || "∅" }); }
  function showSearch(q) { showFilter({}); CN.col.q = q; const s = $("#cSearch"); if (s) s.value = q; CN.renderCollection(); }
  CN.renderDash = render;
  CN.initDash = () => {
    let t; const later = () => { clearTimeout(t); t = setTimeout(render, 120); };
    CN.on("items", later); CN.on("lang", render); CN.on("settings", render); CN.on("nphotos", () => {});
  };
})();
