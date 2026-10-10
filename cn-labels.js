/* Cabinet Numismatique: printable PDF labels with a QR code that deep-links to the item (#ID). */
(function () {
  "use strict";
  const CN = window.CN; const { $, h } = CN;
  const LIBS = ["https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js", "https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js"];
  const FORMATS = { f1: { cols: 3, rows: 8, w: 70, h: 37, x0: 0, y0: 0.5 }, f2: { cols: 4, rows: 10, w: 52.5, h: 29.7, x0: 0, y0: 0 } };
  const MAX = 240;
  const S = { items: [], fmt: CN.store.get("lblFmt", "f1"), busy: false };
  let libs = null;
  function loadLibs() {
    if (window.jspdf && window.qrcode) return Promise.resolve();
    if (libs) return libs;
    libs = Promise.all(LIBS.map((src) => new Promise((res, rej) => { const s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = () => rej(new Error("script " + src)); document.head.append(s); })));
    libs.catch(() => { libs = null; });
    return libs;
  }
  const latin = (s) => String(s == null ? "" : s).normalize("NFD").replace(/\p{M}/gu, "").replace(/[^\x20-\x7E\xA0-\xFF]/g, "").replace(/\s+/g, " ").trim();
  function qrPng(text) {
    const qr = window.qrcode(0, "M"); qr.addData(text); qr.make();
    const n = qr.getModuleCount(), px = 4, c = document.createElement("canvas");
    c.width = c.height = n * px; const g = c.getContext("2d");
    g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); g.fillStyle = "#000";
    for (let r = 0; r < n; r++) for (let k = 0; k < n; k++) if (qr.isDark(r, k)) g.fillRect(k * px, r * px, px, px);
    return c.toDataURL("image/png");
  }
  async function makePdf(items, fmtKey) {
    await loadLibs();
    const F = FORMATS[fmtKey] || FORMATS.f1; const per = F.cols * F.rows;
    const doc = new window.jspdf.jsPDF({ unit: "mm", format: "a4" });
    const base = String(CN.settings.appUrl || "").replace(/#.*$/, "");
    const big = F.h > 33, pad = 2.5, qs = Math.min(F.h - 2 * pad, big ? 26 : 22);
    items.forEach((it, i) => {
      if (i && i % per === 0) doc.addPage();
      const k = i % per, x = F.x0 + (k % F.cols) * F.w, y = F.y0 + Math.floor(k / F.cols) * F.h;
      doc.addImage(qrPng(base + "#" + it.id), "PNG", x + F.w - pad - qs, y + (F.h - qs) / 2, qs, qs);
      const tw = F.w - 3 * pad - qs; let ty = y + pad + (big ? 3.6 : 3);
      doc.setFont("helvetica", "bold"); doc.setFontSize(big ? 10.5 : 8.5); doc.text(latin(it.id), x + pad, ty);
      doc.setFont("helvetica", "normal"); doc.setFontSize(big ? 8 : 6.6);
      const lh = big ? 3.4 : 2.8; ty += big ? 4.4 : 3.6;
      const title = doc.splitTextToSize(latin(CN.itemTitle(it)), tw).slice(0, 2); doc.text(title, x + pad, ty); ty += title.length * lh;
      const meta = doc.splitTextToSize(latin([it.country, it.gyear || it.year, it.grade].filter(Boolean).join(" · ")), tw)[0] || ""; doc.text(meta, x + pad, ty); ty += lh;
      const refs = doc.splitTextToSize(latin([it.ref || it.refs, it.n ? "N# " + it.n : ""].filter(Boolean).join(" · ")), tw)[0] || "";
      if (refs && ty < y + F.h - pad) { doc.setTextColor(90); doc.text(refs, x + pad, ty); doc.setTextColor(0); }
    });
    return doc.output("blob");
  }
  function render() {
    const body = $("#dlgLabelsBody"); body.replaceChildren();
    const n = Math.min(S.items.length, MAX);
    const fmt = h("div", { class: "pol", role: "radiogroup", "aria-label": CN.t("lblFormat") }, h("span", { class: "lab" }, CN.t("lblFormat")));
    for (const [k, key] of [["f1", "lblF1"], ["f2", "lblF2"]]) { const r = h("input", { type: "radio", name: "lblFmt", value: k }); r.checked = S.fmt === k; r.addEventListener("change", () => { S.fmt = k; CN.store.set("lblFmt", k); }); fmt.append(h("label", {}, r, CN.t(key))); }
    const msg = h("p", { class: "msg", id: "lblMsg", role: "status" });
    const go = h("button", { type: "button", class: "btn pri", disabled: !n || S.busy }, CN.ic("download"), CN.t("lblMake"));
    go.addEventListener("click", async () => {
      if (!CN.rt.dl) { msg.className = "msg err"; msg.textContent = CN.t("unavailable"); return; }
      S.busy = true; go.disabled = true; msg.className = "msg"; msg.textContent = CN.t("lblMaking");
      try {
        const blob = await makePdf(S.items.slice(0, MAX), S.fmt);
        await CN.rt.dl.save({ filename: "etiquettes-" + new Date().toISOString().slice(0, 10) + ".pdf", data: blob });
        msg.textContent = CN.t("lblDone");
      } catch (e) { if (!e || e.code !== "declined") { msg.className = "msg err"; msg.textContent = CN.t("lblFail") + (e && e.code === "extension_not_enabled" ? " (PDF)" : ""); } }
      finally { S.busy = false; go.disabled = false; }
    });
    body.append(h("p", {}, CN.t("lblCount", { n: CN.num(n, 0) })), S.items.length > MAX ? h("p", { class: "msg err" }, CN.t("lblMax", { n: MAX })) : null, fmt, h("p", { class: "hintline" }, CN.t("lblQrNote")), h("div", { class: "actions" }, go), msg);
  }
  CN.openLabels = (items) => { S.items = (items || []).slice(); render(); CN.openDialog("dlgLabels"); loadLibs().catch(() => {}); };
  CN.makeLabelsPdf = makePdf;
  CN.initLabels = () => { CN.on("lang", () => { if ($("#dlgLabels").open) render(); }); };
})();
