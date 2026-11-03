from PIL import Image, ImageDraw

def tee(cx, cy, w, h):
    s = w / 100.0
    return [
        (cx - 18*s, cy - 30*s), (cx - 30*s, cy - 24*s), (cx - 48*s, cy - 10*s),
        (cx - 40*s, cy + 6*s), (cx - 30*s, cy - 2*s), (cx - 30*s, cy + 42*s),
        (cx + 30*s, cy + 42*s), (cx + 30*s, cy - 2*s), (cx + 40*s, cy + 6*s),
        (cx + 48*s, cy - 10*s), (cx + 30*s, cy - 24*s), (cx + 18*s, cy - 30*s),
        (cx + 12*s, cy - 36*s), (cx - 12*s, cy - 36*s),
    ]

def make(size, maskable, path):
    W = H = size
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    pad = int(W * 0.02) if maskable else 0
    d.rounded_rectangle([pad, pad, W - pad, H - pad], radius=int(W * (0.50 if maskable else 0.22)),
                        fill=(23, 28, 42, 255) if maskable else (23, 28, 42, 255))
    cy = H * (0.42 if maskable else 0.44)
    d.polygon(tee(W/2, cy, W*0.42, H*0.42), fill=(226, 216, 197, 255))
    cols = [(31, 58, 95, 255), (216, 195, 165, 255), (109, 46, 70, 255), (247, 198, 83, 255)]
    r = W * 0.045
    gap = r * 2.4
    total = gap * 3
    x0 = W/2 - total/2
    yline = H * (0.82 if not maskable else 0.80)
    for i, c in enumerate(cols):
        d.ellipse([x0 + i*gap - r, yline - r, x0 + i*gap + r, yline + r], fill=c)
    img.save(path)

for s in (512, 192):
    make(s, False, f"icons/icon-{s}.png")
    make(s, True, f"icons/icon-{s}-maskable.png")
print("icons ok")
