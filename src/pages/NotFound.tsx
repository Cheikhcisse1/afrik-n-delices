import { Link } from "react-router-dom";
import { usePageMeta } from "../components/ui";

export default function NotFound() {
  usePageMeta("Page introuvable");
  return (
    <div className="container-x py-24 text-center">
      <p className="font-board text-8xl text-piment">404</p>
      <h1 className="mt-4 text-4xl font-extrabold">Cette page n’est pas sur la carte.</h1>
      <p className="mt-3 text-charbon-muted">Le lien est peut-être ancien ou mal recopié.</p>
      <div className="mt-8 flex justify-center gap-3">
        <Link to="/" className="btn-primary">
          Accueil
        </Link>
        <Link to="/carte" className="btn-ghost">
          La carte
        </Link>
      </div>
    </div>
  );
}
