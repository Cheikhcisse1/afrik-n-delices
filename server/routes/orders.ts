import { requireUser } from "../auth.ts";
import { db, rateLimit } from "../db.ts";
import { body, HttpError, intParam, json, type Ctx } from "../http.ts";
import { OrderSchema } from "../schemas.ts";
import type { Route } from "../router.ts";
import { upcomingServices } from "./public.ts";

export async function loadOrders(where: { id?: number; userId?: string; date?: string; status?: string }) {
  const sql = db();
  const orders = await sql<{ id: number; userId: string | null; status: string; [k: string]: unknown }[]>`
    select o.id, o.user_id, o.pickup_date::text as pickup_date, to_char(o.pickup_time, 'HH24:MI') as pickup_time,
           o.status, o.note, o.customer_name, o.customer_phone, o.total_cents, o.created_at, o.updated_at,
           l.id as location_id, l.name as location_name, l.address as location_address,
           u.email as customer_email
    from orders o
    join locations l on l.id = o.location_id
    left join users u on u.id = o.user_id
    where true
      ${where.id ? sql`and o.id = ${where.id}` : sql``}
      ${where.userId ? sql`and o.user_id = ${where.userId}` : sql``}
      ${where.date ? sql`and o.pickup_date = ${where.date}` : sql``}
      ${where.status ? sql`and o.status = ${where.status}` : sql``}
    order by ${where.date ? sql`o.pickup_time nulls last, o.created_at` : sql`o.created_at desc`}
    limit 200`;
  if (orders.length === 0) return [];
  const items = await sql<{ orderId: number; [k: string]: unknown }[]>`
    select order_id, menu_item_id, name, unit_price_cents, quantity
    from order_items where order_id in ${sql(orders.map((o) => o.id))} order by id`;
  return orders.map((o) => ({ ...o, items: items.filter((i) => i.orderId === o.id) }));
}

async function createOrder(ctx: Ctx) {
  const user = await requireUser(ctx);
  const data = await body(ctx, OrderSchema);
  await rateLimit(`order:${user.id}`, 10, 60);
  const sql = db();

  const [{ open }] = await sql<{ open: number }[]>`
    select count(*)::int as open from orders where user_id = ${user.id} and status in ('received', 'preparing', 'ready')`;
  if (open >= 5) throw new HttpError(400, "Vous avez déjà 5 commandes en cours. Récupérez-les avant d'en passer une nouvelle.");

  // Le créneau doit correspondre à un vrai service du camion dans les 14 prochains jours
  const service = (await upcomingServices(14)).find(
    (s) => s.date === data.pickupDate && s.location.id === data.locationId,
  );
  if (!service) {
    throw new HttpError(422, "Le camion n'est pas à cet emplacement à cette date.", { pickupDate: "Choisissez un service proposé." });
  }
  const { startTime, endTime } = service.location;
  if (data.pickupTime && ((startTime && data.pickupTime < startTime) || (endTime && data.pickupTime > endTime))) {
    throw new HttpError(422, `L'heure doit être comprise entre ${startTime ?? "…"} et ${endTime ?? "…"}.`, {
      pickupTime: "Heure hors du service.",
    });
  }

  // Regroupe les lignes en double et récupère les prix réels en base (jamais ceux envoyés par le navigateur)
  const qty = new Map<number, number>();
  for (const i of data.items) qty.set(i.menuItemId, Math.min(50, (qty.get(i.menuItemId) ?? 0) + i.quantity));
  const ids = [...qty.keys()];
  const menuItems = await sql<{ id: number; name: string; priceCents: number; available: boolean }[]>`
    select id, name, price_cents, available from menu_items where id in ${sql(ids)}`;
  if (menuItems.length !== ids.length) throw new HttpError(422, "Un article de votre panier n'existe plus. Mettez votre panier à jour.");
  const unavailable = menuItems.filter((m) => !m.available);
  if (unavailable.length) {
    throw new HttpError(422, `Plus disponible aujourd'hui : ${unavailable.map((m) => m.name).join(", ")}.`);
  }
  const total = menuItems.reduce((sum, m) => sum + m.priceCents * qty.get(m.id)!, 0);

  const orderId = await sql.begin(async (tx) => {
    const [o] = await tx<{ id: number }[]>`
      insert into orders (user_id, location_id, pickup_date, pickup_time, note, customer_name, customer_phone, total_cents)
      values (${user.id}, ${data.locationId}, ${data.pickupDate}, ${data.pickupTime ?? null}, ${data.note ?? null},
              ${user.fullName}, ${data.phone ?? user.phone ?? null}, ${total})
      returning id`;
    const rows = menuItems.map((m) => ({
      order_id: o.id,
      menu_item_id: m.id,
      name: m.name,
      unit_price_cents: m.priceCents,
      quantity: qty.get(m.id)!,
    }));
    await tx`insert into order_items ${tx(rows)}`;
    return o.id;
  });

  const [order] = await loadOrders({ id: orderId });
  return json({ order }, 201);
}

async function myOrders(ctx: Ctx) {
  const user = await requireUser(ctx);
  return json({ orders: await loadOrders({ userId: user.id }) });
}

async function getOrder(ctx: Ctx) {
  const user = await requireUser(ctx);
  const [order] = await loadOrders({ id: intParam(ctx.params.id) });
  // Un client ne voit que ses commandes ; l'équipe voit tout
  if (!order || (order.userId !== user.id && user.role === "client")) throw new HttpError(404, "Commande introuvable.");
  return json({ order });
}

async function cancelOrder(ctx: Ctx) {
  const user = await requireUser(ctx);
  const id = intParam(ctx.params.id);
  const rows = await db()`
    update orders set status = 'cancelled', updated_at = now()
    where id = ${id} and user_id = ${user.id} and status = 'received'
    returning id`;
  if (rows.length === 0) {
    throw new HttpError(409, "Cette commande ne peut plus être annulée en ligne (déjà en préparation). Appelez le camion.");
  }
  const [order] = await loadOrders({ id });
  return json({ order });
}

export const orderRoutes: Route[] = [
  ["POST", "/orders", createOrder],
  ["GET", "/orders/mine", myOrders],
  ["GET", "/orders/:id", getOrder],
  ["POST", "/orders/:id/cancel", cancelOrder],
];
