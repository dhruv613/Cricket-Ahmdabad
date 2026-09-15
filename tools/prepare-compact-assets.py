"""Build small source textures for the offline GLB export (Pillow required)."""
from pathlib import Path
from PIL import Image
root = Path(__file__).resolve().parents[1] / 'assets/campus'
out = root / 'compact'
out.mkdir(exist_ok=True)
for name in ('grass', 'asphalt', 'concrete', 'bark'):
    for kind in ('diff', 'normal', 'rough'):
        with Image.open(root / f'{name}-{kind}.jpg') as image:
            image.thumbnail((256, 256), Image.Resampling.LANCZOS)
            image.convert('RGB').save(out / f'{name}-{kind}.jpg', quality=75, optimize=True)
