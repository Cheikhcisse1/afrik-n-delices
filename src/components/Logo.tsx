export function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className="flex items-baseline gap-2 leading-none">
      <span className={`whitespace-nowrap font-display text-[20px] font-extrabold tracking-tight sm:text-2xl ${light ? "text-creme" : "text-bordeaux"}`}>
        Afrik’N’Délices
      </span>
      <span className={`hidden whitespace-nowrap font-board text-[11px] uppercase tracking-[0.25em] min-[400px]:inline ${light ? "text-safran" : "text-piment-dark"}`}>
        by Diallo
      </span>
    </span>
  );
}
