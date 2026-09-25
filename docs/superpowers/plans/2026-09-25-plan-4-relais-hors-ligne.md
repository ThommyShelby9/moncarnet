# Plan 4 : relais hors ligne — plan d'implémentation

> **Pour les agents :** sous-skill requis : superpowers:subagent-driven-development (recommandé) ou superpowers:executing-plans, pour exécuter ce plan tâche par tâche. Les étapes utilisent des cases à cocher (`- [ ]`) pour le suivi.

**Objectif :** la tournée de Koffi, relais de Sèhoun, marche sans réseau.
- « Préparer ma tournée » copie sur le téléphone ses foyers et les raisons d'y passer : signe de danger en attente, étape manquée, risque, ordonnance à retirer, étape de la semaine.
- Il note chaque visite avec un constat, la raconte au micro, relève une tension ou signale un signe de danger.
- Il inscrit une personne : nouveau-né, femme enceinte, tension, diabète, personne âgée.
- Tout passe par une **file d'envoi** et part seul au retour du réseau. Le serveur traite chaque saisie une par une, sans doublon et en disant pourquoi il en refuse une.
- Le soignant retrouve la visite et écoute la note dans le dossier.
- Un service worker garde les pages ouvertes ; le téléphone s'efface à la déconnexion.

**Architecture :**
- Domaine pur : identifiant UUID v7, types de saisies, lecture d'une inscription, raisons de passer par foyer.
- Serveur : lecture de la tournée, synchronisation événement par événement (idempotente, droits du relais), notes vocales stockées en base (`bytea`), routes `/api/relais/tournee`, `/api/sync`, `/api/sync/note`, `/api/fichiers/[id]`.
- Téléphone :
  - IndexedDB (`idb-keyval`, 1 Ko) pour la tournée, la file, les refus et les notes ;
  - une synchronisation client testée avec des dépendances injectées ;
  - une page `/relais` entièrement client, qui change d'écran sans navigation (elle marche sans réseau) ;
  - un service worker écrit à la main (`public/sw.js`) : réseau d'abord pour les pages, cache d'abord pour les fichiers statiques ;
  - un manifeste pour installer l'application.

**Stack :** celle des plans précédents, plus `idb-keyval` 6.3.0 (IndexedDB côté navigateur) et, pour les tests, `fake-indexeddb` 6.2.5.

