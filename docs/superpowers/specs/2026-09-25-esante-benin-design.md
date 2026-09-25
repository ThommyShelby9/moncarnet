# Spec de conception : Mon Carnet, le carnet de santé familial qui parle

- **Date** : 25 septembre 2026 (version 2, remplace la version du matin)
- **Nom** : **Mon Carnet** (choisi le 25/09/2026). Adresse : **`https://moncarnet.kheios.com`**.
- **Nom et adresse configurables** : le nom affiché vient de `NEXT_PUBLIC_APP_NAME` et l'adresse de `APP_URL`. Changer de nom ne demande que ces deux réglages, l'entrée DNS et l'URL du webhook WhatsApp chez Meta.
- **Contexte** : Challenge e-Santé Bénin. 3 jours pour livrer une plateforme collaborative de suivi des patients, en ligne et testable par le jury, avec le code sur GitHub.
- **Documents liés** :
  - [Synthèse de recherche sur les usages](../../recherche/2026-09-25-synthese-usages.md)
  - [Recherche design](../../recherche/2026-09-25-recherche-design.md)
  - [Maquettes validées](../../design/maquettes-validees.html)

---

## 1. Objectifs et critères de succès

### Ce que demande le challenge
- Une plateforme **fonctionnelle et collaborative** de suivi des patients, qui relie patients, soignants et écosystème de santé (établissements, pharmacies, autorités).
- **Totalement inclusive** : handicap visuel, handicap auditif, faible alphabétisation.
- Pensée pour une **connectivité limitée**, avec une **gestion de contenu**.
- Livrables : dépôt GitHub et plateforme déployée.
- Critères du jury : ① réflexion sur les usages, ② design, ③ fonctionnement, ④ code.

### Notre réponse en une phrase
Un **carnet de santé familial qui parle** : chaque personne (adulte, enfant, personne âgée, femme enceinte, malade chronique) a son carnet ; un même téléphone peut gérer les carnets de toute la famille ; tout s'écoute dans sa langue ; les rappels arrivent sur WhatsApp, par SMS, par appel ou par le relais communautaire.

