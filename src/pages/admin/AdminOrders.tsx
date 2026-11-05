import { useEffect, useState } from "react";
import { StatusBadge } from "../../components/OrderTicket";
import { EmptyState, FormError, PageLoader } from "../../components/ui";
import { useToast } from "../../context/ToastContext";
import { api, errorMessage } from "../../lib/api";
import { STATUS_LABEL, dateTime, longDate, price } from "../../lib/format";
import type { Order, OrderStatus } from "../../lib/types";
import { useApi } from "../../lib/useApi";

const NEXT: Partial<Record<OrderStatus, { status: OrderStatus; label: string }>> = {
  received: { status: "preparing", label: "Lancer la préparation" },
  preparing: { status: "ready", label: "Marquer prête" },
  ready: { status: "collected", label: "Remise au client" },
};

function todayParis() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date());
}

export default function AdminOrders() {
  const toast = useToast();
  const [date, setDate] = useState(todayParis());
  const [status, setStatus] = useState("");
  const { data, loading, error, reload, setData } = useApi<{ date: string; orders: Order[] }>(
    `/admin/orders?date=${date}${status ? `&status=${status}` : ""}`,
  );
  const [busy, setBusy] = useState<number | null>(null);

  // Rafraîchissement automatique toutes les 30 s pendant le service
  useEffect(() => {
    const t = setInterval(reload, 30000);
    return () => clearInterval(t);
  }, [reload]);

  async function change(order: Order, next: OrderStatus) {
    if (next === "cancelled" && !confirm(`Annuler la commande n° ${order.id} ?`)) return;
    setBusy(order.id);
    try {
      const res = await api<{ order: Order }>(`/admin/orders/${order.id}`, { method: "PATCH", body: { status: next } });
      setData((d) => (d ? { ...d, orders: d.orders.map((o) => (o.id === order.id ? res.order : o)) } : d));
      toast(`Commande n° ${order.id} : ${STATUS_LABEL[next].toLowerCase()}`);
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(null);
    }
  }

  const orders = data?.orders ?? [];
  const active = orders.filter((o) => o.status !== "cancelled");
  const total = active.reduce((n, o) => n + o.totalCents, 0);

  return (
    <div>
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label htmlFor="d" className="label">
            Jour de retrait
          </label>
          <input id="d" type="date" className="input" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
        </div>
        <div>
          <label htmlFor="s" className="label">
            Statut
          </label>
          <select id="s" className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Tous</option>
            {Object.entries(STATUS_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <button className="btn-ghost btn-sm" onClick={reload}>
          Actualiser
        </button>
        <p className="ml-auto text-sm text-charbon-muted">
          <span className="inline-block first-letter:uppercase">{longDate(date)}</span> · {active.length} commande{active.length > 1 ? "s" : ""} · {price(total)}
        </p>
      </div>

      <div className="mt-6">
        {loading && !data ? (
          <PageLoader />
        ) : error ? (
          <FormError message={error} />
        ) : orders.length === 0 ? (
          <EmptyState title="Aucune commande pour ce jour." />
        ) : (
          <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {orders.map((o) => (
              <li key={o.id} className={`card flex flex-col p-5 ${o.status === "cancelled" || o.status === "collected" ? "opacity-60" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-3xl font-extrabold leading-none">n° {o.id}</p>
                    <p className="mt-1 text-sm text-charbon-muted">
                      {o.pickupTime ? `vers ${o.pickupTime.replace(":", "h")}` : "dès que possible"} · {o.locationName}
                    </p>
                  </div>
                  <StatusBadge status={o.status} />
                </div>
                <ul className="mt-4 space-y-1 font-board text-lg">
                  {o.items.map((i, k) => (
                    <li key={k}>
                      <span className="text-piment-dark">{i.quantity} ×</span> {i.name}
                    </li>
                  ))}
                </ul>
                {o.note && <p className="mt-2 rounded bg-safran/15 px-3 py-2 text-sm">« {o.note} »</p>}
                <div className="mt-4 border-t border-dashed border-charbon/20 pt-3 text-sm">
                  <p className="font-medium">{o.customerName}</p>
                  {o.customerPhone && (
                    <a href={`tel:${o.customerPhone.replace(/[^+0-9]/g, "")}`} className="text-piment-dark">
                      {o.customerPhone}
                    </a>
                  )}
                  <p className="text-charbon-muted">
                    {price(o.totalCents)} · passée {dateTime(o.createdAt)}
                  </p>
                </div>
                <div className="mt-auto flex flex-wrap gap-2 pt-4">
                  {NEXT[o.status] && (
                    <button className="btn-primary btn-sm" disabled={busy === o.id} onClick={() => change(o, NEXT[o.status]!.status)}>
                      {NEXT[o.status]!.label}
                    </button>
                  )}
                  {!["cancelled", "collected"].includes(o.status) && (
                    <button className="btn-ghost btn-sm" disabled={busy === o.id} onClick={() => change(o, "cancelled")}>
                      Annuler
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
