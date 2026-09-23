import http from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import path from "node:path";

const root = path.resolve("out");
const types = {".html":"text/html", ".js":"text/javascript", ".css":"text/css", ".json":"application/json", ".txt":"text/plain", ".png":"image/png", ".webp":"image/webp", ".jpg":"image/jpeg", ".svg":"image/svg+xml", ".woff2":"font/woff2", ".glb":"model/gltf-binary", ".xml":"application/xml"};
http.createServer((req,res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    const base = path.resolve(root, `.${pathname}`);
    if (base !== root && !base.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    const file = [base, `${base}.html`, path.join(base, "index.html")].find(f => existsSync(f) && statSync(f).isFile());
    if (!file) { res.writeHead(404).end("Not found"); return; }
    res.writeHead(200, {"Content-Type":types[path.extname(file)] ?? "application/octet-stream", "Content-Length":statSync(file).size, "Cache-Control":"no-store"});
    if (req.method === "HEAD") res.end(); else createReadStream(file).pipe(res);
  } catch {res.writeHead(400).end();}
}).listen(4310, "127.0.0.1", () => console.log("Export preview: http://localhost:4310"));
