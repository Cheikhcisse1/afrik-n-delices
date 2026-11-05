// Serveur de développement local : Vite (frontend) + le même routeur API que la fonction Netlify.
// Évite d'avoir besoin de la CLI Netlify en local. Port 8888, comme `netlify dev`.
import { createServer as createHttpServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { createServer as createViteServer } from "vite";

// Charge .env sans écraser les variables déjà définies
if (existsSync(".env")) {
  for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]] && m[2] !== "") process.env[m[1]] = m[2];
  }
}
process.env.CONTEXT ??= "dev";

const vite = await createViteServer({ server: { middlewareMode: true, hmr: { port: 24678 } }, appType: "spa" });

const server = createHttpServer(async (req, res) => {
  if (!req.url?.startsWith("/api/")) return vite.middlewares(req, res);
  try {
    const { handle } = await vite.ssrLoadModule("/server/router.ts");
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const url = `http://${req.headers.host}${req.url}`;
    const request = new Request(url, {
      method: req.method,
      headers: Object.entries(req.headers).flatMap(([k, v]) => (Array.isArray(v) ? v.map((x) => [k, x]) : v ? [[k, v]] : [])),
      body: ["GET", "HEAD"].includes(req.method) ? undefined : Buffer.concat(chunks),
    });
    const response = await handle(request, req.socket.remoteAddress ?? "local");
    res.statusCode = response.status;
    response.headers.forEach((v, k) => {
      if (k !== "set-cookie") res.setHeader(k, v);
    });
    const cookies = response.headers.getSetCookie();
    if (cookies.length) res.setHeader("set-cookie", cookies);
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (e) {
    console.error(e);
    res.statusCode = 500;
    res.end("Erreur du serveur de développement");
  }
});

server.listen(8888, "0.0.0.0", () => console.log("Site + API : http://localhost:8888"));
