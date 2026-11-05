/** Mêmes règles que le serveur (server/schemas.ts) pour un retour immédiat. */
export function passwordProblem(pw: string): string | null {
  if (pw.length < 8) return "8 caractères minimum.";
  if (pw.length > 72) return "72 caractères maximum.";
  if (!/[A-Za-z]/.test(pw)) return "Au moins une lettre.";
  if (!/[0-9]/.test(pw)) return "Au moins un chiffre.";
  return null;
}
