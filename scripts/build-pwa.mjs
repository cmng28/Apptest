import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const root = "dist";
async function filesIn(directory, prefix = "") {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relative = prefix + entry.name;
    if (entry.isDirectory())
      files.push(
        ...(await filesIn(join(directory, entry.name), relative + "/")),
      );
    else if (entry.name !== "sw.js") files.push(relative);
  }
  return files.sort();
}
const files = await filesIn(root);
const hash = createHash("sha256");
for (const file of files)
  hash.update(file).update(await readFile(join(root, file)));
const version = hash.digest("hex").slice(0, 16);
const worker = `// Generated from the complete production build. Journal data is never cached here.
const ROOT = new URL('./', self.location.href);
const PREFIX = 'still-app-' + encodeURIComponent(ROOT.href) + '-';
const CACHE = PREFIX + '${version}';
const ASSETS = ${JSON.stringify(files)}.map(file => new URL(file, ROOT).href);
const INDEX = new URL('index.html', ROOT).href;
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key.startsWith(PREFIX) && key !== CACHE).map(key => caches.delete(key))
  )).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== ROOT.origin || !url.pathname.startsWith(ROOT.pathname)) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(caches.open(CACHE).then(cache => cache.match(INDEX)).then(response => response || fetch(event.request)));
    return;
  }
  url.search = '';
  url.hash = '';
  if (ASSETS.includes(url.href)) {
    event.respondWith(caches.open(CACHE).then(cache => cache.match(url.href)).then(response => response || fetch(event.request)));
  }
});
`;
await writeFile(join(root, "sw.js"), worker);
console.log(`Prepared offline app: ${files.length} files, version ${version}.`);
