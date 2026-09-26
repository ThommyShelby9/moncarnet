# Plan 9 : la salle d'attente et l'administration — plan d'implémentation

> **Pour les agents :** sous-skill requis : superpowers:executing-plans (exécution par moi-même, sans agents). Étapes en cases à cocher (`- [ ]`).

**Objectif :**
1. **Salle d'attente** (spec §4.4, « Important ») :
   - la personne qui arrive au centre touche « Je suis arrivé » (rendez-vous du jour ou alerte en cours) et reçoit un **numéro de passage** ;
   - son téléphone dit combien de personnes restent avant elle, puis « C'est bientôt votre tour » (2 personnes ou moins), puis « C'est votre tour » ;
   - le soignant appelle le suivant d'un clic et arrive sur son dossier. **Une urgence (alerte en cours) passe toujours devant.**
   - C'est la réponse au constat des 90 minutes d'attente pour une consultation prénatale.
2. **Administration** : l'état de la démo et un bouton « Réinitialiser la démo », pour rejouer les parcours sans outil.

**Spec :** §4.4, §4.7, §14 ; recherche : temps d'attente [R1], Mozambique [R3].

## Contraintes globales
- Celles des plans précédents. Deux arrivées au même instant n'ont jamais le même numéro ; une personne n'a qu'un numéro par jour et par centre.

## Points de vigilance
1. **Deux personnes arrivent en même temps** : numéros différents (contrainte unique + nouvel essai) (tâche 2).
2. **« Je suis arrivé » touché deux fois** : le même numéro (tâche 2).
3. **Urgence arrivée après les autres** : elle passe devant (tâches 1 et 2).

---

### Tâche 1 : l'ordre de passage (domaine)

**Fichiers :** créer `src/domain/salle-attente.ts` ; tester `tests/domain/salle-attente.test.ts`.

**Interfaces (produit) :**
- `interface Passage { id; patientId; numero; urgent; arriveLe: Date; appeleLe: Date | null }` ;
- `fileDAttente(passages)` : les non appelés, urgences d'abord, puis par numéro ;
- `BIENTOT = 2` ;
- `placeDe(passages, patientId): Place | null`, avec `Place = { etat: "attente"; numero; avant; bientot } | { etat: "appele"; numero }`.

- [ ] **Étape 1 : écrire le test qui échoue**

```ts
import { describe, expect, it } from "vitest";
import { fileDAttente, placeDe, type Passage } from "@/domain/salle-attente";

const arrive = new Date("2026-09-26T08:00:00Z");
const passage = (id: string, numero: number, extra: Partial<Passage> = {}): Passage => ({ id, patientId: `p-${id}`, numero, urgent: false, arriveLe: arrive, appeleLe: null, ...extra });

describe("fileDAttente", () => {
  it("fait passer une urgence devant, puis l'ordre des numéros ; les personnes appelées sortent de la file", () => {
    const file = fileDAttente([passage("a", 3), passage("b", 1, { appeleLe: arrive }), passage("c", 5, { urgent: true }), passage("d", 2)]);
    expect(file.map((p) => p.numero)).toEqual([5, 2, 3]);
  });
});

describe("placeDe", () => {
  const passages = [passage("a", 1, { appeleLe: arrive }), passage("b", 2), passage("c", 3), passage("d", 4), passage("e", 5)];
  it("dit combien de personnes restent avant, et quand c'est bientôt", () => {
    expect(placeDe(passages, "p-e")).toEqual({ etat: "attente", numero: 5, avant: 3, bientot: false });
    expect(placeDe(passages, "p-d")).toEqual({ etat: "attente", numero: 4, avant: 2, bientot: true });
  });
  it("dit quand c'est son tour, et rien à qui n'est pas arrivé", () => {
    expect(placeDe(passages, "p-a")).toEqual({ etat: "appele", numero: 1 });
    expect(placeDe(passages, "p-z")).toBeNull();
  });
});
```

Run : `pnpm vitest run tests/domain/salle-attente.test.ts` → FAIL (module introuvable).

- [ ] **Étape 2 : écrire le code, relancer, commit**

