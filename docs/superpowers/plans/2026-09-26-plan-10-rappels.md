# Plan 10 : les rappels en cascade (canaux simulés) — plan d'implémentation

> **Pour les agents :** sous-skill requis : superpowers:executing-plans (exécution par moi-même, sans agents). Étapes en cases à cocher (`- [ ]`).

**Objectif :** la cascade de rappels de la spec (§4.3), **sans WhatsApp réel** : l'utilisateur a demandé de laisser Meta de côté. Les canaux sont simulés, et l'écran le dit.
- **À J-2**, un rappel part sur le premier canal de la personne :
  - WhatsApp si elle l'a et y consent (simulé) ;
  - sinon SMS (simulé), ou appel vocal si elle préfère la voix, ou le relais si elle n'a pas de téléphone.
- **Sans réponse**, on relance sur le canal suivant (WhatsApp → SMS → appel vocal → relais). Au bout de la cascade, la personne apparaît dans la tournée du relais : « Rappels sans réponse ».
- **« Je viendrai »** confirme. **« Je ne peux pas »** libère la place et propose un autre jour.
- Contenu **neutre** : date, lieu, « vaccin » ou « rendez-vous ». Jamais de diagnostic, car le téléphone peut être partagé.
- **Le faux téléphone** (`/demo/telephone`, spec §11) montre ce que reçoivent Codjo, Afiavi (téléphone basique) ou Aïcha : bulles WhatsApp, SMS, appel vocal lu à voix haute, et réponse « 1 » ou « 2 ».
- Côté patient : le rappel arrive aussi sur l'accueil, avec « Je viendrai » et « Je ne peux pas ». Côté soignant : l'historique des rappels dans le dossier. Côté admin : « Envoyer les rappels de J-2 » et « Relancer ceux sans réponse ».

**Spec :** §4.3, §4.8 (rappels sans réponse dans la tournée), §11, §12 (contenu neutre, consentement).

## Contraintes globales
- Aucun envoi réel : chaque rappel est enregistré en base et affiché sur le faux téléphone, avec la mention « simulé ».
- Un rappel ne contient jamais le motif médical, seulement « vaccin » ou « rendez-vous ».
- Un rendez-vous ne reçoit pas deux fois le même rappel ; une réponse arrête la cascade.

## Points de vigilance
1. **« Envoyer les rappels » lancé deux fois** : pas de doublon (tâche 2).
2. **Personne sans téléphone** : le rappel va directement au relais (tâche 1).
3. **Réponse « 2 » (je ne peux pas)** : la place est libérée ; une nouvelle réponse sur ce rappel ne change plus rien (tâche 2).

---

### Tâche 1 : la cascade et le texte neutre (domaine)

**Fichiers :** `src/domain/rappels.ts` ; `tests/domain/rappels.test.ts`.

**Interfaces (produit) :**
- `CANAUX_RAPPEL = ["whatsapp", "sms", "vocal", "relais"]`, `type CanalRappel` ;
- `premierCanal({ canalPrefere, telephone, consentements }): CanalRappel` ;
- `canalSuivant(canal): CanalRappel | null` : WhatsApp → SMS → vocal → relais → fin ;
- `texteRappel({ pour, vaccin, date, moment, centre, canal }): string` (neutre ; réponses « 1 » ou « 2 » pour le SMS, touches du clavier pour le vocal) ;
- `LIBELLES_CANAL`.

- [ ] **Tests** :
  - premier canal : WhatsApp avec consentement, sinon SMS ; « vocal » si préféré ; « relais » sans téléphone ou si préféré ;
  - l'ordre de la cascade ;
  - le texte contient la date, le moment, le centre, « vaccin » ou « rendez-vous », jamais « tension », « diabète » ou « grossesse ».
- [ ] **Code** ; commit `feat(rappels): la cascade des canaux et un texte neutre`.

---

### Tâche 2 : envoyer, relancer, répondre (serveur) et la démo

**Fichiers :**
- Modifier : `src/server/db/schema.ts` (table `rappels`)
- Créer : `drizzle/0006_*.sql`, `src/server/rappels.ts`
- Modifier : `src/server/requetes/tournee.ts` (raison « Rappels sans réponse »), `src/domain/tournee.ts` (`EtatPersonne.rappelsSansReponse`), `src/server/demo/semer.ts`
- Tester : `tests/server/rappels.test.ts`, `tests/domain/tournee.test.ts`, `tests/server/requetes/tournee.test.ts`

