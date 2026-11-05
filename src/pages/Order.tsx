import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { EmptyState, Field, FormError, PageLoader, Spinner, TextArea, usePageMeta } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useToast } from "../context/ToastContext";
import { ApiError, api } from "../lib/api";
import { PHONE, hours, longDate, price } from "../lib/format";
import type { Category, MenuItem, Order as OrderT, Service } from "../lib/types";
import { useApi } from "../lib/useApi";

/** Créneaux de 15 min entre début et fin du service ; après l'heure actuelle si c'est aujourd'hui. */
function slots(start: string | null, end: string | null, isToday: boolean): string[] {
  if (!start || !end) return [];
  const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
  const now = new Date();
  const nowParis = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(now);
  const min = isToday ? toMin(nowParis) + 20 : 0;
  const out: string[] = [];
  for (let m = toMin(start); m <= toMin(end); m += 15) {
    if (m < min) continue;
    out.push(`${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);
  }
  return out;
}

function Qty({ value, onChange, label }: { value: number; onChange: (n: number) => void; label: string }) {
  return (
    <div className="flex items-center rounded-md border border-charbon/20 bg-white" role="group" aria-label={`Quantité ${label}`}>
      <button type="button" className="h-9 w-9 text-lg hover:bg-charbon/5" onClick={() => onChange(value - 1)} aria-label="Retirer un">
        −
      </button>
      <span className="w-8 text-center font-board text-lg" aria-live="polite">
        {value}
      </span>
      <button type="button" className="h-9 w-9 text-lg hover:bg-charbon/5" onClick={() => onChange(value + 1)} aria-label="Ajouter un" disabled={value >= 50}>
        +
      </button>
    </div>
  );
}

export default function Order() {
  usePageMeta("Commander à emporter", "Commandez vos plats Afrik'N'Délices en ligne et retirez-les au camion.");
  const { user, loading: authLoading } = useAuth();
  const cart = useCart();
  const toast = useToast();
  const navigate = useNavigate();
  const menu = useApi<{ categories: Category[] }>("/menu");
  const services = useApi<{ services: Service[]; today: string }>("/services");

  const [serviceKey, setServiceKey] = useState("");
  const [time, setTime] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const menuById = useMemo(() => {
    const m = new Map<number, MenuItem>();
    menu.data?.categories.forEach((c) => c.items.forEach((i) => m.set(i.id, i)));
    return m;
  }, [menu.data]);

  // Prix et noms toujours ceux de la carte actuelle
  const lines = cart.lines.map((l) => {
    const item = menuById.get(l.menuItemId);
    return { ...l, name: item?.name ?? l.name, priceCents: item?.priceCents ?? l.priceCents, missing: menu.data ? !item : false, unavailable: item ? !item.available : false };
  });
  const total = lines.filter((l) => !l.missing && !l.unavailable).reduce((n, l) => n + l.priceCents * l.quantity, 0);
  const blocked = lines.some((l) => l.missing || l.unavailable);

  const list = services.data?.services ?? [];
  const selected = list.find((s) => `${s.date}|${s.location.id}` === serviceKey);
  const timeSlots = selected ? slots(selected.location.startTime, selected.location.endTime, selected.date === services.data?.today) : [];

  useEffect(() => {
    if (!serviceKey && list.length) setServiceKey(`${list[0].date}|${list[0].location.id}`);
  }, [list, serviceKey]);
  useEffect(() => setTime(""), [serviceKey]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selected) {
      setErrors({ pickupDate: "Choisissez un jour de retrait." });
      return;
    }
    const f = new FormData(e.currentTarget);
    setSending(true);
    setErrors({});
    setFormError(null);
    try {
      const { order } = await api<{ order: OrderT }>("/orders", {
        body: {
          locationId: selected.location.id,
          pickupDate: selected.date,
          pickupTime: time || null,
          phone: String(f.get("phone") ?? ""),
          note: String(f.get("note") ?? ""),
          items: lines.map((l) => ({ menuItemId: l.menuItemId, quantity: l.quantity })),
        },
      });
      cart.clear();
      toast(`Commande n° ${order.id} envoyée !`);
      navigate(`/compte/commandes/${order.id}?nouvelle=1`);
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.details);
        setFormError(err.message);
        if (err.status === 422) menu.reload();
      } else setFormError("Une erreur est survenue.");
    } finally {
      setSending(false);
    }
  }

  if (cart.lines.length === 0) {
    return (
      <div className="container-x py-20">
        <h1 className="text-4xl font-extrabold">Votre panier</h1>
        <div className="mt-8">
          <EmptyState title="Votre panier est vide.">
            <Link to="/carte" className="btn-primary mt-4">
              Voir la carte
            </Link>
          </EmptyState>
        </div>
      </div>
    );
  }

  return (
    <div className="container-x py-14">
      <p className="eyebrow">Commande à emporter</p>
      <h1 className="mt-3 text-4xl font-extrabold sm:text-5xl">Votre commande</h1>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1.1fr_1fr]">
        {/* Panier */}
        <section aria-labelledby="panier" className="card self-start p-6">
          <h2 id="panier" className="text-2xl font-bold">
            Panier
          </h2>
          <ul className="mt-4 divide-y divide-charbon/10">
            {lines.map((l) => (
              <li key={l.menuItemId} className="flex flex-wrap items-center gap-3 py-4">
                <div className="min-w-0 flex-1">
                  <p className="font-board text-lg">{l.name}</p>
                  <p className="text-sm text-charbon-muted">{price(l.priceCents)} l’unité</p>
                  {l.missing && <p className="text-sm text-piment-dark">Ce plat n’est plus à la carte.</p>}
                  {l.unavailable && <p className="text-sm text-piment-dark">Épuisé aujourd’hui.</p>}
                </div>
                <Qty value={l.quantity} label={l.name} onChange={(n) => cart.setQuantity(l.menuItemId, n)} />
                <p className="w-16 text-right font-board text-lg">{price(l.priceCents * l.quantity)}</p>
                <button type="button" onClick={() => cart.remove(l.menuItemId)} className="text-sm text-charbon-muted underline hover:text-piment-dark">
                  Retirer
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex items-center justify-between border-t-2 border-charbon pt-4">
            <span className="font-board text-lg uppercase tracking-wider">Total</span>
            <span className="font-display text-3xl font-bold">{price(total)}</span>
          </div>
          <p className="mt-2 text-sm text-charbon-muted">Paiement au camion : espèces, carte ou titres-restaurant.</p>
          <Link to="/carte" className="mt-4 inline-block text-sm font-medium text-piment-dark underline underline-offset-4">
            ← Ajouter d’autres plats
          </Link>
        </section>

        {/* Retrait */}
        <section aria-labelledby="retrait">
          <h2 id="retrait" className="text-2xl font-bold">
            Retrait au camion
          </h2>
          {authLoading || services.loading ? (
            <PageLoader />
          ) : !user ? (
            <div className="card mt-4 p-6">
              <p className="text-lg">Pour suivre votre commande, connectez-vous ou créez un compte (30 secondes).</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link to="/connexion?suite=/commander" className="btn-primary">
                  Se connecter
                </Link>
                <Link to="/inscription?suite=/commander" className="btn-ghost">
                  Créer un compte
                </Link>
              </div>
              <p className="mt-4 text-sm text-charbon-muted">Votre panier est conservé.</p>
            </div>
          ) : list.length === 0 ? (
            <div className="mt-4">
              <EmptyState title="Aucun passage du camion prévu prochainement.">Appelez le {PHONE} pour commander.</EmptyState>
            </div>
          ) : (
            <form onSubmit={onSubmit} noValidate className="mt-4 space-y-6">
              <FormError message={formError} />
              <fieldset>
                <legend className="label">Jour et lieu</legend>
                <div className="grid gap-2">
                  {list.slice(0, 8).map((s) => {
                    const key = `${s.date}|${s.location.id}`;
                    return (
                      <label
                        key={key}
                        className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition ${
                          serviceKey === key ? "border-piment-dark bg-piment/5 ring-1 ring-piment-dark" : "border-charbon/15 bg-white hover:border-charbon/40"
                        }`}
                      >
                        <input type="radio" name="service" value={key} checked={serviceKey === key} onChange={() => setServiceKey(key)} className="accent-piment-dark" />
                        <span className="flex-1">
                          <span className="block font-medium first-letter:uppercase">{s.date === services.data?.today ? "Aujourd’hui" : longDate(s.date)}</span>
                          <span className="text-sm text-charbon-muted">
                            {s.location.name}
                            {hours(s.location.startTime, s.location.endTime) && ` · ${hours(s.location.startTime, s.location.endTime)}`}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
                {errors.pickupDate && <p className="mt-1 text-sm text-piment-dark">{errors.pickupDate}</p>}
              </fieldset>

              {timeSlots.length > 0 && (
                <div>
                  <label htmlFor="f-time" className="label">
                    Heure de retrait souhaitée
                  </label>
                  <select id="f-time" value={time} onChange={(e) => setTime(e.target.value)} className={`input ${errors.pickupTime ? "input-error" : ""}`}>
                    <option value="">Dès que possible pendant le service</option>
                    {timeSlots.map((t) => (
                      <option key={t} value={t}>
                        {t.replace(":", "h")}
                      </option>
                    ))}
                  </select>
                  {errors.pickupTime && <p className="mt-1 text-sm text-piment-dark">{errors.pickupTime}</p>}
                </div>
              )}

              <Field
                label="Téléphone"
                name="phone"
                type="tel"
                autoComplete="tel"
                defaultValue={user.phone ?? ""}
                error={errors.phone}
                hint="Pour vous prévenir si un plat manque."
              />
              <TextArea label="Remarque (facultatif)" name="note" maxLength={300} placeholder="Ex. : sans piment, sauce à part…" error={errors.note} />

              <button type="submit" className="btn-primary w-full" disabled={sending || blocked || total === 0}>
                {sending && <Spinner />} Envoyer la commande · {price(total)}
              </button>
              {blocked && <p className="text-sm text-piment-dark">Retirez les plats indisponibles pour continuer.</p>}
            </form>
          )}
        </section>
      </div>
    </div>
  );
}
