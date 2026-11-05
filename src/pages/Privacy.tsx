import { usePageMeta } from "../components/ui";
import { PHONE } from "../lib/format";

export default function Privacy() {
  usePageMeta("Données personnelles");
  return (
    <div className="container-x max-w-3xl py-14">
      <p className="eyebrow">Confidentialité</p>
      <h1 className="mt-3 text-4xl font-extrabold">Vos données personnelles</h1>
      <div className="mt-8 space-y-6 text-lg leading-relaxed text-charbon-muted">
        <p>
          <strong className="text-charbon">Ce que nous gardons.</strong> Votre nom, votre e-mail, votre téléphone si vous le donnez, vos commandes et les messages envoyés par le formulaire de contact. Votre mot de passe est stocké chiffré (bcrypt) : personne ne peut le lire.
        </p>
        <p>
          <strong className="text-charbon">Pourquoi.</strong> Uniquement pour préparer vos commandes, vous joindre en cas de besoin et répondre à vos messages. Aucune donnée n’est vendue ni utilisée pour de la publicité. Le site n’utilise pas de cookie de suivi : un seul cookie technique garde votre session ouverte.
        </p>
        <p>
          <strong className="text-charbon">Où.</strong> Le site est hébergé par Netlify et la base de données par Neon (PostgreSQL). Les e-mails de réinitialisation de mot de passe sont envoyés par Brevo.
        </p>
        <p>
          <strong className="text-charbon">Vos droits.</strong> Vous pouvez modifier vos informations ou supprimer votre compte à tout moment depuis « Mon compte ». Pour toute autre demande, appelez le {PHONE} ou passez par le formulaire de contact.
        </p>
      </div>
    </div>
  );
}