**Interfaces (produit) :**
- table `rappels` : `id`, `patientId`, `rendezVousId`, `canal`, `telephone`, `contenu`, `envoyeLe`, `statut` (`envoye` | `repondu` | `sans_reponse`), `reponse` (`viendra` | `empeche` | null), `reponduLe` ; unique `(rendezVousId, canal)` ;
- `envoyerRappels(db, { maintenant, aujourdhui }): Promise<{ envoyes: number }>` : les places réservées à J+2 sans rappel reçoivent un rappel sur leur premier canal ;
- `relancer(db, { maintenant, delaiMinutes }): Promise<{ relances: number }>` : chaque rappel « envoyé » depuis plus de `delaiMinutes` sans réponse passe « sans réponse », et un rappel part sur le canal suivant (le relais : aucun message, la personne apparaît dans la tournée) ;
- `repondreRappel(db, { rappelId, reponse, maintenant }): Promise<Resultat<{ reponse }, "introuvable" | "deja_repondu">>` : `empeche` annule la place ;
- `rappelsDe(db, patientIds)`, `messagesDuTelephone(db, telephone)` (faux téléphone), `rappelEnAttente(db, patientIds)` (accueil) ;
- tournée : raison « Rappels sans réponse, à prévenir de vive voix », urgence 1, quand la cascade est arrivée au relais ;
- démo :
  - Afiavi (téléphone basique, SMS) : un SMS puis un appel vocal sans réponse sur sa relance de consultation prénatale manquée, donc « Rappels sans réponse » chez Koffi ;
  - Mariam : un WhatsApp à J-2, répondu « Je viendrai » ;
  - Codjo : un WhatsApp de confirmation au moment de sa réservation.

- [ ] **Tests** :
  - pas de doublon au second envoi ;
  - la relance passe au canal suivant ;
  - le relais en bout de cascade ajoute la raison dans la tournée ;
  - « Je ne peux pas » annule la place ; une seconde réponse est refusée ;
  - le faux téléphone liste les messages d'un numéro, du plus récent au plus ancien.
- [ ] **Code**, migration ; commit `feat(rappels): envoi à J-2, relance en cascade jusqu'au relais, réponse qui libère la place`.

---

### Tâche 3 : les écrans

**Fichiers :**
- Créer : `src/app/demo/telephone/page.tsx`, `src/app/demo/telephone/actions.ts`, `src/app/(patient)/(onglets)/CarteRappel.tsx`
- Modifier : accueil patient, `src/app/(patient)/actions.ts` (`repondreRappelAction`), dossier soignant (section « Rappels »), `src/app/admin/page.tsx` et `src/app/admin/actions.ts` (boutons), `src/app/demo/page.tsx` (lien vers le faux téléphone)
- Tester : `tests/ui/CarteRappel.test.tsx`

- [ ] **Faux téléphone** (mode démo seulement) :
  - choix du numéro (Codjo, Afiavi, Aïcha) ;
  - écran de téléphone : bulles WhatsApp (vertes), SMS (grises), appel vocal (« Écouter l'appel », voix du navigateur), toujours avec « simulé » ;
  - boutons « 1 : Je viendrai » et « 2 : Je ne peux pas » sous le dernier rappel sans réponse.
- [ ] **Accueil** : carte « Rappel » (rendez-vous du rappel en attente) avec « Je viendrai » et « Je ne peux pas » ; après « Je ne peux pas », un lien « Choisir un autre jour ».
- [ ] **Dossier** : les rappels (canal, heure, statut, réponse).
- [ ] **Admin** : « Envoyer les rappels de J-2 », « Relancer ceux sans réponse » (délai 0 pour la démo), avec le bilan.
- [ ] Vérifier dans le navigateur :
  1. admin : envoyer, puis relancer ;
  2. faux téléphone d'Afiavi : le SMS et l'appel ;
  3. Koffi : « Rappels sans réponse » ;
  4. Codjo : il répond « 2 » sur le faux téléphone, et la place est libérée.
- [ ] Commit `feat(rappels): le faux téléphone, la carte de rappel, l'historique chez le soignant, les boutons de l'admin`.

---

### Tâche 4 : README, présentation, mise en ligne

README (section « Rappels en cascade (simulés) »), une phrase sur la page de présentation, suite complète, build, envoi, déploiement, réinitialisation de la démo, vérification en production.
