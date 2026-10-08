"""Compose the store promo tile (440x280) from the generated mark.

Text is rendered with Pillow using a Windows system font, so the tile is
produced without any design tooling. Run after tools/make_icons.py.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).parent.parent
ICON_128 = ROOT / "extension" / "icons" / "icon-128.png"
OUT = ROOT / "store" / "promo-440x280.png"

W, H = 440, 280
BG_TOP = (26, 55, 122)
BG_BOTTOM = (12, 26, 64)
FG = (255, 255, 255)
ACCENT = (122, 186, 255)

FONT_CANDIDATES = [
    r"C:\Windows\Fonts\segoeuib.ttf",
    r"C:\Windows\Fonts\segoeui.ttf",
    r"C:\Windows\Fonts\arialbd.ttf",
    r"C:\Windows\Fonts\arial.ttf",
]


def load_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for path in FONT_CANDIDATES:
        if Path(path).exists():
            try:
                return ImageFont.truetype(path, size)
            except OSError:
                continue
    return ImageFont.load_default()


def vertical_gradient(w: int, h: int) -> Image.Image:
    img = Image.new("RGB", (w, h))
    draw = ImageDraw.Draw(img)
    for y in range(h):
        t = y / max(1, h - 1)
        draw.line(
            [(0, y), (w, y)],
            fill=tuple(round(BG_TOP[i] + (BG_BOTTOM[i] - BG_TOP[i]) * t) for i in range(3)),
        )
    return img


def main() -> None:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    tile = vertical_gradient(W, H).convert("RGBA")

    # Mark on the left, scaled from the 128px icon.
    icon = Image.open(ICON_128).convert("RGBA")
    icon = icon.resize((132, 132), Image.LANCZOS)
    tile.alpha_composite(icon, (30, (H - 132) // 2))

    draw = ImageDraw.Draw(tile)
    title_font = load_font(38)
    sub_font = load_font(19)

    x = 186
    draw.text((x, 88), "DSH Sidebar", font=title_font, fill=FG)
    draw.text((x, 138), "Open a local dsh web UI", font=sub_font, fill=ACCENT)
    draw.text((x, 164), "from the Edge side panel", font=sub_font, fill=ACCENT)

    tile.convert("RGB").save(OUT, format="PNG")
    print(f"wrote {OUT} ({W}x{H})")


if __name__ == "__main__":
    main()
