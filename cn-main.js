/* Cabinet Numismatique: boot, tabs, header controls, guide and settings dialogs, shortcuts, paste. */
(function () {
  "use strict";
  const CN = window.CN; const L = CN.logic; const { $, $$, h } = CN;
  const TABS = ["appraise", "collection", "buy", "dash", "import"];

  CN.go = (tab) => {
    if (!TABS.includes(tab)) tab = "appraise";
    for (const t of TABS) $("#v-" + t).hidden = t !== tab;
    for (const b of $$(".tab")) b.setAttribute("aria-selected", String(b.dataset.tab === tab));
    CN.tab = tab; CN.store.set("tab", tab);
    if (tab === "collection") CN.renderCollection();
    if (tab === "dash" && CN.renderDash) CN.renderDash();
    if (tab === "buy" && CN.renderBuy) { CN.renderBuy(); setTimeout(() => { const q = $("#bQ"); if (q && matchMedia("(pointer: fine)").matches) q.focus(); }, 40); }
    if (CN.hideTip) CN.hideTip();
    scrollTo({ top: 0 });
  };

  /* ---------- guide ---------- */
  let gTab = "grades";
  function renderGuide() {
    const body = $("#dlgGuideBody"); body.replaceChildren();
    const tabs = h("div", { class: "seg gtabs", role: "tablist" });
    for (const [k, key] of [["grades", "gdGrades"], ["value", "gdValue"], ["notes", "gdNotes"], ["gloss", "gdGloss"], ["keys", "gdKeys"]]) {
      tabs.append(h("button", { type: "button", role: "tab", "aria-pressed": String(gTab === k), onclick: () => { gTab = k; renderGuide(); } }, CN.t(key)));
    }
    body.append(tabs);
    const cards = (list) => h("div", { class: "gcards" }, list.map((x) => h("div", { class: "gcard" }, h("h3", {}, CN.tx(x.t)), h("p", {}, CN.tx(x.d)))));
    if (gTab === "grades") {
      body.append(h("div", { class: "gtbl" }, h("table", {},
        h("thead", {}, h("tr", {}, ["gdCode", "gdName", "gdCoinDesc", "gdNoteDesc"].map((k) => h("th", {}, CN.t(k))))),
        h("tbody", {}, L.GRADES.map((g) => { const i = CN.GRADE_INFO[g]; return h("tr", {}, h("td", { class: "c" }, g), h("td", {}, CN.tx(i.name)), h("td", {}, CN.tx(i.coin)), h("td", {}, CN.tx(i.note))); })))));
    } else if (gTab === "value") body.append(cards(CN.GUIDE_VALUE));
    else if (gTab === "notes") body.append(cards(CN.GUIDE_NOTES));
    else if (gTab === "gloss") body.append(cards(CN.GLOSSARY));
    else body.append(h("div", { class: "keys" },
      h("span", {}, h("kbd", {}, "N")), h("span", {}, CN.t("keyAppraise")),
      h("span", {}, h("kbd", {}, "/")), h("span", {}, CN.t("keySearch")),
      h("span", {}, h("kbd", {}, "Ctrl"), " + ", h("kbd", {}, "Enter")), h("span", {}, CN.t("keySubmit")),
      h("span", {}, h("kbd", {}, "Ctrl"), " + ", h("kbd", {}, "V")), h("span", {}, CN.t("keyPaste")),
      h("span", {}, h("kbd", {}, "Esc")), h("span", {}, CN.t("keyClose"))));
  }

  /* ---------- settings ---------- */
  async function renderSettings() {
    const s = CN.settings; const body = $("#dlgSetBody"); body.replaceChildren();
    const curs = [...new Set([s.refCur, s.numCur, "TND", "EUR", "USD", "MAD", "DZD", "EGP", "LYD", "GBP", "CHF", "CAD", "SAR", "AED"].filter(Boolean))];
    const cur = h("select", { id: "setCur" }, curs.map((c) => h("option", { value: c }, c))); cur.value = s.refCur;
    const rate = h("input", { type: "number", id: "setRate", step: "0.0001", min: "0", inputmode: "decimal" }); rate.value = String(s.usdRate);
    const rateUnit = h("span", { class: "mono" }, s.refCur);
    cur.addEventListener("change", () => { rateUnit.textContent = cur.value; rate.disabled = cur.value === "USD"; });
    rate.disabled = s.refCur === "USD";
    const nl = h("select", { id: "setNl" }, ["fr", "en", "es", "de", "it", "pt", "nl"].map((c) => h("option", { value: c }, c))); nl.value = s.nlang || "fr";
    const meter = h("div", { class: "stack" });
    const budget = h("input", { type: "number", id: "setBudget", step: "1", min: "0", inputmode: "decimal" }); budget.value = s.budget ? String(s.budget) : "";
    const dbl = h("input", { type: "number", id: "setDbl", step: "1", min: "0", inputmode: "decimal" }); dbl.value = String(s.dblMin == null ? 500 : s.dblMin);
    const url = h("input", { type: "url", id: "setUrl" }); url.value = s.appUrl || "";
    body.append(
      h("label", { class: "fld" }, h("span", { class: "lab" }, CN.t("setRefCur")), cur),
      h("div", { class: "fld" }, h("span", { class: "lab" }, CN.t("setRate"), h("button", { type: "button", class: "tipi", "data-tip": CN.t("setRateTip") }, "i")), h("div", { class: "idrow" }, rate, rateUnit)),
      h("label", { class: "fld" }, h("span", { class: "lab" }, CN.t("setNlang")), nl),
      h("div", { class: "fld" }, h("span", { class: "lab" }, CN.t("setBudget")), h("div", { class: "idrow" }, budget, h("span", { class: "mono" }, s.refCur))),
      h("div", { class: "fld" }, h("span", { class: "lab" }, CN.t("setDbl"), h("button", { type: "button", class: "tipi", "data-tip": CN.t("dblTip") }, "i")), h("div", { class: "idrow" }, dbl, h("span", { class: "mono" }, s.refCur))),
      h("label", { class: "fld" }, h("span", { class: "lab" }, CN.t("setUrl")), url),
      h("div", { class: "fld" }, h("span", { class: "lab" }, CN.t("setStorage")), meter),
      h("div", { class: "actions" }, h("button", { type: "button", class: "btn pri", onclick: async () => {
        const r = L.num(rate.value);
        try { await CN.saveSettings({ refCur: cur.value, usdRate: r && r > 0 ? r : s.usdRate, nlang: nl.value, budget: Math.max(0, L.num(budget.value) || 0), dblMin: Math.max(0, L.num(dbl.value) || 0), appUrl: url.value.trim().startsWith("https://") ? url.value.trim() : s.appUrl }); CN.toast(CN.t("setSaved")); CN.closeDialog("dlgSet"); }
        catch (e) { CN.toast(CN.t(CN.errKey(e)), true); }
      } }, CN.t("save"))));
    if (CN.rt.assets) {
      try {
        const u = (await CN.rt.assets.list()).usage;
        const pct = u.maxBytes ? Math.min(100, (u.bytes / u.maxBytes) * 100) : 0;
        meter.append(h("div", { class: "meter" }, h("i", { style: "width:" + pct.toFixed(1) + "%" })), h("span", { class: "hintline mono" }, (u.bytes / 1048576).toFixed(1) + " / " + (u.maxBytes / 1048576).toFixed(0) + " MB · " + u.files + " / " + u.maxFiles));
      } catch (e) { meter.append(h("span", { class: "hintline" }, "—")); }
    } else meter.append(h("span", { class: "hintline" }, CN.t("noAssets")));
  }

  /* ---------- header controls ---------- */
  function buildHeader() {
    const sel = $("#langSel");
    sel.replaceChildren(h("option", { value: "fr" }, "Français"), h("option", { value: "en" }, "English"), h("option", { value: "ar" }, "العربية"));
    sel.addEventListener("change", () => { CN.setLang(sel.value); });
    const th = $("#themeSeg"); th.replaceChildren();
    for (const [m, ic, key] of [["light", "sun", "themeLight"], ["dark", "moon", "themeDark"], ["auto", "auto", "themeAuto"]]) {
      th.append(h("button", { type: "button", "data-m": m, "data-tip-t": key, "data-aria-t": key, "aria-pressed": "false", html: CN.icon(ic), onclick: () => CN.setTheme(m) }));
    }
    for (const b of $$(".tab")) b.addEventListener("click", () => CN.go(b.dataset.tab));
    $("#btnGuide").addEventListener("click", () => { renderGuide(); CN.openDialog("dlgGuide"); });
    $("#btnSet").addEventListener("click", () => { renderSettings(); CN.openDialog("dlgSet"); });
    for (const d of $$("dialog.dlg")) {
      d.addEventListener("click", (e) => { if (e.target === d) CN.closeDialog(d.id); });
      const x = d.querySelector("[data-close]"); if (x) x.addEventListener("click", () => CN.closeDialog(d.id));
    }
    for (const el of $$("[data-icon]")) el.insertAdjacentHTML("afterbegin", CN.icon(el.dataset.icon));
  }

  /* ---------- shortcuts & paste ---------- */
  document.addEventListener("keydown", (e) => {
    const t = e.target; const typing = t && (/^(input|textarea|select)$/i.test(t.tagName) || t.isContentEditable);
    if (e.key === "Escape" && CN.drawerOpen && CN.drawerOpen() && !document.querySelector("dialog[open]")) { e.preventDefault(); CN.closeDrawer(); return; }
    if (typing || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === "/") { e.preventDefault(); CN.go("collection"); $("#cSearch").focus(); }
    else if (e.key === "n" || e.key === "N") { if (CN.drawerOpen()) return; e.preventDefault(); CN.go("appraise"); $("#apCountry").focus(); }
  });
  document.addEventListener("paste", (e) => {
    const item = [...((e.clipboardData && e.clipboardData.items) || [])].find((i) => i.kind === "file" && /^image\//.test(i.type));
    if (!item) return; const file = item.getAsFile(); if (!file) return;
    if (CN.drawerOpen()) { e.preventDefault(); CN.dr.paste(file); }
    else if (CN.tab === "appraise") { e.preventDefault(); CN.ap.paste(file); }
  });

  /* ---------- boot ---------- */
  function boot() {
    buildHeader();
    CN.setTheme(CN.store.get("theme", "light"));
    const nav = String(navigator.language || "fr").slice(0, 2);
    const lang = CN.store.get("lang", null) || (["fr", "en", "ar"].includes(nav) ? nav : "fr");
    $("#langSel").value = lang;
    CN.setLang(lang);
    CN.initAppraise(); CN.initCollection(); CN.initIO(); CN.initDash(); CN.initBuy(); CN.initLabels();
    CN.on("lang", () => { $("#langSel").value = CN.lang; if ($("#dlgGuide").open) renderGuide(); });
    CN.on("runtime", () => { $("#ownerNote").hidden = !CN.rt.db || CN.state.owner; });
    const hash = decodeURIComponent(location.hash.replace("#", ""));
    CN.go(TABS.includes(hash) ? hash : CN.store.get("tab", "appraise"));
    if (hash && !TABS.includes(hash)) {
      const tryOpen = () => { if (CN.state.items.has(hash)) { CN.go("collection"); CN.openItem(hash); return true; } return false; };
      let done = false; CN.on("items", () => { if (!done && CN.state.ready) done = tryOpen() || true; });
    }
    CN.runtimePromise = CN.initRuntime();
    CN.loadNumistaPhotos();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
