# Mon Carnet : le carnet de santé familial qui parle

Plateforme de suivi des patients pour le Challenge e-Santé Bénin. Chaque personne a son carnet ; un même téléphone gère les carnets de toute la famille ; tout s'écoute dans sa langue ; les rappels arrivent par WhatsApp, SMS, appel ou par le relais communautaire.

La plateforme s'appelle **Mon Carnet** et sera en ligne sur https://moncarnet.kheios.com. Le nom reste configurable (`NEXT_PUBLIC_APP_NAME`).

- Spec : [docs/superpowers/specs/2026-09-25-esante-benin-design.md](docs/superpowers/specs/2026-09-25-esante-benin-design.md)
- Pourquoi ces choix : [docs/recherche/](docs/recherche/) (usages au Bénin, plateformes existantes, design), avec les sources
- Maquettes validées : [docs/design/maquettes-validees.html](docs/design/maquettes-validees.html)
- Déploiement : [docs/deploiement.md](docs/deploiement.md)

## Espace patient

- **Accueil « une chose à la fois »** : une grande carte dit ce qu'il faut faire maintenant (le comprimé du soir, le vaccin de Sèna, le contrôle de jeudi), avec « Écouter », « C'est fait » et « Plus tard ». Le dernier mot compte : « Annuler » remet la prise à faire.
- **Carnet familial** : un même téléphone suit les carnets de toute la famille ; les avatars changent de carnet d'un geste.
- **Prendre rendez-vous en 4 étapes** : pour qui, pour quoi, quel jour (les soleils disent dans combien de jours, avec les places restantes), puis confirmation. Un jour complet propose la liste d'attente. Deux personnes qui visent la dernière place : une seule l'obtient.
- **Carnet** : chaque vaccin ou consultation fait porte son tampon « VU », comme sur le carnet papier ; les médicaments en cours sont dessinés par moment de la journée.
- **J'ai un problème** : les signes de danger en images (ceux de la grossesse pour une femme enceinte). L'alerte part au centre avec 15 minutes pour la prendre en charge. Sans réseau, l'écran dit que l'alerte n'est pas encore partie, donne le numéro du centre, et l'envoi repart seul au retour du réseau, sans doublon.

## Poste soignant et pharmacie

- **Aujourd'hui** : les alertes en haut avec leur compte à rebours de 15 minutes et « Je la prends en charge » (un seul soignant la prend) ; les consultations du jour par plage, avec le risque de chacun et le tampon « VU » pour les personnes déjà vues ; les patients à surveiller. La page se met à jour seule.
- **Retrouver un patient** par son nom (sans accent), son numéro ou le code écrit dans son carnet. Un soignant ne voit que les patients de son centre.
- **Dossier** : risque et motifs (règles de la spec, valeurs indicatives), étapes des programmes, relevés, ordonnances avec leur délivrance.
- **Consultation** : tension, glycémie, poids, hémoglobine ; le risque est recalculé tout de suite (180/110 : risque élevé). Un vaccin fait coche l'étape dans le carnet de l'enfant.
- **Ordonnance** : comprimés matin, midi et soir, durée, en mots simples ; un code de 6 caractères à donner au patient, qui le retrouve aussi dans son carnet.
- **Pharmacie** : le code suffit ; la pharmacie voit l'ordonnance, jamais le dossier. Posologie dessinée, écoute de la posologie, délivrance une seule fois : le tampon apparaît chez le soignant et les prises dans le carnet du patient. Code de démonstration : `M4R2TN`.

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
