"""Generate the extension icons (no third-party deps).

Draws the DSH sidebar mark: a rounded deep-blue tile with a white "D" whose
counter is a lightning bolt, matching the harness's dark UI accent. Output is
RGBA PNG written with a minimal encoder so the build needs nothing installed.
"""

from __future__ import annotations

import struct
import zlib
from pathlib import Path

OUT_DIR = Path(__file__).parent.parent / "extension" / "icons"

BG_TOP = (28, 62, 138)
BG_BOTTOM = (17, 34, 82)
FG = (255, 255, 255)
BOLT = (93, 168, 255)
SS = 4  # supersampling factor for antialiasing


def rounded_tile(x: float, y: float, size: float, radius: float) -> bool:
    """Whether a point is inside a rounded square that fills the canvas."""
    inner = radius
    if inner <= x <= size - inner or inner <= y <= size - inner:
        return 0 <= x <= size and 0 <= y <= size
    cx = inner if x < inner else size - inner
    cy = inner if y < inner else size - inner
    return (x - cx) ** 2 + (y - cy) ** 2 <= inner * inner


def ring_alpha(x: float, y: float, size: float) -> float:
    """Coverage of the circular ring that frames the mark."""
    nx, ny = x / size, y / size
    dist = ((nx - 0.5) ** 2 + (ny - 0.5) ** 2) ** 0.5
    return 1.0 if 0.205 <= dist <= 0.315 else 0.0


BOLT_POLY = [
    (0.545, 0.235),
    (0.400, 0.535),
    (0.487, 0.535),
    (0.437, 0.775),
    (0.612, 0.455),
    (0.518, 0.455),
    (0.600, 0.235),
]


def bolt_alpha(x: float, y: float, size: float) -> float:
    """Lightning bolt inside the ring, drawn as one zigzag polygon."""
    return 1.0 if point_in_poly(x / size, y / size, BOLT_POLY) else 0.0


def point_in_poly(px: float, py: float, poly: list[tuple[float, float]]) -> bool:
    inside = False
    j = len(poly) - 1
    for i in range(len(poly)):
        xi, yi = poly[i]
        xj, yj = poly[j]
        if (yi > py) != (yj > py) and px < (xj - xi) * (py - yi) / (yj - yi) + xi:
            inside = not inside
        j = i
    return inside


def render(size: int) -> bytes:
    """Render one icon as straight RGBA rows (no PNG framing)."""
    rows: list[bytes] = []
    radius = size * 0.22
    for py in range(size):
        row = bytearray()
        for px in range(size):
            r = g = b = 0
            a = 0.0
            for sy in range(SS):
                for sx in range(SS):
                    x = px + (sx + 0.5) / SS
                    y = py + (sy + 0.5) / SS
                    if not rounded_tile(x, y, size, radius):
                        continue
                    t = y / size
                    bg = tuple(
                        int(BG_TOP[i] + (BG_BOTTOM[i] - BG_TOP[i]) * t) for i in range(3)
                    )
                    if bolt_alpha(x, y, size) > 0:
                        color = BOLT
                    elif ring_alpha(x, y, size) > 0:
                        color = FG
                    else:
                        color = bg
                    r += color[0]
                    g += color[1]
                    b += color[2]
                    a += 1.0
            total = SS * SS
            if a == 0:
                row += bytes((0, 0, 0, 0))
            else:
                row += bytes(
                    (
                        round(r / a),
                        round(g / a),
                        round(b / a),
                        round(255 * a / total),
                    )
                )
        rows.append(bytes(row))
    return b"".join(rows)


def write_png(path: Path, size: int, pixels: bytes) -> None:
    raw = b"".join(
        b"\x00" + pixels[y * size * 4 : (y + 1) * size * 4] for y in range(size)
    )

    def chunk(tag: bytes, data: bytes) -> bytes:
        body = tag + data
        return struct.pack(">I", len(data)) + body + struct.pack(">I", zlib.crc32(body))

    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    png = (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", ihdr)
        + chunk(b"IDAT", zlib.compress(raw, 9))
        + chunk(b"IEND", b"")
    )
    path.write_bytes(png)


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for size in (16, 32, 48, 128):
        write_png(OUT_DIR / f"icon-{size}.png", size, render(size))
        print(f"wrote {OUT_DIR / f'icon-{size}.png'}")


def write_one(size: int, target: Path) -> None:
    """Write a single arbitrary-size icon (used for the store logo)."""
    target.parent.mkdir(parents=True, exist_ok=True)
    write_png(target, size, render(size))
    print(f"wrote {target}")


if __name__ == "__main__":
    import sys

    if len(sys.argv) >= 3:
        write_one(int(sys.argv[1]), Path(sys.argv[2]))
    else:
        main()
