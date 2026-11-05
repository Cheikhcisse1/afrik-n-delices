import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { Role } from "../lib/types";
import { PageLoader } from "./ui";

/** Route privée : redirige vers la connexion, ou affiche un refus si le rôle ne suffit pas. */
export function RequireAuth({ children, roles }: { children: ReactNode; roles?: Role[] }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to={`/connexion?suite=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  if (roles && !roles.includes(user.role)) {
    return (
      <div className="container-x py-24 text-center">
        <h1 className="text-3xl font-bold">Accès réservé</h1>
        <p className="mt-3 text-charbon-muted">Cette page est réservée à l’équipe du camion.</p>
      </div>
    );
  }
  return <>{children}</>;
}
