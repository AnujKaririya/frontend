// Zero-dependency dev server: serves ./ as a static site and proxies /api/* to your backend.
// Proxying means the browser only ever talks to this origin, so there are no CORS or cookie problems.
//
//   node server.js
//   BACKEND_URL=http://localhost:3000 PORT=5173 node server.js
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 5174;
const BACKEND = new URL(process.env.BACKEND_URL || "http://localhost:3000");

const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json", ".svg": "image/svg+xml",
  ".png": "image/png", ".jpg": "image/jpeg", ".ico": "image/x-icon", ".webp": "image/webp",
};

const server = http.createServer((req, res) => {
  if (req.url.startsWith("/api/")) return proxy(req, res);

  const urlPath = decodeURIComponent(req.url.split("?")[0]);
  let file = path.join(root, urlPath === "/" ? "index.html" : urlPath);
  if (!file.startsWith(root) || /server\.js$|package\.json$/.test(file)) { res.writeHead(403); return res.end(); }
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(root, "index.html");
  res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-cache" });
  fs.createReadStream(file).pipe(res);
});

function proxy(req, res) {
  const headers = { ...req.headers, host: BACKEND.host };
  delete headers.origin; delete headers.referer;
  const upstream = http.request(
    { hostname: BACKEND.hostname, port: BACKEND.port || 80, path: req.url, method: req.method, headers },
    (up) => { res.writeHead(up.statusCode, up.headers); up.pipe(res); }
  );
  upstream.on("error", (e) => {
    res.writeHead(502, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ success: false, message: `Cannot reach backend at ${BACKEND.origin} (${e.code || e.message})` }));
  });
  req.pipe(upstream);
}

server.listen(PORT, () => {
  console.log(`Frontend:  http://localhost:${PORT}`);
  console.log(`Proxying /api -> ${BACKEND.origin}`);
});
