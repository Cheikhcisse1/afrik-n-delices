# Afrik'N'Délices by Diallo

Site du food truck **Afrik'N'Délices by Diallo** (Champigny-sur-Marne) : vitrine, carte, emplacements, commande à emporter en ligne, espace client et espace équipe.

- **Frontend** : React 18 + TypeScript, Vite, Tailwind CSS, React Router
- **Backend** : une Netlify Function (`netlify/functions/api.mts`) qui sert toute l'API `/api/*`
- **Base de données** : Neon (PostgreSQL serverless), accès via le driver `postgres` avec requêtes paramétrées
- **E-mails** : Brevo (réinitialisation du mot de passe)
- **Hébergement** : Netlify (déploiement automatique à chaque push sur `main`)

## Pourquoi Neon

| Critère | Neon (choisi) | Turso | Firebase | MongoDB Atlas | CockroachDB |
|---|---|---|---|---|---|
| Modèle | PostgreSQL relationnel | SQLite (libSQL) | NoSQL documents | NoSQL documents | SQL distribué |
| Relations / clés étrangères / transactions | Oui | Oui | Non | Limitées | Oui |
| Intégration Netlify | Native (Netlify DB = Neon) | Manuelle | Manuelle | Manuelle | Manuelle |
| Console d'admin (éditeur SQL, tables) | Oui | Oui (plus simple) | Oui | Oui | Oui |
| Passage au payant | Sans migration | Sans migration | — | — | — |

Les données du site sont relationnelles (comptes → commandes → lignes → plats → catégories, emplacements) : un SGBD SQL avec clés étrangères et transactions est le bon outil. Neon l'offre avec l'intégration Netlify la plus directe.

**Offre gratuite Neon (relevée en novembre 2026)** : 0,5 Go de stockage par projet, 100 heures de calcul par projet et par mois, 5 Go de transfert sortant par mois, mise en veille après 5 min d'inactivité. **Limite** : la première requête après une veille prend environ 0,5 à 1 s de plus. Vérifier les quotas à jour sur https://neon.com/pricing.

## Architecture

```
├── index.html                 # Méta SEO, Open Graph, données structurées (JSON-LD)
├── netlify.toml               # Build, fonctions, redirection SPA, en-têtes de sécurité (CSP…)
├── netlify/functions/api.mts  # Point d'entrée de l'API (path: /api/*)
├── server/                    # Code backend (TypeScript)
│   ├── router.ts              # Routage + protection CSRF + gestion des erreurs
│   ├── auth.ts                # bcrypt, sessions JWT en cookie HttpOnly, rôles
│   ├── db.ts                  # Connexion Neon + limiteur de tentatives
│   ├── schemas.ts             # Validation serveur (zod)
│   ├── mail.ts                # Envoi via Brevo
│   └── routes/                # public, auth, orders, admin
├── db/migrations/             # Schéma SQL + carte initiale (relevée sur le panneau du camion)
├── scripts/
│   ├── migrate.mjs            # Applique les migrations
│   ├── make-admin.mjs         # Donne un rôle (admin/staff/client) à un compte
│   ├── smoke-test.mjs         # Test de bout en bout de l'API (60 vérifications)
│   ├── dev-server.mjs         # Serveur local Vite + API sur :8888
│   └── optimize-images.mjs    # Génère les images WebP
├── public/images/             # Photos optimisées
└── src/                       # Application React
    ├── pages/                 # Accueil, Carte, Où nous trouver, Contact, Commander, Compte, auth, admin
    ├── components/            # Layout, UI, ticket de commande, route protégée
    ├── context/               # Session, panier (localStorage), notifications
    └── lib/                   # Client API, formats, types
```

### Rôles

