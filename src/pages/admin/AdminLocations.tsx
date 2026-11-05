import { useState, type FormEvent } from "react";
import { EmptyState, Field, FormError, PageLoader, Spinner } from "../../components/ui";
import { useToast } from "../../context/ToastContext";
import { ApiError, api, errorMessage } from "../../lib/api";
import { DAYS, hours } from "../../lib/format";
import type { Location } from "../../lib/types";
import { useApi } from "../../lib/useApi";
import { Modal } from "./Modal";

function LocationForm({ location, onDone }: { location?: Location; onDone: () => void }) {
  const toast = useToast();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const payload = {
      name: String(f.get("name") ?? ""),
      address: String(f.get("address") ?? ""),
      dayOfWeek: Number(f.get("dayOfWeek")),
      startTime: String(f.get("startTime") ?? ""),
      endTime: String(f.get("endTime") ?? ""),
      notes: String(f.get("notes") ?? ""),
      active: f.get("active") === "on",
    };
    setSending(true);
    setErrors({});
    setFormError(null);
    try {
      if (location) await api(`/admin/locations/${location.id}`, { method: "PUT", body: payload });
      else await api("/admin/locations", { body: payload });
      toast("Emplacement enregistré.");
      onDone();
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
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <FormError message={formError} />
      <Field label="Nom" name="name" defaultValue={location?.name} error={errors.name} required />
      <Field label="Adresse" name="address" defaultValue={location?.address} error={errors.address} required />
      <div>
        <label htmlFor="f-dayOfWeek" className="label">
          Jour
        </label>
        <select id="f-dayOfWeek" name="dayOfWeek" className="input" defaultValue={location?.dayOfWeek ?? 2}>
          {[1, 2, 3, 4, 5, 6, 0].map((d) => (
            <option key={d} value={d}>
              {DAYS[d]}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Début" name="startTime" type="time" defaultValue={location?.startTime ?? ""} error={errors.startTime} />
        <Field label="Fin" name="endTime" type="time" defaultValue={location?.endTime ?? ""} error={errors.endTime} />
      </div>
      <Field label="Note (facultatif)" name="notes" defaultValue={location?.notes ?? ""} error={errors.notes} placeholder="Ex. : devant la sortie côté parking" />
      <label className="flex items-center gap-3">
        <input type="checkbox" name="active" defaultChecked={location?.active ?? true} className="h-4 w-4 accent-piment-dark" />
        Actif (visible et ouvert à la commande)
      </label>
      <button className="btn-primary w-full" disabled={sending}>
        {sending && <Spinner />} Enregistrer
      </button>
    </form>
  );
}

export default function AdminLocations() {
  const toast = useToast();
  const { data, loading, error, reload } = useApi<{ locations: Location[] }>("/admin/locations");
  const [dialog, setDialog] = useState<{ location?: Location } | null>(null);

  async function remove(l: Location) {
    if (!confirm(`Supprimer « ${l.name} » du ${DAYS[l.dayOfWeek].toLowerCase()} ?`)) return;
    try {
      await api(`/admin/locations/${l.id}`, { method: "DELETE" });
      toast("Emplacement supprimé.", "info");
      reload();
    } catch (e) {
      toast(errorMessage(e), "error");
    }
  }

  if (loading && !data) return <PageLoader />;
  if (error) return <FormError message={error} />;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-charbon-muted">Un emplacement par jour de passage. Les horaires servent à proposer les créneaux de retrait.</p>
        <button className="btn-primary btn-sm" onClick={() => setDialog({})}>
          + Emplacement
        </button>
      </div>
      {!data?.locations.length ? (
        <div className="mt-6">
          <EmptyState title="Aucun emplacement." />
        </div>
      ) : (
        <ul className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.locations.map((l) => (
            <li key={l.id} className={`card p-5 ${l.active ? "" : "opacity-60"}`}>
              <p className="font-board text-2xl uppercase text-piment-dark">{DAYS[l.dayOfWeek]}</p>
              <p className="mt-1 font-medium">{l.name}</p>
              <p className="text-sm text-charbon-muted">{l.address}</p>
              <p className="mt-2 text-sm">{hours(l.startTime, l.endTime) ?? <span className="text-piment-dark">Horaires non renseignés</span>}</p>
              {!l.active && <p className="mt-1 text-sm font-medium">Désactivé</p>}
              <div className="mt-4 flex gap-4 text-sm">
                <button className="text-piment-dark underline" onClick={() => setDialog({ location: l })}>
                  Modifier
                </button>
                <button className="text-charbon-muted underline" onClick={() => remove(l)}>
                  Supprimer
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {dialog && (
        <Modal title={dialog.location ? "Modifier l’emplacement" : "Nouvel emplacement"} onClose={() => setDialog(null)}>
          <LocationForm
            location={dialog.location}
            onDone={() => {
              setDialog(null);
              reload();
            }}
          />
        </Modal>
      )}
    </div>
  );
}