**Spec :** [`docs/superpowers/specs/2026-09-25-esante-benin-design.md`](../specs/2026-09-25-esante-benin-design.md) : §4.8, §7.3 (types d'événements), §10 (hors ligne, synchronisation, erreurs), §12 (droits), §15 étape 4 (scénario). Maquette « Tournée du relais » : [`docs/design/maquettes-validees.html`](../../design/maquettes-validees.html).

## Contraintes globales

- Toutes les contraintes des plans 1 à 3 s'appliquent : TypeScript `strict`, tests dans `tests/` écrits avant le code, français simple, une seule charte, pictogramme + mot, « aujourd'hui » à l'heure du Bénin, exécution par moi-même, commits sur `main`.
- **Lire `node_modules/next/dist/docs/`** avant d'utiliser une API Next : `03-api-reference/03-file-conventions/route.md` (gestionnaires de route, `RouteContext`), `02-guides/progressive-web-apps.md` (manifeste, en-têtes de `/sw.js`), `01-app/03-api-reference/03-file-conventions/01-metadata/manifest.md`.
- **Droits (spec §12)** :
  - un relais n'agit que sur les personnes des foyers qui lui sont attribués (`foyers.relais_id`) ;
  - une note vocale ne s'écoute que par son relais ou par un soignant du centre de la personne.
- **Rien n'est perdu en silence (spec §10.2)** : chaque saisie reçoit une réponse `accepte`, `deja_recu` ou `refuse` avec un motif ; les refus restent sur le téléphone dans « À corriger ».
- **Identifiants créés sur le téléphone** : UUID v7. Renvoyer la même saisie ne crée rien de plus.
- **Téléphone partagé** : la déconnexion efface les pages en cache et la tournée. Elle est bloquée tant que la file n'est pas vide (spec §10.4).
- Le service worker ne met jamais en cache les routes `/api/*` ni les requêtes autres que `GET`.

## Points de vigilance à l'usage

1. **La même visite envoyée deux fois** (réseau qui coupe pendant l'envoi, puis nouvel essai) : `deja_recu`, une seule visite enregistrée (tâche 6).
2. **Horloge du téléphone fausse** (date dans le futur, ou vieille de plus de 30 jours) : saisie refusée avec un motif clair, gardée dans « À corriger » (tâches 1 et 6).
3. **Une visite pour une personne qui n'est pas dans la tournée** (tournée préparée il y a longtemps, foyer réattribué) : refusée, « Cette personne n'est pas dans votre tournée » (tâche 6).
4. **Une personne inscrite hors ligne puis visitée dans la même tournée** : l'inscription part avant la visite dans le même lot, la visite est acceptée (tâche 6).
5. **Une note vocale envoyée avant sa visite** : la note attend que sa visite soit partie ; une note dont la visite a été refusée est retirée (tâche 9).

## Hors de ce plan (prévu ailleurs)

- « Rappels sans réponse » dans les raisons de passer : plan 5 (messages).
- « Consigne du soignant » dictée pour le relais : plan 6 si le temps le permet.
- Remontée automatique d'une alerte en retard (tâche planifiée) : plan 5. Ici, un signe de danger non pris en charge apparaît déjà en tête de la tournée.
- File d'envoi côté patient (« C'est fait » sans réseau) : le service worker de ce plan garde les pages patient déjà vues. La file patient reste reportée.

---

## Structure des fichiers

```
src/domain/
  identifiants.ts          + uuidV7
  evenements.ts            + visite_domicile, inscription (CONSTATS_VISITE, LIBELLES_CONSTAT, inscriptionDonneesSchema)
  synchronisation.ts       evenementEntrantSchema, ResultatSync, MAX_LOT, dateAcceptable
  inscription.ts           TYPES_INSCRIPTION, LIBELLES_INSCRIPTION, lireInscription
  tournee.ts               types Tournee, raisonsDe, urgenceDuFoyer, trierFoyers, avancement

src/server/
  db/schema.ts             + table fichiers (bytea)
  droits.ts                + patientDuRelais, foyerDuRelais
  inscriptions.ts          inscrireAuProgramme
  patient/signalement.ts   + enregistrerSignalement (partagé patient / relais)
  relais/inscription.ts    inscrirePersonne
  relais/synchronisation.ts synchroniser, MOTIFS_REFUS
  relais/notes.ts          enregistrerNote, lireNote
  requetes/tournee.ts      tourneeDuRelais
  requetes/soignant.ts     + visitesDe, visites dans le dossier ; telephonesPrincipaux exporté
  demo/semer.ts            Koffi suit les foyers de Sèhoun ; une visite passée chez Rachida

src/offline/
  file.ts                  SaisieEnAttente, Refus, trierReponses, versServeur, texteEnAttente, appliquerSaisiesLocales
  stockage.ts              StockageRelais sur IndexedDB (idb-keyval)
  synchronisation.ts       synchroniserFile, transportNavigateur, telechargerTournee
  saisies.ts               saisiesDeVisite, saisieDInscription

src/app/
  api/relais/tournee/route.ts, api/sync/route.ts, api/sync/note/route.ts, api/fichiers/[id]/route.ts
  manifest.ts, layout.tsx (+ EnregistrementServiceWorker)
  relais/page.tsx, ApplicationTournee.tsx, VueListe.tsx, VueVisite.tsx, Enregistreur.tsx, VueInscription.tsx, VueEnvoi.tsx
  soignant/patients/[id]/page.tsx       + visites du relais avec la note à écouter
public/sw.js, public/hors-ligne.html, public/app-192.png, public/app-512.png
src/ui/EnregistrementServiceWorker.tsx, src/ui/BoutonDeconnexion.tsx (et son usage dans EnTete, soignant, famille)

drizzle/0002_notes_vocales.sql

tests/domain/{identifiants,evenements,synchronisation,inscription,tournee}.test.ts
tests/server/demo/semer.test.ts, tests/server/requetes/{tournee,soignant}.test.ts
tests/server/relais/{inscription,synchronisation,notes}.test.ts
tests/offline/{file,stockage,synchronisation,saisies}.test.ts
tests/ui/BoutonDeconnexion.test.tsx, tests/ui/relais/{VueListe,VueVisite,VueInscription,VueEnvoi}.test.tsx
```

---

### Tâche 1 : identifiants, nouvelles saisies et lot de synchronisation

**Fichiers :**
- Modifier : `src/domain/identifiants.ts`, `src/domain/evenements.ts`
- Créer : `src/domain/synchronisation.ts`
- Tester : `tests/domain/identifiants.test.ts`, `tests/domain/evenements.test.ts`, `tests/domain/synchronisation.test.ts`

**Interfaces :**
- Produit :
  - `uuidV7(maintenant?: number, aleatoire?: (n: number) => Uint8Array): string` ;
  - `CONSTATS_VISITE = ["tout_va_bien", "a_orienter", "absent"]`, `type ConstatVisite`, `LIBELLES_CONSTAT` ; `inscriptionDonneesSchema`, `type InscriptionDonnees` ; `evenementSchema` accepte `visite_domicile { constat, noteVocale, texte? }` et `inscription` ;
  - `evenementEntrantSchema` (`{ id, patientId, type, survenuLe (ISO), donnees }`), `type EvenementEntrant`, `type StatutSync`, `interface ResultatSync { id; statut; motif? }`, `MAX_LOT = 100`, `dateAcceptable(survenuLe, maintenant): boolean`.

- [ ] **Étape 1 : écrire les tests qui échouent**

Dans `tests/domain/identifiants.test.ts`, importer `uuidV7` et ajouter :

```ts
describe("uuidV7", () => {
  it("met l'instant au début : les identifiants se rangent dans l'ordre de création", () => {
    const a = uuidV7(Date.UTC(2026, 8, 25, 10, 0, 0));
    const b = uuidV7(Date.UTC(2026, 8, 25, 10, 0, 1));
    expect(a < b).toBe(true);
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(estUuid(a)).toBe(true);
  });

  it("écrit l'instant sur les 48 premiers bits", () => {
    expect(uuidV7(0x0123456789ab, (n) => new Uint8Array(n)).slice(0, 13)).toBe("01234567-89ab");
  });
});
```

Dans `tests/domain/evenements.test.ts`, ajouter dans le `describe` :

```ts
  it("accepte une visite à domicile et une inscription faite par le relais", () => {
    const foyerId = "0b8f5c1e-3f8a-4b3a-9a57-6f1f2c3d4e5f";
    expect(evenementSchema.safeParse({ type: "visite_domicile", donnees: { constat: "a_orienter", noteVocale: true } }).success).toBe(true);
    expect(evenementSchema.safeParse({ type: "visite_domicile", donnees: { constat: "peut-etre" } }).success).toBe(false);
    const inscription = { foyerId, prenom: "Yao", nom: "Dossou", sexe: "M", dateNaissance: "2026-09-20", programme: { code: "vaccination", dateReference: "2026-09-20" } };
    expect(evenementSchema.safeParse({ type: "inscription", donnees: inscription }).success).toBe(true);
    expect(evenementSchema.safeParse({ type: "inscription", donnees: { ...inscription, prenom: " " } }).success).toBe(false);
  });
```

Créer `tests/domain/synchronisation.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { dateAcceptable, evenementEntrantSchema } from "@/domain/synchronisation";

describe("evenementEntrantSchema", () => {
  it("lit une saisie venue du téléphone", () => {
    const saisie = {
      id: "0190b3a1-7c2e-7a41-9b3c-2f4d5e6a7b8c",
      patientId: "0b8f5c1e-3f8a-4b3a-9a57-6f1f2c3d4e5f",
      type: "visite_domicile",
      survenuLe: "2026-09-25T09:12:00.000Z",
      donnees: { constat: "tout_va_bien" },
    };
    expect(evenementEntrantSchema.safeParse(saisie).success).toBe(true);
    expect(evenementEntrantSchema.safeParse({ ...saisie, survenuLe: "hier" }).success).toBe(false);
  });
});

describe("dateAcceptable", () => {
  const maintenant = new Date("2026-09-25T12:00:00Z");
  it("accepte une saisie des 30 derniers jours", () => {
    expect(dateAcceptable(new Date("2026-09-25T08:00:00Z"), maintenant)).toBe(true);
    expect(dateAcceptable(new Date("2026-08-27T08:00:00Z"), maintenant)).toBe(true);
  });
  it("refuse une date dans le futur ou trop ancienne (horloge du téléphone fausse)", () => {
    expect(dateAcceptable(new Date("2026-09-25T12:30:00Z"), maintenant)).toBe(false);
    expect(dateAcceptable(new Date("2026-07-01T08:00:00Z"), maintenant)).toBe(false);
  });
});
```

- [ ] **Étape 2 : lancer les tests et les voir échouer**

Run : `pnpm vitest run tests/domain/identifiants.test.ts tests/domain/evenements.test.ts tests/domain/synchronisation.test.ts`
Expected : FAIL (`uuidV7` non exporté, `visite_domicile` inconnu, module `synchronisation` introuvable).

- [ ] **Étape 3 : écrire le code**

Ajouter à `src/domain/identifiants.ts` :

```ts
/**
 * UUID version 7, créé sur le téléphone : l'instant d'abord (48 bits), puis du hasard.
 * Les saisies se rangent dans l'ordre et le serveur reconnaît une saisie déjà reçue.
 */
export function uuidV7(
  maintenant: number = Date.now(),
  aleatoire: (n: number) => Uint8Array = (n) => crypto.getRandomValues(new Uint8Array(n)),
): string {
  const octets = aleatoire(16);
  for (let i = 0; i < 6; i++) octets[i] = Math.floor(maintenant / 2 ** (8 * (5 - i))) % 256;
  octets[6] = (octets[6]! & 0x0f) | 0x70;
  octets[8] = (octets[8]! & 0x3f) | 0x80;
  const hex = Array.from(octets, (o) => o.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}
```

Dans `src/domain/evenements.ts` : remplacer l'import des programmes par `import { CODES_PROGRAMMES, MOTIFS_RDV } from "./programmes/types";`, ajouter avant `evenementSchema` :

```ts
export const CONSTATS_VISITE = ["tout_va_bien", "a_orienter", "absent"] as const;
export type ConstatVisite = (typeof CONSTATS_VISITE)[number];

export const LIBELLES_CONSTAT: Record<ConstatVisite, string> = {
  tout_va_bien: "Tout va bien",
  a_orienter: "À orienter vers le centre",
  absent: "Personne à la maison",
};

/** Personne inscrite par le relais, hors ligne : son identifiant est créé sur le téléphone. */
export const inscriptionDonneesSchema = z.object({
  foyerId: z.uuid(),
  prenom: z.string().trim().min(1).max(60),
  nom: z.string().trim().min(1).max(60),
  sexe: z.enum(["F", "M"]),
  dateNaissance: z.iso.date(),
  telephone: z.string().trim().max(20).optional(),
  programme: z.object({ code: z.enum(CODES_PROGRAMMES), dateReference: z.iso.date() }).optional(),
});
export type InscriptionDonnees = z.infer<typeof inscriptionDonneesSchema>;
```

et, dans l'union, après la branche `delivrance` :

```ts
  z.object({
    type: z.literal("visite_domicile"),
    donnees: z.object({
      constat: z.enum(CONSTATS_VISITE),
      noteVocale: z.boolean().default(false),
      texte: z.string().trim().max(500).optional(),
    }),
  }),
  z.object({
    type: z.literal("inscription"),
    donnees: inscriptionDonneesSchema,
  }),
```

Créer `src/domain/synchronisation.ts` :

```ts
import { z } from "zod";

/** Une saisie de la file d'envoi, telle qu'elle arrive du téléphone. */
export const evenementEntrantSchema = z.object({
  id: z.uuid(),
  patientId: z.uuid(),
  type: z.string().min(1).max(40),
  survenuLe: z.iso.datetime({ offset: true }),
  donnees: z.record(z.string(), z.unknown()),
});
export type EvenementEntrant = z.infer<typeof evenementEntrantSchema>;

export type StatutSync = "accepte" | "deja_recu" | "refuse";

/** Réponse pour chaque saisie : rien n'est perdu en silence (spec §10.2). */
export interface ResultatSync {
  id: string;
  statut: StatutSync;
  motif?: string;
}

export const MAX_LOT = 100;

/** Une saisie datée du futur (plus de 5 minutes) ou de plus de 30 jours vient d'une horloge fausse. */
export function dateAcceptable(survenuLe: Date, maintenant: Date): boolean {
  const ecart = survenuLe.getTime() - maintenant.getTime();
  return ecart <= 5 * 60_000 && ecart >= -30 * 86_400_000;
}
```

- [ ] **Étape 4 : relancer les tests**

Run : `pnpm vitest run tests/domain`
Expected : PASS.

- [ ] **Étape 5 : commit**

```bash
git add src/domain tests/domain
git commit -m "feat(domaine): UUID v7, visite à domicile, inscription et lot de synchronisation"
```

---

### Tâche 2 : inscrire une personne (lecture du formulaire du relais)

**Fichiers :**
- Créer : `src/domain/inscription.ts`
- Tester : `tests/domain/inscription.test.ts`

**Interfaces :**
- Consomme : `InscriptionDonnees` (tâche 1), `ajouterJours`, `normaliserTelephone`.
- Produit : `TYPES_INSCRIPTION`, `type TypeInscription`, `LIBELLES_INSCRIPTION`, `lireInscription(champs, aujourdhui): { ok: true; donnees: InscriptionDonnees } | { ok: false; message: string }` (champs `type`, `foyerId`, `prenom`, `nom`, `sexe`, `nele` pour un nouveau-né, `age` sinon, `semaines` pour une grossesse, `telephone`).

- [ ] **Étape 1 : écrire les tests qui échouent**

Créer `tests/domain/inscription.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { lireInscription } from "@/domain/inscription";

const foyerId = "0b8f5c1e-3f8a-4b3a-9a57-6f1f2c3d4e5f";
const aujourdhui = "2026-09-25";

describe("lireInscription", () => {
  it("inscrit un nouveau-né au calendrier des vaccins à partir de sa naissance", () => {
    expect(lireInscription({ type: "nouveau_ne", foyerId, prenom: "Yao", nom: "Dossou", sexe: "M", nele: "2026-09-20" }, aujourdhui)).toEqual({
      ok: true,
      donnees: { foyerId, prenom: "Yao", nom: "Dossou", sexe: "M", dateNaissance: "2026-09-20", programme: { code: "vaccination", dateReference: "2026-09-20" } },
    });
  });

  it("inscrit une femme enceinte à partir de ses semaines de grossesse", () => {
    expect(lireInscription({ type: "grossesse", foyerId, prenom: "Reine", nom: "Kiki", sexe: "F", age: "22", semaines: "20" }, aujourdhui)).toMatchObject({
      ok: true,
      donnees: { dateNaissance: "2004-09-30", programme: { code: "grossesse", dateReference: "2026-05-08" } },
    });
  });

  it("garde un numéro de téléphone au bon format", () => {
    expect(lireInscription({ type: "tension", foyerId, prenom: "Noël", nom: "Kiki", sexe: "M", age: "61", telephone: "01 97 12 34 56" }, aujourdhui)).toMatchObject({
      ok: true,
      donnees: { telephone: "+2290197123456", programme: { code: "hypertension", dateReference: aujourdhui } },
    });
  });

  it("explique ce qui manque", () => {
    expect(lireInscription({ type: "tension", foyerId, prenom: "Noël", nom: "Kiki", sexe: "M" }, aujourdhui)).toEqual({ ok: false, message: "Indiquez l'âge." });
    expect(lireInscription({ type: "grossesse", foyerId, prenom: "Yao", nom: "Kiki", sexe: "M", age: "30", semaines: "12" }, aujourdhui)).toEqual({
      ok: false,
      message: "Une grossesse concerne une femme : vérifiez le sexe.",
    });
    expect(lireInscription({ type: "nouveau_ne", foyerId, prenom: "Yao", nom: "Kiki", sexe: "M", nele: "2025-01-01" }, aujourdhui)).toEqual({
      ok: false,
      message: "Indiquez la date de naissance du bébé (moins d'un an).",
    });
    expect(lireInscription({ type: "tension", foyerId, prenom: "", nom: "Kiki", sexe: "M", age: "61" }, aujourdhui)).toEqual({ ok: false, message: "Vérifiez : le prénom." });
    expect(lireInscription({ type: "tension", foyerId, prenom: "Noël", nom: "Kiki", sexe: "M", age: "61", telephone: "12" }, aujourdhui)).toEqual({
      ok: false,
      message: "Le numéro de téléphone n'est pas un numéro du Bénin.",
    });
  });
});
```

- [ ] **Étape 2 : lancer les tests et les voir échouer**

Run : `pnpm vitest run tests/domain/inscription.test.ts`
Expected : FAIL (module introuvable).

- [ ] **Étape 3 : écrire le code**

Créer `src/domain/inscription.ts` :

```ts
import { z } from "zod";
import { ajouterJours, joursEntre, type DateISO } from "./dates";
import type { InscriptionDonnees } from "./evenements";
import type { CodeProgramme } from "./programmes/types";
import { normaliserTelephone } from "./telephone";

export const TYPES_INSCRIPTION = ["nouveau_ne", "grossesse", "tension", "diabete", "personne_agee"] as const;
export type TypeInscription = (typeof TYPES_INSCRIPTION)[number];

export const LIBELLES_INSCRIPTION: Record<TypeInscription, string> = {
  nouveau_ne: "Nouveau-né",
  grossesse: "Femme enceinte",
  tension: "Tension",
  diabete: "Diabète",
  personne_agee: "Personne âgée",
};

const PROGRAMME: Record<TypeInscription, CodeProgramme> = {
  nouveau_ne: "vaccination",
  grossesse: "grossesse",
  tension: "hypertension",
  diabete: "diabete",
  personne_agee: "consultation",
};

const entier = (min: number, max: number) =>
  z.preprocess((v) => (v === undefined || v === null || String(v).trim() === "" ? undefined : Number(v)), z.number().int().min(min).max(max).optional());

const schema = z.object({
  type: z.enum(TYPES_INSCRIPTION),
  foyerId: z.uuid(),
  prenom: z.string().trim().min(1).max(60),
  nom: z.string().trim().min(1).max(60),
  sexe: z.enum(["F", "M"]),
  nele: z.string().optional(),
  age: entier(0, 120),
  semaines: entier(4, 42),
  telephone: z.string().trim().max(20).optional(),
});

const LIBELLES_CHAMPS: Record<string, string> = {
  type: "ce qui amène l'inscription",
  foyerId: "le foyer",
  prenom: "le prénom",
  nom: "le nom",
  sexe: "le sexe",
  age: "l'âge",
  semaines: "les semaines de grossesse",
};

type Lecture = { ok: true; donnees: InscriptionDonnees } | { ok: false; message: string };
const refus = (message: string): Lecture => ({ ok: false, message });

/** Inscription saisie par le relais : la date de naissance et le programme de suivi viennent de ce qui amène l'inscription. */
export function lireInscription(champs: Record<string, unknown>, aujourdhui: DateISO): Lecture {
  const lecture = schema.safeParse(champs);
  if (!lecture.success) {
    const aVerifier = [...new Set(lecture.error.issues.map((p) => LIBELLES_CHAMPS[String(p.path[0])] ?? String(p.path[0])))];
    return refus(`Vérifiez : ${aVerifier.join(", ")}.`);
  }
  const s = lecture.data;
  let dateNaissance: DateISO;
  if (s.type === "nouveau_ne") {
    const valide = /^\d{4}-\d{2}-\d{2}$/.test(s.nele ?? "") && !Number.isNaN(Date.parse(s.nele!));
    const age = valide ? joursEntre(s.nele!, aujourdhui) : -1;
    if (age < 0 || age > 365) return refus("Indiquez la date de naissance du bébé (moins d'un an).");
    dateNaissance = s.nele!;
  } else {
    if (s.age === undefined) return refus("Indiquez l'âge.");
    dateNaissance = ajouterJours(aujourdhui, -s.age * 365);
  }
  let dateReference: DateISO = s.type === "nouveau_ne" ? dateNaissance : aujourdhui;
  if (s.type === "grossesse") {
    if (s.sexe !== "F") return refus("Une grossesse concerne une femme : vérifiez le sexe.");
    if (s.semaines === undefined) return refus("Indiquez les semaines de grossesse.");
    dateReference = ajouterJours(aujourdhui, -s.semaines * 7);
  }
  let telephone: string | undefined;
  if (s.telephone) {
    const normalise = normaliserTelephone(s.telephone);
    if (!normalise) return refus("Le numéro de téléphone n'est pas un numéro du Bénin.");
    telephone = normalise;
  }
  return {
    ok: true,
    donnees: {
      foyerId: s.foyerId,
      prenom: s.prenom,
      nom: s.nom,
      sexe: s.sexe,
      dateNaissance,
      ...(telephone ? { telephone } : {}),
      programme: { code: PROGRAMME[s.type], dateReference },
    },
  };
}
```

- [ ] **Étape 4 : relancer les tests**

Run : `pnpm vitest run tests/domain/inscription.test.ts`
Expected : PASS (4 tests).

- [ ] **Étape 5 : commit**

```bash
git add src/domain/inscription.ts tests/domain/inscription.test.ts
git commit -m "feat(domaine): inscription d'une personne par le relais"
```

---

### Tâche 3 : raisons de passer dans un foyer

**Fichiers :**
- Créer : `src/domain/tournee.ts`
- Tester : `tests/domain/tournee.test.ts`

**Interfaces :**
- Consomme : `ResultatRisque` (`src/domain/risque.ts`), `DateISO`.
- Produit :
  - `type Urgence = 0 | 1 | 2` (0 : tout de suite, 1 : à rattraper, 2 : à voir) ; `interface Raison { texte: string; urgence: Urgence }` ;
  - `interface EtatPersonne { alertesOuvertes: number; etapesManquees: string[]; risque: ResultatRisque; ordonnancesARetirer: string[]; etapesProches: string[] }` ;
  - `raisonsDe(etat): Raison[]` (la plus urgente d'abord ; les motifs de risque qui redisent une étape manquée ou le signalement sont retirés) ; `urgenceDuFoyer(personnes): Urgence | null` ; `trierFoyers(foyers)` ; `avancement(foyers): { faits: number; aVoir: number }` ;
  - `interface PersonneTournee { id; prenom; nom; sexe; age; libelleAge; telephone: string | null; enceinte: boolean; malvoyant: boolean; vueAujourdhui: boolean; raisons: Raison[] }`, `interface FoyerTournee { id; nom; village; urgence: Urgence | null; personnes: PersonneTournee[] }`, `interface Tournee { relais: string; prepareeLe: string; aujourdhui: DateISO; foyers: FoyerTournee[] }`.

- [ ] **Étape 1 : écrire les tests qui échouent**

Créer `tests/domain/tournee.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { avancement, raisonsDe, trierFoyers, urgenceDuFoyer, type EtatPersonne } from "@/domain/tournee";

const calme: EtatPersonne = { alertesOuvertes: 0, etapesManquees: [], risque: { niveau: "normal", motifs: [] }, ordonnancesARetirer: [], etapesProches: [] };

describe("raisonsDe", () => {
  it("ne donne aucune raison de passer quand tout va bien", () => {
    expect(raisonsDe(calme)).toEqual([]);
  });

  it("dit l'étape manquée, à rattraper", () => {
    expect(raisonsDe({ ...calme, etapesManquees: ["Consultation prénatale 2"] })).toEqual([{ texte: "Consultation prénatale 2 manquée", urgence: 1 }]);
  });

  it("met le signe de danger en attente tout en haut, sans le répéter", () => {
    const raisons = raisonsDe({
      ...calme,
      alertesOuvertes: 1,
      risque: { niveau: "eleve", motifs: ["Signe de danger non pris en charge"] },
      ordonnancesARetirer: ["M4R2TN"],
    });
    expect(raisons).toEqual([
      { texte: "Signe de danger signalé, pas encore pris en charge : passer tout de suite", urgence: 0 },
      { texte: "Ordonnance à retirer à la pharmacie (code M4R2TN)", urgence: 2 },
    ]);
  });

  it("classe le risque élevé avant ce qui est à surveiller et ce qui arrive cette semaine", () => {
    expect(
      raisonsDe({ ...calme, risque: { niveau: "surveillance", motifs: ["Diabète non contrôlé (1.4 puis 1.4 g/L)"] }, etapesProches: ["Vaccins des 9 mois"] }),
    ).toEqual([
      { texte: "Diabète non contrôlé (1.4 puis 1.4 g/L)", urgence: 2 },
      { texte: "Vaccins des 9 mois à prévoir cette semaine", urgence: 2 },
    ]);
    expect(raisonsDe({ ...calme, risque: { niveau: "eleve", motifs: ["Tension très élevée (180/110)"] } })[0]).toEqual({
      texte: "Tension très élevée (180/110)",
      urgence: 0,
    });
  });

  it("ne répète pas en motif de risque les étapes déjà dites manquées", () => {
    expect(
      raisonsDe({
        ...calme,
        etapesManquees: ["Vaccins des 6 semaines", "Vaccins des 10 semaines"],
        risque: { niveau: "surveillance", motifs: ["2 vaccins en retard"] },
      }).map((r) => r.texte),
    ).toEqual(["Vaccins des 6 semaines manquée", "Vaccins des 10 semaines manquée"]);
    expect(raisonsDe({ ...calme, risque: { niveau: "surveillance", motifs: ["2 rendez-vous manqués"] } })).toEqual([]);
  });
});

describe("foyers", () => {
  it("prend l'urgence la plus forte des personnes du foyer", () => {
    expect(urgenceDuFoyer([{ raisons: [{ texte: "a", urgence: 2 }] }, { raisons: [{ texte: "b", urgence: 1 }] }])).toBe(1);
    expect(urgenceDuFoyer([{ raisons: [] }])).toBeNull();
  });

  it("met les foyers urgents d'abord, ceux sans raison à la fin", () => {
    const foyers = [
      { nom: "Adjovi", urgence: null },
      { nom: "Salifou", urgence: 2 },
      { nom: "Dossou", urgence: 1 },
      { nom: "Kiki", urgence: 0 },
    ] as const;
    expect(trierFoyers([...foyers]).map((f) => f.nom)).toEqual(["Kiki", "Dossou", "Salifou", "Adjovi"]);
  });

  it("compte les foyers à voir déjà visités aujourd'hui", () => {
    const vu = { vueAujourdhui: true };
    const pasVu = { vueAujourdhui: false };
    expect(
      avancement([
        { urgence: 0, personnes: [vu, pasVu] },
        { urgence: 2, personnes: [pasVu] },
        { urgence: null, personnes: [vu] },
      ]),
    ).toEqual({ faits: 1, aVoir: 2 });
  });
});
```

- [ ] **Étape 2 : lancer les tests et les voir échouer**

Run : `pnpm vitest run tests/domain/tournee.test.ts`
Expected : FAIL (module introuvable).

- [ ] **Étape 3 : écrire le code**

Créer `src/domain/tournee.ts` :

```ts
import type { DateISO } from "./dates";
import type { ResultatRisque } from "./risque";

/** 0 : passer tout de suite ; 1 : à rattraper ; 2 : à voir pendant la tournée. */
export type Urgence = 0 | 1 | 2;

export interface Raison {
  texte: string;
  urgence: Urgence;
}

export interface EtatPersonne {
  alertesOuvertes: number;
  etapesManquees: string[];
  risque: ResultatRisque;
  ordonnancesARetirer: string[];
  etapesProches: string[];
}

export interface PersonneTournee {
  id: string;
  prenom: string;
  nom: string;
  sexe: "F" | "M";
  age: number;
  libelleAge: string;
  telephone: string | null;
  enceinte: boolean;
  malvoyant: boolean;
  /** Visite déjà notée aujourd'hui (reçue par le serveur, ou saisie sur ce téléphone). */
  vueAujourdhui: boolean;
  raisons: Raison[];
}

export interface FoyerTournee {
  id: string;
  nom: string;
  village: string;
  urgence: Urgence | null;
  personnes: PersonneTournee[];
}

/** Copie de la tournée gardée sur le téléphone du relais. */
export interface Tournee {
  relais: string;
  prepareeLe: string;
  aujourdhui: DateISO;
  foyers: FoyerTournee[];
}

/** Motifs de risque déjà dits autrement : le signalement en attente, les étapes manquées. */
const DEJA_DIT = /^Signe de danger non pris en charge$|rendez-vous manqués$|en retard$/;

/** Pourquoi passer voir cette personne (spec §4.8), la raison la plus urgente d'abord. */
export function raisonsDe(etat: EtatPersonne): Raison[] {
  const raisons: Raison[] = [];
  if (etat.alertesOuvertes > 0) raisons.push({ texte: "Signe de danger signalé, pas encore pris en charge : passer tout de suite", urgence: 0 });
  const motifs = etat.risque.motifs.filter((m) => !DEJA_DIT.test(m));
  if (etat.risque.niveau === "eleve") for (const m of motifs) raisons.push({ texte: m, urgence: 0 });
  for (const e of etat.etapesManquees) raisons.push({ texte: `${e} manquée`, urgence: 1 });
  if (etat.risque.niveau === "surveillance") for (const m of motifs) raisons.push({ texte: m, urgence: 2 });
  for (const code of etat.ordonnancesARetirer) raisons.push({ texte: `Ordonnance à retirer à la pharmacie (code ${code})`, urgence: 2 });
  for (const e of etat.etapesProches) raisons.push({ texte: `${e} à prévoir cette semaine`, urgence: 2 });
  return raisons.sort((a, b) => a.urgence - b.urgence);
}

export function urgenceDuFoyer(personnes: { raisons: Raison[] }[]): Urgence | null {
  const urgences = personnes.flatMap((p) => p.raisons.map((r) => r.urgence));
  return urgences.length ? (Math.min(...urgences) as Urgence) : null;
}

/** Les foyers urgents d'abord, ceux sans raison de passer à la fin, puis par nom. */
export function trierFoyers<T extends { nom: string; urgence: Urgence | null }>(foyers: T[]): T[] {
  const rang = (u: Urgence | null) => (u === null ? 3 : u);
  return [...foyers].sort((a, b) => rang(a.urgence) - rang(b.urgence) || a.nom.localeCompare(b.nom, "fr"));
}

/** « 1 foyer sur 4 » : parmi les foyers qui ont une raison d'être vus, ceux déjà visités aujourd'hui. */
export function avancement(foyers: { urgence: Urgence | null; personnes: { vueAujourdhui: boolean }[] }[]): { faits: number; aVoir: number } {
  const aVoir = foyers.filter((f) => f.urgence !== null);
  return { faits: aVoir.filter((f) => f.personnes.some((p) => p.vueAujourdhui)).length, aVoir: aVoir.length };
}
```

- [ ] **Étape 4 : relancer les tests**

Run : `pnpm vitest run tests/domain/tournee.test.ts`
Expected : PASS (8 tests).

- [ ] **Étape 5 : commit**

```bash
git add src/domain/tournee.ts tests/domain/tournee.test.ts
git commit -m "feat(domaine): raisons de passer dans un foyer et ordre de la tournée"
```

---

### Tâche 4 : notes vocales en base, Koffi suit les foyers de Sèhoun

**Fichiers :**
- Modifier : `src/server/db/schema.ts`, `src/server/demo/semer.ts`
- Créer : `drizzle/0002_notes_vocales.sql` (généré)
- Tester : `tests/server/demo/semer.test.ts`

**Interfaces :**
- Produit :
  - table `fichiers` : `evenementId` (clé, référence l'événement de la visite), `type`, `taille`, `donnees` (`bytea`), `recuLe` ;
  - dans la démo : seuls les foyers de Zogbodomey (Sèhoun, Kinta, Adingnigon) ont Koffi pour relais ; une visite de Koffi chez Rachida il y a 3 jours.

- [ ] **Étape 1 : écrire le test qui échoue**

Dans `tests/server/demo/semer.test.ts`, ajouter `foyers` à l'import du schéma, puis dans le `describe` :

```ts
  it("donne à Koffi les foyers de Sèhoun, avec une visite déjà faite chez Rachida", async () => {
    await semerDemo(db, { aujourdhui });
    const [koffi] = await db.select().from(comptes).where(eq(comptes.identifiant, "koffi.agbessi"));
    const suivis = await db.select().from(foyers).where(eq(foyers.relaisId, koffi!.id));
    expect(suivis.map((f) => f.nom)).toEqual(expect.arrayContaining(["Dossou", "Salifou"]));
    expect(suivis.map((f) => f.nom)).not.toContain("Houngbo");
    expect(suivis.every((f) => ["Sèhoun", "Kinta", "Adingnigon"].includes(f.village))).toBe(true);
    const visites = await db.select().from(evenements).where(eq(evenements.type, "visite_domicile"));
    expect(visites).toEqual([expect.objectContaining({ auteurId: koffi!.id, donnees: { constat: "tout_va_bien", noteVocale: false } })]);
  });
```

Run : `pnpm vitest run tests/server/demo/semer.test.ts`
Expected : FAIL (Houngbo suivi par Koffi, aucune visite).

- [ ] **Étape 2 : ajouter la table et générer la migration**

Dans `src/server/db/schema.ts` : ajouter `customType` à l'import de `drizzle-orm/pg-core`, puis après la table `alertes` :

```ts
/** Octets bruts (bytea) : les notes vocales restent en base, sans volume à monter. */
const octets = customType<{ data: Uint8Array; driverData: Buffer }>({
  dataType: () => "bytea",
  toDriver: (valeur) => Buffer.from(valeur),
  fromDriver: (valeur) => new Uint8Array(valeur),
});

/** Note vocale d'une visite du relais : même identifiant que l'événement de la visite. */
export const fichiers = pgTable("fichiers", {
  evenementId: uuid("evenement_id")
    .primaryKey()
    .references(() => evenements.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  taille: integer("taille").notNull(),
  donnees: octets("donnees").notNull(),
  recuLe: horodatage("recu_le").defaultNow().notNull(),
});
```

```bash
pnpm db:generate --name notes_vocales
grep -c "CREATE TABLE" drizzle/0002_notes_vocales.sql
```

Expected : `1`.

- [ ] **Étape 3 : modifier la démo**

Dans `src/server/demo/semer.ts` :

1. Ajouter `"fichiers"` en tête de `TABLES`.
2. Remplacer la création des foyers par un relais seulement pour Zogbodomey :

```ts
  const creerFoyer = async (nom: string, village: string, communeId: string) => {
    // Koffi est le relais de Sèhoun : il suit les foyers de Zogbodomey.
    const relaisId = communeId === zogbodomey!.id ? relais.id : null;
    const [f] = await db.insert(t.foyers).values({ nom, village, communeId, relaisId }).returning();
    return f!;
  };
```

3. Après les relevés de tension de Codjo, ajouter :

```ts
  // --- Une visite de Koffi chez Rachida, il y a 3 jours ---
  await db.insert(t.evenements).values({
    id: randomUUID(),
    patientId: idsPersonnages.rachida!,
    type: "visite_domicile",
    auteurId: relais.id,
    survenuLe: new Date(depuisDateISO(ajouterJours(aujourdhui, -3)).getTime() + 9 * 3_600_000),
    donnees: { constat: "tout_va_bien", noteVocale: false },
  });
  nbEvenements++;
```

- [ ] **Étape 4 : relancer les tests du serveur**

Run : `pnpm vitest run tests/server`
Expected : PASS.

- [ ] **Étape 5 : vérifier les types et committer**

```bash
pnpm typecheck
git add src/server/db/schema.ts src/server/demo drizzle tests/server/demo/semer.test.ts
git commit -m "feat(base): notes vocales en base ; Koffi suit les foyers de Sèhoun"
```

---

### Tâche 5 : tournée du relais (lecture)

**Fichiers :**
- Modifier : `src/server/requetes/soignant.ts` (exporter `telephonesPrincipaux`)
- Créer : `src/server/requetes/tournee.ts`
- Tester : `tests/server/requetes/tournee.test.ts`

**Interfaces :**
- Consomme : `raisonsDe`, `urgenceDuFoyer`, `trierFoyers`, `Tournee` (tâche 3) ; `risquesDes` ; `etapesFaites`, `cleEtape` ; `planifier`, `PROGRAMMES`, `statutEtape` ; `telephonesPrincipaux`.
- Produit : `tourneeDuRelais(db, relaisId, relais: string, aujourdhui, maintenant): Promise<Tournee>`. Une étape manquée compte si elle date de moins de 60 jours et n'a pas de place réservée plus tard. Une étape proche est une étape non réservée prévue dans les 7 jours. `vueAujourdhui` : une visite à domicile survenue depuis le début du jour au Bénin.

- [ ] **Étape 1 : écrire les tests qui échouent**

Créer `tests/server/requetes/tournee.test.ts` :

```ts
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/server/db/client";
import { semerDemo } from "@/server/demo/semer";
import { signalerDanger } from "@/server/patient/signalement";
import { tourneeDuRelais } from "@/server/requetes/tournee";
import { creerDbDeTest } from "../../aides/base-de-test";
import { COMPTE, idCompte, idPatient } from "../../aides/demo";

const aujourdhui = "2026-09-25";
let db: Db;
let fermer: () => Promise<void>;
let koffi: string;

beforeAll(async () => {
  ({ db, fermer } = await creerDbDeTest());
  await semerDemo(db, { aujourdhui });
  koffi = await idCompte(db, "koffi.agbessi");
});
afterAll(async () => fermer());

describe("tourneeDuRelais", () => {
  it("donne les foyers de Koffi avec les raisons d'y passer", async () => {
    const tournee = await tourneeDuRelais(db, koffi, "Koffi Agbessi", aujourdhui, new Date("2026-09-25T07:00:00Z"));
    expect(tournee).toMatchObject({ relais: "Koffi Agbessi", aujourdhui, prepareeLe: "2026-09-25T07:00:00.000Z" });
    const noms = tournee.foyers.map((f) => f.nom);
    expect(noms).toEqual(expect.arrayContaining(["Dossou", "Salifou"]));
    expect(noms).not.toContain("Houngbo");
    const afiavi = tournee.foyers.find((f) => f.nom === "Dossou")?.personnes.find((p) => p.prenom === "Afiavi");
    expect(afiavi).toMatchObject({ enceinte: true, malvoyant: false, vueAujourdhui: false, telephone: "+2290197000003" });
    expect(afiavi?.raisons).toContainEqual({ texte: "Consultation prénatale 2 manquée", urgence: 1 });
    // La visite de la démo chez Rachida date de 3 jours : elle ne compte pas pour aujourd'hui.
    const rachida = tournee.foyers.find((f) => f.nom === "Salifou")?.personnes.find((p) => p.prenom === "Rachida");
    expect(rachida).toMatchObject({ malvoyant: true, vueAujourdhui: false });
  });

  it("met en tête le foyer d'une personne qui a signalé un danger", async () => {
    await signalerDanger(db, { compteId: await idCompte(db, COMPTE.aicha), patientId: await idPatient(db, "Rachida"), evenementId: randomUUID(), signes: ["fievre"] });
    const tournee = await tourneeDuRelais(db, koffi, "Koffi Agbessi", aujourdhui, new Date());
    expect(tournee.foyers[0]).toMatchObject({ nom: "Salifou", urgence: 0 });
    expect(tournee.foyers[0]?.personnes.find((p) => p.prenom === "Rachida")?.raisons[0]?.urgence).toBe(0);
  });
});
```

Run : `pnpm vitest run tests/server/requetes/tournee.test.ts`
Expected : FAIL (module introuvable).

- [ ] **Étape 2 : écrire le code**

Dans `src/server/requetes/soignant.ts`, exporter `telephonesPrincipaux` (`export async function telephonesPrincipaux…`).

Créer `src/server/requetes/tournee.ts` :

```ts
import { and, eq, gte, inArray, isNull } from "drizzle-orm";
import { planifier } from "@/domain/calendrier";
import { ageEnAnnees, joursEntre, libelleAge, type DateISO } from "@/domain/dates";
import { PROGRAMMES } from "@/domain/programmes";
import { statutEtape } from "@/domain/statuts";
import { debutDuJourAuBenin } from "@/domain/temps";
import { raisonsDe, trierFoyers, urgenceDuFoyer, type FoyerTournee, type Tournee } from "@/domain/tournee";
import type { Db } from "../db/client";
import { alertes, evenements, foyers, inscriptions, ordonnances, patients, rendezVous } from "../db/schema";
import { cleEtape, etapesFaites } from "./etapes-faites";
import { risquesDes } from "./risques";
import { telephonesPrincipaux } from "./soignant";

const RETARD_MAX_JOURS = 60;
const PROCHE_JOURS = 7;

/** Tournée du relais : ses foyers, chaque personne avec les raisons d'y passer, les foyers urgents d'abord. */
export async function tourneeDuRelais(db: Db, relaisId: string, relais: string, aujourdhui: DateISO, maintenant: Date): Promise<Tournee> {
  const lesFoyers = await db.select().from(foyers).where(eq(foyers.relaisId, relaisId));
  const tournee: Tournee = { relais, prepareeLe: maintenant.toISOString(), aujourdhui, foyers: [] };
  if (lesFoyers.length === 0) return tournee;
  const personnes = await db
    .select({
      id: patients.id,
      prenom: patients.prenom,
      nom: patients.nom,
      sexe: patients.sexe,
      dateNaissance: patients.dateNaissance,
      antecedents: patients.antecedents,
      malvoyant: patients.malvoyant,
      foyerId: patients.foyerId,
    })
    .from(patients)
    .where(inArray(patients.foyerId, lesFoyers.map((f) => f.id)));
  const ids = personnes.map((p) => p.id);
  const [telephones, lesInscriptions, faites, rdvs, risques, ouvertes, lesOrdonnances, delivrances, visites] = ids.length
    ? await Promise.all([
        telephonesPrincipaux(db, ids),
        db.select().from(inscriptions).where(and(inArray(inscriptions.patientId, ids), eq(inscriptions.active, true))),
        etapesFaites(db, ids),
        db
          .select({ inscriptionId: rendezVous.inscriptionId, etapeCode: rendezVous.etapeCode, datePrevue: rendezVous.datePrevue, creneauId: rendezVous.creneauId })
          .from(rendezVous)
          .where(and(inArray(rendezVous.patientId, ids), isNull(rendezVous.annuleLe))),
        risquesDes(db, personnes, aujourdhui),
        db
          .select({ patientId: alertes.patientId })
          .from(alertes)
          .where(and(inArray(alertes.patientId, ids), isNull(alertes.priseEnChargeLe), isNull(alertes.annuleeLe))),
        db.select({ id: ordonnances.id, patientId: ordonnances.patientId, code: ordonnances.codeRetrait }).from(ordonnances).where(inArray(ordonnances.patientId, ids)),
        db
          .select({ donnees: evenements.donnees })
          .from(evenements)
          .where(and(inArray(evenements.patientId, ids), eq(evenements.type, "delivrance"))),
        db
          .select({ patientId: evenements.patientId })
          .from(evenements)
          .where(
            and(inArray(evenements.patientId, ids), eq(evenements.type, "visite_domicile"), gte(evenements.survenuLe, debutDuJourAuBenin(aujourdhui))),
          ),
      ])
    : [new Map<string, string>(), [], new Map(), [], new Map(), [], [], [], []];
  const vues = new Set(visites.map((v) => v.patientId));
  const delivrees = new Set(delivrances.map((d) => d.donnees.ordonnanceId));

  tournee.foyers = trierFoyers(
    lesFoyers.map((foyer): FoyerTournee => {
      const membres = personnes
        .filter((p) => p.foyerId === foyer.id)
        .map((p) => {
          const etapesManquees: string[] = [];
          const etapesProches: string[] = [];
          const sesInscriptions = lesInscriptions.filter((i) => i.patientId === p.id);
          for (const inscription of sesInscriptions) {
            for (const etape of planifier(PROGRAMMES[inscription.programme], inscription.dateReference, inscription.dateInscription)) {
              if (!etape.rendezVous || faites.get(p.id)?.has(cleEtape(etape.motif, etape.code))) continue;
              const reservee = rdvs.some(
                (r) => r.inscriptionId === inscription.id && r.etapeCode === etape.code && r.creneauId !== null && r.datePrevue >= aujourdhui,
              );
              if (reservee) continue;
              const statut = statutEtape(etape, false, aujourdhui);
              const ecart = joursEntre(aujourdhui, etape.datePrevue);
              if (statut === "manquee" && -ecart <= RETARD_MAX_JOURS) etapesManquees.push(etape.libelle);
              if (statut === "a_venir" && ecart >= 0 && ecart <= PROCHE_JOURS) etapesProches.push(etape.libelle);
            }
          }
          return {
            id: p.id,
            prenom: p.prenom,
            nom: p.nom,
            sexe: p.sexe,
            age: ageEnAnnees(p.dateNaissance, aujourdhui),
            libelleAge: libelleAge(p.dateNaissance, aujourdhui),
            telephone: telephones.get(p.id) ?? null,
            enceinte: sesInscriptions.some((i) => i.programme === "grossesse"),
            malvoyant: p.malvoyant,
            vueAujourdhui: vues.has(p.id),
            raisons: raisonsDe({
              alertesOuvertes: ouvertes.filter((a) => a.patientId === p.id).length,
              etapesManquees,
              risque: risques.get(p.id)?.global ?? { niveau: "normal", motifs: [] },
              ordonnancesARetirer: lesOrdonnances.filter((o) => o.patientId === p.id && !delivrees.has(o.id)).map((o) => o.code),
              etapesProches,
            }),
          };
        })
        .sort((a, b) => (a.raisons[0]?.urgence ?? 3) - (b.raisons[0]?.urgence ?? 3));
      return { id: foyer.id, nom: foyer.nom, village: foyer.village, urgence: urgenceDuFoyer(membres), personnes: membres };
    }),
  );
  return tournee;
}
```

- [ ] **Étape 3 : relancer les tests, vérifier les types**

Run : `pnpm vitest run tests/server/requetes/tournee.test.ts && pnpm typecheck`
Expected : PASS (2 tests), aucune erreur de type.

- [ ] **Étape 4 : commit**

```bash
git add src/server/requetes tests/server/requetes/tournee.test.ts
git commit -m "feat(relais): tournée du relais avec les raisons de passer dans chaque foyer"
```

---

### Tâche 6 : droits du relais et inscription d'une personne

**Fichiers :**
- Modifier : `src/server/droits.ts`
- Créer : `src/server/inscriptions.ts`, `src/server/relais/inscription.ts`
- Tester : `tests/server/relais/inscription.test.ts`

**Interfaces :**
- Consomme : `InscriptionDonnees` (tâche 1), `genererCodeRetrait` (même format que le code du carnet), `planifier`, `PROGRAMMES`.
- Produit :
  - `patientDuRelais(db, relaisId, patientId): Promise<boolean>`, `foyerDuRelais(db, relaisId, foyerId): Promise<boolean>` ;
  - `inscrireAuProgramme(db: Pick<Db, "insert">, { patientId, etablissementId, programme, dateReference, dateInscription, source }): Promise<string>` ;
  - `type RefusInscription = "foyer_hors_tournee" | "sans_centre" | "identifiant_pris"` ;
  - `inscrirePersonne(db, { relaisId, patientId, evenementId, donnees, survenuLe, aujourdhui }): Promise<Resultat<"accepte" | "deja_recu", RefusInscription>>`.

- [ ] **Étape 1 : écrire les tests qui échouent**

Créer `tests/server/relais/inscription.test.ts` :

```ts
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { InscriptionDonnees } from "@/domain/evenements";
import { uuidV7 } from "@/domain/identifiants";
import type { Db } from "@/server/db/client";
import { evenements, foyers, inscriptions, patients, rendezVous } from "@/server/db/schema";
import { semerDemo } from "@/server/demo/semer";
import { foyerDuRelais, patientDuRelais } from "@/server/droits";
import { inscrirePersonne } from "@/server/relais/inscription";
import { creerDbDeTest } from "../../aides/base-de-test";
import { idCompte, idPatient } from "../../aides/demo";

const aujourdhui = "2026-09-25";
const survenuLe = new Date("2026-09-25T09:00:00Z");
let db: Db;
let fermer: () => Promise<void>;
let koffi: string;
let foyerDossou: string;
let foyerHoungbo: string;

beforeAll(async () => {
  ({ db, fermer } = await creerDbDeTest());
  await semerDemo(db, { aujourdhui });
  koffi = await idCompte(db, "koffi.agbessi");
  const idFoyer = async (nom: string) => (await db.select({ id: foyers.id }).from(foyers).where(eq(foyers.nom, nom)))[0]!.id;
  foyerDossou = await idFoyer("Dossou");
  foyerHoungbo = await idFoyer("Houngbo");
});
afterAll(async () => fermer());

describe("droits du relais", () => {
  it("ne donne au relais que les personnes et les foyers de sa tournée", async () => {
    expect(await patientDuRelais(db, koffi, await idPatient(db, "Afiavi"))).toBe(true);
    expect(await patientDuRelais(db, koffi, await idPatient(db, "Codjo"))).toBe(false);
    expect(await patientDuRelais(db, koffi, "pas-un-identifiant")).toBe(false);
    expect(await foyerDuRelais(db, koffi, foyerDossou)).toBe(true);
    expect(await foyerDuRelais(db, koffi, foyerHoungbo)).toBe(false);
  });
});

describe("inscrirePersonne", () => {
  const yao = (foyerId: string): InscriptionDonnees => ({
    foyerId,
    prenom: "Yao",
    nom: "Dossou",
    sexe: "M",
    dateNaissance: "2026-09-20",
    telephone: "+2290197000003",
    programme: { code: "vaccination", dateReference: "2026-09-20" },
  });

  it("crée le carnet avec l'identifiant du téléphone, le suivi et ses rendez-vous", async () => {
    const patientId = uuidV7();
    const evenementId = uuidV7();
    expect(await inscrirePersonne(db, { relaisId: koffi, patientId, evenementId, donnees: yao(foyerDossou), survenuLe, aujourdhui })).toEqual({
      ok: true,
      donnees: "accepte",
    });
    const [personne] = await db.select().from(patients).where(eq(patients.id, patientId));
    expect(personne).toMatchObject({ prenom: "Yao", foyerId: foyerDossou, dateNaissance: "2026-09-20", canalPrefere: "sms" });
    expect(personne!.codeCourt).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    expect(await db.select().from(inscriptions).where(eq(inscriptions.patientId, patientId))).toEqual([
      expect.objectContaining({ programme: "vaccination", dateReference: "2026-09-20", dateInscription: aujourdhui }),
    ]);
    const rdvs = await db.select().from(rendezVous).where(eq(rendezVous.patientId, patientId));
    expect(rdvs.length).toBeGreaterThan(0);
    expect(rdvs.every((r) => r.motif === "vaccin" && r.source === "relais" && r.creneauId === null)).toBe(true);
    expect(await db.select().from(evenements).where(eq(evenements.id, evenementId))).toEqual([
      expect.objectContaining({ type: "inscription", patientId, auteurId: koffi }),
    ]);
    expect(await patientDuRelais(db, koffi, patientId)).toBe(true);
  });

  it("reconnaît une inscription déjà reçue", async () => {
    const kossi: InscriptionDonnees = { foyerId: foyerDossou, prenom: "Kossi", nom: "Dossou", sexe: "M", dateNaissance: "1990-05-01" };
    const e = { relaisId: koffi, patientId: uuidV7(), evenementId: uuidV7(), donnees: kossi, survenuLe, aujourdhui };
    expect(await inscrirePersonne(db, e)).toEqual({ ok: true, donnees: "accepte" });
    expect(await inscrirePersonne(db, e)).toEqual({ ok: true, donnees: "deja_recu" });
    // Sans téléphone, les rappels passent par le relais.
    expect(await db.select().from(patients).where(eq(patients.prenom, "Kossi"))).toEqual([expect.objectContaining({ canalPrefere: "relais" })]);
  });

  it("refuse un foyer qui n'est pas dans sa tournée", async () => {
    expect(
      await inscrirePersonne(db, { relaisId: koffi, patientId: uuidV7(), evenementId: uuidV7(), donnees: yao(foyerHoungbo), survenuLe, aujourdhui }),
    ).toEqual({ ok: false, erreur: "foyer_hors_tournee" });
  });
});
```

Run : `pnpm vitest run tests/server/relais/inscription.test.ts`
Expected : FAIL (`patientDuRelais` non exporté, module `relais/inscription` introuvable).

- [ ] **Étape 2 : écrire le code**

Ajouter à `src/server/droits.ts` (importer `foyers` depuis le schéma) :

```ts
/** Vrai si la personne vit dans un foyer suivi par ce relais : il n'agit que sur sa tournée (spec §12). */
export async function patientDuRelais(db: Db, relaisId: string, patientId: string): Promise<boolean> {
  if (!estUuid(patientId)) return false;
  const [ligne] = await db
    .select({ id: patients.id })
    .from(patients)
    .innerJoin(foyers, eq(patients.foyerId, foyers.id))
    .where(and(eq(patients.id, patientId), eq(foyers.relaisId, relaisId)))
    .limit(1);
  return Boolean(ligne);
}

export async function foyerDuRelais(db: Db, relaisId: string, foyerId: string): Promise<boolean> {
  if (!estUuid(foyerId)) return false;
  const [ligne] = await db
    .select({ id: foyers.id })
    .from(foyers)
    .where(and(eq(foyers.id, foyerId), eq(foyers.relaisId, relaisId)))
    .limit(1);
  return Boolean(ligne);
}
```

Créer `src/server/inscriptions.ts` :

```ts
import { planifier } from "@/domain/calendrier";
import type { DateISO } from "@/domain/dates";
import { PROGRAMMES, type CodeProgramme } from "@/domain/programmes";
import type { Db } from "./db/client";
import { inscriptions, rendezVous } from "./db/schema";

/** Inscrit la personne à un programme de suivi et prévoit ses rendez-vous, sans place réservée. Accepte une transaction. */
export async function inscrireAuProgramme(
  db: Pick<Db, "insert">,
  e: {
    patientId: string;
    etablissementId: string;
    programme: CodeProgramme;
    dateReference: DateISO;
    dateInscription: DateISO;
    source: "programme" | "relais";
  },
): Promise<string> {
  const [inscription] = await db
    .insert(inscriptions)
    .values({ patientId: e.patientId, programme: e.programme, dateReference: e.dateReference, dateInscription: e.dateInscription })
    .returning({ id: inscriptions.id });
  const etapes = planifier(PROGRAMMES[e.programme], e.dateReference, e.dateInscription).filter((etape) => etape.rendezVous);
  if (etapes.length) {
    await db.insert(rendezVous).values(
      etapes.map((etape) => ({
        patientId: e.patientId,
        inscriptionId: inscription!.id,
        etapeCode: etape.code,
        motif: etape.motif,
        datePrevue: etape.datePrevue,
        moment: "matin" as const,
        etablissementId: e.etablissementId,
        source: e.source,
      })),
    );
  }
  return inscription!.id;
}
```

Créer `src/server/relais/inscription.ts` :

```ts
import { and, eq } from "drizzle-orm";
import type { DateISO } from "@/domain/dates";
import type { InscriptionDonnees } from "@/domain/evenements";
import { genererCodeRetrait } from "@/domain/ordonnances";
import type { Db } from "../db/client";
import { consentements, contacts, etablissements, evenements, foyers, patients } from "../db/schema";
import { foyerDuRelais } from "../droits";
import { inscrireAuProgramme } from "../inscriptions";
import { echec, reussite, type Resultat } from "../resultat";

export type RefusInscription = "foyer_hors_tournee" | "sans_centre" | "identifiant_pris";

/**
 * Personne inscrite par le relais pendant sa tournée, parfois sans réseau.
 * Son identifiant vient du téléphone : renvoyer l'inscription ne crée pas un deuxième carnet.
 */
export async function inscrirePersonne(
  db: Db,
  e: { relaisId: string; patientId: string; evenementId: string; donnees: InscriptionDonnees; survenuLe: Date; aujourdhui: DateISO },
): Promise<Resultat<"accepte" | "deja_recu", RefusInscription>> {
  const d = e.donnees;
  if (!(await foyerDuRelais(db, e.relaisId, d.foyerId))) return echec("foyer_hors_tournee");
  const [existant] = await db.select({ foyerId: patients.foyerId }).from(patients).where(eq(patients.id, e.patientId));
  if (existant) return existant.foyerId === d.foyerId ? reussite("deja_recu") : echec("identifiant_pris");
  const etablissementId = await centreDuFoyer(db, d.foyerId);
  if (!etablissementId) return echec("sans_centre");
  const codeCourt = await codeDuCarnetLibre(db);

  await db.transaction(async (tx) => {
    await tx.insert(patients).values({
      id: e.patientId,
      foyerId: d.foyerId,
      prenom: d.prenom,
      nom: d.nom,
      sexe: d.sexe,
      dateNaissance: d.dateNaissance,
      canalPrefere: d.telephone ? "sms" : "relais",
      codeCourt,
      etablissementId,
    });
    if (d.telephone) {
      await tx.insert(contacts).values({ patientId: e.patientId, telephone: d.telephone, role: "principal", proprietaire: "soi" });
      await tx.insert(consentements).values({ patientId: e.patientId, canal: "sms", recueilliPar: e.relaisId });
    }
    if (d.programme) {
      await inscrireAuProgramme(tx, {
        patientId: e.patientId,
        etablissementId,
        programme: d.programme.code,
        dateReference: d.programme.dateReference,
        dateInscription: e.aujourdhui,
        source: "relais",
      });
    }
    await tx.insert(evenements).values({ id: e.evenementId, patientId: e.patientId, type: "inscription", auteurId: e.relaisId, survenuLe: e.survenuLe, donnees: d });
  });
  return reussite("accepte");
}

/** Le centre des autres personnes du foyer, sinon le premier centre de santé de sa commune. */
async function centreDuFoyer(db: Db, foyerId: string): Promise<string | null> {
  const [voisin] = await db.select({ id: patients.etablissementId }).from(patients).where(eq(patients.foyerId, foyerId)).limit(1);
  if (voisin) return voisin.id;
  const [centre] = await db
    .select({ id: etablissements.id })
    .from(foyers)
    .innerJoin(etablissements, and(eq(etablissements.communeId, foyers.communeId), eq(etablissements.type, "centre_sante")))
    .where(eq(foyers.id, foyerId))
    .limit(1);
  return centre?.id ?? null;
}

/** Code écrit dans le carnet, au même format que le code de retrait : on en tire un autre s'il est déjà pris. */
async function codeDuCarnetLibre(db: Db): Promise<string> {
  for (;;) {
    const code = genererCodeRetrait();
    const [pris] = await db.select({ id: patients.id }).from(patients).where(eq(patients.codeCourt, code)).limit(1);
    if (!pris) return code;
  }
}
```

- [ ] **Étape 3 : relancer les tests, vérifier les types**

Run : `pnpm vitest run tests/server/relais/inscription.test.ts && pnpm typecheck`
Expected : PASS (4 tests), aucune erreur de type (une transaction Drizzle est acceptée comme `Pick<Db, "insert">`).

- [ ] **Étape 4 : commit**

```bash
git add src/server/droits.ts src/server/inscriptions.ts src/server/relais tests/server/relais
git commit -m "feat(relais): droits sur les foyers suivis et inscription d'une personne"
```

---

### Tâche 7 : synchronisation d'un lot (serveur)

**Fichiers :**
- Modifier : `src/server/patient/signalement.ts`
- Créer : `src/server/relais/synchronisation.ts`
- Tester : `tests/server/relais/synchronisation.test.ts` (et `tests/server/patient/signalement.test.ts`, inchangé, doit rester vert)

**Interfaces :**
- Consomme : `evenementEntrantSchema`, `dateAcceptable`, `MAX_LOT`, `ResultatSync` (tâche 1) ; `patientDuRelais`, `inscrirePersonne`, `RefusInscription` (tâche 6) ; `tourneeDuRelais` (tâche 5, dans le test).
- Produit :
  - `enregistrerSignalement(db, { patientId, evenementId, auteurId, signes, source, survenuLe, maintenant })` : partagé par le patient et le relais ; l'échéance de 15 minutes part de la réception ;
  - `MOTIFS_REFUS` (clés `illisible`, `date`, `incomplete`, `type`, `hors_tournee`, `foyer_hors_tournee`, `sans_centre`, `identifiant_pris`) ;
  - `synchroniser(db, { relaisId, lot: unknown[], maintenant, aujourdhui }): Promise<ResultatSync[]>`.

- [ ] **Étape 1 : écrire les tests qui échouent**

Créer `tests/server/relais/synchronisation.test.ts` :

```ts
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { uuidV7 } from "@/domain/identifiants";
import type { Db } from "@/server/db/client";
import { alertes, evenements, foyers } from "@/server/db/schema";
import { semerDemo } from "@/server/demo/semer";
import { MOTIFS_REFUS, synchroniser } from "@/server/relais/synchronisation";
import { tourneeDuRelais } from "@/server/requetes/tournee";
import { creerDbDeTest } from "../../aides/base-de-test";
import { idCompte, idPatient } from "../../aides/demo";

const aujourdhui = "2026-09-25";
const maintenant = new Date("2026-09-25T10:00:00Z");
let db: Db;
let fermer: () => Promise<void>;
let koffi: string;
let afiavi: string;

beforeAll(async () => {
  ({ db, fermer } = await creerDbDeTest());
  await semerDemo(db, { aujourdhui });
  koffi = await idCompte(db, "koffi.agbessi");
  afiavi = await idPatient(db, "Afiavi");
});
afterAll(async () => fermer());

const saisie = (patientId: string, type: string, donnees: Record<string, unknown>, survenuLe = "2026-09-25T09:30:00.000Z") => ({
  id: uuidV7(),
  patientId,
  type,
  survenuLe,
  donnees,
});
const envoyer = (lot: unknown[]) => synchroniser(db, { relaisId: koffi, lot, maintenant, aujourdhui });

describe("synchroniser", () => {
  it("enregistre une visite, puis la reconnaît quand elle revient après une coupure", async () => {
    const visite = saisie(afiavi, "visite_domicile", { constat: "a_orienter", noteVocale: true, texte: "Très fatiguée" });
    expect(await envoyer([visite])).toEqual([{ id: visite.id, statut: "accepte" }]);
    expect(await envoyer([visite])).toEqual([{ id: visite.id, statut: "deja_recu" }]);
    expect(await db.select().from(evenements).where(eq(evenements.id, visite.id))).toEqual([
      expect.objectContaining({
        auteurId: koffi,
        survenuLe: new Date("2026-09-25T09:30:00.000Z"),
        donnees: { constat: "a_orienter", noteVocale: true, texte: "Très fatiguée" },
      }),
    ]);
  });

  it("refuse avec la raison : hors tournée, horloge fausse, incomplète, non permise ou illisible", async () => {
    const resultats = await envoyer([
      saisie(await idPatient(db, "Codjo"), "visite_domicile", { constat: "tout_va_bien" }),
      saisie(afiavi, "visite_domicile", { constat: "tout_va_bien" }, "2026-10-02T09:00:00.000Z"),
      saisie(afiavi, "visite_domicile", { constat: "peut-etre" }),
      saisie(afiavi, "prise_medicament", { traitement: "Fer", moment: "soir", statut: "fait" }),
      { id: "pas-un-identifiant" },
    ]);
    expect(resultats.map((r) => r.statut)).toEqual(["refuse", "refuse", "refuse", "refuse", "refuse"]);
    expect(resultats.map((r) => r.motif)).toEqual([
      MOTIFS_REFUS.hors_tournee,
      MOTIFS_REFUS.date,
      MOTIFS_REFUS.incomplete,
      MOTIFS_REFUS.type,
      MOTIFS_REFUS.illisible,
    ]);
    expect(resultats[4]?.id).toBe("pas-un-identifiant");
  });

  it("accepte la tension et la visite d'une personne inscrite plus haut dans le même lot", async () => {
    const [salifou] = await db.select({ id: foyers.id }).from(foyers).where(eq(foyers.nom, "Salifou"));
    const inscription = saisie(uuidV7(), "inscription", {
      foyerId: salifou!.id,
      prenom: "Kossi",
      nom: "Salifou",
      sexe: "M",
      dateNaissance: "1966-01-01",
      programme: { code: "hypertension", dateReference: aujourdhui },
    });
    const mesure = saisie(inscription.patientId, "mesure", { mesures: { tensionSys: 150, tensionDia: 95 } });
    const visite = saisie(inscription.patientId, "visite_domicile", { constat: "a_orienter" });
    expect((await envoyer([inscription, mesure, visite])).map((r) => r.statut)).toEqual(["accepte", "accepte", "accepte"]);
    const tournee = await tourneeDuRelais(db, koffi, "Koffi Agbessi", aujourdhui, maintenant);
    const kossi = tournee.foyers.find((f) => f.nom === "Salifou")?.personnes.find((p) => p.prenom === "Kossi");
    expect(kossi).toMatchObject({ id: inscription.patientId, vueAujourdhui: true });
  });

  it("transmet au centre le signe de danger vu par le relais, avec 15 minutes dès la réception", async () => {
    const signal = saisie(await idPatient(db, "Rachida"), "signalement_danger", { signes: ["fievre"], source: "relais" });
    expect(await envoyer([signal])).toEqual([{ id: signal.id, statut: "accepte" }]);
    const [alerte] = await db.select().from(alertes).where(eq(alertes.evenementId, signal.id));
    expect(alerte?.echeance).toEqual(new Date("2026-09-25T10:15:00Z"));
    const [evenement] = await db.select().from(evenements).where(eq(evenements.id, signal.id));
    expect(evenement).toMatchObject({ auteurId: koffi, survenuLe: new Date("2026-09-25T09:30:00.000Z"), donnees: { signes: ["fievre"], source: "relais" } });
  });
});
```

Run : `pnpm vitest run tests/server/relais/synchronisation.test.ts`
Expected : FAIL (module `relais/synchronisation` introuvable).

- [ ] **Étape 2 : partager l'enregistrement du signalement**

Dans `src/server/patient/signalement.ts`, remplacer `signalerDanger` par :

```ts
/**
 * Enregistre le signe de danger et l'alerte du centre de rattachement, une seule fois par identifiant d'événement.
 * Partagé par le patient (tout de suite) et le relais (au retour du réseau) : les 15 minutes courent dès la réception.
 */
export async function enregistrerSignalement(
  db: Db,
  e: {
    patientId: string;
    evenementId: string;
    auteurId: string;
    signes: CodeSigne[];
    source: "patient" | "relais" | "proche";
    survenuLe: Date;
    maintenant: Date;
  },
): Promise<ResultatSignalement> {
  const evenement = evenementSchema.safeParse({ type: "signalement_danger", donnees: { signes: e.signes, source: e.source } });
  if (!evenement.success || !estUuid(e.evenementId)) return echec("invalide");
  const [patient] = await db.select({ etablissementId: patients.etablissementId }).from(patients).where(eq(patients.id, e.patientId));
  const etablissement = await etablissementDuPatient(db, e.patientId);
  if (!patient || !etablissement) return echec("invalide");

  return db.transaction(async (tx): Promise<ResultatSignalement> => {
    const insere = await tx
      .insert(evenements)
      .values({ id: e.evenementId, patientId: e.patientId, type: "signalement_danger", auteurId: e.auteurId, survenuLe: e.survenuLe, donnees: evenement.data.donnees })
      .onConflictDoNothing({ target: evenements.id })
      .returning({ id: evenements.id });
    if (insere.length === 0) {
      // Même signalement renvoyé (double appui, retour du réseau) : on renvoie l'alerte déjà créée.
      const [existante] = await tx.select().from(alertes).where(eq(alertes.evenementId, e.evenementId));
      if (!existante || existante.patientId !== e.patientId) return echec("invalide");
      return reussite({ alerteId: existante.id, recueLe: existante.creeeLe, echeance: existante.echeance, etablissement });
    }
    const [alerte] = await tx
      .insert(alertes)
      .values({ patientId: e.patientId, evenementId: e.evenementId, etablissementId: patient.etablissementId, creeeLe: e.maintenant, echeance: echeanceAlerte(e.maintenant) })
      .returning();
    return reussite({ alerteId: alerte!.id, recueLe: alerte!.creeeLe, echeance: alerte!.echeance, etablissement });
  });
}

/** Signalement fait par la personne ou par un proche qui gère son carnet. */
export async function signalerDanger(
  db: Db,
  e: { compteId: string; patientId: string; evenementId: string; signes: CodeSigne[]; maintenant?: Date },
): Promise<ResultatSignalement> {
  const lien = await lienAvecPatient(db, e.compteId, e.patientId);
  if (!lien) return echec("interdit");
  const maintenant = e.maintenant ?? new Date();
  return enregistrerSignalement(db, {
    patientId: e.patientId,
    evenementId: e.evenementId,
    auteurId: e.compteId,
    signes: e.signes,
    source: lien === "soi" ? "patient" : "proche",
    survenuLe: maintenant,
    maintenant,
  });
}
```

Run : `pnpm vitest run tests/server/patient/signalement.test.ts`
Expected : PASS (comportement du patient inchangé).

- [ ] **Étape 3 : écrire la synchronisation**

Créer `src/server/relais/synchronisation.ts` :

```ts
import { eq } from "drizzle-orm";
import type { DateISO } from "@/domain/dates";
import { evenementSchema } from "@/domain/evenements";
import { dateAcceptable, evenementEntrantSchema, MAX_LOT, type ResultatSync } from "@/domain/synchronisation";
import type { Db } from "../db/client";
import { evenements } from "../db/schema";
import { patientDuRelais } from "../droits";
import { enregistrerSignalement } from "../patient/signalement";
import { inscrirePersonne } from "./inscription";

const TYPES_DU_RELAIS = new Set(["visite_domicile", "mesure", "signalement_danger", "inscription"]);

/** Raisons lues par le relais dans « À corriger » : elles disent quoi faire. */
export const MOTIFS_REFUS = {
  illisible: "Saisie illisible : refaites-la.",
  date: "La date du téléphone semble fausse : réglez la date et l'heure, puis refaites la saisie.",
  incomplete: "Saisie incomplète : refaites-la.",
  type: "Ce type de saisie n'est pas permis au relais.",
  hors_tournee: "Cette personne n'est pas dans votre tournée.",
  foyer_hors_tournee: "Ce foyer n'est pas dans votre tournée.",
  sans_centre: "Aucun centre de santé pour ce foyer : voyez avec le centre.",
  identifiant_pris: "Cette saisie porte l'identifiant d'une autre : refaites-la.",
} as const;

interface Contexte {
  relaisId: string;
  maintenant: Date;
  aujourdhui: DateISO;
}

/**
 * Reçoit la file d'envoi du relais, saisie par saisie et dans l'ordre : une inscription passe avant la visite de la personne inscrite.
 * Chaque saisie reçoit une réponse : reçue, déjà reçue (renvoi après une coupure), ou refusée avec sa raison (spec §10.2).
 */
export async function synchroniser(db: Db, e: Contexte & { lot: unknown[] }): Promise<ResultatSync[]> {
  const resultats: ResultatSync[] = [];
  for (const brut of e.lot.slice(0, MAX_LOT)) resultats.push(await traiter(db, e, brut));
  return resultats;
}

async function traiter(db: Db, e: Contexte, brut: unknown): Promise<ResultatSync> {
  const lecture = evenementEntrantSchema.safeParse(brut);
  const id = lecture.success ? lecture.data.id : String((brut as { id?: unknown } | null)?.id ?? "");
  const refus = (motif: string): ResultatSync => ({ id, statut: "refuse", motif });
  if (!lecture.success) return refus(MOTIFS_REFUS.illisible);
  const saisie = lecture.data;
  const survenuLe = new Date(saisie.survenuLe);
  if (!dateAcceptable(survenuLe, e.maintenant)) return refus(MOTIFS_REFUS.date);
  if (!TYPES_DU_RELAIS.has(saisie.type)) return refus(MOTIFS_REFUS.type);
  const evenement = evenementSchema.safeParse({ type: saisie.type, donnees: saisie.donnees });
  if (!evenement.success) return refus(MOTIFS_REFUS.incomplete);

  const [deja] = await db.select({ patientId: evenements.patientId }).from(evenements).where(eq(evenements.id, saisie.id));
  if (deja) return deja.patientId === saisie.patientId ? { id, statut: "deja_recu" } : refus(MOTIFS_REFUS.identifiant_pris);

  const valide = evenement.data;
  if (valide.type === "inscription") {
    const r = await inscrirePersonne(db, {
      relaisId: e.relaisId,
      patientId: saisie.patientId,
      evenementId: saisie.id,
      donnees: valide.donnees,
      survenuLe,
      aujourdhui: e.aujourdhui,
    });
    return r.ok ? { id, statut: r.donnees } : refus(MOTIFS_REFUS[r.erreur]);
  }
  if (!(await patientDuRelais(db, e.relaisId, saisie.patientId))) return refus(MOTIFS_REFUS.hors_tournee);
  if (valide.type === "signalement_danger") {
    const r = await enregistrerSignalement(db, {
      patientId: saisie.patientId,
      evenementId: saisie.id,
      auteurId: e.relaisId,
      signes: valide.donnees.signes,
      source: "relais",
      survenuLe,
      maintenant: e.maintenant,
    });
    return r.ok ? { id, statut: "accepte" } : refus(MOTIFS_REFUS.incomplete);
  }
  await db
    .insert(evenements)
    .values({ id: saisie.id, patientId: saisie.patientId, type: valide.type, auteurId: e.relaisId, survenuLe, donnees: valide.donnees })
    .onConflictDoNothing({ target: evenements.id });
  return { id, statut: "accepte" };
}
```

- [ ] **Étape 4 : relancer les tests, vérifier les types**

Run : `pnpm vitest run tests/server/relais tests/server/patient && pnpm typecheck`
Expected : PASS, aucune erreur de type.

- [ ] **Étape 5 : commit**

```bash
git add src/server/patient/signalement.ts src/server/relais tests/server/relais
git commit -m "feat(relais): synchronisation saisie par saisie, sans doublon et avec la raison des refus"
```

---

### Tâche 8 : notes vocales et routes de l'API

**Fichiers :**
- Créer : `src/server/relais/notes.ts`, `src/app/api/relais/tournee/route.ts`, `src/app/api/sync/route.ts`, `src/app/api/sync/note/route.ts`, `src/app/api/fichiers/[id]/route.ts`
- Tester : `tests/server/relais/notes.test.ts`

**Interfaces :**
- Consomme : table `fichiers` (tâche 4), `synchroniser` (tâche 7), `tourneeDuRelais` (tâche 5), `compteCourant`, `patientDuCentre`.
- Produit :
  - `MAX_NOTE_OCTETS = 2_000_000`, `enregistrerNote(db, { relaisId, evenementId, type, octets }): Promise<Resultat<"accepte" | "deja_recu", "introuvable" | "interdit" | "invalide">>` ;
  - `lireNote(db, compte: Pick<CompteConnecte, "id" | "role" | "etablissementId">, evenementId): Promise<{ type: string; donnees: Uint8Array } | null>` ;
  - `GET /api/relais/tournee` → `Tournee` ; `POST /api/sync` (`{ evenements }`) → `{ resultats }` ; `POST /api/sync/note?id=` (corps = octets, `Content-Type` = type audio) → `{ statut }` ; `GET /api/fichiers/[id]` → la note. Sans session du bon rôle : 401.

- [ ] **Étape 1 : écrire les tests qui échouent**

Créer `tests/server/relais/notes.test.ts` :

```ts
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { uuidV7 } from "@/domain/identifiants";
import type { CompteConnecte } from "@/server/auth/sessions";
import type { Db } from "@/server/db/client";
import { comptes } from "@/server/db/schema";
import { semerDemo } from "@/server/demo/semer";
import { enregistrerNote, lireNote } from "@/server/relais/notes";
import { synchroniser } from "@/server/relais/synchronisation";
import { creerDbDeTest } from "../../aides/base-de-test";
import { COMPTE, idCompte, idPatient } from "../../aides/demo";

let db: Db;
let fermer: () => Promise<void>;
let koffi: string;
let firmin: string;
let centreDeFirmin: string;
let codjo: string;
let afiavi: string;
const octets = new Uint8Array([26, 69, 223, 163, 1, 2, 3]);

beforeAll(async () => {
  ({ db, fermer } = await creerDbDeTest());
  await semerDemo(db, { aujourdhui: "2026-09-25" });
  koffi = await idCompte(db, "koffi.agbessi");
  firmin = await idCompte(db, "firmin.akpovi");
  centreDeFirmin = (await db.select({ id: comptes.etablissementId }).from(comptes).where(eq(comptes.id, firmin)))[0]!.id!;
  codjo = await idCompte(db, COMPTE.codjo);
  afiavi = await idPatient(db, "Afiavi");
});
afterAll(async () => fermer());

/** Une visite reçue du relais, qui annonce une note vocale. */
async function visite(): Promise<string> {
  const id = uuidV7();
  await synchroniser(db, {
    relaisId: koffi,
    lot: [{ id, patientId: afiavi, type: "visite_domicile", survenuLe: "2026-09-25T09:30:00.000Z", donnees: { constat: "tout_va_bien", noteVocale: true } }],
    maintenant: new Date("2026-09-25T10:00:00Z"),
    aujourdhui: "2026-09-25",
  });
  return id;
}

const compte = (id: string, role: CompteConnecte["role"], etablissementId: string | null = null) => ({ id, role, etablissementId });

describe("notes vocales", () => {
  it("garde la note de la visite une seule fois", async () => {
    const note = { relaisId: koffi, evenementId: await visite(), type: "audio/webm;codecs=opus", octets };
    expect(await enregistrerNote(db, note)).toEqual({ ok: true, donnees: "accepte" });
    expect(await enregistrerNote(db, note)).toEqual({ ok: true, donnees: "deja_recu" });
  });

  it("refuse la note d'un autre compte, sans visite, ou qui n'est pas du son", async () => {
    const id = await visite();
    expect(await enregistrerNote(db, { relaisId: firmin, evenementId: id, type: "audio/webm", octets })).toEqual({ ok: false, erreur: "interdit" });
    expect(await enregistrerNote(db, { relaisId: koffi, evenementId: uuidV7(), type: "audio/webm", octets })).toEqual({ ok: false, erreur: "introuvable" });
    expect(await enregistrerNote(db, { relaisId: koffi, evenementId: id, type: "text/html", octets })).toEqual({ ok: false, erreur: "invalide" });
    expect(await enregistrerNote(db, { relaisId: koffi, evenementId: id, type: "audio/webm", octets: new Uint8Array() })).toEqual({ ok: false, erreur: "invalide" });
  });

  it("s'écoute par son relais et par les soignants du centre de la personne, par personne d'autre", async () => {
    const id = await visite();
    await enregistrerNote(db, { relaisId: koffi, evenementId: id, type: "audio/webm;codecs=opus", octets });
    expect(Array.from((await lireNote(db, compte(koffi, "relais"), id))!.donnees)).toEqual(Array.from(octets));
    expect(await lireNote(db, compte(firmin, "soignant", centreDeFirmin), id)).toMatchObject({ type: "audio/webm;codecs=opus" });
    expect(await lireNote(db, compte(firmin, "soignant", null), id)).toBeNull();
    expect(await lireNote(db, compte(codjo, "patient"), id)).toBeNull();
    expect(await lireNote(db, compte(koffi, "relais"), "pas-un-identifiant")).toBeNull();
  });
});
```

Run : `pnpm vitest run tests/server/relais/notes.test.ts`
Expected : FAIL (module `relais/notes` introuvable).

- [ ] **Étape 2 : écrire le code**

Créer `src/server/relais/notes.ts` :

```ts
import { eq } from "drizzle-orm";
import { estUuid } from "@/domain/identifiants";
import type { CompteConnecte } from "../auth/sessions";
import type { Db } from "../db/client";
import { evenements, fichiers } from "../db/schema";
import { patientDuCentre } from "../droits";
import { echec, reussite, type Resultat } from "../resultat";

/** Une minute de voix compressée pèse environ 200 Ko : 2 Mo laissent une large marge. */
export const MAX_NOTE_OCTETS = 2_000_000;
const TYPE_AUDIO = /^audio\/(webm|ogg|mp4|mpeg|aac)(;.*)?$/;

/** Note vocale d'une visite : elle part après la visite, et une seule fois. */
export async function enregistrerNote(
  db: Db,
  e: { relaisId: string; evenementId: string; type: string; octets: Uint8Array },
): Promise<Resultat<"accepte" | "deja_recu", "introuvable" | "interdit" | "invalide">> {
  if (!estUuid(e.evenementId)) return echec("introuvable");
  if (!TYPE_AUDIO.test(e.type) || e.octets.byteLength === 0 || e.octets.byteLength > MAX_NOTE_OCTETS) return echec("invalide");
  const [visite] = await db.select({ auteurId: evenements.auteurId, type: evenements.type }).from(evenements).where(eq(evenements.id, e.evenementId));
  if (!visite || visite.type !== "visite_domicile") return echec("introuvable");
  if (visite.auteurId !== e.relaisId) return echec("interdit");
  const insere = await db
    .insert(fichiers)
    .values({ evenementId: e.evenementId, type: e.type, taille: e.octets.byteLength, donnees: e.octets })
    .onConflictDoNothing({ target: fichiers.evenementId })
    .returning({ id: fichiers.evenementId });
  return reussite(insere.length ? "accepte" : "deja_recu");
}

/** La note ne s'écoute que par le relais qui l'a dite ou par un soignant du centre de la personne (spec §12). */
export async function lireNote(
  db: Db,
  compte: Pick<CompteConnecte, "id" | "role" | "etablissementId">,
  evenementId: string,
): Promise<{ type: string; donnees: Uint8Array } | null> {
  if (!estUuid(evenementId)) return null;
  const [ligne] = await db
    .select({ type: fichiers.type, donnees: fichiers.donnees, auteurId: evenements.auteurId, patientId: evenements.patientId })
    .from(fichiers)
    .innerJoin(evenements, eq(fichiers.evenementId, evenements.id))
    .where(eq(fichiers.evenementId, evenementId));
  if (!ligne) return null;
  const autorise =
    (compte.role === "relais" && ligne.auteurId === compte.id) ||
    (compte.role === "soignant" && (await patientDuCentre(db, compte.etablissementId, ligne.patientId)));
  return autorise ? { type: ligne.type, donnees: ligne.donnees } : null;
}
```

Créer `src/app/api/relais/tournee/route.ts` :

```ts
import { aujourdhuiAuBenin } from "@/domain/dates";
import { compteCourant } from "@/server/auth/cookies";
import { db } from "@/server/db/client";
import { tourneeDuRelais } from "@/server/requetes/tournee";

export const dynamic = "force-dynamic";

/** Tournée du jour, copiée sur le téléphone du relais pour être lue sans réseau. */
export async function GET() {
  const compte = await compteCourant();
  if (compte?.role !== "relais") return Response.json({ erreur: "non_connecte" }, { status: 401 });
  const maintenant = new Date();
  const tournee = await tourneeDuRelais(db(), compte.id, compte.nomAffiche, aujourdhuiAuBenin(maintenant), maintenant);
  return Response.json(tournee, { headers: { "Cache-Control": "no-store" } });
}
```

Créer `src/app/api/sync/route.ts` :

```ts
import { aujourdhuiAuBenin } from "@/domain/dates";
import { MAX_LOT } from "@/domain/synchronisation";
import { compteCourant } from "@/server/auth/cookies";
import { db } from "@/server/db/client";
import { synchroniser } from "@/server/relais/synchronisation";

export const dynamic = "force-dynamic";

/** File d'envoi du relais : une réponse par saisie (reçue, déjà reçue, refusée avec sa raison). */
export async function POST(requete: Request) {
  const compte = await compteCourant();
  if (compte?.role !== "relais") return Response.json({ erreur: "non_connecte" }, { status: 401 });
  const corps: unknown = await requete.json().catch(() => null);
  const lot = (corps as { evenements?: unknown } | null)?.evenements;
  if (!Array.isArray(lot) || lot.length > MAX_LOT) return Response.json({ erreur: "lot_invalide" }, { status: 400 });
  const maintenant = new Date();
  const resultats = await synchroniser(db(), { relaisId: compte.id, lot, maintenant, aujourdhui: aujourdhuiAuBenin(maintenant) });
  return Response.json({ resultats });
}
```

Créer `src/app/api/sync/note/route.ts` :

```ts
import { compteCourant } from "@/server/auth/cookies";
import { db } from "@/server/db/client";
import { enregistrerNote, MAX_NOTE_OCTETS } from "@/server/relais/notes";

export const dynamic = "force-dynamic";

const STATUTS = { introuvable: 404, interdit: 403, invalide: 422 } as const;

/** Note vocale d'une visite déjà reçue : le corps est le son, tel qu'enregistré sur le téléphone. */
export async function POST(requete: Request) {
  const compte = await compteCourant();
  if (compte?.role !== "relais") return Response.json({ erreur: "non_connecte" }, { status: 401 });
  if (Number(requete.headers.get("content-length") ?? 0) > MAX_NOTE_OCTETS) return Response.json({ erreur: "invalide" }, { status: 413 });
  const octets = new Uint8Array(await requete.arrayBuffer());
  const resultat = await enregistrerNote(db(), {
    relaisId: compte.id,
    evenementId: new URL(requete.url).searchParams.get("id") ?? "",
    type: requete.headers.get("content-type") ?? "",
    octets,
  });
  if (resultat.ok) return Response.json({ statut: resultat.donnees });
  return Response.json({ erreur: resultat.erreur }, { status: STATUTS[resultat.erreur] });
}
```

Créer `src/app/api/fichiers/[id]/route.ts` :

```ts
import { compteCourant } from "@/server/auth/cookies";
import { db } from "@/server/db/client";
import { lireNote } from "@/server/relais/notes";

export const dynamic = "force-dynamic";

/** Écoute d'une note vocale : par son relais, ou par un soignant du centre de la personne. */
export async function GET(_requete: Request, ctx: RouteContext<"/api/fichiers/[id]">) {
  const compte = await compteCourant();
  if (!compte) return new Response(null, { status: 401 });
  const { id } = await ctx.params;
  const note = await lireNote(db(), compte, id);
  if (!note) return new Response(null, { status: 404 });
  return new Response(note.donnees.slice(), {
    headers: { "Content-Type": note.type, "Content-Length": String(note.donnees.byteLength), "Cache-Control": "private, max-age=3600" },
  });
}
```

- [ ] **Étape 3 : relancer les tests, vérifier les types et le style**

Run : `pnpm vitest run tests/server/relais && pnpm typecheck && pnpm lint`
Expected : PASS, aucune erreur. Les routes sont vérifiées de bout en bout dans le navigateur (tâches 13 et 15).

- [ ] **Étape 4 : commit**

```bash
git add src/server/relais src/app/api tests/server/relais
git commit -m "feat(relais): notes vocales en base et routes de synchronisation"
```

---

### Tâche 9 : file d'envoi et stockage sur le téléphone

**Fichiers :**
- Modifier : `package.json`, `pnpm-lock.yaml` (dépendances)
- Créer : `src/offline/file.ts`, `src/offline/stockage.ts`
- Tester : `tests/offline/file.test.ts`, `tests/offline/stockage.test.ts`

**Interfaces :**
- Consomme : `EvenementEntrant`, `ResultatSync` (tâche 1) ; `Tournee` (tâche 3) ; `inscriptionDonneesSchema` (tâche 1).
- Produit :
  - `interface SaisieEnAttente extends EvenementEntrant { libelle: string; groupe: string; nature: "visite" | "inscription"; avecNote?: boolean }` : `groupe` réunit les saisies d'une même visite ; c'est l'identifiant de la visite (ou de l'inscription) ;
  - `interface Refus { saisie: SaisieEnAttente; motif: string; le: string }`, `interface Tri { restantes; refus; notesAEnvoyer: string[]; recues: number }` ;
  - `trierReponses(file, resultats, maintenant): Tri`, `versServeur(saisie): EvenementEntrant`, `texteEnAttente(file): string | null`, `appliquerSaisiesLocales(tournee, file): Tournee` ;
  - `interface NoteLocale { type: string; octets: ArrayBuffer; dureeSecondes: number }` ;
  - `interface ContenuRelais { tournee: Tournee | null; file: SaisieEnAttente[]; refus: Refus[]; notes: string[] }` ;
  - `interface StockageRelais { lire(cle); modifier(cle, fn); lireNote(id); ecrireNote(id, note); supprimerNote(id); toutEffacer() }`, `stockageNavigateur(magasin?): StockageRelais` (IndexedDB « moncarnet-relais »). `modifier` est atomique (une transaction IndexedDB).

- [ ] **Étape 1 : installer les dépendances**

```bash
pnpm add idb-keyval@6.3.0
pnpm add -D fake-indexeddb@6.2.5
```

Expected : les deux paquets ajoutés à `package.json`.

- [ ] **Étape 2 : écrire les tests qui échouent**

Créer `tests/offline/file.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import type { Tournee } from "@/domain/tournee";
import { appliquerSaisiesLocales, texteEnAttente, trierReponses, versServeur, type SaisieEnAttente } from "@/offline/file";

const visite = (id: string, groupe = id, extra: Partial<SaisieEnAttente> = {}): SaisieEnAttente => ({
  id,
  patientId: "p-afiavi",
  type: "visite_domicile",
  survenuLe: "2026-09-25T09:30:00.000Z",
  donnees: { constat: "tout_va_bien" },
  libelle: "Visite chez Afiavi Dossou",
  groupe,
  nature: "visite",
  ...extra,
});

describe("trierReponses", () => {
  it("retire les saisies reçues, met de côté les refusées avec leur raison, garde celles sans réponse", () => {
    const file = [visite("a", "a", { avecNote: true }), visite("b"), visite("c")];
    const tri = trierReponses(
      file,
      [
        { id: "a", statut: "accepte" },
        { id: "b", statut: "refuse", motif: "Cette personne n'est pas dans votre tournée." },
      ],
      new Date("2026-09-25T10:00:00Z"),
    );
    expect(tri.restantes.map((s) => s.id)).toEqual(["c"]);
    expect(tri.refus).toEqual([{ saisie: file[1], motif: "Cette personne n'est pas dans votre tournée.", le: "2026-09-25T10:00:00.000Z" }]);
    expect(tri.notesAEnvoyer).toEqual(["a"]);
    expect(tri.recues).toBe(1);
  });

  it("compte comme reçue une saisie déjà reçue (renvoi après une coupure)", () => {
    expect(trierReponses([visite("a")], [{ id: "a", statut: "deja_recu" }], new Date()).recues).toBe(1);
  });
});

describe("versServeur", () => {
  it("n'envoie que la saisie, sans ce qui ne sert qu'au téléphone", () => {
    expect(versServeur(visite("a", "g", { avecNote: true }))).toEqual({
      id: "a",
      patientId: "p-afiavi",
      type: "visite_domicile",
      survenuLe: "2026-09-25T09:30:00.000Z",
      donnees: { constat: "tout_va_bien" },
    });
  });
});

describe("texteEnAttente", () => {
  it("compte les visites et les inscriptions, pas les saisies", () => {
    expect(texteEnAttente([])).toBeNull();
    expect(texteEnAttente([visite("a", "v1"), visite("b", "v1")])).toBe("1 visite partira dès que le réseau revient");
    expect(texteEnAttente([visite("a", "v1"), visite("b", "v2"), visite("c", "i1", { nature: "inscription" })])).toBe(
      "2 visites et 1 inscription partiront dès que le réseau revient",
    );
  });
});

describe("appliquerSaisiesLocales", () => {
  const tournee: Tournee = {
    relais: "Koffi Agbessi",
    prepareeLe: "2026-09-25T07:00:00.000Z",
    aujourdhui: "2026-09-25",
    foyers: [
      {
        id: "f-dossou",
        nom: "Dossou",
        village: "Sèhoun",
        urgence: 1,
        personnes: [
          {
            id: "p-afiavi",
            prenom: "Afiavi",
            nom: "Dossou",
            sexe: "F",
            age: 31,
            libelleAge: "31 ans",
            telephone: null,
            enceinte: true,
            malvoyant: false,
            vueAujourdhui: false,
            raisons: [{ texte: "Consultation prénatale 2 manquée", urgence: 1 }],
          },
        ],
      },
    ],
  };

  it("marque vue la personne dont la visite attend le réseau, sans toucher à la copie du serveur", () => {
    const vue = appliquerSaisiesLocales(tournee, [visite("a")]);
    expect(vue.foyers[0]?.personnes[0]?.vueAujourdhui).toBe(true);
    expect(tournee.foyers[0]?.personnes[0]?.vueAujourdhui).toBe(false);
  });

  it("ajoute au foyer la personne inscrite sur ce téléphone, pour la visiter tout de suite", () => {
    const inscription: SaisieEnAttente = {
      id: "i1",
      patientId: "p-yao",
      type: "inscription",
      survenuLe: "2026-09-25T09:00:00.000Z",
      donnees: { foyerId: "f-dossou", prenom: "Yao", nom: "Dossou", sexe: "M", dateNaissance: "2026-09-20", programme: { code: "vaccination", dateReference: "2026-09-20" } },
      libelle: "Inscription de Yao Dossou",
      groupe: "i1",
      nature: "inscription",
    };
    const vue = appliquerSaisiesLocales(tournee, [inscription]);
    expect(vue.foyers[0]?.personnes.map((p) => p.prenom)).toEqual(["Afiavi", "Yao"]);
    expect(vue.foyers[0]?.personnes[1]).toMatchObject({ id: "p-yao", age: 0, libelleAge: "moins d'un mois", enceinte: false, raisons: [] });
  });
});
```

Créer `tests/offline/stockage.test.ts` :

```ts
import "fake-indexeddb/auto";
import { createStore } from "idb-keyval";
import { describe, expect, it } from "vitest";
import type { SaisieEnAttente } from "@/offline/file";
import { stockageNavigateur } from "@/offline/stockage";

let n = 0;
const nomUnique = () => `test-stockage-${n++}`;
const saisie = (id: string): SaisieEnAttente => ({
  id,
  patientId: "p",
  type: "visite_domicile",
  survenuLe: "2026-09-25T09:30:00.000Z",
  donnees: { constat: "absent" },
  libelle: "Visite",
  groupe: id,
  nature: "visite",
});

describe("stockageNavigateur", () => {
  it("part d'un téléphone vide", async () => {
    const s = stockageNavigateur(createStore(nomUnique(), "donnees"));
    expect(await s.lire("tournee")).toBeNull();
    expect(await s.lire("file")).toEqual([]);
    expect(await s.lire("refus")).toEqual([]);
    expect(await s.lire("notes")).toEqual([]);
  });

  it("garde la file d'envoi, même quand deux ajouts se croisent", async () => {
    const nom = nomUnique();
    const s = stockageNavigateur(createStore(nom, "donnees"));
    await Promise.all([s.modifier("file", (f) => [...f, saisie("a")]), s.modifier("file", (f) => [...f, saisie("b")])]);
    const rouvert = stockageNavigateur(createStore(nom, "donnees"));
    expect((await rouvert.lire("file")).map((x) => x.id).sort()).toEqual(["a", "b"]);
  });

  it("garde une note vocale jusqu'à son envoi", async () => {
    const s = stockageNavigateur(createStore(nomUnique(), "donnees"));
    await s.ecrireNote("a", { type: "audio/webm", octets: new Uint8Array([1, 2, 3]).buffer, dureeSecondes: 4 });
    expect((await s.lireNote("a"))?.octets.byteLength).toBe(3);
    await s.supprimerNote("a");
    expect(await s.lireNote("a")).toBeUndefined();
  });

  it("efface tout à la déconnexion", async () => {
    const s = stockageNavigateur(createStore(nomUnique(), "donnees"));
    await s.modifier("file", () => [saisie("a")]);
    await s.ecrireNote("a", { type: "audio/webm", octets: new ArrayBuffer(2), dureeSecondes: 1 });
    await s.toutEffacer();
    expect(await s.lire("file")).toEqual([]);
    expect(await s.lireNote("a")).toBeUndefined();
  });
});
```

Run : `pnpm vitest run tests/offline`
Expected : FAIL (modules `@/offline/file` et `@/offline/stockage` introuvables).

- [ ] **Étape 3 : écrire le code**

Créer `src/offline/file.ts` :

```ts
import { ageEnAnnees, libelleAge } from "@/domain/dates";
import { inscriptionDonneesSchema } from "@/domain/evenements";
import type { EvenementEntrant, ResultatSync } from "@/domain/synchronisation";
import type { PersonneTournee, Tournee } from "@/domain/tournee";

/** Saisie gardée sur le téléphone jusqu'à ce que le serveur l'ait reçue. */
export interface SaisieEnAttente extends EvenementEntrant {
  /** Ce que le relais lit : « Visite chez Afiavi Dossou ». */
  libelle: string;
  /** Réunit les saisies d'une même visite (signe de danger, tension, visite) : c'est l'identifiant de la visite ou de l'inscription. */
  groupe: string;
  nature: "visite" | "inscription";
  /** Une note vocale part après la saisie, une fois celle-ci reçue. */
  avecNote?: boolean;
}

/** Saisie refusée : elle reste sur le téléphone avec sa raison jusqu'à ce que le relais la retire (spec §10.2). */
export interface Refus {
  saisie: SaisieEnAttente;
  motif: string;
  le: string;
}

export interface Tri {
  restantes: SaisieEnAttente[];
  refus: Refus[];
  /** Saisies reçues (ou déjà reçues) dont la note vocale peut partir. */
  notesAEnvoyer: string[];
  recues: number;
}

/** Range la file après la réponse du serveur ; une saisie sans réponse reste dans la file. */
export function trierReponses(file: SaisieEnAttente[], resultats: ResultatSync[], maintenant: Date): Tri {
  const parId = new Map(resultats.map((r) => [r.id, r]));
  const tri: Tri = { restantes: [], refus: [], notesAEnvoyer: [], recues: 0 };
  for (const saisie of file) {
    const reponse = parId.get(saisie.id);
    if (!reponse) tri.restantes.push(saisie);
    else if (reponse.statut === "refuse") tri.refus.push({ saisie, motif: reponse.motif ?? "Refusée par le serveur.", le: maintenant.toISOString() });
    else {
      tri.recues++;
      if (saisie.avecNote) tri.notesAEnvoyer.push(saisie.id);
    }
  }
  return tri;
}

/** Ce que reçoit le serveur : la saisie, sans ce qui ne sert qu'au téléphone. */
export function versServeur({ id, patientId, type, survenuLe, donnees }: SaisieEnAttente): EvenementEntrant {
  return { id, patientId, type, survenuLe, donnees };
}

const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? "s" : ""}`;

/** « 2 visites et 1 inscription partiront dès que le réseau revient » : on compte ce que le relais a fait, pas les saisies. */
export function texteEnAttente(file: SaisieEnAttente[]): string | null {
  const groupes = new Map(file.map((s) => [s.groupe, s.nature]));
  if (groupes.size === 0) return null;
  const visites = [...groupes.values()].filter((n) => n === "visite").length;
  const inscriptions = groupes.size - visites;
  const morceaux = [visites ? pluriel(visites, "visite") : null, inscriptions ? pluriel(inscriptions, "inscription") : null].filter(Boolean);
  return `${morceaux.join(" et ")} ${groupes.size > 1 ? "partiront" : "partira"} dès que le réseau revient`;
}

/** La tournée telle que le relais la voit : la copie du serveur, plus ce qui a été saisi sur ce téléphone et attend le réseau. */
export function appliquerSaisiesLocales(tournee: Tournee, file: SaisieEnAttente[]): Tournee {
  const vues = new Set(file.filter((s) => s.type === "visite_domicile").map((s) => s.patientId));
  const inscrites = file.flatMap((s) => {
    if (s.type !== "inscription") return [];
    const lecture = inscriptionDonneesSchema.safeParse(s.donnees);
    return lecture.success ? [{ patientId: s.patientId, ...lecture.data }] : [];
  });
  return {
    ...tournee,
    foyers: tournee.foyers.map((foyer) => {
      const nouvelles: PersonneTournee[] = inscrites
        .filter((i) => i.foyerId === foyer.id && !foyer.personnes.some((p) => p.id === i.patientId))
        .map((i) => ({
          id: i.patientId,
          prenom: i.prenom,
          nom: i.nom,
          sexe: i.sexe,
          age: ageEnAnnees(i.dateNaissance, tournee.aujourdhui),
          libelleAge: libelleAge(i.dateNaissance, tournee.aujourdhui),
          telephone: i.telephone ?? null,
          enceinte: i.programme?.code === "grossesse",
          malvoyant: false,
          vueAujourdhui: false,
          raisons: [],
        }));
      return { ...foyer, personnes: [...foyer.personnes, ...nouvelles].map((p) => (vues.has(p.id) ? { ...p, vueAujourdhui: true } : p)) };
    }),
  };
}
```

Créer `src/offline/stockage.ts` :

```ts
import { clear, createStore, del, get, set, update, type UseStore } from "idb-keyval";
import type { Tournee } from "@/domain/tournee";
import type { Refus, SaisieEnAttente } from "./file";

/** Note vocale gardée sur le téléphone jusqu'à son envoi (octets bruts : IndexedDB les garde partout, contrairement à certains Blob). */
export interface NoteLocale {
  type: string;
  octets: ArrayBuffer;
  dureeSecondes: number;
}

/** Ce que le téléphone garde pour la tournée. */
export interface ContenuRelais {
  tournee: Tournee | null;
  file: SaisieEnAttente[];
  refus: Refus[];
  /** Identifiants des visites reçues dont la note vocale doit encore partir. */
  notes: string[];
}

const VIDE: ContenuRelais = { tournee: null, file: [], refus: [], notes: [] };

export interface StockageRelais {
  lire<K extends keyof ContenuRelais>(cle: K): Promise<ContenuRelais[K]>;
  /** Lecture et écriture dans une seule transaction : deux ajouts qui se croisent ne s'écrasent pas. */
  modifier<K extends keyof ContenuRelais>(cle: K, fn: (actuel: ContenuRelais[K]) => ContenuRelais[K]): Promise<void>;
  lireNote(id: string): Promise<NoteLocale | undefined>;
  ecrireNote(id: string, note: NoteLocale): Promise<void>;
  supprimerNote(id: string): Promise<void>;
  /** À la déconnexion : le téléphone peut être partagé (spec §10.4). */
  toutEffacer(): Promise<void>;
}

export function stockageNavigateur(magasin: UseStore = createStore("moncarnet-relais", "donnees")): StockageRelais {
  return {
    lire: async (cle) => (await get(cle, magasin)) ?? VIDE[cle],
    modifier: (cle, fn) => update(cle, (actuel) => fn(actuel ?? VIDE[cle]), magasin),
    lireNote: (id) => get<NoteLocale>(`note:${id}`, magasin),
    ecrireNote: (id, note) => set(`note:${id}`, note, magasin),
    supprimerNote: (id) => del(`note:${id}`, magasin),
    toutEffacer: () => clear(magasin),
  };
}
```

- [ ] **Étape 4 : relancer les tests, vérifier les types**

Run : `pnpm vitest run tests/offline && pnpm typecheck`
Expected : PASS (11 tests), aucune erreur de type.

- [ ] **Étape 5 : commit**

```bash
git add package.json pnpm-lock.yaml src/offline tests/offline
git commit -m "feat(hors-ligne): file d'envoi et stockage du relais sur le téléphone"
```

---

### Tâche 10 : synchronisation côté téléphone

**Fichiers :**
- Créer : `src/offline/synchronisation.ts`
- Tester : `tests/offline/synchronisation.test.ts`

**Interfaces :**
- Consomme : `StockageRelais`, `NoteLocale`, `trierReponses`, `versServeur`, `Tri` (tâche 9) ; `MAX_LOT` (tâche 1).
- Produit :
  - `interface Transport { envoyerLot(lot): Promise<ResultatSync[]>; envoyerNote(id, note): Promise<boolean> }` : lève une erreur sans réseau ; `envoyerNote` renvoie faux si la note est refusée pour de bon ;
  - `class NonConnecte extends Error` ;
  - `interface Bilan { recues; refusees; notes; horsLigne; nonConnecte }` ;
  - `synchroniserFile(stockage, transport, maintenant?): Promise<Bilan>` : les saisies d'abord, par lots de 100, puis les notes des visites reçues. Une saisie ajoutée pendant l'envoi reste dans la file ; la note d'une visite refusée est retirée ;
  - `transportNavigateur(): Transport` (`fetch` vers `/api/sync` et `/api/sync/note`) ; `telechargerTournee(stockage): Promise<"ok" | "hors_ligne" | "non_connecte">`.

- [ ] **Étape 1 : écrire les tests qui échouent**

Créer `tests/offline/synchronisation.test.ts` :

```ts
import "fake-indexeddb/auto";
import { createStore } from "idb-keyval";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { EvenementEntrant, ResultatSync } from "@/domain/synchronisation";
import { versServeur, type SaisieEnAttente } from "@/offline/file";
import { stockageNavigateur } from "@/offline/stockage";
import { NonConnecte, synchroniserFile, telechargerTournee, transportNavigateur, type Transport } from "@/offline/synchronisation";

let n = 0;
const nouveau = () => stockageNavigateur(createStore(`test-sync-${n++}`, "donnees"));
const saisie = (id: string, avecNote = false): SaisieEnAttente => ({
  id,
  patientId: "p",
  type: "visite_domicile",
  survenuLe: "2026-09-25T09:30:00.000Z",
  donnees: { constat: "tout_va_bien", noteVocale: avecNote },
  libelle: `Visite ${id}`,
  groupe: id,
  nature: "visite",
  avecNote,
});
const note = { type: "audio/webm", octets: new Uint8Array([1, 2, 3]).buffer, dureeSecondes: 3 };
const toutAccepter = (lot: EvenementEntrant[]): ResultatSync[] => lot.map((s) => ({ id: s.id, statut: "accepte" }));
const sansReseau = () => Promise.reject(new TypeError("Failed to fetch"));

afterEach(() => vi.unstubAllGlobals());

describe("synchroniserFile", () => {
  it("vide la file quand tout est reçu, puis envoie la note de la visite", async () => {
    const stockage = nouveau();
    await stockage.modifier("file", () => [saisie("a", true), saisie("b")]);
    await stockage.ecrireNote("a", note);
    const appels: string[] = [];
    const transport: Transport = {
      envoyerLot: async (lot) => {
        appels.push(`lot:${lot.map((s) => s.id).join(",")}`);
        return toutAccepter(lot);
      },
      envoyerNote: async (id) => {
        appels.push(`note:${id}`);
        return true;
      },
    };
    expect(await synchroniserFile(stockage, transport)).toEqual({ recues: 2, refusees: 0, notes: 1, horsLigne: false, nonConnecte: false });
    expect(appels).toEqual(["lot:a,b", "note:a"]);
    expect(await stockage.lire("file")).toEqual([]);
    expect(await stockage.lire("notes")).toEqual([]);
    expect(await stockage.lireNote("a")).toBeUndefined();
  });

  it("garde tout sans réseau, puis envoie au retour du réseau", async () => {
    const stockage = nouveau();
    await stockage.modifier("file", () => [saisie("a"), saisie("b")]);
    expect(await synchroniserFile(stockage, { envoyerLot: sansReseau, envoyerNote: sansReseau })).toMatchObject({ recues: 0, horsLigne: true });
    expect(await stockage.lire("file")).toHaveLength(2);
    expect(await synchroniserFile(stockage, { envoyerLot: async (lot) => toutAccepter(lot), envoyerNote: sansReseau })).toMatchObject({
      recues: 2,
      horsLigne: false,
    });
    expect(await stockage.lire("file")).toEqual([]);
  });

  it("met de côté une saisie refusée avec sa raison, et retire sa note", async () => {
    const stockage = nouveau();
    await stockage.modifier("file", () => [saisie("a"), saisie("b", true)]);
    await stockage.ecrireNote("b", note);
    const envoyerNote = vi.fn(async () => true);
    const bilan = await synchroniserFile(
      stockage,
      {
        envoyerLot: async () => [
          { id: "a", statut: "accepte" },
          { id: "b", statut: "refuse", motif: "Cette personne n'est pas dans votre tournée." },
        ],
        envoyerNote,
      },
      () => new Date("2026-09-25T10:00:00Z"),
    );
    expect(bilan).toMatchObject({ recues: 1, refusees: 1, notes: 0 });
    expect(await stockage.lire("refus")).toEqual([
      { saisie: saisie("b", true), motif: "Cette personne n'est pas dans votre tournée.", le: "2026-09-25T10:00:00.000Z" },
    ]);
    expect(await stockage.lireNote("b")).toBeUndefined();
    expect(envoyerNote).not.toHaveBeenCalled();
  });

  it("ne perd pas une saisie ajoutée pendant l'envoi", async () => {
    const stockage = nouveau();
    await stockage.modifier("file", () => [saisie("a")]);
    await synchroniserFile(stockage, {
      envoyerLot: async (lot) => {
        await stockage.modifier("file", (f) => [...f, saisie("nouvelle")]);
        return toutAccepter(lot);
      },
      envoyerNote: sansReseau,
    });
    expect((await stockage.lire("file")).map((s) => s.id)).toEqual(["nouvelle"]);
  });

  it("garde la note pour plus tard si le réseau coupe pendant son envoi", async () => {
    const stockage = nouveau();
    await stockage.modifier("file", () => [saisie("a", true)]);
    await stockage.ecrireNote("a", note);
    expect(await synchroniserFile(stockage, { envoyerLot: async (lot) => toutAccepter(lot), envoyerNote: sansReseau })).toMatchObject({
      recues: 1,
      notes: 0,
      horsLigne: true,
    });
    expect(await stockage.lire("notes")).toEqual(["a"]);
    expect(await stockage.lireNote("a")).toBeDefined();
  });

  it("le dit quand la session a expiré, sans rien perdre", async () => {
    const stockage = nouveau();
    await stockage.modifier("file", () => [saisie("a")]);
    expect(await synchroniserFile(stockage, { envoyerLot: () => Promise.reject(new NonConnecte()), envoyerNote: sansReseau })).toMatchObject({
      nonConnecte: true,
      horsLigne: false,
    });
    expect(await stockage.lire("file")).toHaveLength(1);
  });
});

describe("transportNavigateur", () => {
  it("envoie le lot en JSON et lit les réponses", async () => {
    const simule = vi.fn(async () => Response.json({ resultats: [{ id: "a", statut: "accepte" }] }));
    vi.stubGlobal("fetch", simule);
    expect(await transportNavigateur().envoyerLot([versServeur(saisie("a"))])).toEqual([{ id: "a", statut: "accepte" }]);
    expect(simule).toHaveBeenCalledWith("/api/sync", expect.objectContaining({ method: "POST" }));
  });

  it("distingue la session expirée, la note refusée pour de bon et le serveur en panne", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 401 })));
    await expect(transportNavigateur().envoyerLot([])).rejects.toBeInstanceOf(NonConnecte);
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 404 })));
    expect(await transportNavigateur().envoyerNote("a", note)).toBe(false);
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 502 })));
    await expect(transportNavigateur().envoyerNote("a", note)).rejects.toThrow();
  });
});

