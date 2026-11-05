import { STATUS_LABEL, STATUS_STYLE, dateTime, longDate, price } from "../lib/format";
import type { Order } from "../lib/types";

export function StatusBadge({ status }: { status: Order["status"] }) {
  return (
    <span className={`inline-block rounded-full px-3 py-1 font-board text-xs uppercase tracking-wider ${STATUS_STYLE[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

const STEPS: Order["status"][] = ["received", "preparing", "ready", "collected"];

export function StatusTrack({ status }: { status: Order["status"] }) {
  if (status === "cancelled") return null;
  const current = STEPS.indexOf(status);
  return (
    <ol className="grid grid-cols-4 gap-2" aria-label="Suivi de la commande">
      {STEPS.map((s, i) => (
        <li key={s} className="text-center">
          <span className={`block h-1.5 rounded-full transition-colors duration-500 ${i <= current ? "bg-piment-dark" : "bg-charbon/10"}`} />
          <span className={`mt-2 block text-[11px] sm:text-xs ${i === current ? "font-semibold text-charbon" : "text-charbon-muted"}`}>{STATUS_LABEL[s]}</span>
        </li>
      ))}
    </ol>
  );
}

/** Ticket de commande, façon ticket de caisse. */
export function OrderTicket({ order }: { order: Order }) {
  return (
    <div className="card overflow-hidden">
      <div className="flex items-start justify-between gap-4 border-b border-dashed border-charbon/20 p-6">
        <div>
          <p className="eyebrow">Commande</p>
          <p className="font-display text-5xl font-extrabold leading-none">n° {order.id}</p>
          <p className="mt-2 text-sm text-charbon-muted">Passée le {dateTime(order.createdAt)}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>
      <div className="space-y-5 p-6">
        <StatusTrack status={order.status} />
        <div className="rounded-lg bg-creme p-4">
          <p className="font-medium">
            Retrait le {longDate(order.pickupDate)}
            {order.pickupTime && ` vers ${order.pickupTime.replace(":", "h")}`}
          </p>
          <p className="text-sm text-charbon-muted">
            {order.locationName} — {order.locationAddress}
          </p>
        </div>
        <ul className="divide-y divide-charbon/10">
          {order.items.map((i, k) => (
            <li key={k} className="flex items-end py-2 font-board text-lg">
              <span>
                {i.quantity} × {i.name}
              </span>
              <span className="leader" aria-hidden />
              <span>{price(i.unitPriceCents * i.quantity)}</span>
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between border-t-2 border-charbon pt-3">
          <span className="font-board uppercase tracking-wider">Total à régler au camion</span>
          <span className="font-display text-2xl font-bold">{price(order.totalCents)}</span>
        </div>
        {order.note && <p className="text-sm text-charbon-muted">Remarque : {order.note}</p>}
      </div>
    </div>
  );
}
