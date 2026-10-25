"""Package the current source and production site without dependencies or credentials."""
from pathlib import Path
import hashlib
import zipfile

root = Path(__file__).resolve().parents[1]
out = root / 'release'
out.mkdir(exist_ok=True)
if not (root / 'app/dist/index.html').is_file():
    raise SystemExit('Run npm --prefix app run build before packaging.')
excluded = {'.git', 'node_modules', 'dist', 'test-results', 'playwright-report', 'release', '__pycache__'}
source = out / 'Humline-MVP-source.zip'
with zipfile.ZipFile(source, 'w', zipfile.ZIP_DEFLATED) as archive:
    for path in sorted(root.rglob('*')):
        relative = path.relative_to(root)
        if not path.is_file() or any(part in excluded for part in relative.parts):
            continue
        if path.suffix in {'.zip', '.tsbuildinfo', '.pem'} or path.name.startswith('.env'):
            continue
        archive.write(path, Path('humline') / relative)
site = out / 'Humline-MVP-static-site.zip'
with zipfile.ZipFile(site, 'w', zipfile.ZIP_DEFLATED) as archive:
    for path in sorted((root / 'app/dist').rglob('*')):
        if path.is_file():
            archive.write(path, path.relative_to(root / 'app/dist'))
checksums = []
for path in [source, site]:
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    checksums.append(f'{digest}  {path.name}')
    print(f'{path.name}: {path.stat().st_size:,} bytes; SHA-256 {digest}')
(out / 'SHA256SUMS.txt').write_text('\n'.join(checksums) + '\n')
