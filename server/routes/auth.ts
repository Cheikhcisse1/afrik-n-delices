import {
  burnTime,
  clearSessionCookie,
  currentUser,
  hashPassword,
  newResetToken,
  publicUser,
  requireUser,
  sessionCookie,
  sha256,
  verifyPassword,
  type SessionUser,
} from "../auth.ts";
import { db, rateLimit, recordRate } from "../db.ts";
import { body, HttpError, json, type Ctx } from "../http.ts";
import { escapeHtml, sendMail, siteUrl } from "../mail.ts";
import {
  ChangePasswordSchema,
  DeleteAccountSchema,
  ForgotSchema,
  LoginSchema,
  ProfileSchema,
  RegisterSchema,
  ResetSchema,
} from "../schemas.ts";
import type { Route } from "../router.ts";

const USER_COLS = "id, email, full_name, phone, role, token_version, created_at";

async function register(ctx: Ctx) {
  await rateLimit(`register-ip:${ctx.ip}`, 10, 60);
  const data = await body(ctx, RegisterSchema);
  const sql = db();
  const hash = await hashPassword(data.password);
  const rows = await sql<SessionUser[]>`
    insert into users (email, password_hash, full_name, phone)
    values (${data.email}, ${hash}, ${data.fullName}, ${data.phone ?? null})
    on conflict ((lower(email))) do nothing
    returning ${sql.unsafe(USER_COLS)}`;
  if (rows.length === 0) {
    throw new HttpError(409, "Un compte existe déjà avec cet e-mail.", { email: "Un compte existe déjà avec cet e-mail." });
  }
  ctx.cookies.push(await sessionCookie(rows[0]));
  return json({ user: publicUser(rows[0]) }, 201, ctx.cookies);
}

async function login(ctx: Ctx) {
  const data = await body(ctx, LoginSchema);
  await rateLimit(`login-ip:${ctx.ip}`, 30, 15, false);
  await rateLimit(`login:${data.email}`, 8, 15, false);
  const sql = db();
  const [row] = await sql<(SessionUser & { passwordHash: string })[]>`
    select ${sql.unsafe(USER_COLS)}, password_hash from users where lower(email) = ${data.email}`;
  const ok = row ? await verifyPassword(data.password, row.passwordHash) : (await burnTime(data.password), false);
  if (!row || !ok) {
    await recordRate(`login:${data.email}`);
    await recordRate(`login-ip:${ctx.ip}`);
    throw new HttpError(401, "E-mail ou mot de passe incorrect.");
  }
  ctx.cookies.push(await sessionCookie(row));
  const { passwordHash: _omit, ...user } = row;
  return json({ user: publicUser(user) }, 200, ctx.cookies);
}

async function logout() {
  return json({ ok: true }, 200, [clearSessionCookie()]);
}

async function me(ctx: Ctx) {
  const user = await currentUser(ctx);
  return json({ user: user ? publicUser(user) : null });
}

async function forgot(ctx: Ctx) {
  const data = await body(ctx, ForgotSchema);
  await rateLimit(`forgot-ip:${ctx.ip}`, 10, 60);
  await rateLimit(`forgot:${data.email}`, 3, 60);
  const sql = db();
  const [user] = await sql<{ id: string; fullName: string; email: string }[]>`
    select id, full_name, email from users where lower(email) = ${data.email}`;
  if (user) {
    const { token, hash } = newResetToken();
    await sql`
      insert into password_resets (user_id, token_hash, expires_at)
      values (${user.id}, ${hash}, now() + interval '1 hour')`;
    const link = `${siteUrl(ctx.url)}/reinitialiser-mot-de-passe?token=${token}`;
    const name = escapeHtml(user.fullName);
    await sendMail({
      to: user.email,
      toName: user.fullName,
      subject: "Réinitialiser votre mot de passe — Afrik'N'Délices",
      text: `Bonjour ${user.fullName},\n\nPour choisir un nouveau mot de passe, ouvrez ce lien (valable 1 heure) :\n${link}\n\nSi vous n'avez rien demandé, ignorez ce message.\n\nAfrik'N'Délices by Diallo`,
      html: `<div style="font-family:Arial,sans-serif;color:#2a1a14;max-width:520px">
        <p>Bonjour ${name},</p>
        <p>Pour choisir un nouveau mot de passe, clique sur le bouton ci-dessous. Le lien est valable 1 heure.</p>
        <p><a href="${link}" style="display:inline-block;background:#b3261e;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none">Choisir un nouveau mot de passe</a></p>
        <p style="font-size:13px;color:#6b5a52">Si vous n'avez rien demandé, ignorez ce message : votre mot de passe ne change pas.</p>
        <p>Afrik'N'Délices by Diallo</p></div>`,
    });
  }
  // Même réponse que le compte existe ou non (pas de divulgation des e-mails inscrits)
  return json({ ok: true });
}

