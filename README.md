# Mon Carnet : le carnet de santé familial qui parle

Plateforme de suivi des patients pour le Challenge e-Santé Bénin. Chaque personne a son carnet ; un même téléphone gère les carnets de toute la famille ; tout s'écoute dans sa langue ; les rappels arrivent par WhatsApp, SMS, appel ou par le relais communautaire.

La plateforme s'appelle **Mon Carnet** ; elle est en ligne sur https://moncarnet.kheios.com. **Présentation de bout en bout, avec des captures : https://moncarnet.kheios.com/decouvrir**. Le nom reste configurable (`NEXT_PUBLIC_APP_NAME`).

- Spec : [docs/superpowers/specs/2026-09-25-esante-benin-design.md](docs/superpowers/specs/2026-09-25-esante-benin-design.md)
- Pourquoi ces choix : [docs/recherche/](docs/recherche/) (usages au Bénin, plateformes existantes, design), avec les sources
- Maquettes validées : [docs/design/maquettes-validees.html](docs/design/maquettes-validees.html)
- Déploiement : [docs/deploiement.md](docs/deploiement.md)
- **Dossier de présentation (PDF, 24 pages, avec captures)** : [docs/Mon-Carnet-dossier-de-presentation.pdf](docs/Mon-Carnet-dossier-de-presentation.pdf), la plateforme de bout en bout et sa conformité au challenge

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

## Rappels en cascade (canaux simulés)

- **À J-2**, chaque place réservée reçoit un rappel sur le premier canal de la personne : WhatsApp si elle l'a et y consent, sinon SMS, un appel vocal si elle préfère la voix, le relais si elle n'a pas de téléphone.
- **Sans réponse après 2 heures**, le rappel passe au canal suivant : WhatsApp → SMS → appel vocal → relais. Une personne malentendante n'est jamais appelée : un message écrit, puis le relais. Au bout de la cascade, la personne apparaît dans la tournée du relais : « Rappels sans réponse : prévenir de vive voix ».
- **« 1 : Je viendrai »** confirme ; **« 2 : Je ne peux pas »** libère la place, et l'application propose un autre jour. Le rappel s'affiche aussi sur l'accueil, avec les mêmes réponses.
- **Contenu neutre** : date, lieu, « vaccin » ou « rendez-vous », jamais la maladie, car un téléphone se partage.
- **Le faux téléphone** (`/demo/telephone`) montre ce que reçoivent Codjo, Afiavi (téléphone basique) et Aïcha : WhatsApp, SMS, appel vocal lu à voix haute. Rien n'est vraiment envoyé ; un fournisseur réel (WhatsApp Cloud API, SMS, voix) se branche à la place de la simulation.
- L'administration envoie les rappels de J-2 et fait passer les relances d'un clic ; le dossier du soignant garde l'historique.

## Salle d'attente

- **« Je suis arrivé au centre »** : la personne qui a rendez-vous (ou une alerte du jour) prend un numéro de passage depuis son téléphone. Le même numéro revient si elle touche deux fois, et deux arrivées au même instant n'ont jamais le même.
- Son téléphone suit son tour : « 3 personnes avant vous », puis « C'est bientôt votre tour » (2 personnes ou moins, avec vibration), puis « C'est votre tour : entrez en consultation ».
- **Chez le soignant** : la salle d'attente du jour, et « Appeler le suivant » en un clic, qui ouvre son dossier. **Une urgence passe toujours devant.**
- C'est notre réponse aux 90 minutes d'attente relevées pour une consultation prénatale (voir la recherche).

## Poste soignant et pharmacie

