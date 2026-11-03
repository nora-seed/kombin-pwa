(function () {
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [...(r || document).querySelectorAll(s)];

  function el(tag, cls, txt) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  const CATS = {
    ust: { n: "Üst", icon: "👕" },
    alt: { n: "Alt", icon: "👖" },
    dis: { n: "Dış Giyim", icon: "🧥" },
    ayakkabi: { n: "Ayakkabı", icon: "👟" },
    aksesuar: { n: "Aksesuar", icon: "🧣" },
  };
  const SEASONS = ["İlkbahar", "Yaz", "Sonbahar", "Kış"];
  const SLOTS = ["dis", "ust", "alt", "ayakkabi"];
  const Z_DEFAULT = { alt: 0, ust: 1, ayakkabi: 1, dis: 2, aksesuar: 3 };
  const BOARD_AR = 0.714;
  const FIT_TARGETS = {
    dis: { h: 0.34, top: 0.08, maxW: 58 },
    ust: { h: 0.30, top: 0.115, maxW: 52 },
    alt: { h: 0.37, top: 0.55, maxW: 46 },
    ayakkabi: { h: 0.095, top: 0.87, maxW: 30 },
    aksesuar: { h: 0.12, top: 0.115, maxW: 20 },
  };

  function fitLayout(item, cat, bw) {
    const t = FIT_TARGETS[cat] || FIT_TARGETS.aksesuar;
    bw = bw || BOARD_AR;
    const ar = (item && item.iw && item.ih) ? item.ih / item.iw : 1.33;
    let w = t.h / (bw * (ar || 1)) * 100;
    if (w > t.maxW) w = t.maxW;
    if (w < 8) w = 8;
    const h = ((w / 100) * ar) / bw;
    const y = t.top + Math.min(h, 0.98 - t.top) / 2;
    return { x: 50, y: Math.round(y * 1000) / 10, w: Math.round(w * 10) / 10 };
  }

  function syncItemGeometry(item, p, cat, isLocked) {
    if (!item || !item.img || (item.iw && item.ih)) return Promise.resolve();
    return CAM.loadImage(item.img).then((img) => {
      item.iw = img.naturalWidth;
      item.ih = img.naturalHeight;
      try { DB.ITEMS.put(Object.assign({}, item)); } catch (e) { }
      if (p && !isLocked()) Object.assign(p, fitLayout(item, cat));
    }).catch(() => { });
  }

  const state = {
    view: "dolap",
    items: [],
    outfits: [],
    urls: new Map(),
    filter: { cat: null, q: "", fav: false },
    comboBase: null,
    combos: null,
    comboMsg: null,
    pano: { items: [], sel: null },
    lastComboKeys: new Set(),
  };

  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove("show"), 2200);
  }

  function u(item) {
    if (!item || !item.img) return null;
    if (state.urls.has(item.id)) return state.urls.get(item.id);
    const url = URL.createObjectURL(item.img);
    state.urls.set(item.id, url);
    return url;
  }

  function revU(id) {
    if (state.urls.has(id)) {
      URL.revokeObjectURL(state.urls.get(id));
      state.urls.delete(id);
    }
  }

  const modalRoot = () => $("#modalRoot");

  function openModal(node, cls) {
    const wrap = el("div", "modal-open");
    const back = el("div", "modal-back");
    back.onclick = closeModal;
    wrap.append(back, node);
    modalRoot().appendChild(wrap);
    requestAnimationFrame(() => wrap.classList.add("on"));
    return wrap;
  }

  function closeModal() {
    const w = $("#modalRoot").lastElementChild;
    if (!w) return;
    w.classList.remove("on");
    setTimeout(() => w.remove(), 180);
  }

  function confirmDlg(title, text) {
    return new Promise((res) => {
      const m = el("div", "modal mini");
      m.append(el("h3", "", title), el("p", "muted", text));
      const row = el("div", "btn-row");
      const no = el("button", "btn ghost", "Vazgeç");
      const yes = el("button", "btn danger", "Evet");
      no.onclick = () => { closeModal(); res(false); };
      yes.onclick = () => { closeModal(); res(true); };
      row.append(no, yes);
      m.append(row);
      openModal(m);
    });
  }

  function refresh() {
    return Promise.all([DB.ITEMS.all(), DB.OUTFITS.all()]).then(([items, outfits]) => {
      state.items = items.sort((a, b) => b.createdAt - a.createdAt);
      state.outfits = outfits.sort((a, b) => b.createdAt - a.createdAt);
    });
  }

  function colorInfo(it) {
    if (!it.colorInfo) it.colorInfo = C.classify(it.color || "#8a8d8f");
    return it.colorInfo;
  }

  function navigate(view) {
    state.view = view;
    $$(".tabbar button").forEach((b) => b.classList.toggle("active", b.dataset.nav === view));
    render();
    window.scrollTo(0, 0);
  }

  function render() {
    const v = $("#view");
    v.innerHTML = "";
    if (state.view === "dolap") renderDolap(v);
    else if (state.view === "kombin") renderKombin(v);
    else if (state.view === "pano") renderPano(v);
    else renderRehber(v);
  }

  function matchFilter(it) {
    const f = state.filter;
    if (f.cat && it.category !== f.cat) return false;
    if (f.fav && !it.fav) return false;
    if (f.q) {
      const q = f.q.toLowerCase();
      const hay = (it.name + " " + (it.colorName || "")).toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }

  function renderDolap(v) {
    const head = el("div", "subhead");
    const search = el("input", "search");
    search.type = "search";
    search.placeholder = "Ara…";
    search.value = state.filter.q;
    search.oninput = () => { state.filter.q = search.value; renderGrid(); };
    head.append(search);
    const chips = el("div", "chips");
    const chipDefs = [["all", "Tümü"]].concat(Object.keys(CATS).map((k) => [k, CATS[k].icon + " " + CATS[k].n])).concat([["fav", "⭐ Favori"]]);
    chipDefs.forEach(([k, n]) => {
      const active = k === "all" ? (!state.filter.cat && !state.filter.fav) : k === "fav" ? state.filter.fav : state.filter.cat === k;
      const b = el("button", "chip" + (active ? " active" : ""), n);
      b.onclick = () => {
        if (k === "all") state.filter = { cat: null, q: state.filter.q, fav: false };
        else if (k === "fav") state.filter.fav = !state.filter.fav;
        else state.filter.cat = state.filter.cat === k ? null : k;
        render();
      };
      chips.append(b);
    });
    head.append(chips);
    v.append(head);
    const gridWrap = el("div", "grid-wrap");
    v.append(gridWrap);

    function renderGrid() {
      gridWrap.innerHTML = "";
      const list = state.items.filter(matchFilter);
      if (!state.items.length) {
        const empty = el("div", "empty");
        empty.innerHTML = "<div class='empty-ico'>🧺</div><b>Dolabın boş</b><p>İlk kıyafetini fotoğrafıyla ekle, gerisini uygulama yapar.</p>";
        const b = el("button", "btn primary", "+ İlk kıyafeti ekle");
        b.onclick = () => itemEditor(null);
        empty.append(b);
        gridWrap.append(empty);
        return;
      }
      if (!list.length) {
        gridWrap.append(el("div", "empty small", "Bu filtreyle kıyafet yok."));
        return;
      }
      const grid = el("div", "grid");
      list.forEach((it) => {
        const tile = el("button", "tile");
        const imgBox = el("div", "tile-img");
        const url = u(it);
        if (url) {
          const img = el("img");
          img.src = url;
          img.alt = it.name;
          imgBox.append(img);
        } else {
          imgBox.append(el("div", "tile-ph", CATS[it.category].icon));
        }
        imgBox.style.background = it.img ? "#e8e6e0" : colorInfo(it).neutral ? "#dcdad4" : it.color;
        const dot = el("span", "dot");
        dot.style.background = it.color;
        const label = el("div", "tile-label", it.name);
        const badge = el("span", "badge", CATS[it.category].icon);
        const star = el("span", "tile-star" + (it.fav ? " on" : ""), "★");
        star.setAttribute("role", "button");
        star.setAttribute("aria-label", "Favori");
        star.onclick = (e) => {
          e.stopPropagation();
          it.fav = it.fav ? 0 : 1;
          DB.ITEMS.put(Object.assign({}, it)).then(refresh).then(() => {
            toast(it.fav ? "Favorilere eklendi" : "Favoriden çıkarıldı");
            render();
          });
        };
        tile.append(imgBox, label);
        imgBox.append(dot, badge, star);
        tile.onclick = () => itemEditor(it);
        grid.append(tile);
      });
      gridWrap.append(grid);
    }
    renderGrid();

    const fab = el("button", "fab", "+");
    fab.setAttribute("aria-label", "Kıyafet ekle");
    fab.onclick = () => itemEditor(null);
    v.append(fab);
  }

  function swatchModal(current, onPick) {
    const m = el("div", "modal");
    m.append(el("h3", "", "Renk seç"));
    const grid = el("div", "swatches");
    C.PICKER.forEach((p) => {
      const s = el("button", "swatch" + (p.hex === current ? " on" : ""));
      s.style.background = p.hex;
      s.title = p.name || "";
      s.onclick = () => { closeModal(); onPick(p); };
      grid.append(s);
    });
    m.append(grid);
    openModal(m);
  }
  function uid() {
    return (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : Date.now() + "-" + Math.random().toString(36).slice(2);
  }

  function ensurePanoClear(next) {
    if (!state.pano.items.length) return next();
    confirmDlg("Pano değişecek", "Panoda yerleşim var; yeni seçim üzerine yazacak. Kaydetmek istersen önce panodan kaydet.").then((ok) => { if (ok) next(); });
  }

  function deleteItemCascade(id) {
    const it = state.items.find((x) => x.id === id);
    if (!it) return Promise.resolve();
    const touched = state.outfits.filter((o) => (o.layout || []).some((p) => p.itemId === id));
    return confirmDlg("Kıyafet silinsin mi?", "'" + (it.name || "bu kıyafet") + "' dolaptan ve " + touched.length + " kayıtlı kombinin yerleşiminden çıkarılacak.").then((ok) => {
      if (!ok) return Promise.resolve(false);
      return DB.ITEMS.del(id).then(() => Promise.all(touched.map((o) => {
        const o2 = Object.assign({}, o);
        o2.layout = (o.layout || []).filter((p) => p.itemId !== id);
        return DB.OUTFITS.put(o2);
      }))).then(() => {
        revU(id);
        state.pano.items = state.pano.items.filter((p) => p.itemId !== id);
        state.pano.sel = null;
        return refresh();
      }).then(() => {
        toast("Silindi · " + touched.length + " kombin güncellendi");
        render();
        return true;
      }).catch(() => { toast("Silme sırasında hata oldu"); return false; });
    });
  }

  function itemEditor(existing) {
    const isNew = !existing;
    const draft = existing ? Object.assign({}, existing) : {
      id: uid(), name: "", category: "ust", color: "#8a8d8f", colorName: "Gri",
      colorInfo: null, seasons: [], fav: 0, brand: "", beden: "", note: "",
      img: null, alpha: 0, createdAt: Date.now(),
    };
    draft.colorInfo = draft.colorInfo || C.classify(draft.color);

    const m = el("div", "modal wizard");
    const head = el("div", "wiz-head");
    const dots = el("div", "wiz-dots");
    const titleEl = el("div", "wiz-title", "1/3 · Fotoğraf");
    head.append(dots, titleEl);
    const body = el("div", "wiz-body");
    m.append(head, body);
    openModal(m);

    let step = 0;
    let busy = false;

    function drawHead() {
      dots.innerHTML = "";
      for (let i = 0; i < 3; i++) {
        const d = el("i");
        if (i < step) d.className = "done";
        else if (i === step) d.className = "on";
        dots.append(d);
      }
      titleEl.textContent = (step + 1) + "/3 · " + ["Fotoğraf", "Temizleme", "Bilgiler"][step];
    }

    function applyProcessed(r) {
      CAM.loadImage(r.blob).then((img) => {
        const cv = CAM.toBaseCanvas(img);
        const hex = CAM.dominantColor(cv);
        const info = C.classify(hex);
        draft.img = r.blob;
        draft.alpha = r.alpha ? 1 : 0;
        draft.color = hex;
        draft.colorName = info.name;
        draft.colorInfo = info;
        if (!draft.name) draft.name = info.name + " " + CATS[draft.category].n.toLowerCase();
        drawStep();
      });
    }

    function runEdit(blob) {
      setDots();
      CAM.edit(blob).then((r) => {
        if (r) applyProcessed(r);
        else { step = 0; drawStep(); }
      });
    }
    function setDots() { drawHead(); }

    const acquireCam = () => {
      CAM.capture().then((blob) => {
        if (blob === undefined) return;
        if (!blob) { toast("Kamera burada açılamadı — galeriden dene"); return; }
        runEdit(blob);
      });
    };
    const acquireFile = () => {
      CAM.pickFile().then((f) => {
        if (!f) return;
        runEdit(f);
      });
    };

    function drawStep() {
      drawHead();
      body.innerHTML = "";
      if (step === 0) drawPhotoStep();
      else drawFormStep();
    }

    function drawPhotoStep() {
      const box = el("div", "wiz-photo");
      if (draft.img) {
        const img = el("img", "prev");
        img.src = URL.createObjectURL(draft.img);
        img.onload = () => URL.revokeObjectURL(img.src);
        box.append(img);
        const row = el("div", "btn-row center");
        const bRe = el("button", "btn ghost", "✨ Tekrar düzenle");
        bRe.onclick = () => runEdit(draft.img);
        const bChg = el("button", "btn ghost", "↺ Farklı fotoğraf");
        bChg.onclick = () => { draft.img = null; drawStep(); };
        row.append(bRe, bChg);
        box.append(row);
        const next = el("button", "btn primary big", "▶ Bilgilere geç");
        next.onclick = () => { step = 2; drawStep(); };
        box.append(next);
      } else {
        box.append(el("div", "wiz-ph-ico", "👕"));
        box.append(el("p", "muted center", "Kıyafeti düz bir zeminde çek — sistem zemini otomatik temizleyip kenarlarını keser."));
        const b1 = el("button", "btn primary big", "📷 Kamera ile Çek");
        const b2 = el("button", "btn ghost big", "🖼️ Galeriden Seç");
        b1.onclick = acquireCam;
        b2.onclick = acquireFile;
        box.append(b1, b2);
        box.append(el("p", "tiny muted center", "Fotoğraf isteğe bağlı — atlayıp renk kartı olarak da kaydedebilirsin."));
      }
      body.append(box);
    }

    function drawFormStep() {
      const form = el("div", "item-form");
      const phRow = el("div", "form-photo");
      if (draft.img) {
        const img = el("img");
        img.src = URL.createObjectURL(draft.img);
        img.onload = () => URL.revokeObjectURL(img.src);
        const bEd = el("button", "mini-btn", "✨ Düzenle");
        bEd.onclick = () => CAM.edit(draft.img).then((r) => { if (r) applyProcessed(r); });
        phRow.append(img, bEd);
      } else {
        const bAdd = el("button", "mini-btn", "+ Fotoğraf ekle");
        bAdd.onclick = () => { step = 0; drawStep(); };
        phRow.append(bAdd);
      }
      form.append(phRow);

      const name = el("input");
      name.type = "text";
      name.placeholder = "örn. Zümrüt gömlek";
      name.value = draft.name || "";
      name.oninput = () => { draft.name = name.value; };
      form.append(el("label", "f-lbl", "Ad"), name);

      const catRow = el("div", "chips");
      Object.keys(CATS).forEach((k) => {
        const b = el("button", "chip" + (draft.category === k ? " active" : ""), CATS[k].icon + " " + CATS[k].n);
        b.onclick = () => { draft.category = k; $$(".chip", catRow).forEach((x) => x.classList.remove("active")); b.classList.add("active"); };
        catRow.append(b);
      });
      form.append(el("label", "f-lbl", "Kategori"), catRow);

      form.append(el("label", "f-lbl", "Renk"), el("div", "tiny muted", "Fotograftan otomatik algılandı — dokunup düzeltebilirsin"));
      const colorRow = el("div", "color-row");
      const colorDot = el("button", "big-dot");
      const colorLbl = el("span", "color-lbl", draft.colorName);
      colorDot.style.background = draft.color;
      colorDot.onclick = () => swatchModal(draft.color, (p) => {
        draft.color = p.hex;
        const info = C.classify(p.hex);
        if (p.key) { info.fam = p.key; info.name = p.name || C.FAMILIES[p.key].name; }
        draft.colorName = info.name;
        draft.colorInfo = info;
        colorDot.style.background = draft.color;
        colorLbl.textContent = draft.colorName;
      });
      colorRow.append(colorDot, colorLbl);
      form.append(colorRow);

      const grid = el("div", "f-grid");
      const brand = el("input");
      brand.type = "text";
      brand.placeholder = "Marka";
      brand.value = draft.brand || "";
      brand.oninput = () => { draft.brand = brand.value; };
      const beden = el("input");
      beden.type = "text";
      beden.placeholder = "Beden (M, 32…)";
      beden.value = draft.beden || "";
      beden.oninput = () => { draft.beden = beden.value; };
      grid.append(brand, beden);
      form.append(el("label", "f-lbl", "Marka · Beden"), grid);

      const note = el("textarea");
      note.rows = 2;
      note.placeholder = "Not — çekmece, kumaş, bakım…";
      note.value = draft.note || "";
      note.oninput = () => { draft.note = note.value; };
      form.append(el("label", "f-lbl", "Not"), note);

      const seasonRow = el("div", "chips");
      SEASONS.forEach((s) => {
        const b = el("button", "chip sm" + (draft.seasons.includes(s) ? " active" : ""), s);
        b.onclick = () => {
          draft.seasons = draft.seasons.includes(s) ? draft.seasons.filter((x) => x !== s) : draft.seasons.concat(s);
          b.classList.toggle("active");
        };
        seasonRow.append(b);
      });
      form.append(el("label", "f-lbl", "Sezon"), seasonRow);

      const favRow = el("label", "fav-row");
      const favInp = el("input");
      favInp.type = "checkbox";
      favInp.checked = !!draft.fav;
      favInp.onchange = () => { draft.fav = favInp.checked ? 1 : 0; };
      favRow.append(favInp, el("span", "", "⭐ Favori (kombinlerde önceliklenir)"));
      form.append(favRow);

      const bRow = el("div", "btn-row");
      const bBack = el("button", "btn ghost", "◀ Fotoğraf");
      bBack.onclick = () => { step = 0; drawStep(); };
      const save = el("button", "btn primary", isNew ? "Dolaba ekle ✓" : "Kaydet ✓");
      save.onclick = () => {
        if (busy) return;
        busy = true;
        save.disabled = true;
        save.textContent = "Kaydediliyor…";
        const rec = Object.assign({}, draft);
        rec.name = (draft.name || "").trim() || ((draft.colorName || "Kıyafet") + " " + CATS[draft.category].n.toLowerCase());
        rec.colorInfo = draft.colorInfo || C.classify(draft.color);
        rec.colorName = rec.colorInfo.name;
        rec.createdAt = existing ? existing.createdAt : Date.now();
        DB.ITEMS.put(rec).then(() => refresh()).then(() => { closeModal(); render(); toast(isNew ? "Dolaba eklendi 🧺" : "Güncellendi ✓"); }).catch(() => { toast("Kaydedilemedi — yer açın ya da yeniden deneyin"); }).then(() => { busy = false; save.disabled = false; });
      };
      bRow.append(bBack, save);
      form.append(bRow);

      if (!isNew) {
        const dRow = el("div", "btn-row");
        const del = el("button", "btn danger ghost full", "🗑️ Bu kıyafeti sil");
        del.onclick = () => deleteItemCascade(existing.id).then((deleted) => { if (deleted) closeModal(); });
        dRow.append(del);
        form.append(dRow);
      }
      body.append(form);
    }

    drawStep();
  }

  function comboMiniVisual(comboIds) {
    const box = el("div", "mini");
    ["alt", "ayakkabi", "ust", "dis", "aksesuar"].forEach((slot) => {
      const id = comboIds[slot];
      if (!id) return;
      const it = state.items.find((i) => i.id === id);
      if (!it || !u(it)) return;
      const img = el("img");
      img.src = u(it);
      const lit = fitLayout(it, slot, 0.75);
      img.style.left = lit.x + "%";
      img.style.top = lit.y + "%";
      img.style.width = lit.w + "%";
      box.append(img);
    });
    if (!box.children.length) {
      box.style.background = "linear-gradient(135deg,#e3e0d8,#efede7)";
      box.append(el("div", "mini-ph", "Renk önizlemesi"));
    }
    return box;
  }

  function renderKombin(v) {
    const pickerWrap = el("div", "combo-picker");
    pickerWrap.append(el("h2", "sec-title", "🎯 Bir parçadan başla"));
    const rail = el("div", "rail");
    if (!state.items.length) {
      rail.append(el("div", "empty small", "Önce dolaba kıyafet ekle. "));
    } else {
      const btnAll = el("button", "rail-tile ghost-tile" + (state.comboBase === null ? " on" : ""));
      btnAll.append(el("div", "rail-ph", "🎲"));
      btnAll.append(el("span", "", "Hepsi"));
      btnAll.onclick = () => { state.comboBase = null; state.combos = null; render(); };
      rail.append(btnAll);
      state.items.slice(0, 30).forEach((it) => {
        const t = el("button", "rail-tile" + (state.comboBase === it.id ? " on" : ""));
        const url = u(it);
        const ph = el("div", "rail-ph");
        ph.style.background = colorInfo(it).neutral ? "#e2e0da" : it.color;
        if (url) {
          const img = el("img");
          img.src = url;
          ph.append(img);
        } else ph.append(el("span", "", CATS[it.category].icon));
        t.append(ph, el("span", "", (it.name || "").slice(0, 18)));
        t.onclick = () => { state.comboBase = it.id; state.combos = null; render(); };
        rail.append(t);
      });
    }
    pickerWrap.append(rail);
    const actions = el("div", "btn-row center");
    const bGen = el("button", "btn primary", "✨ Kombin olsun");
    const bSrp = el("button", "btn ghost", "🎲 Sürpriz");
    bGen.onclick = () => {
      const r = C.generateCombos(state.items, state.comboBase, { limit: 12 });
      state.combos = r.combos;
      state.comboMsg = r.message || null;
      render();
    };
    bSrp.onclick = () => {
      const r = C.surprise(state.items, state.lastComboKeys);
      if (r && r.combos.length) {
        state.combos = r.combos;
        state.comboMsg = r.message || null;
        r.combos.forEach((c) => state.lastComboKeys.add(c.ids.ust + "|" + c.ids.alt + "|" + c.ids.ayakkabi + "|" + c.ids.dis));
      } else if (state.combos) {
        const rand = state.combos[Math.floor(Math.random() * state.combos.length)];
        state.combos = [rand];
        state.comboMsg = null;
      } else {
        const rr = C.generateCombos(state.items, state.comboBase, { limit: 6 });
        state.combos = rr.combos.length ? [rr.combos[Math.floor(Math.random() * rr.combos.length)]] : [];
        state.comboMsg = rr.message || null;
      }
      render();
    };
    actions.append(bGen, bSrp);
    pickerWrap.append(actions);
    v.append(pickerWrap);

    if (state.comboMsg) {
      const msg = el("div", "empty small", state.comboMsg);
      v.append(msg);
    }
    if (state.combos && state.combos.length) {
      const sec = el("section", "combo-sec");
      sec.append(el("h2", "sec-title", "Sana özel kombinler"));
      const list = el("div", "combo-list");
      state.combos.forEach((c, idx) => {
        const card = el("div", "combo-card");
        const top = el("div", "combo-top");
        const mini = comboMiniVisual(c.ids);
        top.append(mini);
        const ring = el("div", "ring svg");
        const pct = c.score;
        const col = pct >= 85 ? "var(--good)" : pct >= 70 ? "var(--warn)" : "var(--bad)";
        ring.innerHTML = "<svg viewBox='0 0 48 48'><circle cx='24' cy='24' r='20' fill='none' stroke='var(--ring-track)' stroke-width='5'/><circle cx='24' cy='24' r='20' fill='none' stroke='" + col + "' stroke-width='5' stroke-dasharray='" + (pct * 1.2566).toFixed(1) + " 126' stroke-linecap='round' transform='rotate(-90 24 24)'/></svg><b>" + pct + "</b>";
        top.append(ring);
        card.append(top);
        const names = SLOTS.map((slot) => {
          const id = c.ids[slot];
          if (!id) return null;
          const it = state.items.find((i) => i.id === id);
          return it ? CATS[slot].icon + " " + esc(it.name) : null;
        }).filter(Boolean);
        const nm = el("p", "combo-names");
        nm.innerHTML = names.map(esc).join("  ·  ");
        card.append(nm);
        const notes = el("ul", "combo-notes");
        (c.notes || []).slice(0, 3).forEach((n) => notes.append(el("li", "", n)));
        card.append(notes);
        const cb = el("div", "btn-row");
        const bp = el("button", "btn ghost sm", "🎨 Panoya");
        bp.onclick = () => loadComboToPano(c);
        const bs = el("button", "btn sm primary ghost", "💾 Kaydet");
        bs.onclick = () => saveOutfitFromIds(c.ids, null);
        cb.append(bp, bs);
        card.append(cb);
        list.append(card);
      });
      sec.append(list);
      v.append(sec);
    }

    const sec2 = el("section", "combo-sec");
    sec2.append(el("h2", "sec-title", "💾 Kayıtlı kombinler"));
    if (!state.outfits.length) sec2.append(el("div", "empty small", "Henüz kayıtlı kombin yok."));
    else {
      const list2 = el("div", "outfit-list");
      state.outfits.forEach((o) => {
        const row = el("div", "outfit-row");
        const th = el("div", "outfit-thumb");
        if (o.thumb) {
          const img = el("img");
          img.src = o.thumb;
          th.append(img);
        } else th.append(el("span", "", "🧣"));
        row.append(th);
        const info = el("div", "outfit-info");
        info.append(el("b", "", o.name || "Kombin"), el("span", "muted", new Date(o.createdAt).toLocaleDateString("tr-TR") + " • " + (o.layout ? o.layout.length : 0) + " parça"));
        row.append(info);
        const btns = el("div", "btn-sm");
        const open = el("button", "icon-btn", "▶️");
        open.onclick = () => ensurePanoClear(() => { state.pano.items = JSON.parse(JSON.stringify(o.layout || [])); state.pano.sel = null; navigate("pano"); toast("Panoda açıldı"); });
        const del = el("button", "icon-btn", "🗑️");
        del.onclick = () => confirmDlg("Sil?", "Kayıtlı kombin silinsin mi?").then((ok2) => { if (ok2) DB.OUTFITS.del(o.id).then(refresh).then(render); });
        btns.append(open, del);
        row.append(btns);
        list2.append(row);
      });
      sec2.append(list2);
    }
    v.append(sec2);
  }

  function loadComboToPano(combo) {
    ensurePanoClear(() => {
      state.pano.items = [];
      state.pano.sel = null;
      Object.keys(combo.ids).forEach((slot) => {
        const id = combo.ids[slot];
        if (!id) return;
        const it = state.items.find((i) => i.id === id);
        if (!it) return;
        const p = { itemId: id, cat: slot, rot: 0, z: Z_DEFAULT[slot] != null ? Z_DEFAULT[slot] : state.pano.items.length };
        Object.assign(p, fitLayout(it, slot));
        state.pano.items.push(p);
        syncItemGeometry(it, p, slot, () => p._locked);
      });
      navigate("pano");
      toast("Panoda yerleşti — istersen elle oynat");
    });
  }

  function saveOutfitFromIds(ids, layout) {
    const o = {
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now() + "-" + Math.random().toString(36).slice(2),
      name: "Kombin " + new Date().toLocaleDateString("tr-TR"),
      createdAt: Date.now(),
      layout: layout || (function () {
        const arr = [];
        let k = 0;
        ["alt", "ust", "ayakkabi", "dis", "aksesuar"].forEach((slot) => {
          if (!ids[slot]) return;
          const it = state.items.find((i) => i.id === ids[slot]);
          arr.push(Object.assign({ itemId: ids[slot], cat: slot, rot: 0, z: k++ }, it ? fitLayout(it, slot) : { x: 50, y: 50, w: 30 }));
          k = arr[arr.length - 1].z + 1;
        });
        return arr;
      })(),
      thumb: null,
    };
    return renderThumb(o).then((t) => { o.thumb = t; return DB.OUTFITS.put(o); }).then(refresh).then(() => toast("Kombin kaydedildi 💾"));
  }

  function renderThumb(o) {
    const base = 160;
    const cv = document.createElement("canvas");
    cv.width = base; cv.height = Math.round(base * 4 / 3);
    const ctx = cv.getContext("2d");
    ctx.fillStyle = "#f5f2ea";
    ctx.fillRect(0, 0, cv.width, cv.height);
    const entries = (o.layout || []).slice().sort((a, b) => (a.z || 0) - (b.z || 0));
    return Promise.all(entries.map((p) => {
      const it = state.items.find((i) => i.id === p.itemId);
      if (!it || !it.img) return null;
      return CAM.loadImage(it.img).then((img) => ({ img: img, p: p }));
    })).then((vals) => {
      vals.filter(Boolean).forEach(({ img, p }) => {
        const wpx = (p.w / 100) * cv.width;
        const hpx = wpx * img.naturalHeight / img.naturalWidth;
        const cx = (p.x / 100) * cv.width, cy = (p.y / 100) * cv.height;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate((p.rot || 0) * Math.PI / 180);
        ctx.drawImage(img, -wpx / 2, -hpx / 2, wpx, hpx);
        ctx.restore();
      });
      return cv.toDataURL("image/jpeg", 0.7);
    });
  }

  function renderPano(v) {
    const wrap = el("div", "pano-wrap");
    const board = el("div", "board");
    const mannequin = el("div", "mannequin");
    mannequin.innerHTML = mannequinSvg("var(--man-a)", "var(--man-b)", "var(--man-line)");
    board.append(mannequin);
    const ghostWrap = el("div", "ghosts");
    board.append(ghostWrap);
    const placedLayer = el("div", "placed");
    board.append(placedLayer);
    wrap.append(board);
    wrap.append(el("div", "pano-hint", "💡 Arka plan dolu parçalar dağınık durur — Dolap → kıyafete dokun → ✨ Düzenle → Oto Zemin ile temizle."));

    function ghostSync() {
      ghostWrap.innerHTML = "";
      SLOTS.forEach((slot) => {
        if (state.pano.items.some((p) => p.cat === slot)) return;
        const g = el("button", "slot-ghost " + slot, "+ " + CATS[slot].n);
        g.onclick = (ev) => { ev.stopPropagation(); openPicker(slot); };
        ghostWrap.append(g);
      });
    }

    const itemById = {};
    state.items.forEach((i) => (itemById[i.id] = i));

    function paint() {
      placedLayer.innerHTML = "";
      state.pano.items.slice().sort((a, b) => (a.z || 0) - (b.z || 0)).forEach((p) => {
        const it = itemById[p.itemId];
        if (!it) return;
        const node = el("div", "pano-item" + (state.pano.sel === p ? " sel" : ""));
        node.style.left = p.x + "%";
        node.style.top = p.y + "%";
        node.style.width = p.w + "%";
        node.style.transform = "translate(-50%,-50%) rotate(" + (p.rot || 0) + "deg)";
        if (it.img && u(it)) {
          const img = el("img");
          img.src = u(it);
          node.append(img);
        } else {
          node.append(el("div", "pano-ph", CATS[p.cat].icon));
        }
        node.addEventListener("pointerdown", (e) => startDrag(e, p));
        placedLayer.append(node);
      });
      ghostSync();
      toolSync();
      traySync();
    }

    let dragState = null;
    function startDrag(e, p) {
      e.preventDefault();
      state.pano.sel = p;
      dragState = { p, id: e.pointerId, sx: e.clientX, sy: e.clientY, ox: p.x, oy: p.y, pts: new Map([[e.pointerId, { x: e.clientX, y: e.clientY }]]) };
      $(".board").setPointerCapture(e.pointerId);
      paint();
    }
    board.addEventListener("pointermove", (e) => {
      if (!dragState || !dragState.pts.has(e.pointerId)) return;
      dragState.pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (dragState.pts.size === 1) {
        const moved = Math.hypot(e.clientX - dragState.sx, e.clientY - dragState.sy);
        if (moved > 4) dragState.p._locked = true;
        const r = board.getBoundingClientRect();
        dragState.p.x = Math.max(5, Math.min(95, dragState.ox + (e.clientX - dragState.sx) * 100 / r.width));
        dragState.p.y = Math.max(5, Math.min(97, dragState.oy + (e.clientY - dragState.sy) * 100 / r.height));
        const node = $$(".pano-item", placedLayer)[[...state.pano.items].sort((a, b) => (a.z || 0) - (b.z || 0)).indexOf(dragState.p)];
        if (node) {
          node.style.left = dragState.p.x + "%";
          node.style.top = dragState.p.y + "%";
        }
        return;
      }
      if (dragState.pts.size === 2) {
        const [a, b] = [...dragState.pts.values()];
        const d = Math.hypot(b.x - a.x, b.y - a.y);
        const ang = Math.atan2(b.y - a.y, b.x - a.x);
        if (!dragState.pinch) {
          dragState.pinch = { d, ang, w: dragState.p.w, rot: dragState.p.rot || 0 };
        } else {
          dragState.p._locked = true;
          dragState.p.w = Math.max(8, Math.min(95, dragState.pinch.w * d / dragState.pinch.d));
          dragState.p.rot = dragState.pinch.rot + (ang - dragState.pinch.ang) * 57.3;
          paintLight();
        }
      }
    });
    function paintLight() {
      const nodes = $$(".pano-item", placedLayer);
      state.pano.items.slice().sort((a, b) => (a.z || 0) - (b.z || 0)).forEach((p, i) => {
        const n = nodes[i];
        if (!n) return;
        n.style.width = p.w + "%";
        n.style.transform = "translate(-50%,-50%) rotate(" + (p.rot || 0) + "deg)";
      });
    }
    board.addEventListener("pointerup", (e) => {
      if (!dragState) return;
      dragState.pts.delete(e.pointerId);
      dragState.pinch = null;
      if (!dragState.pts.size) { dragState = null; paint(); }
    });
    board.addEventListener("pointercancel", (e) => {
      if (!dragState) return;
      dragState.pts.delete(e.pointerId);
      dragState.pinch = null;
      if (!dragState.pts.size) { dragState = null; paint(); }
    });

    const toolbar = el("div", "pano-toolbar hidden");
    const tkZoomOut = el("button", "icon-btn", "➖");
    const tkZoomIn = el("button", "icon-btn", "➕");
    const tkRotL = el("button", "icon-btn", "⟲");
    const tkRotR = el("button", "icon-btn", "⟳");
    const tkFront = el("button", "icon-btn", "⬆️");
    const tkBack = el("button", "icon-btn", "⬇️");
    const tkDel = el("button", "icon-btn danger", "🗑️");
    tkZoomOut.onclick = () => zoomSel(1 / 1.15);
    tkZoomIn.onclick = () => zoomSel(1.15);
    tkRotL.onclick = () => rotSel(-15);
    tkRotR.onclick = () => rotSel(15);
    tkFront.onclick = () => layerSel(1);
    tkBack.onclick = () => layerSel(-1);
    tkDel.onclick = () => {
      const s = state.pano.sel;
      if (!s) return;
      state.pano.items = state.pano.items.filter((x) => x !== s);
      state.pano.sel = null;
      paint();
      toolSync();
    };
    toolbar.append(tkZoomOut, tkZoomIn, tkRotL, tkRotR, tkFront, tkBack, tkDel);
    wrap.append(toolbar);

    function zoomSel(k) {
      const s = state.pano.sel;
      if (!s) return;
      s.w = Math.max(8, Math.min(95, s.w * k));
      paint();
    }
    function rotSel(d) {
      const s = state.pano.sel;
      if (!s) return;
      s._locked = true;
      s.rot = ((s.rot || 0) + d) % 360;
      paint();
    }
    function layerSel(dir) {
      const s = state.pano.sel;
      if (!s) return;
      const zs = state.pano.items.map((p) => p.z || 0);
      s.z = Math.max(0, Math.min(50, (s.z || 0) + dir));
      if (dir > 0) s.z = Math.max.apply(null, zs.concat([0])) + 1;
      else s.z = Math.min.apply(null, zs.concat([0])) - 1;
      if (s.z < 0) s.z = 0;
      paint();
    }

    const tray = el("div", "pano-tray");
    const trayTitle = el("div", "tray-title", "Parça ekle");
    tray.append(trayTitle);
    const trayChips = el("div", "chips");
    Object.keys(CATS).forEach((cat) => {
      const count = state.pano.items.filter((p) => p.cat === cat).length;
      const b = el("button", "chip sm", CATS[cat].icon + " " + CATS[cat].n + (count ? " •" + count : ""));
      b.dataset.cat = cat;
      b.onclick = () => {
        const have = state.pano.items.find((p) => p.cat === cat);
        if (have) {
          state.pano.items = state.pano.items.filter((p) => p !== have);
          const it = state.items.find((i) => i.id === have.itemId);
          const np = { itemId: have.itemId, cat: cat, rot: have.rot || 0, z: have.z != null ? have.z : state.pano.items.length };
          Object.assign(np, fitLayout(it || {}, cat));
          state.pano.items.push(np);
          if (it) syncItemGeometry(it, np, cat, () => np._locked);
        }
        openPicker(cat);
      };
      trayChips.append(b);
    });
    tray.append(trayChips);
    wrap.append(tray);

    function traySync() {
      $$(".chip", trayChips).forEach((b, i) => {
        const cat = Object.keys(CATS)[i];
        const count = state.pano.items.filter((p) => p.cat === cat).length;
        const base = CATS[cat].icon + " " + CATS[cat].n;
        b.textContent = base + (count ? " •" + count : "");
      });
    }

    const actions = el("div", "btn-row pano-actions");
    const bSave = el("button", "btn primary", "💾 Kombini kaydet");
    const bPng = el("button", "btn ghost", "🖼️ PNG");
    const bClear = el("button", "btn ghost danger", "🧹 Temizle");
    bSave.onclick = () => {
      if (!state.pano.items.length) { toast("Panoya önce parça ekle"); return; }
      savePanoDialog();
    };
    bPng.onclick = () => exportPngDialog();
    bClear.onclick = () => confirmDlg("Temizle?", "Panodaki parçalar kalkacak (kayıtlıların silinmez).").then((ok) => { if (ok) { state.pano.items = []; state.pano.sel = null; paint(); toolSync(); } });
    actions.append(bSave, bPng, bClear);
    wrap.append(actions);

    function savePanoDialog() {
      const m = el("div", "modal mini");
      m.append(el("h3", "", "Kombin adı"));
      const inp = el("input");
      inp.type = "text";
      inp.placeholder = "örn. Cumartesi kavuşması";
      m.append(inp);
      const row = el("div", "btn-row");
      const no = el("button", "btn ghost", "Vazgeç");
      const ok = el("button", "btn primary", "Kaydet");
      no.onclick = closeModal;
      ok.onclick = () => {
        const o = {
          id: crypto.randomUUID ? crypto.randomUUID() : Date.now() + "-" + Math.random().toString(36).slice(2),
          name: inp.value.trim() || "Kombin " + new Date().toLocaleDateString("tr-TR"),
          createdAt: Date.now(),
          layout: JSON.parse(JSON.stringify(state.pano.items)),
          thumb: null,
        };
        renderThumb(o).then((t) => { o.thumb = t; return DB.OUTFITS.put(o); }).then(refresh).then(() => { closeModal(); toast("Kaydedildi 💾"); });
      };
      row.append(no, ok);
      m.append(row);
      openModal(m);
      setTimeout(() => inp.focus(), 250);
    }

    function openPicker(cat) {
      const list = state.items.filter((i) => i.category === cat);
      const m = el("div", "modal");
      m.append(el("h3", "", CATS[cat].icon + " " + CATS[cat].n + " seç"));
      if (!list.length) m.append(el("div", "empty small", "Bu kategoride kıyafet yok. Dolap sekmesinden ekle."));
      const grid = el("div", "grid");
      list.forEach((it) => {
        const t = el("button", "tile");
        const box = el("div", "tile-img");
        box.style.background = colorInfo(it).neutral ? "#e2e0da" : it.color;
        if (u(it)) {
          const img = el("img");
          img.src = u(it);
          box.append(img);
    } else {
      box.append(el("div", "tile-ph", CATS[it.category].icon));
    }
    const dot = el("span", "dot");
    dot.style.background = it.color;
    box.append(dot);
        t.append(box, el("div", "tile-label", it.name));
        t.onclick = () => {
          const existing = state.pano.items.find((p) => p.cat === cat);
          const lit = fitLayout(it, cat);
          let p;
          if (existing) {
            p = existing;
            if (!p._locked) Object.assign(p, lit, { rot: 0 });
            p.itemId = it.id;
            p.cat = cat;
          } else {
            p = { itemId: it.id, cat: cat, rot: 0, z: Z_DEFAULT[cat] != null ? Z_DEFAULT[cat] : state.pano.items.length };
            Object.assign(p, lit);
            state.pano.items.push(p);
          }
          p._locked = false;
          syncItemGeometry(it, p, cat, () => (state.pano.items.indexOf(p) < 0 || p._locked));
          closeModal();
          paint();
          toolSync();
        };
        grid.append(t);
      });
      m.append(grid);
      openModal(m);
    }

    function toolSync() {
      toolbar.classList.toggle("hidden", !state.pano.sel);
    }

    wrap.addEventListener("pointerdown", (e) => {
      if (e.target === board || e.target === placedLayer || e.target === ghostWrap) {
        state.pano.sel = null;
        toolSync();
        paint();
      }
    });

    paint();
    toolSync();
    v.append(wrap);
  }
  const MAN_BODY = '<circle cx="150" cy="34" r="22"/>' +
    '<path d="M142 54 L158 54 L158 66 Q150 71 142 66 Z"/>' +
    '<path d="M150 62 C130 62 118 66 111 74 C104 82 101 92 100 102 L97 150 C96 163 112 168 114 155 L118 122 L118 218 C118 236 128 246 144 246 L156 246 C172 246 182 236 182 218 L182 122 L186 155 C188 168 204 163 203 150 L200 102 C199 92 196 82 189 74 C182 66 170 62 150 62 Z"/>' +
    '<path d="M120 246 L180 246 C186 246 188 250 188 254 L188 268 C188 276 180 278 172 278 L128 278 C120 278 112 276 112 268 L112 254 C112 250 114 246 120 246 Z"/>' +
    '<path d="M121 276 C117 310 118 356 123 390 C124 400 136 400 137 390 C141 356 143 312 145 278 Z"/>' +
    '<path d="M179 276 C183 310 182 356 177 390 C176 400 164 400 163 390 C159 356 157 312 155 278 Z"/>' +
    '<rect x="111" y="392" width="36" height="15" rx="7.5"/>' +
    '<rect x="153" y="392" width="36" height="15" rx="7.5"/>';

  function mannequinSvg(a, b, line, sh) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 430">' +
      '<defs><linearGradient id="mg" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="' + a + '"/><stop offset="1" stop-color="' + b + '"/>' +
      '</linearGradient></defs>' +
      '<ellipse cx="150" cy="418" rx="50" ry="6.5" fill="' + (sh || "#000") + '" opacity="0.13"/>' +
      '<g fill="url(#mg)" stroke="' + (line || "none") + '" stroke-width="1.3" stroke-opacity="0.6">' + MAN_BODY + '</g></svg>';
  }

  function exportPngDialog() {
    if (!state.pano.items.length) { toast("Panoya önce parça ekle"); return; }
    const m = el("div", "modal mini");
    m.append(el("h3", "", "PNG olarak indir"));
    let withMan = false, dark = false;
    const optMan = el("label", "fav-row");
    const manChk = el("input");
    manChk.type = "checkbox";
    manChk.onchange = () => { withMan = manChk.checked; };
    optMan.append(manChk, el("span", "", "📐 Manken silüeti dahil"));
    m.append(optMan);
    const bgLbl = el("div", "f-lbl", "Arka plan");
    m.append(bgLbl);
    const bgRow = el("div", "chips");
    const mkBg = (lbl, val) => {
      const b = el("button", "chip" + (val === dark ? " active" : ""), lbl);
      b.onclick = () => { dark = val; $$("button", bgRow).forEach((x) => x.classList.remove("active")); b.classList.add("active"); };
      return b;
    };
    bgRow.append(mkBg("Açık", false), mkBg("Koyu", true));
    m.append(bgRow);
    const row = el("div", "btn-row");
    const no = el("button", "btn ghost", "Vazgeç");
    no.onclick = closeModal;
    const go = el("button", "btn primary", "⬇️ İndir");
    go.onclick = () => { closeModal(); exportPng(withMan, dark); };
    row.append(no, go);
    m.append(row);
    openModal(m);
  }

  function exportPng(withMan, dark) {
    const cv = document.createElement("canvas");
    cv.width = 900;
    cv.height = 1200;
    const ctx = cv.getContext("2d");
    ctx.fillStyle = dark ? "#171a21" : "#f5f2ea";
    ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.font = "600 30px system-ui, sans-serif";
    ctx.fillStyle = dark ? "#8b8ea0" : "#b7b2a6";
    ctx.textAlign = "center";
    ctx.fillText("🧥 Kombin", cv.width / 2, 58);
    const drawItems = () => {
      const entries = state.pano.items.slice().sort((a, b) => (a.z || 0) - (b.z || 0));
      return Promise.all(entries.map((p) => {
        const it = state.items.find((i) => i.id === p.itemId);
        if (!it || !it.img) return null;
        return CAM.loadImage(it.img).then((img) => ({ img: img, p: p }));
      })).then((vals) => {
        vals.filter(Boolean).forEach(({ img, p }) => {
          const wpx = (p.w / 100) * cv.width;
          const hpx = wpx * img.naturalHeight / img.naturalWidth;
          ctx.save();
          ctx.translate((p.x / 100) * cv.width, (p.y / 100) * cv.height);
          ctx.rotate((p.rot || 0) * Math.PI / 180);
          ctx.drawImage(img, -wpx / 2, -hpx / 2, wpx, hpx);
          ctx.restore();
        });
        cv.toBlob((b) => {
          const a = document.createElement("a");
          a.href = URL.createObjectURL(b);
          a.download = "kombin-" + Date.now() + ".png";
          a.click();
          setTimeout(() => URL.revokeObjectURL(a.href), 4000);
          toast("PNG indirildi");
        }, "image/png");
      });
    };
    if (!withMan) { drawItems(); return; }
    const svgBlob = new Blob([mannequinSvg(
      dark ? "#2b303a" : "#e4e1d7", dark ? "#1f232b" : "#c6c2b6",
      dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.15)", dark ? "#000000" : "#8a8578"
    )], { type: "image/svg+xml" });
    CAM.loadImage(svgBlob).then((mimg) => {
      const w = cv.width * 0.62;
      const h = w * 430 / 300;
      ctx.drawImage(mimg, (cv.width - w) / 2, (cv.height - h) / 2, w, h);
      return drawItems();
    });
  }

  function renderRehber(v) {
    const g = C.GUIDE;
    const intro = el("section", "guide-card");
    intro.innerHTML = "<h2>🧭 Yöntem</h2><p><b>Nötr taban + en fazla 3 renk + tek vurgu.</b> Gardırobuğun %60–80’sini lacivert/gri/bej/kahve/haki gibi nötrler oluştursa geri kalan her karar kolaylaşır. Bu rehber araştırılmış klasik erkek stil kurallarından derlendi.</p>";
    v.append(intro);

    const rules = el("section", "guide-grid");
    g.rules.forEach((r) => {
      const c = el("div", "guide-card");
      c.append(el("b", "", r.t), el("p", "muted", r.d));
      rules.append(c);
    });
    v.append(rules);

    const pairs = el("section", "guide-sec");
    pairs.append(el("h2", "sec-title", "✅ Her zaman çalışan ikililer"));
    const pairList = el("div", "pair-list");
    g.pairs.forEach((p) => {
      const row = el("div", "pair-row");
      const famFinder = (label, fallback) => {
        const direct = label.split("/")[0].trim();
        const f = Object.values(C.FAMILIES).find((x) => x.name === direct);
        return f || C.FAMILIES[fallback];
      };
      const fa = famFinder(p.a, "lacivert");
      const fb = famFinder(p.b, "beyaz");
      const dotA = el("span", "dot big");
      dotA.style.background = fa.hex;
      const dotB = el("span", "dot big");
      dotB.style.background = fb.hex;
      const txt = el("div", "pair-txt");
      txt.append(el("b", "", p.a + " + " + p.b), el("span", "muted", p.d));
      row.append(dotA, dotB, txt);
      pairList.append(row);
    });
    pairs.append(pairList);
    v.append(pairs);

    const table = el("section", "guide-sec");
    table.append(el("h2", "sec-title", "📋 Uyum tablosu"));
    g.table.forEach((t) => {
      const row = el("div", "table-row");
      const chip = el("span", "dot big");
      const fam = Object.values(C.FAMILIES).find((f) => t.base.includes(f.name.split(" ")[0]));
      chip.style.background = fam ? fam.hex : "#888";
      row.append(chip, el("b", "", t.base));
      const main = el("div", "table-main");
      main.append(el("div", "muted", t.tops));
      main.append(el("span", "accent-line", t.accent));
      row.append(main);
      table.append(row);
    });
    v.append(table);

    const dd = el("section", "guide-sec");
    dd.append(el("h2", "sec-title", "🚫 Yapma"));
    const dl = el("ul", "dont-list");
    g.dont.forEach((d) => dl.append(el("li", "", d)));
    dd.append(dl);
    v.append(dd);

    const seasons = el("section", "guide-sec");
    seasons.append(el("h2", "sec-title", "🗓️ Mevsime göre palet"));
    g.season.forEach((s) => {
      const row = el("div", "table-row");
      row.append(el("b", "", s.s), el("span", "muted", s.d));
      seasons.append(row);
    });
    v.append(seasons);

    const under = el("section", "guide-sec");
    under.append(el("h2", "sec-title", "🎨 Ten alt tonu"));
    g.undertone.forEach((s) => {
      const row = el("div", "table-row");
      row.append(el("b", "", s.t), el("span", "muted", s.d));
      under.append(row);
    });
    v.append(under);
  }

  function backupMenu() {
    const m = el("div", "modal mini");
    m.append(el("h3", "", "Yedek & ayarlar"));
    const bExp = el("button", "btn ghost full", "⬇️ Yedeği dışa aktar (JSON)");
    const bImp = el("button", "btn ghost full", "⬆️ Yedeği içe aktar");
    const bWipe = el("button", "btn danger ghost full", "💣 Tüm verileri sil");
    const themeL = el("label", "fav-row");
    const themeChk = el("input");
    themeChk.type = "checkbox";
    themeChk.checked = document.documentElement.dataset.theme === "dark";
    themeChk.onchange = () => setTheme(themeChk.checked ? "dark" : "light");
    themeL.append(themeChk, el("span", "", "🌙 Koyu tema"));
    bExp.onclick = () => {
      DB.exportAll().then((json) => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob([json], { type: "application/json" }));
        a.download = "kombin-yedek-" + new Date().toISOString().slice(0, 10) + ".json";
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
        toast("Yedek indirildi");
      });
    };
    bImp.onclick = () => {
      const inp = el("input");
      inp.type = "file";
      inp.accept = "application/json";
      inp.onchange = () => {
        if (!inp.files[0]) { inp.remove(); return; }
        inp.files[0].text().then((t) => DB.importJSON(t, false)).then(refresh).then(() => { closeModal(); render(); toast("Yedek yüklendi"); }).catch(() => toast("Yedek dosyası hatalı"));
        inp.remove();
      };
      inp.click();
    };
    bWipe.onclick = () => {
      confirmDlg("Tüm veriler silinsin mi?", "Dolap ve kombinler kalıcı olarak silinir. Önce yedek almayı düşün.").then((ok) => {
        if (ok) DB.wipe().then(() => { state.items = []; state.outfits = []; state.pano.items = []; closeModal(); refresh().then(render); toast("Yok edildi… kolları sıva 🧺"); });
      });
    };
    m.append(bExp, bImp, themeL, bWipe);
    openModal(m);
  }

  function setTheme(t) {
    document.documentElement.dataset.theme = t;
    localStorage.setItem("kombin-theme", t);
  }

  function init() {
    setTheme(localStorage.getItem("kombin-theme") || "light");
    $("#themeBtn").onclick = () => setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
    $("#menuBtn").onclick = backupMenu;
    $$(".tabbar button").forEach((b) => { b.onclick = () => navigate(b.dataset.nav); });
    refresh().then(render);
  }

  window.App = { state: state, render: render, navigate: navigate, refresh: refresh };
  document.addEventListener("DOMContentLoaded", init);
})();