`fileDAttente` : filtre `!appeleLe`, tri `Number(b.urgent) - Number(a.urgent) || a.numero - b.numero`. `placeDe` : son passage, sinon null ; appelé → `{ etat: "appele" }` ; sinon, sa position dans `fileDAttente` = `avant`, `bientot = avant <= BIENTOT`.

Run : PASS. Commit : `feat(salle d'attente): l'ordre de passage, l'urgence d'abord`.

---

### Tâche 2 : arriver, appeler le suivant (serveur) et la démo

**Fichiers :**
- Modifier : `src/server/db/schema.ts` (table `passages`), `src/server/demo/semer.ts`
- Créer : `src/server/salle-attente.ts`, `drizzle/0005_*.sql`
- Tester : `tests/server/salle-attente.test.ts`, `tests/server/demo/semer.test.ts`

**Interfaces (produit) :**
- table `passages` (`etablissementId`, `patientId`, `jour`, `numero`, `urgent`, `arriveLe`, `appeleLe`, `appelePar`), uniques `(etablissement, jour, numero)` et `(etablissement, jour, patient)` ;
- `arriverAuCentre(db, { compteId, patientId, maintenant? }): Promise<Resultat<{ numero: number }, "interdit">>` : urgent si une alerte est en cours ;
- `salleAttente(db, etablissementId, jour): Promise<{ passageId; patientId; numero; prenom; nom; urgent; arriveLe }[]>` : dans l'ordre de passage ;
- `appelerSuivant(db, { soignant, maintenant? }): Promise<Resultat<{ patientId; numero; prenom }, "vide">>` ;
- `placesDuJour(db, patientIds, jour): Promise<Map<string, Place>>` ;
- démo : Mariam a une place réservée ce matin (consultation), pas encore arrivée. Les venues du matin ont un numéro : celles déjà vues sont appelées, les autres attendent.

- [ ] **Étape 1 : écrire les tests qui échouent**

`tests/server/salle-attente.test.ts` :

```ts
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/server/db/client";
import { comptes } from "@/server/db/schema";
import { semerDemo } from "@/server/demo/semer";
import { signalerDanger } from "@/server/patient/signalement";
import { appelerSuivant, arriverAuCentre, placesDuJour, salleAttente } from "@/server/salle-attente";
import { creerDbDeTest } from "../aides/base-de-test";
import { COMPTE, idCompte, idPatient } from "../aides/demo";

const aujourdhui = "2026-09-26";
const maintenant = new Date("2026-09-26T09:30:00Z");
let db: Db;
let fermer: () => Promise<void>;
let firmin: { id: string; etablissementId: string | null };

beforeAll(async () => {
  ({ db, fermer } = await creerDbDeTest());
  await semerDemo(db, { aujourdhui });
  const [c] = await db.select().from(comptes).where(eq(comptes.identifiant, "firmin.akpovi"));
  firmin = { id: c!.id, etablissementId: c!.etablissementId };
});
afterAll(async () => fermer());

describe("salle d'attente", () => {
  it("donne un numéro à qui arrive, le même s'il touche deux fois", async () => {
    const codjo = await idCompte(db, COMPTE.codjo);
    const mariam = await idPatient(db, "Mariam");
    const avant = (await salleAttente(db, firmin.etablissementId!, aujourdhui)).length;
    const r = await arriverAuCentre(db, { compteId: codjo, patientId: mariam, maintenant });
    expect(r.ok).toBe(true);
    expect(await arriverAuCentre(db, { compteId: codjo, patientId: mariam, maintenant })).toEqual(r);
    const salle = await salleAttente(db, firmin.etablissementId!, aujourdhui);
    expect(salle).toHaveLength(avant + 1);
    expect(salle.at(-1)).toMatchObject({ prenom: "Mariam", urgent: false });
    const place = (await placesDuJour(db, [mariam], aujourdhui)).get(mariam);
    expect(place).toMatchObject({ etat: "attente", avant });
  });

  it("refuse un compte qui ne gère pas ce carnet", async () => {
    expect(await arriverAuCentre(db, { compteId: await idCompte(db, COMPTE.awa), patientId: await idPatient(db, "Mariam"), maintenant })).toEqual({ ok: false, erreur: "interdit" });
  });

  it("fait passer devant une personne qui a signalé un danger", async () => {
    const aicha = await idCompte(db, COMPTE.aicha);
    const rachida = await idPatient(db, "Rachida");
    await signalerDanger(db, { compteId: aicha, patientId: rachida, evenementId: randomUUID(), signes: ["fievre"], maintenant });
    await arriverAuCentre(db, { compteId: aicha, patientId: rachida, maintenant });
    expect((await salleAttente(db, firmin.etablissementId!, aujourdhui))[0]).toMatchObject({ prenom: "Rachida", urgent: true });
    expect(await appelerSuivant(db, { soignant: firmin, maintenant })).toEqual({ ok: true, donnees: { patientId: rachida, numero: expect.any(Number), prenom: "Rachida" } });
    expect((await placesDuJour(db, [rachida], aujourdhui)).get(rachida)).toMatchObject({ etat: "appele" });
  });
});
```

