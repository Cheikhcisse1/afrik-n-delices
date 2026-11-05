import postgres from "postgres";
import { HttpError } from "./http.ts";

let client: postgres.Sql | null = null;

/** Connexion unique par instance de fonction. Les requêtes en gabarit (sql`...`) sont paramétrées : pas d'injection SQL possible. */
export function db(): postgres.Sql {
  if (!client) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new HttpError(503, "La base de données n'est pas configurée.");
    client = postgres(url, {
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false,
      transform: postgres.camel,
      onnotice: () => {},
    });
  }
  return client;
}

/**
 * Limiteur simple stocké en base : refuse si `key` a déjà été vu `max` fois dans la fenêtre.
 * `record=false` permet de vérifier sans compter (ex. : on ne compte que les échecs de connexion).
 */
export async function rateLimit(key: string, max: number, windowMinutes: number, record = true): Promise<void> {
  const sql = db();
  const [{ count }] = await sql<{ count: number }[]>`
    select count(*)::int as count from rate_events
    where key = ${key} and created_at > now() - make_interval(mins => ${windowMinutes})`;
  if (count >= max) {
    throw new HttpError(429, "Trop de tentatives. Réessayez dans quelques minutes.");
  }
  if (record) await sql`insert into rate_events (key) values (${key})`;
  if (Math.random() < 0.02) await sql`delete from rate_events where created_at < now() - interval '2 days'`;
}

export async function recordRate(key: string): Promise<void> {
  await db()`insert into rate_events (key) values (${key})`;
}