- **Aujourd'hui** : les alertes en haut avec leur compte à rebours de 15 minutes (une alerte en retard est marquée, et remonte à la zone sanitaire) et « Je la prends en charge » (un seul soignant la prend) ; les consultations du jour par plage, avec le risque de chacun et le tampon « VU » pour les personnes déjà vues ; les patients à surveiller. La page se met à jour seule.
- **Agenda** : les plages des 7 jours à venir, avec les places prises, les plages complètes et la liste d'attente. Dans une plage : les personnes inscrites, celles qui attendent, une place de plus ou de moins (jamais sous le nombre d'inscrits) et « Donner la place » à une personne qui attend. « Ouvrir une plage » ajoute un samedi de vaccination ou une matinée de rattrapage.
- **Suivis** : les listes de travail du centre. Grossesses du terme le plus proche au plus lointain, vaccins en retard ou à faire dans la semaine, tensions trop hautes ou contrôles manqués, perdus de vue. Chaque ligne permet d'appeler, d'ouvrir le dossier ou de **confier une visite au relais** : la consigne entre dans sa tournée jusqu'à sa prochaine visite.
- **Relais** : les visites des 30 derniers jours, celles « à orienter » d'abord, les notes vocales à écouter, et le suivi des visites confiées.
- **Alertes** : l'historique des signes de danger avec leur délai de prise en charge et qui les a prises, le délai moyen et la part prise en 15 minutes.
- **Retrouver un patient** par son nom (sans accent), son numéro ou le code écrit dans son carnet. Un soignant ne voit que les patients de son centre.
- **Dossier** : risque et motifs (règles de la spec, valeurs indicatives), étapes des programmes, relevés, ordonnances avec leur délivrance.
- **Déclarer la naissance** (sage-femme) : heure, lieu, voie basse ou césarienne, sexe, poids (« 3,2 » ou « 3200 »), vaccins de naissance ; une seule fois par grossesse.
- **Consultation** : tension, glycémie, poids, hémoglobine ; le risque est recalculé tout de suite (180/110 : risque élevé). Un vaccin fait coche l'étape dans le carnet de l'enfant.
- **Ordonnance** : comprimés matin, midi et soir, durée, en mots simples ; un code de 6 caractères à donner au patient, qui le retrouve aussi dans son carnet. Les ruptures signalées par les pharmacies s'affichent au-dessus du formulaire.
- **Pharmacie** : le code suffit ; la pharmacie voit l'ordonnance, jamais le dossier. Posologie dessinée, écoute de la posologie, délivrance une seule fois : le tampon apparaît chez le soignant et les prises dans le carnet du patient. Code de démonstration : `M4R2TN`.
- **Historique de la pharmacie** : les délivrances des 30 derniers jours (code et initiales seulement) et les médicaments les plus délivrés.
- **Ruptures de stock** : la pharmacie signale ce qui manque et dit quand il revient ; les soignants le voient avant de prescrire.

## Relais hors ligne

- **Ma tournée** : Koffi prépare sa tournée avec du réseau ; ses foyers restent sur le téléphone. Les foyers urgents passent en premier : signe de danger en attente, tension très élevée. On voit aussi, pour chaque personne, pourquoi passer : étape manquée, ordonnance à retirer, vaccin de la semaine.
- **Visite** : tout va bien, à orienter ou absent ; une note vocale (« Maintenir pour raconter la visite ») ; la tension (« 14 sur 9 » se lit 140/90) ; un signe de danger, qui crée l'alerte du centre dès que le réseau le permet.
- **Inscrire une personne** : nouveau-né, femme enceinte, tension, diabète, personne âgée. Le carnet et ses rendez-vous sont créés au retour du réseau ; on peut visiter la personne tout de suite.
- **File d'envoi** : tout part seul quand le réseau revient, sans doublon. Ce que le centre refuse reste dans « À corriger », avec la raison. La déconnexion attend que tout soit parti, puis efface le téléphone.
- **Chez le soignant** : les visites du relais et leurs notes vocales dans le dossier.
- **Sans réseau pour tous** : l'application s'installe sur le téléphone ; les pages déjà ouvertes restent lisibles.

## Pilotage (État)

