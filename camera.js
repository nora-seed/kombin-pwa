(function (root) {
  const MAXDIM = 1200;

  function el(tag, cls, txt) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt) e.textContent = txt;
    return e;
  }

  let dom = null;

  function buildOverlay() {
    if (dom) return dom;
    dom = el("div", "cam-overlay hidden");
    dom.addEventListener("click", (e) => { if (e.target === dom) e.stopPropagation(); });
    document.body.appendChild(dom);
    return dom;
  }

  function closeOverlay() {
    if (dom) { dom.remove(); dom = null; }
  }

  function capture() {
    return new Promise((resolve) => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.isSecureContext) {
        resolve(null);
        return;
      }
      const ov = buildOverlay();
      ov.classList.remove("hidden");
      ov.innerHTML = "";
      const vid = el("video", "cam-video");
      vid.playsInline = true;
      vid.autoplay = true;
      vid.muted = true;
      const bar = el("div", "cam-bar");
      const cancel = el("button", "cam-shutter ghost", "✕");
      const shot = el("button", "cam-shutter", "");
      const swap = el("button", "cam-shutter ghost", "⟳");
      bar.append(cancel, shot, swap);
      ov.append(vid, bar);
      let track = null, facing = "environment";
      let settled = false;
      const stop = () => { if (track) track.stop(); closeOverlay(); };
      const start = () => {
        navigator.mediaDevices.getUserMedia({ video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1920 } }, audio: false })
          .then((s) => { track = s.getTracks()[0]; vid.srcObject = s; return vid.play(); })
          .catch(() => {
            if (!settled) { settled = true; stop(); resolve(null); }
          });
      };
      start();
      swap.onclick = () => { facing = facing === "environment" ? "user" : "environment"; if (track) track.stop(); start(); };
      cancel.onclick = () => {
        if (!settled) { settled = true; stop(); resolve(undefined); }
      };
      shot.onclick = () => {
        if (!vid.videoWidth) return;
        const c = el("canvas").getContext("2d");
        const w = vid.videoWidth, h = vid.videoHeight;
        const side = Math.min(w, h);
        c.canvas.width = side; c.canvas.height = side;
        c.drawImage(vid, (w - side) / 2, (h - side) / 2, side, side, 0, 0, side, side);
        if (!settled) { settled = true; stop(); c.canvas.toBlob((b) => resolve(b), "image/jpeg", 0.92); }
      };
      vid.onerror = () => { if (!settled) { settled = true; stop(); resolve(null); } };
    });
  }

  function pickFile() {
    return new Promise((resolve) => {
      const inp = el("input");
      inp.type = "file";
      inp.accept = "image/*";
      inp.onchange = () => {
        if (inp.files && inp.files[0]) resolve(inp.files[0]);
        else resolve(undefined);
        inp.remove();
      };
      document.body.appendChild(inp);
      inp.click();
    });
  }

  function loadImage(blob) {
    return new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = rej;
      img.src = URL.createObjectURL(blob);
    });
  }

  function toBaseCanvas(img) {
    const ctx = el("canvas").getContext("2d");
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const scale = Math.min(1, MAXDIM / side);
    ctx.canvas.width = Math.round(img.naturalWidth * scale);
    ctx.canvas.height = Math.round(img.naturalHeight * scale);
    ctx.drawImage(img, 0, 0, ctx.canvas.width, ctx.canvas.height);
    return ctx.canvas;
  }

  function pushHistory(src) {
    const c = el("canvas");
    c.width = src.width; c.height = src.height;
    c.getContext("2d").drawImage(src, 0, 0);
    return c;
  }

  function floodClear(canvas) {
    const ctx = canvas.getContext("2d");
    const w = canvas.width, h = canvas.height;
    const data = ctx.getImageData(0, 0, w, h);
    const px = data.data;
    const corners = [[2, 2], [w - 3, 2], [2, h - 3], [w - 3, h - 3]];
    let br = 0, bg = 0, bb = 0;
    corners.forEach(([x, y]) => {
      const i = (y * w + x) * 4;
      br += px[i]; bg += px[i + 1]; bb += px[i + 2];
    });
    br /= 4; bg /= 4; bb /= 4;
    let consistent = true;
    corners.forEach(([x, y]) => {
      const i = (y * w + x) * 4;
      if (Math.abs(px[i] - br) + Math.abs(px[i + 1] - bg) + Math.abs(px[i + 2] - bb) > 110) consistent = false;
    });
    if (!consistent) return false;
    const tol = 52;
    const visited = new Uint8Array(w * h);
    const qx = new Uint32Array(w * h);
    let qt = 0, qe = 0;
    const push = (x, y) => {
      const p = y * w + x;
      if (!visited[p]) { visited[p] = 1; qx[qe++] = p; }
    };
    for (let x = 0; x < w; x++) { push(x, 0); push(x, h - 1); }
    for (let y = 0; y < h; y++) { push(0, y); push(w - 1, y); }
    while (qt < qe) {
      const p = qx[qt++];
      const i = p * 4;
      if (Math.abs(px[i] - br) + Math.abs(px[i + 1] - bg) + Math.abs(px[i + 2] - bb) > tol * 3) continue;
      px[i + 3] = 0;
      const x = p % w, y = (p / w) | 0;
      if (x > 0) push(x - 1, y);
      if (x < w - 1) push(x + 1, y);
      if (y > 0) push(x, y - 1);
      if (y < h - 1) push(x, y + 1);
    }
    ctx.putImageData(data, 0, 0);
    return true;
  }

  function trimTransparent(canvas) {
    const ctx = canvas.getContext("2d");
    const w = canvas.width, h = canvas.height;
    const px = ctx.getImageData(0, 0, w, h).data;
    let minX = w, minY = h, maxX = -1, maxY = -1;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (px[(y * w + x) * 4 + 3] > 12) {
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX >= 0 && (minX > 2 || minY > 2 || maxX < w - 3 || maxY < h - 3)) {
      const nw = maxX - minX + 1, nh = maxY - minY + 1;
      const out = el("canvas");
      out.width = nw; out.height = nh;
      out.getContext("2d").drawImage(canvas, minX, minY, nw, nh, 0, 0, nw, nh);
      return out;
    }
    return canvas;
  }

  function dominantColor(canvas) {
    const side = 80;
    const c = el("canvas");
    c.width = side; c.height = side;
    const ctx = c.getContext("2d");
    const cw = canvas.width, ch = canvas.height;
    const cw2 = Math.max(1, Math.round(cw * 0.62)), ch2 = Math.max(1, Math.round(ch * 0.62));
    ctx.drawImage(canvas, (cw - cw2) / 2, (ch - ch2) / 2, cw2, ch2, 0, 0, side, side);
    const px = ctx.getImageData(0, 0, side, side).data;
    const hueBins = new Array(12).fill(null).map(() => ({ n: 0, r: 0, g: 0, b: 0 }));
    const achro = { siyah: { n: 0, r: 0, g: 0, b: 0 }, koyugri: { n: 0, r: 0, g: 0, b: 0 }, acik: { n: 0, r: 0, g: 0, b: 0 } };
    let totalPx = 0;
    for (let i = 0; i < px.length; i += 4) {
      if (px[i + 3] < 50) continue;
      const r = px[i], g = px[i + 1], b = px[i + 2];
      totalPx++;
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      const v = mx / 255, s = mx === 0 ? 0 : (mx - mn) / mx;
      const add = (o) => { o.n++; o.r += r; o.g += g; o.b += b; };
      if (s < 0.16) {
        const key = v < 0.16 ? "siyah" : v < 0.5 ? "koyugri" : "acik";
        add(achro[key]);
        continue;
      }
      let h0 = 0;
      const d = mx - mn;
      if (mx === r) h0 = ((g - b) / d) % 6;
      else if (mx === g) h0 = (b - r) / d + 2;
      else h0 = (r - g) / d + 4;
      const bin = ((Math.round(h0 * 60 / 30) % 12) + 12) % 12;
      add(hueBins[bin]);
    }
    let bestHue = null;
    hueBins.forEach((bn) => { if (!bestHue || bn.n > bestHue.n) bestHue = bn; });
    let bestAc = null;
    Object.keys(achro).forEach((k2) => { if (!bestAc || achro[k2].n > bestAc.n) bestAc = achro[k2]; });
    const avg = (o) => o.n ? [o.r / o.n, o.g / o.n, o.b / o.n] : null;
    let rgb = null;
    if (bestHue && bestHue.n >= totalPx * 0.14) rgb = avg(bestHue);
    else if (bestAc && bestAc.n > 0) rgb = avg(bestAc);
    else rgb = bestHue && bestHue.n ? avg(bestHue) : null;
    if (!rgb) return "#8a8d8f";
    const C_ = root.C;
    if (C_ && C_.rgbToHex && C_.FAMILIES) {
      const info = C_.classify(C_.rgbToHex(rgb[0], rgb[1], rgb[2]));
      return C_.FAMILIES[info.fam].hex;
    }
    const h = (v) => Math.round(v).toString(16).padStart(2, "0");
    return "#" + h(rgb[0]) + h(rgb[1]) + h(rgb[2]);
  }

  function edit(srcBlob) {
    return loadImage(srcBlob).then((img) => new Promise((resolve) => {
      const ov = buildOverlay();
      ov.classList.remove("hidden");
      ov.innerHTML = "";
      const head = el("div", "ed-head");
      const title = el("div", "ed-title", "Fotoğrafı düzenle");
      const closeBtn = el("button", "ed-tool round", "✕");
      head.append(title, closeBtn);
      const stageWrap = el("div", "ed-stage");
      const canvasWrap = el("div", "ed-canvas-wrap");
      const base = toBaseCanvas(img);
      base.className = "ed-base";
      const ctx = base.getContext("2d");
      base.style.touchAction = "none";
      const overlayCanvas = el("canvas");
      overlayCanvas.className = "ed-overlay";
      canvasWrap.append(base, overlayCanvas);
      stageWrap.appendChild(canvasWrap);

      const sizeRow = el("div", "ed-size hidden");
      const sizeInp = el("input");
      sizeInp.type = "range";
      sizeInp.min = 8;
      sizeInp.max = 80;
      sizeInp.value = 30;
      sizeRow.append(el("span", "", "Silgi boyutu"), sizeInp);
      const mkTool = (ico, lbl, cls) => {
        const b = el("button", "ed-tool" + (cls ? " " + cls : ""));
        b.append(el("span", "ico", ico), el("span", "lbl", lbl));
        return b;
      };
      const bUndo = mkTool("↶", "Geri");
      const bCrop = mkTool("✂️", "Kırp");
      const bErase = mkTool("🖌️", "Silgi");
      const bFlood = mkTool("✨", "Oto Zemin");
      const bSave = mkTool("💾", "Kaydet", "primary");
      const toolRow = el("div", "ed-tool-row");
      toolRow.append(bUndo, bCrop, bErase, bFlood, bSave);
      const tools = el("div", "ed-tools");
      tools.append(sizeRow, toolRow);
      ov.append(head, stageWrap, tools);

      let history = [];
      let mode = "none";
      let cropRect = null;
      let cropOn = false;
      let eraseOn = false;
      let stroking = false;
      let lastPt = null;
      let pointerPts = new Map();

      const toastBase = (msg) => {
        const t = el("div", "ed-toast", msg);
        ov.appendChild(t);
        setTimeout(() => t.remove(), 1900);
      };

      const cropable = (on) => overlayCanvas.classList.toggle("cropable", on);

      const drawOverlay = () => {
        const r = base.getBoundingClientRect();
        overlayCanvas.width = Math.max(1, Math.round(r.width));
        overlayCanvas.height = Math.max(1, Math.round(r.height));
        const octx = overlayCanvas.getContext("2d");
        octx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
        if (mode === "crop" && cropRect) {
          const s = overlayCanvas.width / base.width;
          octx.fillStyle = "rgba(10,12,16,0.55)";
          octx.beginPath();
          octx.rect(0, 0, overlayCanvas.width, overlayCanvas.height);
          octx.rect(cropRect.x * s, cropRect.y * s, cropRect.w * s, cropRect.h * s);
          octx.fill("evenodd");
          octx.strokeStyle = "#fff";
          octx.lineWidth = 2;
          octx.strokeRect(cropRect.x * s, cropRect.y * s, cropRect.w * s, cropRect.h * s);
          [[cropRect.x, cropRect.y], [cropRect.x + cropRect.w, cropRect.y + cropRect.h]].forEach(([cx, cy]) => {
            octx.beginPath();
            octx.arc(cx * s, cy * s, 12, 0, 7);
            octx.fillStyle = "#fff";
            octx.fill();
          });
        }
      };

      const snap = () => {
        history.push(pushHistory(base));
        if (history.length > 8) history.shift();
      };
      const undo = () => {
        const c = history.pop();
        if (c) { base.width = c.width; base.height = c.height; ctx.drawImage(c, 0, 0); drawOverlay(); }
        else toastBase("Geri alınacak işlem yok");
      };
      bUndo.onclick = undo;
      closeBtn.onclick = () => { closeOverlay(); resolve(undefined); };

      const canvasPt = (e) => {
        const r = base.getBoundingClientRect();
        return { x: (e.clientX - r.left) * base.width / r.width, y: (e.clientY - r.top) * base.height / r.height };
      };

      const applyCrop = () => {
        if (!cropRect) return;
        const cr = {
          x: Math.max(0, Math.round(cropRect.x)), y: Math.max(0, Math.round(cropRect.y)),
          w: Math.min(base.width - Math.round(cropRect.x), Math.round(cropRect.w)),
          h: Math.min(base.height - Math.round(cropRect.y), Math.round(cropRect.h)),
        };
        const out = el("canvas");
        out.width = cr.w; out.height = cr.h;
        out.getContext("2d").drawImage(base, cr.x, cr.y, cr.w, cr.h, 0, 0, cr.w, cr.h);
        base.width = cr.w; base.height = cr.h;
        ctx.drawImage(out, 0, 0);
        setMode("none");
      };

      const setMode = (m) => {
        mode = m;
        cropOn = false;
        cropRect = null;
        eraseOn = m === "erase";
        sizeRow.classList.toggle("hidden", m !== "erase");
        bCrop.classList.remove("active");
        bErase.classList.remove("active");
        bCrop.querySelector(".lbl").textContent = "Kırp";
        cropable(m === "crop");
        if (m === "crop") {
          bCrop.classList.add("active");
          bCrop.querySelector(".lbl").textContent = "Uygula ✓";
          snap();
          cropRect = { x: base.width * 0.08, y: base.height * 0.08, w: base.width * 0.84, h: base.height * 0.84 };
          toastBase("Köşelerden tutup ayarla, sonra Kırp'a tekrar bas");
        } else if (m === "erase") {
          bErase.classList.add("active");
          snap();
        }
        drawOverlay();
      };

      const eraseStroke = (a, b) => {
        ctx.save();
        ctx.globalCompositeOperation = "destination-out";
        ctx.lineWidth = parseInt(sizeInp.value, 10) * 2;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.strokeStyle = "#000";
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        ctx.restore();
      };

      base.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        base.setPointerCapture(e.pointerId);
        pointerPts.set(e.pointerId, canvasPt(e));
        if (mode === "erase" && pointerPts.size === 1) { stroking = true; lastPt = canvasPt(e); }
      });
      base.addEventListener("pointermove", (e) => {
        if (!pointerPts.has(e.pointerId)) return;
        pointerPts.set(e.pointerId, canvasPt(e));
        if (mode === "erase" && stroking && pointerPts.size === 1) {
          const p = canvasPt(e);
          eraseStroke(lastPt, p);
          lastPt = p;
        }
      });
      const endPointer = (e) => {
        pointerPts.delete(e.pointerId);
        stroking = false;
      };
      base.addEventListener("pointerup", endPointer);
      base.addEventListener("pointercancel", endPointer);

      overlayCanvas.style.touchAction = "none";
      let dragHandle = null, dragMove = null, dragStart = null;
      const overlayPt = (e) => {
        const r = overlayCanvas.getBoundingClientRect();
        return { x: (e.clientX - r.left) * base.width / r.width, y: (e.clientY - r.top) * base.height / r.height };
      };
      overlayCanvas.addEventListener("pointerdown", (e) => {
        if (mode !== "crop" || !cropRect) return;
        e.preventDefault();
        overlayCanvas.setPointerCapture(e.pointerId);
        const p = overlayPt(e);
        const c1 = { x: cropRect.x, y: cropRect.y }, c2 = { x: cropRect.x + cropRect.w, y: cropRect.y + cropRect.h };
        if (Math.hypot(p.x - c1.x, p.y - c1.y) * 0.5 < 12) dragHandle = 1;
        else if (Math.hypot(p.x - c2.x, p.y - c2.y) * 0.5 < 12) dragHandle = 2;
        else if (p.x > cropRect.x && p.x < cropRect.x + cropRect.w && p.y > cropRect.y && p.y < cropRect.y + cropRect.h) { dragMove = p; dragStart = { x: cropRect.x, y: cropRect.y }; }
      });
      overlayCanvas.addEventListener("pointermove", (e) => {
        if (mode !== "crop" || !cropRect || (!dragHandle && !dragMove)) return;
        const p = overlayPt(e);
        if (dragHandle === 1) { const r = { x: p.x, y: p.y, w: Math.max(24, cropRect.x + cropRect.w - p.x), h: Math.max(24, cropRect.y + cropRect.h - p.y) }; cropRect = r; }
        else if (dragHandle === 2) { const r = { x: cropRect.x, y: cropRect.y, w: Math.max(24, p.x - cropRect.x), h: Math.max(24, p.y - cropRect.y) }; cropRect = r; }
        else if (dragMove) {
          const dx = p.x - dragMove.x, dy = p.y - dragMove.y;
          dragMove = p;
          cropRect.x = Math.max(0, Math.min(base.width - cropRect.w, dragStart.x + dx));
          cropRect.y = Math.max(0, Math.min(base.height - cropRect.h, dragStart.y + dy));
        }
        drawOverlay();
      });
      overlayCanvas.addEventListener("pointerup", () => { dragHandle = null; dragMove = null; });
      overlayCanvas.addEventListener("pointercancel", () => { dragHandle = null; dragMove = null; });

      bCrop.onclick = () => {
        if (cropOn) applyCrop();
        else setMode("crop");
      };
      bErase.onclick = () => setMode(eraseOn ? "none" : "erase");
      bFlood.onclick = () => {
        snap();
        const ok = floodClear(base);
        if (!ok) toastBase("Arka plan yeterince düz değil — silgiyle sil, karanlık köşeleri kırp");
        else toastBase("Zemin temizlendi ✔");
      };
      bSave.onclick = () => {
        const hasAlpha = (() => {
          const d = ctx.getImageData(0, 0, base.width, base.height).data;
          for (let i = 3; i < d.length; i += 4) if (d[i] < 250) return true;
          return false;
        })();
        let out = base;
        if (hasAlpha) out = trimTransparent(base);
        out.toBlob((b) => {
          closeOverlay();
          resolve({ blob: b, alpha: hasAlpha, width: out.width, height: out.height });
        }, hasAlpha ? "image/png" : "image/jpeg", 0.85);
      };

      window.addEventListener("resize", drawOverlay);

      const autoStep = () => {
        const early = base.getContext("2d").getImageData(0, 0, base.width, base.height).data;
        const w = base.width, h = base.height;
        const probe = [[2, 2], [w - 3, 2], [2, h - 3], [w - 3, h - 3]].every(([x, y]) => early[(y * w + x) * 4 + 3] < 50);
        if (probe) return { flood: false, trimmed: false, skip: true };
        history.push(pushHistory(base));
        const flood = floodClear(base);
        let trimmed = false;
        if (flood) {
          const t = trimTransparent(base);
          if (t.width !== base.width || t.height !== base.height) {
            base.width = t.width; base.height = t.height;
            ctx.drawImage(t, 0, 0);
            trimmed = true;
          }
        }
        return { flood: flood, trimmed: trimmed };
      };

      setTimeout(() => {
        const r = autoStep();
        if (r.flood && r.trimmed) toastBase("Zemin otomatik temizlendi ve kenarları kesildi ✔ (Geri ile iptal)");
        else if (r.flood) toastBase("Düz zemin otomatik temizlendi ✔ (Geri ile iptal)");
        else if (r.skip) toastBase("Bu görsel zaten temiz görünüyor — düzenlemeye devam edebilirsin");
        else toastBase("Arka plan düzgün değil — Silgi ya da ✂️ ile ince ayar yap");
      }, 250);

      setMode("none");
    }));
  }

  root.CAM = { capture: capture, pickFile: pickFile, edit: edit, loadImage: loadImage, toBaseCanvas: toBaseCanvas, pushHistory: pushHistory, floodClear: floodClear, trimTransparent: trimTransparent, dominantColor: dominantColor, MAXDIM: MAXDIM };
})(typeof self !== "undefined" ? self : this);
