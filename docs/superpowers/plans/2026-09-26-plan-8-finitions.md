# Plan 8 : finitions utiles — plan d'implémentation

> **Pour les agents :** sous-skill requis : superpowers:executing-plans (exécution par moi-même, sans agents). Étapes en cases à cocher (`- [ ]`).

**Objectif :** trois ajouts qui servent les parcours déjà livrés.
1. **Le prénom du bébé, donné plus tard** : souvent donné lors de la sortie de l'enfant, quelques jours après la naissance. La famille le donne depuis le carnet du bébé, tant qu'il s'appelle « Bébé ».
2. **Les alertes en retard remontent** (spec §14, « Important ») :
   - chez le soignant, une alerte non prise en charge après 15 minutes est marquée « En retard de N min, signalée à la zone sanitaire » ;
   - les agents de l'État voient, en direct et sans nom, combien d'alertes attendent et combien sont en retard.
3. **Audit d'accessibilité** (axe-core) des écrans principaux, et correction des défauts graves.

**Spec :** §4.7, §4.9, §4.10, §9, §14.

## Contraintes globales
Celles des plans précédents ; aucune donnée nominative côté pilotage.

---

### Tâche 1 : donner le prénom du bébé

**Fichiers :**
- Créer : `src/server/patient/prenom.ts`
- Modifier : `src/app/(patient)/actions.ts` (+ `nommerAction`), `src/app/(patient)/(onglets)/carnet/page.tsx`
- Tester : `tests/server/prenom.test.ts`

**Interfaces (produit) :** `nommerEnfant(db, { compteId, patientId, prenom }): Promise<Resultat<{ prenom: string }, "interdit" | "deja_nomme" | "invalide">>`. Autorisé si le compte gère le carnet et que l'enfant s'appelle encore « Bébé ».

- [ ] **Étape 1 : écrire le test qui échoue**

```ts
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/server/db/client";
import { comptes, patients } from "@/server/db/schema";
import { semerDemo } from "@/server/demo/semer";
import { nommerEnfant } from "@/server/patient/prenom";
import { declarerNaissance } from "@/server/soignant/naissance";
import { creerDbDeTest } from "../aides/base-de-test";
import { COMPTE, idCompte, idPatient } from "../aides/demo";

let db: Db;
let fermer: () => Promise<void>;
let bebeId: string;

beforeAll(async () => {
  ({ db, fermer } = await creerDbDeTest());
  await semerDemo(db, { aujourdhui: "2026-09-26" });
  const [adjoa] = await db.select().from(comptes).where(eq(comptes.identifiant, "adjoa.gbaguidi"));
  const r = await declarerNaissance(db, {
    auteur: { id: adjoa!.id, etablissementId: adjoa!.etablissementId },
    mereId: await idPatient(db, "Awa"),
    saisie: { le: new Date("2026-09-26T05:40:00Z"), lieu: "centre", mode: "voie_basse", sexe: "F", prenom: null, poidsGrammes: 3200, vaccinsNaissance: true },
  });
  bebeId = r.ok ? r.donnees.bebeId : "";
});
afterAll(async () => fermer());

describe("nommerEnfant", () => {
  it("laisse la famille donner le prénom, une fois", async () => {
    const awa = await idCompte(db, COMPTE.awa);
    expect(await nommerEnfant(db, { compteId: awa, patientId: bebeId, prenom: "  Sènami " })).toEqual({ ok: true, donnees: { prenom: "Sènami" } });
    expect((await db.select().from(patients).where(eq(patients.id, bebeId)))[0]?.prenom).toBe("Sènami");
    expect(await nommerEnfant(db, { compteId: awa, patientId: bebeId, prenom: "Autre" })).toEqual({ ok: false, erreur: "deja_nomme" });
  });

  it("refuse un autre compte et un prénom vide", async () => {
    expect(await nommerEnfant(db, { compteId: await idCompte(db, COMPTE.codjo), patientId: bebeId, prenom: "X" })).toEqual({ ok: false, erreur: "interdit" });
    expect(await nommerEnfant(db, { compteId: await idCompte(db, COMPTE.awa), patientId: bebeId, prenom: " " })).toEqual({ ok: false, erreur: "invalide" });
  });
});
```

