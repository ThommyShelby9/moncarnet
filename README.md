# Mon Carnet : le carnet de santé familial qui parle

Plateforme de suivi des patients pour le Challenge e-Santé Bénin. Chaque personne a son carnet ; un même téléphone gère les carnets de toute la famille ; tout s'écoute dans sa langue ; les rappels arrivent par WhatsApp, SMS, appel ou par le relais communautaire.

La plateforme s'appelle **Mon Carnet** ; elle est en ligne sur https://moncarnet.kheios.com. **Présentation de bout en bout, avec des captures : https://moncarnet.kheios.com/decouvrir**. Le nom reste configurable (`NEXT_PUBLIC_APP_NAME`).

- Spec : [docs/superpowers/specs/2026-09-25-esante-benin-design.md](docs/superpowers/specs/2026-09-25-esante-benin-design.md)
- Pourquoi ces choix : [docs/recherche/](docs/recherche/) (usages au Bénin, plateformes existantes, design), avec les sources
- Maquettes validées : [docs/design/maquettes-validees.html](docs/design/maquettes-validees.html)
- Déploiement : [docs/deploiement.md](docs/deploiement.md)

## Deux parcours à suivre

Ouvrez https://moncarnet.kheios.com/demo : un clic entre dans un compte.

1. **Awa, enceinte de 37 semaines, jusqu'à la naissance.**
   - « Ma grossesse » : la semaine, la taille du bébé comparée à ce qu'on trouve au marché, les consultations tamponnées.
   - « Préparer la naissance » : où accoucher, comment y aller même la nuit, qui accompagne, l'argent, le sac, un donneur de sang.
   - « J'ai un problème » → « Le travail a commencé » : l'alerte part au centre.
   - Adjoa, la sage-femme, prend l'alerte en charge et **déclare la naissance**. Le carnet du bébé apparaît chez Awa avec ses vaccins de naissance ; le suivi après l'accouchement commence pour la mère.
2. **Codjo, patient au quotidien.**
   - L'accueil dit une chose à la fois (« Ce soir, 1 comprimé »), à écouter.
   - Il prend rendez-vous en 4 étapes pour son petit-fils et voit sa courbe de tension.
   - Firmin le reçoit, prescrit, et la pharmacie délivre avec le code.

## Espace patient

