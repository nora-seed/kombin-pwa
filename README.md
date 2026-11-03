# Kombin — Kişisel Gardırop Stüdyosu 🧥

Tamamen **kişisel** ve **cihazda çalışan** erkek kombin asistanı. Sunucu yok, hesap yok; kıyafetlerin ve kombinin yalnızca senin tarayıcında (IndexedDB) durur.

## Ne yapar

- **🧺 Dolap** — Kamera veya galeriden kıyafet ekle: kırpma, silgi, düz zemin otomatik temizleme, otomatik baskın renk ve isimlendirme. Kategori (üst/alt/dış/ayakkabı/aksesuar), sezon, favori.
- **✨ Kombin** — Bir parçayı seç; renk motoru (CIELAB ΔE + klasik erkek stil kuralları) uyumlu üst/alt/ayakkabı/dış kombinlerini skor ve gerekçeyle önerir. 🎲 Sürpriz modu favorilerden rastgele kombin kurar.
- **🎨 Pano** — Hibrit yerleştirme ekranı: üst/alt/ayakkabı/dış için rehber bölgeler + serbest sürükleme, iki parmakla büyütme/döndürme, katman sırası. Kombini PNG olarak indir veya kaydet.
- **📚 Rehber** — Araştırılmış erkek renk kuralları: nötr taban, 3 renk kuralı, 60-30-10, ton-sür-ton, alt ton, mevsim paletleri, "her zaman çalışan" tablo.

## Çalıştırma

Dosyaları açmak yerine (kamera HTTPS/localhost'ta çalışır) yerelde servis et:

```bash
python3 -m http.server 8080
# sonra tarayıcıda http://localhost:8080
```

GitHub Pages'e kurulduğunda kamera da çalışır (HTTPS şartı sağlanır).

## Teknoloji

- Saf HTML/CSS/JS — build adımı ve bağımlılık yok
- PWA: `manifest.json` + `sw.js` offline cache, kurulabilir
- Renk motoru: HEX → CIELAB, ΔE76, uyum matrisi, kural puanlaması (`colors.js`)
- Görsel işleme: canvas tabanlı kırp/silgi/flood-fill arka plan temizleme (`camera.js`)
- Depolama: IndexedDB (görsel blob'lar dahil) + JSON yedek/alma

## Test

`test/colors-test.html` — renk motorunu doğrular.
