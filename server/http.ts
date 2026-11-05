import { z, ZodError, type ZodTypeAny } from "zod";

export class HttpError extends Error {
  constructor(public status: number, message: string, public details?: Record<string, string>) {
    super(message);
  }
}

export interface Ctx {
  req: Request;
  url: URL;
  params: Record<string, string>;
  ip: string;
  /** En-têtes Set-Cookie à ajouter à la réponse */
  cookies: string[];
}

export function json(data: unknown, status = 200, cookies: string[] = []): Response {
  const headers = new Headers({
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  for (const c of cookies) headers.append("set-cookie", c);
  return new Response(JSON.stringify(data), { status, headers });
}

/** Lit et valide le corps JSON de la requête avec un schéma zod. */
export async function body<T extends ZodTypeAny>(ctx: Ctx, schema: T): Promise<z.infer<T>> {
  let raw: unknown;
  try {
    raw = await ctx.req.json();
  } catch {
    throw new HttpError(400, "Requête invalide (JSON attendu).");
  }
  return validate(schema, raw);
}

export function validate<T extends ZodTypeAny>(schema: T, raw: unknown): z.infer<T> {
  try {
    return schema.parse(raw);
  } catch (e) {
    if (e instanceof ZodError) {
      const details: Record<string, string> = {};
      for (const issue of e.issues) {
        const key = issue.path.join(".") || "_";
        if (!details[key]) details[key] = issue.message;
      }
      throw new HttpError(422, "Certaines informations sont invalides.", details);
    }
    throw e;
  }
}

export function intParam(value: string | undefined): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) throw new HttpError(404, "Élément introuvable.");
  return n;
}

export function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.get("cookie");
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return undefined;
}

export function isProd(): boolean {
  return process.env.CONTEXT === "production" || process.env.CONTEXT === "deploy-preview" || process.env.CONTEXT === "branch-deploy";
}

/** Date et heure actuelles à Paris : { date: "YYYY-MM-DD", time: "HH:MM" } */
export function parisNow(): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, time: `${get("hour")}:${get("minute")}` };
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function dayOfWeek(date: string): number {
  return new Date(`${date}T12:00:00Z`).getUTCDay();
}
