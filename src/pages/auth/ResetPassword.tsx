import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Field, FormError, Spinner, usePageMeta } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { ApiError, api } from "../../lib/api";
import type { User } from "../../lib/types";
import { AuthShell } from "./AuthShell";
import { passwordProblem } from "./passwordRules";

export default function ResetPassword() {
  usePageMeta("Nouveau mot de passe");
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const password = String(f.get("password") ?? "");
    const confirm = String(f.get("confirm") ?? "");
    const local: Record<string, string> = {};
    const pw = passwordProblem(password);
    if (pw) local.password = pw;
    else if (password !== confirm) local.confirm = "Les deux mots de passe ne correspondent pas.";
    setErrors(local);
    setFormError(null);
    if (Object.keys(local).length) return;
    setSending(true);
    try {
      const res = await api<{ user: User }>("/auth/reset-password", { body: { token, password } });
      setUser(res.user);
      toast("Mot de passe modifié. Vous êtes connecté.");
      navigate("/compte", { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.details);
        setFormError(err.message);
      } else setFormError("Une erreur est survenue.");
      setSending(false);
    }
  }

  if (token.length < 20) {
    return (
      <AuthShell title="Lien incomplet">
        <p className="text-charbon-muted">Ce lien de réinitialisation est incomplet. Ouvrez le lien reçu par e-mail en entier, ou refaites une demande.</p>
        <Link to="/mot-de-passe-oublie" className="btn-primary mt-6">
          Nouvelle demande
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Nouveau mot de passe" intro="Choisissez un mot de passe que vous n’utilisez pas ailleurs.">
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <FormError message={formError} />
        <Field label="Nouveau mot de passe" name="password" type="password" autoComplete="new-password" required error={errors.password} hint="8 caractères minimum, avec au moins une lettre et un chiffre." />
        <Field label="Confirmer" name="confirm" type="password" autoComplete="new-password" required error={errors.confirm} />
        <button type="submit" className="btn-primary w-full" disabled={sending}>
          {sending && <Spinner />} Enregistrer
        </button>
        {formError && (
          <p className="text-center text-sm">
            <Link to="/mot-de-passe-oublie" className="text-piment-dark underline">
              Refaire une demande
            </Link>
          </p>
        )}
      </form>
    </AuthShell>
  );
}
