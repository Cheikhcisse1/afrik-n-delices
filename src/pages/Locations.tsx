import { EmptyState, PageLoader, usePageMeta } from "../components/ui";
import { DAYS, PHONE, PHONE_LINK, hours, longDate, mapsLink } from "../lib/format";
import type { Location, Service } from "../lib/types";
import { useApi } from "../lib/useApi";

export default function Locations() {
  usePageMeta(
    "Où nous trouver",
    "Le food truck Afrik'N'Délices by Diallo : mardi et jeudi à la gare Les Boullereaux-Champigny, mercredi au marché de Champigny-sur-Marne.",
  );
  const locs = useApi<{ locations: Location[] }>("/locations");
  const services = useApi<{ services: Service[]; today: string }>("/services");

  return (
    <div className="container-x py-14">
      <p className="eyebrow">La semaine du camion</p>
      <h1 className="mt-3 text-5xl font-extrabold">Où nous trouver</h1>
      <p className="mt-4 max-w-xl text-lg text-charbon-muted">
        Le camion change de place selon le jour. En cas de doute (météo, jour férié), un appel au{" "}
        <a href={PHONE_LINK} className="font-semibold text-piment-dark">{PHONE}</a> suffit.
      </p>

      {locs.loading ? (
        <PageLoader />
      ) : !locs.data?.locations.length ? (
        <EmptyState title="Aucun emplacement publié pour le moment." />
      ) : (
        <ul className="mt-10 grid gap-5 md:grid-cols-3">
          {locs.data.locations.map((l) => (
            <li key={l.id} className="card flex flex-col p-6">
              <p className="font-board text-3xl uppercase tracking-wide text-piment-dark">{DAYS[l.dayOfWeek]}</p>
              <h2 className="mt-2 text-xl font-bold">{l.name}</h2>
              <p className="mt-1 text-charbon-muted">{l.address}</p>
              <p className="mt-3 text-sm">
                <span className="font-medium">Horaires : </span>
                {hours(l.startTime, l.endTime) ?? <>à confirmer au <a href={PHONE_LINK} className="text-piment-dark">{PHONE}</a></>}
              </p>
              {l.notes && <p className="mt-2 text-sm text-charbon-muted">{l.notes}</p>}
              <a href={mapsLink(l.address)} target="_blank" rel="noopener noreferrer" className="btn-ghost btn-sm mt-auto self-start pt-2">
                Itinéraire ↗
              </a>
            </li>
          ))}
        </ul>
      )}

      <section className="mt-16">
        <h2 className="text-3xl font-bold">Les 2 prochaines semaines</h2>
        {services.loading ? (
          <PageLoader />
        ) : (
          <ul className="mt-6 divide-y divide-charbon/10 rounded-xl border border-charbon/10 bg-white">
            {(services.data?.services ?? []).map((s) => (
              <li key={`${s.date}-${s.location.id}`} className="flex flex-wrap items-center justify-between gap-2 px-5 py-4">
                <span className="font-medium first-letter:uppercase">
                  {s.date === services.data?.today ? "Aujourd’hui" : longDate(s.date)}
                </span>
                <span className="text-charbon-muted">
                  {s.location.name}
                  {hours(s.location.startTime, s.location.endTime) && ` · ${hours(s.location.startTime, s.location.endTime)}`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
