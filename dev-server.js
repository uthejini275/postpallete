// Local test server: `npm run dev`, then open http://localhost:3000
// Serves /public and runs the same /api files Vercel runs. Reads settings from a .env file if present.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

if (fs.existsSync(path.join(here, ".env"))) {
  for (const line of fs.readFileSync(path.join(here, ".env"), "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon", ".json": "application/json", ".txt": "text/plain" };
const PORT = Number(process.env.PORT) || 3000;

http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  try {
    if (url.pathname.startsWith("/api/")) {
      const name = url.pathname.slice(5).replace(/[^a-z-]/g, "");
      const file = path.join(here, "api", name + ".js");
      if (!fs.existsSync(file)) { res.writeHead(404); return res.end("Not found"); }
      const mod = await import(pathToFileURL(file).href);
      return await mod.default(req, res);
    }
    // Same as vercel.json: the homepage opens the birthday maker.
    if (url.pathname === "/") { res.writeHead(307, { Location: "/birthday" }); return res.end(); }
    // Same rewrites as vercel.json: /b/<id> shows the surprise player, /r/<id> a Recharge Him gift.
    const pathname = /^\/b\/[A-Za-z0-9]{6,20}\/?$/.test(url.pathname) ? "/birthday/surprise.html"
      : /^\/r\/[A-Za-z0-9]{6,20}\/?$/.test(url.pathname) ? "/recharge/gift.html" : url.pathname;
    let p = path.normalize(decodeURIComponent(pathname)).replace(/^([/\\])+/, "");
    if (!p || p.endsWith(path.sep)) p += "index.html";
    let file = path.join(here, "public", p);
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
    if (!file.startsWith(path.join(here, "public")) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404, { "Content-Type": "text/plain" }); return res.end("Not found");
    }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  } catch (e) {
    console.error(e);
    if (!res.headersSent) res.writeHead(500);
    res.end("Server error");
  }
}).listen(PORT, () => {
  const mode = process.env.ANTHROPIC_API_KEY ? "LIVE (uses your Claude API key)" : process.env.MOCK_AI === "1" ? "TEST MODE (fake cards, no AI)" : "NO KEY SET (set ANTHROPIC_API_KEY or MOCK_AI=1)";
  console.log(`Smart Cards running at http://localhost:${PORT}  ·  ${mode}`);
});
