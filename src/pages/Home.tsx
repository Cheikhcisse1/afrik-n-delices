import { Link } from "react-router-dom";
import { Photo, usePageMeta, useReveal } from "../components/ui";
import { DAYS, PHONE, PHONE_LINK, hours, longDate, price } from "../lib/format";
import type { Category, Location, Service } from "../lib/types";
import { useApi } from "../lib/useApi";

function NextService() {
  const { data, loading } = useApi<{ services: Service[]; today: string }>("/services");
  const next = data?.services[0];
  return (
    <div className="relative rounded-lg bg-creme p-5 text-charbon shadow-ticket">
      <span className="absolute -left-2 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-charbon" aria-hidden />
      <span className="absolute -right-2 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-charbon" aria-hidden />
      <p className="eyebrow">Prochain passage</p>
      {loading ? (
        <p className="mt-2 h-12 animate-pulse rounded bg-charbon/5" />
      ) : next ? (
        <>
          <p className="mt-1 font-display text-2xl font-bold first-letter:uppercase">
            {next.date === data?.today ? "Aujourd’hui" : longDate(next.date)}
          </p>
          <p className="mt-1 text-sm">
            {next.location.name}
            {hours(next.location.startTime, next.location.endTime) && <> · {hours(next.location.startTime, next.location.endTime)}</>}
          </p>
        </>
      ) : (
        <p className="mt-2 text-sm">
          Appelez le <a href={PHONE_LINK} className="font-semibold text-piment-dark">{PHONE}</a> pour connaître le prochain passage.
        </p>
      )}
    </div>
  );
}

function Hero() {
  return (
    <section className="grain relative overflow-hidden bg-charbon text-creme">
      <div className="lg:grid lg:min-h-[640px] lg:grid-cols-[1.05fr_1fr]">
        <div className="relative h-72 sm:h-96 lg:order-2 lg:h-auto">
          <Photo
            name="accueil-sourire"
            eager
            sizes="(min-width: 1024px) 50vw, 100vw"
            alt="La cuisinière d’Afrik’N’Délices sourit derrière le comptoir du camion, devant les barquettes du jour."
            className="absolute inset-0 h-full w-full object-cover object-[80%_center] lg:object-[60%_center]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-charbon via-charbon/10 to-transparent lg:bg-gradient-to-r lg:from-charbon lg:via-transparent" />
        </div>
        <div className="container-x relative -mt-16 pb-14 lg:mx-0 lg:mt-0 lg:flex lg:max-w-none lg:flex-col lg:justify-center lg:py-20 lg:pl-[max(1.5rem,calc((100vw-72rem)/2+1.5rem))] lg:pr-12">
          <p className="animate-rise font-board text-sm uppercase tracking-[0.3em] text-safran">Food truck · Champigny-sur-Marne</p>
          <h1 className="mt-4 animate-rise text-[2.6rem] font-extrabold leading-[1.02] [animation-delay:80ms] sm:text-6xl lg:text-[4.2rem]">
            Thiep, yassa
            <br />
            &amp; poulet braisé,
            <br />
            <span className="text-safran">servis au camion.</span>
          </h1>
          <p className="mt-6 max-w-md animate-rise text-lg leading-relaxed text-creme/80 [animation-delay:160ms]">
            Commandez en ligne, choisissez votre passage, récupérez votre barquette encore chaude. Titres-restaurant acceptés.
          </p>
          <div className="mt-8 flex animate-rise flex-wrap gap-3 [animation-delay:240ms]">
            <Link to="/carte" className="btn-primary">
              Voir la carte et commander
            </Link>
            <a href={PHONE_LINK} className="btn border border-creme/30 text-creme hover:bg-creme/10">
              {PHONE}
            </a>
          </div>
          <div className="mt-10 max-w-sm animate-rise [animation-delay:320ms]">
            <NextService />
          </div>
        </div>
      </div>
    </section>
  );
}

