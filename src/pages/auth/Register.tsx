import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { Field, FormError, Spinner, usePageMeta } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { ApiError, api } from "../../lib/api";
import type { User } from "../../lib/types";
import { AuthShell, safeNext } from "./AuthShell";
import { passwordProblem } from "./passwordRules";

export default function Register() {
  usePageMeta("Créer un compte");
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
    const payload = {
      fullName: String(f.get("fullName") ?? "").trim(),
      email: String(f.get("email") ?? "").trim(),
      phone: String(f.get("phone") ?? "").trim(),
      password: String(f.get("password") ?? ""),
    };
    const confirm = String(f.get("confirm") ?? "");
    const local: Record<string, string> = {};
    if (payload.fullName.length < 2) local.fullName = "Indiquez votre nom.";
    if (!/^\S+@\S+\.\S+$/.test(payload.email)) local.email = "Adresse e-mail invalide.";
    const pw = passwordProblem(payload.password);
    if (pw) local.password = pw;
    if (!pw && confirm !== payload.password) local.confirm = "Les deux mots de passe ne correspondent pas.";
    if (!f.get("consent")) local.consent = "Merci d’accepter pour continuer.";
    setErrors(local);
    setFormError(null);
    if (Object.keys(local).length) return;
    setSending(true);
    try {
      const res = await api<{ user: User }>("/auth/register", { body: payload });
      setUser(res.user);
      toast("Compte créé. Bienvenue !");
      navigate(next, { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.details);
        setFormError(err.message);
      } else setFormError("Une erreur est survenue.");
      setSending(false);
    }
  }

  return (
    <AuthShell title="Créer un compte" intro="Pour commander en ligne et suivre vos commandes.">
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <FormError message={formError} />
        <Field label="Nom et prénom" name="fullName" autoComplete="name" required error={errors.fullName} />
        <Field label="E-mail" name="email" type="email" autoComplete="email" required error={errors.email} />
        <Field label="Téléphone (facultatif)" name="phone" type="tel" autoComplete="tel" error={errors.phone} hint="Utile pour vous joindre si un plat manque." />
        <Field label="Mot de passe" name="password" type="password" autoComplete="new-password" required error={errors.password} hint="8 caractères minimum, avec au moins une lettre et un chiffre." />
        <Field label="Confirmer le mot de passe" name="confirm" type="password" autoComplete="new-password" required error={errors.confirm} />
        <div>
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" name="consent" className="mt-1 accent-piment-dark" />
            <span>
              J’accepte que mes informations soient utilisées pour gérer mes commandes (voir{" "}
              <Link to="/confidentialite" className="text-piment-dark underline">
                données personnelles
              </Link>
              ).
            </span>
          </label>
          {errors.consent && <p className="mt-1 text-sm text-piment-dark">{errors.consent}</p>}
        </div>
        <button type="submit" className="btn-primary w-full" disabled={sending}>
          {sending && <Spinner />} Créer mon compte
        </button>
        <p className="text-center text-sm text-charbon-muted">
          Déjà inscrit ?{" "}
          <Link to={`/connexion?suite=${encodeURIComponent(next)}`} className="font-semibold text-piment-dark">
            Se connecter
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
