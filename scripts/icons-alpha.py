"""Убирает белую подложку у 3D-иконок (3dicons приходят WebP без альфы).
Заливка от краёв по «почти белым» пикселям → маска фона, мягкий край 1–2 px,
очистка ореола (un-premultiply от белого). Перезаписывает файлы как WebP с альфой.
Запуск: python scripts/icons-alpha.py public/img/3d
"""
import sys, glob, os
import numpy as np
import cv2
from PIL import Image

THRESH = 238  # насколько «белым» считается фон


def process(path):
    im = Image.open(path).convert("RGB")
    rgb = np.array(im).astype(np.float32)
    h, w, _ = rgb.shape
    minc = rgb.min(axis=2)
    cand = (minc >= THRESH).astype(np.uint8)

    # фон = «белое», связанное с краем картинки
    mask = np.zeros((h + 2, w + 2), np.uint8)
    flood = cand.copy() * 255
    for x, y in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)] + [(x, 0) for x in range(0, w, 8)] + [(x, h - 1) for x in range(0, w, 8)] + [(0, y) for y in range(0, h, 8)] + [(w - 1, y) for y in range(0, h, 8)]:
        if flood[y, x] == 255 and mask[y + 1, x + 1] == 0:
            cv2.floodFill(flood, mask, (x, y), 128, loDiff=0, upDiff=0, flags=4)
    bg = flood == 128

    # мягкий край: в полосе 2 px у границы альфа по «небелизне»
    fg = (~bg).astype(np.uint8)
    band = cv2.dilate(fg, np.ones((3, 3), np.uint8), iterations=2).astype(bool) & bg | (
        fg.astype(bool) & ~cv2.erode(fg, np.ones((3, 3), np.uint8), iterations=2).astype(bool)
    )
    alpha = fg.astype(np.float32)
    soft = np.clip((255.0 - minc) / (255.0 - THRESH + 22), 0, 1)
    alpha[band] = np.maximum(soft[band], alpha[band] * soft[band] ** 0.5)
    alpha = cv2.GaussianBlur(alpha, (0, 0), 0.6)
    alpha[cv2.erode(fg, np.ones((3, 3), np.uint8), iterations=3).astype(bool)] = 1.0

    # un-premultiply от белого: убираем светлый ореол на полупрозрачных пикселях
    a = alpha[..., None]
    col = np.where(a > 0.02, (rgb - (1 - a) * 255.0) / np.maximum(a, 1e-3), rgb)
    out = np.dstack([np.clip(col, 0, 255), alpha * 255]).astype(np.uint8)
    Image.fromarray(out, "RGBA").save(path, "WEBP", quality=90, method=6)


folder = sys.argv[1]
files = sorted(glob.glob(os.path.join(folder, "*.webp")))
for f in files:
    process(f)
print("processed", len(files))
