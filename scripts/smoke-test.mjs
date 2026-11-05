// Test de bout en bout de l'API (à lancer UNIQUEMENT contre une base de développement).
// Usage : DATABASE_URL=... BASE=http://localhost:8888 node scripts/smoke-test.mjs
// Crée des comptes de test (@example.test), vérifie chaque module, puis supprime tout ce qu'il a créé.
import postgres from "postgres";
import { createHash, randomBytes } from "node:crypto";

const BASE = process.env.BASE ?? "http://localhost:8888";
const sql = postgres(process.env.DATABASE_URL, { max: 1, onnotice: () => {} });
const run = randomBytes(4).toString("hex");
let passed = 0;
const failures = [];

function check(name, cond, extra = "") {
  if (cond) {
    passed++;
    console.log("  ✓", name);
  } else {
    failures.push(name);
    console.log("  ✗", name, extra);
  }
}

function client() {
  let cookie = "";
  return async function call(method, path, body, headers = {}) {
    const res = await fetch(BASE + "/api" + path, {
      method,
      headers: {
        "content-type": "application/json",
        "x-requested-with": "fetch",
        ...(cookie ? { cookie } : {}),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const set = res.headers.getSetCookie?.() ?? [];
    for (const c of set) {
      const [pair] = c.split(";");
      cookie = pair.endsWith("=") ? "" : pair;
    }
    let data = null;
    try {
      data = await res.json();
    } catch {}
    return { status: res.status, data };
  };
}

const pw = "Thiep2026ok";
const clientMail = `client-${run}@example.test`;
const adminMail = `admin-${run}@example.test`;
const created = { items: [], locations: [] };

try {
  console.log("Public");
  const anon = client();
  let r = await anon("GET", "/health");
  check("health + base connectée", r.status === 200 && r.data.database === "connected");
  r = await anon("GET", "/menu");
  const items = r.data.categories.flatMap((c) => c.items);
  check("carte chargée depuis la base", r.status === 200 && items.length >= 10);
  r = await anon("GET", "/services");
  check("prochains services calculés", r.status === 200 && Array.isArray(r.data.services));
  r = await anon("POST", "/contact", { name: "Test", email: "x", message: "court" });
  check("contact : validation serveur (422)", r.status === 422 && r.data.details.email && r.data.details.message);
  r = await anon("POST", "/contact", { name: "Test smoke", email: clientMail, message: `Message de test ${run} pour le formulaire.` });
  check("contact : message enregistré", r.status === 201);
  r = await fetch(BASE + "/api/contact", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
  check("CSRF : requête sans en-tête refusée (403)", r.status === 403);

  console.log("Inscription / connexion");
  const c = client();
  r = await c("POST", "/auth/register", { fullName: "Client Test", email: clientMail, password: "court" });
  check("inscription : mot de passe faible refusé", r.status === 422 && r.data.details.password);
  r = await c("POST", "/auth/register", { fullName: "Client Test", email: clientMail, phone: "06 00 00 00 00", password: pw });
  check("inscription OK + session", r.status === 201 && r.data.user.role === "client");
  r = await c("POST", "/auth/register", { fullName: "Doublon", email: clientMail.toUpperCase(), password: pw });
  check("inscription : e-mail déjà pris (insensible à la casse)", r.status === 409);
  const [dbUser] = await sql`select password_hash from users where email = ${clientMail}`;
  check("mot de passe stocké haché (bcrypt)", dbUser && dbUser.password_hash.startsWith("$2") && !dbUser.password_hash.includes(pw));
  r = await c("GET", "/auth/me");
  check("/auth/me renvoie le compte", r.data.user?.email === clientMail);
  r = await c("POST", "/auth/logout", {});
  r = await c("GET", "/auth/me");
  check("déconnexion", r.data.user === null);
  r = await c("POST", "/auth/login", { email: clientMail, password: "mauvais123" });
  check("connexion : mauvais mot de passe (401)", r.status === 401);
  r = await c("POST", "/auth/login", { email: clientMail, password: pw });
  check("connexion OK", r.status === 200);

  console.log("Profil");
  r = await c("PATCH", "/profile", { fullName: "Client Modifié", phone: "0611223344" });
  check("profil modifié", r.status === 200 && r.data.user.fullName === "Client Modifié");

  console.log("Routes protégées");
  r = await anon("GET", "/orders/mine");
  check("anonyme : /orders/mine refusé (401)", r.status === 401);
  r = await c("GET", "/admin/orders");
  check("client : espace équipe refusé (403)", r.status === 403);
  r = await c("POST", "/admin/menu-items", { categoryId: 1, name: "Pirate", priceCents: 1 });
  check("client : création de plat refusée (403)", r.status === 403);

  console.log("Commandes");
  r = await anon("GET", "/services");
  const service = r.data.services[0];
  const thiep = items.find((i) => i.name === "Barquette thiep");
  const pastel = items.find((i) => i.name === "Pastel");
  r = await c("POST", "/orders", { locationId: service.location.id, pickupDate: "2020-01-01", items: [{ menuItemId: thiep.id, quantity: 1 }] });
  check("commande : date hors service refusée", r.status === 422);
  r = await c("POST", "/orders", {
    locationId: service.location.id,
    pickupDate: service.date,
    note: "Sans piment",
    items: [
      { menuItemId: thiep.id, quantity: 2 },
      { menuItemId: pastel.id, quantity: 3 },
      { menuItemId: pastel.id, quantity: 1 },
    ],
  });
  check("commande créée", r.status === 201, JSON.stringify(r.data));
  const order = r.data.order;
  check("total recalculé côté serveur (2×7 + 4×1 = 18 €)", order?.totalCents === 1800);
  check("lignes regroupées (pastel ×4)", order?.items.find((i) => i.name === "Pastel")?.quantity === 4);
  const [dbOrder] = await sql`select total_cents, status from orders where id = ${order.id}`;
  check("commande réellement enregistrée en base", dbOrder?.total_cents === 1800 && dbOrder.status === "received");
  r = await c("GET", "/orders/mine");
  check("historique client", r.data.orders.some((o) => o.id === order.id));
  const other = client();
  await other("POST", "/auth/register", { fullName: "Autre Client", email: `autre-${run}@example.test`, password: pw });
  r = await other("GET", `/orders/${order.id}`);
  check("un autre client ne voit pas la commande (404)", r.status === 404);
  r = await other("POST", `/orders/${order.id}/cancel`, {});
  check("un autre client ne peut pas l'annuler", r.status === 409);

  console.log("Administration");
  const a = client();
  await a("POST", "/auth/register", { fullName: "Admin Test", email: adminMail, password: pw });
  await sql`update users set role = 'admin' where email = ${adminMail}`;
  r = await a("GET", "/admin/stats");
  check("admin : statistiques accessibles", r.status === 200);
  r = await a("GET", `/admin/orders?date=${service.date}`);
  check("admin : commandes du jour", r.status === 200 && r.data.orders.some((o) => o.id === order.id));
  r = await a("PATCH", `/admin/orders/${order.id}`, { status: "preparing" });
  check("admin : statut → en préparation", r.data.order?.status === "preparing");
  r = await c("POST", `/orders/${order.id}/cancel`, {});
  check("client : annulation impossible une fois en préparation", r.status === 409);
  r = await a("PATCH", `/admin/orders/${order.id}`, { status: "volé" });
  check("admin : statut invalide refusé", r.status === 422);

  r = await a("POST", "/admin/menu-items", { categoryId: thiep.categoryId, name: `Mafé test ${run}`, priceCents: 750, description: "Test" });
  check("admin : plat créé", r.status === 201);
  const newItem = r.data.item;
  created.items.push(newItem.id);
  r = await a("PUT", `/admin/menu-items/${newItem.id}`, { categoryId: thiep.categoryId, name: `Mafé test ${run}`, priceCents: 800, available: true, position: 9 });
  check("admin : plat modifié", r.data.item?.priceCents === 800);
  r = await a("PATCH", `/admin/menu-items/${newItem.id}/availability`, { available: false });
  check("admin : plat marqué épuisé", r.data.item?.available === false);
  r = await c("POST", "/orders", { locationId: service.location.id, pickupDate: service.date, items: [{ menuItemId: newItem.id, quantity: 1 }] });
  check("commande d'un plat épuisé refusée", r.status === 422);
  r = await a("DELETE", `/admin/menu-items/${newItem.id}`);
  check("admin : plat supprimé", r.status === 200);
  created.items = [];

  r = await a("POST", "/admin/locations", { name: "Test lieu", address: "1 rue du Test", dayOfWeek: 6, startTime: "18:00", endTime: "17:00" });
  check("emplacement : fin avant début refusée", r.status === 422 && r.data.details.endTime);
  r = await a("POST", "/admin/locations", { name: `Lieu ${run}`, address: "1 rue du Test", dayOfWeek: 6, startTime: "17:00", endTime: "21:00", active: false });
  check("admin : emplacement créé", r.status === 201);
  created.locations.push(r.data.location.id);
  r = await a("PUT", `/admin/locations/${r.data.location.id}`, { name: `Lieu ${run}`, address: "2 rue du Test", dayOfWeek: 6, startTime: "17:30", endTime: "21:00", active: false });
  check("admin : emplacement modifié", r.data.location?.startTime === "17:30");
  r = await a("DELETE", `/admin/locations/${created.locations[0]}`);
  check("admin : emplacement supprimé", r.status === 200);
  created.locations = [];

  r = await a("GET", "/admin/messages");
  const msg = r.data.messages.find((m) => m.message.includes(run));
  check("admin : message de contact visible", !!msg);
  r = await a("PATCH", `/admin/messages/${msg.id}`, { handled: true });
  check("admin : message traité", r.data.message?.handled === true);
  r = await a("DELETE", `/admin/messages/${msg.id}`);
  check("admin : message supprimé", r.status === 200);

  r = await a("GET", `/admin/users?q=${encodeURIComponent("client-" + run)}`);
  const cu = r.data.users[0];
  check("admin : recherche utilisateur", cu?.email === clientMail);
  r = await a("PATCH", `/admin/users/${cu.id}/role`, { role: "staff" });
  check("admin : rôle équipe attribué", r.data.user?.role === "staff");
  r = await c("GET", "/auth/me");
  check("changement de rôle → session du client invalidée", r.data.user === null);
  await c("POST", "/auth/login", { email: clientMail, password: pw });
  r = await c("GET", "/admin/orders");
  check("équipe : accès aux commandes", r.status === 200);
  r = await c("POST", "/admin/locations", { name: "Interdit", address: "x x", dayOfWeek: 1 });
  check("équipe : emplacements réservés à l'admin (403)", r.status === 403);
  r = await a("PATCH", `/admin/users/${(await a("GET", "/auth/me")).data.user.id}/role`, { role: "client" });
  check("admin : impossible de se retirer son propre rôle", r.status === 400);

  console.log("Mot de passe");
  r = await anon("POST", "/auth/forgot-password", { email: `inconnu-${run}@example.test` });
  check("oubli : même réponse pour un e-mail inconnu", r.status === 200);
  r = await anon("POST", "/auth/forgot-password", { email: clientMail });
  check("oubli : demande acceptée", r.status === 200);
  const [reset] = await sql`select count(*)::int as n from password_resets pr join users u on u.id = pr.user_id where u.email = ${clientMail}`;
  check("oubli : jeton enregistré (haché) en base", reset.n === 1);
  const token = randomBytes(32).toString("base64url");
  await sql`insert into password_resets (user_id, token_hash, expires_at) select id, ${createHash("sha256").update(token).digest("hex")}, now() + interval '1 hour' from users where email = ${clientMail}`;
  const r2 = client();
  r = await r2("POST", "/auth/reset-password", { token, password: "Nouveau2026x" });
  check("réinitialisation avec jeton valide", r.status === 200);
  r = await r2("POST", "/auth/reset-password", { token, password: "Encore2026x" });
  check("jeton à usage unique", r.status === 400);
  r = await c("GET", "/auth/me");
  check("anciennes sessions déconnectées après réinitialisation", r.data.user === null);
  r = await c("POST", "/auth/login", { email: clientMail, password: "Nouveau2026x" });
  check("connexion avec le nouveau mot de passe", r.status === 200);
  r = await c("POST", "/profile/password", { currentPassword: "faux", newPassword: "Autre2026x" });
  check("changement de mot de passe : ancien incorrect refusé", r.status === 400);

  console.log("Limitation des tentatives");
  const brute = client();
  let last;
  for (let i = 0; i < 9; i++) last = await brute("POST", "/auth/login", { email: adminMail, password: `faux${i}abc` });
  check("connexion bloquée après 8 échecs (429)", last.status === 429);

  console.log("Suppression de compte");
  r = await c("DELETE", "/profile", { password: "Nouveau2026x" });
  check("compte client supprimé", r.status === 200);
  const [orphan] = await sql`select user_id from orders where id = ${order.id}`;
  check("commande conservée sans lien avec le compte", orphan && orphan.user_id === null);
} catch (e) {
  failures.push("exception");
  console.error(e);
} finally {
  // Nettoyage : tout ce qui a été créé par ce test
  await sql`delete from orders where customer_name in ('Client Test', 'Client Modifié') and (user_id is null or user_id in (select id from users where email like ${"%" + run + "@example.test"}))`;
  await sql`delete from users where email like ${"%" + run + "@example.test"}`;
  await sql`delete from contact_messages where message like ${"%" + run + "%"}`;
  await sql`delete from rate_events where key like ${"%" + run + "%"} or key like 'login-ip:%' or key like 'register-ip:%' or key like 'contact-ip:%' or key like 'forgot%'`;
  if (created.items.length) await sql`delete from menu_items where id in ${sql(created.items)}`;
  if (created.locations.length) await sql`delete from locations where id in ${sql(created.locations)}`;
  await sql.end();
  console.log(`\n${passed} vérifications réussies, ${failures.length} échec(s).`);
  if (failures.length) {
    console.log("Échecs :", failures.join(" | "));
    process.exit(1);
  }
}
