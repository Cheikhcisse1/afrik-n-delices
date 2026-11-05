import type { OrderStatus } from "./types";

const euro = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

export function price(cents: number): string {
  // 7,00 € -> 7 € ; 2,50 € reste 2,50 €
  return cents % 100 === 0 ? `${cents / 100} €` : euro.format(cents / 100);
}

export const DAYS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

export function longDate(date: string): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}

export function dateTime(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  });
}

export function hours(start: string | null, end: string | null): string | null {
  if (start && end) return `${start.replace(":", "h")} – ${end.replace(":", "h")}`;
  if (start) return `dès ${start.replace(":", "h")}`;
  return null;
}

export const STATUS_LABEL: Record<OrderStatus, string> = {
  received: "Reçue",
  preparing: "En préparation",
  ready: "Prête à retirer",
  collected: "Retirée",
  cancelled: "Annulée",
};

export const STATUS_STYLE: Record<OrderStatus, string> = {
  received: "bg-safran/20 text-bordeaux",
  preparing: "bg-piment/15 text-piment-dark",
  ready: "bg-feuille/15 text-feuille",
  collected: "bg-charbon/10 text-charbon-muted",
  cancelled: "bg-charbon/10 text-charbon-muted line-through",
};

export const PHONE = "06 52 53 04 88";
export const PHONE_LINK = "tel:+33652530488";

export function mapsLink(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}