describe("telechargerTournee", () => {
  it("copie la tournée sur le téléphone, et garde l'ancienne sans réseau", async () => {
    const stockage = nouveau();
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ relais: "Koffi Agbessi", prepareeLe: "2026-09-25T07:00:00.000Z", aujourdhui: "2026-09-25", foyers: [] })));
    expect(await telechargerTournee(stockage)).toBe("ok");
    vi.stubGlobal("fetch", vi.fn(sansReseau));
    expect(await telechargerTournee(stockage)).toBe("hors_ligne");
    expect((await stockage.lire("tournee"))?.relais).toBe("Koffi Agbessi");
  });
});
```

Run : `pnpm vitest run tests/offline/synchronisation.test.ts`
Expected : FAIL (module `@/offline/synchronisation` introuvable).

- [ ] **Étape 2 : écrire le code**

Créer `src/offline/synchronisation.ts` :

```ts
import { MAX_LOT, type EvenementEntrant, type ResultatSync } from "@/domain/synchronisation";
import type { Tournee } from "@/domain/tournee";
import { trierReponses, versServeur, type Tri } from "./file";
import type { NoteLocale, StockageRelais } from "./stockage";

export interface Transport {
  /** Lève une erreur sans réseau ou si le serveur ne répond pas : la file reste intacte. */
  envoyerLot(lot: EvenementEntrant[]): Promise<ResultatSync[]>;
  /** Vrai si la note est reçue, faux si elle est refusée pour de bon ; lève une erreur sans réseau. */
  envoyerNote(id: string, note: NoteLocale): Promise<boolean>;
}

