(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) module.exports = factory();
  else root.C = factory();
})(typeof self !== "undefined" ? self : this, function () {
  const FAMILIES = {
    siyah:      { name: "Siyah",        hex: "#1c1c1e", neutral: true,  dark: true },
    antrasit:   { name: "Antrasit",     hex: "#3a3d42", neutral: true,  dark: true },
    gri:        { name: "Gri",          hex: "#8a8d8f", neutral: true },
    beyaz:      { name: "Beyaz",        hex: "#f4f2ec", neutral: true },
    krem:       { name: "Krem / Ekru",  hex: "#e8dcc3", neutral: true },
    bej:        { name: "Bej",          hex: "#d5bd9a", neutral: true },
    camel:      { name: "Camel",        hex: "#b98a55", neutral: true },
    taba:       { name: "Taba",         hex: "#8d6e4c", neutral: true },
    kahve:      { name: "Kahve",        hex: "#5d4037", neutral: true,  dark: true },
    ten:        { name: "Ten",          hex: "#c6906f", neutral: true },
    lacivert:   { name: "Lacivert",     hex: "#1f2a44", neutral: true,  dark: true, cool: true },
    denim:      { name: "Kot Mavi",     hex: "#33526e", neutral: true,  cool: true },
    petrol:     { name: "Petrol",       hex: "#1f5560", dark: true,     cool: true },
    mavi:       { name: "Mavi",         hex: "#2b6cb0", cool: true },
    acikmavi:   { name: "Açık Mavi",    hex: "#a8c5e2", cool: true },
    haki:       { name: "Haki",         hex: "#6b705c", neutral: true },
    zeytin:     { name: "Zeytin Yeşili",hex: "#556b2f" },
    yesil:      { name: "Yeşil",        hex: "#2f5d3a", dark: true },
    acikyesil:  { name: "Açık Yeşil",   hex: "#93b08a" },
    bordo:      { name: "Bordo",        hex: "#6d2e46", dark: true },
    kirmizi:    { name: "Kırmızı",      hex: "#b3222a" },
    hardal:     { name: "Hardal",       hex: "#c9971e" },
    sari:       { name: "Sarı",         hex: "#e8c33c" },
    pas:        { name: "Pas / Kiremit",hex: "#9e4a2a", warm: true },
    turuncu:    { name: "Turuncu",      hex: "#cc5a1e", warm: true },
    pembe:      { name: "Pembe",        hex: "#d98c9f" },
    tozpembe:   { name: "Toz Pembe",    hex: "#c9a5a5" },
    lila:       { name: "Lila",         hex: "#9b8aa6" },
    esmermor:   { name: "Erik Moru",    hex: "#5b3a70", dark: true },
  };

  const PAIR_MIN = {
    lacivert: { lacivert: 90, beyaz: 96, krem: 92, gri: 90, antrasit: 88, bej: 94, camel: 90, taba: 86, kahve: 82, ten: 82, haki: 88, zeytin: 88, yesil: 84, acikyesil: 84, bordo: 92, kirmizi: 74, hardal: 84, sari: 74, pas: 86, turuncu: 72, pembe: 80, tozpembe: 82, lila: 78, esmermor: 76, mavi: 85, acikmavi: 90, denim: 88, petrol: 88, siyah: 78 },
    bej: { bej: 88, beyaz: 88, krem: 90, gri: 88, antrasit: 86, siyah: 86, camel: 92, taba: 90, kahve: 90, ten: 86, haki: 90, zeytin: 88, yesil: 85, acikyesil: 86, bordo: 88, kirmizi: 78, hardal: 80, sari: 78, pas: 88, turuncu: 80, pembe: 85, tozpembe: 86, lila: 84, esmermor: 82, mavi: 90, acikmavi: 92, denim: 88, petrol: 86, lacivert: 94 },
    gri: { gri: 85, beyaz: 90, krem: 88, siyah: 88, antrasit: 88, camel: 86, taba: 84, kahve: 82, ten: 85, haki: 85, zeytin: 82, yesil: 82, acikyesil: 84, bordo: 90, kirmizi: 80, hardal: 80, sari: 78, pas: 84, turuncu: 80, pembe: 86, tozpembe: 86, lila: 85, esmermor: 82, mavi: 88, acikmavi: 88, denim: 85, petrol: 84, lacivert: 90, bej: 88 },
    siyah: { siyah: 85, beyaz: 92, krem: 88, gri: 88, antrasit: 88, camel: 85, taba: 82, kahve: 80, ten: 84, haki: 85, zeytin: 82, yesil: 84, acikyesil: 80, bordo: 82, kirmizi: 80, hardal: 78, sari: 76, pas: 80, turuncu: 78, pembe: 82, tozpembe: 80, lila: 78, esmermor: 78, mavi: 82, acikmavi: 84, denim: 85, petrol: 82, lacivert: 78, bej: 86 },
    haki: { haki: 80, beyaz: 90, krem: 92, gri: 85, antrasit: 84, siyah: 85, camel: 86, taba: 88, kahve: 88, ten: 84, zeytin: 90, yesil: 84, acikyesil: 84, bordo: 82, kirmizi: 68, hardal: 82, sari: 74, pas: 82, turuncu: 74, pembe: 76, tozpembe: 76, lila: 72, esmermor: 70, mavi: 80, acikmavi: 82, denim: 82, petrol: 84, lacivert: 88, bej: 90 },
    krem: { krem: 82, beyaz: 88, gri: 88, antrasit: 86, siyah: 88, camel: 88, taba: 92, kahve: 90, ten: 86, haki: 92, zeytin: 90, yesil: 88, acikyesil: 85, bordo: 90, kirmizi: 80, hardal: 84, sari: 82, pas: 90, turuncu: 84, pembe: 86, tozpembe: 86, lila: 82, esmermor: 84, mavi: 90, acikmavi: 90, denim: 90, petrol: 88, lacivert: 92, bej: 90 },
    camel: { camel: 80, beyaz: 90, krem: 88, gri: 86, antrasit: 84, siyah: 85, taba: 92, kahve: 88, ten: 88, haki: 86, zeytin: 84, yesil: 84, acikyesil: 80, bordo: 86, kirmizi: 74, hardal: 82, sari: 80, pas: 85, turuncu: 78, pembe: 80, tozpembe: 82, lila: 76, esmermor: 78, mavi: 84, acikmavi: 84, denim: 88, petrol: 85, lacivert: 92, bej: 92 },
    taba: { taba: 82, beyaz: 90, krem: 92, gri: 84, antrasit: 84, siyah: 82, camel: 92, kahve: 90, ten: 88, haki: 88, zeytin: 86, yesil: 85, acikyesil: 82, bordo: 84, kirmizi: 74, hardal: 84, sari: 82, pas: 86, turuncu: 80, pembe: 80, tozpembe: 82, lila: 76, esmermor: 78, mavi: 88, acikmavi: 90, denim: 86, petrol: 86, lacivert: 86, bej: 90 },
    kahve: { kahve: 82, beyaz: 90, krem: 90, gri: 82, antrasit: 82, siyah: 80, camel: 88, taba: 90, ten: 88, haki: 88, zeytin: 86, yesil: 85, acikyesil: 80, bordo: 84, kirmizi: 74, hardal: 84, sari: 82, pas: 85, turuncu: 80, pembe: 78, tozpembe: 80, lila: 74, esmermor: 76, mavi: 88, acikmavi: 90, denim: 84, petrol: 84, lacivert: 82, bej: 90 },
    denim: { denim: 80, beyaz: 92, krem: 90, gri: 85, antrasit: 85, siyah: 85, camel: 88, taba: 86, kahve: 84, ten: 84, haki: 82, zeytin: 80, yesil: 80, acikyesil: 80, bordo: 84, kirmizi: 76, hardal: 82, sari: 80, pas: 82, turuncu: 78, pembe: 82, tozpembe: 84, lila: 78, esmermor: 78, mavi: 88, acikmavi: 90, petrol: 86, lacivert: 88, bej: 88 },
    bordo: { bordo: 80, beyaz: 88, krem: 90, gri: 90, antrasit: 88, siyah: 82, camel: 86, taba: 84, kahve: 84, ten: 80, haki: 82, zeytin: 82, yesil: 82, acikyesil: 78, kirmizi: 80, hardal: 82, sari: 78, pas: 84, turuncu: 76, pembe: 80, tozpembe: 82, lila: 78, esmermor: 82, mavi: 82, acikmavi: 82, denim: 84, petrol: 84, lacivert: 92, bej: 88 },
    zeytin: { zeytin: 78, beyaz: 88, krem: 90, gri: 82, antrasit: 82, siyah: 82, camel: 84, taba: 86, kahve: 86, ten: 84, haki: 90, yesil: 86, acikyesil: 82, bordo: 82, kirmizi: 70, hardal: 82, sari: 80, pas: 86, turuncu: 80, pembe: 74, tozpembe: 76, lila: 72, esmermor: 72, mavi: 80, acikmavi: 80, denim: 80, petrol: 84, lacivert: 88, bej: 88 },
    yesil: { yesil: 78, beyaz: 86, krem: 88, gri: 82, antrasit: 82, siyah: 84, camel: 84, taba: 85, kahve: 85, ten: 82, haki: 84, zeytin: 86, acikyesil: 84, bordo: 82, kirmizi: 70, hardal: 80, sari: 78, pas: 82, turuncu: 76, pembe: 76, tozpembe: 76, lila: 70, esmermor: 72, mavi: 82, acikmavi: 82, denim: 80, petrol: 84, lacivert: 84, bej: 85 },
    hardal: { hardal: 74, beyaz: 86, krem: 84, gri: 80, antrasit: 78, siyah: 78, camel: 82, taba: 84, kahve: 84, ten: 80, haki: 82, zeytin: 82, yesil: 80, acikyesil: 78, bordo: 82, kirmizi: 74, sari: 78, pas: 84, turuncu: 82, pembe: 72, tozpembe: 72, lila: 66, esmermor: 68, mavi: 82, acikmavi: 80, denim: 82, petrol: 80, lacivert: 84, bej: 80 },
    pas: { pas: 76, beyaz: 88, krem: 90, gri: 84, antrasit: 82, siyah: 80, camel: 85, taba: 86, kahve: 85, ten: 84, haki: 82, zeytin: 86, yesil: 82, acikyesil: 78, bordo: 84, kirmizi: 76, hardal: 84, sari: 80, turuncu: 82, pembe: 74, tozpembe: 74, lila: 70, esmermor: 70, mavi: 82, acikmavi: 82, denim: 82, petrol: 80, lacivert: 86, bej: 88 },
    mavi: { mavi: 80, beyaz: 92, krem: 90, gri: 88, antrasit: 88, siyah: 82, camel: 84, taba: 88, kahve: 88, ten: 84, haki: 80, zeytin: 80, yesil: 82, acikyesil: 82, bordo: 82, kirmizi: 76, hardal: 82, sari: 80, pas: 82, turuncu: 80, pembe: 84, tozpembe: 84, lila: 82, esmermor: 80, acikmavi: 92, denim: 88, petrol: 88, lacivert: 85, bej: 90 },
    acikmavi: { acikmavi: 82, beyaz: 92, krem: 90, gri: 88, antrasit: 88, siyah: 84, camel: 84, taba: 90, kahve: 90, ten: 84, haki: 82, zeytin: 80, yesil: 82, acikyesil: 80, bordo: 82, kirmizi: 74, hardal: 80, sari: 78, pas: 82, turuncu: 78, pembe: 86, tozpembe: 86, lila: 84, esmermor: 80, mavi: 92, denim: 90, petrol: 86, lacivert: 90, bej: 92 },
    petrol: { petrol: 78, beyaz: 85, krem: 88, gri: 84, antrasit: 84, siyah: 82, camel: 85, taba: 86, kahve: 84, ten: 82, haki: 84, zeytin: 84, yesil: 84, acikyesil: 80, bordo: 84, kirmizi: 74, hardal: 80, sari: 76, pas: 80, turuncu: 74, pembe: 78, tozpembe: 78, lila: 74, esmermor: 76, mavi: 88, acikmavi: 86, denim: 86, lacivert: 88, bej: 86 },
    pembe: { pembe: 74, beyaz: 88, krem: 86, gri: 86, antrasit: 85, siyah: 82, camel: 80, taba: 80, kahve: 78, ten: 82, haki: 76, zeytin: 74, yesil: 76, acikyesil: 78, bordo: 80, kirmizi: 78, hardal: 72, sari: 70, pas: 74, turuncu: 72, tozpembe: 86, lila: 84, esmermor: 80, mavi: 84, acikmavi: 86, denim: 82, petrol: 78, lacivert: 80, bej: 85 },
    lila: { lila: 76, beyaz: 86, krem: 82, gri: 85, antrasit: 82, siyah: 78, camel: 76, taba: 76, kahve: 74, ten: 80, haki: 72, zeytin: 72, yesil: 70, acikyesil: 76, bordo: 78, kirmizi: 70, hardal: 66, sari: 66, pas: 70, turuncu: 68, pembe: 84, tozpembe: 84, esmermor: 84, mavi: 82, acikmavi: 84, denim: 78, petrol: 74, lacivert: 78, bej: 84 },
    antrasit: { antrasit: 80, beyaz: 88, krem: 86, gri: 88, siyah: 88, camel: 84, taba: 84, kahve: 82, ten: 84, haki: 84, zeytin: 82, yesil: 82, acikyesil: 80, bordo: 88, kirmizi: 78, hardal: 78, sari: 76, pas: 82, turuncu: 78, pembe: 85, tozpembe: 84, lila: 82, esmermor: 80, mavi: 88, acikmavi: 88, denim: 85, petrol: 84, lacivert: 88, bej: 86 },
    kirmizi: { kirmizi: 70, beyaz: 88, krem: 80, gri: 80, antrasit: 78, siyah: 80, camel: 74, taba: 74, kahve: 74, ten: 76, haki: 68, zeytin: 70, yesil: 70, acikyesil: 70, bordo: 80, hardal: 74, sari: 70, pas: 76, turuncu: 78, pembe: 78, tozpembe: 76, lila: 70, esmermor: 72, mavi: 76, acikmavi: 74, denim: 76, petrol: 74, lacivert: 74, bej: 78 },
    sari: { sari: 68, beyaz: 86, krem: 82, gri: 78, antrasit: 76, siyah: 76, camel: 80, taba: 82, kahve: 82, ten: 76, haki: 74, zeytin: 80, yesil: 78, acikyesil: 76, bordo: 78, kirmizi: 70, hardal: 78, pas: 80, turuncu: 84, pembe: 70, tozpembe: 70, lila: 66, esmermor: 66, mavi: 80, acikmavi: 78, denim: 80, petrol: 76, lacivert: 74, bej: 78 },
    turuncu: { turuncu: 72, beyaz: 86, krem: 84, gri: 80, antrasit: 78, siyah: 78, camel: 78, taba: 80, kahve: 80, ten: 82, haki: 74, zeytin: 80, yesil: 76, acikyesil: 74, bordo: 76, kirmizi: 78, hardal: 82, sari: 84, pas: 82, pembe: 72, tozpembe: 72, lila: 68, esmermor: 66, mavi: 80, acikmavi: 78, denim: 78, petrol: 74, lacivert: 72, bej: 80 },
    esmermor: { esmermor: 74, beyaz: 84, krem: 84, gri: 82, antrasit: 80, siyah: 78, camel: 78, taba: 78, kahve: 76, ten: 78, haki: 70, zeytin: 72, yesil: 72, acikyesil: 74, bordo: 82, kirmizi: 72, hardal: 68, sari: 66, pas: 70, turuncu: 66, pembe: 80, tozpembe: 80, lila: 84, mavi: 80, acikmavi: 80, denim: 78, petrol: 76, lacivert: 76, bej: 82 },
    ten: { ten: 78, beyaz: 88, krem: 86, gri: 85, antrasit: 84, siyah: 84, camel: 88, taba: 88, kahve: 88, haki: 84, zeytin: 84, yesil: 82, acikyesil: 82, bordo: 80, kirmizi: 76, hardal: 80, sari: 76, pas: 84, turuncu: 82, pembe: 82, tozpembe: 82, lila: 80, esmermor: 78, mavi: 84, acikmavi: 84, denim: 84, petrol: 82, lacivert: 82, bej: 86 },
    tozpembe: { tozpembe: 74, beyaz: 88, krem: 86, gri: 86, antrasit: 84, siyah: 80, camel: 82, taba: 82, kahve: 80, ten: 82, haki: 76, zeytin: 76, yesil: 76, acikyesil: 78, bordo: 82, kirmizi: 76, hardal: 72, sari: 70, pas: 74, turuncu: 72, pembe: 86, lila: 84, esmermor: 80, mavi: 84, acikmavi: 86, denim: 84, petrol: 78, lacivert: 82, bej: 86 },
  };

  const PICKER = [];
  Object.keys(FAMILIES).forEach((k) => {
    PICKER.push({ key: k, name: FAMILIES[k].name, hex: FAMILIES[k].hex });
  });
  const EXTRA_TINTS = [
    "#0f0f10", "#2e3035", "#4a4d52", "#6b6e72", "#a9acaf", "#d4d6d8", "#f8f8f6",
    "#152035", "#3d4966", "#5a6c96", "#8fa8d4", "#c3d2ea",
    "#3b2f26", "#74553c", "#9a7b5f", "#c5a683", "#e3cdb0",
    "#2c3a26", "#4b5d3a", "#77855f", "#a7b598", "#d5dfc9",
  ];
  EXTRA_TINTS.forEach((hex) => PICKER.push({ key: null, name: null, hex }));

  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }

  function hexToRgb(hex) {
    const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
    if (!m) return { r: 0, g: 0, b: 0 };
    let h = m[1];
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
  }

  function rgbToHex(r, g, b) {
    const s = (v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, "0");
    return "#" + s(r) + s(g) + s(b);
  }

  function rgbToLab(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const f = (v) => (v > 0.04045 ? Math.pow((v + 0.055) / 1.055, 2.4) : v / 12.92);
    r = f(r); g = f(g); b = f(b);
    const x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
    const y = r * 0.2126 + g * 0.7152 + b * 0.0722;
    const z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
    const g2 = (v) => (v > 0.008856 ? Math.cbrt(v) : 7.787 * v + 16 / 116);
    return { L: 116 * g2(y) - 16, A: 500 * (g2(x) - g2(y)), B: 200 * (g2(y) - g2(z)) };
  }

  function lab(hex) {
    const c = hexToRgb(hex);
    const l = rgbToLab(c.r, c.g, c.b);
    return l;
  }

  function deltaE(h1, h2) {
    const a = typeof h1 === "object" ? h1 : lab(h1);
    const b = typeof h2 === "object" ? h2 : lab(h2);
    return Math.sqrt((a.L - b.L) ** 2 + (a.A - b.A) ** 2 + (a.B - b.B) ** 2);
  }

  function classify(hex) {
    let best = null, bestD = 1e9;
    Object.keys(FAMILIES).forEach((k) => {
      const d = deltaE(hex, FAMILIES[k].hex);
      if (d < bestD) { bestD = d; best = k; }
    });
    const f = FAMILIES[best];
    const l = lab(hex);
    let warmth = "nötr";
    if (Math.abs(l.B) > 8) warmth = l.B > 0 ? "sıcak" : "soğuk";
    if (f.cool) warmth = "soğuk";
    if (f.warm) warmth = "sıcak";
    let lightness = "orta";
    if (l.L < 30) lightness = "koyu";
    else if (l.L > 68) lightness = "açık";
    const lb = lab(f.hex);
    const chroma = Math.sqrt(l.A * l.A + l.B * l.B);
    const neutral = f.neutral || chroma < 12;
    return { fam: best, name: f.name, neutral: neutral, warmth: warmth, lightness: lightness, lab: l };
  }

  function pairScore(a, b) {
    if (a.fam === b.fam) {
      const lScore = Math.abs(a.lab.L - b.lab.L) > 22 ? 86 : Math.abs(a.lab.L - b.lab.L) > 10 ? 78 : 70;
      return { score: lScore, kind: "ton" };
    }
    let s = PAIR_MIN[a.fam] && PAIR_MIN[a.fam][b.fam];
    if (s == null) s = PAIR_MIN[b.fam] && PAIR_MIN[b.fam][a.fam];
    if (s != null) return { score: s, kind: "tablo" };
    const d = deltaE(a.lab, b.lab);
    let sc;
    if (a.neutral && b.neutral) sc = 84;
    else if (a.neutral || b.neutral) sc = 78;
    else sc = d > 35 ? 74 : d > 18 ? 70 : 62;
    return { score: sc, kind: "tahmin" };
  }

  const WEIGHTS = { "ust-alt": 3, "ust-ayakkabi": 1.5, "alt-ayakkabi": 2, "ust-dis": 2, "alt-dis": 2, "dis-ayakkabi": 1.5, "aksesuar-ust": 0.6, "aksesuar-alt": 0.6, "aksesuar-dis": 0.5, "aksesuar-ayakkabi": 0.4 };

  function paletteSummary(colors) {
    const fams = [];
    colors.forEach((c) => {
      const hit = fams.find((x) => x.fam === c.fam);
      if (hit) hit.n++;
      else fams.push({ fam: c.fam, neutral: c.neutral, n: 1 });
    });
    return fams;
  }

  function scoreCombo(pieces) {
    const notes = [];
    const cols = {};
    ["ust", "alt", "ayakkabi", "dis", "aksesuar"].forEach((k) => { if (pieces[k]) cols[k] = pieces[k]; });
    const keys = Object.keys(cols);
    if (keys.length < 2) return { score: 0, notes: ["Kombin için en az iki parça seç."], pairs: [], fams: [] };
    let wsum = 0, psum = 0;
    const pairs = [];
    for (let i = 0; i < keys.length; i++) {
      for (let j = i + 1; j < keys.length; j++) {
        const a = cols[keys[i]], b = cols[keys[j]];
        const k1 = keys[i], k2 = keys[j];
        const w = WEIGHTS["aksesuar-" + k2] != null && k1 === "aksesuar" ? WEIGHTS["aksesuar-" + k2] : (WEIGHTS[k1 + "-" + k2] || 1);
        const p = pairScore(a, b);
        psum += p.score * w; wsum += w;
        pairs.push({ a: k1, b: k2, score: Math.round(p.score), kind: p.kind });
      }
    }
    let score = psum / wsum;
    const fams = paletteSummary(keys.map((k) => cols[k]));
    const colorCount = fams.filter((f) => !f.neutral).length + (fams.filter((f) => !f.neutral).length === 0 ? 1 : 0);
    const totalFams = fams.length;
    if (totalFams <= 3) { score += 5; notes.push("3 renk kuralına uygun, palet sade."); }
    else { score -= (totalFams - 3) * 7; notes.push(totalFams + " farklı renk var, sadeleştirmeyi dene."); }
    const nNeutral = fams.filter((f) => f.neutral).length;
    if (nNeutral >= totalFams - 1 && totalFams >= 2) { score += 6; notes.push("Nötr taban üzerine kurulu, güvenli."); }
    const nonNeutral = fams.filter((f) => !f.neutral);
    if (nonNeutral.length === 1) { score += 4; notes.push("Tek vurgu rengiyle dengeli bir görüntü."); }
    if (cols.ust && cols.alt) {
      const pust = pairScore(cols.ust, cols.alt);
      const dl = Math.abs(cols.ust.lab.L - cols.alt.lab.L);
      if (dl >= 25 && pust.score >= 72) { score += 8; notes.push("Üst-alt kontrast güçlü, silüet net okunuyor."); }
      else if (dl >= 12 && pust.score >= 72) { score += 4; notes.push("Üst-alt ton farkı makul."); }
      else if (cols.ust.fam === cols.alt.fam) { score += 6; notes.push("Ton-sür-ton kombin, şık ve sofistike."); }
      else { score -= 5; notes.push("Üst ve alt renkleri birbirine yakın ama uyumsuz, silüet silik kalabilir."); }
    }
    if (cols.alt && cols.ayakkabi) {
      if (cols.ayakkabi.fam === cols.alt.fam || Math.abs(cols.ayakkabi.lab.L - cols.alt.lab.L) < 20) { score += 3; notes.push("Ayakkabı altlıklarla aile ilişkisinde."); }
      const p = pairScore(cols.ayakkabi, cols.alt);
      if (p.score < 72) { notes.push("Ayakkabı renk değiştirirse kombin toparlanır."); }
    }
    if (cols.dis) {
      const p1 = pairScore(cols.dis, cols.alt);
      const p2 = pairScore(cols.dis, cols.ust || cols.dis);
      if (p1.score >= 85 && (cols.ust ? p2.score : 85) >= 80) { score += 3; notes.push("Dış giyim paletiyle konuşuyor."); }
    }
    const nameOf = (k) => ({ ust: "Üst", alt: "Alt", ayakkabi: "Ayakkabı", dis: "Dış giyim", aksesuar: "Aksesuar" }[k]);
    pairs.forEach((p) => {
      if (p.score >= 90 && p.kind === "tablo") notes.push(nameOf(p.a) + " + " + nameOf(p.b) + ": klasik ve güvenli bir eşleşme.");
      if (p.score < 68) notes.push(nameOf(p.a) + " + " + nameOf(p.b) + " uyumu zayıf görünüyor.");
    });
    score = Math.round(clamp(score, 0, 100));
    return { score: score, notes: notes.slice(0, 4), pairs: pairs, fams: fams };
  }

  function scoreComboStrict(pieces) {
    const obj = {};
    ["ust", "alt", "ayakkabi", "dis", "aksesuar"].forEach((k) => {
      if (pieces[k] && pieces[k].lab) obj[k] = pieces[k];
      else if (pieces[k]) obj[k] = classify(pieces[k].hex || pieces[k]);
    });
    return scoreCombo(obj);
  }

  function generateCombos(wardrobe, baseId, opts) {
    opts = opts || {};
    const byCat = { ust: [], alt: [], dis: [], ayakkabi: [], aksesuar: [] };
    wardrobe.forEach((it) => {
      if (byCat[it.category]) byCat[it.category].push(it);
    });
    const base = wardrobe.find((w) => w.id === baseId);
    const fixed = {};
    if (base && byCat[base.category]) fixed[base.category] = base;
    const pending = [];
    if (!fixed.ust && !fixed.dis) pending.push("ust");
    if (!fixed.alt) pending.push("alt");
    for (let i = 0; i < pending.length; i++) {
      if (!byCat[pending[i]].length) return { combos: [], message: "Bu parça için dolapta " + (pending[i] === "ust" ? "üst" : "alt") + " parça eksik." };
    }
    const useShoes = !fixed.ayakkabi && byCat.ayakkabi.length;
    const outers = fixed.dis ? [fixed.dis] : byCat.dis.length ? byCat.dis.slice(0, 30) : [null];
    const results = [];
    const iter = (slotIdx, cand) => {
      if (slotIdx >= pending.length) {
        const shoeList = useShoes ? byCat.ayakkabi.slice(0, 40) : [null];
        shoeList.forEach((s) => {
          const c2 = Object.assign({}, cand);
          if (s) c2.ayakkabi = s;
          (outers.length ? outers.slice(0, 30) : [null]).forEach((d) => {
            const c3 = Object.assign({}, c2);
            if (d && !fixed.dis) c3.dis = d;
            results.push(evalCombo(c3));
          });
        });
        return;
      }
      const slot = pending[slotIdx];
      const pool = byCat[slot].slice(0, 60);
      pool.forEach((it) => {
        const c2 = Object.assign({}, cand);
        c2[slot] = it;
        iter(slotIdx + 1, c2);
      });
    };
    iter(0, Object.assign({}, fixed));
    results.sort((a, b) => b.score - a.score);
    const seen = new Set();
    const unique = [];
    results.forEach((r) => {
      const k = r.ids.ust + "|" + r.ids.alt + "|" + r.ids.ayakkabi + "|" + r.ids.dis;
      if (!seen.has(k)) { seen.add(k); unique.push(r); }
    });
    return { combos: unique.slice(0, opts.limit || 12) };
  }

  function evalCombo(pieces) {
    const info = {};
    const ids = { ust: "", alt: "", ayakkabi: "", dis: "", aksesuar: "" };
    ["ust", "alt", "ayakkabi", "dis", "aksesuar"].forEach((k) => {
      const p = pieces[k];
      if (!p) return;
      ids[k] = p.id;
      info[k] = p.colorInfo || classify(p.color);
    });
    const s = scoreCombo(info);
    return Object.assign({ ids: ids, pieces: pieces }, s);
  }

  function surprise(wardrobe, lastIds) {
    const byCat = { ust: [], alt: [], ayakkabi: [], dis: [] };
    wardrobe.forEach((it) => { if (byCat[it.category]) byCat[it.category].push(it); });
    const prefer = (arr) => {
      if (!arr.length) return null;
      const favs = arr.filter((a) => a.fav);
      const pool = favs.length && Math.random() < 0.6 ? favs : arr;
      return pool[Math.floor(Math.random() * pool.length)];
    };
    for (let t = 0; t < 25; t++) {
      const u = prefer(byCat.ust), a = prefer(byCat.alt), s = prefer(byCat.ayakkabi);
      const c = { ust: u, alt: a, ayakkabi: s };
      if (!u || !a) return { combos: [], message: "Dolapta üst ve alt parça gerek." };
      if (Math.random() < 0.5 && byCat.dis.length) c.dis = prefer(byCat.dis);
      const r = evalCombo(c);
      const k = r.ids.ust + r.ids.alt + r.ids.ayakkabi + r.ids.dis;
      if (lastIds && lastIds.has(k)) continue;
      return { combos: [r] };
    }
    return null;
  }

  const GUIDE = {
    rules: [
      { t: "Nötr tabanla başla", d: "Lacivert, gri, kestane/bej, dikkat çekmeyen kahverengin %60–80’ini oluşturması güvenli; canlı rengi tek bir parçaya bırak." },
      { t: "En fazla 3 renk", d: "Ayakkabı ve aksesuarlar dahil. Desenli parça desenin ana rengiyle bir renk maiyet eder." },
      { t: "60-30-10 oranı", d: "%60 ana renk (pantolon/ceket), %30 ikincil (gömlek/kazak), %10 vurgu (ayakkabı, saat, çorap)." },
      { t: "Açık-koyu kontrast", d: "Açık üst + koyu alt ya da tersini dene. Silüet okunur görünür." },
      { t: "Ton-sür-ton", d: "Aynı rengin açık-koyu tonları şık sonuç verir; doku farkı eklersen daha rafine." },
      { t: "Alt ton uyumu", d: "Soğuk alt tonlu renkler beraber (lacivert, gri, bordo); sıcaklar beraber (kahve, haki, pas)." },
      { t: "Ayakkabı-kemer kilidi", d: "Ayakkabı ve kemeri aynı renk ailesinden seç; metal aksesuarları tek ton." },
      { t: "Desen bir parça", d: "Desenli tek parça + düz renkler eşliğinde; ikinci deseni zorlama." },
    ],
    table: [
      { base: "Lacivert", tops: "Beyaz, krem, açık gri, açık mavi, camel, toz pembe", accent: "Bordo, zeytin yeşili, pas" },
      { base: "Bej / Krem", tops: "Beyaz, lacivert, açık mavi, çam yeşili, bordo, koyu kahve", accent: "Pas, hardal" },
      { base: "Gri (açık-koyu)", tops: "Beyaz, siyah, lacivert, bordo, toz pembe, açık mavi", accent: "Zeytin, hardal" },
      { base: "Kot (koyu indigo)", tops: "Neredeyse her şey, ilk olarak beyaz ve krem", accent: "Tek parlak renk" },
      { base: "Haki / Zeytin", tops: "Beyaz, krem, kahve, taba, siyah, açık yıkama kot", accent: "Pas, turuncu" },
      { base: "Siyah", tops: "Beyaz, gri, camel, haki, antrasit, koyu yeşil", accent: "Camel ceket, bordo detay" },
      { base: "Camel / Taba", tops: "Beyaz, krem, lacivert, kahve, bordo", accent: "Zeytin, çam yeşili" },
    ],
    pairs: [
      { a: "Lacivert", b: "Beyaz", d: "En güvenilir kombin; her sezon çalışır." },
      { a: "Lacivert", b: "Camel / Bej", d: "Sıcak-soğuk dengesi; rahat ama şık." },
      { a: "Gri", b: "Bordo", d: "Griye sıcaklık katar, ciddi bir zarafet." },
      { a: "Haki", b: "Krem", d: "Toprak tonların en kolay eşleşmesi." },
      { a: "Camel", b: "Siyah", d: "Yüksek kontrast, akşam için zarif." },
      { a: "Antrasit", b: "Camel", d: "Az denenmiş ama çok iyi çalışan akıllı-casual ikili." },
      { a: "Zeytin", b: "Kahve", d: "Doğal, sonbahar havası." },
      { a: "Petrol", b: "Krem", d: "Sakin ve rafine lacivert alternatifi." },
      { a: "Bordo", b: "Antrasit", d: "Karakterli ve resmi ortamlara uygun." },
      { a: "Açık Mavi", b: "Bej", d: "Yaz kombinlerinin altın standardı." },
    ],
    dont: [
      "İki canlı rengi büyük parçalarda birlikte kullanmak — birini aksesuara indir",
      "Siyah üstüne çok koyu kahve; açık taba ya da antrasit seç, araya krem katacaksan daha iyi",
      "Aynı anda iki desenli parça; neredeyse her zaman dağınık görünür",
      "Ayakkabı ve kemer farklı ailelerden üstüne karışık metal tonu — kombin toparlanmaz",
      "Canlı rengin aksesuar yerine en büyük parçada olması; kontrolü kaybedersin",
    ],
    season: [
      { s: "İlkbahar", d: "Mint, açık yeşil, pastel mavi, toz pembe" },
      { s: "Yaz", d: "Beyaz, bej, açık mavi, pasteller, keten doğallığı" },
      { s: "Sonbahar", d: "Hardal, bordo, zeytin, pas, kahve, camel" },
      { s: "Kış", d: "Siyah, lacivert, antrasit, koyu yeşil, krem kazakla kontrast" },
    ],
    undertone: [
      { t: "Soğuk alt ton", d: "Antrasit, lacivert ve soğuk griler yüzüne daha iyi düşer; bordo ve çam yeşili vurgu olarak iyi çalışır." },
      { t: "Sıcak alt ton", d: "Camel, kahve, haki ve krem seni daha canlı gösterir; zeytin ve pas da uyumludur." },
      { t: "Nötr alt ton", d: "Şanslısın: iki palet de yüzünde çalışır, kontrastı keyfine göre seç." },
    ],
  };

  return {
    FAMILIES: FAMILIES,
    PICKER: PICKER,
    classify: classify,
    pairScore: pairScore,
    deltaE: deltaE,
    lab: lab,
    hexToRgb: hexToRgb,
    rgbToHex: rgbToHex,
    scoreCombo: scoreCombo,
    scoreComboStrict: scoreComboStrict,
    generateCombos: generateCombos,
    surprise: surprise,
    GUIDE: GUIDE,
  };
});