- **Agents de l'État, zone sanitaire Zogbodomey-Bohicon-Zakpota** : les indicateurs de la zone calculés en direct depuis les carnets, commune par commune. On y lit la 4ᵉ consultation prénatale, les naissances au centre, les vaccins Penta3 et rougeole-rubéole, la tension contrôlée, les alertes prises en charge en moins de 15 minutes et leur délai moyen, les visites des relais et les rendez-vous manqués. S'y ajoutent la carte de la zone (chaque commune avec sa valeur, le centre de santé et la pharmacie en points), la tendance sur 6 mois et l'écart avec le mois dernier.
- **Ministère de la Santé** : la vue nationale. Elle réunit la zone de la démo (en direct) et les 33 autres zones sanitaires du pays (**données fictives**, signalées comme telles) sur une **carte du Bénin** : chaque zone colorée selon l'objectif (atteint, presque, à appuyer, masqué), sa valeur écrite dessus, le Sud agrandi à côté, et chaque zone ouvre sa fiche. S'y ajoutent la tendance nationale et les zones à appuyer.
- **Indicateurs** : un indicateur à la fois, avec sa définition, son objectif, sa tendance, puis le détail commune par commune (zone) ou zone par zone (ministère).
- **Centres et relais** (zone) : pour chaque centre, les consultations, l'attente moyenne en salle, les alertes et leur délai, les places des 7 jours à venir ; pour chaque relais, les foyers suivis, les visites et la part des foyers visités.
- **Alertes** : en direct et semaine par semaine pour la zone, centre par centre ; zone par zone pour le ministère.
- **Zones** (ministère) : toutes les zones côte à côte, et la fiche de chacune (en direct pour la zone de la démo).
- **Exports CSV au format DHIS2** (unité, période, élément, numérateur, dénominateur, valeur) : indicateurs du mois, historique sur 6 mois, activité des centres et des relais.
- **Cartes** : les 77 communes et les 34 zones sanitaires, d'après geoBoundaries (domaine public), simplifiées en gardant les frontières communes et dessinées sur le serveur en SVG (55 Ko, sans tuiles ni bibliothèque). La couleur n'est jamais seule : la valeur est écrite, la légende est en mots, et les tableaux donnent les mêmes chiffres. `pnpm carte` refait le fond de carte.
- **Aucun nom** ne sort du pilotage. Un chiffre qui porte sur moins de 5 personnes est masqué, à l'écran comme dans l'export : la petite commune de Zogbodomey le montre.

## Administration

- **Gestion des contenus de santé** (`/admin/contenus`) : les conseils de grossesse par trimestre, les messages des prises de médicaments, la vaccination, le signe de danger, les rendez-vous. Le texte français se modifie ; la **version parlée** s'enregistre au micro ou s'envoie en fichier, en fon, adja, yoruba, bariba ou dendi. Chez les familles, « Écouter » joue l'enregistrement dans la langue de la personne qui tient le téléphone, sinon la voix du téléphone lit le français.
- L'état de la démo (comptes, carnets, foyers, alertes en cours, salle d'attente) et **« Réinitialiser la démo »** en un clic, pour rejouer les parcours (compte `admin`). La remise à zéro garde les contenus et leurs voix enregistrées.

## Accessibilité

- Audit automatique **axe-core (WCAG 2.1 A et AA)** en production sur 43 écrans (présentation, démo, faux téléphone, connexion, patient, relais, soignant avec agenda, suivis, relais et alertes, pharmacie avec historique et ruptures, pilotage de la zone et du ministère, administration) : **aucune violation**.
- Tout s'écoute (dans sa langue quand le message est enregistré) ; pictogramme et mot ; gros boutons ; lecteur d'écran ; contrastes vérifiés ; tout se fait au clavier.
- Malentendants : tout ce qui s'entend est aussi écrit et dessiné, et les rappels ne les appellent jamais.
- Mouvement : les pages arrivent en cascade, le tampon « VU » tombe, les ondes de la voix respirent, les courbes se tracent et la carte s'allume zone par zone. Seulement transformation et opacité, sans bibliothèque ; tout s'arrête quand le téléphone demande de réduire les animations.

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