### Critères de succès vérifiables
1. Tous les éléments **indispensables** (§14) fonctionnent sur l'URL de production.
2. Le **scénario de démo** (§15) se déroule de bout en bout en production en 6 minutes au plus.
3. Un vrai rappel **WhatsApp** part vers un téléphone de test, et la réponse « Je viendrai » apparaît dans la plateforme.
4. Score **Lighthouse accessibilité ≥ 95** sur l'accueil patient, la prise de rendez-vous et la tournée du relais.
5. Accueil patient **< 300 Ko** à la première visite en 3G lente simulée.
6. Vérifications automatiques GitHub vertes (style, types, tests unitaires et d'intégration).
7. README qui présente les usages, les personnages, l'architecture, les choix et leurs sources.

---

## 2. Décisions structurantes

| Sujet | Décision | Raison |
|---|---|---|
| Public | **Tout le monde**, organisé en carnets individuels et en foyers | Demande explicite ; un téléphone sur six est partagé dans le foyer |
| Stack | Next.js (App Router) + TypeScript strict + Tailwind CSS | Un seul projet, pages rendues côté serveur, compétence existante |
| Données | PostgreSQL sur Coolify + Drizzle ORM | Même serveur que l'app, schéma typé, migrations versionnées |
| Hors-ligne | Application installable tolérante au hors-ligne, avec **file d'envoi** | Couvre le relais sans réseau, à faible risque |
| Canaux | **WhatsApp réel** (API officielle de Meta) + SMS et appel vocal **simulés** + relais | 34 % des femmes seulement ont un téléphone connecté : WhatsApp ne peut pas être seul |
| Programmes de suivi | Configuration **dans le code** (`domain/programmes/*.ts`) | Règles médicales testées et relues |
| Gestion de contenu | Espace admin : contenus (texte, audio, pictogramme, par langue), établissements, plages de rendez-vous, comptes | Exigence du challenge |
| Authentification | Module maison : empreintes scrypt, sessions en base, cookie httpOnly ; patients : téléphone + code à 4 chiffres ; personnel : identifiant + mot de passe | Nos patients n'ont pas d'e-mail (Better Auth en exige un) ; verrouillage après 5 essais géré directement et entièrement testé |
| Bases de données | **Postgres local** (16) en développement, **PGlite** en mémoire pour les tests, Postgres sur Coolify en production | Pas de Docker en local ; tests isolés et sans configuration ; même schéma et mêmes migrations partout |
| Police | **Fira Sans** auto-hébergée (sous-ensemble woff2, `next/font/local`) | Google Fonts affiche mal les tons du fon |
| Pictogrammes | **Health Icons** (CC0) pour la santé, **Phosphor** (MIT) pour l'interface | Libres, conçus pour la santé publique |
| Hébergement | Coolify (Docker, Postgres, tâches planifiées, volume) sur **`moncarnet.kheios.com`** en HTTPS | Choix de l'équipe ; HTTPS requis pour l'app installable et le webhook WhatsApp |

---

## 3. Personnages

Toutes les personnes et données sont **fictives**. La démo se passe à **Bohicon** (Zou), où l'on parle surtout fon. Les noms visibles sur les maquettes sont indicatifs : cette liste fait foi.

| Personnage | Profil | Ce que la plateforme lui apporte |
|---|---|---|
| **Codjo Houngbo**, 58 ans | Hypertension. Smartphone, lit un peu, parle fon. Gère sur son téléphone les carnets de sa femme **Mariam Houngbo** (54 ans) et de leur petit-fils **Sèna** (8 mois) | Rappel de prise de médicament, rendez-vous de contrôle, vaccins de Sèna, tout à écouter en fon |
| **Awa Hounkpatin**, 24 ans | Enceinte de 32 semaines, Cotonou puis Bohicon. Smartphone, WhatsApp | Suivi de grossesse, bouton « J'ai un problème » |
| **Afiavi Dossou**, 31 ans | Enceinte de 29 semaines, village de Sèhoun, a manqué sa 2ᵉ consultation. **Téléphone basique**, ne lit pas | Rappels par SMS et appel vocal, suivie par le relais |
| **Rachida Salifou**, 71 ans | Diabète, **malvoyante**. Vit avec sa fille, qui l'aide | Lecteur d'écran, voix, médicaments apportés par le relais |
| **Koffi Agbessi** | Relais communautaire de Sèhoun. Smartphone, réseau intermittent | Tournée par foyer sans réseau, visites dictées, inscriptions |
| **Adjoa Gbaguidi** | Sage-femme au centre de santé de Bohicon | Poste « Aujourd'hui » : consultations, alertes, salle d'attente |
| **Firmin Akpovi** | Infirmier au centre de santé de Bohicon | Consultations générales et suivi de la tension |
| **Pharmacie Sainte-Rita** | Bohicon | Ordonnance par code, posologie dessinée, délivrance |
| **Zone sanitaire de Bohicon** (fictive) | Autorité | Indicateurs anonymes |
| **Administrateur** | — | Contenus, plages, comptes, réinitialisation de la démo |

---

## 4. Parcours

### 4.1 L'accueil « une chose à la fois » (Codjo)
1. Codjo ouvre l'application : en haut, les **avatars de sa famille** (lui, Mariam, Sèna) pour changer de carnet.
2. Une **grande carte** montre ce qu'il faut faire maintenant : « Ce soir : 1 comprimé pour la tension », avec un bouton **écouter** (en fon) et **« C'est fait » / « Plus tard »**.
3. En glissant, les cartes suivantes : le rendez-vous de jeudi, le message du centre, le prochain vaccin de Sèna.
4. En dessous : la carte « ensuite », le bouton rouge **« J'ai un problème »**, la barre de navigation (Accueil, Rendez-vous, Mon carnet, Famille).

Les cartes du jour sont calculées par `domain/` à partir des traitements en cours, des rendez-vous, des messages et des programmes.

### 4.2 Prendre rendez-vous en 4 étapes (Codjo pour Sèna)
1. **Pour qui ?** Les membres du carnet familial.
2. **Pour quoi ?** Des grandes tuiles : consultation, vaccin, fièvre, tension, grossesse, dents. Chaque tuile a son bouton écouter.
3. **Quel jour ?** Une liste de jours avec les soleils (« dans 2 jours ») et le nombre de places. Un jour complet propose la **liste d'attente**.
4. **Confirmation** : récapitulatif à écouter, puis rendez-vous enregistré et confirmation envoyée par le canal préféré.

Réserver demande du réseau. Sans réseau, l'écran le dit et propose de demander au relais.

### 4.3 Rappels et relances en cascade
1. **J-2 à 9 h** : si la personne a WhatsApp et y a consenti, modèle WhatsApp en français « Rappel pour Sèna : vaccin mercredi 16 octobre, le matin, au centre de santé de Bohicon », avec les boutons **Je viendrai / Je ne peux pas / Écouter en fon**.
2. « Écouter en fon » ouvre une fenêtre de 24 h : la plateforme envoie la **note vocale** en fon.
3. « Je ne peux pas » libère la place et propose un autre jour. « Je viendrai » confirme.
4. **Pas de WhatsApp, ou pas remis sous 2 h** : SMS (simulé). **Pas de réponse la veille** : appel vocal (simulé, priorité « Important »). **Rendez-vous manqué, ou deux échecs d'envoi** : la personne apparaît dans la tournée du relais.

### 4.4 Le jour J : salle d'attente (priorité « Important »)
1. À l'accueil du centre, la personne reçoit un **numéro de passage** (ou le relais l'a pré-enregistrée).
2. Quand il ne reste que 2 personnes avant elle, elle reçoit « C'est bientôt votre tour » par son canal.
3. Le soignant appelle le suivant d'un clic. **Une urgence passe toujours devant.**

