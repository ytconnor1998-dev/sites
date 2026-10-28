"""Copy src/ to dist/web/ for hosts that won't serve .glb files.

Each model becomes a .glb.txt holding the same bytes as base64. The game's loader
decodes these, so the manifest just points at the new names. Run: python3 tools/build-web.py
"""
import base64, json, os, shutil, sys

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src, out = os.path.join(root, 'src'), os.path.join(root, 'dist', 'web')
shutil.rmtree(out, ignore_errors=True)
shutil.copytree(src, out)
for d, _, files in os.walk(out):
    for f in files:
        if f.endswith('.glb'):
            p = os.path.join(d, f)
            with open(p, 'rb') as fh: data = fh.read()
            with open(p + '.txt', 'w') as fh: fh.write(base64.b64encode(data).decode())
            os.remove(p)
mp = os.path.join(out, 'assets', 'models', 'manifest.json')
m = json.load(open(mp))
m = {k: [f + '.txt' if f.endswith('.glb') else f for f in v] for k, v in m.items()}
json.dump(m, open(mp, 'w'), indent=1)
files = sorted(os.path.relpath(os.path.join(d, f), out) for d, _, fs in os.walk(out) for f in fs)
# the page body for an artifact host (which adds its own <html>/<body> wrapper)
import re
html = open(os.path.join(out, 'index.html'), encoding='utf-8').read()
head = re.search(r'<head>(.*?)</head>', html, re.S).group(1)
body = re.search(r'<body[^>]*>(.*)</body>', html, re.S).group(1)
head = '\n'.join(l for l in head.split('\n') if 'name="viewport"' not in l)
with open(os.path.join(out, 'loose-change.html'), 'w', encoding='utf-8') as fh:
    fh.write(head + '\n<style>html,body{height:100%;margin:0;background:#1d1611;overflow:hidden}</style>\n' + body)
files = sorted(os.path.relpath(os.path.join(d, f), out) for d, _, fs in os.walk(out) for f in fs)
print(len(files), 'files,', sum(os.path.getsize(os.path.join(out, f)) for f in files) // 1024 // 1024, 'MB')
