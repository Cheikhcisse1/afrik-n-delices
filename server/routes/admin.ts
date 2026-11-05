import { requireRole } from "../auth.ts";
import { db } from "../db.ts";
import { body, HttpError, intParam, json, parisNow, validate, type Ctx } from "../http.ts";
import { CategorySchema, LocationSchema, MenuItemSchema, OrderStatus, RoleSchema } from "../schemas.ts";
import type { Route } from "../router.ts";
import { formatLocation, type LocationRow } from "./public.ts";
import { loadOrders } from "./orders.ts";
import { z } from "zod";

const STAFF = ["staff", "admin"] as const;

/* ---------- Commandes (équipe) ---------- */

async function listOrders(ctx: Ctx) {
  await requireRole(ctx, ...STAFF);
  const date = ctx.url.searchParams.get("date") || parisNow().date;
  const status = ctx.url.searchParams.get("status") || undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new HttpError(422, "Date invalide.");
  if (status) validate(OrderStatus, status);
  return json({ date, orders: await loadOrders({ date, status }) });
}

async function updateOrderStatus(ctx: Ctx) {
  await requireRole(ctx, ...STAFF);
  const id = intParam(ctx.params.id);
  const { status } = await body(ctx, z.object({ status: OrderStatus }));
  const rows = await db()`update orders set status = ${status}, updated_at = now() where id = ${id} returning id`;
  if (rows.length === 0) throw new HttpError(404, "Commande introuvable.");
  const [order] = await loadOrders({ id });
  return json({ order });
}

/* ---------- Carte ---------- */

async function createCategory(ctx: Ctx) {
  await requireRole(ctx, "admin");
  const data = await body(ctx, CategorySchema);
  const [category] = await db()`
    insert into categories (name, position) values (${data.name}, ${data.position})
    on conflict (name) do nothing returning *`;
  if (!category) throw new HttpError(409, "Cette catégorie existe déjà.", { name: "Nom déjà utilisé." });
  return json({ category }, 201);
}

async function updateCategory(ctx: Ctx) {
  await requireRole(ctx, "admin");
  const id = intParam(ctx.params.id);
  const data = await body(ctx, CategorySchema);
  try {
    const [category] = await db()`
      update categories set name = ${data.name}, position = ${data.position} where id = ${id} returning *`;
    if (!category) throw new HttpError(404, "Catégorie introuvable.");
    return json({ category });
  } catch (e) {
    if ((e as { code?: string }).code === "23505") throw new HttpError(409, "Cette catégorie existe déjà.", { name: "Nom déjà utilisé." });
    throw e;
  }
}

async function deleteCategory(ctx: Ctx) {
  await requireRole(ctx, "admin");
  const id = intParam(ctx.params.id);
  const [{ count }] = await db()<{ count: number }[]>`select count(*)::int as count from menu_items where category_id = ${id}`;
  if (count > 0) throw new HttpError(409, "Cette catégorie contient encore des plats : déplacez-les ou supprimez-les d'abord.");
  const rows = await db()`delete from categories where id = ${id} returning id`;
  if (rows.length === 0) throw new HttpError(404, "Catégorie introuvable.");
  return json({ ok: true });
}

async function createItem(ctx: Ctx) {
  await requireRole(ctx, "admin");
  const d = await body(ctx, MenuItemSchema);
  const [item] = await db()`
    insert into menu_items (category_id, name, description, price_cents, image_url, available, position)
    values (${d.categoryId}, ${d.name}, ${d.description ?? null}, ${d.priceCents}, ${d.imageUrl ?? null}, ${d.available}, ${d.position})
    returning *`.catch(fkError);
  return json({ item }, 201);
}

async function updateItem(ctx: Ctx) {
  await requireRole(ctx, "admin");
  const id = intParam(ctx.params.id);
  const d = await body(ctx, MenuItemSchema);
  const [item] = await db()`
    update menu_items set category_id = ${d.categoryId}, name = ${d.name}, description = ${d.description ?? null},
      price_cents = ${d.priceCents}, image_url = ${d.imageUrl ?? null}, available = ${d.available},
      position = ${d.position}, updated_at = now()
    where id = ${id} returning *`.catch(fkError);
  if (!item) throw new HttpError(404, "Plat introuvable.");
  return json({ item });
}

/** L'équipe peut marquer un plat épuisé / disponible sans toucher au reste. */
async function setAvailability(ctx: Ctx) {
  await requireRole(ctx, ...STAFF);
  const id = intParam(ctx.params.id);
  const { available } = await body(ctx, z.object({ available: z.boolean() }));
  const [item] = await db()`update menu_items set available = ${available}, updated_at = now() where id = ${id} returning *`;
  if (!item) throw new HttpError(404, "Plat introuvable.");
  return json({ item });
}

async function deleteItem(ctx: Ctx) {
  await requireRole(ctx, "admin");
  const id = intParam(ctx.params.id);
  // Les commandes passées gardent le nom et le prix (order_items.menu_item_id passe à null)
  const rows = await db()`delete from menu_items where id = ${id} returning id`;
  if (rows.length === 0) throw new HttpError(404, "Plat introuvable.");
  return json({ ok: true });
}

function fkError(e: unknown): never {
  if ((e as { code?: string }).code === "23503") throw new HttpError(422, "Catégorie inconnue.", { categoryId: "Catégorie inconnue." });
  throw e;
}

/* ---------- Emplacements ---------- */

async function allLocations(ctx: Ctx) {
  await requireRole(ctx, ...STAFF);
  const rows = await db()<LocationRow[]>`select * from locations order by day_of_week, start_time nulls last`;
  return json({ locations: rows.map(formatLocation) });
}