Dans `tests/server/demo/semer.test.ts`, ajouter :

```ts
  it("prépare la salle d'attente du jour : des personnes attendent, Mariam a rendez-vous ce matin", async () => {
    await semerDemo(db, { aujourdhui });
    const [mariam] = await db.select().from(patients).where(eq(patients.prenom, "Mariam"));
    const rdvDuJour = await db.select().from(rendezVous).where(and(eq(rendezVous.patientId, mariam!.id), eq(rendezVous.datePrevue, aujourdhui), isNotNull(rendezVous.creneauId)));
    expect(rdvDuJour).toHaveLength(1);
    const lesPassages = await db.select().from(passages).where(eq(passages.jour, aujourdhui));
    expect(lesPassages.filter((p) => p.appeleLe === null).length).toBeGreaterThanOrEqual(2);
    expect(lesPassages.filter((p) => p.appeleLe !== null).length).toBeGreaterThanOrEqual(1);
  });
```

Run → FAIL.

- [ ] **Étape 2 : écrire le code**

Table et migration (`pnpm db:generate --name salle_attente`). Dans `arriverAuCentre` :
1. lien du compte avec le carnet ;
2. centre du patient ;
3. passage existant du jour → son numéro ;
4. urgent = alerte ni prise en charge ni annulée ;
5. jusqu'à 5 essais : `max(numero) + 1`, puis insertion avec `onConflictDoNothing` ; s'il n'y a pas d'insertion, relire le passage du patient (double appui), sinon réessayer.

`appelerSuivant` :
1. prendre le premier de `fileDAttente` parmi les passages du jour du centre ;
2. le marquer (`appeleLe`, `appelePar`) seulement s'il n'est pas déjà appelé ;
3. s'il vient d'être pris, passer au suivant.

Démo, avec un générateur à part (`hasard(20260929)`) :
- une place réservée pour Mariam ce matin (créneau de consultation du matin) ;
- pour chaque venue du matin, un passage : ceux déjà vus sont appelés, les autres arrivés entre 7 h 30 et 9 h.

- [ ] **Étape 3 : relancer les tests, vérifier les types ; commit**

Commit : `feat(salle d'attente): numéro de passage, urgence devant, appeler le suivant ; la démo a sa salle d'attente`.

---

### Tâche 3 : les écrans