### 4.5 Consultation et risque (Firmin et Codjo)
1. Firmin retrouve Codjo par le QR code du carnet, son numéro ou son nom.
2. Il saisit la consultation : tension 180/110. La règle du programme hypertension passe le risque à **élevé**, avec le motif affiché.
3. Il émet une **ordonnance** avec une posologie structurée (matin, midi, soir, durée).

### 4.6 Pharmacie
1. La pharmacie tape le **code de 6 caractères**. Elle voit l'ordonnance, jamais le dossier.
2. La posologie s'affiche **en images** (soleil levant, soleil, lune et nombre de comprimés).
3. « Délivrance confirmée » : le tampon apparaît côté soignant, les prises s'ajoutent aux cartes du jour du patient, et l'**explication audio** part dans sa langue.

### 4.7 Signe de danger (Awa)
1. « J'ai un problème », puis un pictogramme : saignement, fièvre, maux de tête, gonflement, bébé qui ne bouge plus, perte des eaux, douleur, autre.
2. Une alerte arrive au centre de rattachement avec un **compte à rebours de 15 minutes**. Si personne ne la prend en charge, elle **remonte** à un autre soignant de l'établissement, puis au relais (remontée : priorité « Important »).
3. Sans réseau : l'écran dit clairement que l'alerte n'est pas partie et affiche le numéro du centre et le conseil d'urgence (§10.3).

### 4.8 Tournée du relais (Koffi)
1. « Préparer ma tournée » télécharge les **foyers** qu'il suit.
2. La liste « à voir aujourd'hui » dit pourquoi passer : rendez-vous manqué, rappels sans réponse, tension haute signalée, médicaments à apporter, consigne du soignant.
3. Il coche la visite et la **raconte au micro** (note vocale), ou remplit un formulaire court. Tout part au retour du réseau.
4. Il peut **inscrire une personne** : nouveau-né, femme enceinte, malade chronique, personne âgée.

### 4.9 Grossesse (Afiavi) et naissance
1. Inscription par le relais ou par la sage-femme lors de la 1ʳᵉ consultation. Le calendrier des consultations prénatales est généré.
2. À l'accouchement, un **carnet enfant** est créé, rattaché au foyer, et le programme de vaccination démarre.

### 4.10 Pilotage
La zone sanitaire voit, par commune et sans aucun nom : part des femmes qui vont jusqu'à la 4ᵉ consultation, couverture vaccinale, part des hypertendus contrôlés, délai moyen de prise en charge des alertes. Un chiffre portant sur moins de 5 personnes est masqué.

---

## 5. Programmes de suivi

Un programme est un objet TypeScript typé : `code`, `nom`, `dateReference`, `etapes` (décalage cible + fenêtre), `mesures` acceptées, `regles` (fonctions pures qui donnent un niveau `normal` / `surveillance` / `eleve` et des motifs), `cartesDuJour`, `fin`.

> ⚠️ Valeurs **indicatives**, pour une démonstration sur données fictives. À valider par un professionnel de santé avant tout usage réel.

