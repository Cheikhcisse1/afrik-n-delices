import { Link } from "react-router-dom";
import { EmptyState, FormError, PageLoader, Photo, usePageMeta } from "../components/ui";
import { useCart } from "../context/CartContext";
import { useToast } from "../context/ToastContext";
import { price } from "../lib/format";
import type { Category, MenuItem } from "../lib/types";
import { useApi } from "../lib/useApi";

function ItemRow({ item }: { item: MenuItem }) {
  const { add, lines } = useCart();
  const toast = useToast();
  const inCart = lines.find((l) => l.menuItemId === item.id)?.quantity ?? 0;
  return (
    <li className={`group flex gap-4 border-b border-charbon/10 py-5 last:border-0 ${item.available ? "" : "opacity-60"}`}>
      {item.imageUrl && (
        <img src={item.imageUrl} alt="" loading="lazy" className="h-20 w-20 shrink-0 rounded-lg object-cover" />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-end">
          <h3 className="font-board text-xl font-medium tracking-wide">{item.name}</h3>
          <span className="leader text-charbon" aria-hidden />
          <span className="font-board text-xl font-medium text-piment-dark">{price(item.priceCents)}</span>
        </div>
        {item.description && <p className="mt-1 text-[15px] leading-relaxed text-charbon-muted">{item.description}</p>}
        <div className="mt-3 flex items-center gap-3">
          {item.available ? (
            <button
              type="button"
              onClick={() => {
                add(item);
                toast(`${item.name} ajouté au panier`);
              }}
              className="btn-ghost btn-sm"
            >
              + Ajouter
            </button>
          ) : (
            <span className="rounded bg-charbon/10 px-2 py-1 font-board text-xs uppercase tracking-wider text-charbon-muted">Épuisé aujourd’hui</span>
          )}
          {inCart > 0 && <span className="text-sm text-feuille">{inCart} dans le panier</span>}
        </div>
      </div>
    </li>
  );
}

function CartBar() {
  const { count, totalCents } = useCart();
  if (count === 0) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-charbon/10 bg-white/95 backdrop-blur">
      <div className="container-x flex items-center justify-between gap-4 py-3">
        <p className="text-sm">
          <span className="font-semibold">{count} article{count > 1 ? "s" : ""}</span>
          <span className="text-charbon-muted"> · {price(totalCents)}</span>
        </p>
        <Link to="/commander" className="btn-primary btn-sm">
          Voir le panier
        </Link>
      </div>
    </div>
  );
}

export default function Menu() {
  usePageMeta(
    "La carte",
    "Barquette thiep ou yassa 7 €, poulet entier 10 €, demi poulet 5 €, ailes, pilons, brochettes, banane plantain, pastels, samoussas, nems, bissap, gingembre, dégué.",
  );
  const { data, loading, error, reload } = useApi<{ categories: Category[] }>("/menu");
  const categories = data?.categories.filter((c) => c.items.length > 0) ?? [];

  return (
    <div className="pb-24">
      <section className="grain relative overflow-hidden bg-bordeaux text-creme">
        <Photo name="carte-camion" alt="" className="absolute inset-0 h-full w-full object-cover opacity-15" />
        <div className="container-x relative py-16 sm:py-20">
          <p className="font-board text-sm uppercase tracking-[0.3em] text-safran">Afrik’N’Délices by Diallo</p>
          <h1 className="mt-3 text-5xl font-extrabold sm:text-6xl">La carte</h1>
          <p className="mt-4 max-w-lg text-lg text-creme/80">Ajoutez vos plats au panier puis choisissez le jour de retrait. Paiement au camion.</p>
        </div>
      </section>

      <div className="container-x mt-10 lg:grid lg:grid-cols-[200px_1fr] lg:gap-14">
        {categories.length > 0 && (
          <nav aria-label="Catégories" className="sticky top-16 z-20 -mx-4 mb-6 overflow-x-auto bg-creme/95 px-4 py-3 backdrop-blur lg:top-24 lg:mx-0 lg:mb-0 lg:self-start lg:bg-transparent lg:p-0">
            <ul className="flex gap-2 lg:flex-col lg:gap-1">
              {categories.map((c) => (
                <li key={c.id}>
                  <a href={`#cat-${c.id}`} className="block whitespace-nowrap rounded-md px-3 py-2 font-board text-sm uppercase tracking-wider text-charbon hover:bg-charbon/5 hover:text-piment-dark">
                    {c.name}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}
        <div>
          {loading && !data ? (
            <PageLoader />
          ) : error ? (
            <div className="space-y-4">
              <FormError message={error} />
              <button className="btn-ghost" onClick={reload}>
                Réessayer
              </button>
            </div>
          ) : categories.length === 0 ? (
            <EmptyState title="La carte est en cours de mise à jour." />
          ) : (
            categories.map((c) => (
              <section key={c.id} id={`cat-${c.id}`} className="mb-12 scroll-mt-32">
                <h2 className="border-b-2 border-charbon pb-2 text-3xl font-bold">{c.name}</h2>
                <ul>
                  {c.items.map((item) => (
                    <ItemRow key={item.id} item={item} />
                  ))}
                </ul>
              </section>
            ))
          )}
          <p className="mt-6 rounded-lg bg-safran/15 px-4 py-3 text-sm text-bordeaux">
            Titres-restaurant acceptés. Une question sur un plat ou une commande de groupe ? <Link to="/contact" className="font-semibold underline">Écrivez-nous</Link>.
          </p>
        </div>
      </div>
      <CartBar />
    </div>
  );
}
