import { db, rateLimit } from "../db.ts";
import { addDays, body, dayOfWeek, json, parisNow, type Ctx } from "../http.ts";
import { ContactSchema } from "../schemas.ts";
import type { Route } from "../router.ts";

export interface LocationRow {
  id: number;
  name: string;
  address: string;
  dayOfWeek: number;
  startTime: string | null;
  endTime: string | null;
  notes: string | null;
  active: boolean;
}

const hhmm = (t: string | null) => (t ? t.slice(0, 5) : null);

export function formatLocation(l: LocationRow) {
  return { ...l, startTime: hhmm(l.startTime), endTime: hhmm(l.endTime) };
}

/** Prochains services (date + emplacement) sur `days` jours, en heure de Paris. Exclut un service déjà terminé aujourd'hui. */
export async function upcomingServices(days = 14) {
  const locations = (await db()<LocationRow[]>`select * from locations where active order by day_of_week, start_time nulls last`).map(formatLocation);
  const now = parisNow();
  const out: { date: string; location: ReturnType<typeof formatLocation> }[] = [];
  for (let i = 0; i < days; i++) {
    const date = addDays(now.date, i);
    for (const location of locations) {
      if (location.dayOfWeek !== dayOfWeek(date)) continue;
      if (i === 0 && location.endTime && location.endTime <= now.time) continue;
      out.push({ date, location });
    }
  }
  return out;
}

async function health() {
  const [{ ok }] = await db()<{ ok: number }[]>`select 1 as ok`;
  return json({ status: "ok", database: ok === 1 ? "connected" : "error", time: new Date().toISOString() });
}

async function menu() {
  const sql = db();
  const categories = await sql<{ id: number; name: string; position: number }[]>`
    select id, name, position from categories order by position, name`;
  const items = await sql`
    select id, category_id, name, description, price_cents, image_url, available, position
    from menu_items order by position, name`;
  return json({
    categories: categories.map((c) => ({ ...c, items: items.filter((i) => i.categoryId === c.id) })),
  });
}

async function locations() {
  const rows = await db()<LocationRow[]>`select * from locations where active order by day_of_week, start_time nulls last`;
  return json({ locations: rows.map(formatLocation) });
}

async function services() {
  return json({ services: await upcomingServices(14), today: parisNow().date });
}

async function contact(ctx: Ctx) {
  const data = await body(ctx, ContactSchema);
  await rateLimit(`contact-ip:${ctx.ip}`, 5, 60);
  await db()`
    insert into contact_messages (name, email, phone, message)
    values (${data.name}, ${data.email}, ${data.phone ?? null}, ${data.message})`;
  return json({ ok: true }, 201);
}

export const publicRoutes: Route[] = [
  ["GET", "/health", health],
  ["GET", "/menu", menu],
  ["GET", "/locations", locations],
  ["GET", "/services", services],
  ["POST", "/contact", contact],
];
