# Маска воды Петербурга из OSM (берег залива + реки/каналы) → PNG: белый = вода, прозрачный = суша.
import sys, json, math
from PIL import Image, ImageDraw
src, out = sys.argv[1], sys.argv[2]
LON0, LON1, LAT0, LAT1 = 30.12, 30.46, 59.825, 60.04
W = 1200
KX = math.cos(math.radians((LAT0 + LAT1) / 2))
H = round(W * (LAT1 - LAT0) / ((LON1 - LON0) * KX))
SS = 2  # рисуем вдвое крупнее и уменьшаем — сглаженные края
def P(lon, lat): return ((lon - LON0) / (LON1 - LON0) * W * SS, (LAT1 - lat) / (LAT1 - LAT0) * H * SS)
d = json.load(open(src, encoding='utf8'))['elements']
img = Image.new('L', (W * SS, H * SS), 0); dr = ImageDraw.Draw(img)

def rings(ways):
    # собираем замкнутые кольца из кусков (по совпадению концов)
    segs = [[(p['lon'], p['lat']) for p in w] for w in ways if len(w) > 1]; res = []
    while segs:
        r = segs.pop(0)
        changed = True
        while r[0] != r[-1] and changed:
            changed = False
            for i, s in enumerate(segs):
                if s[0] == r[-1]: r += s[1:]
                elif s[-1] == r[-1]: r += s[::-1][1:]
                elif s[-1] == r[0]: r = s[:-1] + r
                elif s[0] == r[0]: r = s[::-1][:-1] + r
                else: continue
                segs.pop(i); changed = True; break
        res.append(r)
    return res

coast = []
for e in d:
    t = e.get('tags', {})
    if e['type'] == 'way' and t.get('natural') == 'coastline':
        coast.append([P(p['lon'], p['lat']) for p in e['geometry']])
    elif e['type'] == 'way' and 'geometry' in e:
        pts = [P(p['lon'], p['lat']) for p in e['geometry']]
        if len(pts) > 2: dr.polygon(pts, fill=255)
    elif e['type'] == 'relation':
        outer = [m['geometry'] for m in e.get('members', []) if m.get('role') == 'outer' and 'geometry' in m]
        inner = [m['geometry'] for m in e.get('members', []) if m.get('role') == 'inner' and 'geometry' in m]
        for r in rings(outer):
            if len(r) > 2: dr.polygon([P(*q) for q in r], fill=255)
        for r in rings(inner):
            if len(r) > 2: dr.polygon([P(*q) for q in r], fill=0)
# залив: берег как граница, заливка от точки в воде Невской губы
for c in coast: dr.line(c, fill=128, width=4)
seed = tuple(int(v) for v in P(30.16, 59.93))
ImageDraw.floodfill(img, seed, 255, thresh=10)
img = img.point(lambda v: 255 if v >= 128 else 0)
img = img.resize((W, H), Image.LANCZOS)
rgba = Image.new('RGBA', (W, H), (255, 255, 255, 0)); rgba.putalpha(img)
rgba.save(out, optimize=True)
print('size', W, H, 'coast ways', len(coast))
