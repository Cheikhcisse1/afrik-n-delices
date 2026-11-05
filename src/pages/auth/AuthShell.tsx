import type { ReactNode } from "react";
import { Photo } from "../../components/ui";

export function AuthShell({ title, intro, children }: { title: string; intro?: ReactNode; children: ReactNode }) {
  return (
    <div className="container-x grid min-h-[70vh] items-center gap-10 py-12 lg:grid-cols-2">
      <div className="hidden overflow-hidden rounded-2xl lg:block">
        <Photo name="comptoir-service" sizes="50vw" alt="Le comptoir du camion Afrik’N’Délices pendant le service." className="h-[560px] w-full object-cover" />
      </div>
      <div className="mx-auto w-full max-w-md">
        <h1 className="text-4xl font-extrabold">{title}</h1>
        {intro && <div className="mt-3 text-charbon-muted">{intro}</div>}
        <div className="mt-8">{children}</div>
      </div>
    </div>
  );
}

/** N'accepte que des chemins internes pour la redirection après connexion. */
export function safeNext(value: string | null): string {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/compte";
}
