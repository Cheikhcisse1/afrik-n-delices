import { useEffect, type ReactNode } from "react";

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-charbon/50 p-0 sm:items-center sm:p-6" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="max-h-[92vh] w-full max-w-lg animate-rise overflow-y-auto rounded-t-2xl bg-creme p-6 shadow-2xl sm:rounded-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-2xl font-bold">{title}</h2>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-md hover:bg-charbon/5" aria-label="Fermer">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** "7" / "7,50" / "7.5" -> 700 / 750 ; null si invalide */
export function parseEuros(value: string): number | null {
  const v = value.trim().replace(",", ".").replace("€", "").trim();
  if (!/^\d{1,4}(\.\d{1,2})?$/.test(v)) return null;
  return Math.round(Number(v) * 100);
}

export function centsToInput(cents: number): string {
  return cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2).replace(".", ",");
}
