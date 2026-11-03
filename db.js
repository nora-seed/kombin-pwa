(function (root) {
  const DB_NAME = "kombin-db";
  const DB_VER = 1;
  let dbp = null;

  function open() {
    if (dbp) return dbp;
    dbp = new Promise((resolve, reject) => {
      const rq = indexedDB.open(DB_NAME, DB_VER);
      rq.onupgradeneeded = (e) => {
        const db = rq.result;
        if (!db.objectStoreNames.contains("items")) {
          const s = db.createObjectStore("items", { keyPath: "id" });
          s.createIndex("category", "category");
          s.createIndex("createdAt", "createdAt");
        }
        if (!db.objectStoreNames.contains("outfits")) db.createObjectStore("outfits", { keyPath: "id" });
        if (!db.objectStoreNames.contains("meta")) db.createObjectStore("meta", { keyPath: "k" });
      };
      rq.onsuccess = () => resolve(rq.result);
      rq.onerror = () => reject(rq.error);
    });
    return dbp;
  }

  function tx(store, mode) {
    return open().then((db) => db.transaction(store, mode).objectStore(store));
  }

  function req(r) {
    return new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  }

  const ITEMS = {
    all: () => tx("items").then((s) => req(s.getAll())),
    get: (id) => tx("items").then((s) => req(s.get(id))),
    put: (item) => tx("items", "readwrite").then((s) => req(s.put(item))),
    del: (id) => tx("items", "readwrite").then((s) => req(s.delete(id))),
  };
  const OUTFITS = {
    all: () => tx("outfits").then((s) => req(s.getAll())),
    get: (id) => tx("outfits").then((s) => req(s.get(id))),
    put: (o) => tx("outfits", "readwrite").then((s) => req(s.put(o))),
    del: (id) => tx("outfits", "readwrite").then((s) => req(s.delete(id))),
  };
  const META = {
    get: (k) => tx("meta").then((s) => req(s.get(k))),
    put: (k, v) => tx("meta", "readwrite").then((s) => req(s.put({ k: k, v: v }))),
  };

  function wipe() {
    return open().then((db) => new Promise((res, rej) => {
      const t = db.transaction(["items", "outfits", "meta"], "readwrite");
      t.objectStore("items").clear();
      t.objectStore("outfits").clear();
      t.objectStore("meta").clear();
      t.oncomplete = res;
      t.onerror = () => rej(t.error);
    }));
  }

  function blobToDataURL(blob) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.onerror = rej;
      r.readAsDataURL(blob);
    });
  }

  function dataURLToBlob(durl) {
    const [head, b64] = durl.split(",");
    const mime = (head.match(/:(.*?);/) || [, "image/png"])[1];
    const bin = atob(b64);
    const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    return new Blob([u8], { type: mime });
  }

  function exportAll() {
    return Promise.all([ITEMS.all(), OUTFITS.all()]).then(([items, outfits]) =>
      Promise.all(items.map((it) => Promise.all([
        it.img ? blobToDataURL(it.img) : Promise.resolve(null),
      ]).then(([d1]) => {
        const o = Object.assign({}, it);
        o.img = d1;
        return o;
      }))).then((items2) => JSON.stringify({ v: 1, app: "kombin", at: Date.now(), items: items2, outfits: outfits }))
    );
  }

  function importJSON(text, replace) {
    const data = JSON.parse(text);
    if (!data || data.app !== "kombin" || !Array.isArray(data.items)) return Promise.reject(new Error("Geçersiz yedek dosyası"));
    const load = replace ? wipe() : Promise.resolve();
    return load.then(() => Promise.all(data.items.map((it) => {
      const o = Object.assign({}, it);
      o.img = it.img ? dataURLToBlob(it.img) : null;
      return ITEMS.put(o);
    }))).then(() => Promise.all((data.outfits || []).map((o) => OUTFITS.put(o))));
  }

  root.DB = { ITEMS: ITEMS, OUTFITS: OUTFITS, META: META, wipe: wipe, exportAll: exportAll, importJSON: importJSON, blobToDataURL: blobToDataURL };
})(typeof self !== "undefined" ? self : this);
