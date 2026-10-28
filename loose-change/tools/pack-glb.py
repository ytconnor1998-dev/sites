"""Packs .gltf models (with their .bin and textures) into single .glb files, and updates the manifest.
Usage: python3 tools/pack-glb.py   (run from the loose-change folder)"""
import json, os, struct, glob

ROOT = 'src/assets/models'
MIME = {'.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg'}

def pack(path):
    d = os.path.dirname(path)
    g = json.load(open(path))
    blob = bytearray()
    def add(data):
        while len(blob) % 4: blob.append(0)
        off = len(blob); blob.extend(data); return off
    # buffers: assume each external buffer is appended in order; remap bufferViews
    offsets = []
    for b in g.get('buffers', []):
        data = open(os.path.join(d, b['uri']), 'rb').read()
        offsets.append(add(data))
    for bv in g.get('bufferViews', []):
        bv['byteOffset'] = bv.get('byteOffset', 0) + offsets[bv.get('buffer', 0)]
        bv['buffer'] = 0
    for im in g.get('images', []):
        if 'uri' in im and not im['uri'].startswith('data:'):
            data = open(os.path.join(d, im['uri']), 'rb').read()
            off = add(data)
            g.setdefault('bufferViews', []).append({'buffer': 0, 'byteOffset': off, 'byteLength': len(data)})
            im['bufferView'] = len(g['bufferViews']) - 1
            im['mimeType'] = MIME[os.path.splitext(im['uri'])[1].lower()]
            del im['uri']
    while len(blob) % 4: blob.append(0)
    g['buffers'] = [{'byteLength': len(blob)}]
    js = json.dumps(g, separators=(',', ':')).encode()
    while len(js) % 4: js += b' '
    out = path[:-5] + '.glb'
    total = 12 + 8 + len(js) + 8 + len(blob)
    with open(out, 'wb') as f:
        f.write(struct.pack('<4sII', b'glTF', 2, total))
        f.write(struct.pack('<I4s', len(js), b'JSON')); f.write(js)
        f.write(struct.pack('<I4s', len(blob), b'BIN\0')); f.write(blob)
    return out

used = set()
gltfs = sorted(glob.glob(ROOT + '/**/*.gltf', recursive=True))
for p in gltfs:
    g = json.load(open(p)); d = os.path.dirname(p)
    for b in g.get('buffers', []): used.add(os.path.join(d, b['uri']))
    for im in g.get('images', []):
        if 'uri' in im: used.add(os.path.join(d, im['uri']))
    pack(p); os.remove(p)
for f in used:
    if os.path.exists(f): os.remove(f)
m = json.load(open(ROOT + '/manifest.json'))
for k, files in m.items(): m[k] = [f[:-5] + '.glb' if f.endswith('.gltf') else f for f in files]
json.dump(m, open(ROOT + '/manifest.json', 'w'), indent=1)
print(f'packed {len(gltfs)} models')
