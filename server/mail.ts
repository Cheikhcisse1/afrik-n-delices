import { HttpError, isProd } from "./http.ts";

interface Mail {
  to: string;
  toName?: string;
  subject: string;
  html: string;
  text: string;
}

/** Envoie un e-mail transactionnel via l'API Brevo. Sans clé en local, le message est affiché dans la console. */
export async function sendMail(mail: Mail): Promise<void> {
  const key = process.env.BREVO_API_KEY;
  const from = process.env.MAIL_FROM;
  if (!key || !from) {
    if (!isProd()) {
      console.log(`[mail non envoyé — BREVO_API_KEY absent] À : ${mail.to}\nSujet : ${mail.subject}\n${mail.text}`);
      return;
    }
    throw new HttpError(503, "L'envoi d'e-mails n'est pas configuré.");
  }
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": key, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      sender: { email: from, name: "Afrik'N'Délices by Diallo" },
      to: [{ email: mail.to, name: mail.toName }],
      subject: mail.subject,
      htmlContent: mail.html,
      textContent: mail.text,
    }),
  });
  if (!res.ok) {
    console.error("Brevo a refusé l'envoi", res.status, await res.text().catch(() => ""));
    throw new HttpError(502, "L'e-mail n'a pas pu être envoyé. Réessayez plus tard.");
  }
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export function siteUrl(reqUrl: URL): string {
  const configured = process.env.SITE_URL || process.env.URL;
  if (configured) return configured.replace(/\/$/, "");
  return reqUrl.origin;
}
