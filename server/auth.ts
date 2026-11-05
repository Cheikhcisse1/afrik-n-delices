import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { createHash, randomBytes } from "node:crypto";
import { db } from "./db.ts";
import { HttpError, isProd, readCookie, type Ctx } from "./http.ts";

export type Role = "client" | "staff" | "admin";

export interface SessionUser {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: Role;
  tokenVersion: number;
  createdAt: string;
}

const COOKIE = "and_session";
const SESSION_DAYS = 7;

function secret(): Uint8Array {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 32) throw new HttpError(503, "JWT_SECRET n'est pas configuré (32 caractères minimum).");
  return new TextEncoder().encode(s);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 11);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/** Hash bcrypt factice pour égaliser le temps de réponse quand l'e-mail n'existe pas. */
let dummyHash: string | null = null;
export async function burnTime(password: string): Promise<void> {
  dummyHash ??= await bcrypt.hash("mot-de-passe-factice", 11);
  await bcrypt.compare(password, dummyHash);
}

function cookieAttrs(maxAge: number): string {
  return `Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${isProd() ? "; Secure" : ""}`;
}

export async function sessionCookie(user: { id: string; tokenVersion: number }): Promise<string> {
  const token = await new SignJWT({ tv: user.tokenVersion })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secret());
  return `${COOKIE}=${token}; ${cookieAttrs(SESSION_DAYS * 86400)}`;
}

export function clearSessionCookie(): string {
  return `${COOKIE}=; ${cookieAttrs(0)}`;
}

/** Renvoie l'utilisateur connecté ou null. Le jeton est invalidé si token_version a changé (déconnexion partout, nouveau mot de passe). */
export async function currentUser(ctx: Ctx): Promise<SessionUser | null> {
  const token = readCookie(ctx.req, COOKIE);
  if (!token) return null;
  let sub: string | undefined;
  let tv: unknown;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    sub = payload.sub;
    tv = payload.tv;
  } catch {
    return null;
  }
  if (!sub || !/^[0-9a-f-]{36}$/i.test(sub)) return null;
  const [user] = await db()<SessionUser[]>`
    select id, email, full_name, phone, role, token_version, created_at
    from users where id = ${sub}`;
  if (!user || user.tokenVersion !== tv) return null;
  return user;
}

export async function requireUser(ctx: Ctx): Promise<SessionUser> {
  const user = await currentUser(ctx);
  if (!user) throw new HttpError(401, "Connectez-vous pour continuer.");
  return user;
}

export async function requireRole(ctx: Ctx, ...roles: Role[]): Promise<SessionUser> {
  const user = await requireUser(ctx);
  if (!roles.includes(user.role)) throw new HttpError(403, "Vous n'avez pas les droits pour cette action.");
  return user;
}

export function publicUser(u: SessionUser) {
  return { id: u.id, email: u.email, fullName: u.fullName, phone: u.phone, role: u.role, createdAt: u.createdAt };
}

export function newResetToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: sha256(token) };
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
