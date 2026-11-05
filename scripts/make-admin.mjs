// Donne un rôle à un compte existant (le compte doit d'abord s'inscrire sur le site).
// Usage : DATABASE_URL=... node scripts/make-admin.mjs email@exemple.fr [admin|staff|client]
import postgres from "postgres";

const [email, role = "admin"] = process.argv.slice(2);
if (!process.env.DATABASE_URL || !email || !["admin", "staff", "client"].includes(role)) {
  console.error("Usage : DATABASE_URL=... node scripts/make-admin.mjs email [admin|staff|client]");
  process.exit(1);
}
const sql = postgres(process.env.DATABASE_URL, { max: 1 });
try {
  const rows = await sql`update users set role = ${role}, updated_at = now() where lower(email) = lower(${email}) returning email, role`;
  if (rows.length === 0) console.error("Aucun compte avec cet e-mail. Inscrivez-vous d'abord sur le site.");
  else console.log(`${rows[0].email} a maintenant le rôle ${rows[0].role}.`);
} finally {
  await sql.end();
}
