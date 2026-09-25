# Spec de conception — Plateforme e-Santé Bénin (suivi mère-enfant)

- **Date** : 2026-09-25
- **Statut** : validé en brainstorming, en attente de relecture finale
- **Contexte** : Challenge e-Santé Bénin — 3 jours pour livrer une plateforme collaborative de suivi des patients, déployée et testable en live, avec le code sur GitHub.

---

## 1. Objectifs et critères de succès

### Ce que demande le challenge
- Plateforme **fonctionnelle et collaborative** de suivi des patients, reliant patients, soignants et écosystème de santé (établissements, pharmacies, autorités sanitaires).
- **Totalement inclusive** : handicap visuel, handicap auditif, faible alphabétisation.
- Interface claire et accessible, **pensée pour une connectivité limitée**.
- **Gestion de contenu**, même basique, avec des données fictives ou réelles.
- Livrables : **dépôt GitHub** (code complet) + **plateforme déployée** testable en ligne.
- Critères d'évaluation : ① profondeur de la réflexion sur les usages, ② design, ③ fonctionnement, ④ analyse du code.

### Stratégie retenue
Un **socle générique** de suivi des patients, sur lequel se branchent des **programmes de suivi**. Un programme est mis en avant et construit en profondeur : **grossesse et santé mère-enfant**. Un second programme léger (**hypertension**) démontre l'extensibilité.

