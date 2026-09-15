"""Download CC0 scene assets and a pinned Three.js runtime into this workspace."""
from pathlib import Path
from urllib.request import urlopen, Request
from concurrent.futures import ThreadPoolExecutor
import json, hashlib, tarfile, io

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / 'assets' / 'campus'
DEST.mkdir(parents=True, exist_ok=True)
def fetch(url):
    with urlopen(Request(url, headers={'User-Agent': 'AcademySite/1.0'}), timeout=90) as r:
        return r.read()
def api(asset): return json.loads(fetch('https://api.polyhaven.com/files/' + asset))
jobs, manifest = [], []
for asset, prefix in [('leafy_grass','grass'), ('asphalt_02','asphalt'), ('concrete_wall_006','concrete'), ('bark_brown_02','bark')]:
    files = api(asset)
    for channel, suffix in [('Diffuse','diff'), ('nor_gl','normal'), ('Rough','rough')]:
        item = files[channel]['1k']['jpg']
        jobs.append((item, DEST / f'{prefix}-{suffix}.jpg'))
        manifest.append({'asset':asset, 'channel':channel, 'source':item['url'], 'local':f'{prefix}-{suffix}.jpg','license':'CC0','page':'https://polyhaven.com/a/'+asset})
sky = api('industrial_sunset_02')['hdri']['1k']['hdr']
jobs.append((sky, DEST / 'sunset.hdr'))
manifest.append({'asset':'industrial_sunset_02','source':sky['url'],'local':'sunset.hdr','license':'CC0','page':'https://polyhaven.com/a/industrial_sunset_02'})
tree = api('tree_small_02')['gltf']['1k']['gltf']
jobs.append((tree, DEST / 'tree-source' / 'tree.gltf'))
for name, item in tree['include'].items():
    path = (DEST / 'tree-source' / name).resolve()
    if not path.is_relative_to(DEST): raise ValueError('Unsafe asset path')
    jobs.append((item, path))
manifest.append({'asset':'tree_small_02','source':tree['url'],'local':'tree.glb','license':'CC0','page':'https://polyhaven.com/a/tree_small_02','processing':'Simplified and instanced for the web; source retained separately.'})
def download(job):
    item, path = job
    if path.exists() and path.stat().st_size == item['size']: return str(path.relative_to(ROOT)) + ' cached'
    data = fetch(item['url'])
    if hashlib.md5(data).hexdigest() != item['md5']: raise ValueError('Asset checksum failed: '+str(path))
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)
    return str(path.relative_to(ROOT)) + f' ({len(data)//1024} KB)'
with ThreadPoolExecutor(max_workers=5) as pool:
    for message in pool.map(download, jobs): print(message, flush=True)
(DEST/'sources.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')

# Vendor a pinned runtime and only the addon dependency graph actually used by the scene.
import re
package = json.loads(fetch('https://registry.npmjs.org/three/0.184.0'))
tar = tarfile.open(fileobj=io.BytesIO(fetch(package['dist']['tarball'])), mode='r:gz')
members = {m.name:m for m in tar.getmembers() if m.isfile()}
required = {'build/three.module.js','build/three.core.js','LICENSE','examples/jsm/controls/OrbitControls.js','examples/jsm/loaders/GLTFLoader.js','examples/jsm/loaders/RGBELoader.js','examples/jsm/postprocessing/EffectComposer.js','examples/jsm/postprocessing/RenderPass.js','examples/jsm/postprocessing/UnrealBloomPass.js','examples/jsm/postprocessing/OutputPass.js','examples/jsm/postprocessing/ShaderPass.js','examples/jsm/shaders/FXAAShader.js','examples/jsm/postprocessing/GTAOPass.js'}
from posixpath import normpath, dirname
done = set()
while required:
    rel = required.pop()
    if rel in done: continue
    data = tar.extractfile(members['package/'+rel]).read()
    target = ROOT/'vendor'/'three'/rel
    if not target.resolve().is_relative_to(ROOT/'vendor'): raise ValueError('Unsafe package path')
    target.parent.mkdir(parents=True,exist_ok=True); target.write_bytes(data); done.add(rel)
    if rel.endswith('.js'):
        for dep in re.findall(r"(?:from\s*|import\s*)['\"]([^'\"]+)['\"]", data.decode()):
            if dep.startswith('.'): required.add(normpath(dirname(rel)+'/'+dep))
print(f'Vendored Three.js 0.184.0 and {len(done)-3} addon files.', flush=True)
