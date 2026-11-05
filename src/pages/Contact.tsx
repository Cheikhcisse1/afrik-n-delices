import { useState, type FormEvent } from "react";
import { Field, FormError, Spinner, TextArea, usePageMeta } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { ApiError, api } from "../lib/api";
import { PHONE, PHONE_LINK } from "../lib/format";

export default function Contact() {
  usePageMeta("Contact", "Contactez Afrik'N'Délices by Diallo : téléphone 06 52 53 04 88 ou formulaire en ligne. Commandes de groupe et événements.");
  const { user } = useAuth();
  const toast = useToast();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const payload = {
      name: String(f.get("name") ?? ""),
      email: String(f.get("email") ?? ""),
      phone: String(f.get("phone") ?? ""),
      message: String(f.get("message") ?? ""),
      website: String(f.get("website") ?? ""),
    };
    const local: Record<string, string> = {};
    if (payload.name.trim().length < 2) local.name = "Indiquez votre nom.";
    if (!/^\S+@\S+\.\S+$/.test(payload.email.trim())) local.email = "Adresse e-mail invalide.";
    if (payload.message.trim().length < 10) local.message = "Votre message est un peu court (10 caractères minimum).";
    setErrors(local);
    setFormError(null);
    if (Object.keys(local).length) return;
    setSending(true);
    try {
      await api("/contact", { body: payload });
      form.reset();
      setSent(true);
      toast("Message envoyé. Merci !");
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.details);
        setFormError(err.message);
      } else setFormError("Une erreur est survenue.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="container-x grid gap-14 py-14 lg:grid-cols-[1fr_1.2fr]">
      <div>
        <p className="eyebrow">Contact</p>
        <h1 className="mt-3 text-5xl font-extrabold">Parlons cuisine.</h1>
        <p className="mt-5 max-w-md text-lg leading-relaxed text-charbon-muted">
          Une commande pour un groupe, un événement, une question sur un plat ? Le plus rapide reste le téléphone pendant le service.
        </p>
        <a href={PHONE_LINK} className="mt-8 inline-block font-board text-4xl tracking-wide text-piment-dark hover:text-bordeaux">
          {PHONE}
        </a>
        <p className="mt-2 text-sm text-charbon-muted">Appel ou SMS</p>
      </div>

      <div className="card p-6 sm:p-8">
        {sent ? (
          <div className="py-8 text-center">
            <p className="font-display text-3xl font-bold">Merci !</p>
            <p className="mt-3 text-charbon-muted">Votre message est bien arrivé. Nous vous répondrons rapidement.</p>
            <button className="btn-ghost mt-6" onClick={() => setSent(false)}>
              Envoyer un autre message
            </button>
          </div>
        ) : (
          <form onSubmit={onSubmit} noValidate className="space-y-5">
            <FormError message={formError} />
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Nom" name="name" autoComplete="name" required defaultValue={user?.fullName} error={errors.name} />
              <Field label="Téléphone (facultatif)" name="phone" type="tel" autoComplete="tel" defaultValue={user?.phone ?? ""} error={errors.phone} />
            </div>
            <Field label="E-mail" name="email" type="email" autoComplete="email" required defaultValue={user?.email} error={errors.email} />
            <TextArea label="Message" name="message" required maxLength={2000} error={errors.message} />
            {/* Champ invisible anti-robots */}
            <div aria-hidden className="absolute -left-[9999px]">
              <label>
                Site web <input name="website" tabIndex={-1} autoComplete="off" />
              </label>
            </div>
            <button type="submit" className="btn-primary w-full sm:w-auto" disabled={sending}>
              {sending && <Spinner />} Envoyer le message
            </button>
            <p className="text-xs text-charbon-muted">Vos coordonnées servent uniquement à vous répondre.</p>
          </form>
        )}
      </div>
    </div>
  );
}