**Fichiers :**
- Modifier : `src/app/(patient)/actions.ts` (+ `arriverAction`), `src/app/(patient)/(onglets)/page.tsx` (carte « Je suis arrivé » ou « Votre numéro »), `src/app/soignant/actions.ts` (+ `appelerSuivantAction`), `src/app/soignant/page.tsx` (section « Salle d'attente »), `src/app/soignant/patients/[id]/page.tsx` (message `note=appel`)
- Créer : `src/app/(patient)/(onglets)/CarteSalleAttente.tsx`
- Tester : `tests/ui/CarteSalleAttente.test.tsx`

**Interfaces (produit) :** `CarteSalleAttente({ patientId, prenom, place, peutArriver })`, qui affiche selon le cas :
- « Je suis arrivé(e) au centre » (bouton) ;
- « Votre numéro : N · K personnes avant vous » ;
- « C'est bientôt votre tour » (soleil, vibration) ;
- « C'est votre tour : entrez en consultation » (indigo).

- [ ] **Étape 1 : écrire le test qui échoue**

```tsx
// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/(patient)/actions", () => ({ arriverAction: vi.fn() }));

import { CarteSalleAttente } from "@/app/(patient)/(onglets)/CarteSalleAttente";

afterEach(cleanup);

describe("CarteSalleAttente", () => {
  it("propose de dire qu'on est arrivé", () => {
    render(<CarteSalleAttente patientId="p1" prenom={null} place={null} />);
    expect(screen.getByRole("button", { name: "Je suis arrivé au centre" })).toBeTruthy();
  });

  it("donne le numéro et le nombre de personnes avant", () => {
    render(<CarteSalleAttente patientId="p1" prenom={null} place={{ etat: "attente", numero: 12, avant: 4, bientot: false }} />);
    expect(screen.getByText("12")).toBeTruthy();
    expect(screen.getByText("4 personnes avant vous")).toBeTruthy();
  });

  it("prévient quand c'est bientôt, puis quand c'est son tour", () => {
    const { rerender } = render(<CarteSalleAttente patientId="p1" prenom="Mariam" place={{ etat: "attente", numero: 12, avant: 1, bientot: true }} />);
    expect(screen.getByRole("status").textContent).toContain("C'est bientôt le tour de Mariam");
    rerender(<CarteSalleAttente patientId="p1" prenom="Mariam" place={{ etat: "appele", numero: 12 }} />);
    expect(screen.getByRole("status").textContent).toContain("C'est le tour de Mariam : entrez en consultation");
  });
});
```

Run → FAIL.

- [ ] **Étape 2 : écrire le code**

**Accueil**, pour les personnes affichées :
- si l'une a une place aujourd'hui (`placesDuJour`), la carte de sa place, avec `<Actualisation secondes={15} />` ;
- sinon, si l'une a un rendez-vous réservé aujourd'hui ou une alerte en cours, la carte « Je suis arrivé au centre » ;
- dans les deux cas, la carte passe **au-dessus** de la pile.

**Poste soignant**, colonne de droite, une section « Salle d'attente » :
- nombre de personnes et bouton « Appeler le suivant » ;
- la liste : numéro, nom, badge « Urgence », « arrivé(e) à 9 h 12 » ;
- « Appeler le suivant » ouvre le dossier (`?note=appel&numero=N`) : « N° N appelé : {prénom} entre en consultation. »

- [ ] **Étape 3 : relancer les tests, vérifier les types et le style ; vérifier dans le navigateur ; commit**

Dans le navigateur :
1. Codjo, pour Mariam : « Je suis arrivé » → n° et personnes avant.
2. Firmin : « Appeler le suivant » jusqu'à Mariam.
3. L'accueil de Codjo dit « C'est le tour de Mariam ».

Commit : `feat(salle d'attente): « Je suis arrivé », « C'est bientôt votre tour », « Appeler le suivant »`.

---

### Tâche 4 : l'administration

**Fichiers :** modifier `src/app/admin/page.tsx` ; créer `src/app/admin/actions.ts`.

- [ ] **Étape 1 : écrire le code**

Page `admin`, pour le rôle admin :
- nombres de comptes, de patients, de foyers et d'alertes en cours ;
- un formulaire « Réinitialiser la démo » : case « Je remets toute la démo à zéro » obligatoire, et un bouton ;
- en mode démo seulement (`env.DEMO_MODE`) ;
- l'action appelle `semerDemo(db(), { aujourdhui })`, puis redirige avec `?note=reinitialisee` : « La démo est remise à zéro : les parcours peuvent être rejoués. »

La session de l'admin disparaît avec la table `sessions` vidée : l'action ouvre donc une nouvelle session admin après la réinitialisation.

- [ ] **Étape 2 : vérifier dans le navigateur ; commit**

Commit : `feat(admin): état de la démo et réinitialisation en un clic`.

Puis : README (salle d'attente, administration), suite complète, build, envoi, déploiement, réinitialisation de la démo, vérification en production.
