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
      if (Math.abs(px[i] - br) + Math.abs(px[i + 1] - bg) + Math.abs(px[i + 2] - bb) > 90) consistent = false;
    });
    if (!consistent) return false;
    const tol = 46;
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
    const side = 64;
    const c = el("canvas");
    c.width = side; c.height = side;
    const ctx = c.getContext("2d");
    ctx.drawImage(canvas, 0, 0, side, side);
    const px = ctx.getImageData(0, 0, side, side).data;
    const buckets = new Map();
    for (let i = 0; i < px.length; i += 4) {
      if (px[i + 3] < 40) continue;
      const r = px[i], g = px[i + 1], b = px[i + 2];
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      if (max - min < 14 && max > 232 && max - min >= 0) {
        const key = "w" + ((max > 250) ? "b" : "g");
        const e = buckets.get(key) || { n: 0, r: 0, g: 0, b: 0 };
        e.n++; e.r += r; e.g += g; e.b += b; buckets.set(key, e);
        continue;
      }
      if (max < 34) { const e = buckets.get("blk") || { n: 0, r: 0, g: 0, b: 0 }; e.n++; e.r += r; e.g += g; e.b += b; buckets.set("blk", e); continue; }
      const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
      const e = buckets.get(key) || { n: 0, r: 0, g: 0, b: 0 };
      e.n++; e.r += r; e.g += g; e.b += b; buckets.set(key, e);
    }
    let best = null;
    buckets.forEach((v) => { if (!best || v.n > best.n) best = v; });
    if (!best) return "#8a8d8f";
    const total = best.n;
    const r = best.r / total, g = best.g / total, b = best.b / total;
    const C_ = root.C;
    if (C_ && C_.rgbToHex && C_.FAMILIES) {
      const info = C_.classify(C_.rgbToHex(r, g, b));
      return C_.FAMILIES[info.fam].hex;
    }
    const h = (v) => Math.round(v).toString(16).padStart(2, "0");
    return "#" + h(r) + h(g) + h(b);
  }

  function edit(srcBlob) {
    return loadImage(srcBlob).then((img) => new Promise((resolve) => {
      const ov = buildOverlay();
      ov.classList.remove("hidden");
      ov.innerHTML = "";
      const head = el("div", "ed-head");
      const title = el("div", "ed-title", "Fotoğrafı düzenle");
      const headR = el("div", "ed-head-r");
      const undoBtn = el("button", "ed-tool", "↶");
      const closeBtn = el("button", "ed-tool", "✕");
      headR.append(undoBtn, closeBtn);
      head.append(title, headR);
      const stageWrap = el("div", "ed-stage");
      const base = toBaseCanvas(img);
      const ctx = base.getContext("2d");
      base.style.touchAction = "none";
      stageWrap.appendChild(base);
      const tools = el("div", "ed-tools");
      const bCrop = el("button", "ed-tool", "✂️");
      bCrop.title = "Kırp";
      const bErase = el("button", "ed-tool", "🖌️");
      bErase.title = "Silgi";
      const bFlood = el("button", "ed-tool", "✨");
      bFlood.title = "Arka planı otomatik temizle";
      const bSave = el("button", "ed-tool primary", "Kaydet");
      const sizeRow = el("div", "ed-size hidden");
      const sizeInp = el("input");
      sizeInp.type = "range"; sizeInp.min = 8; sizeInp.max = 80; sizeInp.value = 30;
      sizeRow.append(el("span", "", "Silgi boyutu"), sizeInp);
      tools.append(bCrop, bErase, bFlood, sizeRow, bSave);
      ov.append(head, stageWrap, tools);

      let history = [];
      let mode = "none";
      let cropRect = null;
      let cropHandles = null;
      let eraseOn = false;
      let stroking = false;
      let lastPt = null;
      let pointerPts = new Map();
      let pinchStart = null;

      const snap = () => {
        history.push(pushHistory(base));
        if (history.length > 8) history.shift();
      };
      const undo = () => {
        const c = history.pop();
        if (c) { base.width = c.width; base.height = c.height; ctx.drawImage(c, 0, 0); }
        else toastBase("Geri alınacak işlem yok");
      };
      undoBtn.onclick = undo;
      closeBtn.onclick = () => { closeOverlay(); resolve(undefined); };

      const toastBase = (msg) => {
        const t = el("div", "ed-toast", msg);
        ov.appendChild(t);
        setTimeout(() => t.remove(), 1800);
      };
      root._edToast = toastBase;

      const canvasPt = (e) => {
        const r = base.getBoundingClientRect();
        return { x: (e.clientX - r.left) * base.width / r.width, y: (e.clientY - r.top) * base.height / r.height };
      };

      const setMode = (m) => {
        mode = m;
        cropRect = null;
        eraseOn = m === "erase";
        sizeRow.classList.toggle("hidden", m !== "erase");
        [bCrop, bErase].forEach((b) => b.classList.remove("active"));
        cropable(m === "crop");
        if (m === "crop") { bCrop.classList.add("active"); snap(); cropRect = { x: base.width * 0.08, y: base.height * 0.08, w: base.width * 0.84, h: base.height * 0.84 }; drawOverlay(); toastBase("Köşelerden tutup kırp, sonra ✂️'e tekrar bas"); }
        else if (m === "erase") { bErase.classList.add("active"); snap(); drawOverlay(); }
        else { drawOverlay(); }
      };

      const overlayCanvas = el("canvas");
      overlayCanvas.className = "ed-overlay";
      stageWrap.appendChild(overlayCanvas);
      const cropable = (on) => overlayCanvas.classList.toggle("cropable", on);
      const drawOverlay = () => {
        const r = base.getBoundingClientRect();
        overlayCanvas.width = r.width; overlayCanvas.height = r.height;
        const octx = overlayCanvas.getContext("2d");
        octx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
        if (mode === "crop" && cropRect) {
          const s = overlayCanvas.width / base.width;
          octx.fillStyle = "rgba(0,0,0,0.55)";
          octx.beginPath();
          octx.rect(0, 0, overlayCanvas.width, overlayCanvas.height);
          octx.rect(cropRect.x * s, cropRect.y * s, cropRect.w * s, cropRect.h * s);
          octx.fill("evenodd");
          octx.strokeStyle = "#fff";
          octx.lineWidth = 2;
          octx.strokeRect(cropRect.x * s, cropRect.y * s, cropRect.w * s, cropRect.h * s);
          const c1 = [cropRect.x * s, cropRect.y * s], c2 = [(cropRect.x + cropRect.w) * s, (cropRect.y + cropRect.h) * s];
          [c1, c2].forEach(([cx, cy]) => {
            octx.beginPath();
            octx.arc(cx, cy, 12, 0, 7);
            octx.fillStyle = "#fff";
            octx.fill();
          });
        }
      };
      root._edDrawOverlay = drawOverlay;

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
      root._edApplyCrop = applyCrop;

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
        } else if (pointerPts.size === 2) {
          const [a, b] = [...pointerPts.values()];
          if (pinchStart) {
            const d = Math.hypot(b.x - a.x, b.y - a.y);
            const ang = Math.atan2(b.y - a.y, b.x - a.x);
            const k = d / pinchStart.d;
            const da = ang - pinchStart.ang;
            if (Math.abs(k - 1) > 0.05 || Math.abs(da) > 0.2) {
              root._edToast("Kırp modunda yakınlaştırma — kırpı kapatıp kullan");
            }
          } else {
            pinchStart = { d: Math.hypot(b.x - a.x, b.y - a.y), ang: Math.atan2(b.y - a.y, b.x - a.x) };
          }
        }
      });
      const endPointer = (e) => {
        pointerPts.delete(e.pointerId);
        if (pointerPts.size < 2) pinchStart = null;
        stroking = false;
      };
      base.addEventListener("pointerup", endPointer);
      base.addEventListener("pointercancel", endPointer);

      const handleRectPointer = (e) => {
        if (mode !== "crop" || !cropRect) return;
        const r = overlayCanvas.getBoundingClientRect();
        const s = base.width / overlayCanvas.width;
        const x = (e.clientX - r.left) * s, y = (e.clientY - r.top) * s;
        return { x: x, y: y };
      };

      let dragHandle = null, dragMove = null, dragStart = null;
      overlayCanvas.style.touchAction = "none";
      overlayCanvas.addEventListener("pointerdown", (e) => {
        if (mode !== "crop") return;
        e.preventDefault();
        overlayCanvas.setPointerCapture(e.pointerId);
        const p = handleRectPointer(e);
        if (!p) return;
        const s = base.width / overlayCanvas.width;
        const c1 = { x: cropRect.x, y: cropRect.y }, c2 = { x: cropRect.x + cropRect.w, y: cropRect.y + cropRect.h };
        if (Math.hypot((p.x - c1.x) / s, (p.y - c1.y) / s) < 28) dragHandle = 1;
        else if (Math.hypot((p.x - c2.x) / s, (p.y - c2.y) / s) < 28) dragHandle = 2;
        else if (p.x / s > cropRect.x && p.x / s < cropRect.x + cropRect.w && p.y / s > cropRect.y && p.y / s < cropRect.y + cropRect.h) { dragMove = p; dragStart = { x: cropRect.x, y: cropRect.y }; }
      });
      overlayCanvas.addEventListener("pointermove", (e) => {
        if (mode !== "crop") return;
        const p = handleRectPointer(e);
        if (!p || (!dragHandle && !dragMove)) return;
        const s = base.width / overlayCanvas.width;
        const px = p.x / s, py = p.y / s;
        if (dragHandle === 1) { const r = { x: px, y: py, w: Math.max(24, cropRect.x + cropRect.w - px), h: Math.max(24, cropRect.y + cropRect.h - py) }; cropRect = r; }
        else if (dragHandle === 2) { const r = { x: cropRect.x, y: cropRect.y, w: Math.max(24, px - cropRect.x), h: Math.max(24, py - cropRect.y) }; cropRect = r; }
        else if (dragMove) {
          const dx = px - dragMove.x, dy = py - dragMove.y;
          dragMove = p;
          cropRect.x = Math.max(0, Math.min(base.width - cropRect.w, dragStart.x + dx));
          cropRect.y = Math.max(0, Math.min(base.height - cropRect.h, dragStart.y + dy));
        }
        drawOverlay();
      });
      overlayCanvas.addEventListener("pointerup", () => { dragHandle = null; dragMove = null; });

      let cropToggled = false;
      bCrop.onclick = () => {
        if (cropToggled) { applyCrop(); cropToggled = false; }
        else { cropToggled = true; }
        setMode(cropToggled ? "crop" : "none");
      };
      bErase.onclick = () => setMode(eraseOn ? "none" : "erase");
      bFlood.onclick = () => {
        snap();
        const ok = floodClear(base);
        if (!ok) toastBase("Arka plan yeterince düz değil — silgiyle silebilirsin");
        else toastBase("Düz zemin temizlendi ✔");
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
    }));
  }

  root.CAM = { capture: capture, pickFile: pickFile, edit: edit, loadImage: loadImage, toBaseCanvas: toBaseCanvas, pushHistory: pushHistory, floodClear: floodClear, trimTransparent: trimTransparent, dominantColor: dominantColor, MAXDIM: MAXDIM };
})(typeof self !== "undefined" ? self : this);
