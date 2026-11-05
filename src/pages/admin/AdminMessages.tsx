import { EmptyState, FormError, PageLoader } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { api, errorMessage } from "../../lib/api";
import { dateTime } from "../../lib/format";
import type { ContactMessage } from "../../lib/types";
import { useApi } from "../../lib/useApi";

export default function AdminMessages() {
  const { user } = useAuth();
  const toast = useToast();
  const { data, loading, error, reload, setData } = useApi<{ messages: ContactMessage[] }>("/admin/messages");

  async function toggle(m: ContactMessage) {
    try {
      const res = await api<{ message: ContactMessage }>(`/admin/messages/${m.id}`, { method: "PATCH", body: { handled: !m.handled } });
      setData((d) => (d ? { messages: d.messages.map((x) => (x.id === m.id ? res.message : x)) } : d));
    } catch (e) {
      toast(errorMessage(e), "error");
    }
  }

  async function remove(m: ContactMessage) {
    if (!confirm("Supprimer ce message ?")) return;
    try {
      await api(`/admin/messages/${m.id}`, { method: "DELETE" });
      toast("Message supprimé.", "info");
      reload();
    } catch (e) {
      toast(errorMessage(e), "error");
    }
  }

  if (loading && !data) return <PageLoader />;
  if (error) return <FormError message={error} />;
  if (!data?.messages.length) return <EmptyState title="Aucun message pour le moment." />;

  return (
    <ul className="space-y-4">
      {data.messages.map((m) => (
        <li key={m.id} className={`card p-5 ${m.handled ? "opacity-60" : "border-l-4 border-l-piment-dark"}`}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-medium">
              {m.name} · <a href={`mailto:${m.email}`} className="text-piment-dark">{m.email}</a>
              {m.phone && <> · <a href={`tel:${m.phone.replace(/[^+0-9]/g, "")}`} className="text-piment-dark">{m.phone}</a></>}
            </p>
            <p className="text-sm text-charbon-muted">{dateTime(m.createdAt)}</p>
          </div>
          <p className="mt-3 whitespace-pre-line leading-relaxed">{m.message}</p>
          <div className="mt-4 flex gap-4 text-sm">
            <button className="text-piment-dark underline" onClick={() => toggle(m)}>
              {m.handled ? "Marquer non traité" : "Marquer traité"}
            </button>
            {user?.role === "admin" && (
              <button className="text-charbon-muted underline" onClick={() => remove(m)}>
                Supprimer
              </button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
