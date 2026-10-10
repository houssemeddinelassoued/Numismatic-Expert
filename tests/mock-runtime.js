/* Local preview runtime: an in-memory stand-in for the claude.ai capabilities (db, user, downloads, sample, assets).
   Used by tests/preview.html and the end-to-end test. Not part of the published page. */
(function () {
  "use strict";
  const clone = (x) => JSON.parse(JSON.stringify(x));
  function makeDb() {
    const docs = new Map(); const listeners = [];
    const merge = (t, s) => { for (const [k, v] of Object.entries(s)) { if (v && typeof v === "object" && !Array.isArray(v) && t[k] && typeof t[k] === "object" && !Array.isArray(t[k])) merge(t[k], v); else t[k] = clone(v); } return t; };
    const colOf = (p) => p.split("/").slice(0, -1).join("/");
    const notify = () => setTimeout(() => listeners.slice().forEach((l) => l()), 0);
    const snap = (p) => { const d = docs.get(p); return { id: p.split("/").pop(), exists: !!d, data: () => (d ? clone(d) : undefined), metadata: { fromCache: false, hasPendingWrites: false } }; };
    function query(cp, filters = [], order = null, lim = null) {
      const run = () => {
        let l = [...docs.keys()].filter((p) => colOf(p) === cp).map(snap);
        for (const [f, op, v] of filters) l = l.filter((s) => (op === "==" ? s.data()[f] === v : true));
        if (order) l.sort((a, b) => { const x = a.data()[order[0]], y = b.data()[order[0]]; return (x > y ? 1 : x < y ? -1 : 0) * (order[1] === "desc" ? -1 : 1); });
        if (lim) l = l.slice(0, lim);
        return { docs: l, size: l.length, empty: !l.length, docChanges: () => [], metadata: {} };
      };
      return {
        where: (f, o, v) => query(cp, [...filters, [f, o, v]], order, lim), orderBy: (f, d = "asc") => query(cp, filters, [f, d], lim), limit: (n) => query(cp, filters, order, n),
        get: async () => run(), onSnapshot: (fn) => { const l = () => fn(run()); listeners.push(l); setTimeout(l, 0); return () => listeners.splice(listeners.indexOf(l), 1); },
        doc: (id) => ref(cp + "/" + (id || Math.random().toString(36).slice(2, 14))),
      };
    }
    function ref(p) {
      return {
        id: p.split("/").pop(), path: p, get: async () => snap(p),
        set: async (d) => { docs.set(p, clone(d)); notify(); },
        update: async (d) => { if (!docs.has(p)) throw { code: "invalid_argument" }; docs.set(p, merge(clone(docs.get(p)), d)); notify(); },
        delete: async () => { docs.delete(p); notify(); }, collection: (s) => query(p + "/" + s),
      };
    }
    return { doc: ref, collection: (p) => query(p), _docs: docs };
  }
  const db = makeDb();
  const sample = async () => ({ text: "", truncated: false });
  sample.json = async () => { throw { code: "not_granted" }; };
  sample.limits = async () => ({ maxPromptBytes: 262144 });
  window.__mockDb = db;
  window.claude = {
    use: async (n) => ({
      db, sample,
      user: { isOwner: async () => true, id: async () => "u_preview", canEdit: async () => true, can: async () => true },
      downloads: { save: async (r) => { console.log("download", r.filename); return { status: "saved" }; } },
    }[n] || null),
  };
  /* Seed the store from a Numista CSV export (?csv=path), using the app's own import logic. */
  window.__seed = async function (csvUrl, extra) {
    const L = window.CN.logic;
    const text = await (await fetch(csvUrl)).text();
    const { headers, rows } = L.parseCSV(text); const { map, currency } = L.mapHeaders(headers);
    const used = new Set();
    const items = rows.map((r, i) => {
      const it = L.rowToItem(r, map); it.id = L.uniqueId(L.makeBaseId(it), it.kind, it.gyear, (x) => used.has(x)); used.add(it.id);
      it.cms = it.ums = Date.now() - i; return it;
    });
    for (let i = 0; i < items.length; i += 120) {
      const o = {}; for (const it of items.slice(i, i + 120)) o[it.id] = it;
      await db.doc("inv/c" + String(i / 120 + 1).padStart(3, "0")).set({ items: o });
    }
    await db.doc("meta/settings").set(Object.assign({ refCur: currency || "TND", numCur: currency || "TND", usdRate: 2.92, nlang: "fr", numista: { headers }, migratedV2: true }, extra || {}));
    return items.length;
  };
})();
