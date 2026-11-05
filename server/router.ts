import { HttpError, json, type Ctx } from "./http.ts";
import { authRoutes } from "./routes/auth.ts";
import { publicRoutes } from "./routes/public.ts";
import { orderRoutes } from "./routes/orders.ts";
import { adminRoutes } from "./routes/admin.ts";

export type Handler = (ctx: Ctx) => Promise<Response>;
export type Route = [method: string, pattern: string, handler: Handler];

const compiled = [...publicRoutes, ...authRoutes, ...orderRoutes, ...adminRoutes].map(([method, pattern, handler]) => ({
  method,
  handler,
  re: new RegExp(`^${pattern.replace(/:(\w+)/g, "(?<$1>[^/]+)")}/?$`),
}));

/**
 * Protection CSRF : toute requête qui modifie des données doit
 * 1) porter l'en-tête X-Requested-With (impossible à ajouter depuis un formulaire d'un autre site sans CORS),
 * 2) venir de la même origine si le navigateur envoie Origin.
 */
function checkCsrf(req: Request, url: URL) {
  if (req.headers.get("x-requested-with") !== "fetch") throw new HttpError(403, "Requête refusée.");
  const origin = req.headers.get("origin");
  if (origin && new URL(origin).host !== url.host) throw new HttpError(403, "Origine refusée.");
}

export async function handle(req: Request, ip: string): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/api/, "") || "/";
  try {
    if (!["GET", "HEAD"].includes(req.method)) checkCsrf(req, url);
    let pathMatched = false;
    for (const r of compiled) {
      const m = path.match(r.re);
      if (!m) continue;
      pathMatched = true;
      if (r.method !== req.method) continue;
      const ctx: Ctx = { req, url, ip, params: { ...(m.groups ?? {}) }, cookies: [] };
      return await r.handler(ctx);
    }
    throw new HttpError(pathMatched ? 405 : 404, pathMatched ? "Méthode non autorisée." : "Route introuvable.");
  } catch (e) {
    if (e instanceof HttpError) return json({ error: e.message, details: e.details }, e.status);
    console.error("Erreur API", req.method, path, e);
    return json({ error: "Une erreur inattendue est survenue. Réessayez dans un instant." }, 500);
  }
}
