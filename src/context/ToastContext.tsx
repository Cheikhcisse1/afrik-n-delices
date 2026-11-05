import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

type Kind = "success" | "error" | "info";
interface Toast {
  id: number;
  kind: Kind;
  text: string;
}

const ToastContext = createContext<((text: string, kind?: Kind) => void) | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((text: string, kind: Kind = "success") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-2), { id, kind, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === "error" ? 6000 : 3500);
  }, []);

  const value = useMemo(() => push, [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:items-end sm:px-6">
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.kind === "error" ? "alert" : "status"}
            className={`pointer-events-auto flex max-w-sm animate-slidein items-start gap-3 rounded-lg px-4 py-3 text-sm shadow-ticket ${
              t.kind === "error" ? "bg-piment-dark text-creme" : t.kind === "info" ? "bg-charbon text-creme" : "bg-feuille text-creme"
            }`}
          >
            <span aria-hidden className="mt-0.5 font-board">{t.kind === "error" ? "!" : t.kind === "info" ? "i" : "✓"}</span>
            <span>{t.text}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast hors de ToastProvider");
  return ctx;
}