(Fichier `tests/server/prenom.test.ts`.)

- [ ] **Étape 2 : écrire le code**

`src/server/patient/prenom.ts` :

```ts
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "../db/client";
import { patients } from "../db/schema";
import { lienAvecPatient } from "../droits";
import { echec, reussite, type Resultat } from "../resultat";

const PRENOM_EN_ATTENTE = "Bébé";
const prenomSchema = z.string().trim().min(1).max(60);

/** Le prénom est souvent donné quelques jours après la naissance, lors de la sortie de l'enfant : la famille le donne depuis le carnet. */
export async function nommerEnfant(
  db: Db,
  e: { compteId: string; patientId: string; prenom: string },
): Promise<Resultat<{ prenom: string }, "interdit" | "deja_nomme" | "invalide">> {
  if (!(await lienAvecPatient(db, e.compteId, e.patientId))) return echec("interdit");
  const lecture = prenomSchema.safeParse(e.prenom);
  if (!lecture.success) return echec("invalide");
  const change = await db
    .update(patients)
    .set({ prenom: lecture.data })
    .where(and(eq(patients.id, e.patientId), eq(patients.prenom, PRENOM_EN_ATTENTE)))
    .returning({ id: patients.id });
  return change.length ? reussite({ prenom: lecture.data }) : echec("deja_nomme");
}
```

L'action `nommerAction(formulaire)` appelle `nommerEnfant`, puis redirige vers `/carnet?pour=<id>&note=prenom`.