### Critères de succès (vérifiables)
1. Tous les éléments **P0** (§12) fonctionnent sur l'URL de production.
2. Le **scénario de démo** (§13) se déroule de bout en bout en production en moins de 5 minutes.
3. Score **Lighthouse accessibilité ≥ 95** sur les pages de l'espace patiente et de l'espace relais.
4. Première visite de l'espace patiente **< 300 Ko transférés** (mesuré en « Slow 3G »).
5. CI GitHub Actions verte (lint, typecheck, tests unitaires et d'intégration).
6. README qui présente les usages, les personas, l'architecture et les choix techniques.

---

## 2. Décisions structurantes

| Sujet | Décision | Raison |
|---|---|---|
| Stack | **Next.js (App Router) + TypeScript strict + Tailwind CSS** | Un seul projet, rendu serveur (rapide en 3G, lisible par les lecteurs d'écran), compétence existante |
| Base de données | **PostgreSQL** hébergé sur Coolify + **Drizzle ORM** | Même serveur que l'app, schéma typé, migrations versionnées |
| Hors-ligne | **Approche 1 : PWA tolérante au hors-ligne + file d'envoi** | Couvre le besoin terrain (relais sans réseau) à faible risque ; pas de moteur de synchronisation bidirectionnelle |
| Canal patient sans smartphone | **Accès assisté par le relais + téléphone basique simulé** | Réaliste, sans dépendance à un fournisseur SMS le jour de la démo ; interface `Canal` prête pour un vrai fournisseur |
| Programmes de suivi | **Configuration en code** (`domain/programmes/*.ts`) | Les règles médicales doivent être testées et relues, pas éditées en un clic |
| Gestion de contenu | **Espace admin** pour contenus (texte, audio, pictogramme, par langue), établissements, comptes | Répond à l'exigence « gestion de contenu » du challenge |
| Authentification | **Better Auth** (adaptateur Drizzle) | Bibliothèque reconnue ; téléphone + PIN pour patientes, identifiant + mot de passe pour le personnel |
| Hébergement | **Coolify** (image Docker, Postgres, tâche planifiée, volume) | Choix de l'équipe |
| Équipe | Un développeur + Claude | Dimensionne le périmètre (§12) |

---

## 3. Acteurs et personas

Toutes les personnes et données sont **fictives**.

| Persona | Rôle | Contexte | Besoins |
|---|---|---|---|
| **Awa**, 24 ans, Cotonou | Patiente | Smartphone Android d'entrée de gamme, lit un peu le français | Voir son prochain rendez-vous, écouter les conseils, signaler un problème |
| **Mariam**, 31 ans, village du Zou | Patiente | Téléphone basique, ne lit pas, parle fon | Rappels **vocaux** en fon ; suivie par le relais |
| **Koffi** | Relais communautaire | Smartphone, réseau intermittent | Inscrire les grossesses, savoir qui relancer, saisir sans réseau |
| **Adjoa** | Sage-femme (centre de santé) | PC ou tablette | Saisir les consultations, voir les grossesses à risque et les alertes, prescrire |
| **Pharmacie** | Pharmacien·ne | Comptoir | Retrouver une ordonnance par code, confirmer la délivrance |
| **Zone sanitaire** | Pilotage | Bureau | Indicateurs **anonymisés** par commune |
| **Admin** | Administrateur | — | Gérer contenus, établissements, comptes ; réinitialiser la démo |

---

## 4. Parcours central : la grossesse de Mariam

1. **Inscription** — Koffi crée la fiche de Mariam : nom, langue, village, téléphone et son propriétaire (elle-même / un proche / le relais), date des dernières règles (DDR), antécédents simples. La plateforme calcule le **terme prévu** et génère les **rendez-vous** du programme maternité au centre de santé de rattachement. Un **code court + QR code** est produit pour être collé sur le carnet papier.
2. **Rappel** — J-2 avant chaque rendez-vous, un **message vocal en fon** part vers le téléphone de Mariam (canal simulé, visible dans le faux téléphone).
3. **Consultation** — Adjoa retrouve Mariam par **QR code** (scan caméra via `BarcodeDetector`, repli : saisie du code court) ou par numéro. Elle saisit la consultation prénatale (poids, tension, traitement). Si la tension dépasse le seuil, le statut devient **« grossesse à risque élevé »**.
4. **Ordonnance** — Adjoa émet une ordonnance (fer + acide folique). La pharmacie la retrouve par **code de retrait** et confirme la délivrance ; Adjoa voit que le traitement a été retiré.
5. **Rendez-vous manqué** — Passé le délai de tolérance, Mariam apparaît dans la liste **« à relancer »** de Koffi. Il fait une visite à domicile et la saisit **hors-ligne** ; elle se synchronise au retour du réseau.
6. **Signe de danger** — Mariam (ou Koffi pour elle) appuie sur **« J'ai un problème »** et choisit un pictogramme. Adjoa reçoit une **alerte** ; Mariam entend immédiatement le conseil d'urgence et le numéro à appeler.
7. **Naissance** — Adjoa enregistre l'accouchement. Un dossier **enfant** est créé, lié à la mère, et inscrit au programme **vaccination de l'enfant**.
8. **Pilotage** — La zone sanitaire consulte, par commune et sans nom : taux CPN1 → CPN4, couverture vaccinale, grossesses à risque, alertes.

**Fil collaboratif** : chaque acteur voit ce que les autres ont fait (Koffi voit le risque signalé par Adjoa ; Adjoa voit la délivrance faite par la pharmacie ; la zone sanitaire voit l'agrégat de tout).

---

## 5. Programmes de suivi

Un programme est un objet TypeScript typé qui déclare :
- `code`, `nom`, `dateReference` (ce qui ancre le calendrier : DDR, date de naissance, date de diagnostic) ;
- `etapes` : code, libellé, décalage cible depuis la date de référence, fenêtre de tolérance ;
- `mesures` acceptées (type, unité, bornes plausibles) ;
- `regles` : fonctions pures `(historique) → niveau de risque + motifs` ;
- `fin` : condition de fin (ex. accouchement) et programme de relais éventuel (ex. → enfant).

> ⚠️ Les valeurs ci-dessous sont **indicatives**, inspirées des recommandations usuelles, et servent à une démonstration sur données fictives. Elles doivent être validées par un professionnel de santé avant tout usage réel.

### 5.1 Maternité (programme vedette)
- **Terme prévu** = DDR + 280 jours. Âge gestationnel exprimé en semaines d'aménorrhée (SA).
- **Étapes** (schéma à 4 CPN) :

| Étape | Cible | Fenêtre |
|---|---|---|
| CPN1 | 12 SA | jusqu'à 16 SA |
| CPN2 | 26 SA | 24–28 SA |
| CPN3 | 32 SA | ± 7 jours |
| CPN4 | 36 SA | ± 7 jours |
| Accouchement | 40 SA | — |

  - Si l'inscription a lieu après la fenêtre d'une étape, l'étape est planifiée **au plus tôt** (inscription + 7 jours) ; les étapes dont la fenêtre est entièrement passée ne sont pas générées.
  - Un rendez-vous est **manqué** si aucune consultation liée à son étape n'est enregistrée 7 jours après la date prévue.
- **Règles de risque** (niveaux : `normal`, `surveillance`, `eleve`) :
  - tension systolique ≥ 140 **ou** diastolique ≥ 90 → `eleve` ;
  - signalement de danger non pris en charge → `eleve` + alerte urgente ;
  - âge < 18 ans ou > 35 ans → `surveillance` ;
  - antécédent de césarienne → `surveillance` ;
  - hémoglobine < 11 g/dL (si mesurée) → `surveillance` ;
  - ≥ 2 rendez-vous manqués → `surveillance` + relance prioritaire.
  - Le niveau retenu est le **maximum** des règles déclenchées ; chaque motif est affiché.
- **Signes de danger** (pictogrammes) : saignement, fièvre, maux de tête forts / vision trouble, gonflement du visage ou des mains, bébé qui ne bouge plus, perte des eaux, autre.

### 5.2 Enfant — vaccination
- Référence : date de naissance. Calendrier indicatif :

| Étape | Âge | Vaccins (indicatif) |
|---|---|---|
| Naissance | 0 | BCG, VPO0 |
| 6 semaines | 42 j | Penta1, VPO1, PCV1, Rota1 |
| 10 semaines | 70 j | Penta2, VPO2, PCV2, Rota2 |
| 14 semaines | 98 j | Penta3, VPO3, PCV3, VPI |
| 9 mois | 270 j | RR1, fièvre jaune |
| 15 mois | 450 j | RR2 |

- Manqué : 14 jours après la date prévue sans vaccination enregistrée.

### 5.3 Hypertension (programme de démonstration, P2)
- Référence : date de diagnostic. Consultation tous les 90 jours ; relevé de tension mensuel.
- Règles : ≥ 180/110 → `eleve` ; ≥ 140/90 sur les 2 derniers relevés → `surveillance`.
- **But** : montrer qu'un programme s'ajoute en un fichier, sans toucher au socle.

---

## 6. Architecture

### 6.1 Flux

```
 Navigateur / PWA
   │ en ligne ───────────────► Server Components / Server Actions (Next.js)
   │                                    │
   │ hors-ligne : file d'envoi          ▼
   │ (IndexedDB via Dexie) ──► POST /api/sync ──► domain/ (règles pures) ──► Drizzle ──► Postgres
   │                                    ▲
 Tâche planifiée Coolify ──► POST /api/cron/rappels ──► notifications/Canal ──► messages_sortants ──► faux téléphone
```

### 6.2 Modules

| Module | Responsabilité | Dépend de |
|---|---|---|
| `src/domain/` | Logique métier **pure** : programmes, calendrier, règles de risque, statuts calculés, agrégats statistiques, schémas Zod des événements | Rien (ni Next.js, ni base) |
| `src/server/` | Schéma Drizzle, requêtes, Server Actions, **contrôle d'accès centralisé** (`droits.ts`), configuration Better Auth | `domain/` |
| `src/app/` | Routes et écrans par rôle, routes API | `server/`, `ui/` |
| `src/offline/` | Service worker (Serwist), file d'envoi (Dexie), client de synchronisation, cache de tournée | `domain/` (schémas) |
| `src/notifications/` | Interface `Canal { envoyer(destinataire, message) }` + `CanalSimule` | `server/` |
| `src/ui/` | Composants accessibles réutilisables : `BoutonAudio`, `Picto`, `PavePin`, `DateRelative`, `IndicateurSync`, `BandeauHorsLigne` | — |
| `src/i18n/` | Dictionnaire typé des libellés d'interface (fr, fon, yo) | — |

### 6.3 Arborescence cible

```
src/
  app/
    connexion/            demo/ (comptes de démo, faux téléphone, déclencher rappels)
    patiente/             relais/           soignant/
    pharmacie/            pilotage/         admin/
    api/auth/[...all]/    api/sync/         api/cron/rappels/
  domain/
    programmes/ (types.ts, maternite.ts, enfant.ts, hypertension.ts, index.ts)
    calendrier.ts  risque.ts  statuts.ts  statistiques.ts  evenements.ts
  server/
    db/ (schema.ts, client.ts)   droits.ts   auth.ts
    patients.ts  evenements.ts  ordonnances.ts  contenus.ts  rappels.ts
  offline/ (sw.ts, file-envoi.ts, sync-client.ts, tournee.ts)
  notifications/ (canal.ts, canal-simule.ts)
  ui/   i18n/
drizzle/            (migrations)
scripts/seed.ts     (données de démo)
tests/e2e/          (Playwright)
Dockerfile   docker-compose.yml (Postgres local)   .github/workflows/ci.yml
```

### 6.4 Choix techniques
- **Gestionnaire de paquets** : pnpm.
- **Rendu** : Server Components par défaut ; Client Components uniquement pour l'interactivité (audio, PIN, scan QR, écrans de tournée hors-ligne).
- **Alertes soignant** : polling toutes les 30 s (plus robuste qu'une connexion persistante sur réseau instable).
- **Identifiants** : UUID v7 générés côté client pour les événements et les entités créées hors-ligne (patiente inscrite par le relais, enfant à la naissance).
- **QR code** : génération avec la bibliothèque `qrcode` ; lecture via l'API `BarcodeDetector` (Chrome Android), repli sur la saisie du code court.
- **Audio** : MP3 mono ~24 kbit/s (≈ 3 Ko/s, lisible sur tous les navigateurs), chargé à la demande, mis en cache par le service worker.

---

## 7. Modèle de données

### 7.1 Principes
1. **Journal d'événements en ajout seul** : tout fait de terrain est une ligne d'`evenements`, jamais modifiée.
2. **Statuts calculés, jamais stockés** : rendez-vous honoré/manqué, niveau de risque, ordonnance délivrée, alerte prise en charge sont dérivés du journal par `domain/`.

### 7.2 Tables

| Table | Colonnes principales |
|---|---|
| `communes` | id, nom, departement |
| `etablissements` | id, nom, type (`centre_sante` \| `pharmacie`), commune_id, telephone |
| `utilisateurs` (+ tables Better Auth) | id, nom, role (`patiente` \| `relais` \| `soignant` \| `pharmacie` \| `pilotage` \| `admin`), etablissement_id?, commune_id?, patient_id? |
| `patients` | id (uuid), nom, prenom, date_naissance, sexe, langue (`fr` \| `fon` \| `yo`), canal_prefere (`vocal` \| `sms` \| `visuel`), village, commune_id, telephone?, proprietaire_telephone (`elle_meme` \| `proche` \| `relais`), code_court (unique), relais_id?, etablissement_id, mere_id?, antecedents (jsonb), cree_le |
| `inscriptions` | id, patient_id, programme_code, date_reference, active, cree_le |
| `rendez_vous` | id, inscription_id, etape_code, date_prevue, etablissement_id |
| `evenements` | id (uuid client), patient_id, inscription_id?, type, auteur_id, survenu_le, recu_le, donnees (jsonb validé par Zod selon `type`) |
| `ordonnances` | id, patient_id, prescripteur_id, lignes (jsonb : médicament, posologie, durée), code_retrait (6 car., unique), emise_le |
| `contenus` | id, code (unique), categorie (`conseil` \| `rappel` \| `danger` \| `interface`), pictogramme, programme_code? |
| `contenus_traductions` | contenu_id, langue, texte, audio_url?, video_signes_url? |
| `messages_sortants` | id, patient_id, telephone, canal (`vocal` \| `sms`), contenu_id, langue, statut (`envoye` \| `echec`), cree_le, tentatives |

### 7.3 Types d'événements (validés par Zod)

| Type | Données | Effets calculés |
|---|---|---|
| `consultation_prenatale` | etape_code, poids_kg, tension_sys, tension_dia, hauteur_uterine_cm?, hb_g_dl?, traitements[], notes? | honore le RDV de l'étape ; alimente les règles de risque |
| `visite_domicile` | motif, constat, orientation_centre (bool) | visible par la sage-femme |
| `mesure` | type (`tension` \| `poids` \| `glycemie`), valeurs | alimente les règles |
| `signalement_danger` | signes[], source (`patiente` \| `relais`) | crée une alerte ouverte |
| `prise_en_charge_alerte` | signalement_id, action | ferme l'alerte |
| `accouchement` | date, lieu, issue, enfant { id, sexe, poids_kg } | termine le programme maternité ; crée le patient enfant + son inscription |
| `vaccination` | etape_code, vaccins[] | honore l'étape vaccinale |
| `delivrance` | ordonnance_id | marque l'ordonnance délivrée |

### 7.4 Données de démo (`scripts/seed.ts`)
3 communes, 2 centres de santé, 1 pharmacie, 3 relais, 2 sages-femmes, ~40 patientes avec un historique réaliste (grossesses à différents stades, RDV manqués, risques, naissances, vaccinations), contenus (conseils et signes de danger) en fr/fon/yo. Commande `pnpm db:seed` et bouton admin **« Réinitialiser la démo »**.

---

## 8. Accessibilité et inclusion

### Handicap visuel
- HTML sémantique (titres ordonnés, landmarks, labels) ; ARIA seulement si le HTML ne suffit pas.
- Navigation complète au clavier, focus toujours visible, lien d'évitement.
- Contraste ≥ AA partout, visé AAA dans l'espace patiente ; zoom 200 % sans casse ; `prefers-reduced-motion` respecté.
- Changements d'état annoncés via `aria-live` (« Alerte envoyée », « 3 saisies en attente »).
- Test manuel avec **TalkBack** (Android).

### Handicap auditif
- Aucune information uniquement sonore : chaque audio a son texte et son pictogramme.
- `canal_prefere` sur la fiche patiente : une patiente sourde ne reçoit pas d'appel vocal.
- Champ `video_signes_url` prévu dans les contenus (non rempli pendant le challenge).

### Faible alphabétisation
- Espace patiente **audio + pictogrammes d'abord** : 4 grands boutons (📅 Mon rendez-vous, 🆘 J'ai un problème, 🔊 Mes conseils, 👶 Mon bébé).
- Bouton 🔊 sur chaque écran et chaque élément.
- Dates relatives et lues (« dans 2 jours, mardi »).
- Choix de la langue à l'oreille : chaque bouton prononce le nom de sa langue.
- Connexion par **numéro + code à 4 chiffres** sur un grand pavé numérique.
- **Mode assisté** : le relais ouvre l'espace de la patiente sur son téléphone et lui fait écouter les messages.
- Libellés écrits en français par défaut ; fon et yoruba si traduits ; l'audio prime.

### Connectivité limitée
- Polices système, pictogrammes SVG inline, pas de photos.
- JavaScript minimal (Server Components).
- Audio chargé à la demande puis mis en cache.
- Budget : **< 300 Ko** à la première visite de l'espace patiente ; visites suivantes servies par le cache.

### Production de l'audio
- Français : synthèse vocale.
- Fon et yoruba : enregistrements par des locuteurs natifs si disponibles ; sinon, modèle de synthèse open source multilingue (ex. MMS-TTS), après vérification de la qualité ; à défaut, repli explicite sur texte + pictogramme.

---

## 9. Hors-ligne, synchronisation et erreurs

### 9.1 Périmètre hors-ligne
| Espace | Sans réseau |
|---|---|
| Relais | Complet : consulter sa tournée, saisir visites, mesures, signalements, inscriptions |
| Patiente | Consulter calendrier et conseils (audio déjà écoutés), signaler un problème |
| Soignant, pharmacie, pilotage | Lecture seule des pages déjà vues, avec bandeau « hors-ligne — données du JJ/MM à HHhMM » |

### 9.2 Mécanique
- **Service worker (Serwist)** : précache de l'enveloppe applicative ; pages en *network-first* avec repli cache ; audio en *cache-first* ; page de repli hors-ligne.
- **« Préparer ma tournée »** : télécharge les patientes du relais et leurs dossiers dans IndexedDB (Dexie). Les écrans de tournée lisent cette copie locale.
- **File d'envoi** : chaque saisie y est d'abord écrite (id UUID v7, type, données, `survenu_le`, tentatives, dernière erreur). Envoi au retour du réseau (`online`), à l'ouverture, toutes les 30 s en ligne, ou via « Envoyer maintenant ». Background Sync utilisé en bonus si disponible.
- **`POST /api/sync`** : lot d'événements ; validation Zod + contrôle d'accès par événement ; insertion `ON CONFLICT (id) DO NOTHING` (idempotent). Réponse par événement : `accepte` \| `deja_recu` \| `refuse` + motif.
- Les événements **refusés ne sont jamais perdus** : ils restent dans une liste « à corriger » avec l'explication.
- `survenu_le` vient de l'appareil ; une date dans le futur est ramenée à `recu_le`.

### 9.3 Signe de danger sans réseau (règle de sécurité)
Ne **jamais** laisser croire qu'une alerte est partie si elle ne l'est pas :
- sans réseau : « ⚠️ Pas de réseau — l'alerte n'est pas encore partie. Allez au centre de santé ou appelez le [numéro]. » (texte + picto + audio) ;
- conseil d'urgence et numéro du centre affichés **immédiatement**, sans attendre le serveur ;
- confirmation « ✅ La sage-femme a reçu votre alerte » uniquement après accusé du serveur.

### 9.4 Erreurs
- Server Actions : résultat typé `{ ok: true, data } | { ok: false, erreur }` ; messages en français simple (+ audio et picto côté patiente).
- Validation Zod à toutes les frontières (formulaires, sync, cron).
- `error.tsx` par espace, avec bouton « Réessayer ».
- Échec d'envoi d'un rappel : statut `echec`, nouvelle tentative au passage suivant.
- Déconnexion du relais bloquée tant que la file d'envoi n'est pas vide ; les données locales sont effacées à la déconnexion.
- Session expirée pendant l'envoi : la file est conservée, reconnexion demandée, puis reprise.
- Journaux serveur sur la sortie standard (collectés par Coolify).

---

## 10. Sécurité et confidentialité

| Rôle | Accès |
|---|---|
| Patiente | Uniquement son dossier et celui de ses enfants |
| Relais | Les patientes dont il est référent |
| Soignant | Les patientes rattachées à son établissement ; alertes de son établissement |
| Pharmacie | Une ordonnance retrouvée par son code de retrait (pas le dossier) |
| Pilotage | Agrégats uniquement ; un chiffre portant sur moins de 5 personnes est masqué |
| Admin | Contenus, établissements, comptes, réinitialisation de la démo |

- Contrôle d'accès centralisé dans `server/droits.ts`, appelé par chaque action et par `/api/sync`.
- Mots de passe et PIN hachés (Better Auth) ; **verrouillage après 5 PIN erronés** (15 minutes) pour contrer la force brute sur 4 chiffres.
- HTTPS obligatoire (certificat géré par Coolify).
- Chaque événement porte son auteur : traçabilité complète.
- **Uniquement des données fictives** pendant le challenge.

---

## 11. Tests, CI et déploiement

### Tests
| Niveau | Outil | Portée |
|---|---|---|
| Unitaires | Vitest | Tout `domain/`, en TDD : terme, calendrier, fenêtres, règles de risque, statuts calculés, statistiques et masquage < 5 |
| Intégration | Vitest + Postgres (Docker) | `/api/sync` (idempotence, refus motivé), `droits.ts` (cloisonnement par relais / établissement) |
| Bout en bout | Playwright + `@axe-core/playwright` | ① inscription par le relais → calendrier créé ; ② signalement → alerte chez la sage-femme ; ③ saisie hors-ligne (`context.setOffline`) → reconnexion → synchronisation ; contrôle axe sur chaque écran traversé |

### CI (GitHub Actions)
ESLint, `tsc --noEmit`, tests unitaires et d'intégration (service Postgres) à chaque push.

### Déploiement Coolify
- Image Docker multi-étapes, Next.js `output: 'standalone'`.
- Service Postgres Coolify ; variables `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `CRON_SECRET`.
- Migrations Drizzle appliquées au démarrage du conteneur.
- Tâche planifiée quotidienne : `POST /api/cron/rappels` avec en-tête secret.
- Volume persistant pour les fichiers audio téléversés.
- Déploiement automatique à chaque push sur `main`, **opérationnel dès le jour 1**.
- Nom de domaine pointant vers le serveur (requis pour HTTPS et la PWA).

---

## 12. Périmètre et priorités

| Priorité | Contenu |
|---|---|
| **P0 — indispensable** | Déploiement ; auth + comptes de démo ; relais : inscription, liste « à relancer », tournée hors-ligne ; soignant : fiche, consultation, risque, alertes ; patiente : espace accessible, « J'ai un problème » ; rappels + faux téléphone ; admin contenus (+ audio) |
| **P1 — important** | Ordonnances + pharmacie ; pilotage ; naissance → programme enfant (vaccins) |
| **P2 — bonus** | Programme hypertension ; messagerie vocale patiente ↔ soignant ; vidéos en langue des signes |

### Plan des 3 jours
| Jour | Contenu |
|---|---|
| **J1 — Fondations** | Scaffold, Docker, **déploiement Coolify avant midi** ; schéma + seed ; auth + comptes de démo ; `domain/` maternité en TDD ; relais : inscription + « à relancer » ; soignant : fiche, consultation, risque |
| **J2 — Collaboration et inclusion** | Espace patiente (pictos, audio, PIN) + signalement → alertes ; ordonnances → pharmacie ; rappels + faux téléphone + cron ; **hors-ligne relais** ; admin contenus + téléversement audio |
| **J3 — Finition et preuves** | Pilotage ; naissance → vaccins ; programme hypertension ; audit accessibilité (axe, TalkBack, Lighthouse) et test 3G ; README ; scénario de démo ; marge |

### Hors périmètre (perspectives citées dans le README)
- Vrais SMS / appels vocaux / USSD via un fournisseur.
- Interopérabilité avec le système d'information sanitaire national (ex. export DHIS2, FHIR).
- Téléconsultation vidéo, paiement, application native.

---

## 13. Scénario de démo (≈ 5 minutes, en production)

1. **Comptes de démo** → Koffi (relais). Couper le réseau. Inscrire Mariam, saisir une visite. Indicateur « 2 saisies en attente ».
2. Rétablir le réseau → synchronisation visible.
3. **Adjoa** (sage-femme) : Mariam apparaît ; scanner/saisir son code ; consultation avec tension 150/95 → **risque élevé** avec motif.
4. Émettre une ordonnance → **Pharmacie** : retrouver par code, délivrer → Adjoa voit « délivrée ».
5. **Démo → Déclencher les rappels** → le faux téléphone de Mariam reçoit un message vocal en fon.
6. **Awa** (patiente, PIN) : « J'ai un problème » → saignement → chez Adjoa, l'alerte apparaît en moins de 30 s.
7. **Pilotage** : indicateurs par commune.
8. Montrer `domain/programmes/hypertension.ts` : un programme ajouté en un fichier.

---

## 14. Questions ouvertes
- **Audio fon/yoruba** : enregistrements par des locuteurs natifs ou synthèse — à trancher lors de la production des contenus (J2).
- **Nom de domaine** pour le déploiement Coolify — à fournir avant le déploiement (J1 matin).
- **Nom du produit** — provisoire : « e-Santé Bénin ».
