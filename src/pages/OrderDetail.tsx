import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { OrderTicket } from "../components/OrderTicket";
import { FormError, PageLoader, Spinner, usePageMeta } from "../components/ui";
import { useToast } from "../context/ToastContext";
import { api, errorMessage } from "../lib/api";
import { PHONE, PHONE_LINK } from "../lib/format";
import type { Order } from "../lib/types";
import { useApi } from "../lib/useApi";

export default function OrderDetail() {
  const { id } = useParams();
  const [params] = useSearchParams();
  usePageMeta(`Commande n° ${id}`);
  const toast = useToast();
  const { data, error, loading, reload, setData } = useApi<{ order: Order }>(`/orders/${id}`);
  const [cancelling, setCancelling] = useState(false);
  const order = data?.order;

  // Suivi en direct : rafraîchit toutes les 30 s tant que la commande n'est pas terminée
  useEffect(() => {
    if (!order || ["collected", "cancelled"].includes(order.status)) return;
    const t = setInterval(reload, 30000);
    return () => clearInterval(t);
  }, [order, reload]);

  async function cancel() {
    if (!order || !confirm("Annuler cette commande ?")) return;
    setCancelling(true);
    try {
      const res = await api<{ order: Order }>(`/orders/${order.id}/cancel`, { method: "POST", body: {} });
      setData(res);
      toast("Commande annulée.", "info");
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="container-x max-w-2xl py-14">
      <Link to="/compte#commandes" className="text-sm font-medium text-piment-dark underline underline-offset-4">
        ← Mes commandes
      </Link>
      {params.get("nouvelle") && order && (
        <div className="mt-6 animate-rise rounded-xl bg-feuille px-6 py-5 text-creme">
          <p className="font-display text-2xl font-bold">C’est noté !</p>
          <p className="mt-1">Présentez le numéro {order.id} au comptoir. Vous pouvez suivre l’avancement ici.</p>
        </div>
      )}
      <div className="mt-6">
        {loading && !order ? (
          <PageLoader />
        ) : error ? (
          <FormError message={error} />
        ) : order ? (
          <>
            <OrderTicket order={order} />
            <div className="mt-6 flex flex-wrap items-center gap-4">
              {order.status === "received" && (
                <button onClick={cancel} disabled={cancelling} className="btn-ghost">
                  {cancelling && <Spinner />} Annuler la commande
                </button>
              )}
              <p className="text-sm text-charbon-muted">
                Un changement ? Appelez le <a href={PHONE_LINK} className="font-semibold text-piment-dark">{PHONE}</a>.
              </p>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
