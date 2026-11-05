import { useEffect, useRef, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent ${className}`}
    />
  );
}

export function PageLoader() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-piment-dark" role="status">
      <Spinner className="h-7 w-7" />
      <span className="sr-only">Chargement…</span>
    </div>
  );
}

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  name: string;
  error?: string;
  hint?: ReactNode;
}

export function Field({ label, name, error, hint, className = "", ...rest }: FieldProps) {
  const id = `f-${name}`;
  return (
    <div className={className}>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <input
        id={id}
        name={name}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined}
        className={`input ${error ? "input-error" : ""}`}
        {...rest}
      />
      {error ? (
        <p id={`${id}-err`} className="mt-1 text-sm text-piment-dark">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1 text-sm text-charbon-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

interface AreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  name: string;
  error?: string;
}

export function TextArea({ label, name, error, className = "", ...rest }: AreaProps) {
  const id = `f-${name}`;
  return (
    <div className={className}>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <textarea
        id={id}
        name={name}
        aria-invalid={!!error}
        className={`input min-h-[120px] resize-y ${error ? "input-error" : ""}`}
        {...rest}
      />
      {error && <p className="mt-1 text-sm text-piment-dark">{error}</p>}
    </div>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div role="alert" className="rounded-md border border-piment-dark/30 bg-piment/10 px-4 py-3 text-sm text-bordeaux">
      {message}
    </div>
  );
}

/** Photo responsive : /images/{name}-800.webp et -1600.webp */
export function Photo({ name, alt, className = "", eager = false, sizes = "100vw" }: { name: string; alt: string; className?: string; eager?: boolean; sizes?: string }) {
  return (
    <img
      src={`/images/${name}-800.webp`}
      srcSet={`/images/${name}-800.webp 800w, /images/${name}-1600.webp 1600w`}
      sizes={sizes}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      className={className}
    />
  );
}

/** Fait apparaître l'élément en douceur quand il entre dans l'écran. */
export function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) {
      el.classList.add("is-visible");
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.12 },
    );
    el.querySelectorAll(".reveal").forEach((c) => io.observe(c));
    if (el.classList.contains("reveal")) io.observe(el);
    return () => io.disconnect();
  }, []);
  return ref;
}

/** Titre, description et lien canonique de la page (SEO). */
export function usePageMeta(title: string, description?: string) {
  useEffect(() => {
    document.title = title.includes("Afrik") ? title : `${title} — Afrik'N'Délices by Diallo`;
    if (description) document.querySelector('meta[name="description"]')?.setAttribute("content", description);
    let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "canonical";
      document.head.appendChild(link);
    }
    link.href = window.location.origin + window.location.pathname;
  }, [title, description]);
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-charbon/20 px-6 py-10 text-center">
      <p className="font-display text-xl text-charbon">{title}</p>
      {children && <div className="mt-2 text-charbon-muted">{children}</div>}
    </div>
  );
}
