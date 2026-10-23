# Makes the app icon pictures from the site's 3D emoji: a mosque with a crescent moon, on the sky background (ic_bg.xml).
# Adaptive icons are 108dp; the important part must stay inside the middle 66dp.
import os, sys
from PIL import Image

here = os.path.dirname(os.path.abspath(__file__))
img = os.path.join(here, "..", "public", "img")
mosque = Image.open(os.path.join(img, "mosque.png")).convert("RGBA")
moon = Image.open(os.path.join(img, "p-isha.png")).convert("RGBA")
star = Image.open(os.path.join(img, "star.png")).convert("RGBA")

for folder, px in {"mipmap-mdpi": 108, "mipmap-hdpi": 162, "mipmap-xhdpi": 216, "mipmap-xxhdpi": 324, "mipmap-xxxhdpi": 432}.items():
    canvas = Image.new("RGBA", (px, px), (0, 0, 0, 0))
    m = int(px * 0.50); canvas.alpha_composite(mosque.resize((m, m), Image.LANCZOS), ((px - m) // 2, int(px * 0.30)))
    c = int(px * 0.22); canvas.alpha_composite(moon.resize((c, c), Image.LANCZOS), (int(px * 0.58), int(px * 0.19)))
    s = int(px * 0.10); canvas.alpha_composite(star.resize((s, s), Image.LANCZOS), (int(px * 0.30), int(px * 0.23)))
    out = os.path.join(here, "res", folder); os.makedirs(out, exist_ok=True)
    canvas.save(os.path.join(out, "ic_launcher_foreground.png"))
print("icons ok")
