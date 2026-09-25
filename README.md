# Mon Carnet : le carnet de santé familial qui parle

Plateforme de suivi des patients pour le Challenge e-Santé Bénin. Chaque personne a son carnet ; un même téléphone gère les carnets de toute la famille ; tout s'écoute dans sa langue ; les rappels arrivent par WhatsApp, SMS, appel ou par le relais communautaire.

La plateforme s'appelle **Mon Carnet** et sera en ligne sur https://moncarnet.kheios.com. Le nom reste configurable (`NEXT_PUBLIC_APP_NAME`).

- Spec : [docs/superpowers/specs/2026-09-25-esante-benin-design.md](docs/superpowers/specs/2026-09-25-esante-benin-design.md)
- Pourquoi ces choix : [docs/recherche/](docs/recherche/) (usages au Bénin, plateformes existantes, design), avec les sources
- Maquettes validées : [docs/design/maquettes-validees.html](docs/design/maquettes-validees.html)
- Déploiement : [docs/deploiement.md](docs/deploiement.md)

## Démarrer en local

Prérequis : Node 22, pnpm 11, un Postgres local.

```bash
pnpm install
psql -U postgres -h localhost -c "CREATE DATABASE sante"
cp .env.example .env.local   # puis renseigner DATABASE_URL
pnpm db:seed                 # migrations + données de démonstration
pnpm dev                     # http://localhost:3000
```

## Comptes de démonstration

Toutes les personnes sont fictives. La page `/demo` ouvre chaque compte en un clic.

| Rôle | Identifiant | Secret |
|---|---|---|
| Patient (Codjo, carnet familial) | 01 97 00 00 01 | 1234 |
| Patiente (Awa, enceinte) | 01 97 00 00 02 | 1234 |
| Patiente (Aïcha, s'occupe de sa mère) | 01 97 00 00 04 | 1234 |
| Relais | koffi.agbessi | demo1234 |
| Sage-femme | adjoa.gbaguidi | demo1234 |
| Infirmier | firmin.akpovi | demo1234 |
| Pharmacie | pharmacie.sainte-rita | demo1234 |
| Pilotage | zone.bohicon | demo1234 |
| Administration | admin | demo1234 |

## Commandes

| Commande | Rôle |
|---|---|
| `pnpm test` | tests (Vitest ; base PGlite en mémoire, aucune configuration) |
| `pnpm typecheck` / `pnpm lint` | vérification des types et du style |
| `pnpm db:generate` | génère une migration après modification du schéma |
| `pnpm db:seed` | réinitialise la base locale avec la démo |
| `pnpm icones` | reconstruit le sprite de pictogrammes |

## Organisation du code

- `src/domain/` : logique métier pure (programmes de suivi, calendriers, risques).
- `src/server/` : base de données, connexion, requêtes.
- `src/ui/` : composants de la charte.
- `src/app/` : pages et routes.
- `tests/` : tous les tests, séparés du code, dans la même arborescence que `src/`.