async function reset(ctx: Ctx) {
  const data = await body(ctx, ResetSchema);
  await rateLimit(`reset-ip:${ctx.ip}`, 20, 60);
  const sql = db();
  const hash = await hashPassword(data.password);
  const user = await sql.begin(async (tx) => {
    const [r] = await tx<{ id: number; userId: string }[]>`
      select id, user_id from password_resets
      where token_hash = ${sha256(data.token)} and used_at is null and expires_at > now()
      for update`;
    if (!r) throw new HttpError(400, "Ce lien est invalide ou a expiré. Refaites une demande.");
    await tx`update password_resets set used_at = now() where user_id = ${r.userId} and used_at is null`;
    const [u] = await tx<SessionUser[]>`
      update users set password_hash = ${hash}, token_version = token_version + 1, updated_at = now()
      where id = ${r.userId} returning ${tx.unsafe(USER_COLS)}`;
    return u;
  });
  ctx.cookies.push(await sessionCookie(user));
  return json({ user: publicUser(user) }, 200, ctx.cookies);
}

async function updateProfile(ctx: Ctx) {
  const current = await requireUser(ctx);
  const data = await body(ctx, ProfileSchema);
  const sql = db();
  const [user] = await sql<SessionUser[]>`
    update users set full_name = ${data.fullName}, phone = ${data.phone ?? null}, updated_at = now()
    where id = ${current.id} returning ${sql.unsafe(USER_COLS)}`;
  return json({ user: publicUser(user) });
}

async function changePassword(ctx: Ctx) {
  const current = await requireUser(ctx);
  const data = await body(ctx, ChangePasswordSchema);
  await rateLimit(`pwd:${current.id}`, 10, 15);
  const sql = db();
  const [row] = await sql<{ passwordHash: string }[]>`select password_hash from users where id = ${current.id}`;
  if (!(await verifyPassword(data.currentPassword, row.passwordHash))) {
    throw new HttpError(400, "Mot de passe actuel incorrect.", { currentPassword: "Mot de passe actuel incorrect." });
  }
  const hash = await hashPassword(data.newPassword);
  // token_version + 1 : les autres appareils sont déconnectés
  const [user] = await sql<SessionUser[]>`
    update users set password_hash = ${hash}, token_version = token_version + 1, updated_at = now()
    where id = ${current.id} returning ${sql.unsafe(USER_COLS)}`;
  ctx.cookies.push(await sessionCookie(user));
  return json({ ok: true }, 200, ctx.cookies);
}

async function deleteAccount(ctx: Ctx) {
  const current = await requireUser(ctx);
  const data = await body(ctx, DeleteAccountSchema);
  const sql = db();
  const [row] = await sql<{ passwordHash: string }[]>`select password_hash from users where id = ${current.id}`;
  if (!(await verifyPassword(data.password, row.passwordHash))) {
    throw new HttpError(400, "Mot de passe incorrect.", { password: "Mot de passe incorrect." });
  }
  if (current.role === "admin") {
    const [{ count }] = await sql<{ count: number }[]>`select count(*)::int as count from users where role = 'admin'`;
    if (count <= 1) throw new HttpError(400, "Vous êtes le seul administrateur : nommez un autre administrateur avant de supprimer votre compte.");
  }
  // Les commandes passées restent pour la comptabilité, sans lien avec le compte (user_id -> null)
  await sql`delete from users where id = ${current.id}`;
  return json({ ok: true }, 200, [clearSessionCookie()]);
}

export const authRoutes: Route[] = [
  ["POST", "/auth/register", register],
  ["POST", "/auth/login", login],
  ["POST", "/auth/logout", logout],
  ["GET", "/auth/me", me],
  ["POST", "/auth/forgot-password", forgot],
  ["POST", "/auth/reset-password", reset],
  ["PATCH", "/profile", updateProfile],
  ["POST", "/profile/password", changePassword],
  ["DELETE", "/profile", deleteAccount],
];
