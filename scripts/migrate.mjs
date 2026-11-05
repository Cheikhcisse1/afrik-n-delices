// Applique les migrations SQL de db/migrations dans l'ordre, une seule fois chacune.
// Usage : DATABASE_URL=... node scripts/migrate.mjs
import postgres from "postgres";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL manquant");
  process.exit(1);
}
const sql = postgres(url, { max: 1, onnotice: () => {} });
const dir = "db/migrations";

try {
  await sql`create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())`;
  const done = new Set((await sql`select name from schema_migrations`).map((r) => r.name));
  const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
  for (const file of files) {
    if (done.has(file)) continue;
    const content = readFileSync(join(dir, file), "utf8");
    await sql.begin(async (tx) => {
      await tx.unsafe(content);
      await tx`insert into schema_migrations (name) values (${file})`;
    });
    console.log("Appliquée :", file);
  }
  console.log("Base à jour.");
} finally {
  await sql.end();
}
