import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { Field, FormError, Spinner, usePageMeta } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { ApiError, api } from "../../lib/api";
import type { User } from "../../lib/types";
import { AuthShell, safeNext } from "./AuthShell";

export default function Login() {
  usePageMeta("Connexion");
  const { user, setUser } = useAuth();
  const [params] = useSearchParams();
  const next = safeNext(params.get("suite"));
  const navigate = useNavigate();
  const toast = useToast();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  if (user && !sending) return <Navigate to={next} replace />;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email") ?? "").trim();
    const password = String(f.get("password") ?? "");
    const local: Record<string, string> = {};
    if (!email) local.email = "Indiquez votre e-mail.";
    if (!password) local.password = "Indiquez votre mot de passe.";
    setErrors(local);
    setFormError(null);
    if (Object.keys(local).length) return;
    setSending(true);
    try {
      const res = await api<{ user: User }>("/auth/login", { body: { email, password } });
      setUser(res.user);
      toast(`Bonjour ${res.user.fullName.split(" ")[0]} !`);
      navigate(next, { replace: true });
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Une erreur est survenue.");
      setSending(false);
    }
  }

  return (
    <AuthShell title="Connexion" intro="Retrouvez vos commandes et commandez plus vite.">
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <FormError message={formError} />
        <Field label="E-mail" name="email" type="email" autoComplete="email" required error={errors.email} />
        <Field label="Mot de passe" name="password" type="password" autoComplete="current-password" required error={errors.password} />
        <div className="flex justify-end">
          <Link to="/mot-de-passe-oublie" className="text-sm text-piment-dark underline underline-offset-4">
            Mot de passe oublié ?
          </Link>
        </div>
        <button type="submit" className="btn-primary w-full" disabled={sending}>
          {sending && <Spinner />} Se connecter
        </button>
        <p className="text-center text-sm text-charbon-muted">
          Pas encore de compte ?{" "}
          <Link to={`/inscription?suite=${encodeURIComponent(next)}`} className="font-semibold text-piment-dark">
            Créer un compte
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