| Programme | Priorité | Référence | Étapes | Règles de risque |
|---|---|---|---|---|
| **Consultation générale** | Indispensable | — | Aucune : rendez-vous à la demande | — |
| **Hypertension** | Indispensable | Date de diagnostic | Contrôle tous les 90 jours ; relevé de tension mensuel | ≥ 180/110 : élevé ; ≥ 140/90 aux 2 derniers relevés : surveillance ; 2 contrôles manqués : surveillance |
| **Grossesse** | Indispensable | Date des dernières règles (terme = + 280 j) | CPN1 à 12 SA (fenêtre jusqu'à 16), CPN2 à 26 SA (24-28), CPN3 à 32 SA (± 7 j), CPN4 à 36 SA (± 7 j), accouchement à 40 SA | Tension ≥ 140/90 : élevé ; signe de danger non pris en charge : élevé ; âge < 18 ou > 35 : surveillance ; césarienne antérieure : surveillance ; hémoglobine < 11 g/dL : surveillance ; 2 rendez-vous manqués : surveillance |
| **Vaccination de l'enfant** | Indispensable | Date de naissance | Naissance (BCG, VPO0), 6 sem. (Penta1, VPO1, PCV1, Rota1), 10 sem., 14 sem. (+ VPI), 9 mois (RR1, fièvre jaune), 15 mois (RR2) | Manqué 14 jours après la date prévue |
| **Diabète** | Important | Date de diagnostic | Contrôle tous les 90 jours ; glycémie à jeun mensuelle | ≥ 2,5 g/L : élevé ; ≥ 1,26 g/L aux 2 derniers relevés : surveillance |

- **Rendez-vous manqué** : aucune consultation liée à l'étape 7 jours après la date prévue (14 pour les vaccins).
- **Grossesse inscrite tard** : une étape dont la fenêtre est passée est planifiée au plus tôt (inscription + 7 jours) ; les étapes entièrement dépassées ne sont pas générées.
- **Traitements** : une ordonnance délivrée crée un **traitement en cours** (médicament, moments de prise, date de fin), d'où viennent les cartes « Ce soir : 1 comprimé ».

---

## 6. Architecture

### 6.1 Flux

```
 Navigateur / application installable
   │ en ligne ──────────────────► Server Components / Server Actions (Next.js)
   │ hors-ligne : file d'envoi          │
   │ (IndexedDB via Dexie) ──► /api/sync ──► domain/ (règles pures) ──► Drizzle ──► Postgres
   │                                    ▲
 Tâches planifiées Coolify ──► /api/cron/* ──► notifications/ (cascade) ──► WhatsApp Cloud API
                                                          │                  └► SMS / vocal simulés
 Meta ──► /api/whatsapp/webhook (signature vérifiée) ─────┘   (faux téléphone de démo)
```

### 6.2 Modules

| Module | Responsabilité | Dépend de |
|---|---|---|
| `src/domain/` | Logique **pure** : programmes, calendriers, règles de risque, statuts calculés, cartes du jour, places disponibles, file d'attente, cascade de rappels (décision, sans envoi), statistiques, schémas Zod | Rien |
| `src/server/` | Schéma Drizzle, requêtes, Server Actions, **contrôle d'accès centralisé** (`droits.ts`), authentification (`auth/`) | `domain/` |
| `src/notifications/` | Interface `Canal`, `CanalWhatsApp` (Cloud API, par `fetch`), `CanalSmsSimule`, `CanalVocalSimule`, orchestrateur de cascade, webhook | `server/`, `domain/` |
| `src/offline/` | Service worker (Serwist), file d'envoi et copie de la tournée (Dexie), notes vocales stockées localement | `domain/` (schémas) |
| `src/ui/` | Composants de la charte (§8) | — |
| `src/i18n/` | Libellés d'interface typés (fr, fon, adja, yo, bariba, dendi ; français par défaut à l'écrit) | — |
| `src/app/` | Espaces : `/` (patient), `/relais`, `/soignant`, `/pharmacie`, `/pilotage`, `/admin`, `/demo`, routes API | tout ce qui précède |

### 6.3 Routes API
- Connexion et déconnexion : Server Actions (pas de route API dédiée).
- `/api/sante` : état de l'application et de la base (pour Coolify).
- `/api/sync` : réception des lots de la file d'envoi (§10).
- `/api/cron/rappels` (toutes les heures), `/api/cron/alertes` (toutes les minutes, escalade), `/api/cron/liste-attente` (toutes les 15 minutes) : protégées par `CRON_SECRET`.
- `/api/whatsapp/webhook` : `GET` pour la vérification, `POST` avec vérification de `X-Hub-Signature-256` sur le corps brut, réponse 200 immédiate puis traitement, déduplication par identifiant de message.

### 6.4 Audio
- Chaque contenu a, par langue, un fichier **MP3 mono ~24 kbit/s** (lecture web) et un **OGG/Opus ≤ 512 Ko** (note vocale WhatsApp).
- Conversion à l'import dans l'admin avec `ffmpeg-static`. Stockage sur un volume Coolify.
- Messages courts : **moins de 60 secondes**.
- Français en voix de synthèse ; fon et autres langues enregistrés par des locuteurs natifs si possible, sinon synthèse vérifiée ; sinon repli explicite sur texte et pictogramme.

---

## 7. Modèle de données

### 7.1 Principes
1. Les faits de terrain vont dans un **journal d'événements en ajout seul** (`evenements`), jamais modifié : c'est ce qui rend la synchronisation hors-ligne sûre.
2. Les statuts cliniques (rendez-vous honoré ou manqué, niveau de risque, traitement en cours) sont **calculés** par `domain/`.
3. Les états opérationnels qui ne se saisissent qu'en ligne (réservations, file du jour, alertes, messages) sont des tables classiques.

### 7.2 Tables

