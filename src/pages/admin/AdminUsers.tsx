import { useEffect, useState } from "react";
import { EmptyState, FormError, PageLoader } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { api, errorMessage } from "../../lib/api";
import { dateTime } from "../../lib/format";
import type { Role, User } from "../../lib/types";
import { useApi } from "../../lib/useApi";

type Row = User & { orderCount: number };

const ROLE_LABEL: Record<Role, string> = { client: "Client", staff: "Équipe", admin: "Administrateur" };

export default function AdminUsers() {
  const { user: me } = useAuth();
  const toast = useToast();
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setQuery(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);
  const { data, loading, error, setData } = useApi<{ users: Row[] }>(`/admin/users${query ? `?q=${encodeURIComponent(query)}` : ""}`);

  async function setRole(u: Row, role: Role) {
    if (!confirm(`Donner le rôle « ${ROLE_LABEL[role]} » à ${u.fullName} ?`)) return;
    try {
      await api(`/admin/users/${u.id}/role`, { method: "PATCH", body: { role } });
      setData((d) => (d ? { users: d.users.map((x) => (x.id === u.id ? { ...x, role } : x)) } : d));
      toast("Rôle mis à jour. La personne devra se reconnecter.");
    } catch (e) {
      toast(errorMessage(e), "error");
    }
  }

  return (
    <div>
      <div className="max-w-sm">
        <label htmlFor="q" className="label">
          Rechercher
        </label>
        <input id="q" className="input" placeholder="Nom ou e-mail" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <p className="mt-3 text-sm text-charbon-muted">
        « Équipe » : gère les commandes, les messages et la disponibilité des plats. « Administrateur » : tout, y compris la carte, les emplacements et les rôles.
      </p>
      <div className="mt-6">
        {loading && !data ? (
          <PageLoader />
        ) : error ? (
          <FormError message={error} />
        ) : !data?.users.length ? (
          <EmptyState title="Aucun compte trouvé." />
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-charbon/10 font-board text-xs uppercase tracking-wider text-charbon-muted">
                <tr>
                  <th className="px-4 py-3">Nom</th>
                  <th className="px-4 py-3">E-mail</th>
                  <th className="px-4 py-3">Commandes</th>
                  <th className="px-4 py-3">Inscrit</th>
                  <th className="px-4 py-3">Rôle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-charbon/10">
                {data.users.map((u) => (
                  <tr key={u.id}>
                    <td className="px-4 py-3 font-medium">{u.fullName}</td>
                    <td className="px-4 py-3">{u.email}</td>
                    <td className="px-4 py-3">{u.orderCount}</td>
                    <td className="px-4 py-3 text-charbon-muted">{dateTime(u.createdAt)}</td>
                    <td className="px-4 py-3">
                      <select
                        aria-label={`Rôle de ${u.fullName}`}
                        className="input py-1.5"
                        value={u.role}
                        disabled={u.id === me?.id}
                        onChange={(e) => setRole(u, e.target.value as Role)}
                      >
                        {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
                          <option key={r} value={r}>
                            {ROLE_LABEL[r]}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
