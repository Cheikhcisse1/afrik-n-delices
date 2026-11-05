import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { MenuItem } from "../lib/types";

export interface CartLine {
  menuItemId: number;
  name: string;
  priceCents: number;
  quantity: number;
}

interface CartState {
  lines: CartLine[];
  count: number;
  totalCents: number;
  add: (item: MenuItem, quantity?: number) => void;
  setQuantity: (menuItemId: number, quantity: number) => void;
  remove: (menuItemId: number) => void;
  clear: () => void;
}

const KEY = "and_cart_v1";
const CartContext = createContext<CartState | null>(null);

function load(): CartLine[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as CartLine[]) : [];
    return Array.isArray(parsed) ? parsed.filter((l) => Number.isInteger(l.menuItemId) && l.quantity > 0) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(lines));
    } catch {
      /* stockage indisponible : le panier reste en mémoire */
    }
  }, [lines]);

  const add = useCallback((item: MenuItem, quantity = 1) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.menuItemId === item.id);
      if (existing) {
        return prev.map((l) => (l.menuItemId === item.id ? { ...l, quantity: Math.min(50, l.quantity + quantity) } : l));
      }
      return [...prev, { menuItemId: item.id, name: item.name, priceCents: item.priceCents, quantity }];
    });
  }, []);

  const setQuantity = useCallback((menuItemId: number, quantity: number) => {
    setLines((prev) =>
      quantity <= 0
        ? prev.filter((l) => l.menuItemId !== menuItemId)
        : prev.map((l) => (l.menuItemId === menuItemId ? { ...l, quantity: Math.min(50, quantity) } : l)),
    );
  }, []);

  const remove = useCallback((menuItemId: number) => setLines((prev) => prev.filter((l) => l.menuItemId !== menuItemId)), []);
  const clear = useCallback(() => setLines([]), []);

  const value = useMemo(
    () => ({
      lines,
      count: lines.reduce((n, l) => n + l.quantity, 0),
      totalCents: lines.reduce((n, l) => n + l.quantity * l.priceCents, 0),
      add,
      setQuantity,
      remove,
      clear,
    }),
    [lines, add, setQuantity, remove, clear],
  );
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartState {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart hors de CartProvider");
  return ctx;
}
