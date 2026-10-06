// Local-only test server for the production app, including a repository subpath.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";

const root = resolve("dist");
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json",
};
createServer(async (request, response) => {
  try {
    const url = new URL(request.url, "http://127.0.0.1");
    let path = decodeURIComponent(url.pathname);
    if (path.startsWith("/Apptest/")) path = path.slice("/Apptest".length);
    if (path.endsWith("/")) path += "index.html";
    const target = resolve(root, "." + path);
    if (
      !target.startsWith(root + sep) ||
      !["GET", "HEAD"].includes(request.method)
    ) {
      response.writeHead(404).end();
      return;
    }
    const body = await readFile(target);
    response.writeHead(200, {
      "Content-Type": types[extname(target)] ?? "application/octet-stream",
      "Cache-Control": "no-cache",
    });
    response.end(request.method === "HEAD" ? undefined : body);
  } catch {
    response.writeHead(404).end();
  }
}).listen(5175, "127.0.0.1", () =>
  console.log("Production test server ready on port 5175."),
);