/** Session expirée : les saisies restent sur le téléphone, le relais doit se reconnecter. */
export class NonConnecte extends Error {
  constructor() {
    super("Session expirée");
    this.name = "NonConnecte";
  }
}

export interface Bilan {
  recues: number;
  refusees: number;
  notes: number;
  horsLigne: boolean;
  nonConnecte: boolean;
}

/** Vide la file d'envoi : les saisies d'abord, dans l'ordre, puis les notes vocales des visites reçues. */
export async function synchroniserFile(stockage: StockageRelais, transport: Transport, maintenant: () => Date = () => new Date()): Promise<Bilan> {
  const bilan: Bilan = { recues: 0, refusees: 0, notes: 0, horsLigne: false, nonConnecte: false };
  try {
    const file = await stockage.lire("file");
    for (let debut = 0; debut < file.length; debut += MAX_LOT) {
      const resultats = await transport.envoyerLot(file.slice(debut, debut + MAX_LOT).map(versServeur));
      let tri: Tri = { restantes: [], refus: [], notesAEnvoyer: [], recues: 0 };
      // La file a pu grandir pendant l'envoi : on range la file du moment, les saisies ajoutées entre-temps restent.
      await stockage.modifier("file", (actuelle) => {
        tri = trierReponses(actuelle, resultats, maintenant());
        return tri.restantes;
      });
      if (tri.refus.length) await stockage.modifier("refus", (r) => [...r, ...tri.refus]);
      if (tri.notesAEnvoyer.length) await stockage.modifier("notes", (n) => [...n, ...tri.notesAEnvoyer]);
      for (const r of tri.refus) if (r.saisie.avecNote) await stockage.supprimerNote(r.saisie.id);
      bilan.recues += tri.recues;
      bilan.refusees += tri.refus.length;
    }
    for (const id of await stockage.lire("notes")) {
      const note = await stockage.lireNote(id);
      if (note && (await transport.envoyerNote(id, note))) bilan.notes++;
      await stockage.supprimerNote(id);
      await stockage.modifier("notes", (n) => n.filter((x) => x !== id));
    }
  } catch (erreur) {
    if (erreur instanceof NonConnecte) bilan.nonConnecte = true;
    else {
      // Sans réseau (ou serveur injoignable) : tout reste sur le téléphone, l'envoi repartira seul.
      console.warn("Envoi reporté :", erreur);
      bilan.horsLigne = true;
    }
  }
  return bilan;
}

