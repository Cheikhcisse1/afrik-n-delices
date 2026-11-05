import { NavLink, Route, Routes } from "react-router-dom";
import { usePageMeta } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { price } from "../../lib/format";
import { useApi } from "../../lib/useApi";
import AdminLocations from "./AdminLocations";
import AdminMenu from "./AdminMenu";
import AdminMessages from "./AdminMessages";
import AdminOrders from "./AdminOrders";
import AdminUsers from "./AdminUsers";

interface Stats {
  ordersToday: number;
  revenueTodayCents: number;
  ordersPending: number;
  messagesUnread: number;
  usersTotal: number;
}

export default function Admin() {
  usePageMeta("Espace équipe");
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { data: stats } = useApi<Stats>("/admin/stats");

  const tabs = [
    { to: "/admin", label: "Commandes", end: true },
    { to: "/admin/carte", label: "Carte" },
    { to: "/admin/messages", label: `Messages${stats?.messagesUnread ? ` (${stats.messagesUnread})` : ""}` },
    ...(isAdmin
      ? [
          { to: "/admin/emplacements", label: "Emplacements" },
          { to: "/admin/utilisateurs", label: "Utilisateurs" },
        ]
      : []),
  ];

  return (
    <div className="container-x py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Espace équipe · {isAdmin ? "administrateur" : "équipe"}</p>
          <h1 className="mt-2 text-4xl font-extrabold">Le camion, côté coulisses</h1>
        </div>
        {stats && (
          <dl className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg bg-white px-4 py-2 shadow-ticket">
              <dt className="text-xs text-charbon-muted">Aujourd’hui</dt>
              <dd className="font-board text-2xl">{stats.ordersToday}</dd>
            </div>
            <div className="rounded-lg bg-white px-4 py-2 shadow-ticket">
              <dt className="text-xs text-charbon-muted">À traiter</dt>
              <dd className="font-board text-2xl text-piment-dark">{stats.ordersPending}</dd>
            </div>
            <div className="rounded-lg bg-white px-4 py-2 shadow-ticket">
              <dt className="text-xs text-charbon-muted">CA du jour</dt>
              <dd className="font-board text-2xl">{price(stats.revenueTodayCents)}</dd>
            </div>
          </dl>
        )}
      </div>
      <nav className="mt-8 flex gap-1 overflow-x-auto overflow-y-hidden border-b border-charbon/15" aria-label="Sections de l’espace équipe">
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) =>
              `-mb-px whitespace-nowrap border-b-2 px-4 py-3 font-board text-sm uppercase tracking-wider transition ${
                isActive ? "border-piment-dark text-piment-dark" : "border-transparent text-charbon-muted hover:text-charbon"
              }`
            }
          >
            {t.label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-8">
        <Routes>
          <Route index element={<AdminOrders />} />
          <Route path="carte" element={<AdminMenu />} />
          <Route path="messages" element={<AdminMessages />} />
          {isAdmin && <Route path="emplacements" element={<AdminLocations />} />}
          {isAdmin && <Route path="utilisateurs" element={<AdminUsers />} />}
          <Route path="*" element={<p className="text-charbon-muted">Section introuvable ou réservée à l’administrateur.</p>} />
        </Routes>
      </div>
    </div>
  );
}