- **Accueil « une chose à la fois »** : une grande carte dit ce qu'il faut faire maintenant (le comprimé du soir, le vaccin de Sèna, le contrôle de jeudi), avec « Écouter », « C'est fait » et « Plus tard ». Le dernier mot compte : « Annuler » remet la prise à faire.
- **Carnet familial** : un même téléphone suit les carnets de toute la famille ; les avatars changent de carnet d'un geste.
- **Prendre rendez-vous en 4 étapes** : pour qui, pour quoi, quel jour (les soleils disent dans combien de jours, avec les places restantes), puis confirmation. Un jour complet propose la liste d'attente. Deux personnes qui visent la dernière place : une seule l'obtient.
- **Carnet** : chaque vaccin ou consultation fait porte son tampon « VU », comme sur le carnet papier ; les médicaments en cours sont dessinés par moment de la journée.
- **Ma grossesse** : semaine par semaine, taille du bébé, frise des consultations, conseils à écouter, « Préparer la naissance » (plan d'accouchement) et « Le jour J ».
- **Naissance** : félicitations sur l'accueil, carnet du bébé rattaché à la famille, vaccins de naissance tamponnés, visites après l'accouchement proposées à la mère.
- **Le prénom du bébé, plus tard** : souvent donné lors de la sortie de l'enfant ; la famille le donne depuis le carnet du bébé.
- **Courbe de tension** : les derniers relevés, avec la limite 140/90.
- **J'ai un problème** : les signes de danger en images (ceux de la grossesse pour une femme enceinte). L'alerte part au centre avec 15 minutes pour la prendre en charge. Sans réseau, l'écran dit que l'alerte n'est pas encore partie, donne le numéro du centre, et l'envoi repart seul au retour du réseau, sans doublon.

## Poste soignant et pharmacie

- **Aujourd'hui** : les alertes en haut avec leur compte à rebours de 15 minutes (une alerte en retard est marquée, et remonte à la zone sanitaire) et « Je la prends en charge » (un seul soignant la prend) ; les consultations du jour par plage, avec le risque de chacun et le tampon « VU » pour les personnes déjà vues ; les patients à surveiller. La page se met à jour seule.
- **Retrouver un patient** par son nom (sans accent), son numéro ou le code écrit dans son carnet. Un soignant ne voit que les patients de son centre.
- **Dossier** : risque et motifs (règles de la spec, valeurs indicatives), étapes des programmes, relevés, ordonnances avec leur délivrance.
- **Déclarer la naissance** (sage-femme) : heure, lieu, voie basse ou césarienne, sexe, poids (« 3,2 » ou « 3200 »), vaccins de naissance ; une seule fois par grossesse.
- **Consultation** : tension, glycémie, poids, hémoglobine ; le risque est recalculé tout de suite (180/110 : risque élevé). Un vaccin fait coche l'étape dans le carnet de l'enfant.
- **Ordonnance** : comprimés matin, midi et soir, durée, en mots simples ; un code de 6 caractères à donner au patient, qui le retrouve aussi dans son carnet.
- **Pharmacie** : le code suffit ; la pharmacie voit l'ordonnance, jamais le dossier. Posologie dessinée, écoute de la posologie, délivrance une seule fois : le tampon apparaît chez le soignant et les prises dans le carnet du patient. Code de démonstration : `M4R2TN`.

## Relais hors ligne

- **Ma tournée** : Koffi prépare sa tournée avec du réseau ; ses foyers restent sur le téléphone. Les foyers urgents passent en premier : signe de danger en attente, tension très élevée. On voit aussi, pour chaque personne, pourquoi passer : étape manquée, ordonnance à retirer, vaccin de la semaine.
- **Visite** : tout va bien, à orienter ou absent ; une note vocale (« Maintenir pour raconter la visite ») ; la tension (« 14 sur 9 » se lit 140/90) ; un signe de danger, qui crée l'alerte du centre dès que le réseau le permet.
- **Inscrire une personne** : nouveau-né, femme enceinte, tension, diabète, personne âgée. Le carnet et ses rendez-vous sont créés au retour du réseau ; on peut visiter la personne tout de suite.
- **File d'envoi** : tout part seul quand le réseau revient, sans doublon. Ce que le centre refuse reste dans « À corriger », avec la raison. La déconnexion attend que tout soit parti, puis efface le téléphone.
- **Chez le soignant** : les visites du relais et leurs notes vocales dans le dossier.
- **Sans réseau pour tous** : l'application s'installe sur le téléphone ; les pages déjà ouvertes restent lisibles.

## Pilotage (État)

- **Agents de l'État, zone sanitaire Zogbodomey-Bohicon-Zakpota** : les indicateurs de la zone calculés en direct depuis les carnets, commune par commune. On y lit la 4ᵉ consultation prénatale, les naissances au centre, les vaccins Penta3 et rougeole-rubéole, la tension contrôlée, les alertes prises en charge en moins de 15 minutes et leur délai moyen, les visites des relais et les rendez-vous manqués. S'y ajoutent la tendance sur 6 mois et l'écart avec le mois dernier.
- **Ministère de la Santé** : la vue nationale. Elle réunit la zone de la démo (en direct) et dix autres zones du pays (**données fictives**, signalées comme telles), le classement des zones par indicateur, la tendance nationale et les zones à appuyer.
- **Export CSV au format DHIS2** (unité, période, élément, numérateur, dénominateur, valeur).
- **Aucun nom** ne sort du pilotage. Un chiffre qui porte sur moins de 5 personnes est masqué, à l'écran comme dans l'export : la petite commune de Zogbodomey le montre.

## Accessibilité

- Audit automatique **axe-core (WCAG 2.1 A et AA)** sur 19 écrans (présentation, démo, connexion, patient, relais, soignant, pharmacie, pilotage) : **aucune violation**.
- Tout s'écoute ; pictogramme et mot ; gros boutons ; lecteur d'écran ; contrastes vérifiés ; tout se fait au clavier.

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
| Agents de l'État (zone sanitaire) | zone.bohicon | demo1234 |
| Ministère de la Santé (vue nationale) | ministere.sante | demo1234 |
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
