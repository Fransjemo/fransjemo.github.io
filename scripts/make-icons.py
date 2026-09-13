#!/usr/bin/env python3
"""Write simple Telegram-blue PNG icons without third-party deps."""

from __future__ import annotations

import struct
import zlib
from pathlib import Path


def png_rgba(width: int, height: int, pixels: bytes) -> bytes:
    def chunk(tag: bytes, data: bytes) -> bytes:
        return (
            struct.pack(">I", len(data))
            + tag
            + data
            + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
        )

    raw = b""
    stride = width * 4
    for y in range(height):
        raw += b"\x00" + pixels[y * stride : (y + 1) * stride]
    return b"".join(
        [
            b"\x89PNG\r\n\x1a\n",
            chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)),
            chunk(b"IDAT", zlib.compress(raw, 9)),
            chunk(b"IEND", b""),
        ]
    )


def draw_icon(size: int) -> bytes:
    pixels = bytearray(size * size * 4)
    r = size / 2
    paper = (255, 255, 255, 255)
    blue = (42, 171, 238, 255)
    # rounded-rect background
    rad = size * 0.22
    for y in range(size):
        for x in range(size):
            cx = min(x, size - 1 - x)
            cy = min(y, size - 1 - y)
            inside = True
            if cx < rad and cy < rad:
                dx = rad - cx
                dy = rad - cy
                inside = dx * dx + dy * dy <= rad * rad
            color = blue if inside else (0, 0, 0, 0)
            i = (y * size + x) * 4
            pixels[i : i + 4] = bytes(color)

    def put(x: int, y: int) -> None:
        if 0 <= x < size and 0 <= y < size:
            i = (y * size + x) * 4
            pixels[i : i + 4] = bytes(paper)

    # crude paper-plane triangle
    left, right = int(size * 0.22), int(size * 0.80)
    top, bottom = int(size * 0.28), int(size * 0.72)
    for y in range(top, bottom):
        t = (y - top) / max(1, bottom - top)
        x0 = int(left + (right - left) * (0.15 + 0.15 * t))
        x1 = int(right - (right - left) * 0.05 * t)
        for x in range(x0, x1):
            # hollow-ish body: fill a wedge
            if (x - x0) / max(1, x1 - x0) + t * 0.35 < 1.05:
                put(x, y)
    return png_rgba(size, size, bytes(pixels))


def main() -> None:
    out = Path("/workspace/exporter/public")
    out.mkdir(parents=True, exist_ok=True)
    (out / "pwa-192.png").write_bytes(draw_icon(192))
    (out / "pwa-512.png").write_bytes(draw_icon(512))
    (out / "apple-touch-icon.png").write_bytes(draw_icon(180))
    print("wrote icons")


if __name__ == "__main__":
    main()
