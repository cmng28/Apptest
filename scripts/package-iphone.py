"""Package the built static site and refresh the existing portable desktop copy."""
from pathlib import Path
import base64
import re
import zipfile

root = Path("dist")
destination = Path("downloads")
destination.mkdir(exist_ok=True)
html = (root / "index.html").read_text()
script = re.search(r'<script\b[^>]*src="([^"]+)"[^>]*></script>', html)
stylesheet = re.search(r'<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>', html)
if not script or not stylesheet:
    raise SystemExit("Build the app before packaging it.")
js = (root / script.group(1).removeprefix("./")).read_text()
css = (root / stylesheet.group(1).removeprefix("./")).read_text()
if re.search(r'\bimport\s*\(', js):
    raise SystemExit("Portable packaging needs a single JavaScript bundle.")
html = html.replace(script.group(0), '<script type="module">' + js.replace('</script', '<\\/script') + '</script>')
html = html.replace(stylesheet.group(0), '<style>' + css.replace('</style', '<\\/style') + '</style>')
html = re.sub(r'<link\b[^>]*rel="(?:manifest|apple-touch-icon)"[^>]*>', '', html)
html = html.replace('<head>', '<head><meta name="still-portable" content="yes" />')
favicon = base64.b64encode((root / "favicon.svg").read_bytes()).decode()
html = html.replace('href="./favicon.svg"', 'href="data:image/svg+xml;base64,' + favicon + '"')
with zipfile.ZipFile(destination / "Still.zip") as previous:
    launcher = previous.read("start.py")
    instructions = previous.read("OPEN_ME.txt").decode().split('\nIPHONE TRANSFER\n', 1)[0]
instructions += '\nIPHONE TRANSFER\nMy Taste now has Save backup and Restore backup. Save a personal backup on your computer, then restore that file in the hosted iPhone version. The Home Screen app and Safari may use separate storage; add the icon first, then restore from the Home Screen app.\n'
with zipfile.ZipFile(destination / "Still.zip", 'w', zipfile.ZIP_DEFLATED) as archive:
    archive.writestr('Still.html', html)
    archive.writestr('start.py', launcher)
    archive.writestr('OPEN_ME.txt', instructions)
with zipfile.ZipFile(destination / "Still-iphone-site.zip", 'w', zipfile.ZIP_DEFLATED) as archive:
    for path in sorted(root.rglob('*')):
        if path.is_file():
            archive.write(path, path.relative_to(root))
print('Prepared the static iPhone hosting package and portable desktop backup support.')
