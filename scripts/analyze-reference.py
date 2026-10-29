"""Read the supplied map without altering it; export aligned terrain/classification data."""
from pathlib import Path
from collections import deque
import json, math, hashlib
import numpy as np
from PIL import Image

root = Path(__file__).resolve().parent.parent
image = Image.open(root / 'public/textures/reference-valley.png').convert('RGB')
columns, rows = 225, 127
pixels = np.array(image.resize((columns, rows), Image.Resampling.BOX)).astype(float)
r, g, b = pixels[:, :, 0], pixels[:, :, 1], pixels[:, :, 2]
water = (b > r * 1.05) & (g > r * 1.10) & (g > 65) & (b > 60)
visited = np.zeros_like(water)
for z in range(rows):
    for x in range(columns):
        if not water[z, x] or visited[z, x]: continue
        queue = deque([(z, x)]); visited[z, x] = True; component = []
        while queue:
            zz, xx = queue.popleft(); component.append((zz, xx))
            for dz, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)):
                nz, nx = zz + dz, xx + dx
                if 0 <= nz < rows and 0 <= nx < columns and water[nz, nx] and not visited[nz, nx]:
                    visited[nz, nx] = True; queue.append((nz, nx))
        if len(component) < 5:
            for zz, xx in component: water[zz, xx] = False

# Foam can be nearly white and fail a blue-water color test. Fill only tiny, fully
# enclosed holes; retain the large wooded islands and the reference sandbars.
visited = np.zeros_like(water)
filled_foam_cells = 0
for z in range(rows):
    for x in range(columns):
        if water[z, x] or visited[z, x]: continue
        queue = deque([(z, x)]); visited[z, x] = True; component = []; border = False
        while queue:
            zz, xx = queue.popleft(); component.append((zz, xx))
            border |= zz in (0, rows - 1) or xx in (0, columns - 1)
            for dz, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)):
                nz, nx = zz + dz, xx + dx
                if 0 <= nz < rows and 0 <= nx < columns and not water[nz, nx] and not visited[nz, nx]:
                    visited[nz, nx] = True; queue.append((nz, nx))
        if not border and len(component) <= 12:
            filled_foam_cells += len(component)
            for zz, xx in component: water[zz, xx] = True

def distance_to(mask):
    distances = np.where(mask, 0., 10000.)
    nearest = np.arange(rows * columns).reshape(rows, columns)
    for forward in (True, False):
        zs = range(rows) if forward else range(rows - 1, -1, -1)
        xs = range(columns) if forward else range(columns - 1, -1, -1)
        neighbors = ((-1, 0), (0, -1), (-1, -1), (-1, 1)) if forward else ((1, 0), (0, 1), (1, 1), (1, -1))
        for z in zs:
            for x in xs:
                for dz, dx in neighbors:
                    zz, xx = z + dz, x + dx
                    if 0 <= zz < rows and 0 <= xx < columns:
                        d = distances[zz, xx] + math.hypot(dx, dz)
                        if d < distances[z, x]: distances[z, x], nearest[z, x] = d, nearest[zz, xx]
    return distances, nearest

width, depth = 60., 60. * image.height / image.width
unit = width / (columns - 1)
land_distance, nearest_water = distance_to(water)
water_distance, _ = distance_to(~water)
heights = np.where(water, .116 - np.minimum(.58, water_distance * unit * .42), .116 + np.minimum(.37, land_distance * unit * .27))
luminance = r * .25 + g * .60 + b * .15
canopy = (~water) & (g > r * .96) & (g > b * 1.15) & (luminance < 125)
wetland = (~water) & (land_distance * unit < 1.2) & (g > r * 1.02)
data = {
    'source': 'User supplied top-down-terrain.png / reference-valley.png',
    'sourceSHA256': hashlib.sha256((root / 'public/textures/reference-valley.png').read_bytes()).hexdigest(),
    'sourceSize': [image.width, image.height], 'columns': columns, 'rows': rows, 'foamCellsReclassifiedAsWater': filled_foam_cells,
    'width': width, 'depth': depth, 'waterLevel': .116,
    'heightMillimeters': np.round(heights * 1000).astype(int).ravel().tolist(),
    'water': water.astype(int).ravel().tolist(), 'canopy': canopy.astype(int).ravel().tolist(),
    'wetland': wetland.astype(int).ravel().tolist(),
    'landDistanceCentimeters': np.minimum(65535, np.round(land_distance * unit * 100)).astype(int).ravel().tolist(),
    'nearestWater': nearest_water.ravel().tolist(),
    'colors': ((r.astype(int) << 16) + (g.astype(int) << 8) + b.astype(int)).ravel().tolist(),
}
(root / 'src/world/reference-map.json').write_text(json.dumps(data, separators=(',', ':')), encoding='utf-8')
print(json.dumps({'sourceSize': data['sourceSize'], 'worldSize': [width, depth], 'grid': [columns, rows], 'waterPercent': round(water.mean() * 100, 2), 'canopyPercent': round(canopy.mean() * 100, 2)}))