Dans le carnet, si `carnet.prenom === "Bébé"`, une carte « Donner son prénom » (champ + bouton « C'est son prénom ») s'affiche sous l'en-tête. `note=prenom` affiche : « C'est noté : le carnet porte maintenant son prénom. »

- [ ] **Étape 3 : relancer les tests, vérifier les types ; commit**

Run : `pnpm vitest run tests/server/prenom.test.ts && pnpm typecheck && pnpm lint`
Expected : PASS.

```bash
git commit -m "feat(naissance): la famille donne le prénom du bébé plus tard, depuis son carnet"
```

---

### Tâche 2 : les alertes en retard remontent

**Fichiers :**
- Modifier : `src/app/soignant/CarteAlerte.tsx`, `src/server/requetes/pilotage.ts` (+ `alertesDeLaZone`), `src/app/pilotage/page.tsx`
- Tester : `tests/server/pilotage.test.ts`, `tests/ui/CarteAlerte.test.tsx`

**Interfaces (produit) :** `alertesDeLaZone(db, communeIds, maintenant): Promise<{ enAttente: number; enRetard: number; plusAncienneMinutes: number | null }>`. `VueZone.alertes` porte ce décompte.

- [ ] **Étape 1 : écrire les tests qui échouent**

Dans `tests/server/pilotage.test.ts`, ajouter :

```ts
describe("alertes en direct", () => {
  it("compte les alertes qui attendent et celles en retard, sans aucun nom", async () => {
    const [zone] = await db.select().from(comptes).where(eq(comptes.identifiant, "zone.bohicon"));
    const rachida = await idPatient(db, "Rachida");
    await signalerDanger(db, { compteId: await idCompte(db, COMPTE.aicha), patientId: rachida, evenementId: randomUUID(), signes: ["fievre"], maintenant: new Date("2026-09-26T09:30:00Z") });
    const vue = await vueDeZone(db, zone!.communeId!, aujourdhui, maintenant);
    expect(vue!.alertes).toEqual({ enAttente: 1, enRetard: 1, plusAncienneMinutes: 30 });
  });
});
```

(Imports : `randomUUID`, `signalerDanger`, `COMPTE`, `idCompte`, `idPatient`.)

Créer `tests/ui/CarteAlerte.test.tsx` :

```tsx
// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/soignant/actions", () => ({ prendreEnChargeAction: vi.fn() }));

import { CarteAlerte } from "@/app/soignant/CarteAlerte";

afterEach(cleanup);

const alerte = {
  id: "a1",
  patientId: "p1",
  prenom: "Awa",
  nom: "Hounkpatin",
  sexe: "F" as const,
  libelleAge: "24 ans",
  semainesGrossesse: 37,
  telephone: "+2290197000002",
  signes: ["debut_travail" as const],
  creeeLe: new Date("2026-09-26T09:00:00Z"),
  echeance: new Date("2026-09-26T09:15:00Z"),
};

describe("CarteAlerte", () => {
  it("dit qu'une alerte est en retard et qu'elle remonte à la zone", () => {
    render(<CarteAlerte alerte={alerte} maintenant={new Date("2026-09-26T09:27:00Z")} />);
    expect(screen.getByText("En retard de 12 min : signalée à la zone sanitaire.")).toBeTruthy();
  });

  it("ne dit rien de plus dans le délai", () => {
    render(<CarteAlerte alerte={alerte} maintenant={new Date("2026-09-26T09:05:00Z")} />);
    expect(screen.queryByText(/En retard/)).toBeNull();
  });
});
```

(Adapter l'objet `alerte` au type `AlerteOuverte` réel si des champs manquent.)

- [ ] **Étape 2 : écrire le code**

`alertesDeLaZone` : les alertes des patients des communes, ni prises en charge ni annulées ; `enRetard` = celles dont l'échéance est passée ; `plusAncienneMinutes` = l'âge de la plus ancienne. `vueDeZone` l'ajoute sous `alertes`.

Sur la page de la zone, un bandeau « En ce moment » (fond `urgence-pale` s'il y a du retard, sinon lavande) :
- « {n} alerte(s) en attente, dont {m} en retard (la plus ancienne depuis {k} min) » ;
- sinon « Aucune alerte en attente ».

Dans `CarteAlerte` : si `statutAlerte(...) === "en_retard"`, un fond `bg-urgence-pale` et une ligne en gras rouge « En retard de N min : signalée à la zone sanitaire. »

- [ ] **Étape 3 : relancer les tests, vérifier les types ; commit**

Run : `pnpm vitest run tests/server/pilotage.test.ts tests/ui/CarteAlerte.test.tsx && pnpm typecheck && pnpm lint`
Expected : PASS.

```bash
git commit -m "feat(alertes): une alerte en retard est marquée chez le soignant et remonte à la zone sanitaire"
```

---

### Tâche 3 : audit d'accessibilité

- [ ] **Étape 1 : auditer**

Script jetable `audit.mjs` (axe-core injecté par puppeteer) sur :
- les pages publiques : `/decouvrir`, `/demo`, `/connexion` ;
- les écrans patient d'Awa (`/`, `/grossesse`, `/probleme`) et de Codjo (`/`, `/carnet`, `/prendre-rendez-vous`) ;
- `/relais`, `/soignant`, un dossier, `/pharmacie`, `/pilotage` (zone et ministère).

Règles WCAG 2.1 A et AA.

Expected : la liste des violations, par page et par gravité.

- [ ] **Étape 2 : corriger**

Corriger toute violation « critical » ou « serious » (contraste, nom accessible, rôle, ordre des titres). Relancer l'audit jusqu'à zéro violation grave. Chaque correction est vérifiée par l'audit relancé ; un test d'interface est ajouté quand la correction touche un composant partagé.

- [ ] **Étape 3 : commit, mise en ligne**

```bash
git commit -m "fix(accessibilité): corrections de l'audit axe (WCAG 2.1 AA)"
```

Puis suite complète, build, envoi, déploiement, réinitialisation de la démo, vérification en production.
