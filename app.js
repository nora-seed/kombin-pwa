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
  const SLOT_POS = {
    dis: { x: 50, y: 14, w: 46 },
    ust: { x: 50, y: 27, w: 40 },
    alt: { x: 50, y: 62, w: 36 },
    ayakkabi: { x: 50, y: 90.5, w: 24 },
    aksesuar: { x: 50, y: 19.5, w: 12 },
  };
  const SLOTS = ["dis", "ust", "alt", "ayakkabi"];

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

  function itemEditor(existing) {
    const isNew = !existing;
    const draft = existing ? Object.assign({}, existing) : {
      id: (crypto.randomUUID ? crypto.randomUUID() : Date.now() + "-" + Math.random().toString(36).slice(2)),
      name: "", category: "ust", color: "#8a8d8f", colorName: "Gri",
      colorInfo: null, seasons: [], fav: 0, img: null, alpha: 0, createdAt: Date.now(), seasonsOld: null,
    };
    draft.colorInfo = draft.colorInfo || C.classify(draft.color);

    const m = el("div", "modal item-modal");
    const photo = el("div", "item-photo");
    const photoBtns = el("div", "item-photo-btns");
    const bCam = el("button", "mini-btn", "📷 Kamera");
    const bFile = el("button", "mini-btn", "🖼️ Galeri");
    photoBtns.append(bCam, bFile);
    photo.append(photoBtns);

    const applyPhoto = (blob, alpha) => {
      if (!blob) return;
      CAM.loadImage(blob).then((img) => {
        const cv = CAM.toBaseCanvas(img);
        const hex = CAM.dominantColor(cv);
        const info = C.classify(hex);
        draft.img = blob;
        draft.alpha = alpha ? 1 : 0;
        draft.color = hex;
        draft.colorName = info.name;
        draft.colorInfo = info;
        draft._renamed = draft._renamed || !!draft.name;
        if (!draft.name) draft.name = info.name + " " + CATS[draft.category].n.toLowerCase();
        drawPhoto();
        formSync();
      });
    };
    bCam.onclick = () => {
      CAM.capture().then((blob) => {
        if (blob === undefined) return;
        if (!blob) {
          CAM.pickFile().then((f) => { if (f) applyPhoto(f); });
          return;
        }
        CAM.edit(blob).then((r) => { if (r) applyPhoto(r.blob, r.alpha); });
      });
    };
    bFile.onclick = () => {
      CAM.pickFile().then((f) => {
        if (!f) return;
        CAM.edit(f).then((r) => { if (r) applyPhoto(r.blob, r.alpha); });
      });
    };

    function drawPhoto() {
      photo.innerHTML = "";
      photo.className = "item-photo filled";
      if (draft.img) {
        const img = el("img");
        if (draft._url) URL.revokeObjectURL(draft._url);
        draft._url = URL.createObjectURL(draft.img);
        img.src = draft._url;
        photo.append(img, photoBtns);
        const re = el("button", "mini-btn re", "✨ Düzenle");
        re.onclick = () => CAM.edit(draft.img).then((r) => { if (r) applyPhotoWithColor(r.blob, r.alpha); });
        photo.append(re);
      } else {
        photo.className = "item-photo";
        photo.append(el("div", "ph", "👕"), el("p", "muted", "Fotoğraf ekle (isteğe bağlı)"), photoBtns);
      }
    }
    function applyPhotoWithColor(blob, alpha) {
      applyPhoto(blob, alpha);
    }

    const form = el("div", "item-form");
    const name = el("input");
    name.type = "text";
    name.placeholder = "Kıyafet adı";
    name.value = draft.name || "";
    name.oninput = () => { draft.name = name.value; };

    const catRow = el("div", "chips");
    Object.keys(CATS).forEach((k) => {
      const b = el("button", "chip" + (draft.category === k ? " active" : ""), CATS[k].icon + " " + CATS[k].n);
      b.onclick = () => { draft.category = k; $$(".chip", catRow).forEach((x) => x.classList.remove("active")); b.classList.add("active"); };
      catRow.append(b);
    });

    const colorRow = el("div", "color-row");
    const colorDot = el("button", "big-dot");
    const colorLbl = el("span", "color-lbl");
    colorDot.onclick = () => {
      swatchModal(draft.color, (p) => {
        draft.color = p.hex;
        const info = C.classify(p.hex);
        if (p.key) { info.fam = p.key; info.name = p.name || C.FAMILIES[p.key].name; }
        draft.colorName = info.name;
        draft.colorInfo = info;
        formSync();
      });
    };
    colorRow.append(colorDot, colorLbl);

    const seasonRow = el("div", "chips");
    SEASONS.forEach((s) => {
      const b = el("button", "chip sm" + (draft.seasons.includes(s) ? " active" : ""), s);
      b.onclick = () => {
        draft.seasons = draft.seasons.includes(s) ? draft.seasons.filter((x) => x !== s) : draft.seasons.concat(s);
        b.classList.toggle("active");
      };
      seasonRow.append(b);
    });

    const favRow = el("label", "fav-row");
    const favInp = el("input");
    favInp.type = "checkbox";
    favInp.checked = !!draft.fav;
    favInp.onchange = () => { draft.fav = favInp.checked ? 1 : 0; };
    favRow.append(favInp, el("span", "", "⭐ Favori (kombinlerde önceliklenir)"));

    const btnRow = el("div", "btn-row");
    const del = el("button", "btn danger ghost", "Sil");
    const cancel = el("button", "btn ghost", "Vazgeç");
    const save = el("button", "btn primary", "Kaydet");
    btnRow.append(del, cancel, save);

    form.append(el("label", "f-lbl", "Ad"), name, el("label", "f-lbl", "Kategori"), catRow, el("label", "f-lbl", "Renk"), colorRow, el("label", "f-lbl", "Sezon"), seasonRow, favRow, btnRow);
    m.append(photo, form);
    openModal(m);

    function formSync() {
      colorDot.style.background = draft.color;
      colorLbl.textContent = draft.colorName;
      name.value = draft.name || "";
      drawPhotoSoft();
    }
    function drawPhotoSoft() {
      const old = photo.querySelector("img");
      if (old && draft.img) {
        if (draft._url) URL.revokeObjectURL(draft._url);
        draft._url = URL.createObjectURL(draft.img);
        old.src = draft._url;
      }
    }

    drawPhoto();
    formSync();

    cancel.onclick = closeModal;
    del.style.display = isNew ? "none" : "";
    del.onclick = () => {
      confirmDlg("Sil?", "'" + (draft.name || "bu kıyafet") + "' dolaptan kaldırılacak.").then((ok) => {
        if (!ok) return;
        DB.ITEMS.del(existing.id).then(() => { revU(existing.id); refresh().then(() => { closeModal(); render(); toastSilindi(); }); });
      });
    };
    function toastSilindi() { toast("Silindi"); }
    save.onclick = () => {
      const rec = Object.assign({}, draft);
      rec.name = (draft.name || "").trim();
      if (!rec.name) {
        rec.name = (draft.colorName || "Kıyafet") + " " + CATS[draft.category].n.toLowerCase();
      }
      rec.colorInfo = draft.colorInfo || C.classify(draft.color);
      rec.colorName = rec.colorInfo.name;
      rec.createdAt = existing ? existing.createdAt : Date.now();
      delete rec._url; delete rec._renamed;
      DB.ITEMS.put(rec).then(() => refresh()).then(() => { closeModal(); render(); toast(existing ? "Güncellendi" : "Dolaba eklendi"); });
    };
  }

  function comboMiniVisual(comboIds) {
    const box = el("div", "mini");
    SLOTS.forEach((slot) => {
      const id = comboIds[slot];
      if (!id) return;
      const it = state.items.find((i) => i.id === id);
      if (!it || !u(it)) return;
      const img = el("img");
      img.src = u(it);
      img.style.left = SLOT_POS[slot].x + "%";
      img.style.top = SLOT_POS[slot].y + "%";
      img.style.width = SLOT_POS[slot].w + "%";
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
        open.onclick = () => { state.pano.items = JSON.parse(JSON.stringify(o.layout || [])); state.pano.sel = null; navigate("pano"); toast("Panoda açıldı"); };
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
    state.pano.items = [];
    state.pano.sel = null;
    Object.keys(combo.ids).forEach((slot) => {
      const id = combo.ids[slot];
      if (!id) return;
      const pos = SLOT_POS[slot] || SLOT_POS.aksesuar;
      state.pano.items.push({ itemId: id, cat: slot, x: pos.x, y: pos.y, w: pos.w, rot: 0, z: state.pano.items.length });
    });
    navigate("pano");
    toast("Panoda yerleşti — istersen elle oynat");
  }

  function saveOutfitFromIds(ids, layout) {
    const o = {
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now() + "-" + Math.random().toString(36).slice(2),
      name: "Kombin " + new Date().toLocaleDateString("tr-TR"),
      createdAt: Date.now(),
      layout: layout || (function () {
        const arr = [];
        let k = 0;
        Object.keys(ids).forEach((slot) => {
          if (!ids[slot]) return;
          const pos = SLOT_POS[slot] || SLOT_POS.aksesuar;
          arr.push({ itemId: ids[slot], cat: slot, x: pos.x, y: pos.y, w: pos.w, rot: 0, z: k++ });
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
    mannequin.innerHTML = '<svg viewBox="0 0 300 430" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><g fill="currentColor"><circle cx="150" cy="38" r="26"/><rect x="140" y="58" width="20" height="18" rx="7"/><rect x="83" y="92" width="22" height="118" rx="11"/><rect x="195" y="92" width="22" height="118" rx="11"/><path d="M118 76 L182 76 C194 76 199 88 197 102 L191 226 C189 242 182 248 170 248 L130 248 C118 248 111 242 109 226 L103 102 C101 88 106 76 118 76 Z"/><rect x="116" y="248" width="30" height="142" rx="14"/><rect x="154" y="248" width="30" height="142" rx="14"/></g></svg>';
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
          const pos = SLOT_POS[cat] || SLOT_POS.aksesuar;
          state.pano.items.push({ itemId: have.itemId, cat: cat, x: pos.x, y: pos.y, w: pos.w, rot: have.rot, z: state.pano.items.length });
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
    bPng.onclick = () => exportPng();
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
          const pos = SLOT_POS[cat] || SLOT_POS.aksesuar;
          if (existing) Object.assign(existing, { itemId: it.id, x: pos.x, y: pos.y, w: pos.w, rot: 0 });
          else state.pano.items.push({ itemId: it.id, cat: cat, x: pos.x, y: pos.y, w: pos.w, rot: 0, z: state.pano.items.length });
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

  function exportPng() {
    if (!state.pano.items.length) { toast("Panoya önce parça ekle"); return; }
    const cv = document.createElement("canvas");
    cv.width = 900;
    cv.height = 1200;
    const ctx = cv.getContext("2d");
    ctx.fillStyle = "#f5f2ea";
    ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.font = "28px system-ui";
    ctx.fillStyle = "#b7b2a6";
    ctx.textAlign = "center";
    ctx.fillText("🧥 Kombin", cv.width / 2, 54);
    const entries = state.pano.items.slice().sort((a, b) => (a.z || 0) - (b.z || 0));
    Promise.all(entries.map((p) => {
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
        a.download = (state.pano.items.length ? "kombin-" : "kombin-") + Date.now() + ".png";
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
        toast("PNG indirildi");
      }, "image/png");
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
