import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Field, FormError, Spinner, usePageMeta } from "../../components/ui";
import { ApiError, api } from "../../lib/api";
import { AuthShell } from "./AuthShell";

export default function ForgotPassword() {
  usePageMeta("Mot de passe oublié");
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string>();
  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email") ?? "").trim();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setFieldError("Adresse e-mail invalide.");
      return;
    }
    setFieldError(undefined);
    setError(null);
    setSending(true);
    try {
      await api("/auth/forgot-password", { body: { email } });
      setSentTo(email);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue.");
    } finally {
      setSending(false);
    }
  }

  return (
    <AuthShell title="Mot de passe oublié" intro="Recevez un lien pour choisir un nouveau mot de passe.">
      {sentTo ? (
        <div className="card p-6">
          <p className="font-medium">Vérifiez votre boîte de réception.</p>
          <p className="mt-2 text-charbon-muted">
            Si un compte existe pour <strong>{sentTo}</strong>, un e-mail vient de partir avec un lien valable 1 heure. Pensez à regarder dans les indésirables.
          </p>
          <Link to="/connexion" className="btn-ghost mt-5">
            Retour à la connexion
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} noValidate className="space-y-5">
          <FormError message={error} />
          <Field label="E-mail du compte" name="email" type="email" autoComplete="email" required error={fieldError} />
          <button type="submit" className="btn-primary w-full" disabled={sending}>
            {sending && <Spinner />} Envoyer le lien
          </button>
          <p className="text-center text-sm">
            <Link to="/connexion" className="text-piment-dark underline underline-offset-4">
              Retour à la connexion
            </Link>
          </p>
        </form>
      )}
    </AuthShell>
  );
}
