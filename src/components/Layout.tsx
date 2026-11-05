import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useToast } from "../context/ToastContext";
import { PHONE, PHONE_LINK } from "../lib/format";
import { Logo } from "./Logo";

const NAV = [
  { to: "/carte", label: "La carte" },
  { to: "/ou-nous-trouver", label: "Où nous trouver" },
  { to: "/contact", label: "Contact" },
];

function CartButton() {
  const { count } = useCart();
  return (
    <Link
      to="/commander"
      className="relative inline-flex items-center gap-2 rounded-md bg-piment-dark px-3 py-2 font-board text-[13px] uppercase tracking-wider text-creme transition hover:bg-bordeaux"
      aria-label={`Panier, ${count} article${count > 1 ? "s" : ""}`}
    >
      <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M5 7h14l-1.2 11.1a2 2 0 0 1-2 1.9H8.2a2 2 0 0 1-2-1.9L5 7Z" />
        <path d="M9 7V5.5a3 3 0 0 1 6 0V7" />
      </svg>
      <span className="hidden sm:inline">Commander</span>
      {count > 0 && (
        <span className="grid h-5 min-w-5 place-items-center rounded-full bg-safran px-1 text-[11px] font-semibold text-charbon">{count}</span>
      )}
    </Link>
  );
}

function AccountMenu() {
  const { user, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  if (!user) {
    return (
      <Link to="/connexion" className="hidden font-board text-[13px] uppercase tracking-wider text-charbon hover:text-piment-dark sm:inline">
        Connexion
      </Link>
    );
  }
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex items-center gap-2 font-board text-[13px] uppercase tracking-wider text-charbon hover:text-piment-dark"
      >
        <span className="grid h-8 w-8 place-items-center rounded-full bg-bordeaux font-display text-sm normal-case text-creme">
          {user.fullName.charAt(0).toUpperCase()}
        </span>
        <span className="hidden max-w-[120px] truncate md:inline">{user.fullName.split(" ")[0]}</span>
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-50 w-56 animate-rise rounded-lg border border-charbon/10 bg-white py-2 shadow-ticket">
          <p className="truncate px-4 pb-2 text-xs text-charbon-muted">{user.email}</p>
          <Link onClick={() => setOpen(false)} to="/compte" className="block px-4 py-2 text-sm hover:bg-creme">
            Mon compte
          </Link>
          <Link onClick={() => setOpen(false)} to="/compte#commandes" className="block px-4 py-2 text-sm hover:bg-creme">
            Mes commandes
          </Link>
          {(user.role === "admin" || user.role === "staff") && (
            <Link onClick={() => setOpen(false)} to="/admin" className="block px-4 py-2 text-sm font-medium text-piment-dark hover:bg-creme">
              Espace équipe
            </Link>
          )}
          <button
            onClick={async () => {
              setOpen(false);
              await logout();
              toast("À bientôt !", "info");
              navigate("/");
            }}
            className="block w-full px-4 py-2 text-left text-sm hover:bg-creme"
          >
            Se déconnecter
          </button>
        </div>
      )}
    </div>
  );
}

function Header() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const { user } = useAuth();
  useEffect(() => setOpen(false), [pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-charbon/10 bg-creme/90 backdrop-blur supports-[backdrop-filter]:bg-creme/80">
      <div className="container-x flex h-16 items-center justify-between gap-4">
        <Link to="/" aria-label="Accueil Afrik'N'Délices">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-7 md:flex" aria-label="Navigation principale">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                `font-board text-[14px] uppercase tracking-wider transition ${isActive ? "text-piment-dark" : "text-charbon hover:text-piment-dark"}`
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="flex shrink-0 items-center gap-2 sm:gap-5">
          <AccountMenu />
          <CartButton />
          <button
            className="grid h-10 w-10 place-items-center rounded-md md:hidden"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-label="Menu"
          >
            <svg aria-hidden width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </div>
      {open && (
        <nav className="border-t border-charbon/10 bg-creme md:hidden" aria-label="Navigation mobile">
          <div className="container-x flex flex-col py-2">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} className="py-3 font-board text-lg uppercase tracking-wider">
                {n.label}
              </NavLink>
            ))}
            {!user && (
              <NavLink to="/connexion" className="py-3 font-board text-lg uppercase tracking-wider">
                Connexion / Inscription
              </NavLink>
            )}
            <a href={PHONE_LINK} className="py-3 font-board text-lg uppercase tracking-wider text-piment-dark">
              Appeler · {PHONE}
            </a>
          </div>
        </nav>
      )}
    </header>
  );
}

function Footer() {
  return (
    <footer className="grain mt-24 bg-charbon text-creme/80">
      <div className="container-x grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <Logo light />
          <p className="mt-4 max-w-sm text-sm leading-relaxed">
            Food truck de cuisine africaine à Champigny-sur-Marne. Thiep, yassa, poulet braisé, pastels et boissons, à emporter.
          </p>
          <p className="mt-4 inline-block rounded border border-safran/40 px-3 py-1 font-board text-xs uppercase tracking-widest text-safran">
            Titres-restaurant acceptés
          </p>
        </div>
        <div>
          <h2 className="font-board text-sm uppercase tracking-widest text-safran">Le camion</h2>
          <ul className="mt-4 space-y-2 text-sm">
            <li>Mardi &amp; jeudi · Gare Les Boullereaux</li>
            <li>Mercredi · Marché de Champigny</li>
            <li>
              <Link to="/ou-nous-trouver" className="underline decoration-safran/50 underline-offset-4 hover:text-creme">
                Horaires et plan
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h2 className="font-board text-sm uppercase tracking-widest text-safran">Nous joindre</h2>
          <ul className="mt-4 space-y-2 text-sm">
            <li>
              <a href={PHONE_LINK} className="font-board text-xl tracking-wide text-creme hover:text-safran">
                {PHONE}
              </a>
            </li>
            <li>
              <Link to="/contact" className="hover:text-creme">
                Écrire un message
              </Link>
            </li>
            <li>
              <Link to="/confidentialite" className="hover:text-creme">
                Données personnelles
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-creme/10">
        <p className="container-x py-5 text-xs text-creme/50">© {new Date().getFullYear()} Afrik’N’Délices by Diallo · Champigny-sur-Marne</p>
      </div>
    </footer>
  );
}

export function Layout() {
  const { pathname } = useLocation();
  useEffect(() => {
    if (!window.location.hash) window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#contenu" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2">
        Aller au contenu
      </a>
      <Header />
      <main id="contenu" className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