| Table | Colonnes principales |
|---|---|
| `communes`, `etablissements` | Géographie ; établissement : type (`centre_sante` \| `pharmacie`), commune, téléphone |
| `foyers` | id, nom, village, commune_id, relais_id |
| `patients` | id (uuid), foyer_id, nom, prénom, date_naissance, sexe, langue, canal_prefere (`whatsapp` \| `sms` \| `vocal` \| `relais`), accessibilité (malvoyant, malentendant), code_court (QR du carnet), établissement de rattachement, mère_id |
| `contacts` | patient_id, téléphone, rôle (`principal` \| `secours`), propriétaire (`soi` \| `proche` \| `relais`), vérifié_le |
| `consentements` | patient_id, canal, accordé_le, retiré_le, recueilli_par |
| `comptes` | id, rôle (`patient` \| `relais` \| `soignant` \| `pharmacie` \| `pilotage` \| `admin`), identifiant (téléphone normalisé ou nom d'utilisateur), empreinte du secret, établissement_id, commune_id, échecs de connexion, verrouillé jusqu'à |
| `sessions` | empreinte SHA-256 du jeton, compte_id, expire_le |
| `responsables` | compte_id, patient_id, lien (`soi` \| `conjoint` \| `parent` \| `enfant` \| `aidant`) : le **carnet familial** |
| `inscriptions` | patient_id, programme_code, date_reference, active |
| `modeles_plages` | établissement_id, motif, jour_semaine, début, fin, capacité |
| `creneaux` | établissement_id, motif, date, début, fin, capacité (générés depuis les modèles) |
| `rendez_vous` | patient_id, creneau_id, motif, étape du programme, source (`programme` \| `patient` \| `relais` \| `soignant`), réservé_le, annulé_le |
| `liste_attente` | patient_id, établissement_id, motif, date_souhaitée, créé_le, proposé_le, expire_le, statut |
| `passages` | établissement_id, date, numéro, patient_id, rendez_vous_id, priorité (`normale` \| `urgence`), arrivé_le, appelé_le, terminé_le |
| `alertes` | patient_id, événement de signalement, établissement_id, créée_le, échéance, prise_en_charge_par, prise_en_charge_le, remontée_le |
| `evenements` | id (uuid créé sur l'appareil), patient_id, type, auteur_id, survenu_le, reçu_le, données (jsonb validé par Zod) |
| `ordonnances` | patient_id, prescripteur_id, lignes (médicament, matin, midi, soir, durée en jours), code_retrait, émise_le |
| `messages` | patient_id, contact, canal, sens (`sortant` \| `entrant`), modèle, langue, identifiant WhatsApp (unique), statut (`envoye` \| `remis` \| `lu` \| `ecoute` \| `echec`), erreur, rendez_vous_id, réponse (bouton) |
| `contenus`, `contenus_traductions` | code, catégorie, pictogramme ; par langue : texte, audio MP3, audio OGG, vidéo en langue des signes (facultative) |

### 7.3 Types d'événements

| Type | Données principales |
|---|---|
| `consultation` | motif, étape, mesures (tension, poids, glycémie, hémoglobine…), notes |
| `mesure` | type, valeurs (relevé fait à domicile ou par le relais) |
| `prise_medicament` | traitement, moment (`matin` \| `midi` \| `soir`), statut (`fait` \| `plus_tard`) |
| `visite_domicile` | motif, constat, note vocale (fichier), orientation vers le centre |
| `signalement_danger` | signes[], source (`patient` \| `relais` \| `proche`) |
| `vaccination` | étape, vaccins[] |
| `accouchement` | date, lieu, issue, enfant { id, sexe, poids } |
| `delivrance` | ordonnance_id |
| `inscription` | patient créé hors-ligne par le relais (identifiant créé sur l'appareil) |

### 7.4 Données de démo
Script `pnpm db:seed` et bouton admin **« Réinitialiser la démo »**.
- 2 communes, 1 centre de santé (Bohicon), 1 pharmacie, 2 relais, 1 sage-femme, 1 infirmier.
- Environ 25 foyers et 60 personnes : hypertendus, femmes enceintes, enfants à vacciner, personnes âgées, diabétiques.
- Historique réaliste : visites faites et manquées, risques, naissances, ordonnances délivrées, messages et réponses.
- Des plages sur 3 semaines, dont certaines complètes, pour montrer la liste d'attente.
- Contenus (conseils, rappels, signes de danger, posologies) en français et en fon.

---

## 8. Système de design

Les maquettes validées sont dans [`docs/design/maquettes-validees.html`](../../design/maquettes-validees.html) (à ouvrir dans un navigateur).

### 8.1 Couleurs (une seule charte partout)

| Nom | Valeur | Usage exclusif |
|---|---|---|
| Indigo | `#3B3AD9` (appuyé `#2B2AB0`) | Couleur de la marque : boutons principaux, en-têtes, tampons, éléments actifs |
| Nuit | `#16154A` | Texte |
| Lavande | fond `#F3F3FE`, surfaces `#E8E8FC`, traits `#D6D6F6` | Fonds, surfaces teintées, cartes inactives |
| Soleil | `#FFC21A` (pâle `#FFF2CC`, appuyé `#E09F00`) | Seulement **écouter, parler** et les **moments du jour** (soleils, lune), étiquette « à surveiller » |
| Rouge | `#D92D20` (pâle `#FDECEA`) | Seulement l'**urgence** et le risque élevé |
| Gris texte | `#5D5C7A` | Texte secondaire |

Toutes les valeurs sont des variables de thème Tailwind (`@theme`) : un changement de charte se fait à un seul endroit.

### 8.2 Typographie
- **Fira Sans** 400 et 700, sous-ensemble woff2 (latin étendu, lettres africaines, accents combinants dont caron et circonflexe), chargé par `next/font/local`.
- Échelle mobile : 12, 14, 16, 18, 22, 26, 32 px. Chiffres tabulaires pour les heures et les numéros.

### 8.3 Formes, icônes, motif
- Rayons : 30 px (grandes cartes), 22-24 px (cartes), 16 px (boutons), pastilles rondes. **Pas de bordures** sur les cartes : surfaces teintées.
- Ombres réservées aux éléments qui flottent (bouton d'urgence, téléphone de présentation), teintées d'indigo.
- Pictogrammes pleins : Health Icons (santé), Phosphor (interface).
- **Motif de marque** : les ondes de la voix (cercles concentriques), dans le logo et les en-têtes.
- **Tampon « VU »** (indigo, texture d'encre) sur chaque étape faite : consultation, vaccin, délivrance.

### 8.4 Composants de base (`src/ui/`)
`BoutonEcouter` (rond jaune, lecture, ondes), `CarteDuJour` (pile de cartes glissables), `TuileChoix` (icône + mot + écouter), `Etapes` (barre « 2 sur 4 »), `JourDisponible` (soleils + places), `AvatarsFamille`, `Tampon`, `Ticket`, `EtiquetteRisque`, `BandeauHorsLigne`, `CompteARebours`, `Posologie` (soleil levant / soleil / lune), `BarreNavigation`.

### 8.5 Écrans validés
- **Accueil patient** : version « une chose à la fois ».
- **Prise de rendez-vous** : version « une question par écran » (4 étapes).
- **Carnet de vaccination**, **tournée du relais par foyer**, **poste soignant « Aujourd'hui »** : tels que sur la page des maquettes.
- **Pharmacie, pilotage, admin** : mêmes composants et même charte, dessinés pendant l'implémentation.

---

## 9. Accessibilité et inclusion

### Règles d'interface (issues de la recherche)
1. Toujours **icône + mot + bouton écouter**, jamais d'icône seule.
2. **Une décision par écran** dans les parcours des patients.
3. Deux niveaux de navigation au maximum, rien d'important qui oblige à faire défiler.
4. **Moments de la journée** plutôt que des heures ; **comptage en images**.
5. **Aucune saisie de texte** pour les patients.
6. Confirmation **visuelle, sonore et par vibration** après chaque action, avec annulation possible.
7. **Mode accompagnant** : le relais ou un proche utilise le carnet de la personne.

### Handicap visuel
HTML sémantique, navigation complète au clavier, focus visible, contraste AA au minimum (AAA visé côté patient), zoom à 200 % sans casse, annonces `aria-live`, tests avec **TalkBack**. Pour les personnes malvoyantes, l'écoute démarre dès l'ouverture de l'écran.

### Handicap auditif
Tout audio a son texte et son pictogramme. Le canal préféré évite les appels vocaux. Champ vidéo en langue des signes prévu dans les contenus.

### Connectivité
Pages rendues côté serveur, JavaScript minimal, pictogrammes SVG, audio chargé à la demande puis mis en cache, police mise en cache. Budget : **< 300 Ko** à la première visite.

---

## 10. Hors-ligne, synchronisation et erreurs

### 10.1 Périmètre
| Espace | Sans réseau |
|---|---|
| Relais | Tournée complète : foyers, visites, notes vocales, mesures, signalements, inscriptions |
| Patient | Cartes du jour, carnet, audio déjà écoutés, « C'est fait », signalement (voir §10.3) |
| Prise de rendez-vous | **Réseau nécessaire**, le dit clairement et propose de passer par le relais |
| Soignant, pharmacie, pilotage | Lecture seule des pages déjà vues, avec la date des données |

### 10.2 Mécanique
- Service worker (Serwist) : enveloppe en cache, pages en *network-first* avec repli, audio en *cache-first*.
- « Préparer ma tournée » copie les foyers du relais dans IndexedDB (Dexie).
- **File d'envoi** : chaque saisie reçoit un identifiant UUID v7 créé sur l'appareil. Envoi au retour du réseau, à l'ouverture, toutes les 30 s en ligne, ou sur « Envoyer maintenant ». Les notes vocales sont envoyées comme fichiers liés à leur événement.
- `/api/sync` : validation Zod et droits événement par événement, insertion idempotente (`ON CONFLICT (id) DO NOTHING`), réponse `accepte` / `deja_recu` / `refuse` + motif. **Rien n'est perdu en silence** : les refus restent dans une liste « à corriger ».

### 10.3 Signe de danger sans réseau
Ne **jamais** laisser croire qu'une alerte est partie : message « l'alerte n'est pas encore partie », numéro du centre et conseil d'urgence affichés tout de suite (texte, pictogramme, audio). La confirmation « le centre a reçu votre alerte » n'apparaît qu'après la réponse du serveur.

### 10.4 Erreurs
- Server Actions : résultat typé `{ ok: true, data } | { ok: false, erreur }`, messages en français simple (et audio côté patient).
- Validation Zod à toutes les entrées (formulaires, sync, cron, webhook).
- Une page d'erreur par espace, avec « Réessayer ».
- Échec d'envoi d'un message : statut `echec` avec le code d'erreur, puis canal suivant de la cascade.
- Déconnexion du relais bloquée tant que la file d'envoi n'est pas vide ; données locales effacées à la déconnexion.

---

## 11. Canaux et WhatsApp

- **Accès** : WhatsApp Cloud API de Meta, en direct, par `fetch` (le SDK officiel est archivé). Pour la démo : **numéro de test** Meta (gratuit, sans vérification d'entreprise, 5 destinataires au plus d'après des sources tierces). Plan B : une carte SIM neuve enregistrée comme vrai numéro.
- **Modèles** (catégorie *utility*, en français, soumis dès le jour 1 car la validation peut prendre 24 h) :
  1. rappel de rendez-vous, avec les boutons Je viendrai / Je ne peux pas / Écouter en fon ;
  2. relance après un rendez-vous manqué ;
  3. confirmation de rendez-vous.
- **Langues** : le fon et le yoruba ne sont pas disponibles pour les modèles. Le bouton « Écouter en fon » ouvre la fenêtre de 24 h pendant laquelle on envoie la **note vocale** (OGG/Opus, 512 Ko au plus).
- **Contenu neutre** : date, lieu, type de rendez-vous. **Jamais de diagnostic**, car le téléphone peut être partagé.
- **Consentement** explicite, enregistré (§7.2), retrait possible à tout moment.
- **SMS et appel vocal** : simulés dans la démo via l'interface `Canal`, visibles sur le **faux téléphone** (`/demo/telephone`). Un vrai fournisseur se branche plus tard sans toucher au reste.
- **Bibliothèques non officielles interdites** (risque de blocage du numéro).

---

## 12. Sécurité et confidentialité

| Rôle | Accès |
|---|---|
| Patient (compte) | Les carnets dont il est responsable (`responsables`) |
| Relais | Les foyers qui lui sont attribués |
| Soignant | Les patients rattachés à son établissement, ses alertes, sa salle d'attente |
| Pharmacie | Une ordonnance retrouvée par son code, jamais le dossier |
| Pilotage | Agrégats uniquement ; chiffres portant sur moins de 5 personnes masqués |
| Admin | Contenus, plages, établissements, comptes, réinitialisation de la démo |

- Contrôle d'accès centralisé dans `server/droits.ts`, appelé par chaque action, `/api/sync` et le webhook.
- PIN et mots de passe hachés ; **verrouillage après 5 codes erronés** pendant 15 minutes.
- HTTPS obligatoire ; signature WhatsApp vérifiée ; secrets dans les variables d'environnement Coolify.
- Chaque événement porte son auteur : traçabilité complète.
- **Données fictives uniquement** pendant le challenge. En réel : déclaration à l'APDP (données de santé sensibles, loi 2017-20).

---

## 13. Tests, vérifications automatiques et déploiement

| Niveau | Outil | Portée |
|---|---|---|
| Unitaires | Vitest | Tout `domain/`, écrit avant le code : calendriers, règles de risque, cartes du jour, places disponibles, file d'attente, cascade de rappels, statistiques |
| Intégration | Vitest + Postgres (Docker) | `/api/sync` (idempotence, refus motivé), droits, webhook WhatsApp (signature, déduplication, réponse à un bouton), réservation concurrente de la dernière place |
| Bout en bout | Playwright + axe | ① prise de rendez-vous en 4 étapes ; ② signalement puis alerte chez le soignant ; ③ tournée hors-ligne puis synchronisation ; ④ ordonnance puis délivrance. Contrôle d'accessibilité sur chaque écran |

- **GitHub Actions** : ESLint, `tsc --noEmit`, tests unitaires et d'intégration à chaque envoi.
- **Coolify** :
  - image Docker multi-étapes (Next.js `output: 'standalone'`) ;
  - service Postgres ;
  - migrations Drizzle au démarrage ;
  - volume pour l'audio ;
  - tâches planifiées (`/api/cron/*`) ;
  - déploiement automatique à chaque envoi sur `main` ;
  - sous-domaine **`moncarnet.kheios.com`** en HTTPS (requis pour le webhook WhatsApp), avec certificat géré par Coolify.
- Variables d'environnement : `APP_URL`, `NEXT_PUBLIC_APP_NAME`, `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `CRON_SECRET`, `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN`.
- Le nom n'apparaît jamais en dur dans le code, les modèles WhatsApp ni les contenus audio : ceux-ci disent « votre carnet de santé » et « le centre de santé ».

---

## 14. Périmètre et priorités

| Priorité | Contenu |
|---|---|
| **Indispensable** | Déploiement en ligne ; connexion et comptes de démo ; carnet familial ; accueil « une chose à la fois » avec écoute ; programmes consultation générale, hypertension, grossesse, vaccination ; prise de rendez-vous en 4 étapes avec places ; poste soignant « Aujourd'hui » avec consultation, risque et ordonnance ; alertes avec délai de 15 minutes ; **pharmacie** (code, posologie dessinée, délivrance) ; rappels **WhatsApp réels** (modèle, boutons, note vocale, réponses) + SMS simulé + relais dans la cascade ; tournée du relais hors-ligne ; gestion des contenus avec audio ; règles d'accessibilité |
| **Important** | Salle d'attente (numéros de passage, « bientôt votre tour », urgence prioritaire) ; liste d'attente des places libérées ; remontée des alertes non prises en charge ; notes vocales du relais ; appel vocal simulé dans la cascade ; naissance puis carnet enfant ; programme diabète ; pilotage |
| **Bonus** | Export compatible DHIS2 ; version « tableau » de l'accueil dans les réglages ; messagerie vocale patient-soignant ; vidéos en langue des signes |

### Plan
| Moment | Contenu |
|---|---|
| **J1 (25/09), fin de journée** | Création du projet, Docker, **mise en ligne sur Coolify** ; création de l'app Meta et soumission des 3 modèles WhatsApp ; schéma de base de données et données de démo ; `domain/` en TDD (programmes, calendriers, risques) |
| **J2 (26/09)** | Connexion et carnet familial ; accueil « une chose à la fois » ; prise de rendez-vous ; poste soignant (consultation, risque, ordonnance) ; pharmacie ; alertes ; rappels WhatsApp et cascade ; gestion des contenus et audio |
| **J3 (27/09)** | Tournée du relais hors-ligne ; salle d'attente et liste d'attente ; pilotage ; audit d'accessibilité et test en 3G lente ; README et scénario de démo ; marge |

### Hors périmètre (cité comme perspective dans le README)
Vrais SMS, appels vocaux et USSD via un fournisseur ; interopérabilité DHIS2 / FHIR complète ; téléconsultation vidéo ; paiement ; application native.

---

## 15. Scénario de démo (6 minutes, en production)

1. **Codjo**, sur son téléphone : la carte « Ce soir, 1 comprimé », on l'écoute en fon, puis « C'est fait ».
2. Il prend rendez-vous pour **Sèna** en 4 étapes (vaccin, mercredi, 3 places).
3. Menu démo, « Déclencher les rappels » : le **vrai WhatsApp** d'un membre du jury (inscrit à l'avance) reçoit le rappel. Il touche « Écouter en fon », la note vocale arrive. Il répond « Je viendrai », et le statut change dans la plateforme.
4. **Koffi**, relais : on coupe le réseau, il coche la visite du foyer Dossou et la raconte au micro, puis on rétablit le réseau et la synchronisation se voit.
5. **Awa** : « J'ai un problème », saignement. Chez **Adjoa**, l'alerte apparaît avec son compte à rebours, elle la prend en charge.
6. **Firmin** reçoit Codjo : tension 180/110, risque élevé, ordonnance.
7. **Pharmacie** : code, posologie dessinée, délivrance, le tampon apparaît chez Firmin.
8. **Pilotage** : indicateurs par commune. Pour finir, `domain/programmes/diabete.ts` : un programme ajouté en un fichier.

---

## 16. Questions ouvertes
- **Nom du produit** : tranché, **Mon Carnet** (`moncarnet.kheios.com`).
- **Compte Meta et numéro WhatsApp** : à créer par l'équipe dès le jour 1.
- **Sous-domaine de départ** : pour mettre en ligne sans attendre le nom, utiliser un sous-domaine provisoire de `kheios.com`, puis basculer.
- **Enregistrements audio** en fon : locuteurs natifs disponibles ou synthèse.