export function transportNavigateur(): Transport {
  return {
    async envoyerLot(lot) {
      const reponse = await fetch("/api/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ evenements: lot }) });
      if (reponse.status === 401) throw new NonConnecte();
      if (!reponse.ok) throw new Error(`Envoi refusé par le serveur (${reponse.status})`);
      return ((await reponse.json()) as { resultats: ResultatSync[] }).resultats;
    },
    async envoyerNote(id, note) {
      const reponse = await fetch(`/api/sync/note?id=${encodeURIComponent(id)}`, { method: "POST", headers: { "Content-Type": note.type }, body: note.octets });
      if (reponse.status === 401) throw new NonConnecte();
      if (reponse.ok) return true;
      if (reponse.status >= 400 && reponse.status < 500) return false;
      throw new Error(`Note vocale refusée par le serveur (${reponse.status})`);
    },
  };
}

/** Copie sur le téléphone la tournée du jour : elle reste lisible toute la journée, même sans réseau. */
export async function telechargerTournee(stockage: StockageRelais): Promise<"ok" | "hors_ligne" | "non_connecte"> {
  try {
    const reponse = await fetch("/api/relais/tournee", { cache: "no-store" });
    if (reponse.status === 401) return "non_connecte";
    if (!reponse.ok) return "hors_ligne";
    const tournee = (await reponse.json()) as Tournee;
    await stockage.modifier("tournee", () => tournee);
    return "ok";
  } catch {
    return "hors_ligne";
  }
}
```

- [ ] **Étape 3 : relancer les tests, vérifier les types**

Run : `pnpm vitest run tests/offline && pnpm typecheck`
Expected : PASS, aucune erreur de type.

- [ ] **Étape 4 : commit**

```bash
git add src/offline tests/offline
git commit -m "feat(hors-ligne): envoi de la file au retour du réseau, notes vocales après leur visite"
```

---
### Tâche 11 : service worker, manifeste, et déconnexion qui efface le téléphone

**Fichiers :**
- Créer : `src/ui/BoutonDeconnexion.tsx`, `src/ui/EnregistrementServiceWorker.tsx`, `public/sw.js`, `public/hors-ligne.html`, `src/app/manifest.ts`, `public/app-192.png`, `public/app-512.png`
- Modifier : `src/ui/EnTete.tsx`, `src/app/soignant/layout.tsx`, `src/app/(patient)/(onglets)/famille/page.tsx`, `src/app/layout.tsx`, `next.config.ts`
- Tester : `tests/ui/BoutonDeconnexion.test.tsx`, puis vérification dans le navigateur (build de production)

**Interfaces :**
- Produit :
  - `CACHE_PAGES = "mc-pages"` ;
  - `BoutonDeconnexion({ className?, conteneur?, compact?, avantDeconnexion?: () => Promise<string | null> })` : efface le cache des pages, puis appelle `seDeconnecter` ; un message renvoyé par `avantDeconnexion` bloque la déconnexion et s'affiche ;
  - service worker : réseau d'abord pour les pages (copie dans `mc-pages`, page `/hors-ligne.html` en dernier recours), cache d'abord pour `/_next/static/` et `/icons/` ; `/api/*` et les requêtes autres que `GET` ne passent jamais par le cache.

- [ ] **Étape 1 : écrire le test qui échoue**

Créer `tests/ui/BoutonDeconnexion.test.tsx` :

```tsx
// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { seDeconnecter } = vi.hoisted(() => ({ seDeconnecter: vi.fn(async () => {}) }));
vi.mock("@/app/actions-session", () => ({ seDeconnecter }));

import { BoutonDeconnexion } from "@/ui/BoutonDeconnexion";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  seDeconnecter.mockClear();
});

describe("BoutonDeconnexion", () => {
  it("efface les pages gardées sur le téléphone, puis déconnecte", async () => {
    const supprimer = vi.fn(async () => true);
    vi.stubGlobal("caches", { delete: supprimer });
    render(<BoutonDeconnexion />);
    fireEvent.click(screen.getByRole("button", { name: "Se déconnecter" }));
    await waitFor(() => expect(seDeconnecter).toHaveBeenCalled());
    expect(supprimer).toHaveBeenCalledWith("mc-pages");
  });

  it("reste connecté et dit pourquoi quand des saisies attendent le réseau", async () => {
    render(<BoutonDeconnexion avantDeconnexion={async () => "2 visites attendent le réseau."} />);
    fireEvent.click(screen.getByRole("button", { name: "Se déconnecter" }));
    expect((await screen.findByRole("alert")).textContent).toContain("2 visites attendent le réseau.");
    expect(seDeconnecter).not.toHaveBeenCalled();
  });

  it("garde un nom accessible en version pictogramme seul", () => {
    render(<BoutonDeconnexion compact />);
    expect(screen.getByRole("button", { name: "Se déconnecter" }).textContent).toBe("");
  });
});
```

Run : `pnpm vitest run tests/ui/BoutonDeconnexion.test.tsx`
Expected : FAIL (module `@/ui/BoutonDeconnexion` introuvable).

- [ ] **Étape 2 : écrire le bouton et l'utiliser partout**

Créer `src/ui/BoutonDeconnexion.tsx` :

```tsx
"use client";

import { useState, useTransition } from "react";
import { seDeconnecter } from "@/app/actions-session";
import { Icone } from "./Icone";

/** Pages gardées par le service worker (`public/sw.js`) pour être lues sans réseau. */
export const CACHE_PAGES = "mc-pages";

type Props = {
  className?: string;
  conteneur?: string;
  /** Pictogramme seul : « Se déconnecter » devient le nom accessible. */
  compact?: boolean;
  /** Renvoie un message si la déconnexion doit attendre (saisies pas encore parties), sinon efface ce qui doit l'être. */
  avantDeconnexion?: () => Promise<string | null>;
};

/** Le téléphone peut être partagé : se déconnecter efface les pages gardées pour marcher sans réseau (spec §10.4). */
export function BoutonDeconnexion({
  className = "flex items-center gap-2 rounded-bouton bg-white px-3 py-2 text-sm font-bold text-marque",
  conteneur = "flex flex-col items-end gap-2",
  compact = false,
  avantDeconnexion,
}: Props) {
  const [message, setMessage] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();

  function deconnecter() {
    demarrer(async () => {
      const attente = avantDeconnexion ? await avantDeconnexion() : null;
      if (attente) {
        setMessage(attente);
        return;
      }
      if ("caches" in window) await caches.delete(CACHE_PAGES);
      await seDeconnecter();
    });
  }

  return (
    <div className={conteneur}>
      <button
        type="button"
        onClick={deconnecter}
        disabled={enCours}
        aria-label={compact ? "Se déconnecter" : undefined}
        title={compact ? "Se déconnecter" : undefined}
        className={className}
      >
        <Icone nom="ph-sign-out" className="size-5" />
        {compact ? null : "Se déconnecter"}
      </button>
      {message && (
        <p role="alert" className="max-w-xs rounded-bouton bg-soleil-pale px-3 py-2 text-sm font-bold text-nuit">
          {message}
        </p>
      )}
    </div>
  );
}
```

Remplacer les trois formulaires de déconnexion (et retirer l'import de `seDeconnecter` devenu inutile) :

- `src/ui/EnTete.tsx` : `<BoutonDeconnexion />` à la place du `<form action={seDeconnecter}>…</form>`.
- `src/app/soignant/layout.tsx` : `<BoutonDeconnexion compact className="grid size-9 place-items-center rounded-xl text-marque" />`.
- `src/app/(patient)/(onglets)/famille/page.tsx` : `<BoutonDeconnexion conteneur="mt-auto flex flex-col gap-2" className="flex w-full items-center justify-center gap-2 rounded-bouton bg-white py-3.5 font-bold text-marque" />`.

Run : `pnpm vitest run tests/ui && pnpm typecheck`
Expected : PASS, aucune erreur de type.

- [ ] **Étape 3 : écrire le service worker, la page hors ligne et le manifeste**

Lire d'abord `node_modules/next/dist/docs/01-app/02-guides/progressive-web-apps.md` (en-têtes de `/sw.js`) et la convention `manifest`.

Créer `public/sw.js` :

```js
// Service worker de Mon Carnet : les pages déjà ouvertes et les fichiers de l'application restent disponibles sans réseau.
// Les appels à l'API ne passent jamais par le cache : la file d'envoi du relais s'en charge (src/offline).
const VERSION = "v1";
const CACHE_PAGES = "mc-pages"; // effacé à la déconnexion (src/ui/BoutonDeconnexion.tsx)
const CACHE_FICHIERS = `mc-fichiers-${VERSION}`;
const PAGE_HORS_LIGNE = "/hors-ligne.html";

self.addEventListener("install", (evenement) => {
  evenement.waitUntil(
    caches
      .open(CACHE_FICHIERS)
      .then((cache) => cache.add(PAGE_HORS_LIGNE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (evenement) => {
  evenement.waitUntil(
    caches
      .keys()
      .then((cles) => Promise.all(cles.filter((c) => c.startsWith("mc-fichiers-") && c !== CACHE_FICHIERS).map((c) => caches.delete(c))))
      .then(() => self.clients.claim()),
  );
});

const estFichierStatique = (url) => url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/");

self.addEventListener("fetch", (evenement) => {
  const requete = evenement.request;
  if (requete.method !== "GET") return;
  const url = new URL(requete.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;
  if (requete.mode === "navigate") evenement.respondWith(reseauDabord(requete));
  else if (estFichierStatique(url)) evenement.respondWith(cacheDabord(requete));
});

/** Pages : le réseau d'abord (toujours à jour), la copie gardée sans réseau. */
async function reseauDabord(requete) {
  try {
    const reponse = await fetch(requete);
    if (reponse.ok && !reponse.redirected) {
      const copie = reponse.clone();
      caches.open(CACHE_PAGES).then((cache) => cache.put(requete, copie));
    }
    return reponse;
  } catch {
    const gardee = await caches.match(requete, { cacheName: CACHE_PAGES });
    return gardee ?? (await caches.match(PAGE_HORS_LIGNE)) ?? Response.error();
  }
}

/** Fichiers de l'application : leur nom change à chaque version, la copie gardée suffit. */
async function cacheDabord(requete) {
  const gardee = await caches.match(requete);
  if (gardee) return gardee;
  const reponse = await fetch(requete);
  if (reponse.ok) {
    const copie = reponse.clone();
    caches.open(CACHE_FICHIERS).then((cache) => cache.put(requete, copie));
  }
  return reponse;
}
```

Créer `public/hors-ligne.html` :

```html
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#3b3ad9" />
    <title>Pas de réseau</title>
    <style>
      body { margin: 0; min-height: 100dvh; display: grid; place-items: center; background: #f3f3fe; color: #16154a; font-family: system-ui, sans-serif; }
      main { max-width: 22rem; margin: 1rem; padding: 1.5rem; border-radius: 1.5rem; background: #fff; }
      h1 { font-size: 1.5rem; margin: 0 0 0.5rem; }
      p { font-size: 1.05rem; line-height: 1.5; color: #5d5c7a; margin: 0 0 1rem; }
      button { width: 100%; padding: 0.9rem; border: 0; border-radius: 1rem; background: #3b3ad9; color: #fff; font: inherit; font-weight: 700; }
    </style>
  </head>
  <body>
    <main>
      <h1>Pas de réseau</h1>
      <p>Cette page n'a pas encore été ouverte sur ce téléphone. Elle s'affichera quand le réseau reviendra.</p>
      <p>Les pages déjà ouvertes restent lisibles, et la tournée du relais marche sans réseau.</p>
      <button onclick="location.reload()">Réessayer</button>
    </main>
  </body>
</html>
```

Créer `src/app/manifest.ts` :

```ts
import type { MetadataRoute } from "next";
import { env } from "@/config/env";

/** L'application s'installe sur l'écran d'accueil du téléphone, comme une application. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: env.NEXT_PUBLIC_APP_NAME,
    short_name: env.NEXT_PUBLIC_APP_NAME,
    description: "Le carnet de santé familial qui parle",
    lang: "fr",
    start_url: "/",
    display: "standalone",
    background_color: "#f3f3fe",
    theme_color: "#3b3ad9",
    icons: [
      { src: "/app-192.png", sizes: "192x192", type: "image/png" },
      { src: "/app-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
```

Créer `src/ui/EnregistrementServiceWorker.tsx` :

```tsx
"use client";

import { useEffect } from "react";

/** En production seulement : les pages ouvertes restent lisibles sans réseau (spec §10.3). */
export function EnregistrementServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch((erreur: unknown) => {
      // Sans service worker, l'application marche comme avant, avec du réseau.
      console.warn("Service worker non enregistré :", erreur);
    });
  }, []);
  return null;
}
```

Dans `src/app/layout.tsx`, ajouter `<EnregistrementServiceWorker />` dans `<body>` après `{children}`.

Dans `next.config.ts`, ajouter à `headers()` :

```ts
      {
        // Le service worker doit toujours être relu : une nouvelle version remplace l'ancienne dès la visite suivante.
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
        ],
      },
```

Produire les icônes PNG depuis le logo (script jetable dans le dossier de travail, avec puppeteer-core et le Chrome du système), dans `public/app-192.png` et `public/app-512.png` : cercle `#3b3ad9`, point et ondes blancs, fond transparent. On les met à la racine de `public/`, pas dans `/icons/` : ce dossier est servi en `immutable`.

- [ ] **Étape 4 : vérifier dans le navigateur, en production**

```bash
pnpm typecheck && pnpm lint && pnpm build
pnpm start   # Postgres local du port 5439 via .env.local temporaire
```

Avec puppeteer (script jetable `horsligne.mjs`) : Codjo se connecte par `/demo`. On attend `navigator.serviceWorker.ready`, puis on recharge l'accueil : la page passe maintenant par le service worker. Ensuite :
- en mode hors ligne, on recharge l'accueil ;
- on ouvre une page jamais vue ;
- de nouveau en ligne, on se déconnecte depuis `/famille` et on liste les clés de `mc-pages`.

Expected :
- sans réseau, l'accueil se recharge et affiche son `h1` ;
- une page jamais ouverte affiche « Pas de réseau » ;
- après la déconnexion, `mc-pages` ne contient plus `/` ni `/famille`.

- [ ] **Étape 5 : commit**

```bash
git add public src/app/manifest.ts src/app/layout.tsx src/ui src/app/soignant/layout.tsx "src/app/(patient)" next.config.ts tests/ui/BoutonDeconnexion.test.tsx
git commit -m "feat(hors-ligne): service worker, application installable, déconnexion qui efface le téléphone"
```

---

### Tâche 12 : écrans de visite, d'inscription et d'envoi

**Fichiers :**
- Créer : `src/offline/saisies.ts`, `src/app/relais/Enregistreur.tsx`, `src/app/relais/VueVisite.tsx`, `src/app/relais/VueInscription.tsx`, `src/app/relais/VueEnvoi.tsx`
- Tester : `tests/offline/saisies.test.ts`, `tests/ui/relais/VueVisite.test.tsx`, `tests/ui/relais/VueInscription.test.tsx`, `tests/ui/relais/VueEnvoi.test.tsx`

**Interfaces :**
- Consomme : `SaisieEnAttente`, `Refus`, `NoteLocale` (tâche 9) ; `lireInscription`, `LIBELLES_INSCRIPTION`, `TYPES_INSCRIPTION` (tâche 2) ; `LIBELLES_CONSTAT`, `CONSTATS_VISITE` (tâche 1) ; `PersonneTournee`, `FoyerTournee` (tâche 3) ; `TENSION_INCOMPLETE`, `signesProposes`, `ICONE_SIGNE`.
- Produit :
  - `saisiesDeVisite(visite, maintenant, id?)` : signe de danger, puis tension, puis visite (qui porte la note) ; `saisieDInscription(donnees, maintenant, id?)` ;
  - `lireTension(sys, dia)` : `{ sys, dia } | null` (rien saisi) ou message d'erreur. « 14 sur 9 » est lu comme 140/90 ;
  - `VueVisite({ personne, foyer, onRetour, onEnregistrer(saisies, note) })`, `VueInscription({ foyers, foyerId, onRetour, onInscrire(saisie) })`, `VueEnvoi({ file, refus, horsLigne, onEnvoyer, onRetirer(id), onRetour })`, `Enregistreur({ note, onNote })`.

- [ ] **Étape 1 : écrire les tests qui échouent**

Créer `tests/offline/saisies.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { evenementSchema } from "@/domain/evenements";
import { evenementEntrantSchema } from "@/domain/synchronisation";
import { versServeur } from "@/offline/file";
import { saisieDInscription, saisiesDeVisite } from "@/offline/saisies";

const compteur = () => {
  let n = 0;
  return () => `id-${++n}`;
};
const afiavi = { id: "0b8f5c1e-3f8a-4b3a-9a57-6f1f2c3d4e5f", prenom: "Afiavi", nom: "Dossou" };

describe("saisiesDeVisite", () => {
  it("fait partir le signe de danger, puis la tension, puis la visite avec sa note", () => {
    const saisies = saisiesDeVisite(
      { personne: afiavi, constat: "a_orienter", tension: { sys: 150, dia: 95 }, signes: ["maux_de_tete"], avecNote: true, texte: "Voit trouble" },
      new Date("2026-09-25T09:30:00Z"),
      compteur(),
    );
    expect(saisies.map((s) => [s.type, s.id, s.groupe])).toEqual([
      ["signalement_danger", "id-2", "id-1"],
      ["mesure", "id-3", "id-1"],
      ["visite_domicile", "id-1", "id-1"],
    ]);
    expect(saisies[0]?.donnees).toEqual({ signes: ["maux_de_tete"], source: "relais" });
    expect(saisies[1]?.donnees).toEqual({ mesures: { tensionSys: 150, tensionDia: 95 } });
    expect(saisies[2]).toMatchObject({
      patientId: afiavi.id,
      survenuLe: "2026-09-25T09:30:00.000Z",
      donnees: { constat: "a_orienter", noteVocale: true, texte: "Voit trouble" },
      libelle: "Visite chez Afiavi Dossou",
      avecNote: true,
      nature: "visite",
    });
  });

  it("réduit une visite simple à une seule saisie", () => {
    expect(saisiesDeVisite({ personne: afiavi, constat: "absent", signes: [], avecNote: false }, new Date(), compteur())).toEqual([
      expect.objectContaining({ id: "id-1", type: "visite_domicile", donnees: { constat: "absent", noteVocale: false } }),
    ]);
  });

  it("produit des saisies que le serveur sait lire", () => {
    const saisies = saisiesDeVisite(
      { personne: afiavi, constat: "a_orienter", tension: { sys: 150, dia: 95 }, signes: ["saignement"], avecNote: false },
      new Date(),
    );
    for (const s of saisies) {
      expect(evenementEntrantSchema.safeParse(versServeur(s)).success).toBe(true);
      expect(evenementSchema.safeParse({ type: s.type, donnees: s.donnees }).success).toBe(true);
    }
  });
});

describe("saisieDInscription", () => {
  it("donne au nouveau carnet un identifiant différent de celui de l'inscription", () => {
    const s = saisieDInscription({ foyerId: afiavi.id, prenom: "Yao", nom: "Dossou", sexe: "M", dateNaissance: "2026-09-20" }, new Date(), compteur());
    expect(s).toMatchObject({ id: "id-1", patientId: "id-2", type: "inscription", libelle: "Inscription de Yao Dossou", groupe: "id-1", nature: "inscription" });
  });
});
```

Créer `tests/ui/relais/VueVisite.test.tsx` :

```tsx
// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { lireTension, VueVisite } from "@/app/relais/VueVisite";
import { TENSION_INCOMPLETE } from "@/domain/consultation";
import type { PersonneTournee } from "@/domain/tournee";
import type { SaisieEnAttente } from "@/offline/file";

afterEach(cleanup);

const afiavi: PersonneTournee = {
  id: "0b8f5c1e-3f8a-4b3a-9a57-6f1f2c3d4e5f",
  prenom: "Afiavi",
  nom: "Dossou",
  sexe: "F",
  age: 31,
  libelleAge: "31 ans",
  telephone: "+2290197000003",
  enceinte: true,
  malvoyant: false,
  vueAujourdhui: false,
  raisons: [{ texte: "Consultation prénatale 2 manquée", urgence: 1 }],
};

function ouvrir() {
  const onEnregistrer = vi.fn<(saisies: SaisieEnAttente[], note: unknown) => void>();
  render(<VueVisite personne={afiavi} foyer={{ nom: "Dossou", village: "Sèhoun" }} onRetour={() => {}} onEnregistrer={onEnregistrer} />);
  return { onEnregistrer, bouton: screen.getByRole("button", { name: "Enregistrer la visite" }) as HTMLButtonElement };
}

describe("VueVisite", () => {
  it("dit pourquoi passer, et n'enregistre qu'avec un constat", () => {
    const { bouton } = ouvrir();
    expect(screen.getByText("Consultation prénatale 2 manquée")).toBeTruthy();
    expect(bouton.disabled).toBe(true);
    fireEvent.click(screen.getByLabelText("Tout va bien"));
    expect(bouton.disabled).toBe(false);
  });

  it("fait partir la tension avec la visite, « 15 sur 9 » compris comme 150/90", () => {
    const { onEnregistrer, bouton } = ouvrir();
    fireEvent.click(screen.getByLabelText("À orienter vers le centre"));
    fireEvent.change(screen.getByLabelText("Tension, premier chiffre"), { target: { value: "15" } });
    fireEvent.change(screen.getByLabelText("Tension, second chiffre"), { target: { value: "9" } });
    fireEvent.click(bouton);
    const [saisies, note] = onEnregistrer.mock.calls[0]!;
    expect(saisies.map((s) => s.type)).toEqual(["mesure", "visite_domicile"]);
    expect(saisies[0]?.donnees).toEqual({ mesures: { tensionSys: 150, tensionDia: 90 } });
    expect(saisies[1]?.donnees).toEqual({ constat: "a_orienter", noteVocale: false });
    expect(note).toBeNull();
  });

  it("dit ce qui manque à la tension, et n'enregistre pas", () => {
    const { onEnregistrer, bouton } = ouvrir();
    fireEvent.click(screen.getByLabelText("Tout va bien"));
    fireEvent.change(screen.getByLabelText("Tension, premier chiffre"), { target: { value: "140" } });
    fireEvent.click(bouton);
    expect(screen.getByRole("alert").textContent).toBe(TENSION_INCOMPLETE);
    expect(onEnregistrer).not.toHaveBeenCalled();
  });

  it("propose les signes de danger de la grossesse, et l'alerte part en premier", () => {
    const { onEnregistrer, bouton } = ouvrir();
    fireEvent.click(screen.getByLabelText("À orienter vers le centre"));
    fireEvent.click(screen.getByLabelText("Signe de danger"));
    expect(screen.getByLabelText("Saignement")).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Forts maux de tête"));
    fireEvent.click(bouton);
    expect(onEnregistrer.mock.calls[0]![0].map((s) => s.type)).toEqual(["signalement_danger", "visite_domicile"]);
  });

  it("dit quand le téléphone ne peut pas enregistrer la voix", () => {
    ouvrir();
    expect(screen.getByText(/Enregistrer la voix n'est pas possible sur ce téléphone/)).toBeTruthy();
  });
});

describe("lireTension", () => {
  it("accepte rien, les deux chiffres, ou l'écriture en centimètres", () => {
    expect(lireTension("", "")).toBeNull();
    expect(lireTension("140", "90")).toEqual({ sys: 140, dia: 90 });
    expect(lireTension("18", "11")).toEqual({ sys: 180, dia: 110 });
    expect(typeof lireTension("400", "90")).toBe("string");
  });
});
```

Créer `tests/ui/relais/VueInscription.test.tsx` :

```tsx
// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VueInscription } from "@/app/relais/VueInscription";
import { estUuid } from "@/domain/identifiants";
import type { SaisieEnAttente } from "@/offline/file";

const foyers = [{ id: "0b8f5c1e-3f8a-4b3a-9a57-6f1f2c3d4e5f", nom: "Dossou", village: "Sèhoun" }];

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-09-25T10:00:00Z"));
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function ouvrir() {
  const onInscrire = vi.fn<(saisie: SaisieEnAttente) => void>();
  render(<VueInscription foyers={foyers} foyerId={null} onRetour={() => {}} onInscrire={onInscrire} />);
  return onInscrire;
}

describe("VueInscription", () => {
  it("inscrit un nouveau-né, avec un identifiant de carnet créé sur le téléphone", () => {
    const onInscrire = ouvrir();
    fireEvent.click(screen.getByLabelText("Nouveau-né"));
    fireEvent.change(screen.getByLabelText("Prénom"), { target: { value: "Yao" } });
    fireEvent.change(screen.getByLabelText("Nom"), { target: { value: "Dossou" } });
    fireEvent.click(screen.getByLabelText("Garçon"));
    fireEvent.change(screen.getByLabelText("Né le"), { target: { value: "2026-09-20" } });
    fireEvent.click(screen.getByRole("button", { name: "Inscrire" }));
    const [saisie] = onInscrire.mock.calls[0]!;
    expect(saisie).toMatchObject({
      type: "inscription",
      nature: "inscription",
      donnees: { foyerId: foyers[0]!.id, prenom: "Yao", sexe: "M", dateNaissance: "2026-09-20", programme: { code: "vaccination" } },
    });
    expect(estUuid(saisie.patientId)).toBe(true);
  });

  it("dit ce qui manque et garde la saisie", () => {
    const onInscrire = ouvrir();
    fireEvent.click(screen.getByLabelText("Tension"));
    fireEvent.change(screen.getByLabelText("Prénom"), { target: { value: "Noël" } });
    fireEvent.change(screen.getByLabelText("Nom"), { target: { value: "Kiki" } });
    fireEvent.click(screen.getByLabelText("Homme"));
    fireEvent.click(screen.getByRole("button", { name: "Inscrire" }));
    expect(screen.getByRole("alert").textContent).toBe("Indiquez l'âge.");
    expect((screen.getByLabelText("Prénom") as HTMLInputElement).value).toBe("Noël");
    expect(onInscrire).not.toHaveBeenCalled();
  });
});
```

Créer `tests/ui/relais/VueEnvoi.test.tsx` :

```tsx
// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { VueEnvoi } from "@/app/relais/VueEnvoi";
import type { SaisieEnAttente } from "@/offline/file";

afterEach(cleanup);

const saisie = (id: string, type: string, groupe: string, libelle: string): SaisieEnAttente => ({
  id,
  patientId: "p",
  type,
  survenuLe: "2026-09-25T09:30:00.000Z",
  donnees: {},
  libelle,
  groupe,
  nature: "visite",
});

describe("VueEnvoi", () => {
  it("montre une ligne par visite, pas par saisie", () => {
    render(
      <VueEnvoi
        file={[saisie("m", "mesure", "v", "Tension d'Afiavi Dossou"), saisie("v", "visite_domicile", "v", "Visite chez Afiavi Dossou")]}
        refus={[]}
        horsLigne={false}
        onEnvoyer={() => {}}
        onRetirer={() => {}}
        onRetour={() => {}}
      />,
    );
    expect(screen.getAllByRole("listitem").map((li) => li.textContent)).toEqual([expect.stringContaining("Visite chez Afiavi Dossou")]);
    expect(screen.getByRole("button", { name: "Envoyer maintenant" })).toBeTruthy();
  });

  it("montre la raison d'un refus et permet de le retirer", () => {
    const onRetirer = vi.fn();
    const refusee = saisie("r", "visite_domicile", "r", "Visite chez Codjo Houngbo");
    render(
      <VueEnvoi
        file={[]}
        refus={[{ saisie: refusee, motif: "Cette personne n'est pas dans votre tournée.", le: "2026-09-25T10:00:00.000Z" }]}
        horsLigne
        onEnvoyer={() => {}}
        onRetirer={onRetirer}
        onRetour={() => {}}
      />,
    );
    expect(screen.getByText("Cette personne n'est pas dans votre tournée.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Retirer de la liste" }));
    expect(onRetirer).toHaveBeenCalledWith("r");
  });

  it("ne propose pas d'envoyer sans réseau", () => {
    render(
      <VueEnvoi file={[saisie("v", "visite_domicile", "v", "Visite")]} refus={[]} horsLigne onEnvoyer={() => {}} onRetirer={() => {}} onRetour={() => {}} />,
    );
    expect((screen.getByRole("button", { name: /Pas de réseau/ }) as HTMLButtonElement).disabled).toBe(true);
  });
});
```

Run : `pnpm vitest run tests/offline/saisies.test.ts tests/ui/relais`
Expected : FAIL (modules introuvables).

- [ ] **Étape 2 : écrire les saisies**

Créer `src/offline/saisies.ts` :

```ts
import type { ConstatVisite, InscriptionDonnees } from "@/domain/evenements";
import { uuidV7 } from "@/domain/identifiants";
import type { CodeSigne } from "@/domain/signes-danger";
import type { SaisieEnAttente } from "./file";

export interface Visite {
  personne: { id: string; prenom: string; nom: string };
  constat: ConstatVisite;
  texte?: string;
  tension?: { sys: number; dia: number };
  signes: CodeSigne[];
  avecNote: boolean;
}

const nouvelId = () => uuidV7();

/**
 * Une visite devient une ou plusieurs saisies de la file, qui partent dans cet ordre :
 * le signe de danger d'abord (il crée l'alerte du centre), puis la tension, puis la visite, qui porte la note vocale.
 */
export function saisiesDeVisite(v: Visite, maintenant: Date, id: () => string = nouvelId): SaisieEnAttente[] {
  const groupe = id();
  const nomComplet = `${v.personne.prenom} ${v.personne.nom}`;
  const commun = { patientId: v.personne.id, survenuLe: maintenant.toISOString(), groupe, nature: "visite" as const };
  const saisies: SaisieEnAttente[] = [];
  if (v.signes.length) {
    saisies.push({ ...commun, id: id(), type: "signalement_danger", donnees: { signes: v.signes, source: "relais" }, libelle: `Signe de danger chez ${nomComplet}` });
  }
  if (v.tension) {
    saisies.push({
      ...commun,
      id: id(),
      type: "mesure",
      donnees: { mesures: { tensionSys: v.tension.sys, tensionDia: v.tension.dia } },
      libelle: `Tension de ${nomComplet}`,
    });
  }
  saisies.push({
    ...commun,
    id: groupe,
    type: "visite_domicile",
    donnees: { constat: v.constat, noteVocale: v.avecNote, ...(v.texte ? { texte: v.texte } : {}) },
    libelle: `Visite chez ${nomComplet}`,
    avecNote: v.avecNote,
  });
  return saisies;
}

/** L'inscription porte l'identifiant du nouveau carnet : on peut visiter la personne avant que l'inscription soit partie. */
export function saisieDInscription(donnees: InscriptionDonnees, maintenant: Date, id: () => string = nouvelId): SaisieEnAttente {
  const evenementId = id();
  return {
    id: evenementId,
    patientId: id(),
    type: "inscription",
    survenuLe: maintenant.toISOString(),
    donnees,
    libelle: `Inscription de ${donnees.prenom} ${donnees.nom}`,
    groupe: evenementId,
    nature: "inscription",
  };
}
```

- [ ] **Étape 3 : écrire l'enregistreur et la vue de visite**

Créer `src/app/relais/Enregistreur.tsx` :

```tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { NoteLocale } from "@/offline/stockage";
import { BoutonEcouter } from "@/ui/BoutonEcouter";
import { Icone } from "@/ui/Icone";

const DUREE_MAX_S = 60;
const TYPES = ["audio/webm;codecs=opus", "audio/ogg;codecs=opus", "audio/mp4"];
const aucunAbonnement = () => () => {};
const microDisponible = () => "MediaRecorder" in window && Boolean(navigator.mediaDevices?.getUserMedia);

/** « Maintenir pour raconter la visite » : la note reste sur le téléphone et part après la visite. */
export function Enregistreur({ note, onNote }: { note: NoteLocale | null; onNote: (note: NoteLocale | null) => void }) {
  const disponible = useSyncExternalStore(aucunAbonnement, microDisponible, () => false);
  const [enregistre, setEnregistre] = useState(false);
  const [secondes, setSecondes] = useState(0);
  const [refuse, setRefuse] = useState(false);
  const appuye = useRef(false);
  const enregistreur = useRef<MediaRecorder | null>(null);
  const url = useMemo(() => (note ? URL.createObjectURL(new Blob([note.octets], { type: note.type })) : null), [note]);
  useEffect(() => () => void (url && URL.revokeObjectURL(url)), [url]);

  const arreter = useCallback(() => {
    appuye.current = false;
    if (enregistreur.current?.state === "recording") enregistreur.current.stop();
    enregistreur.current = null;
    setEnregistre(false);
  }, []);

  useEffect(() => {
    if (!enregistre) return;
    const debut = Date.now();
    const minuterie = window.setInterval(() => {
      const ecoule = Math.floor((Date.now() - debut) / 1000);
      setSecondes(ecoule);
      if (ecoule >= DUREE_MAX_S) arreter();
    }, 250);
    return () => window.clearInterval(minuterie);
  }, [enregistre, arreter]);

  async function commencer() {
    appuye.current = true;
    try {
      const flux = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Le relais a lâché pendant la demande d'accès au micro : on n'enregistre pas.
      if (!appuye.current) {
        flux.getTracks().forEach((piste) => piste.stop());
        return;
      }
      const type = TYPES.find((t) => MediaRecorder.isTypeSupported(t));
      const r = new MediaRecorder(flux, { ...(type ? { mimeType: type } : {}), audioBitsPerSecond: 24_000 });
      const morceaux: Blob[] = [];
      const debut = Date.now();
      r.ondataavailable = (e) => {
        if (e.data.size) morceaux.push(e.data);
      };
      r.onstop = async () => {
        flux.getTracks().forEach((piste) => piste.stop());
        const duree = Math.round((Date.now() - debut) / 1000);
        if (duree < 1 || morceaux.length === 0) return;
        const blob = new Blob(morceaux, { type: r.mimeType || type || "audio/webm" });
        onNote({ type: blob.type, octets: await blob.arrayBuffer(), dureeSecondes: duree });
      };
      r.start();
      enregistreur.current = r;
      setSecondes(0);
      setRefuse(false);
      setEnregistre(true);
    } catch {
      setRefuse(true);
    }
  }

  if (!disponible) {
    return <p className="rounded-carte bg-white p-4 text-sm text-gris">Enregistrer la voix n&apos;est pas possible sur ce téléphone : écrivez un mot pour le centre.</p>;
  }

  return (
    <section className="flex items-center gap-4 rounded-carte bg-white p-4">
      <button
        type="button"
        aria-label={enregistre ? "Relâcher pour arrêter" : "Maintenir pour raconter la visite"}
        aria-pressed={enregistre}
        onPointerDown={(e) => {
          e.preventDefault();
          void commencer();
        }}
        onPointerUp={arreter}
        onPointerCancel={arreter}
        onPointerLeave={() => appuye.current && arreter()}
        onKeyDown={(e) => {
          if ((e.key === " " || e.key === "Enter") && !e.repeat) {
            e.preventDefault();
            void commencer();
          }
        }}
        onKeyUp={(e) => (e.key === " " || e.key === "Enter") && arreter()}
        onContextMenu={(e) => e.preventDefault()}
        className={`grid size-16 shrink-0 touch-none place-items-center rounded-full ring-8 select-none ${
          enregistre ? "bg-urgence text-white ring-urgence-pale" : "bg-soleil text-nuit ring-soleil-pale"
        }`}
      >
        <Icone nom="ph-microphone" className="size-8" />
      </button>
      <div className="min-w-0 flex-1">
        {enregistre ? (
          <p role="status" className="font-bold">
            J&apos;écoute… {secondes} s <span className="text-sm font-normal text-gris">(relâchez pour arrêter)</span>
          </p>
        ) : note && url ? (
          <div className="flex flex-wrap items-center gap-2">
            <BoutonEcouter key={url} variante="pastille" libelle={`Écouter ma visite, ${note.dureeSecondes} s`} source={url} />
            <b>Ma visite, {note.dureeSecondes} s</b>
            <button type="button" onClick={() => onNote(null)} className="text-sm font-bold text-marque underline">
              Effacer
            </button>
          </div>
        ) : (
          <>
            <b className="block">Maintenir pour raconter la visite</b>
            <small className="text-sm text-gris">
              {refuse ? "Le micro n'est pas autorisé : autorisez-le dans le navigateur, ou écrivez un mot." : `${DUREE_MAX_S} secondes au plus.`}
            </small>
          </>
        )}
      </div>
    </section>
  );
}
```

Créer `src/app/relais/VueVisite.tsx` :

```tsx
"use client";

import { useState } from "react";
import { TENSION_INCOMPLETE } from "@/domain/consultation";
import { CONSTATS_VISITE, LIBELLES_CONSTAT, type ConstatVisite } from "@/domain/evenements";
import { CONSEIL_URGENCE, LIBELLES_SIGNES, signesProposes, type CodeSigne } from "@/domain/signes-danger";
import { formaterTelephone, normaliserTelephone } from "@/domain/telephone";
import type { FoyerTournee, PersonneTournee } from "@/domain/tournee";
import type { SaisieEnAttente } from "@/offline/file";
import { saisiesDeVisite } from "@/offline/saisies";
import type { NoteLocale } from "@/offline/stockage";
import { Icone } from "@/ui/Icone";
import type { NomIcone } from "@/ui/icones";
import { ICONE_SIGNE } from "@/ui/pictogrammes";
import { Enregistreur } from "./Enregistreur";

const ICONE_CONSTAT: Record<ConstatVisite, NomIcone> = { tout_va_bien: "ph-check-circle", a_orienter: "hi-hospital", absent: "ph-house" };
const TENSION_INVALIDE = "Vérifiez la tension : par exemple 140 sur 90.";
const PASTILLE = ["bg-urgence", "bg-soleil", "bg-lavande-5"] as const;

/** Tension facultative : les deux chiffres ou aucun. « 14 sur 9 », comme on le dit souvent, se lit 140/90. */
export function lireTension(sys: string, dia: string): { sys: number; dia: number } | null | string {
  if (!sys.trim() && !dia.trim()) return null;
  if (!sys.trim() || !dia.trim()) return TENSION_INCOMPLETE;
  let s = Number(sys);
  let d = Number(dia);
  if (!Number.isInteger(s) || !Number.isInteger(d)) return TENSION_INVALIDE;
  if (s <= 30 && d <= 20) {
    s *= 10;
    d *= 10;
  }
  if (s < 50 || s > 300 || d < 30 || d > 200) return TENSION_INVALIDE;
  return { sys: s, dia: d };
}

type Props = {
  personne: PersonneTournee;
  foyer: Pick<FoyerTournee, "nom" | "village">;
  onRetour: () => void;
  onEnregistrer: (saisies: SaisieEnAttente[], note: NoteLocale | null) => void;
};

export function VueVisite({ personne, foyer, onRetour, onEnregistrer }: Props) {
  const [constat, setConstat] = useState<ConstatVisite | null>(null);
  const [note, setNote] = useState<NoteLocale | null>(null);
  const [sys, setSys] = useState("");
  const [dia, setDia] = useState("");
  const [danger, setDanger] = useState(false);
  const [signes, setSignes] = useState<CodeSigne[]>([]);
  const [texte, setTexte] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const telephone = personne.telephone ? normaliserTelephone(personne.telephone) : null;

  function enregistrer() {
    if (!constat) return;
    const tension = lireTension(sys, dia);
    if (typeof tension === "string") {
      setErreur(tension);
      return;
    }
    const saisies = saisiesDeVisite(
      { personne, constat, texte: texte.trim() || undefined, tension: tension ?? undefined, signes: danger ? signes : [], avecNote: note !== null },
      new Date(),
    );
    onEnregistrer(saisies, note);
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col gap-4 bg-lavande px-4 py-5">
      <button type="button" onClick={onRetour} className="flex items-center gap-2 self-start rounded-bouton bg-white px-3 py-2 text-sm font-bold text-marque">
        <Icone nom="ph-arrow-left" className="size-5" />
        Ma tournée
      </button>
      <header>
        <p className="text-sm font-bold text-gris">
          Foyer {foyer.nom}, {foyer.village}
        </p>
        <h1 className="text-2xl font-bold">
          Visite chez {personne.prenom} {personne.nom}
        </h1>
        <p className="text-gris">
          {personne.libelleAge}
          {telephone ? ` · ${formaterTelephone(telephone)}` : ""}
        </p>
      </header>

      {personne.raisons.length > 0 && (
        <section aria-labelledby="titre-raisons" className="rounded-carte bg-white p-4">
          <h2 id="titre-raisons" className="text-sm font-bold text-gris">
            Pourquoi passer
          </h2>
          <ul className="mt-2 flex flex-col gap-1.5">
            {personne.raisons.map((r) => (
              <li key={r.texte} className="flex items-start gap-2">
                <span aria-hidden="true" className={`mt-2 size-2.5 shrink-0 rounded-full ${PASTILLE[r.urgence]}`} />
                {r.texte}
              </li>
            ))}
          </ul>
        </section>
      )}

      <fieldset>
        <legend className="mb-2 font-bold">Comment ça va ?</legend>
        <div className="grid grid-cols-3 gap-2">
          {CONSTATS_VISITE.map((c) => (
            <label
              key={c}
              className="flex cursor-pointer flex-col items-center gap-1.5 rounded-carte bg-white p-3 text-center text-sm font-bold has-checked:bg-marque has-checked:text-white has-focus-visible:outline-3 has-focus-visible:outline-soleil-appuye"
            >
              <input type="radio" name="constat" value={c} checked={constat === c} onChange={() => setConstat(c)} className="sr-only" />
              <Icone nom={ICONE_CONSTAT[c]} className="size-8" />
              {LIBELLES_CONSTAT[c]}
            </label>
          ))}
        </div>
      </fieldset>

      <Enregistreur note={note} onNote={setNote} />

      <fieldset className="rounded-carte bg-white p-4">
        <legend className="float-left flex items-center gap-2 font-bold">
          <Icone nom="hi-blood-pressure" className="size-6 text-marque" />
          Tension <span className="text-sm font-normal text-gris">(facultatif)</span>
        </legend>
        <div className="clear-left flex items-center gap-2 pt-2">
          <input
            aria-label="Tension, premier chiffre"
            inputMode="numeric"
            value={sys}
            onChange={(e) => setSys(e.target.value)}
            placeholder="140"
            className="w-20 rounded-bouton bg-lavande px-3 py-2.5 text-center text-lg font-bold"
          />
          <span className="font-bold">sur</span>
          <input
            aria-label="Tension, second chiffre"
            inputMode="numeric"
            value={dia}
            onChange={(e) => setDia(e.target.value)}
            placeholder="90"
            className="w-20 rounded-bouton bg-lavande px-3 py-2.5 text-center text-lg font-bold"
          />
        </div>
      </fieldset>

      <section className="rounded-carte bg-white p-4">
        <label className="flex items-center gap-3 font-bold">
          <input type="checkbox" checked={danger} onChange={(e) => setDanger(e.target.checked)} className="size-5 accent-urgence" />
          <Icone nom="hi-alert-circle" className="size-6 text-urgence" />
          Signe de danger
        </label>
        {danger && (
          <>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {signesProposes(personne).map((code) => (
                <label
                  key={code}
                  className="flex cursor-pointer items-center gap-2 rounded-bouton bg-lavande p-2.5 text-sm font-bold has-checked:bg-urgence has-checked:text-white"
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={signes.includes(code)}
                    onChange={(e) => setSignes((s) => (e.target.checked ? [...s, code] : s.filter((x) => x !== code)))}
                  />
                  <Icone nom={ICONE_SIGNE[code]} className="size-6 shrink-0" />
                  {LIBELLES_SIGNES[code]}
                </label>
              ))}
            </div>
            <p className="mt-3 rounded-bouton bg-urgence-pale p-3 text-sm font-bold text-urgence">
              {CONSEIL_URGENCE} L&apos;alerte part au centre dès que le réseau le permet.
            </p>
          </>
        )}
      </section>

      <label className="flex flex-col gap-1.5 font-bold">
        <span>
          Un mot pour le centre <span className="text-sm font-normal text-gris">(facultatif)</span>
        </span>
        <textarea value={texte} onChange={(e) => setTexte(e.target.value)} maxLength={500} rows={2} className="rounded-bouton bg-white p-3 font-normal" />
      </label>

      {erreur && (
        <p role="alert" className="rounded-bouton bg-urgence-pale p-3 font-bold text-urgence">
          {erreur}
        </p>
      )}
      <button
        type="button"
        onClick={enregistrer}
        disabled={!constat || (danger && signes.length === 0)}
        className="sticky bottom-4 rounded-bouton bg-marque py-4 text-lg font-bold text-white disabled:opacity-50"
      >
        Enregistrer la visite
      </button>
    </main>
  );
}
```

- [ ] **Étape 4 : écrire les vues d'inscription et d'envoi**

Créer `src/app/relais/VueInscription.tsx` :

```tsx
"use client";

import { useState, type FormEvent } from "react";
import { aujourdhuiAuBenin } from "@/domain/dates";
import { LIBELLES_INSCRIPTION, lireInscription, TYPES_INSCRIPTION, type TypeInscription } from "@/domain/inscription";
import type { FoyerTournee } from "@/domain/tournee";
import type { SaisieEnAttente } from "@/offline/file";
import { saisieDInscription } from "@/offline/saisies";
import { Icone } from "@/ui/Icone";
import type { NomIcone } from "@/ui/icones";

const ICONE_INSCRIPTION: Record<TypeInscription, NomIcone> = {
  nouveau_ne: "hi-baby-0306m",
  grossesse: "hi-pregnant",
  tension: "hi-blood-pressure",
  diabete: "hi-diabetes-measure",
  personne_agee: "hi-elderly",
};
const CHAMP = "rounded-bouton bg-white px-3 py-3 text-lg";
const TUILE = "flex cursor-pointer items-center justify-center gap-2 rounded-bouton bg-white p-3 font-bold has-checked:bg-marque has-checked:text-white";

type Props = {
  foyers: Pick<FoyerTournee, "id" | "nom" | "village">[];
  foyerId: string | null;
  onRetour: () => void;
  onInscrire: (saisie: SaisieEnAttente) => void;
};

/** Inscrire une personne pendant la tournée, même sans réseau : son carnet sera créé au retour du réseau. */
export function VueInscription({ foyers, foyerId, onRetour, onInscrire }: Props) {
  const [type, setType] = useState<TypeInscription | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const nouveauNe = type === "nouveau_ne";

  function inscrire(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const champs = Object.fromEntries([...new FormData(e.currentTarget).entries()].filter(([, v]) => v !== "").map(([cle, v]) => [cle, String(v)]));
    const lecture = lireInscription({ ...champs, type }, aujourdhuiAuBenin());
    if (!lecture.ok) {
      setErreur(lecture.message);
      return;
    }
    onInscrire(saisieDInscription(lecture.donnees, new Date()));
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col gap-4 bg-lavande px-4 py-5">
      <button type="button" onClick={onRetour} className="flex items-center gap-2 self-start rounded-bouton bg-white px-3 py-2 text-sm font-bold text-marque">
        <Icone nom="ph-arrow-left" className="size-5" />
        Ma tournée
      </button>
      <h1 className="text-2xl font-bold">Inscrire une personne</h1>
      <form onSubmit={inscrire} className="flex flex-col gap-4">
        <fieldset>
          <legend className="mb-2 font-bold">Pour quoi ?</legend>
          <div className="grid grid-cols-2 gap-2">
            {TYPES_INSCRIPTION.map((t) => (
              <label key={t} className={`${TUILE} flex-col py-4`}>
                <input type="radio" name="typeChoisi" checked={type === t} onChange={() => setType(t)} className="sr-only" />
                <Icone nom={ICONE_INSCRIPTION[t]} className="size-9" />
                {LIBELLES_INSCRIPTION[t]}
              </label>
            ))}
          </div>
        </fieldset>

        <label className="flex flex-col gap-1.5 font-bold">
          Foyer
          <select name="foyerId" defaultValue={foyerId ?? foyers[0]?.id} className={CHAMP}>
            {foyers.map((f) => (
              <option key={f.id} value={f.id}>
                Foyer {f.nom}, {f.village}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 font-bold">
          Prénom
          <input name="prenom" autoComplete="off" className={CHAMP} />
        </label>
        <label className="flex flex-col gap-1.5 font-bold">
          Nom
          <input name="nom" autoComplete="off" className={CHAMP} />
        </label>

        {type === "grossesse" ? (
          <input type="hidden" name="sexe" value="F" />
        ) : (
          <fieldset>
            <legend className="mb-2 font-bold">Sexe</legend>
            <div className="grid grid-cols-2 gap-2">
              <label className={TUILE}>
                <input type="radio" name="sexe" value="F" className="sr-only" />
                {nouveauNe ? "Fille" : "Femme"}
              </label>
              <label className={TUILE}>
                <input type="radio" name="sexe" value="M" className="sr-only" />
                {nouveauNe ? "Garçon" : "Homme"}
              </label>
            </div>
          </fieldset>
        )}

        {nouveauNe ? (
          <label className="flex flex-col gap-1.5 font-bold">
            Né le
            <input type="date" name="nele" max={aujourdhuiAuBenin()} className={CHAMP} />
          </label>
        ) : (
          <label className="flex flex-col gap-1.5 font-bold">
            Âge (en années)
            <input name="age" inputMode="numeric" className={CHAMP} />
          </label>
        )}
        {type === "grossesse" && (
          <label className="flex flex-col gap-1.5 font-bold">
            Semaines de grossesse
            <input name="semaines" inputMode="numeric" className={CHAMP} />
          </label>
        )}
        <label className="flex flex-col gap-1.5 font-bold">
          <span>
            Téléphone <span className="text-sm font-normal text-gris">(facultatif)</span>
          </span>
          <input name="telephone" inputMode="tel" autoComplete="off" className={CHAMP} />
        </label>

        {erreur && (
          <p role="alert" className="rounded-bouton bg-urgence-pale p-3 font-bold text-urgence">
            {erreur}
          </p>
        )}
        <button disabled={!type} className="rounded-bouton bg-marque py-4 text-lg font-bold text-white disabled:opacity-50">
          Inscrire
        </button>
      </form>
    </main>
  );
}
```

Le libellé « Tension » d'une tuile d'inscription et celui du test (`getByLabelText("Tension")`) correspondent à `LIBELLES_INSCRIPTION.tension`.

Créer `src/app/relais/VueEnvoi.tsx` :

```tsx
"use client";

import { heureMinute } from "@/domain/temps";
import type { Refus, SaisieEnAttente } from "@/offline/file";
import { Icone } from "@/ui/Icone";

type Props = {
  file: SaisieEnAttente[];
  refus: Refus[];
  horsLigne: boolean;
  onEnvoyer: () => void;
  onRetirer: (id: string) => void;
  onRetour: () => void;
};

/** Ce qui attend le réseau, et ce que le centre n'a pas pu recevoir, avec la raison (spec §10.2). */
export function VueEnvoi({ file, refus, horsLigne, onEnvoyer, onRetirer, onRetour }: Props) {
  // Une ligne par visite ou inscription : la saisie qui porte l'identifiant du groupe.
  const principales = file.filter((s) => s.id === s.groupe);
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col gap-4 bg-lavande px-4 py-5">
      <button type="button" onClick={onRetour} className="flex items-center gap-2 self-start rounded-bouton bg-white px-3 py-2 text-sm font-bold text-marque">
        <Icone nom="ph-arrow-left" className="size-5" />
        Ma tournée
      </button>
      <h1 className="text-2xl font-bold">Envois</h1>

      <section aria-labelledby="titre-attente" className="rounded-carte bg-white p-4">
        <h2 id="titre-attente" className="font-bold">
          À envoyer
        </h2>
        {principales.length ? (
          <>
            <ul className="mt-2 flex flex-col gap-2">
              {principales.map((s) => (
                <li key={s.id} className="flex items-center gap-2">
                  <Icone nom="ph-cloud-arrow-up" className="size-5 shrink-0 text-marque" />
                  <span className="flex-1">{s.libelle}</span>
                  <span className="text-xs text-gris">{heureMinute(new Date(s.survenuLe))}</span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={onEnvoyer}
              disabled={horsLigne}
              className="mt-3 w-full rounded-bouton bg-marque py-3 font-bold text-white disabled:bg-lavande-4"
            >
              {horsLigne ? "Pas de réseau : envoi au retour du réseau" : "Envoyer maintenant"}
            </button>
          </>
        ) : (
          <p className="mt-1 text-gris">Tout est parti.</p>
        )}
      </section>

      {refus.length > 0 && (
        <section aria-labelledby="titre-corriger" className="rounded-carte bg-white p-4">
          <h2 id="titre-corriger" className="font-bold text-urgence">
            À corriger
          </h2>
          <p className="text-sm text-gris">Le centre n&apos;a pas pu recevoir ces saisies. Refaites-les si besoin, puis retirez-les de la liste.</p>
          <ul className="mt-2 flex flex-col gap-3">
            {refus.map((r) => (
              <li key={r.saisie.id} className="rounded-2xl bg-urgence-pale p-3">
                <b className="block">{r.saisie.libelle}</b>
                <p className="text-sm">{r.motif}</p>
                <button type="button" onClick={() => onRetirer(r.saisie.id)} className="mt-2 text-sm font-bold text-marque underline">
                  Retirer de la liste
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
```

- [ ] **Étape 5 : relancer les tests, vérifier les types et le style**

Run : `pnpm vitest run tests/offline tests/ui/relais && pnpm typecheck && pnpm lint`
Expected : PASS, aucune erreur.

- [ ] **Étape 6 : commit**

```bash
git add src/offline/saisies.ts src/app/relais tests/offline/saisies.test.ts tests/ui/relais
git commit -m "feat(relais): visite avec note vocale, tension et signe de danger ; inscription ; envois et « À corriger »"
```

---

### Tâche 13 : la tournée sur le téléphone (assemblage)

**Fichiers :**
- Créer : `src/app/relais/VueListe.tsx`, `src/app/relais/ApplicationTournee.tsx`
- Modifier : `src/app/relais/page.tsx`
- Tester : `tests/ui/relais/VueListe.test.tsx`, puis vérification dans le navigateur

**Interfaces :**
- Consomme : tout ce qui précède ; `useOffline` (`next/offline`) ; `BoutonDeconnexion` (tâche 11).
- Produit : `VueListe(props)` ; `ApplicationTournee({ relais })`. Il relit le stockage, envoie la file au lancement, au retour du réseau (`online`) et toutes les 30 secondes, puis après chaque saisie.

- [ ] **Étape 1 : écrire le test qui échoue**

Créer `tests/ui/relais/VueListe.test.tsx` :

```tsx
// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/actions-session", () => ({ seDeconnecter: vi.fn() }));

import { VueListe } from "@/app/relais/VueListe";
import type { PersonneTournee, Tournee } from "@/domain/tournee";

afterEach(cleanup);

const personne = (id: string, prenom: string, extra: Partial<PersonneTournee> = {}): PersonneTournee => ({
  id,
  prenom,
  nom: "X",
  sexe: "F",
  age: 40,
  libelleAge: "40 ans",
  telephone: null,
  enceinte: false,
  malvoyant: false,
  vueAujourdhui: false,
  raisons: [],
  ...extra,
});

const tournee: Tournee = {
  relais: "Koffi Agbessi",
  prepareeLe: "2026-09-25T06:05:00.000Z",
  aujourdhui: "2026-09-25",
  foyers: [
    { id: "f1", nom: "Salifou", village: "Sèhoun", urgence: 0, personnes: [personne("p1", "Rachida", { malvoyant: true, raisons: [{ texte: "Signe de danger signalé, pas encore pris en charge : passer tout de suite", urgence: 0 }] })] },
    { id: "f2", nom: "Dossou", village: "Sèhoun", urgence: 1, personnes: [personne("p2", "Afiavi", { vueAujourdhui: true, raisons: [{ texte: "Consultation prénatale 2 manquée", urgence: 1 }] })] },
    { id: "f3", nom: "Kiki", village: "Kinta", urgence: null, personnes: [personne("p3", "Noël", { sexe: "M" })] },
  ],
};

const actions = { onPreparer: vi.fn(), onVisiter: vi.fn(), onInscrire: vi.fn(), onEnvoi: vi.fn(), avantDeconnexion: async () => null };

describe("VueListe", () => {
  it("montre les foyers dans l'ordre, l'urgence, les raisons et l'avancement", () => {
    render(<VueListe relais="Koffi Agbessi" tournee={tournee} pret enAttente={null} aCorriger={0} horsLigne={false} preparation={false} message={null} retour={null} {...actions} />);
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual(["Foyer Salifou", "Foyer Dossou", "Foyer Kiki"]);
    expect(screen.getByText("Urgent")).toBeTruthy();
    expect(screen.getByText("Malvoyante")).toBeTruthy();
    expect(screen.getByText("1 foyer sur 2")).toBeTruthy();
    expect(screen.getByText("Koffi Agbessi, relais de Sèhoun")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Afiavi, 40 ans/ }));
    expect(actions.onVisiter).toHaveBeenCalledWith("p2");
  });

  it("dit ce qui attend le réseau et ce qui est à corriger", () => {
    render(
      <VueListe relais="Koffi Agbessi" tournee={tournee} pret enAttente="2 visites partiront dès que le réseau revient" aCorriger={1} horsLigne preparation={false} message={null} retour={null} {...actions} />,
    );
    expect(screen.getByText("2 visites partiront dès que le réseau revient")).toBeTruthy();
    expect(screen.getByRole("button", { name: "1 saisie à corriger" })).toBeTruthy();
  });

  it("invite à préparer la tournée quand le téléphone n'en a pas", () => {
    render(<VueListe relais="Koffi Agbessi" tournee={null} pret enAttente={null} aCorriger={0} horsLigne={false} preparation={false} message={null} retour={null} {...actions} />);
    expect(screen.getByRole("heading", { name: "Préparez votre tournée" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Préparer ma tournée" }));
    expect(actions.onPreparer).toHaveBeenCalled();
  });
});
```

Run : `pnpm vitest run tests/ui/relais/VueListe.test.tsx`
Expected : FAIL (module introuvable).

- [ ] **Étape 2 : écrire la liste**

Créer `src/app/relais/VueListe.tsx` :

```tsx
"use client";

import { heureMinute } from "@/domain/temps";
import { avancement, type FoyerTournee, type Tournee } from "@/domain/tournee";
import { iconePourPersonne } from "@/ui/avatar";
import { BoutonDeconnexion } from "@/ui/BoutonDeconnexion";
import { Icone } from "@/ui/Icone";
import { Ondes } from "@/ui/Ondes";
import { RetourAction } from "@/ui/RetourAction";

type Props = {
  relais: string;
  tournee: Tournee | null;
  /** Le stockage du téléphone a été lu (évite d'annoncer « pas de tournée » avant la lecture). */
  pret: boolean;
  enAttente: string | null;
  aCorriger: number;
  horsLigne: boolean;
  preparation: boolean;
  message: string | null;
  retour: string | null;
  onPreparer: () => void;
  onVisiter: (personneId: string) => void;
  onInscrire: () => void;
  onEnvoi: () => void;
  avantDeconnexion: () => Promise<string | null>;
};

/** Le village où le relais suit le plus de foyers : « relais de Sèhoun ». */
function villagePrincipal(foyers: FoyerTournee[]): string | null {
  const comptes = new Map<string, number>();
  for (const f of foyers) comptes.set(f.village, (comptes.get(f.village) ?? 0) + 1);
  return [...comptes.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

export function VueListe(p: Props) {
  const { faits, aVoir } = p.tournee ? avancement(p.tournee.foyers) : { faits: 0, aVoir: 0 };
  const secteur = p.tournee ? villagePrincipal(p.tournee.foyers) : null;
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col bg-lavande">
      <header className="relative overflow-hidden rounded-b-grande bg-nuit px-4 pt-5 pb-5 text-white">
        <Ondes className="-top-12 -right-12 size-52 text-white/10" />
        <div className="relative flex items-center gap-3">
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-white/10">
            <Icone nom="hi-community-healthworker" className="size-9" />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold">Ma tournée</h1>
            <p className="truncate text-sm text-lavande-4">
              {p.relais}
              {secteur ? `, relais de ${secteur}` : ""}
            </p>
          </div>
          <BoutonDeconnexion compact className="grid size-11 place-items-center rounded-bouton bg-white/10 text-white" avantDeconnexion={p.avantDeconnexion} />
        </div>
        {(p.enAttente || p.horsLigne) && (
          <p role="status" className="relative mt-4 flex items-center gap-2 rounded-bouton bg-soleil/15 px-3 py-2 text-sm font-bold text-soleil-pale">
            <Icone nom={p.enAttente ? "ph-cloud-arrow-up" : "ph-wifi-slash"} className="size-5 shrink-0 text-soleil" />
            {p.enAttente ?? "Pas de réseau : vos saisies restent sur le téléphone."}
          </p>
        )}
      </header>

      <div className="flex flex-1 flex-col gap-3 px-4 py-4">
        {p.retour && <RetourAction message={p.retour} />}
        {p.message && (
          <p role="alert" className="rounded-bouton bg-soleil-pale px-4 py-3 text-sm font-bold">
            {p.message}
          </p>
        )}
        {p.aCorriger > 0 && (
          <button type="button" onClick={p.onEnvoi} className="flex items-center gap-2 rounded-bouton bg-urgence-pale px-4 py-3 text-left text-sm font-bold text-urgence">
            <Icone nom="ph-warning-circle" className="size-5 shrink-0" />
            {p.aCorriger === 1 ? "1 saisie à corriger" : `${p.aCorriger} saisies à corriger`}
          </button>
        )}

        {p.tournee ? (
          <>
            <div className="flex items-center gap-3 text-sm font-bold">
              <span>
                {faits} foyer{faits > 1 ? "s" : ""} sur {aVoir}
              </span>
              <span
                role="progressbar"
                aria-label="Foyers visités aujourd'hui"
                aria-valuemin={0}
                aria-valuemax={aVoir}
                aria-valuenow={faits}
                className="h-2 flex-1 overflow-hidden rounded bg-lavande-3"
              >
                <span className="block h-full rounded bg-marque" style={{ width: aVoir ? `${(faits / aVoir) * 100}%` : "0%" }} />
              </span>
            </div>
            <ul className="flex flex-col gap-3">
              {p.tournee.foyers.map((foyer) => (
                <CarteFoyer key={foyer.id} foyer={foyer} onVisiter={p.onVisiter} />
              ))}
            </ul>
            <p className="text-center text-xs text-gris">Tournée préparée à {heureMinute(new Date(p.tournee.prepareeLe))}</p>
          </>
        ) : p.pret ? (
          <section className="flex flex-col gap-2 rounded-carte bg-white p-5">
            <h2 className="text-lg font-bold">Préparez votre tournée</h2>
            <p className="text-gris">Avec du réseau, copiez vos foyers sur ce téléphone : ils resteront lisibles pendant toute la tournée, même sans réseau.</p>
          </section>
        ) : null}

        <button
          type="button"
          onClick={p.onPreparer}
          disabled={p.preparation || p.horsLigne}
          className="flex items-center justify-center gap-2 rounded-bouton bg-white py-3 font-bold text-marque disabled:opacity-60"
        >
          <Icone nom="ph-arrow-counter-clockwise" className="size-5" />
          {p.preparation ? "Préparation…" : p.tournee ? "Mettre à jour ma tournée" : "Préparer ma tournée"}
        </button>
      </div>

      <nav aria-label="Actions de la tournée" className="sticky bottom-0 grid grid-cols-2 gap-3 rounded-t-grande bg-white px-4 pt-3 pb-5">
        <button type="button" onClick={p.onInscrire} disabled={!p.tournee} className="flex items-center gap-2 rounded-bouton bg-soleil px-3 py-3 text-left font-bold text-nuit disabled:opacity-60">
          <Icone nom="ph-plus" className="size-6 shrink-0" />
          Inscrire une personne
        </button>
        <button type="button" onClick={p.onEnvoi} className="flex items-center gap-2 rounded-bouton bg-lavande-2 px-3 py-3 text-left font-bold text-marque">
          <Icone nom="ph-cloud-arrow-up" className="size-6 shrink-0" />
          Envois
        </button>
      </nav>
    </main>
  );
}

function CarteFoyer({ foyer, onVisiter }: { foyer: FoyerTournee; onVisiter: (personneId: string) => void }) {
  const vu = foyer.personnes.some((p) => p.vueAujourdhui);
  return (
    <li className="rounded-carte bg-white p-3">
      <div className="flex items-center gap-2 px-1">
        <h2 className="font-bold">Foyer {foyer.nom}</h2>
        {vu && <Icone nom="ph-check-circle" className="size-5 text-marque" titre="Visité aujourd'hui" />}
        {foyer.urgence === 0 && <span className="rounded-lg bg-urgence px-2 py-0.5 text-xs font-bold text-white">Urgent</span>}
        <span className="ml-auto text-xs text-gris">{foyer.village}</span>
      </div>
      <ul className="mt-2 flex flex-col gap-1">
        {foyer.personnes.map((personne) => (
          <li key={personne.id}>
            <button
              type="button"
              onClick={() => onVisiter(personne.id)}
              className="flex w-full items-center gap-3 rounded-2xl p-1.5 text-left hover:bg-lavande focus-visible:outline-3 focus-visible:outline-soleil-appuye"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-lavande-2 text-marque">
                <Icone nom={personne.enceinte ? "hi-pregnant" : iconePourPersonne(personne.sexe, personne.age)} className="size-7" />
              </span>
              <span className="min-w-0 flex-1">
                <b className="flex flex-wrap items-center gap-1.5 text-sm">
                  {personne.prenom}, {personne.libelleAge}
                  {personne.malvoyant && (
                    <span className="rounded-lg bg-lavande-2 px-1.5 text-xs text-gris">{personne.sexe === "F" ? "Malvoyante" : "Malvoyant"}</span>
                  )}
                </b>
                <small className="block text-xs leading-snug text-gris">
                  {personne.raisons[0]?.texte ?? (personne.vueAujourdhui ? "Visite notée aujourd'hui" : "Rien de particulier")}
                </small>
              </span>
              <Icone nom={personne.vueAujourdhui ? "ph-check-circle" : "ph-caret-right"} className="size-5 shrink-0 text-marque" />
            </button>
          </li>
        ))}
      </ul>
    </li>
  );
}
```

- [ ] **Étape 3 : assembler l'application et la page**

Créer `src/app/relais/ApplicationTournee.tsx` :

```tsx
"use client";

import { useOffline } from "next/offline";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Tournee } from "@/domain/tournee";
import { appliquerSaisiesLocales, texteEnAttente, type Refus, type SaisieEnAttente } from "@/offline/file";
import { stockageNavigateur, type NoteLocale } from "@/offline/stockage";
import { synchroniserFile, telechargerTournee, transportNavigateur } from "@/offline/synchronisation";
import { VueEnvoi } from "./VueEnvoi";
import { VueInscription } from "./VueInscription";
import { VueListe } from "./VueListe";
import { VueVisite } from "./VueVisite";

type Vue = { nom: "liste" } | { nom: "visite"; personneId: string } | { nom: "inscription" } | { nom: "envoi" };

const MESSAGES = {
  hors_ligne: "Pas de réseau : la tournée sera mise à jour au retour du réseau.",
  non_connecte: "Votre session a expiré : reconnectez-vous. Vos saisies restent sur ce téléphone.",
} as const;

/** La tournée tient sur le téléphone : on lit et on saisit sans réseau, la file part seule quand le réseau revient. */
export function ApplicationTournee({ relais }: { relais: string }) {
  const stockage = useMemo(() => stockageNavigateur(), []);
  const transport = useMemo(() => transportNavigateur(), []);
  const horsLigne = useOffline();
  const [tournee, setTournee] = useState<Tournee | null>(null);
  const [file, setFile] = useState<SaisieEnAttente[]>([]);
  const [refus, setRefus] = useState<Refus[]>([]);
  const [pret, setPret] = useState(false);
  const [vue, setVue] = useState<Vue>({ nom: "liste" });
  const [preparation, setPreparation] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [retour, setRetour] = useState<string | null>(null);
  const envoiEnCours = useRef(false);

  const relire = useCallback(async () => {
    const [t, f, r] = await Promise.all([stockage.lire("tournee"), stockage.lire("file"), stockage.lire("refus")]);
    setTournee(t);
    setFile(f);
    setRefus(r);
    setPret(true);
  }, [stockage]);

  const envoyer = useCallback(async () => {
    if (envoiEnCours.current) return;
    envoiEnCours.current = true;
    try {
      const bilan = await synchroniserFile(stockage, transport);
      if (bilan.nonConnecte) setMessage(MESSAGES.non_connecte);
    } finally {
      envoiEnCours.current = false;
      await relire();
    }
  }, [stockage, transport, relire]);

  // Au lancement, au retour du réseau, puis toutes les 30 secondes : la file part seule.
  useEffect(() => {
    void relire().then(envoyer);
    const relancer = () => void envoyer();
    window.addEventListener("online", relancer);
    const minuterie = window.setInterval(() => navigator.onLine && relancer(), 30_000);
    return () => {
      window.removeEventListener("online", relancer);
      window.clearInterval(minuterie);
    };
  }, [relire, envoyer]);

  async function preparer() {
    setPreparation(true);
    setMessage(null);
    await envoyer();
    const resultat = await telechargerTournee(stockage);
    if (resultat !== "ok") setMessage(MESSAGES[resultat]);
    await relire();
    setPreparation(false);
  }

  async function ajouter(saisies: SaisieEnAttente[], confirmation: string, note: NoteLocale | null = null) {
    const principale = saisies.find((s) => s.id === s.groupe) ?? saisies[saisies.length - 1]!;
    if (note) await stockage.ecrireNote(principale.id, note);
    await stockage.modifier("file", (f) => [...f, ...saisies]);
    setVue({ nom: "liste" });
    setRetour(confirmation);
    await relire();
    void envoyer();
  }

  async function retirerRefus(id: string) {
    await stockage.modifier("refus", (r) => r.filter((x) => x.saisie.id !== id));
    await relire();
  }

  async function avantDeconnexion(): Promise<string | null> {
    const enAttente = texteEnAttente(await stockage.lire("file"));
    if (enAttente) return `${enAttente}. Restez connecté jusqu'à leur envoi.`;
    await stockage.toutEffacer();
    return null;
  }

  const affichee = tournee ? appliquerSaisiesLocales(tournee, file) : null;
  const retourListe = () => {
    setRetour(null);
    setVue({ nom: "liste" });
  };

  if (vue.nom === "visite" && affichee) {
    for (const foyer of affichee.foyers) {
      const personne = foyer.personnes.find((p) => p.id === vue.personneId);
      if (personne) {
        return (
          <VueVisite
            key={personne.id}
            personne={personne}
            foyer={foyer}
            onRetour={retourListe}
            onEnregistrer={(saisies, note) => void ajouter(saisies, `Visite chez ${personne.prenom} notée.`, note)}
          />
        );
      }
    }
  }
  if (vue.nom === "inscription" && affichee) {
    return (
      <VueInscription
        foyers={affichee.foyers}
        foyerId={null}
        onRetour={retourListe}
        onInscrire={(saisie) => void ajouter([saisie], `${saisie.libelle} notée. Vous pouvez déjà la visiter.`)}
      />
    );
  }
  if (vue.nom === "envoi") {
    return <VueEnvoi file={file} refus={refus} horsLigne={horsLigne} onEnvoyer={() => void envoyer()} onRetirer={(id) => void retirerRefus(id)} onRetour={retourListe} />;
  }
  return (
    <VueListe
      relais={relais}
      tournee={affichee}
      pret={pret}
      enAttente={texteEnAttente(file)}
      aCorriger={refus.length}
      horsLigne={horsLigne}
      preparation={preparation}
      message={message}
      retour={retour}
      onPreparer={() => void preparer()}
      onVisiter={(personneId) => {
        setRetour(null);
        setVue({ nom: "visite", personneId });
      }}
      onInscrire={() => {
        setRetour(null);
        setVue({ nom: "inscription" });
      }}
      onEnvoi={() => {
        setRetour(null);
        setVue({ nom: "envoi" });
      }}
      avantDeconnexion={avantDeconnexion}
    />
  );
}
```

Remplacer `src/app/relais/page.tsx` :

```tsx
import type { Metadata } from "next";
import { exigerRole } from "@/server/auth/cookies";
import { ApplicationTournee } from "./ApplicationTournee";

export const metadata: Metadata = { title: "Ma tournée" };

/** La tournée du relais : une fois la page ouverte, tout se passe sur le téléphone, avec ou sans réseau. */
export default async function PageRelais() {
  const compte = await exigerRole("relais");
  return <ApplicationTournee relais={compte.nomAffiche} />;
}
```

- [ ] **Étape 4 : relancer les tests, vérifier les types et le style**

Run : `pnpm vitest run tests/ui/relais && pnpm typecheck && pnpm lint`
Expected : PASS, aucune erreur.

- [ ] **Étape 5 : vérifier dans le navigateur**

Serveur de développement sur la base locale (port 5439), démo réinitialisée par `pnpm db:seed`. Script puppeteer jetable `relais.mjs` (390 px, Chrome lancé avec `--use-fake-ui-for-media-stream --use-fake-device-for-media-stream`) :
1. Koffi se connecte par `/demo`, ouvre `/relais` et touche « Préparer ma tournée » (capture).
2. Réseau coupé (`page.setOfflineMode(true)`). Il note une visite chez Afiavi : « À orienter vers le centre », note vocale de 3 s (on maintient le bouton), tension 15 sur 9. Il inscrit un nouveau-né « Yao » dans le foyer Dossou (captures).
3. Le bandeau dit « 1 visite et 1 inscription partiront dès que le réseau revient ».
4. Réseau rétabli : la file se vide seule en moins de 30 s (événement `online`).

Expected :
- chaque étape correspond ;
- aucune erreur dans la console ;
- en base (`psql`), la visite a sa note dans `fichiers` et Yao a son carnet.

- [ ] **Étape 6 : commit**

```bash
git add src/app/relais tests/ui/relais
git commit -m "feat(relais): tournée par foyer utilisable sans réseau"
```

---

### Tâche 14 : les visites du relais dans le dossier du soignant

**Fichiers :**
- Modifier : `src/server/requetes/soignant.ts`, `src/app/soignant/patients/[id]/page.tsx`
- Tester : `tests/server/requetes/soignant.test.ts`

**Interfaces :**
- Consomme : événements `visite_domicile`, table `fichiers`, `LIBELLES_CONSTAT`.
- Produit :
  - `interface VisiteRelais { id: string; le: Date; constat: ConstatVisite; texte: string | null; relais: string; note: boolean }` ;
  - `visitesDe(db, patientId): Promise<VisiteRelais[]>` : les 10 dernières, les plus récentes d'abord ;
  - `Dossier.visites: VisiteRelais[]`.

- [ ] **Étape 1 : écrire le test qui échoue**

Dans `tests/server/requetes/soignant.test.ts`, ajouter :

```ts
  it("montre les visites du relais, avec la note vocale à écouter", async () => {
    const d = await dossierPatient(db, etablissementId, await idPatient(db, "Rachida"), aujourdhui);
    expect(d?.visites).toEqual([expect.objectContaining({ constat: "tout_va_bien", relais: "Koffi Agbessi", note: false, texte: null })]);
  });
```

(Utiliser les variables du fichier : base semée, identifiant du centre de Firmin, `aujourdhui`.)

Run : `pnpm vitest run tests/server/requetes/soignant.test.ts`
Expected : FAIL (`visites` indéfini).

- [ ] **Étape 2 : écrire la requête**

Dans `src/server/requetes/soignant.ts` : importer `desc` de `drizzle-orm`, `fichiers` du schéma et `ConstatVisite` de `@/domain/evenements`, puis ajouter :

```ts
export interface VisiteRelais {
  id: string;
  le: Date;
  constat: ConstatVisite;
  texte: string | null;
  relais: string;
  /** Une note vocale est arrivée : elle s'écoute par /api/fichiers/[id]. */
  note: boolean;
}

/** Les visites à domicile du relais, les plus récentes d'abord. */
export async function visitesDe(db: Db, patientId: string): Promise<VisiteRelais[]> {
  const lignes = await db
    .select({ id: evenements.id, le: evenements.survenuLe, donnees: evenements.donnees, relais: comptes.nomAffiche, note: fichiers.evenementId })
    .from(evenements)
    .leftJoin(comptes, eq(evenements.auteurId, comptes.id))
    .leftJoin(fichiers, eq(fichiers.evenementId, evenements.id))
    .where(and(eq(evenements.patientId, patientId), eq(evenements.type, "visite_domicile")))
    .orderBy(desc(evenements.survenuLe))
    .limit(10);
  return lignes.map((l) => ({
    id: l.id,
    le: l.le,
    constat: l.donnees.constat as ConstatVisite,
    texte: typeof l.donnees.texte === "string" ? l.donnees.texte : null,
    relais: l.relais ?? "Relais",
    note: l.note !== null,
  }));
}
```

Ajouter `visites: VisiteRelais[]` à `Dossier`, `visitesDe(db, p.id)` au `Promise.all` de `dossierPatient`, et `visites` à l'objet renvoyé. Si `comptes`/`evenements` ne sont pas encore importés dans ce fichier, les ajouter à l'import du schéma.

- [ ] **Étape 3 : afficher les visites**

Dans `src/app/soignant/patients/[id]/page.tsx`, après `<Releves … />`, ajouter `<Visites visites={dossier.visites} />` et le composant :

```tsx
function Visites({ visites }: { visites: VisiteRelais[] }) {
  if (visites.length === 0) return null;
  return (
    <section aria-labelledby="titre-visites" className="flex flex-col gap-3 rounded-carte bg-white p-5">
      <h2 id="titre-visites" className="text-lg font-bold">
        Visites du relais
      </h2>
      <ul className="flex flex-col gap-3">
        {visites.map((v) => (
          <li key={v.id} className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-lavande-2 text-marque">
              <Icone nom="hi-community-healthworker" className="size-7" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-bold">
                {LIBELLES_CONSTAT[v.constat]}
                <span className="font-normal text-gris">
                  {" "}
                  · {dateCourte(v.le)}, {heureMinute(v.le)} · {v.relais}
                </span>
              </p>
              {v.texte && <p className="text-sm">« {v.texte} »</p>}
              {v.note && <BoutonEcouter variante="pastille" libelle={`Écouter la visite du ${dateCourte(v.le)}`} source={`/api/fichiers/${v.id}`} className="mt-1" />}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

Imports à ajouter : `LIBELLES_CONSTAT` (`@/domain/evenements`), `VisiteRelais` (`@/server/requetes/soignant`), `BoutonEcouter` (`@/ui/BoutonEcouter`). Vérifier la signature de `dateCourte` dans `src/domain/temps.ts` : si elle attend une `DateISO`, lui passer `versDateISO(v.le)`.

- [ ] **Étape 4 : relancer les tests, vérifier les types et le style**

Run : `pnpm vitest run tests/server/requetes/soignant.test.ts && pnpm typecheck && pnpm lint`
Expected : PASS, aucune erreur.

- [ ] **Étape 5 : vérifier dans le navigateur**

Après la tâche 13 (visite d'Afiavi avec note), Adjoa ouvre le dossier d'Afiavi (1280 px). La section « Visites du relais » montre « À orienter vers le centre », la tension 150/90 dans les relevés, et le bouton d'écoute. `GET /api/fichiers/<id>` répond 200 en `audio/…` pour Adjoa, et 404 pour Codjo.

- [ ] **Étape 6 : commit**

```bash
git add src/server/requetes/soignant.ts "src/app/soignant/patients/[id]/page.tsx" tests/server/requetes/soignant.test.ts
git commit -m "feat(soignant): les visites du relais et leur note vocale dans le dossier"
```

---

### Tâche 15 : README, vérification complète et mise en production

**Fichiers :**
- Modifier : `README.md`, `docs/superpowers/plans/2026-09-25-plan-4-relais-hors-ligne.md` (cases cochées)

- [ ] **Étape 1 : README**

Ajouter après « Poste soignant et pharmacie » :

```markdown
## Relais hors ligne

- **Ma tournée** : Koffi prépare sa tournée avec du réseau ; ses foyers restent sur le téléphone. Les foyers urgents passent en premier : signe de danger en attente, tension très élevée. On voit aussi, pour chaque personne, pourquoi passer : étape manquée, ordonnance à retirer, vaccin de la semaine.
- **Visite** : tout va bien, à orienter ou absent ; une note vocale (« Maintenir pour raconter la visite ») ; la tension (« 14 sur 9 » se lit 140/90) ; un signe de danger, qui crée l'alerte du centre dès que le réseau le permet.
- **Inscrire une personne** : nouveau-né, femme enceinte, tension, diabète, personne âgée. Le carnet et ses rendez-vous sont créés au retour du réseau ; on peut visiter la personne tout de suite.
- **File d'envoi** : tout part seul quand le réseau revient, sans doublon. Ce que le centre refuse reste dans « À corriger », avec la raison. La déconnexion attend que tout soit parti, puis efface le téléphone.
- **Chez le soignant** : les visites du relais et leurs notes vocales dans le dossier.
- **Sans réseau pour tous** : l'application s'installe sur le téléphone ; les pages déjà ouvertes restent lisibles.
```

- [ ] **Étape 2 : suite complète**

Run : `pnpm test && pnpm typecheck && pnpm lint`
Expected : tout passe (si un fichier PGlite échoue par manque de mémoire alors que le serveur et Chrome tournent, le relancer seul).

- [ ] **Étape 3 : vérification en production locale**

`pnpm build`, puis `pnpm start` sur la base locale : si `next start` refuse la sortie `standalone`, copier `.next/static` et `public` dans `.next/standalone`, puis lancer `node .next/standalone/server.js`.

Scénario complet avec service worker :
1. Koffi prépare sa tournée et le réseau est coupé.
2. Il **recharge `/relais`** : la page revient depuis le service worker et la tournée depuis IndexedDB.
3. Il note la visite et l'inscription.
4. Au retour du réseau, tout part.
5. Il se déconnecte : IndexedDB et `mc-pages` sont vides.

Expected : chaque étape correspond, aucune erreur dans la console.

- [ ] **Étape 4 : envoyer et déployer**

```bash
git add README.md docs/superpowers/plans/2026-09-25-plan-4-relais-hors-ligne.md
git commit -m "docs: le relais hors ligne dans le README"
git push origin main
```

Suivre le déploiement Coolify (`scratchpad/suivre.mjs`). La migration 0002 s'applique au démarrage. Réinitialiser la démo par `POST /api/demo/reinitialiser`, puis relancer le scénario de l'étape 3 sur https://moncarnet.kheios.com (`SITE=…`). Réinitialiser la démo à la fin.

Expected : même résultat qu'en local, et `/manifest.webmanifest` et `/sw.js` répondent 200.