| Rôle | Droits |
|---|---|
| `client` | Commander, suivre et annuler ses commandes (tant qu'elles ne sont pas en préparation), gérer son profil, supprimer son compte |
| `staff` (équipe) | + voir et faire avancer toutes les commandes, marquer un plat épuisé, traiter les messages |
| `admin` | + modifier la carte et les prix, les emplacements et horaires, supprimer des messages, attribuer les rôles |

### Sécurité

- Mots de passe hachés avec bcrypt (coût 11), jamais renvoyés au navigateur.
- Session : JWT signé (HS256) dans un cookie `HttpOnly`, `Secure`, `SameSite=Lax`, 7 jours. Un changement de mot de passe ou de rôle invalide les autres sessions (`token_version`).
- CSRF : toute requête qui modifie des données exige l'en-tête `X-Requested-With: fetch` et la même origine.
- Injections SQL : uniquement des requêtes paramétrées (gabarits `sql\`...\``).
- Validation de toutes les entrées côté serveur (zod) ; prix des commandes toujours recalculés en base.
- Limitation des tentatives : connexion (8 échecs / 15 min par e-mail, 30 par IP), inscription, contact, mot de passe oublié.
- Jetons de réinitialisation aléatoires (256 bits), stockés hachés, valables 1 h, à usage unique ; réponse identique que l'e-mail existe ou non.
- En-têtes HTTP : CSP stricte, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`.
- Aucune clé secrète dans le frontend : tout passe par les variables d'environnement Netlify.

## Variables d'environnement

| Variable | Obligatoire | Rôle |
|---|---|---|
| `DATABASE_URL` | oui | Chaîne de connexion Neon (« pooled ») |
| `JWT_SECRET` | oui | 32 caractères aléatoires minimum (signature des sessions) |
| `BREVO_API_KEY` | pour le mot de passe oublié | Clé API Brevo (SMTP & API > API Keys) |
| `MAIL_FROM` | pour le mot de passe oublié | Adresse expéditrice vérifiée dans Brevo |
| `SITE_URL` | non | URL publique (sinon Netlify fournit `URL`) |

## Créer et configurer la base Neon

1. Créer un compte sur https://neon.com, puis un projet (Postgres 16 ou 17, région **AWS US East 2 (Ohio)**, la plus proche des fonctions Netlify).
2. Bouton **Connect** → cocher **Connection pooling** → copier la chaîne `postgresql://…-pooler…/neondb?sslmode=require`.
3. Appliquer le schéma et la carte initiale (sans Node installé, via Docker) :
   ```bash
   docker run --rm -v "$PWD":/app -w /app -e DATABASE_URL="postgresql://..." node:22-alpine sh -c "npm ci && node scripts/migrate.mjs"
   ```
4. Les tables se consultent dans la console Neon (**Tables** et **SQL Editor**).

## Déployer sur Netlify

1. Netlify → **Add new project → Import an existing project → GitHub** → choisir ce dépôt. Les réglages de build sont lus dans `netlify.toml`.
2. **Project configuration → Environment variables** : ajouter `DATABASE_URL`, `JWT_SECRET`, `BREVO_API_KEY`, `MAIL_FROM`.
3. Déployer. Vérifier `https://<site>.netlify.app/api/health` → `{"status":"ok","database":"connected"}`.
4. Créer son compte sur le site, puis se donner le rôle admin :
   ```bash
   docker run --rm -v "$PWD":/app -w /app -e DATABASE_URL="postgresql://..." node:22-alpine sh -c "npm ci && node scripts/make-admin.mjs vous@exemple.fr admin"
   ```
   (ou dans le SQL Editor Neon : `update users set role = 'admin' where email = 'vous@exemple.fr';`)
5. Dans l'espace admin → **Emplacements**, renseigner les horaires de passage (ils ne figurent pas sur le panneau du camion) : ils servent à proposer des créneaux de retrait.

## Développement local (Docker, sans Node)

```bash
docker volume create afrik_nm
docker compose -f docker-compose.dev.yml up
```

Site + API sur http://localhost:8888, avec une base PostgreSQL locale (ou Neon si `DATABASE_URL` est dans `.env`). Tests de l'API (base de développement uniquement) :

```bash
docker compose -f docker-compose.dev.yml exec app node scripts/smoke-test.mjs
```

## Modifier et maintenir

- **Carte, prix, disponibilités, horaires, rôles** : depuis l'espace admin du site, sans toucher au code.
- **Textes et design** : `src/pages/*`, couleurs et polices dans `tailwind.config.js`. Pousser sur `main` redéploie automatiquement.
- **Nouvelle photo** : la placer dans `photos-src/`, l'ajouter dans `scripts/optimize-images.mjs`, relancer le script.
- **Changer la structure de la base** : ajouter un fichier `db/migrations/003_….sql` puis lancer `scripts/migrate.mjs` (chaque fichier n'est appliqué qu'une fois).

## Limites des offres gratuites

- **Netlify (gratuit)** : 300 crédits/mois (bande passante, minutes de build, requêtes de fonctions partagent ce quota). Largement suffisant pour un food truck ; au-delà, le site est mis en pause jusqu'au mois suivant.
- **Neon (gratuit)** : 0,5 Go, 100 h de calcul/mois, mise en veille après 5 min (premier chargement un peu plus lent).
- **Brevo (gratuit)** : 300 e-mails/jour, avec mention Brevo dans les e-mails.
- Pas de paiement en ligne : le règlement se fait au camion (espèces, carte, titres-restaurant).
