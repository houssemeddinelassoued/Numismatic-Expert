/* Cabinet Numismatique: pure logic (no DOM). Runs in the page and in Node for tests. */
(function (root) {
  "use strict";
  const CN = root.CN || (root.CN = {});

  /* ---------- CSV ---------- */
  function detectDelimiter(text) {
    let q = false, counts = { ",": 0, ";": 0, "\t": 0 };
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (c === '"') q = !q;
      else if (!q && (c === "\n" || c === "\r")) break;
      else if (!q && c in counts) counts[c]++;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][1] ? Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0] : ",";
  }
  function parseCSV(text, delim) {
    text = String(text || "").replace(/^﻿/, "");
    delim = delim || detectDelimiter(text);
    const rows = []; let row = [], f = "", q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) {
        if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; }
        else f += c;
      } else if (c === '"') q = true;
      else if (c === delim) { row.push(f); f = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(f); rows.push(row); row = []; f = "";
      } else f += c;
    }
    if (f !== "" || row.length) { row.push(f); rows.push(row); }
    const clean = rows.filter((r) => r.length > 1 || (r[0] || "").trim() !== "");
    const headers = (clean.shift() || []).map((h) => h.trim());
    return { headers, rows: clean, delim };
  }
  function toCSV(rows, delim) {
    delim = delim || ",";
    return rows.map((r) => r.map((v) => '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"').join(delim)).join("\r\n");
  }

  /* ---------- numbers, dates ---------- */
  function num(s) {
    if (typeof s === "number") return isFinite(s) ? s : null;
    let t = String(s == null ? "" : s).trim().replace(/[\s  ]/g, "");
    if (!t) return null;
    if (/,\d{1,2}$/.test(t) && !/\.\d/.test(t)) t = t.replace(/\./g, "").replace(",", ".");
    else t = t.replace(/,/g, "");
    const v = parseFloat(t.replace(/[^0-9.\-]/g, ""));
    return isFinite(v) ? v : null;
  }
  function normDate(s) {
    s = String(s || "").trim();
    let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
    m = s.match(/^(\d{1,2})[\/.](\d{1,2})[\/.](\d{4})/);
    if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
    m = s.match(/^(\d{4})$/);
    return m ? m[1] : "";
  }

  /* ---------- grades (Numista scale, single UNC) ---------- */
  const GRADES = ["G", "VG", "F", "VF", "XF", "AU", "UNC"];
  const GRADE_SYN = {
    G: ["G", "GOOD", "AG", "FR", "FAIR", "P", "PO", "POOR", "AB", "ASSEZBEAU", "GE", "SGE", "RC", "MC"],
    VG: ["VG", "VERYGOOD", "B", "BEAU", "BC", "MB"],
    F: ["F", "FINE", "TB", "TRESBEAU", "S", "BB-"],
    VF: ["VF", "VERYFINE", "TTB", "TRESTRESBEAU", "SS", "MBC", "BB"],
    XF: ["XF", "EF", "EXTREMELYFINE", "SUP", "SUPERBE", "VZ", "EBC"],
    AU: ["AU", "ABOUTUNCIRCULATED", "AUNC", "SPL", "SPLENDIDE", "SC-"],
    UNC: ["UNC", "UNCIRCULATED", "MS", "BU", "CHUNC", "GEMUNC", "FDC", "NEUF", "NC", "STGL", "BFR", "KFR", "SC", "PR", "PF", "PROOF", "BE"],
  };
  const GRADE_LOOKUP = {};
  for (const [g, list] of Object.entries(GRADE_SYN)) for (const s of list) GRADE_LOOKUP[s] = g;
  function normGrade(s) {
    let t = String(s || "").normalize("NFD").replace(/\p{M}/gu, "").toUpperCase().trim();
    if (!t || t === "?") return "";
    t = t.replace(/[\s.]/g, "");
    if (GRADE_LOOKUP[t]) return GRADE_LOOKUP[t];
    const base = t.replace(/[-+]?\d+.*$/, "").replace(/[+\-]$/, "");
    if (GRADE_LOOKUP[base]) return GRADE_LOOKUP[base];
    const m = t.match(/^(MS|PR|PF|SP)\d/);
    return m ? "UNC" : "";
  }

  /* ---------- countries -> 2-letter codes ---------- */
  const ISO_DEPRECATED = new Set("AN BU CS DD DY FQ FX HV JT MI NH NQ NT PC PU PZ RH SU TP UK VD WK YD YU ZR QO QU EU EZ UN AC CP CQ DG EA IC TA XA XB XK ZZ".split(" "));
  const COUNTRY_ALIAS = {
    "abkhazia": "AB", "arctic territories": "XR", "belgian congo rwanda and urundi": "CD", "belgian congo and ruanda urundi": "CD",
    "central african states": "XA", "western african states": "XO", "eastern caribbean states": "XD", "east caribbean states": "XD",
    "french west africa": "XW", "french equatorial africa": "XA", "french indochina": "XI", "german east africa": "XG",
    "islamic states": "XS", "ottoman empire": "OT", "somaliland": "XM", "transnistria": "XT", "uzupis republic of": "XU",
    "yugoslavia": "YU", "czechoslovakia": "CS", "czech republic": "CZ", "turkey": "TR", "myanmar": "MM", "burma": "MM",
    "soviet union": "SU", "ussr": "SU", "east germany": "DD", "german democratic republic": "DD", "west germany": "DE",
    "rhodesia": "RH", "zaire": "ZR", "netherlands antilles": "AN", "biafra": "XB", "kosovo": "XK", "eurozone": "EU",
    "european union": "EU", "comoro islands": "KM", "congo democratic republic of the": "CD", "congo republic of the": "CG",
    "british crown dependencies": "GB", "korea north": "KP", "korea south": "KR", "ivory coast": "CI", "swaziland": "SZ",
    "macedonia": "MK", "vatican city": "VA", "palestine": "PS", "macau": "MO", "united states of america": "US",
    "tunisie": "TN", "maroc": "MA", "algerie": "DZ", "libye": "LY", "egypte": "EG", "etats unis": "US", "royaume uni": "GB",
    "empire ottoman": "OT", "urss": "SU", "yougoslavie": "YU", "tchecoslovaquie": "CS", "allemagne de l est": "DD",
  };
  function normName(s) {
    return String(s || "").normalize("NFD").replace(/\p{M}/gu, "").toLowerCase()
      .replace(/&/g, " and ").replace(/\(.*?\)/g, " ").replace(/[^\p{L}\p{N} ]+/gu, " ")
      .replace(/\b(the|of)\b/g, " ").replace(/\s+/g, " ").trim();
  }
  let NAMES = null, LONG = null;
  function buildNames() {
    NAMES = {};
    const langs = ["en", "fr", "ar", "es", "de", "it"];
    for (const lang of langs) {
      let dn;
      try { dn = new Intl.DisplayNames([lang], { type: "region", fallback: "none" }); } catch (e) { continue; }
      for (let a = 65; a < 91; a++) for (let b = 65; b < 91; b++) {
        const code = String.fromCharCode(a, b);
        if (ISO_DEPRECATED.has(code)) continue;
        let n; try { n = dn.of(code); } catch (e) { n = null; }
        if (!n || n === code || /unknown/i.test(n)) continue;
        const k = normName(n);
        if (k && !NAMES[k]) NAMES[k] = code;
      }
    }
    for (const [k, v] of Object.entries(COUNTRY_ALIAS)) NAMES[normName(k)] = v;
    LONG = Object.keys(NAMES).filter((k) => k.length > 3).sort((a, b) => b.length - a.length);
  }
  function isoOf(...cands) {
    if (!NAMES) buildNames();
    for (const c of cands) {
      const raw = String(c || "").trim();
      if (/^[A-Z]{2}$/.test(raw)) return raw;
      const k = normName(raw); if (k && NAMES[k]) return NAMES[k];
    }
    for (const c of cands) {
      const k = " " + normName(c) + " ";
      if (k.trim().length < 4) continue;
      for (const n of LONG) if (k.includes(" " + n + " ")) return NAMES[n];
    }
    return "";
  }
  function fallbackIso(name) {
    const t = String(name || "").normalize("NFD").replace(/\p{M}/gu, "").replace(/[^A-Za-z]/g, "").toUpperCase();
    return t.length >= 2 ? t.slice(0, 2) : "XX";
  }
  function countryNames(lang) {
    if (!NAMES) buildNames();
    let dn; try { dn = new Intl.DisplayNames([lang], { type: "region", fallback: "none" }); } catch (e) { return []; }
    const out = [];
    for (let a = 65; a < 91; a++) for (let b = 65; b < 91; b++) {
      const code = String.fromCharCode(a, b);
      if (ISO_DEPRECATED.has(code)) continue;
      let n; try { n = dn.of(code); } catch (e) { n = null; }
      if (n && n !== code && !/unknown/i.test(n)) out.push([code, n]);
    }
    return out;
  }

  /* ---------- kinds, references, unique IDs ---------- */
  function kindOfNumista(type, comp) {
    const t = String(type || "").toLowerCase(), c = String(comp || "").toLowerCase();
    if (/paper|polymer|cotton|plastic|papier|polym/.test(c) || /banknote|note|voucher|cheque|check|certificate|coupon|billet|bon /.test(t)) return "note";
    if (/medal|token|jeton|médaille|exonum/.test(t)) return "other";
    return "coin";
  }
  const SCHEME = { "p": "P", "km": "KM", "tbb": "TBB", "y": "Y", "jp": "JP", "lec": "LEC", "fay": "FAY", "franc 2014": "F", "gad": "GAD", "c": "C", "schön": "SCH", "schon": "SCH" };
  const PREF = { note: ["p", "tbb", "jp"], coin: ["km", "y", "lec", "c", "gad", "franc 2014", "fay", "schön", "schon"], other: [] };
  function parseRefs(s) {
    const out = []; let cur = null;
    for (let part of String(s || "").split(/\s*[,;]\s*/)) {
      part = part.trim(); if (!part) continue;
      const m = part.match(/^(.+?)#\s*(.+)$/) || part.match(/^(P|KM|TBB|Y)[\s\-]+([0-9][\w.\/]*)$/i);
      if (m) { cur = m[1].trim().toLowerCase(); out.push({ s: cur, n: m[2].trim() }); }
      else if (cur && /^[\w.\/]+$/.test(part)) out.push({ s: cur, n: part });
    }
    return out;
  }
  const cleanNum = (n) => String(n).replace(/[\/\s]+/g, ".").replace(/[^A-Za-z0-9.]/g, "").replace(/^\.+|\.+$/g, "");
  function refCode(kind, ref, refs, n) {
    const main = parseRefs(ref), spec = parseRefs(refs);
    for (const s of PREF[kind] || []) {
      const hit = spec.find((x) => x.s === s) || main.find((x) => x.s === s);
      if (hit) { const v = cleanNum(hit.n); if (v) return SCHEME[s] + (/^[0-9]/.test(v) ? "" : "-") + v; }
    }
    const nn = String(n || "").replace(/\D/g, "");
    return nn ? "N" + nn : "";
  }
  function shortId() { return (Date.now().toString(36).slice(-4) + Math.random().toString(36).slice(2, 4)).toUpperCase(); }
  function makeBaseId(o) {
    const iso = (o.iso || "XX").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 2) || "XX";
    const code = refCode(o.kind, o.ref, o.refs, o.n) || "X" + shortId();
    const gy = /^\d{3,4}$/.test(String(o.gyear || "")) ? String(o.gyear) : "";
    return iso + "-" + code + (o.kind === "coin" && gy ? "-" + gy : "");
  }
  function uniqueId(base, kind, gyear, has) {
    if (!has(base)) return base;
    const gy = String(gyear || "");
    if (kind !== "coin" && /^\d{3,4}$/.test(gy) && !has(base + "-" + gy)) return base + "-" + gy;
    let k = 2; while (has(base + "-" + k)) k++;
    return base + "-" + k;
  }
  function cleanId(s) { return String(s || "").trim().replace(/\s+/g, "-").replace(/[^A-Za-z0-9.\-]/g, "").replace(/-{2,}/g, "-").slice(0, 60); }

  /* ---------- Numista export columns ---------- */
  const NUMISTA_FIELDS = [
    ["country", ["country", "pays", "pais", "land", "paese"]],
    ["issuer", ["issuer", "emetteur", "emisor", "ausgeber", "autorita emittente"]],
    ["ruler", ["ruling authority", "autorite emettrice", "autorite", "autoridad", "herrscher", "periode"]],
    ["cur", ["currency", "monnaie", "devise", "moneda", "wahrung", "valuta"]],
    ["face", ["face value", "valeur faciale", "valor facial", "nennwert", "valore facciale"]],
    ["ref", ["reference", "référence", "referencia", "referenz", "riferimento"]],
    ["n", ["n number", "n number with link", "numero n", "n", "numista number", "numero numista"]],
    ["title", ["title", "titre", "titulo", "titel", "titolo"]],
    ["ntype", ["type", "tipo", "typ"]],
    ["yrange", ["year range", "periode", "annees", "rango de anos", "jahresbereich"]],
    ["comp", ["composition", "composicion", "zusammensetzung", "composizione", "metal"]],
    ["weight", ["weight", "poids", "peso", "gewicht"]],
    ["year", ["year", "annee", "ano", "jahr", "anno", "millesime"]],
    ["gyear", ["gregorian year", "annee gregorienne", "ano gregoriano", "gregorianisches jahr"]],
    ["refs", ["references", "références", "referencias", "referenzen", "riferimenti"]],
    ["comment", ["comment", "commentaire", "comentario", "kommentar", "commento"]],
    ["qty", ["quantity", "quantite", "cantidad", "anzahl", "quantita"]],
    ["exch", ["for exchange", "a echanger", "para intercambio", "zum tausch", "da scambiare", "echange"]],
    ["grade", ["grade", "etat", "estado", "erhaltung", "conservazione", "qualite"]],
    ["coll", ["collection", "coleccion", "sammlung", "collezione"]],
    ["set", ["from set", "issu d un set", "d un coffret", "de un set", "aus set"]],
    ["buy", ["buying price", "prix d achat", "precio de compra", "kaufpreis", "prezzo di acquisto"]],
    ["est", ["estimate", "estimation", "estimacion", "schatzwert", "stima", "valeur estimee"]],
    ["pcom", ["private comment", "commentaire prive", "comentario privado", "privater kommentar"]],
    ["pubcom", ["public comment", "commentaire public", "comentario publico", "offentlicher kommentar"]],
    ["store", ["storage location", "emplacement", "lieu de stockage", "ubicacion", "lagerort"]],
    ["place", ["acquisition place", "lieu d acquisition", "lugar de adquisicion", "erwerbsort"]],
    ["adate", ["acquisition date", "date d acquisition", "fecha de adquisicion", "erwerbsdatum"]],
    ["serial", ["serial number", "numero de serie", "numero de serie", "seriennummer"]],
  ];
  const NUMISTA_HEADERS_EN = ["Country", "Issuer", "Ruling authority", "Currency", "Face value", "Reference", "N# number (with link)", "Title", "Type", "Year range", "Composition", "Weight", "Year", "Gregorian year", "References", "Comment", "Quantity", "For exchange", "Grade", "Collection", "From set", "Buying price ({cur})", "Estimate ({cur})", "Private comment", "Public comment", "Storage location", "Acquisition place", "Acquisition date", "Serial number"];
  const normHeader = (h) => normName(String(h || "").replace(/#/g, " ").replace(/\(.*?\)/g, " "));
  function mapHeaders(headers) {
    const map = {}; const used = new Set();
    const nh = headers.map(normHeader);
    for (const [field, syns] of NUMISTA_FIELDS) {
      const ns = syns.map(normName);
      let idx = nh.findIndex((h, i) => !used.has(i) && ns.includes(h));
      if (idx < 0 && (field === "buy" || field === "est" || field === "n")) idx = nh.findIndex((h, i) => !used.has(i) && ns.some((s) => h.startsWith(s)));
      if (idx >= 0) { map[field] = idx; used.add(idx); }
    }
    let currency = "";
    for (const h of headers) { const m = String(h).match(/\(([A-Z]{3})\)/); if (m) { currency = m[1]; break; } }
    return { map, currency };
  }
  function fingerprint(it) {
    return [it.n, it.year, it.gyear, it.refs, it.serial, it.adate, it.place].map((v) => String(v == null ? "" : v).trim().toLowerCase()).join("|");
  }
  function rowToItem(row, map) {
    const g = (f) => (map[f] != null ? String(row[map[f]] == null ? "" : row[map[f]]).trim() : "");
    const kind = kindOfNumista(g("ntype"), g("comp"));
    const iso = isoOf(g("issuer"), g("country")) || fallbackIso(g("country") || g("issuer"));
    const qty = parseInt(g("qty"), 10);
    return {
      iso, kind, st: "col",
      country: g("country"), issuer: g("issuer"), ruler: g("ruler"), cur: g("cur"), face: g("face"),
      ref: g("ref"), n: g("n").replace(/\D/g, ""), title: g("title"), ntype: g("ntype"), yrange: g("yrange"),
      comp: g("comp"), weight: g("weight"), year: g("year"), gyear: g("gyear"), refs: g("refs"), comment: g("comment"),
      qty: isFinite(qty) && qty > 0 ? qty : 1, exch: /^(true|1|yes|oui|vrai|si|ja)$/i.test(g("exch")),
      grade: normGrade(g("grade")), coll: g("coll"), set: g("set"), buy: num(g("buy")), est: num(g("est")),
      pcom: g("pcom"), pubcom: g("pubcom"), store: g("store"), place: g("place"), adate: normDate(g("adate")) || g("adate"),
      serial: g("serial"), links: [], imgs: [], ap: null, src: "numista",
    };
  }
  function itemToRow(it, headers) {
    const { map } = mapHeaders(headers);
    const rev = {}; for (const [f, i] of Object.entries(map)) rev[i] = f;
    return headers.map((h, i) => {
      const f = rev[i]; if (!f) return "";
      const v = it[f];
      if (f === "n") return it.n ? "N# " + it.n : "";
      if (f === "exch") return it.exch ? "TRUE" : "FALSE";
      if (f === "qty") return String(it.qty || 1);
      if (f === "buy" || f === "est") return v == null ? "" : String(v);
      return v == null ? "" : String(v);
    });
  }

  /* ---------- verification links (multi-source) ---------- */
  function verifyLinks(info, nlang) {
    const nl = nlang || "en";
    const q = [info.country, info.title || info.face, info.year, info.refMain].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
    const enc = encodeURIComponent;
    const gsite = (site) => "https://www.google.com/search?q=" + enc("site:" + site + " " + q);
    const out = [];
    if (info.n) out.push({ k: "numista", label: "Numista N# " + info.n, url: `https://${nl}.numista.com/${info.n}` });
    else out.push({ k: "numista", label: "Numista", url: `https://${nl}.numista.com/catalogue/index.php?r=${enc(q)}` });
    out.push({ k: "ebay", label: "eBay (sold)", url: `https://www.ebay.com/sch/i.html?_nkw=${enc(q)}&LH_Sold=1&LH_Complete=1` });
    out.push({ k: "heritage", label: "Heritage", url: gsite("ha.com") });
    if (info.kind === "note") out.push({ k: "pmg", label: "PMG", url: gsite("pmgnotes.com") });
    else out.push({ k: "pcgs", label: "PCGS / NGC", url: "https://www.google.com/search?q=" + enc("(site:pcgs.com OR site:ngccoin.com) " + q) });
    out.push({ k: "cgb", label: "CGB", url: gsite("cgb.fr") });
    if (info.kind !== "note") out.push({ k: "acsearch", label: "acsearch", url: gsite("acsearch.info") });
    out.push({ k: "images", label: "Images", url: "https://www.google.com/search?tbm=isch&q=" + enc(q) });
    return out;
  }

  CN.logic = {
    detectDelimiter, parseCSV, toCSV, num, normDate, GRADES, normGrade, ISO_DEPRECATED, COUNTRY_ALIAS, normName,
    isoOf, fallbackIso, countryNames, kindOfNumista, parseRefs, refCode, makeBaseId, uniqueId, cleanId, shortId,
    NUMISTA_FIELDS, NUMISTA_HEADERS_EN, mapHeaders, fingerprint, rowToItem, itemToRow, verifyLinks,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = CN.logic;
})(typeof window !== "undefined" ? window : globalThis);