function Board() {
  const { data } = useApi<{ categories: Category[] }>("/menu");
  const ref = useReveal<HTMLDivElement>();
  const featured = data?.categories.filter((c) => c.items.length).slice(0, 2) ?? [];
  return (
    <section className="container-x py-20" ref={ref}>
      <div className="grid items-start gap-12 lg:grid-cols-[1fr_1.15fr]">
        <div className="reveal">
          <p className="eyebrow">L’ardoise</p>
          <h2 className="mt-3 text-4xl font-bold leading-tight sm:text-5xl">Des prix ronds, comme sur l’ardoise du camion.</h2>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-charbon-muted">
            La barquette de thiep ou de yassa est à 7 €, le poulet entier à 10 €, les pastels à 1 €. Côté boissons : bissap, gingembre et dégué à 2 €.
          </p>
          <Link to="/carte" className="btn-ghost mt-8">
            Toute la carte
          </Link>
        </div>
        <div className="reveal grain rounded-2xl bg-bordeaux p-6 text-creme shadow-ticket sm:p-9">
          {featured.length === 0 ? (
            <div className="space-y-4" aria-hidden>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-6 animate-pulse rounded bg-creme/10" />
              ))}
            </div>
          ) : (
            featured.map((cat) => (
              <div key={cat.id} className="mb-8 last:mb-0">
                <h3 className="font-board text-sm uppercase tracking-[0.25em] text-safran">{cat.name}</h3>
                <ul className="mt-3 space-y-2.5">
                  {cat.items.slice(0, 5).map((item) => (
                    <li key={item.id} className={`flex items-end font-board text-lg sm:text-xl ${item.available ? "" : "opacity-50"}`}>
                      <span>{item.name}</span>
                      <span className="leader" aria-hidden />
                      <span className="text-safran-light">{price(item.priceCents)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

function Steps() {
  const ref = useReveal<HTMLDivElement>();
  const steps = [
    { n: "1", title: "Composez", text: "Choisissez vos plats sur la carte en ligne. Les prix sont ceux du camion." },
    { n: "2", title: "Choisissez le passage", text: "Mardi ou jeudi à la gare Les Boullereaux, mercredi au marché de Champigny." },
    { n: "3", title: "Retirez et payez", text: "Donnez votre numéro de commande au comptoir. Espèces, carte ou titres-restaurant." },
  ];
  return (
    <section className="bg-creme-dark/60 py-20" ref={ref}>
      <div className="container-x">
        <p className="eyebrow reveal">Commande à emporter</p>
        <h2 className="reveal mt-3 max-w-xl text-4xl font-bold leading-tight">Pas de file d’attente pour votre barquette.</h2>
        <ol className="mt-12 grid gap-6 md:grid-cols-3">
          {steps.map((s) => (
            <li key={s.n} className="reveal card p-6">
              <span className="font-display text-5xl font-extrabold text-piment">{s.n}</span>
              <h3 className="mt-3 text-xl font-bold">{s.title}</h3>
              <p className="mt-2 leading-relaxed text-charbon-muted">{s.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Behind() {
  const ref = useReveal<HTMLDivElement>();
  return (
    <section className="container-x py-24" ref={ref}>
      <div className="grid gap-4 sm:grid-cols-6 sm:grid-rows-2">
        <div className="reveal overflow-hidden rounded-xl sm:col-span-4 sm:row-span-2">
          <Photo name="equipe-camion" sizes="(min-width: 640px) 66vw, 100vw" alt="L’équipe au travail dans le camion, derrière le panneau de la carte." className="h-full min-h-[280px] w-full object-cover transition duration-700 hover:scale-[1.02]" />
        </div>
        <div className="reveal overflow-hidden rounded-xl sm:col-span-2">
          <Photo name="cuisine-friteuse" sizes="(min-width: 640px) 33vw, 100vw" alt="En cuisine, le poulet grille pendant la préparation des commandes." className="h-56 w-full object-cover sm:h-full" />
        </div>
        <div className="reveal overflow-hidden rounded-xl sm:col-span-2">
          <Photo name="barquettes-comptoir" sizes="(min-width: 640px) 33vw, 100vw" alt="Barquettes de thiep, de yassa et de riz prêtes sur le comptoir." className="h-56 w-full object-cover sm:h-full" />
        </div>
      </div>
      <div className="reveal mt-12 grid gap-8 md:grid-cols-2">
        <h2 className="text-4xl font-bold leading-tight">Derrière le comptoir rouge.</h2>
        <p className="text-lg leading-relaxed text-charbon-muted">
          Le poulet passe au grill pendant que les barquettes attendent au chaud sur le comptoir. Ce que vous voyez sur la carte, c’est ce qui sort du camion ce jour-là — quand un plat est épuisé, il est indiqué en ligne.
        </p>
      </div>
    </section>
  );
}

function Week() {
  const { data } = useApi<{ locations: Location[] }>("/locations");
  const ref = useReveal<HTMLDivElement>();
  return (
    <section className="grain bg-piment-dark py-20 text-creme" ref={ref}>
      <div className="container-x">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="reveal">
            <p className="font-board text-[13px] uppercase tracking-[0.22em] text-safran-light">La semaine du camion</p>
            <h2 className="mt-3 text-4xl font-bold">Où nous trouver</h2>
          </div>
          <Link to="/ou-nous-trouver" className="btn-light reveal">
            Plan et horaires
          </Link>
        </div>
        <ul className="mt-10 grid gap-4 md:grid-cols-3">
          {(data?.locations ?? []).map((l) => (
            <li key={l.id} className="reveal rounded-xl border border-creme/20 bg-bordeaux/40 p-6">
              <p className="font-board text-3xl uppercase tracking-wide text-safran-light">{DAYS[l.dayOfWeek]}</p>
              <p className="mt-2 text-lg font-medium">{l.name}</p>
              <p className="mt-1 text-sm text-creme/70">{hours(l.startTime, l.endTime) ?? "Horaires au " + PHONE}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export default function Home() {
  usePageMeta(
    "Afrik'N'Délices by Diallo — Food truck africain à Champigny-sur-Marne",
    "Thiep, yassa, poulet braisé, pastels, bissap, gingembre et dégué. Mardi et jeudi gare Les Boullereaux, mercredi marché de Champigny. Commandez en ligne, retirez au camion.",
  );
  return (
    <>
      <Hero />
      <Board />
      <Behind />
      <Steps />
      <Week />
    </>
  );
}
