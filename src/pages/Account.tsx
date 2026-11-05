import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { StatusBadge } from "../components/OrderTicket";
import { EmptyState, Field, FormError, PageLoader, Spinner, usePageMeta } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { ApiError, api } from "../lib/api";
import { longDate, price } from "../lib/format";
import type { Order, User } from "../lib/types";
import { useApi } from "../lib/useApi";
import { passwordProblem } from "./auth/passwordRules";

function useForm() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  async function run(fn: () => Promise<void>) {
    setSending(true);
    setFormError(null);
    try {
      await fn();
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.details);
        setFormError(err.message);
      } else setFormError("Une erreur est survenue.");
    } finally {
      setSending(false);
    }
  }
  return { errors, setErrors, formError, sending, run };
}

function Profile() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const { errors, setErrors, formError, sending, run } = useForm();
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const payload = { fullName: String(f.get("fullName") ?? "").trim(), phone: String(f.get("phone") ?? "").trim() };
    if (payload.fullName.length < 2) return setErrors({ fullName: "Indiquez votre nom." });
    setErrors({});
    await run(async () => {
      const res = await api<{ user: User }>("/profile", { method: "PATCH", body: payload });
      setUser(res.user);
      toast("Profil enregistré.");
    });
  }
  return (
    <form onSubmit={onSubmit} noValidate className="card space-y-5 p-6">
      <h2 className="text-2xl font-bold">Mes informations</h2>
      <FormError message={formError} />
      <Field label="E-mail" name="email" value={user!.email} disabled hint="L’e-mail sert d’identifiant et ne peut pas être modifié." />
      <Field label="Nom et prénom" name="fullName" defaultValue={user!.fullName} autoComplete="name" error={errors.fullName} />
      <Field label="Téléphone" name="phone" type="tel" defaultValue={user!.phone ?? ""} autoComplete="tel" error={errors.phone} />
      <button className="btn-primary" disabled={sending}>
        {sending && <Spinner />} Enregistrer
      </button>
    </form>
  );
}

function ChangePassword() {
  const toast = useToast();
  const { errors, setErrors, formError, sending, run } = useForm();
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const currentPassword = String(f.get("currentPassword") ?? "");
    const newPassword = String(f.get("newPassword") ?? "");
    const local: Record<string, string> = {};
    if (!currentPassword) local.currentPassword = "Indiquez votre mot de passe actuel.";
    const pw = passwordProblem(newPassword);
    if (pw) local.newPassword = pw;
    setErrors(local);
    if (Object.keys(local).length) return;
    await run(async () => {
      await api("/profile/password", { body: { currentPassword, newPassword } });
      form.reset();
      toast("Mot de passe modifié. Vos autres appareils sont déconnectés.");
    });
  }
  return (
    <form onSubmit={onSubmit} noValidate className="card space-y-5 p-6">
      <h2 className="text-2xl font-bold">Mot de passe</h2>
      <FormError message={formError} />
      <Field label="Mot de passe actuel" name="currentPassword" type="password" autoComplete="current-password" error={errors.currentPassword} />
      <Field label="Nouveau mot de passe" name="newPassword" type="password" autoComplete="new-password" error={errors.newPassword} hint="8 caractères minimum, avec au moins une lettre et un chiffre." />
      <button className="btn-ghost" disabled={sending}>
        {sending && <Spinner />} Changer le mot de passe
      </button>
    </form>
  );
}

function DeleteAccount() {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const { errors, formError, sending, run } = useForm();
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const password = String(new FormData(e.currentTarget).get("password") ?? "");
    await run(async () => {
      await api("/profile", { method: "DELETE", body: { password } });
      setUser(null);
      toast("Votre compte a été supprimé.", "info");
      navigate("/");
    });
  }
  return (
    <div className="rounded-xl border border-piment-dark/20 p-6">
      <h2 className="text-xl font-bold">Supprimer mon compte</h2>
      <p className="mt-2 text-sm text-charbon-muted">
        Vos informations personnelles sont effacées. Les commandes déjà passées restent dans la comptabilité du camion, sans lien avec vous.
      </p>
      {!open ? (
        <button className="btn-ghost btn-sm mt-4 text-piment-dark" onClick={() => setOpen(true)}>
          Supprimer mon compte…
        </button>
      ) : (
        <form onSubmit={onSubmit} noValidate className="mt-4 space-y-4">
          <FormError message={formError} />
          <Field label="Confirmez avec votre mot de passe" name="password" type="password" autoComplete="current-password" error={errors.password} />
          <div className="flex gap-3">
            <button className="btn-primary btn-sm" disabled={sending}>
              {sending && <Spinner />} Supprimer définitivement
            </button>
            <button type="button" className="btn-ghost btn-sm" onClick={() => setOpen(false)}>
              Annuler
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function MyOrders() {
  const { data, loading, error } = useApi<{ orders: Order[] }>("/orders/mine");
  return (
    <section id="commandes" className="scroll-mt-24">
      <h2 className="text-3xl font-bold">Mes commandes</h2>
      <div className="mt-5">
        {loading ? (
          <PageLoader />
        ) : error ? (
          <FormError message={error} />
        ) : !data?.orders.length ? (
          <EmptyState title="Aucune commande pour le moment.">
            <Link to="/carte" className="btn-primary mt-4">
              Commander
            </Link>
          </EmptyState>
        ) : (
          <ul className="space-y-3">
            {data.orders.map((o) => (
              <li key={o.id}>
                <Link to={`/compte/commandes/${o.id}`} className="card flex flex-wrap items-center gap-4 p-5 transition hover:-translate-y-0.5 hover:shadow-lg">
                  <span className="font-display text-2xl font-bold">n° {o.id}</span>
                  <span className="min-w-0 flex-1 text-sm text-charbon-muted">
                    <span className="inline-block first-letter:uppercase">{longDate(o.pickupDate)}</span> · {o.locationName}
                    <br />
                    {o.items.map((i) => `${i.quantity} × ${i.name}`).join(", ")}
                  </span>
                  <span className="font-board text-lg">{price(o.totalCents)}</span>
                  <StatusBadge status={o.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

export default function Account() {
  usePageMeta("Mon compte");
  const { user } = useAuth();
  return (
    <div className="container-x py-14">
      <p className="eyebrow">Mon compte</p>
      <h1 className="mt-3 text-4xl font-extrabold sm:text-5xl">Bonjour {user!.fullName.split(" ")[0]}</h1>
      {(user!.role === "admin" || user!.role === "staff") && (
        <Link to="/admin" className="btn-primary btn-sm mt-5">
          Ouvrir l’espace équipe
        </Link>
      )}
      <div className="mt-10 grid gap-10 lg:grid-cols-[1.3fr_1fr]">
        <MyOrders />
        <div className="space-y-6">
          <Profile />
          <ChangePassword />
          <DeleteAccount />
        </div>
      </div>
    </div>
  );
}
