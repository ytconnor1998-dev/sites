"""Shrink the textures embedded in .glb files so they load faster and use less memory.
usage: python3 tools/shrink-textures.py [--max 256] file.glb ...   (rewrites in place)"""
import io, json, struct, sys
from PIL import Image

args = sys.argv[1:]; size = 256
if args[0] == '--max': size = int(args[1]); args = args[2:]
for p in args:
    b = open(p, 'rb').read()
    jl = struct.unpack('<I', b[12:16])[0]; g = json.loads(b[20:20 + jl]); bin_ = b[28 + jl:]
    imgviews = {im['bufferView']: im for im in g.get('images', []) if 'bufferView' in im}
    blob = bytearray(); before = len(bin_)
    for i, bv in enumerate(g['bufferViews']):
        data = bin_[bv.get('byteOffset', 0): bv.get('byteOffset', 0) + bv['byteLength']]
        if i in imgviews:
            im = Image.open(io.BytesIO(data))
            if max(im.size) > size:
                im.thumbnail((size, size), Image.LANCZOS)
                out = io.BytesIO(); im.save(out, 'PNG', optimize=True); data = out.getvalue()
                imgviews[i]['mimeType'] = 'image/png'
        while len(blob) % 4: blob.append(0)
        bv['byteOffset'] = len(blob); bv['byteLength'] = len(data); bv['buffer'] = 0; blob.extend(data)
    while len(blob) % 4: blob.append(0)
    g['buffers'] = [{'byteLength': len(blob)}]
    js = json.dumps(g, separators=(',', ':')).encode(); js += b' ' * (-len(js) % 4)
    open(p, 'wb').write(b'glTF' + struct.pack('<II', 2, 28 + len(js) + len(blob)) + struct.pack('<I', len(js)) + b'JSON' + js + struct.pack('<I', len(blob)) + b'BIN\0' + bytes(blob))
    print(p.split('/')[-1], before // 1024, '->', len(blob) // 1024, 'KB')