async function createLocation(ctx: Ctx) {
  await requireRole(ctx, "admin");
  const d = await body(ctx, LocationSchema);
  const [loc] = await db()<LocationRow[]>`
    insert into locations (name, address, day_of_week, start_time, end_time, notes, active)
    values (${d.name}, ${d.address}, ${d.dayOfWeek}, ${d.startTime ?? null}, ${d.endTime ?? null}, ${d.notes ?? null}, ${d.active})
    returning *`;
  return json({ location: formatLocation(loc) }, 201);
}

async function updateLocation(ctx: Ctx) {
  await requireRole(ctx, "admin");
  const id = intParam(ctx.params.id);
  const d = await body(ctx, LocationSchema);
  const [loc] = await db()<LocationRow[]>`
    update locations set name = ${d.name}, address = ${d.address}, day_of_week = ${d.dayOfWeek},
      start_time = ${d.startTime ?? null}, end_time = ${d.endTime ?? null}, notes = ${d.notes ?? null}, active = ${d.active}
    where id = ${id} returning *`;
  if (!loc) throw new HttpError(404, "Emplacement introuvable.");
  return json({ location: formatLocation(loc) });
}

async function deleteLocation(ctx: Ctx) {
  await requireRole(ctx, "admin");
  const id = intParam(ctx.params.id);
  try {
    const rows = await db()`delete from locations where id = ${id} returning id`;
    if (rows.length === 0) throw new HttpError(404, "Emplacement introuvable.");
  } catch (e) {
    if ((e as { code?: string }).code === "23503") {
      throw new HttpError(409, "Des commandes sont liées à cet emplacement : désactivez-le plutôt que de le supprimer.");
    }
    throw e;
  }
  return json({ ok: true });
}

/* ---------- Messages ---------- */

async function listMessages(ctx: Ctx) {
  await requireRole(ctx, ...STAFF);
  const messages = await db()`select * from contact_messages order by handled, created_at desc limit 200`;
  return json({ messages });
}

async function updateMessage(ctx: Ctx) {
  await requireRole(ctx, ...STAFF);
  const id = intParam(ctx.params.id);
  const { handled } = await body(ctx, z.object({ handled: z.boolean() }));
  const [message] = await db()`update contact_messages set handled = ${handled} where id = ${id} returning *`;
  if (!message) throw new HttpError(404, "Message introuvable.");
  return json({ message });
}

async function deleteMessage(ctx: Ctx) {
  await requireRole(ctx, "admin");
  const rows = await db()`delete from contact_messages where id = ${intParam(ctx.params.id)} returning id`;
  if (rows.length === 0) throw new HttpError(404, "Message introuvable.");
  return json({ ok: true });
}

/* ---------- Utilisateurs (admin) ---------- */

async function listUsers(ctx: Ctx) {
  await requireRole(ctx, "admin");
  const q = (ctx.url.searchParams.get("q") || "").trim().slice(0, 80);
  const sql = db();
  const pattern = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  const users = await sql`
    select u.id, u.email, u.full_name, u.phone, u.role, u.created_at,
           (select count(*)::int from orders o where o.user_id = u.id) as order_count
    from users u
    ${q ? sql`where u.email ilike ${pattern} or u.full_name ilike ${pattern}` : sql``}
    order by u.created_at desc limit 100`;
  return json({ users });
}

async function setRole(ctx: Ctx) {
  const me = await requireRole(ctx, "admin");
  const id = ctx.params.id;
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new HttpError(404, "Utilisateur introuvable.");
  const { role } = await body(ctx, RoleSchema);
  if (id === me.id && role !== "admin") throw new HttpError(400, "Vous ne pouvez pas retirer votre propre rôle d'administrateur.");
  // token_version + 1 : la personne doit se reconnecter avec ses nouveaux droits
  const [user] = await db()`
    update users set role = ${role}, token_version = token_version + 1, updated_at = now()
    where id = ${id} returning id, email, full_name, phone, role, created_at`;
  if (!user) throw new HttpError(404, "Utilisateur introuvable.");
  return json({ user });
}

async function stats(ctx: Ctx) {
  await requireRole(ctx, ...STAFF);
  const today = parisNow().date;
  const [row] = await db()`
    select
      (select count(*)::int from orders where pickup_date = ${today} and status <> 'cancelled') as orders_today,
      (select coalesce(sum(total_cents), 0)::int from orders where pickup_date = ${today} and status <> 'cancelled') as revenue_today_cents,
      (select count(*)::int from orders where status in ('received', 'preparing')) as orders_pending,
      (select count(*)::int from contact_messages where not handled) as messages_unread,
      (select count(*)::int from users) as users_total`;
  return json({ today, ...row });
}

export const adminRoutes: Route[] = [
  ["GET", "/admin/stats", stats],
  ["GET", "/admin/orders", listOrders],
  ["PATCH", "/admin/orders/:id", updateOrderStatus],
  ["POST", "/admin/categories", createCategory],
  ["PUT", "/admin/categories/:id", updateCategory],
  ["DELETE", "/admin/categories/:id", deleteCategory],
  ["POST", "/admin/menu-items", createItem],
  ["PUT", "/admin/menu-items/:id", updateItem],
  ["PATCH", "/admin/menu-items/:id/availability", setAvailability],
  ["DELETE", "/admin/menu-items/:id", deleteItem],
  ["GET", "/admin/locations", allLocations],
  ["POST", "/admin/locations", createLocation],
  ["PUT", "/admin/locations/:id", updateLocation],
  ["DELETE", "/admin/locations/:id", deleteLocation],
  ["GET", "/admin/messages", listMessages],
  ["PATCH", "/admin/messages/:id", updateMessage],
  ["DELETE", "/admin/messages/:id", deleteMessage],
  ["GET", "/admin/users", listUsers],
  ["PATCH", "/admin/users/:id/role", setRole],
];
