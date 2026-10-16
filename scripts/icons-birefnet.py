# Перевырезка 3D-иконок для сайта: python scripts/icons-birefnet.py <папка-оригиналов-с-белым-фоном> public/img/3d
"""3D-иконки: вырезка BiRefNet-general на x2-апскейле + очистка белого ореола (un-premultiply от белого)."""
import sys, os, glob
import numpy as np
from PIL import Image
from rembg import remove, new_session

src, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
sess = new_session("birefnet-general")
for f in sorted(glob.glob(os.path.join(src, "*.webp"))):
    im = Image.open(f).convert("RGB").resize((800, 800), Image.LANCZOS)
    cut = remove(im, session=sess, post_process_mask=False)
    a = np.array(cut).astype(np.float32)
    al = a[:, :, 3:4] / 255.0
    rgb = np.array(im).astype(np.float32)
    # цвет полупрозрачных пикселей без примеси белого фона
    col = np.where(al > 0.02, (rgb - (1 - al) * 255.0) / np.maximum(al, 1e-3), rgb)
    al2 = np.clip((al - 0.04) / 0.96, 0, 1)  # убираем почти невидимую «пыль»
    res = np.dstack([np.clip(col, 0, 255), al2 * 255]).astype(np.uint8)
    Image.fromarray(res, "RGBA").save(os.path.join(out, os.path.basename(f)), "WEBP", quality=90, method=6)
    print("ok", os.path.basename(f), flush=True)
