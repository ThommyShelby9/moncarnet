# Plan 3 : poste soignant et pharmacie — plan d'implémentation

> **Pour les agents :** sous-skill requis : superpowers:subagent-driven-development (recommandé) ou superpowers:executing-plans, pour exécuter ce plan tâche par tâche. Les étapes utilisent des cases à cocher (`- [ ]`) pour le suivi.

**Objectif :** livrer le poste soignant et la pharmacie.

- **Poste « Aujourd'hui »** : les alertes en haut avec leur compte à rebours et « Je la prends en charge », les consultations du jour par plage avec le risque de chacun, et les patients à surveiller.
- **Recherche d'un patient** par nom, téléphone ou code du carnet.
- **Dossier du patient** : risque et motifs, étapes des programmes, relevés, ordonnances.
- **Saisie d'une consultation** : le risque est recalculé (180/110 donne « Élevé »).
- **Ordonnance** : posologie structurée et code de retrait.
- **Pharmacie** : code, posologie dessinée, « Délivrance confirmée ». Le tampon apparaît côté soignant et les prises arrivent dans le carnet du patient.

**Architecture :** mêmes principes qu'au plan 2.
- **Domaine pur** : ordonnances, recherche, statut des alertes, lecture du formulaire de consultation.
- **Actions métier** (`src/server/soignant/`, `src/server/pharmacie/`) : chacune vérifie le droit, ici « patient rattaché au centre du soignant », et renvoie un `Resultat`.
- **Lectures** (`src/server/requetes/`).
- **Pages** en Server Components, avec formulaires reliés à des Server Actions.
- **Composants client** : le compte à rebours, l'actualisation de la page toutes les 20 secondes (une alerte apparaît sans recharger) et les deux formulaires qui affichent leurs erreurs.
- Le poste soignant est pensé pour un ordinateur ou une tablette : menu latéral, grille. Il reste utilisable sur téléphone.

**Stack :** celle des plans 1 et 2. Aucune nouvelle dépendance.

**Spec :** [`docs/superpowers/specs/2026-09-25-esante-benin-design.md`](../specs/2026-09-25-esante-benin-design.md), §4.5, §4.6, §4.7 (côté soignant), §5 (règles de risque), §7, §8, §12 (droits). Maquette du poste : [`docs/design/maquettes-validees.html`](../../design/maquettes-validees.html), section « Au centre de santé ».

## Contraintes globales

- Toutes les contraintes des plans 1 et 2 s'appliquent : TypeScript `strict`, tests dans `tests/` écrits avant le code, français simple, une seule charte (rouge réservé à l'urgence et au risque élevé), pictogramme + mot, nom de la plateforme jamais en dur, « aujourd'hui » à l'heure du Bénin.
- **Lire `node_modules/next/dist/docs/`** avant d'utiliser une API Next. Pour ce plan : `03-api-reference/03-file-conventions/dynamic-routes.md` (`params` est une Promise) et `02-guides/forms.md` (`useActionState`).
- **Droits (spec §12)** :
  - un soignant ne voit et ne modifie que les patients rattachés à son établissement ;
  - la pharmacie retrouve une ordonnance par son code et ne voit jamais le dossier : seulement le prénom, le nom, l'année de naissance, le prescripteur et les lignes.
- Chaque action métier renvoie `{ ok: true, donnees } | { ok: false, erreur }` ; les pages traduisent l'erreur en phrase simple.
- Valeurs de risque **indicatives** (spec §5), déjà codées dans `src/domain/risque.ts` : on les applique, on ne les change pas.
- Exécution **par moi-même, sans agents**, relecture finale comprise (mémoire `feedback-pas-d-agents`). Commits en français, poussés sur `main` ; Coolify redéploie seul à chaque envoi.

## Points de vigilance à l'usage

1. **Un soignant ouvre, par l'adresse, le dossier d'un patient d'un autre centre** : page introuvable ; toute action (consultation, ordonnance) est refusée (tâches 6 et 8).
2. **Deux soignants touchent « Je la prends en charge » en même temps** : un seul prend l'alerte, l'autre lit « Un collègue a déjà pris cette alerte en charge » (tâche 6).
3. **« Délivrance confirmée » touché deux fois, ou le même code dans deux pharmacies** : une seule délivrance (tâche 7).
4. **Tension saisie à moitié, ou glycémie avec une virgule (« 1,4 »)** : message clair pour la première, valeur comprise pour la seconde (tâche 3).
5. **Code de retrait tapé en minuscules, avec un espace ou un tiret** : l'ordonnance est retrouvée (tâche 1).

## Hors de ce plan (prévu ailleurs)

- Salle d'attente, place libérée proposée à la liste d'attente, écran « Rendez-vous et places » : plan 6.
- Explication audio envoyée au patient après la délivrance, message au patient après une consultation : plan 5 (canaux).
- Tâche planifiée `/api/cron/alertes` et remontée d'une alerte au relais : plans 4 et 5. Ici, une alerte dont le délai est dépassé s'affiche « en retard » chez tous les soignants du centre.
- QR code du carnet : plan 6 si le temps le permet ; ici on retrouve un patient par le code du carnet tapé au clavier (affiché dans le carnet du patient).
- Limitation du nombre d'essais de codes en pharmacie : à traiter avec l'audit du plan 6.

---

## Structure des fichiers

```
src/domain/
  ordonnances.ts          code de retrait, lecture des lignes du formulaire, quantité, texte de la posologie
  recherche.ts            analyserRecherche, correspondAuNom, sansAccents
  alertes.ts              + statutAlerte, minutesRestantes
  temps.ts                + heureMinute (« 9 h 41 »)
  consultation.ts         lireSaisieConsultation (formulaire du soignant)

src/server/
  droits.ts               + patientDuCentre
  demo/semer.ts, demo/donnees.ts   consultations du jour, ordonnance à délivrer (code M4R2TN)
  requetes/risques.ts     mesuresDes, risquesDes
  requetes/ordonnances.ts ordonnancesDe (avec la délivrance)
  requetes/soignant.ts    nomEtablissement, alertesOuvertes, consultationsDuJour, patientsASurveiller,
                          rechercherPatients, dossierPatient
  requetes/carnets.ts     + codeCourt dans Carnet
  soignant/consultation.ts, soignant/ordonnance.ts, soignant/alertes.ts
  pharmacie/delivrance.ts ordonnanceParCode, delivrer

src/ui/
  CompteARebours.tsx (client), Actualisation.tsx (client), MenuLateral.tsx (client), Posologie.tsx, CodeRetrait.tsx

src/app/soignant/
  layout.tsx, contexte.ts, actions.ts, page.tsx (Aujourd'hui), CarteAlerte.tsx
  patients/page.tsx (recherche), patients/[id]/page.tsx (dossier)
  patients/[id]/consultation/page.tsx + FormulaireConsultation.tsx
  patients/[id]/ordonnance/page.tsx + FormulaireOrdonnance.tsx
src/app/pharmacie/page.tsx, actions.ts
src/app/(patient)/(onglets)/carnet/page.tsx      + code du carnet, ordonnances à retirer

tests/domain/{ordonnances,recherche,alertes,consultation}.test.ts, tests/domain/temps.test.ts
tests/server/requetes/{risques,soignant}.test.ts, tests/server/soignant.test.ts, tests/server/pharmacie.test.ts
tests/server/demo/semer.test.ts
tests/ui/{CompteARebours,Actualisation,MenuLateral,Posologie}.test.tsx
```

---

### Tâche 1 : ordonnances (code de retrait, lignes, posologie)

**Fichiers :**
- Créer : `src/domain/ordonnances.ts`
- Tester : `tests/domain/ordonnances.test.ts`

**Interfaces :**
- Consomme : `LigneTraitement` (`src/domain/traitements.ts`), `MOMENTS_PRISE`, `LIBELLE_MOMENT_POSOLOGIE` (`src/domain/temps.ts`).
- Produit :
  - `ALPHABET_CODE`, `genererCodeRetrait(aleatoire?: () => number): string` ;
  - `normaliserCode(saisie): string | null` ;
  - `MAX_LIGNES = 4`, `lireLignes(champs: Record<string, unknown>): { ok: true; lignes: LigneTraitement[] } | { ok: false; message: string }` (champs `lignes.<i>.medicament|matin|midi|soir|dureeJours|indication|conseil`) ;
  - `quantiteTotale(ligne): number` ;
  - `texteDePosologie(ligne): string`.

- [ ] **Étape 1 : écrire les tests qui échouent**

Créer `tests/domain/ordonnances.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { genererCodeRetrait, lireLignes, normaliserCode, quantiteTotale, texteDePosologie } from "@/domain/ordonnances";

describe("code de retrait", () => {
  it("a 6 caractères, sans I, O, 0 ni 1", () => {
    for (let i = 0; i < 50; i++) expect(genererCodeRetrait()).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    expect(genererCodeRetrait(() => 0)).toBe("AAAAAA");
    expect(genererCodeRetrait(() => 0.999)).toBe("999999");
  });

  it("accepte une saisie en minuscules, avec un espace ou un tiret", () => {
    expect(normaliserCode(" k7p 4qx ")).toBe("K7P4QX");
    expect(normaliserCode("K7P-4QX")).toBe("K7P4QX");
  });

  it("refuse un code impossible", () => {
    expect(normaliserCode("K7P4Q0")).toBeNull();
    expect(normaliserCode("K7P4Q")).toBeNull();
  });
});

describe("lireLignes", () => {
  const champs = {
    "lignes.0.medicament": "Amlodipine 5 mg",
    "lignes.0.matin": "0",
    "lignes.0.midi": "0",
    "lignes.0.soir": "1",
    "lignes.0.dureeJours": "30",
    "lignes.0.indication": "la tension",
    "lignes.0.conseil": "",
    "lignes.1.medicament": "",
  };

  it("lit les lignes remplies et ignore les lignes vides", () => {
    expect(lireLignes(champs)).toEqual({
      ok: true,
      lignes: [{ medicament: "Amlodipine 5 mg", matin: 0, midi: 0, soir: 1, dureeJours: 30, indication: "la tension", conseil: undefined }],
    });
  });

  it("demande au moins une prise", () => {
    expect(lireLignes({ ...champs, "lignes.0.soir": "0" })).toEqual({ ok: false, message: "Ligne 1 : indiquez au moins une prise (matin, midi ou soir)." });
  });

  it("refuse une durée absente et une ordonnance vide", () => {
    expect(lireLignes({ ...champs, "lignes.0.dureeJours": "" })).toMatchObject({ ok: false });
    expect(lireLignes({ "lignes.0.medicament": "" })).toEqual({ ok: false, message: "Ajoutez au moins un médicament." });
  });
});

describe("posologie", () => {
  const ligne = { medicament: "Paracétamol 500 mg", matin: 1, midi: 1, soir: 1, dureeJours: 5, indication: "la fièvre", conseil: "après le repas" };

  it("compte les comprimés à donner", () => {
    expect(quantiteTotale(ligne)).toBe(15);
  });

  it("se dit simplement, pour l'écoute", () => {
    expect(texteDePosologie(ligne)).toBe(
      "Paracétamol 500 mg, pour la fièvre. Le matin : 1 comprimé. À midi : 1 comprimé. Le soir : 1 comprimé. Pendant 5 jours, après le repas.",
    );
  });
});
```

- [ ] **Étape 2 : lancer les tests et les voir échouer**

Run : `pnpm vitest run tests/domain/ordonnances.test.ts`
Expected : FAIL (`Cannot find package '@/domain/ordonnances'`).

- [ ] **Étape 3 : écrire le code**

Créer `src/domain/ordonnances.ts` :

```ts
import { z } from "zod";
import { LIBELLE_MOMENT_POSOLOGIE, MOMENTS_PRISE } from "./temps";
import type { LigneTraitement } from "./traitements";

/** Sans I, O, 0 ni 1 : faciles à confondre à l'oral comme à l'écrit. */
export const ALPHABET_CODE = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const FORMAT_CODE = /^[A-HJ-NP-Z2-9]{6}$/;

const aleatoireSur = () => crypto.getRandomValues(new Uint32Array(1))[0]! / 2 ** 32;

/** Code de retrait à 6 caractères, à donner au patient pour la pharmacie. */
export function genererCodeRetrait(aleatoire: () => number = aleatoireSur): string {
  return Array.from({ length: 6 }, () => ALPHABET_CODE[Math.floor(aleatoire() * ALPHABET_CODE.length)]).join("");
}

/** « k7p 4qx » → « K7P4QX » ; null si ce ne peut pas être un code. */
export function normaliserCode(saisie: string): string | null {
  const code = saisie.toUpperCase().replace(/[\s-]/g, "");
  return FORMAT_CODE.test(code) ? code : null;
}

const SANS_PRISE = "indiquez au moins une prise (matin, midi ou soir).";
const prises = z.coerce.number().int().min(0).max(6);
const texteFacultatif = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => v || undefined);

const ligneSchema = z
  .object({
    medicament: z.string().trim().min(2).max(80),
    matin: prises,
    midi: prises,
    soir: prises,
    dureeJours: z.coerce.number().int().min(1).max(180),
    indication: texteFacultatif(60),
    conseil: texteFacultatif(80),
  })
  .refine((l) => l.matin + l.midi + l.soir > 0, { message: SANS_PRISE });

export const MAX_LIGNES = 4;

/** Lit les lignes d'un formulaire (« lignes.0.medicament »…) ; une ligne sans médicament est ignorée. */
export function lireLignes(champs: Record<string, unknown>): { ok: true; lignes: LigneTraitement[] } | { ok: false; message: string } {
  const lignes: LigneTraitement[] = [];
  for (let i = 0; i < MAX_LIGNES; i++) {
    const champ = (nom: string) => champs[`lignes.${i}.${nom}`];
    const medicament = String(champ("medicament") ?? "").trim();
    if (!medicament) continue;
    const lecture = ligneSchema.safeParse({
      medicament,
      matin: champ("matin") ?? 0,
      midi: champ("midi") ?? 0,
      soir: champ("soir") ?? 0,
      dureeJours: champ("dureeJours"),
      indication: champ("indication") ?? "",
      conseil: champ("conseil") ?? "",
    });
    if (!lecture.success) {
      const sansPrise = lecture.error.issues.some((p) => p.message === SANS_PRISE);
      return { ok: false, message: `Ligne ${i + 1} : ${sansPrise ? SANS_PRISE : "vérifiez les comprimés (0 à 6 par moment) et la durée (1 à 180 jours)."}` };
    }
    lignes.push(lecture.data);
  }
  return lignes.length ? { ok: true, lignes } : { ok: false, message: "Ajoutez au moins un médicament." };
}

export function quantiteTotale(ligne: LigneTraitement): number {
  return (ligne.matin + ligne.midi + ligne.soir) * ligne.dureeJours;
}

/** Posologie en phrases courtes : lue au patient à la pharmacie. */
export function texteDePosologie(ligne: LigneTraitement): string {
  const debut = ligne.indication ? `${ligne.medicament}, pour ${ligne.indication}.` : `${ligne.medicament}.`;
  const prisesDuJour = MOMENTS_PRISE.filter((m) => ligne[m] > 0).map(
    (m) => `${LIBELLE_MOMENT_POSOLOGIE[m]} : ${ligne[m]} comprimé${ligne[m] > 1 ? "s" : ""}.`,
  );
  const fin = `Pendant ${ligne.dureeJours} jour${ligne.dureeJours > 1 ? "s" : ""}${ligne.conseil ? `, ${ligne.conseil}` : ""}.`;
  return [debut, ...prisesDuJour, fin].join(" ");
}
```

- [ ] **Étape 4 : relancer les tests**

Run : `pnpm vitest run tests/domain/ordonnances.test.ts`
Expected : PASS (7 tests).

- [ ] **Étape 5 : commit**

```bash
git add src/domain/ordonnances.ts tests/domain/ordonnances.test.ts
git commit -m "feat(domaine): code de retrait, lignes d'ordonnance et posologie en phrases"
```

---

### Tâche 2 : recherche d'un patient, statut des alertes, heure affichée

**Fichiers :**
- Créer : `src/domain/recherche.ts`
- Modifier : `src/domain/alertes.ts`, `src/domain/temps.ts`
- Tester : `tests/domain/recherche.test.ts`, `tests/domain/alertes.test.ts`, `tests/domain/temps.test.ts`

**Interfaces :**
- Consomme : `normaliserTelephone` (`src/domain/telephone.ts`), `normaliserCode` (tâche 1).
- Produit :
  - `sansAccents(texte)`, `interface Recherche { telephone: string | null; code: string | null; mots: string[] }`, `analyserRecherche(saisie): Recherche`, `correspondAuNom({ prenom, nom }, mots): boolean` ;
  - `type StatutAlerte = "en_attente" | "en_retard" | "prise_en_charge" | "annulee"`, `statutAlerte(alerte, maintenant)`, `minutesRestantes(echeance, maintenant)` ;
  - `heureMinute(instant: Date): string` (« 9 h 41 », heure du Bénin).

- [ ] **Étape 1 : écrire les tests qui échouent**

Créer `tests/domain/recherche.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { analyserRecherche, correspondAuNom } from "@/domain/recherche";

describe("analyserRecherche", () => {
  it("reconnaît un numéro de téléphone", () => {
    expect(analyserRecherche("01 97 00 00 01").telephone).toBe("+2290197000001");
  });

  it("reconnaît un code de carnet", () => {
    expect(analyserRecherche("k7p4qx").code).toBe("K7P4QX");
  });

  it("découpe un nom en mots, sans accents ni majuscules", () => {
    expect(analyserRecherche("  Sèna  HOUNGBO ").mots).toEqual(["sena", "houngbo"]);
  });

  it("ne prend pas un prénom pour un numéro", () => {
    expect(analyserRecherche("Codjo").telephone).toBeNull();
  });
});

describe("correspondAuNom", () => {
  const sena = { prenom: "Sèna", nom: "Houngbo" };

  it("trouve sans accent, dans n'importe quel ordre, même avec un début de mot", () => {
    expect(correspondAuNom(sena, ["houngbo", "sena"])).toBe(true);
    expect(correspondAuNom(sena, ["sen"])).toBe(true);
  });

  it("ne trouve ni un autre nom, ni une recherche vide", () => {
    expect(correspondAuNom(sena, ["awa"])).toBe(false);
    expect(correspondAuNom(sena, [])).toBe(false);
  });
});
```

Créer `tests/domain/alertes.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { minutesRestantes, statutAlerte } from "@/domain/alertes";

const echeance = new Date("2026-09-25T19:29:00Z");
const alerte = { echeance, priseEnChargeLe: null, annuleeLe: null };

describe("statutAlerte", () => {
  it("est en attente dans le délai, en retard après", () => {
    expect(statutAlerte(alerte, new Date("2026-09-25T19:20:00Z"))).toBe("en_attente");
    expect(statutAlerte(alerte, new Date("2026-09-25T19:30:00Z"))).toBe("en_retard");
  });

  it("la prise en charge et l'annulation l'emportent sur le délai", () => {
    const tard = new Date("2026-09-25T20:00:00Z");
    expect(statutAlerte({ ...alerte, priseEnChargeLe: new Date("2026-09-25T19:40:00Z") }, tard)).toBe("prise_en_charge");
    expect(statutAlerte({ ...alerte, annuleeLe: new Date("2026-09-25T19:16:00Z") }, tard)).toBe("annulee");
  });
});

describe("minutesRestantes", () => {
  it("compte les minutes avant l'échéance, puis le retard en négatif", () => {
    expect(minutesRestantes(echeance, new Date("2026-09-25T19:14:00Z"))).toBe(15);
    expect(minutesRestantes(echeance, new Date("2026-09-25T19:28:30Z"))).toBe(1);
    expect(minutesRestantes(echeance, new Date("2026-09-25T19:32:00Z"))).toBe(-3);
  });
});
```

Ajouter dans `tests/domain/temps.test.ts` l'import de `heureMinute` et, dans le `describe("heure et jour au Bénin")` :

```ts
  it("écrit l'heure à la française, à l'heure du Bénin", () => {
    expect(heureMinute(new Date("2026-09-25T08:41:00Z"))).toBe("9 h 41");
    expect(heureMinute(new Date("2026-09-25T19:05:00Z"))).toBe("20 h 05");
  });
```

- [ ] **Étape 2 : lancer les tests et les voir échouer**

Run : `pnpm vitest run tests/domain/recherche.test.ts tests/domain/alertes.test.ts tests/domain/temps.test.ts`
Expected : FAIL (`@/domain/recherche` introuvable, `statutAlerte` et `heureMinute` non exportés).

- [ ] **Étape 3 : écrire le code**

Créer `src/domain/recherche.ts` :

```ts
import { normaliserCode } from "./ordonnances";
import { normaliserTelephone } from "./telephone";

export function sansAccents(texte: string): string {
  return texte.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
}

export interface Recherche {
  telephone: string | null;
  code: string | null;
  mots: string[];
}

/** Une seule case de recherche : un numéro, un code de carnet ou un nom (le code et le nom sont essayés tous les deux). */
export function analyserRecherche(saisie: string): Recherche {
  const texte = saisie.trim();
  return {
    telephone: /^[\d\s+().-]{8,}$/.test(texte) ? normaliserTelephone(texte) : null,
    code: normaliserCode(texte),
    mots: sansAccents(texte).split(/\s+/).filter(Boolean),
  };
}

export function correspondAuNom(personne: { prenom: string; nom: string }, mots: string[]): boolean {
  if (mots.length === 0) return false;
  const nomComplet = sansAccents(`${personne.prenom} ${personne.nom}`);
  return mots.every((mot) => nomComplet.includes(mot));
}
```

Ajouter à la fin de `src/domain/alertes.ts` :

```ts
export type StatutAlerte = "en_attente" | "en_retard" | "prise_en_charge" | "annulee";

export function statutAlerte(
  alerte: { echeance: Date; priseEnChargeLe: Date | null; annuleeLe: Date | null },
  maintenant: Date,
): StatutAlerte {
  if (alerte.annuleeLe) return "annulee";
  if (alerte.priseEnChargeLe) return "prise_en_charge";
  return maintenant.getTime() > alerte.echeance.getTime() ? "en_retard" : "en_attente";
}

/** Minutes entières avant l'échéance ; négatif quand le délai est dépassé. */
export function minutesRestantes(echeance: Date, maintenant: Date): number {
  return Math.ceil((echeance.getTime() - maintenant.getTime()) / 60_000);
}
```

Ajouter dans `src/domain/temps.ts`, après `debutDuJourAuBenin` :

```ts
/** « 9 h 41 », à l'heure du Bénin. */
export function heureMinute(instant: Date): string {
  const local = new Date(instant.getTime() + DECALAGE_BENIN_MS);
  return `${local.getUTCHours()} h ${String(local.getUTCMinutes()).padStart(2, "0")}`;
}
```

- [ ] **Étape 4 : relancer les tests**

Run : `pnpm vitest run tests/domain`
Expected : PASS.

- [ ] **Étape 5 : commit**

```bash
git add src/domain/recherche.ts src/domain/alertes.ts src/domain/temps.ts tests/domain
git commit -m "feat(domaine): recherche d'un patient, statut des alertes et heure affichée"
```

---

### Tâche 3 : lecture du formulaire de consultation

**Fichiers :**
- Créer : `src/domain/consultation.ts`
- Tester : `tests/domain/consultation.test.ts`

**Interfaces :**
- Consomme : `MOTIFS_RDV`, `MotifRdv` ; `mesuresSchema` (type seulement, `src/domain/evenements.ts`).
- Produit :
  - `interface SaisieConsultation { motif: MotifRdv; etape?: string; mesures: Mesures; notes?: string }` ;
  - `TENSION_INCOMPLETE` ;
  - `lireSaisieConsultation(champs: Record<string, unknown>): { ok: true; saisie: SaisieConsultation } | { ok: false; message: string }` (champs `motif`, `etape`, `tensionSys`, `tensionDia`, `glycemieGL`, `hemoglobineGDL`, `poidsKg`, `notes`).

- [ ] **Étape 1 : écrire les tests qui échouent**

Créer `tests/domain/consultation.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { lireSaisieConsultation } from "@/domain/consultation";

const vide = { motif: "tension", etape: "", tensionSys: "", tensionDia: "", glycemieGL: "", hemoglobineGDL: "", poidsKg: "", notes: "" };

describe("lireSaisieConsultation", () => {
  it("lit une tension et ignore les champs vides", () => {
    expect(lireSaisieConsultation({ ...vide, tensionSys: "180", tensionDia: "110" })).toEqual({
      ok: true,
      saisie: { motif: "tension", mesures: { tensionSys: 180, tensionDia: 110 } },
    });
  });

  it("comprend la virgule décimale", () => {
    expect(lireSaisieConsultation({ ...vide, motif: "diabete", glycemieGL: "1,4" })).toMatchObject({ ok: true, saisie: { mesures: { glycemieGL: 1.4 } } });
  });

  it("demande les deux chiffres de la tension", () => {
    expect(lireSaisieConsultation({ ...vide, tensionSys: "150" })).toEqual({
      ok: false,
      message: "Indiquez les deux chiffres de la tension, par exemple 140 sur 90.",
    });
  });

  it("dit quel champ vérifier", () => {
    expect(lireSaisieConsultation({ ...vide, tensionSys: "900", tensionDia: "90" })).toEqual({ ok: false, message: "Vérifiez : la tension (chiffre du haut)." });
    expect(lireSaisieConsultation({ ...vide, motif: "xx" })).toEqual({ ok: false, message: "Vérifiez : le motif." });
  });

  it("garde l'étape et les notes", () => {
    expect(lireSaisieConsultation({ ...vide, motif: "grossesse", etape: "cpn3", notes: "Le bébé bouge bien" })).toMatchObject({
      ok: true,
      saisie: { etape: "cpn3", notes: "Le bébé bouge bien", mesures: {} },
    });
  });
});
```

- [ ] **Étape 2 : lancer les tests et les voir échouer**

Run : `pnpm vitest run tests/domain/consultation.test.ts`
Expected : FAIL (`Cannot find package '@/domain/consultation'`).

- [ ] **Étape 3 : écrire le code**

Créer `src/domain/consultation.ts` :

```ts
import { z } from "zod";
import type { mesuresSchema } from "./evenements";
import { MOTIFS_RDV, type MotifRdv } from "./programmes/types";

type Mesures = z.infer<typeof mesuresSchema>;

export interface SaisieConsultation {
  motif: MotifRdv;
  etape?: string;
  mesures: Mesures;
  notes?: string;
}

/** Champ numérique facultatif d'un formulaire : vide = absent, virgule décimale acceptée. */
const nombre = (min: number, max: number, entier = false) =>
  z.preprocess(
    (v) => (v === undefined || v === null || String(v).trim() === "" ? undefined : Number(String(v).trim().replace(",", "."))),
    (entier ? z.number().int() : z.number()).min(min).max(max).optional(),
  );

const schema = z.object({
  motif: z.enum(MOTIFS_RDV),
  etape: z.string().trim().max(40).optional(),
  tensionSys: nombre(50, 300, true),
  tensionDia: nombre(30, 200, true),
  glycemieGL: nombre(0.2, 6),
  hemoglobineGDL: nombre(3, 25),
  poidsKg: nombre(0.5, 300),
  notes: z.string().trim().max(2000).optional(),
});

const LIBELLES_CHAMPS: Record<string, string> = {
  motif: "le motif",
  etape: "l'étape",
  tensionSys: "la tension (chiffre du haut)",
  tensionDia: "la tension (chiffre du bas)",
  glycemieGL: "la glycémie",
  hemoglobineGDL: "l'hémoglobine",
  poidsKg: "le poids",
  notes: "les notes",
};

export const TENSION_INCOMPLETE = "Indiquez les deux chiffres de la tension, par exemple 140 sur 90.";

export function lireSaisieConsultation(champs: Record<string, unknown>): { ok: true; saisie: SaisieConsultation } | { ok: false; message: string } {
  const lecture = schema.safeParse(champs);
  if (!lecture.success) {
    const aVerifier = [...new Set(lecture.error.issues.map((p) => LIBELLES_CHAMPS[String(p.path[0])] ?? String(p.path[0])))];
    return { ok: false, message: `Vérifiez : ${aVerifier.join(", ")}.` };
  }
  const { motif, etape, notes, ...valeurs } = lecture.data;
  if ((valeurs.tensionSys === undefined) !== (valeurs.tensionDia === undefined)) return { ok: false, message: TENSION_INCOMPLETE };
  const mesures = Object.fromEntries(Object.entries(valeurs).filter(([, v]) => v !== undefined)) as Mesures;
  return { ok: true, saisie: { motif, etape: etape || undefined, mesures, notes: notes || undefined } };
}
```

- [ ] **Étape 4 : relancer les tests**

Run : `pnpm vitest run tests/domain/consultation.test.ts`
Expected : PASS (5 tests).

- [ ] **Étape 5 : commit**

```bash
git add src/domain/consultation.ts tests/domain/consultation.test.ts
git commit -m "feat(domaine): lecture du formulaire de consultation du soignant"
```

---

### Tâche 4 : démo pour le poste soignant et la pharmacie

**Fichiers :**
- Modifier : `src/server/demo/semer.ts`, `src/server/demo/donnees.ts`
- Tester : `tests/server/demo/semer.test.ts`

**Interfaces :**
- Produit, dans la démo semée :
  - les plages **du jour** ont des places prises par la population, et une partie de ces personnes est déjà vue (consultation enregistrée aujourd'hui par Firmin ou, pour la grossesse, par Adjoa) ;
  - une ordonnance **à délivrer** pour Mariam : code `M4R2TN`, Paracétamol 500 mg matin, midi et soir pendant 5 jours ;
  - la description du compte de la pharmacie dit ce code (page `/demo`).

- [ ] **Étape 1 : écrire le test qui échoue**

Dans `tests/server/demo/semer.test.ts`, ajouter `ordonnances` à l'import du schéma, puis ajouter dans le `describe` :

```ts
  it("prépare le poste soignant et la pharmacie : consultations du jour et ordonnance à délivrer", async () => {
    await semerDemo(db, { aujourdhui });
    const plagesDuJour = await db.select().from(creneaux).where(eq(creneaux.date, aujourdhui));
    const prises = await db.select().from(rendezVous).where(and(eq(rendezVous.datePrevue, aujourdhui), isNotNull(rendezVous.creneauId)));
    expect(plagesDuJour.length).toBeGreaterThan(0);
    expect(prises.length).toBeGreaterThan(plagesDuJour.length);
    const vusAujourdhui = (await db.select().from(evenements).where(eq(evenements.type, "consultation"))).filter(
      (e) => e.survenuLe.toISOString().slice(0, 10) === aujourdhui,
    );
    expect(vusAujourdhui.length).toBeGreaterThan(0);
    const [aDelivrer] = await db.select().from(ordonnances).where(eq(ordonnances.codeRetrait, "M4R2TN"));
    expect(aDelivrer?.lignes).toEqual([expect.objectContaining({ medicament: "Paracétamol 500 mg", dureeJours: 5 })]);
  });
```

- [ ] **Étape 2 : lancer le test et le voir échouer**

Run : `pnpm vitest run tests/server/demo/semer.test.ts`
Expected : FAIL (aucune place prise aujourd'hui).

- [ ] **Étape 3 : modifier la démo**

Dans `src/server/demo/donnees.ts`, remplacer la description de la pharmacie par :

```ts
description: "Pharmacie de Bohicon · ordonnance à délivrer : M4R2TN"
```

Dans `src/server/demo/semer.ts` :

1. Import : `import { asc, eq, sql } from "drizzle-orm";`
2. Après `codesUtilises.add("K7P4QX");` : `codesUtilises.add("M4R2TN");`
3. Juste après la boucle `for (const o of ordonnancesDelivrees) { … }`, ajouter :

```ts
  // --- Ordonnance à délivrer : pour la démonstration de la pharmacie ---
  await db.insert(t.ordonnances).values({
    patientId: idsPersonnages.mariam!,
    prescripteurId: firmin.id,
    codeRetrait: "M4R2TN",
    lignes: [{ medicament: "Paracétamol 500 mg", matin: 1, midi: 1, soir: 1, dureeJours: 5, indication: "la fièvre", conseil: "après le repas" }],
  });
```

4. Juste après la boucle des réservations de Codjo et Awa (`throw new Error(\`Réservation de démo impossible…`), ajouter :

```ts
  // --- Consultations d'aujourd'hui : places prises, et une partie des personnes déjà vues ---
  const plagesDuJour = await db.select().from(t.creneaux).where(eq(t.creneaux.date, aujourdhui)).orderBy(asc(t.creneaux.moment));
  const venues = plagesDuJour.flatMap((creneau) =>
    Array.from({ length: h.entier(Math.ceil(creneau.capacite / 2), creneau.capacite - 1) }, () => ({
      patientId: h.parmi(idsPopulation),
      motif: creneau.motif,
      datePrevue: aujourdhui,
      moment: creneau.moment,
      creneauId: creneau.id,
      etablissementId: cs!.id,
      source: "patient" as const,
      reserveLe: depuisDateISO(ajouterJours(aujourdhui, -h.entier(1, 10))),
    })),
  );
  if (venues.length) await db.insert(t.rendezVous).values(venues);
  nbRendezVous += venues.length;
  for (const [i, venue] of venues.entries()) {
    if (venue.moment !== "matin" || !h.chance(0.5)) continue;
    await db.insert(t.evenements).values({
      id: randomUUID(),
      patientId: venue.patientId,
      type: "consultation",
      auteurId: venue.motif === "grossesse" ? adjoa.id : firmin.id,
      survenuLe: new Date(depuisDateISO(aujourdhui).getTime() + (7 * 60 + i * 12) * 60_000),
      donnees: {
        motif: venue.motif,
        mesures: venue.motif === "tension" ? { tensionSys: h.entier(125, 175), tensionDia: h.entier(80, 105) } : {},
      },
    });
    nbEvenements++;
  }
```

- [ ] **Étape 4 : relancer les tests du serveur**

Run : `pnpm vitest run tests/server`
Expected : PASS (la démo relancée deux fois donne toujours le même bilan).

- [ ] **Étape 5 : commit**

```bash
git add src/server/demo tests/server/demo/semer.test.ts
git commit -m "feat(démo): consultations du jour et ordonnance à délivrer (M4R2TN)"
```

---

### Tâche 5 : risque de chaque patient

**Fichiers :**
- Créer : `src/server/requetes/risques.ts`
- Tester : `tests/server/requetes/risques.test.ts`

**Interfaces :**
- Consomme : `evaluerRisque`, `risqueGlobal`, `Mesure`, `ResultatRisque` (`src/domain/risque.ts`) ; `planifier` ; `compterManquees` ; `etapesFaites`, `cleEtape` ; tables `inscriptions`, `evenements`, `alertes`.
- Produit :
  - `type MesureDatee = Mesure & { source: "consultation" | "mesure" }` ; `mesuresDes(db, patientIds): Promise<Map<string, MesureDatee[]>>` (triées par date) ;
  - `interface PatientPourRisque { id: string; dateNaissance: DateISO; antecedents: { cesarienne?: boolean } }` ;
  - `interface RisquePatient { global: ResultatRisque; programmes: { code: CodeProgramme; resultat: ResultatRisque }[] }` ;
  - `risquesDes(db, patients, aujourdhui): Promise<Map<string, RisquePatient>>`.

- [ ] **Étape 1 : écrire les tests qui échouent**

Créer `tests/server/requetes/risques.test.ts` :

```ts
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/server/db/client";
import { evenements, patients } from "@/server/db/schema";
import { semerDemo } from "@/server/demo/semer";
import { signalerDanger } from "@/server/patient/signalement";
import { mesuresDes, risquesDes } from "@/server/requetes/risques";
import { creerDbDeTest } from "../../aides/base-de-test";
import { COMPTE, idCompte, idPatient } from "../../aides/demo";

const aujourdhui = "2026-09-25";
let db: Db;
let fermer: () => Promise<void>;

beforeAll(async () => {
  ({ db, fermer } = await creerDbDeTest());
  await semerDemo(db, { aujourdhui });
});
afterAll(async () => fermer());

async function patient(prenom: string) {
  const [p] = await db.select().from(patients).where(eq(patients.id, await idPatient(db, prenom)));
  return p!;
}

describe("mesuresDes", () => {
  it("réunit les tensions des consultations et des relevés, dans l'ordre des dates", async () => {
    const codjo = await patient("Codjo");
    const mesures = (await mesuresDes(db, [codjo.id])).get(codjo.id) ?? [];
    expect(mesures.length).toBeGreaterThanOrEqual(4);
    expect(mesures.map((m) => m.date)).toEqual([...mesures.map((m) => m.date)].sort());
    expect(mesures.at(-1)).toMatchObject({ tensionSys: 145, tensionDia: 92, source: "mesure" });
  });
});

describe("risquesDes", () => {
  it("met Codjo « à surveiller » : deux tensions de suite au-dessus de 140/90", async () => {
    const codjo = await patient("Codjo");
    const risque = (await risquesDes(db, [codjo], aujourdhui)).get(codjo.id);
    expect(risque?.global.niveau).toBe("surveillance");
    expect(risque?.global.motifs).toEqual(["Tension non contrôlée (148/94 puis 145/92)"]);
  });

  it("passe Codjo en risque élevé après une tension à 180/110", async () => {
    const codjo = await patient("Codjo");
    await db.insert(evenements).values({
      id: randomUUID(),
      patientId: codjo.id,
      type: "consultation",
      survenuLe: new Date("2026-09-25T09:00:00Z"),
      donnees: { motif: "tension", mesures: { tensionSys: 180, tensionDia: 110 } },
    });
    const risque = (await risquesDes(db, [codjo], aujourdhui)).get(codjo.id);
    expect(risque?.global).toEqual({ niveau: "eleve", motifs: ["Tension très élevée (180/110)"] });
  });

  it("passe Awa en risque élevé tant que son signe de danger n'est pas pris en charge", async () => {
    const awa = await patient("Awa");
    expect((await risquesDes(db, [awa], aujourdhui)).get(awa.id)?.global.niveau).toBe("normal");
    await signalerDanger(db, { compteId: await idCompte(db, COMPTE.awa), patientId: awa.id, evenementId: randomUUID(), signes: ["saignement"] });
    const risque = (await risquesDes(db, [awa], aujourdhui)).get(awa.id);
    expect(risque?.global).toMatchObject({ niveau: "eleve", motifs: ["Signe de danger non pris en charge"] });
    expect(risque?.programmes.map((p) => p.code)).toEqual(["grossesse"]);
  });
});
```

- [ ] **Étape 2 : lancer les tests et les voir échouer**

Run : `pnpm vitest run tests/server/requetes/risques.test.ts`
Expected : FAIL (`@/server/requetes/risques` introuvable).

- [ ] **Étape 3 : écrire le code**

Créer `src/server/requetes/risques.ts` :

```ts
import { and, eq, inArray, isNull } from "drizzle-orm";
import { planifier } from "@/domain/calendrier";
import { aujourdhuiAuBenin, type DateISO } from "@/domain/dates";
import { PROGRAMMES, type CodeProgramme } from "@/domain/programmes";
import { evaluerRisque, risqueGlobal, type Mesure, type ResultatRisque } from "@/domain/risque";
import { compterManquees } from "@/domain/statuts";
import type { Db } from "../db/client";
import { alertes, evenements, inscriptions } from "../db/schema";
import { cleEtape, etapesFaites } from "./etapes-faites";

export type MesureDatee = Mesure & { source: "consultation" | "mesure" };

const CHAMPS = ["tensionSys", "tensionDia", "glycemieGL", "hemoglobineGDL", "poidsKg"] as const;

/** Relevés de chaque personne : mesures prises en consultation et relevés faits à domicile ou par le relais. */
export async function mesuresDes(db: Db, patientIds: string[]): Promise<Map<string, MesureDatee[]>> {
  const resultat = new Map<string, MesureDatee[]>();
  if (patientIds.length === 0) return resultat;
  const lignes = await db
    .select({ patientId: evenements.patientId, type: evenements.type, donnees: evenements.donnees, survenuLe: evenements.survenuLe })
    .from(evenements)
    .where(and(inArray(evenements.patientId, patientIds), inArray(evenements.type, ["consultation", "mesure"])));
  for (const l of lignes) {
    const brutes = (l.donnees.mesures ?? {}) as Record<string, unknown>;
    const mesure: MesureDatee = { date: aujourdhuiAuBenin(l.survenuLe), source: l.type === "mesure" ? "mesure" : "consultation" };
    for (const champ of CHAMPS) if (typeof brutes[champ] === "number") mesure[champ] = brutes[champ];
    if (!CHAMPS.some((champ) => mesure[champ] !== undefined)) continue;
    resultat.set(l.patientId, [...(resultat.get(l.patientId) ?? []), mesure]);
  }
  for (const liste of resultat.values()) liste.sort((a, b) => a.date.localeCompare(b.date));
  return resultat;
}

export interface PatientPourRisque {
  id: string;
  dateNaissance: DateISO;
  antecedents: { cesarienne?: boolean };
}

export interface RisquePatient {
  global: ResultatRisque;
  programmes: { code: CodeProgramme; resultat: ResultatRisque }[];
}

/** Niveau de risque de chaque personne, programme par programme, avec ses motifs (règles de la spec §5). */
export async function risquesDes(db: Db, lesPatients: PatientPourRisque[], aujourdhui: DateISO): Promise<Map<string, RisquePatient>> {
  const resultat = new Map<string, RisquePatient>();
  const ids = lesPatients.map((p) => p.id);
  if (ids.length === 0) return resultat;
  const [lesInscriptions, mesures, faites, ouvertes] = await Promise.all([
    db.select().from(inscriptions).where(and(inArray(inscriptions.patientId, ids), eq(inscriptions.active, true))),
    mesuresDes(db, ids),
    etapesFaites(db, ids),
    db
      .select({ patientId: alertes.patientId })
      .from(alertes)
      .where(and(inArray(alertes.patientId, ids), isNull(alertes.priseEnChargeLe), isNull(alertes.annuleeLe))),
  ]);
  for (const p of lesPatients) {
    const faitesDuPatient = faites.get(p.id);
    const programmes = lesInscriptions
      .filter((i) => i.patientId === p.id)
      .map((i) => {
        const etapes = planifier(PROGRAMMES[i.programme], i.dateReference, i.dateInscription);
        const codesFaits = new Set(etapes.filter((e) => faitesDuPatient?.has(cleEtape(e.motif, e.code))).map((e) => e.code));
        return {
          code: i.programme,
          resultat: evaluerRisque(i.programme, {
            aujourdhui,
            dateNaissance: p.dateNaissance,
            antecedents: p.antecedents,
            mesures: mesures.get(p.id) ?? [],
            etapesManquees: compterManquees(etapes, codesFaits, aujourdhui),
            signalementsOuverts: ouvertes.filter((a) => a.patientId === p.id).length,
          }),
        };
      });
    resultat.set(p.id, { global: risqueGlobal(programmes.map((x) => x.resultat)), programmes });
  }
  return resultat;
}
```

- [ ] **Étape 4 : relancer les tests**

Run : `pnpm vitest run tests/server/requetes/risques.test.ts`
Expected : PASS (4 tests).

- [ ] **Étape 5 : vérifier les types et committer**

```bash
pnpm typecheck
git add src/server/requetes/risques.ts tests/server/requetes/risques.test.ts
git commit -m "feat(soignant): risque de chaque patient, calculé à partir de ses relevés et de ses étapes"
```

---

### Tâche 6 : actions du soignant (consultation, ordonnance, prise en charge d'une alerte)

**Fichiers :**
- Modifier : `src/server/droits.ts`
- Créer : `src/server/soignant/consultation.ts`, `src/server/soignant/ordonnance.ts`, `src/server/soignant/alertes.ts`
- Tester : `tests/server/soignant.test.ts`

**Interfaces :**
- Consomme : `SaisieConsultation` (tâche 3) ; `genererCodeRetrait` (tâche 1) ; `evenementSchema` ; `planifier`, `PROGRAMMES` ; `estUuid` ; `Resultat`, `reussite`, `echec`.
- Produit :
  - `patientDuCentre(db, etablissementId: string | null, patientId): Promise<boolean>` (dans `droits.ts`) ;
  - `interface Soignant { id: string; etablissementId: string | null }` (dans `consultation.ts`) ;
  - `enregistrerConsultation(db, { auteur, patientId, saisie, maintenant? }): Promise<Resultat<{ evenementId: string }, "interdit" | "etape_inconnue">>`. Si l'étape est une étape de vaccination, l'action enregistre un événement `vaccination` (les vaccins de l'étape), sinon un événement `consultation` ;
  - `emettreOrdonnance(db, { auteur, patientId, lignes, maintenant?, genererCode? }): Promise<Resultat<{ ordonnanceId: string; codeRetrait: string }, "interdit" | "code_indisponible">>` ;
  - `prendreEnCharge(db, { auteur, alerteId, maintenant? }): Promise<Resultat<{ patientId: string }, "introuvable" | "annulee" | "deja_prise">>`.

- [ ] **Étape 1 : écrire les tests qui échouent**

Créer `tests/server/soignant.test.ts` :

```ts
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/server/db/client";
import { alertes, comptes, evenements, ordonnances } from "@/server/db/schema";
import { semerDemo } from "@/server/demo/semer";
import { annulerAlerte, signalerDanger } from "@/server/patient/signalement";
import { programmesDuCarnet } from "@/server/requetes/carnet";
import { prendreEnCharge } from "@/server/soignant/alertes";
import { enregistrerConsultation, type Soignant } from "@/server/soignant/consultation";
import { emettreOrdonnance } from "@/server/soignant/ordonnance";
import { creerDbDeTest } from "../aides/base-de-test";
import { COMPTE, idCompte, idPatient } from "../aides/demo";

let db: Db;
let fermer: () => Promise<void>;
let firmin: Soignant;
let adjoa: Soignant;
let autreCentre: string;

async function soignant(identifiant: string): Promise<Soignant> {
  const [c] = await db.select().from(comptes).where(eq(comptes.identifiant, identifiant));
  return { id: c!.id, etablissementId: c!.etablissementId };
}

beforeAll(async () => {
  ({ db, fermer } = await creerDbDeTest());
  await semerDemo(db, { aujourdhui: "2026-09-25" });
  firmin = await soignant("firmin.akpovi");
  adjoa = await soignant("adjoa.gbaguidi");
  autreCentre = (await soignant("pharmacie.sainte-rita")).etablissementId!;
});
afterAll(async () => fermer());

describe("enregistrerConsultation", () => {
  it("enregistre la consultation de Codjo et sa tension, au nom du soignant", async () => {
    const codjo = await idPatient(db, "Codjo");
    const r = await enregistrerConsultation(db, { auteur: firmin, patientId: codjo, saisie: { motif: "tension", mesures: { tensionSys: 180, tensionDia: 110 } } });
    expect(r.ok).toBe(true);
    const [e] = await db.select().from(evenements).where(eq(evenements.id, r.ok ? r.donnees.evenementId : randomUUID()));
    expect(e).toMatchObject({ type: "consultation", auteurId: firmin.id, donnees: { motif: "tension", mesures: { tensionSys: 180, tensionDia: 110 } } });
  });

  it("enregistre les vaccins des 9 mois de Sèna : l'étape est faite dans son carnet", async () => {
    const sena = await idPatient(db, "Sèna");
    const r = await enregistrerConsultation(db, { auteur: adjoa, patientId: sena, saisie: { motif: "vaccin", etape: "9mois", mesures: {} } });
    const [e] = await db.select().from(evenements).where(eq(evenements.id, r.ok ? r.donnees.evenementId : randomUUID()));
    expect(e).toMatchObject({ type: "vaccination", donnees: { etape: "9mois", vaccins: ["Rougeole-rubéole 1", "fièvre jaune"] } });
    const [vaccination] = await programmesDuCarnet(db, sena, "2026-09-25");
    expect(vaccination?.etapes.find((x) => x.code === "9mois")?.statut).toBe("faite");
  });

  it("refuse une étape qui ne va pas avec le motif", async () => {
    const r = await enregistrerConsultation(db, { auteur: firmin, patientId: await idPatient(db, "Codjo"), saisie: { motif: "tension", etape: "cpn3", mesures: {} } });
    expect(r).toEqual({ ok: false, erreur: "etape_inconnue" });
  });

  it("refuse le patient d'un autre centre", async () => {
    const r = await enregistrerConsultation(db, {
      auteur: { id: firmin.id, etablissementId: autreCentre },
      patientId: await idPatient(db, "Codjo"),
      saisie: { motif: "consultation", mesures: {} },
    });
    expect(r).toEqual({ ok: false, erreur: "interdit" });
  });
});

describe("emettreOrdonnance", () => {
  const lignes = [{ medicament: "Amlodipine 10 mg", matin: 0, midi: 0, soir: 1, dureeJours: 30, indication: "la tension" }];

  it("crée l'ordonnance avec un code de retrait", async () => {
    const r = await emettreOrdonnance(db, { auteur: firmin, patientId: await idPatient(db, "Codjo"), lignes });
    expect(r.ok && r.donnees.codeRetrait).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    const [o] = await db.select().from(ordonnances).where(eq(ordonnances.id, r.ok ? r.donnees.ordonnanceId : randomUUID()));
    expect(o).toMatchObject({ prescripteurId: firmin.id, lignes });
  });

  it("prend un autre code quand le premier est déjà utilisé", async () => {
    const codes = ["K7P4QX", "ZZZZZ2"];
    const r = await emettreOrdonnance(db, { auteur: firmin, patientId: await idPatient(db, "Codjo"), lignes, genererCode: () => codes.shift()! });
    expect(r).toMatchObject({ ok: true, donnees: { codeRetrait: "ZZZZZ2" } });
  });

  it("refuse le patient d'un autre centre", async () => {
    const r = await emettreOrdonnance(db, { auteur: { id: firmin.id, etablissementId: autreCentre }, patientId: await idPatient(db, "Codjo"), lignes });
    expect(r).toEqual({ ok: false, erreur: "interdit" });
  });
});

describe("prendreEnCharge", () => {
  async function signalement() {
    const s = await signalerDanger(db, { compteId: await idCompte(db, COMPTE.awa), patientId: await idPatient(db, "Awa"), evenementId: randomUUID(), signes: ["saignement"] });
    return s.ok ? s.donnees.alerteId : "";
  }

  it("donne l'alerte au premier soignant qui la prend, pas au second", async () => {
    const alerteId = await signalement();
    const [a, b] = await Promise.all([prendreEnCharge(db, { auteur: adjoa, alerteId }), prendreEnCharge(db, { auteur: firmin, alerteId })]);
    expect([a.ok, b.ok].sort()).toEqual([false, true]);
    expect([a, b].find((r) => !r.ok)).toEqual({ ok: false, erreur: "deja_prise" });
    const [alerte] = await db.select().from(alertes).where(eq(alertes.id, alerteId));
    expect(alerte?.priseEnChargeLe).not.toBeNull();
  });

  it("ne montre pas l'alerte d'un autre centre, et refuse une alerte annulée", async () => {
    const alerteId = await signalement();
    expect(await prendreEnCharge(db, { auteur: { id: firmin.id, etablissementId: autreCentre }, alerteId })).toEqual({ ok: false, erreur: "introuvable" });
    await annulerAlerte(db, { compteId: await idCompte(db, COMPTE.awa), alerteId });
    expect(await prendreEnCharge(db, { auteur: adjoa, alerteId })).toEqual({ ok: false, erreur: "annulee" });
  });
});
```

- [ ] **Étape 2 : lancer les tests et les voir échouer**

Run : `pnpm vitest run tests/server/soignant.test.ts`
Expected : FAIL (modules `@/server/soignant/*` introuvables).

- [ ] **Étape 3 : écrire le code**

Dans `src/server/droits.ts`, ajouter `patients` à l'import du schéma, puis à la fin :

```ts
/** Vrai si la personne est rattachée à cet établissement : un soignant ne voit que les patients de son centre (spec §12). */
export async function patientDuCentre(db: Db, etablissementId: string | null, patientId: string): Promise<boolean> {
  if (!etablissementId || !estUuid(patientId)) return false;
  const [ligne] = await db
    .select({ id: patients.id })
    .from(patients)
    .where(and(eq(patients.id, patientId), eq(patients.etablissementId, etablissementId)))
    .limit(1);
  return Boolean(ligne);
}
```

Créer `src/server/soignant/consultation.ts` :

```ts
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { planifier } from "@/domain/calendrier";
import type { SaisieConsultation } from "@/domain/consultation";
import { evenementSchema, type EvenementValide } from "@/domain/evenements";
import { PROGRAMMES } from "@/domain/programmes";
import type { Db } from "../db/client";
import { evenements, inscriptions } from "../db/schema";
import { patientDuCentre } from "../droits";
import { echec, reussite, type Resultat } from "../resultat";

export interface Soignant {
  id: string;
  etablissementId: string | null;
}

/** Consultation (ou vaccination) saisie par un soignant ; une étape de programme doit aller avec le motif. */
export async function enregistrerConsultation(
  db: Db,
  e: { auteur: Soignant; patientId: string; saisie: SaisieConsultation; maintenant?: Date },
): Promise<Resultat<{ evenementId: string }, "interdit" | "etape_inconnue">> {
  if (!(await patientDuCentre(db, e.auteur.etablissementId, e.patientId))) return echec("interdit");
  const { motif, etape: codeEtape, mesures, notes } = e.saisie;
  let evenement: EvenementValide;
  if (codeEtape) {
    const lesInscriptions = await db
      .select()
      .from(inscriptions)
      .where(and(eq(inscriptions.patientId, e.patientId), eq(inscriptions.active, true)));
    const etape = lesInscriptions
      .flatMap((i) => planifier(PROGRAMMES[i.programme], i.dateReference, i.dateInscription))
      .find((x) => x.code === codeEtape && x.motif === motif);
    if (!etape) return echec("etape_inconnue");
    evenement =
      etape.motif === "vaccin"
        ? evenementSchema.parse({ type: "vaccination", donnees: { etape: etape.code, vaccins: (etape.details ?? etape.libelle).split(", ") } })
        : evenementSchema.parse({ type: "consultation", donnees: { motif, etape: etape.code, mesures, notes } });
  } else {
    evenement = evenementSchema.parse({ type: "consultation", donnees: { motif, mesures, notes } });
  }
  const evenementId = randomUUID();
  await db.insert(evenements).values({
    id: evenementId,
    patientId: e.patientId,
    type: evenement.type,
    auteurId: e.auteur.id,
    survenuLe: e.maintenant ?? new Date(),
    donnees: evenement.donnees,
  });
  return reussite({ evenementId });
}
```

Créer `src/server/soignant/ordonnance.ts` :

```ts
import { genererCodeRetrait } from "@/domain/ordonnances";
import type { LigneTraitement } from "@/domain/traitements";
import type { Db } from "../db/client";
import { ordonnances } from "../db/schema";
import { patientDuCentre } from "../droits";
import { echec, reussite, type Resultat } from "../resultat";
import type { Soignant } from "./consultation";

/** Ordonnance à posologie structurée ; le code de retrait est unique (nouvel essai si le code tiré existe déjà). */
export async function emettreOrdonnance(
  db: Db,
  e: { auteur: Soignant; patientId: string; lignes: LigneTraitement[]; maintenant?: Date; genererCode?: () => string },
): Promise<Resultat<{ ordonnanceId: string; codeRetrait: string }, "interdit" | "code_indisponible">> {
  if (!(await patientDuCentre(db, e.auteur.etablissementId, e.patientId))) return echec("interdit");
  const generer = e.genererCode ?? (() => genererCodeRetrait());
  for (let essai = 0; essai < 5; essai++) {
    const codeRetrait = generer();
    const [cree] = await db
      .insert(ordonnances)
      .values({ patientId: e.patientId, prescripteurId: e.auteur.id, lignes: e.lignes, codeRetrait, emiseLe: e.maintenant ?? new Date() })
      .onConflictDoNothing({ target: ordonnances.codeRetrait })
      .returning({ id: ordonnances.id });
    if (cree) return reussite({ ordonnanceId: cree.id, codeRetrait });
  }
  return echec("code_indisponible");
}
```

Créer `src/server/soignant/alertes.ts` :

```ts
import { and, eq, isNull } from "drizzle-orm";
import { estUuid } from "@/domain/identifiants";
import type { Db } from "../db/client";
import { alertes } from "../db/schema";
import { echec, reussite, type Resultat } from "../resultat";
import type { Soignant } from "./consultation";

/** « Je la prends en charge » : le premier soignant du centre qui touche le bouton prend l'alerte. */
export async function prendreEnCharge(
  db: Db,
  e: { auteur: Soignant; alerteId: string; maintenant?: Date },
): Promise<Resultat<{ patientId: string }, "introuvable" | "annulee" | "deja_prise">> {
  if (!estUuid(e.alerteId) || !e.auteur.etablissementId) return echec("introuvable");
  const [alerte] = await db
    .select()
    .from(alertes)
    .where(and(eq(alertes.id, e.alerteId), eq(alertes.etablissementId, e.auteur.etablissementId)));
  if (!alerte) return echec("introuvable");
  if (alerte.annuleeLe) return echec("annulee");
  const prises = await db
    .update(alertes)
    .set({ priseEnChargePar: e.auteur.id, priseEnChargeLe: e.maintenant ?? new Date() })
    .where(and(eq(alertes.id, alerte.id), isNull(alertes.priseEnChargeLe)))
    .returning({ id: alertes.id });
  if (prises.length === 0) return echec("deja_prise");
  return reussite({ patientId: alerte.patientId });
}
```

- [ ] **Étape 4 : relancer les tests**

Run : `pnpm vitest run tests/server/soignant.test.ts`
Expected : PASS (9 tests).

- [ ] **Étape 5 : vérifier les types et committer**

```bash
pnpm typecheck
git add src/server/droits.ts src/server/soignant tests/server/soignant.test.ts
git commit -m "feat(soignant): consultation, vaccination, ordonnance et prise en charge d'une alerte"
```

---

### Tâche 7 : pharmacie (ordonnance par code, délivrance)

**Fichiers :**
- Créer : `src/server/requetes/ordonnances.ts`, `src/server/pharmacie/delivrance.ts`
- Tester : `tests/server/pharmacie.test.ts`

**Interfaces :**
- Consomme : tables `ordonnances`, `evenements`, `patients`, `comptes` ; `traitementsDes` (plan 2) pour vérifier l'arrivée des prises.
- Produit :
  - `interface OrdonnanceDetaillee { id: string; codeRetrait: string; emiseLe: Date; prescripteur: string; lignes: LigneTraitement[]; delivrance: { le: Date; par: string } | null }` ; `ordonnancesDe(db, patientId): Promise<OrdonnanceDetaillee[]>` (la plus récente d'abord) ;
  - `interface OrdonnancePourPharmacie { id; codeRetrait; patient: { prenom; nom; anneeNaissance }; prescripteur; emiseLe; lignes; delivrance }` ; `ordonnanceParCode(db, code): Promise<OrdonnancePourPharmacie | null>` ;
  - `delivrer(db, { auteurId, ordonnanceId, maintenant? }): Promise<Resultat<{ delivreeLe: Date }, "introuvable" | "deja_delivree">>`.

- [ ] **Étape 1 : écrire les tests qui échouent**

Créer `tests/server/pharmacie.test.ts` :

```ts
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/server/db/client";
import { semerDemo } from "@/server/demo/semer";
import { delivrer, ordonnanceParCode } from "@/server/pharmacie/delivrance";
import { traitementsDes } from "@/server/requetes/accueil";
import { ordonnancesDe } from "@/server/requetes/ordonnances";
import { creerDbDeTest } from "../aides/base-de-test";
import { idCompte, idPatient } from "../aides/demo";

let db: Db;
let fermer: () => Promise<void>;

beforeAll(async () => {
  ({ db, fermer } = await creerDbDeTest());
  await semerDemo(db, { aujourdhui: "2026-09-25" });
});
afterAll(async () => fermer());

describe("ordonnanceParCode", () => {
  it("montre l'ordonnance et de quoi la remettre, jamais le dossier", async () => {
    const o = await ordonnanceParCode(db, "M4R2TN");
    expect(o).toMatchObject({ codeRetrait: "M4R2TN", prescripteur: "Firmin Akpovi", delivrance: null, patient: { prenom: "Mariam", nom: "Houngbo", anneeNaissance: 1972 } });
    expect(Object.keys(o!.patient).sort()).toEqual(["anneeNaissance", "nom", "prenom"]);
  });

  it("dit qui a délivré une ordonnance déjà délivrée", async () => {
    expect((await ordonnanceParCode(db, "K7P4QX"))?.delivrance).toMatchObject({ par: "Pharmacie Sainte-Rita" });
  });

  it("ne trouve rien pour un code inconnu", async () => {
    expect(await ordonnanceParCode(db, "ZZZZZZ")).toBeNull();
  });
});

describe("delivrer", () => {
  it("délivre une seule fois, même touché deux fois, et les prises arrivent dans le carnet", async () => {
    const pharmacie = await idCompte(db, "pharmacie.sainte-rita");
    const o = await ordonnanceParCode(db, "M4R2TN");
    const maintenant = new Date("2026-09-25T10:00:00Z");
    const [a, b] = await Promise.all([
      delivrer(db, { auteurId: pharmacie, ordonnanceId: o!.id, maintenant }),
      delivrer(db, { auteurId: pharmacie, ordonnanceId: o!.id, maintenant }),
    ]);
    expect([a.ok, b.ok].sort()).toEqual([false, true]);
    expect([a, b].find((r) => !r.ok)).toEqual({ ok: false, erreur: "deja_delivree" });
    expect((await ordonnanceParCode(db, "M4R2TN"))?.delivrance).toMatchObject({ par: "Pharmacie Sainte-Rita" });
    const traitements = await traitementsDes(db, [await idPatient(db, "Mariam")], "2026-09-25");
    expect(traitements.map((t) => t.medicament)).toEqual(["Paracétamol 500 mg"]);
  });

  it("refuse une ordonnance inconnue", async () => {
    const pharmacie = await idCompte(db, "pharmacie.sainte-rita");
    expect(await delivrer(db, { auteurId: pharmacie, ordonnanceId: randomUUID() })).toEqual({ ok: false, erreur: "introuvable" });
    expect(await delivrer(db, { auteurId: pharmacie, ordonnanceId: "abc" })).toEqual({ ok: false, erreur: "introuvable" });
  });
});

describe("ordonnancesDe", () => {
  it("liste les ordonnances d'une personne avec leur délivrance", async () => {
    expect(await ordonnancesDe(db, await idPatient(db, "Codjo"))).toEqual([
      expect.objectContaining({ codeRetrait: "K7P4QX", prescripteur: "Firmin Akpovi", delivrance: expect.objectContaining({ par: "Pharmacie Sainte-Rita" }) }),
    ]);
  });
});
```

- [ ] **Étape 2 : lancer les tests et les voir échouer**

Run : `pnpm vitest run tests/server/pharmacie.test.ts`
Expected : FAIL (modules introuvables).

- [ ] **Étape 3 : écrire le code**

Créer `src/server/requetes/ordonnances.ts` :

```ts
import { and, desc, eq } from "drizzle-orm";
import type { LigneTraitement } from "@/domain/traitements";
import type { Db } from "../db/client";
import { comptes, evenements, ordonnances } from "../db/schema";

export interface OrdonnanceDetaillee {
  id: string;
  codeRetrait: string;
  emiseLe: Date;
  prescripteur: string;
  lignes: LigneTraitement[];
  delivrance: { le: Date; par: string } | null;
}

/** Ordonnances d'une personne, la plus récente d'abord, avec leur délivrance (tampon côté soignant). */
export async function ordonnancesDe(db: Db, patientId: string): Promise<OrdonnanceDetaillee[]> {
  const [lesOrdonnances, delivrances] = await Promise.all([
    db
      .select({ id: ordonnances.id, codeRetrait: ordonnances.codeRetrait, emiseLe: ordonnances.emiseLe, lignes: ordonnances.lignes, prescripteur: comptes.nomAffiche })
      .from(ordonnances)
      .innerJoin(comptes, eq(ordonnances.prescripteurId, comptes.id))
      .where(eq(ordonnances.patientId, patientId))
      .orderBy(desc(ordonnances.emiseLe)),
    db
      .select({ donnees: evenements.donnees, le: evenements.survenuLe, par: comptes.nomAffiche })
      .from(evenements)
      .leftJoin(comptes, eq(evenements.auteurId, comptes.id))
      .where(and(eq(evenements.patientId, patientId), eq(evenements.type, "delivrance"))),
  ]);
  return lesOrdonnances.map((o) => {
    const d = delivrances.find((x) => x.donnees.ordonnanceId === o.id);
    return { ...o, delivrance: d ? { le: d.le, par: d.par ?? "" } : null };
  });
}
```

Créer `src/server/pharmacie/delivrance.ts` :

```ts
import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { estUuid } from "@/domain/identifiants";
import type { LigneTraitement } from "@/domain/traitements";
import type { Db } from "../db/client";
import { comptes, evenements, ordonnances, patients } from "../db/schema";
import { ordonnancesDe } from "../requetes/ordonnances";
import { echec, reussite, type Resultat } from "../resultat";

export interface OrdonnancePourPharmacie {
  id: string;
  codeRetrait: string;
  /** Juste de quoi remettre les médicaments à la bonne personne : jamais le dossier (spec §12). */
  patient: { prenom: string; nom: string; anneeNaissance: number };
  prescripteur: string;
  emiseLe: Date;
  lignes: LigneTraitement[];
  delivrance: { le: Date; par: string } | null;
}

export async function ordonnanceParCode(db: Db, code: string): Promise<OrdonnancePourPharmacie | null> {
  const [o] = await db
    .select({
      id: ordonnances.id,
      codeRetrait: ordonnances.codeRetrait,
      emiseLe: ordonnances.emiseLe,
      lignes: ordonnances.lignes,
      patientId: ordonnances.patientId,
      prenom: patients.prenom,
      nom: patients.nom,
      dateNaissance: patients.dateNaissance,
      prescripteur: comptes.nomAffiche,
    })
    .from(ordonnances)
    .innerJoin(patients, eq(ordonnances.patientId, patients.id))
    .innerJoin(comptes, eq(ordonnances.prescripteurId, comptes.id))
    .where(eq(ordonnances.codeRetrait, code))
    .limit(1);
  if (!o) return null;
  const detail = (await ordonnancesDe(db, o.patientId)).find((x) => x.id === o.id);
  return {
    id: o.id,
    codeRetrait: o.codeRetrait,
    patient: { prenom: o.prenom, nom: o.nom, anneeNaissance: Number(o.dateNaissance.slice(0, 4)) },
    prescripteur: o.prescripteur,
    emiseLe: o.emiseLe,
    lignes: o.lignes,
    delivrance: detail?.delivrance ?? null,
  };
}

/** « Délivrance confirmée » : une seule fois par ordonnance ; les prises arrivent alors dans le carnet du patient. */
export async function delivrer(
  db: Db,
  e: { auteurId: string; ordonnanceId: string; maintenant?: Date },
): Promise<Resultat<{ delivreeLe: Date }, "introuvable" | "deja_delivree">> {
  if (!estUuid(e.ordonnanceId)) return echec("introuvable");
  const maintenant = e.maintenant ?? new Date();
  return db.transaction(async (tx): Promise<Resultat<{ delivreeLe: Date }, "introuvable" | "deja_delivree">> => {
    // Verrou sur l'ordonnance : deux appuis simultanés passent l'un après l'autre.
    const [o] = await tx
      .select({ id: ordonnances.id, patientId: ordonnances.patientId })
      .from(ordonnances)
      .where(eq(ordonnances.id, e.ordonnanceId))
      .for("update");
    if (!o) return echec("introuvable");
    const deja = await tx
      .select({ id: evenements.id })
      .from(evenements)
      .where(and(eq(evenements.patientId, o.patientId), eq(evenements.type, "delivrance"), sql`${evenements.donnees}->>'ordonnanceId' = ${o.id}`))
      .limit(1);
    if (deja.length > 0) return echec("deja_delivree");
    await tx.insert(evenements).values({
      id: randomUUID(),
      patientId: o.patientId,
      type: "delivrance",
      auteurId: e.auteurId,
      survenuLe: maintenant,
      donnees: { ordonnanceId: o.id },
    });
    return reussite({ delivreeLe: maintenant });
  });
}
```

- [ ] **Étape 4 : relancer les tests**

Run : `pnpm vitest run tests/server/pharmacie.test.ts`
Expected : PASS (6 tests).

- [ ] **Étape 5 : vérifier les types et committer**

```bash
pnpm typecheck
git add src/server/requetes/ordonnances.ts src/server/pharmacie tests/server/pharmacie.test.ts
git commit -m "feat(pharmacie): ordonnance retrouvée par son code et délivrance unique"
```

---

### Tâche 8 : lectures du poste soignant

**Fichiers :**
- Créer : `src/server/requetes/soignant.ts`
- Tester : `tests/server/requetes/soignant.test.ts`

**Interfaces :**
- Consomme : `risquesDes`, `mesuresDes`, `RisquePatient`, `MesureDatee` (tâche 5) ; `patientDuCentre` (tâche 6) ; `ordonnancesDe`, `OrdonnanceDetaillee` (tâche 7) ; `programmesDuCarnet`, `ProgrammeDuCarnet`, `rendezVousVus` (plan 2) ; `analyserRecherche`, `correspondAuNom` (tâche 2) ; `semainesDeGrossesse`.
- Produit :
  - `nomEtablissement(db, etablissementId): Promise<string>` ;
  - `interface AlerteOuverte { id; patientId; prenom; nom; sexe; libelleAge; semainesGrossesse: number | null; telephone: string | null; signes: CodeSigne[]; creeeLe: Date; echeance: Date }` ; `alertesOuvertes(db, etablissementId, aujourdhui)` ;
  - `interface LigneDuJour { rendezVousId; patientId; prenom; nom; libelleAge; motif; libelle; vu: boolean; risque: NiveauRisque }` ; `interface GroupeDuJour { cle; titre; moment: "matin" | "apres_midi" | null; capacite: number | null; lignes: LigneDuJour[] }` ; `consultationsDuJour(db, etablissementId, aujourdhui): Promise<GroupeDuJour[]>` ;
  - `interface PatientASurveiller { patientId; prenom; nom; libelleAge; niveau: NiveauRisque; motif: string }` ; `patientsASurveiller(db, etablissementId, aujourdhui, limite = 6)` ;
  - `interface PatientTrouve { id; prenom; nom; sexe; age; libelleAge; codeCourt; telephone: string | null; village: string | null }` ; `rechercherPatients(db, etablissementId, saisie, aujourdhui)` (20 au plus) ;
  - `interface Dossier { patient: {...}; risque: RisquePatient; programmes: ProgrammeDuCarnet[]; mesures: MesureDatee[]; ordonnances: OrdonnanceDetaillee[]; alertesOuvertes: number }` ; `dossierPatient(db, etablissementId, patientId, aujourdhui): Promise<Dossier | null>`.

- [ ] **Étape 1 : écrire les tests qui échouent**

Créer `tests/server/requetes/soignant.test.ts` :

```ts
import { randomUUID } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/server/db/client";
import { comptes, patients, rendezVous } from "@/server/db/schema";
import { semerDemo } from "@/server/demo/semer";
import { signalerDanger } from "@/server/patient/signalement";
import { alertesOuvertes, consultationsDuJour, dossierPatient, patientsASurveiller, rechercherPatients } from "@/server/requetes/soignant";
import { creerDbDeTest } from "../../aides/base-de-test";
import { COMPTE, idCompte, idPatient } from "../../aides/demo";

const aujourdhui = "2026-09-25";
let db: Db;
let fermer: () => Promise<void>;
let centre: string;
let autreCentre: string;

beforeAll(async () => {
  ({ db, fermer } = await creerDbDeTest());
  await semerDemo(db, { aujourdhui });
  const [firmin] = await db.select().from(comptes).where(eq(comptes.identifiant, "firmin.akpovi"));
  const [pharmacie] = await db.select().from(comptes).where(eq(comptes.identifiant, "pharmacie.sainte-rita"));
  centre = firmin!.etablissementId!;
  autreCentre = pharmacie!.etablissementId!;
});
afterAll(async () => fermer());

describe("alertesOuvertes", () => {
  it("montre le signalement d'Awa avec son terme, son numéro et l'échéance", async () => {
    await signalerDanger(db, {
      compteId: await idCompte(db, COMPTE.awa),
      patientId: await idPatient(db, "Awa"),
      evenementId: randomUUID(),
      signes: ["saignement"],
      maintenant: new Date("2026-09-25T08:41:00Z"),
    });
    const [alerte] = await alertesOuvertes(db, centre, aujourdhui);
    expect(alerte).toMatchObject({ prenom: "Awa", semainesGrossesse: 32, telephone: "+2290197000002", signes: ["saignement"] });
    expect(alerte?.echeance.toISOString()).toBe("2026-09-25T08:56:00.000Z");
    expect(await alertesOuvertes(db, autreCentre, aujourdhui)).toEqual([]);
  });
});

describe("consultationsDuJour", () => {
  it("range les rendez-vous du jour par plage, avec le risque et qui est déjà vu", async () => {
    const groupes = await consultationsDuJour(db, centre, aujourdhui);
    const lignes = groupes.flatMap((g) => g.lignes);
    const duJour = await db.select().from(rendezVous).where(and(eq(rendezVous.datePrevue, aujourdhui), isNull(rendezVous.annuleLe)));
    expect(lignes).toHaveLength(duJour.length);
    expect(lignes.some((l) => l.vu)).toBe(true);
    expect(lignes.some((l) => !l.vu)).toBe(true);
    expect(groupes[0]?.moment).toBe("matin");
    for (const g of groupes) if (g.capacite !== null) expect(g.lignes.length).toBeLessThanOrEqual(g.capacite);
  });
});

describe("patientsASurveiller", () => {
  it("fait remonter les patients à risque, le plus grave d'abord", async () => {
    const liste = await patientsASurveiller(db, centre, aujourdhui);
    expect(liste[0]).toMatchObject({ niveau: "eleve" });
    const rang = { eleve: 0, surveillance: 1, normal: 2 };
    expect(liste.map((p) => rang[p.niveau])).toEqual([...liste.map((p) => rang[p.niveau])].sort());
  });
});

describe("rechercherPatients", () => {
  it("trouve par le nom sans accent, par le téléphone, par le code du carnet", async () => {
    expect((await rechercherPatients(db, centre, "sena", aujourdhui)).map((p) => p.prenom)).toEqual(["Sèna"]);
    expect((await rechercherPatients(db, centre, "01 97 00 00 01", aujourdhui)).map((p) => p.prenom).sort()).toEqual(["Codjo", "Mariam", "Sèna"]);
    const [codjo] = await db.select().from(patients).where(eq(patients.prenom, "Codjo"));
    expect((await rechercherPatients(db, centre, codjo!.codeCourt.toLowerCase(), aujourdhui)).map((p) => p.prenom)).toEqual(["Codjo"]);
  });

  it("ne cherche que dans son centre", async () => {
    expect(await rechercherPatients(db, autreCentre, "sena", aujourdhui)).toEqual([]);
  });
});

describe("dossierPatient", () => {
  it("réunit l'identité, le risque, les étapes, les relevés et les ordonnances", async () => {
    const d = await dossierPatient(db, centre, await idPatient(db, "Codjo"), aujourdhui);
    expect(d?.patient).toMatchObject({ prenom: "Codjo", telephone: "+2290197000001", village: "Bohicon centre" });
    expect(d?.risque.global.niveau).toBe("surveillance");
    expect(d?.programmes[0]?.code).toBe("hypertension");
    expect(d?.mesures.length).toBeGreaterThanOrEqual(4);
    expect(d?.ordonnances).toEqual([expect.objectContaining({ codeRetrait: "K7P4QX" })]);
  });

  it("n'ouvre pas le dossier d'un patient d'un autre centre", async () => {
    expect(await dossierPatient(db, autreCentre, await idPatient(db, "Codjo"), aujourdhui)).toBeNull();
  });
});
```

- [ ] **Étape 2 : lancer les tests et les voir échouer**

Run : `pnpm vitest run tests/server/requetes/soignant.test.ts`
Expected : FAIL (`@/server/requetes/soignant` introuvable).

- [ ] **Étape 3 : écrire le code**

Créer `src/server/requetes/soignant.ts` :

```ts
import { and, asc, eq, gte, inArray, isNull, lt } from "drizzle-orm";
import { ageEnAnnees, ajouterJours, libelleAge, type DateISO } from "@/domain/dates";
import type { MotifRdv, NiveauRisque } from "@/domain/programmes";
import { semainesDeGrossesse } from "@/domain/programmes/grossesse";
import { analyserRecherche, correspondAuNom } from "@/domain/recherche";
import { LIBELLES_PLAGE, LIBELLES_RDV } from "@/domain/rendez-vous";
import type { CodeSigne } from "@/domain/signes-danger";
import { debutDuJourAuBenin, LIBELLE_MOMENT_RDV } from "@/domain/temps";
import type { Db } from "../db/client";
import { alertes, contacts, creneaux, etablissements, evenements, foyers, inscriptions, patients, rendezVous } from "../db/schema";
import { patientDuCentre } from "../droits";
import { programmesDuCarnet, type ProgrammeDuCarnet } from "./carnet";
import { ordonnancesDe, type OrdonnanceDetaillee } from "./ordonnances";
import { rendezVousVus } from "./rendez-vous";
import { mesuresDes, risquesDes, type MesureDatee, type RisquePatient } from "./risques";

export async function nomEtablissement(db: Db, etablissementId: string): Promise<string> {
  const [e] = await db.select({ nom: etablissements.nom }).from(etablissements).where(eq(etablissements.id, etablissementId));
  return e?.nom ?? "";
}

async function telephonesPrincipaux(db: Db, patientIds: string[]): Promise<Map<string, string>> {
  if (patientIds.length === 0) return new Map();
  const lignes = await db
    .select({ patientId: contacts.patientId, telephone: contacts.telephone })
    .from(contacts)
    .where(and(inArray(contacts.patientId, patientIds), eq(contacts.role, "principal")));
  return new Map(lignes.map((l) => [l.patientId, l.telephone]));
}

export interface AlerteOuverte {
  id: string;
  patientId: string;
  prenom: string;
  nom: string;
  sexe: "F" | "M";
  libelleAge: string;
  semainesGrossesse: number | null;
  telephone: string | null;
  signes: CodeSigne[];
  creeeLe: Date;
  echeance: Date;
}

/** Alertes du centre que personne n'a encore prises en charge, la plus ancienne d'abord. */
export async function alertesOuvertes(db: Db, etablissementId: string, aujourdhui: DateISO): Promise<AlerteOuverte[]> {
  const lignes = await db
    .select({
      id: alertes.id,
      patientId: alertes.patientId,
      creeeLe: alertes.creeeLe,
      echeance: alertes.echeance,
      donnees: evenements.donnees,
      prenom: patients.prenom,
      nom: patients.nom,
      sexe: patients.sexe,
      dateNaissance: patients.dateNaissance,
    })
    .from(alertes)
    .innerJoin(patients, eq(alertes.patientId, patients.id))
    .innerJoin(evenements, eq(alertes.evenementId, evenements.id))
    .where(and(eq(alertes.etablissementId, etablissementId), isNull(alertes.priseEnChargeLe), isNull(alertes.annuleeLe)))
    .orderBy(asc(alertes.creeeLe));
  const ids = [...new Set(lignes.map((l) => l.patientId))];
  const [telephones, grossesses] = await Promise.all([
    telephonesPrincipaux(db, ids),
    ids.length
      ? db
          .select({ patientId: inscriptions.patientId, dateReference: inscriptions.dateReference })
          .from(inscriptions)
          .where(and(inArray(inscriptions.patientId, ids), eq(inscriptions.programme, "grossesse"), eq(inscriptions.active, true)))
      : Promise.resolve([]),
  ]);
  return lignes.map((l) => {
    const grossesse = grossesses.find((g) => g.patientId === l.patientId);
    return {
      id: l.id,
      patientId: l.patientId,
      prenom: l.prenom,
      nom: l.nom,
      sexe: l.sexe,
      libelleAge: libelleAge(l.dateNaissance, aujourdhui),
      semainesGrossesse: grossesse ? semainesDeGrossesse(grossesse.dateReference, aujourdhui) : null,
      telephone: telephones.get(l.patientId) ?? null,
      signes: (l.donnees.signes ?? []) as CodeSigne[],
      creeeLe: l.creeeLe,
      echeance: l.echeance,
    };
  });
}

export interface LigneDuJour {
  rendezVousId: string;
  patientId: string;
  prenom: string;
  nom: string;
  libelleAge: string;
  motif: MotifRdv;
  libelle: string;
  vu: boolean;
  risque: NiveauRisque;
}

export interface GroupeDuJour {
  cle: string;
  titre: string;
  moment: "matin" | "apres_midi" | null;
  capacite: number | null;
  lignes: LigneDuJour[];
}

const ORDRE_MOMENT = { matin: 0, apres_midi: 1 } as const;

/** Rendez-vous du jour du centre, par plage : qui est attendu, qui est déjà vu, et le risque de chacun. */
export async function consultationsDuJour(db: Db, etablissementId: string, aujourdhui: DateISO): Promise<GroupeDuJour[]> {
  const lignes = await db
    .select({
      rendezVousId: rendezVous.id,
      patientId: rendezVous.patientId,
      motif: rendezVous.motif,
      creneauId: rendezVous.creneauId,
      moment: creneaux.moment,
      motifPlage: creneaux.motif,
      capacite: creneaux.capacite,
      prenom: patients.prenom,
      nom: patients.nom,
      dateNaissance: patients.dateNaissance,
      antecedents: patients.antecedents,
    })
    .from(rendezVous)
    .innerJoin(patients, eq(rendezVous.patientId, patients.id))
    .leftJoin(creneaux, eq(rendezVous.creneauId, creneaux.id))
    .where(and(eq(rendezVous.etablissementId, etablissementId), eq(rendezVous.datePrevue, aujourdhui), isNull(rendezVous.annuleLe)));
  if (lignes.length === 0) return [];
  const personnes = [...new Map(lignes.map((l) => [l.patientId, { id: l.patientId, dateNaissance: l.dateNaissance, antecedents: l.antecedents }])).values()];
  const ids = personnes.map((p) => p.id);
  const [vus, rdvVus, risques] = await Promise.all([
    db
      .select({ patientId: evenements.patientId })
      .from(evenements)
      .where(
        and(
          inArray(evenements.patientId, ids),
          inArray(evenements.type, ["consultation", "vaccination"]),
          gte(evenements.survenuLe, debutDuJourAuBenin(aujourdhui)),
          lt(evenements.survenuLe, debutDuJourAuBenin(ajouterJours(aujourdhui, 1))),
        ),
      ),
    rendezVousVus(db, ids, aujourdhui),
    risquesDes(db, personnes, aujourdhui),
  ]);
  const dejaVus = new Set(vus.map((v) => v.patientId));
  const groupes = new Map<string, GroupeDuJour>();
  for (const l of lignes) {
    const cle = l.creneauId ?? "sans-place";
    let groupe = groupes.get(cle);
    if (!groupe) {
      groupe = {
        cle,
        titre: l.moment && l.motifPlage ? `${LIBELLES_PLAGE[l.motifPlage]}, ${LIBELLE_MOMENT_RDV[l.moment]}` : "Prévus aujourd'hui, sans place réservée",
        moment: l.moment,
        capacite: l.capacite,
        lignes: [],
      };
      groupes.set(cle, groupe);
    }
    groupe.lignes.push({
      rendezVousId: l.rendezVousId,
      patientId: l.patientId,
      prenom: l.prenom,
      nom: l.nom,
      libelleAge: libelleAge(l.dateNaissance, aujourdhui),
      motif: l.motif,
      libelle: rdvVus.find((r) => r.id === l.rendezVousId)?.libelle ?? LIBELLES_RDV[l.motif],
      vu: dejaVus.has(l.patientId),
      risque: risques.get(l.patientId)?.global.niveau ?? "normal",
    });
  }
  const ordre = (g: GroupeDuJour) => (g.moment ? ORDRE_MOMENT[g.moment] : 2);
  return [...groupes.values()]
    .sort((a, b) => ordre(a) - ordre(b) || a.titre.localeCompare(b.titre, "fr"))
    .map((g) => ({ ...g, lignes: [...g.lignes].sort((a, b) => a.prenom.localeCompare(b.prenom, "fr")) }));
}

export interface PatientASurveiller {
  patientId: string;
  prenom: string;
  nom: string;
  libelleAge: string;
  niveau: NiveauRisque;
  motif: string;
}

const RANG_RISQUE: Record<NiveauRisque, number> = { eleve: 0, surveillance: 1, normal: 2 };

/** Patients du centre à risque élevé puis à surveiller, avec le premier motif. */
export async function patientsASurveiller(db: Db, etablissementId: string, aujourdhui: DateISO, limite = 6): Promise<PatientASurveiller[]> {
  const liste = await db
    .select({ id: patients.id, prenom: patients.prenom, nom: patients.nom, dateNaissance: patients.dateNaissance, antecedents: patients.antecedents })
    .from(patients)
    .where(eq(patients.etablissementId, etablissementId));
  const risques = await risquesDes(db, liste, aujourdhui);
  return liste
    .flatMap((p) => {
      const risque = risques.get(p.id)?.global;
      if (!risque || risque.niveau === "normal") return [];
      return [{ patientId: p.id, prenom: p.prenom, nom: p.nom, libelleAge: libelleAge(p.dateNaissance, aujourdhui), niveau: risque.niveau, motif: risque.motifs[0] ?? "" }];
    })
    .sort((a, b) => RANG_RISQUE[a.niveau] - RANG_RISQUE[b.niveau] || a.nom.localeCompare(b.nom, "fr") || a.prenom.localeCompare(b.prenom, "fr"))
    .slice(0, limite);
}

export interface PatientTrouve {
  id: string;
  prenom: string;
  nom: string;
  sexe: "F" | "M";
  age: number;
  libelleAge: string;
  codeCourt: string;
  telephone: string | null;
  village: string | null;
}

/** Une case : nom (sans accent, en désordre), téléphone ou code du carnet ; seulement les patients du centre. */
export async function rechercherPatients(db: Db, etablissementId: string, saisie: string, aujourdhui: DateISO): Promise<PatientTrouve[]> {
  const recherche = analyserRecherche(saisie);
  if (!recherche.telephone && !recherche.code && recherche.mots.length === 0) return [];
  const liste = await db
    .select({
      id: patients.id,
      prenom: patients.prenom,
      nom: patients.nom,
      sexe: patients.sexe,
      dateNaissance: patients.dateNaissance,
      codeCourt: patients.codeCourt,
      village: foyers.village,
    })
    .from(patients)
    .leftJoin(foyers, eq(patients.foyerId, foyers.id))
    .where(eq(patients.etablissementId, etablissementId));
  const telephones = await telephonesPrincipaux(db, liste.map((p) => p.id));
  return liste
    .filter(
      (p) =>
        (recherche.telephone !== null && telephones.get(p.id) === recherche.telephone) ||
        (recherche.code !== null && p.codeCourt === recherche.code) ||
        correspondAuNom(p, recherche.mots),
    )
    .sort((a, b) => a.nom.localeCompare(b.nom, "fr") || a.prenom.localeCompare(b.prenom, "fr"))
    .slice(0, 20)
    .map((p) => ({
      id: p.id,
      prenom: p.prenom,
      nom: p.nom,
      sexe: p.sexe,
      age: ageEnAnnees(p.dateNaissance, aujourdhui),
      libelleAge: libelleAge(p.dateNaissance, aujourdhui),
      codeCourt: p.codeCourt,
      telephone: telephones.get(p.id) ?? null,
      village: p.village,
    }));
}

export interface Dossier {
  patient: PatientTrouve & {
    langue: string;
    canalPrefere: string;
    malvoyant: boolean;
    malentendant: boolean;
  };
  risque: RisquePatient;
  programmes: ProgrammeDuCarnet[];
  mesures: MesureDatee[];
  ordonnances: OrdonnanceDetaillee[];
  alertesOuvertes: number;
}

/** Dossier d'un patient du centre ; null pour un patient d'un autre centre. */
export async function dossierPatient(db: Db, etablissementId: string, patientId: string, aujourdhui: DateISO): Promise<Dossier | null> {
  if (!(await patientDuCentre(db, etablissementId, patientId))) return null;
  const [p] = await db
    .select({
      id: patients.id,
      prenom: patients.prenom,
      nom: patients.nom,
      sexe: patients.sexe,
      dateNaissance: patients.dateNaissance,
      antecedents: patients.antecedents,
      codeCourt: patients.codeCourt,
      langue: patients.langue,
      canalPrefere: patients.canalPrefere,
      malvoyant: patients.malvoyant,
      malentendant: patients.malentendant,
      village: foyers.village,
    })
    .from(patients)
    .leftJoin(foyers, eq(patients.foyerId, foyers.id))
    .where(eq(patients.id, patientId));
  if (!p) return null;
  const [telephones, risques, programmes, mesures, lesOrdonnances, ouvertes] = await Promise.all([
    telephonesPrincipaux(db, [p.id]),
    risquesDes(db, [p], aujourdhui),
    programmesDuCarnet(db, p.id, aujourdhui),
    mesuresDes(db, [p.id]),
    ordonnancesDe(db, p.id),
    db
      .select({ id: alertes.id })
      .from(alertes)
      .where(and(eq(alertes.patientId, p.id), isNull(alertes.priseEnChargeLe), isNull(alertes.annuleeLe))),
  ]);
  return {
    patient: {
      id: p.id,
      prenom: p.prenom,
      nom: p.nom,
      sexe: p.sexe,
      age: ageEnAnnees(p.dateNaissance, aujourdhui),
      libelleAge: libelleAge(p.dateNaissance, aujourdhui),
      codeCourt: p.codeCourt,
      telephone: telephones.get(p.id) ?? null,
      village: p.village,
      langue: p.langue,
      canalPrefere: p.canalPrefere,
      malvoyant: p.malvoyant,
      malentendant: p.malentendant,
    },
    risque: risques.get(p.id) ?? { global: { niveau: "normal", motifs: [] }, programmes: [] },
    programmes,
    mesures: mesures.get(p.id) ?? [],
    ordonnances: lesOrdonnances,
    alertesOuvertes: ouvertes.length,
  };
}
```

- [ ] **Étape 4 : relancer les tests**

Run : `pnpm vitest run tests/server/requetes/soignant.test.ts`
Expected : PASS (7 tests).

- [ ] **Étape 5 : vérifier les types et committer**

```bash
pnpm typecheck
git add src/server/requetes/soignant.ts tests/server/requetes/soignant.test.ts
git commit -m "feat(soignant): alertes ouvertes, consultations du jour, patients à surveiller, recherche et dossier"
```

---

### Tâche 9 : composants du poste (compte à rebours, actualisation, menu, posologie, code)

**Fichiers :**
- Créer : `src/ui/CompteARebours.tsx`, `src/ui/Actualisation.tsx`, `src/ui/MenuLateral.tsx`, `src/ui/Posologie.tsx`, `src/ui/CodeRetrait.tsx`
- Créer : `src/ui/icones/svg/ph-magnifying-glass.svg`, `src/ui/icones/svg/ph-prescription.svg` (puis `pnpm icones`)
- Tester : `tests/ui/CompteARebours.test.tsx`, `tests/ui/Actualisation.test.tsx`, `tests/ui/MenuLateral.test.tsx`, `tests/ui/Posologie.test.tsx`

**Interfaces :**
- Consomme : `minutesRestantes`, `DELAI_PRISE_EN_CHARGE_MINUTES` (tâche 2) ; `MOMENTS_PRISE`, `LIBELLE_MOMENT_POSOLOGIE` ; `ICONE_MOMENT` ; `Icone`, `NomIcone`.
- Produit :
  - `CompteARebours({ echeance: string; maintenant: string })` (client, ISO) ;
  - `Actualisation({ secondes?: number })` (client, `router.refresh()` régulier) ;
  - `interface LienMenu { href; libelle; icone }`, `MenuLateral({ liens })` (client ; le premier lien n'est actif que sur son adresse exacte) ;
  - `Posologie({ ligne: { matin; midi; soir }; grande?: boolean })` ;
  - `CodeRetrait({ code; libelle? })` ;
  - icônes `ph-magnifying-glass`, `ph-prescription`.

- [ ] **Étape 1 : écrire les tests qui échouent**

Créer `tests/ui/CompteARebours.test.tsx` :

```tsx
// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CompteARebours } from "@/ui/CompteARebours";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("CompteARebours", () => {
  it("dit les minutes qui restent et les fait défiler", () => {
    const maintenant = "2026-09-25T08:43:00.000Z";
    vi.useFakeTimers({ now: new Date(maintenant) });
    render(<CompteARebours echeance="2026-09-25T08:56:00.000Z" maintenant={maintenant} />);
    expect(screen.getByRole("timer").getAttribute("aria-label")).toBe("Reste 13 minutes");
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(screen.getByRole("timer").getAttribute("aria-label")).toBe("Reste 12 minutes");
  });

  it("dit le retard quand le délai est dépassé", () => {
    vi.useFakeTimers({ now: new Date("2026-09-25T09:00:00.000Z") });
    render(<CompteARebours echeance="2026-09-25T08:56:00.000Z" maintenant="2026-09-25T09:00:00.000Z" />);
    expect(screen.getByRole("timer").getAttribute("aria-label")).toBe("Délai dépassé de 4 minutes");
  });
});
```

Créer `tests/ui/Actualisation.test.tsx` :

```tsx
// @vitest-environment jsdom
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Actualisation } from "@/ui/Actualisation";

const routeur = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => routeur }));
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("Actualisation", () => {
  it("rafraîchit la page toutes les 20 secondes", () => {
    vi.useFakeTimers();
    render(<Actualisation />);
    act(() => {
      vi.advanceTimersByTime(41_000);
    });
    expect(routeur.refresh).toHaveBeenCalledTimes(2);
  });
});
```

Créer `tests/ui/MenuLateral.test.tsx` :

```tsx
// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MenuLateral } from "@/ui/MenuLateral";

vi.mock("next/navigation", () => ({ usePathname: () => "/soignant/patients/abc" }));
afterEach(cleanup);

describe("MenuLateral", () => {
  it("marque la rubrique ouverte, sans marquer l'accueil de l'espace", () => {
    render(
      <MenuLateral
        liens={[
          { href: "/soignant", libelle: "Aujourd'hui", icone: "ph-house" },
          { href: "/soignant/patients", libelle: "Patients", icone: "ph-users-three" },
        ]}
      />,
    );
    expect(screen.getByRole("link", { name: "Patients" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("link", { name: "Aujourd'hui" }).getAttribute("aria-current")).toBeNull();
  });
});
```

Créer `tests/ui/Posologie.test.tsx` :

```tsx
// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { CodeRetrait } from "@/ui/CodeRetrait";
import { Posologie } from "@/ui/Posologie";

afterEach(cleanup);

describe("Posologie", () => {
  it("dessine chaque moment de la journée, en disant le nombre de comprimés", () => {
    render(<Posologie ligne={{ matin: 1, midi: 0, soir: 2 }} />);
    expect(screen.getByRole("listitem", { name: "Le matin : 1 comprimé" })).toBeTruthy();
    expect(screen.getByRole("listitem", { name: "À midi : rien" })).toBeTruthy();
    expect(screen.getByRole("listitem", { name: "Le soir : 2 comprimés" })).toBeTruthy();
  });
});

describe("CodeRetrait", () => {
  it("affiche le code en grand avec son libellé", () => {
    render(<CodeRetrait code="M4R2TN" />);
    expect(screen.getByText("M4R2TN")).toBeTruthy();
    expect(screen.getByText("Code de retrait")).toBeTruthy();
  });
});
```

- [ ] **Étape 2 : lancer les tests et les voir échouer**

Run : `pnpm vitest run tests/ui`
Expected : FAIL (composants introuvables).

- [ ] **Étape 3 : ajouter les deux pictogrammes**

```bash
PH="https://unpkg.com/@phosphor-icons/core@2.1.1/assets/fill"
for n in magnifying-glass prescription; do curl -fsSL "$PH/$n-fill.svg" -o "src/ui/icones/svg/ph-$n.svg"; done
pnpm icones
```

Expected : `61 icônes assemblées.`

- [ ] **Étape 4 : écrire les composants**

Créer `src/ui/CompteARebours.tsx` :

```tsx
"use client";

import { useEffect, useState } from "react";
import { DELAI_PRISE_EN_CHARGE_MINUTES, minutesRestantes } from "@/domain/alertes";

const RAYON = 25;
const TOUR = 2 * Math.PI * RAYON;

/** Compte à rebours d'une alerte : les minutes qui restent pour rappeler, puis le retard. */
export function CompteARebours({ echeance, maintenant: maintenantServeur }: { echeance: string; maintenant: string }) {
  const [maintenant, setMaintenant] = useState(() => new Date(maintenantServeur).getTime());
  useEffect(() => {
    const tic = () => setMaintenant(Date.now());
    const premier = setTimeout(tic, 0);
    const minuteur = setInterval(tic, 15_000);
    return () => {
      clearTimeout(premier);
      clearInterval(minuteur);
    };
  }, []);
  const restantes = minutesRestantes(new Date(echeance), new Date(maintenant));
  const enRetard = restantes <= 0;
  const part = Math.min(Math.max(restantes / DELAI_PRISE_EN_CHARGE_MINUTES, 0), 1);
  return (
    <div
      role="timer"
      aria-label={enRetard ? `Délai dépassé de ${-restantes} minutes` : `Reste ${restantes} minutes`}
      className="relative size-[58px] shrink-0 text-urgence"
    >
      <svg viewBox="0 0 58 58" className="size-[58px] -rotate-90" aria-hidden="true">
        <circle cx="29" cy="29" r={RAYON} fill="none" stroke="currentColor" strokeOpacity="0.2" strokeWidth="5" />
        <circle cx="29" cy="29" r={RAYON} fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeDasharray={`${part * TOUR} ${TOUR}`} />
      </svg>
      <span aria-hidden="true" className="absolute inset-0 flex flex-col items-center justify-center leading-none font-bold">
        {enRetard ? <small className="text-[0.55rem]">retard</small> : null}
        <span className="text-lg tabular-nums">{Math.abs(restantes)}</span>
        <small className="text-[0.58rem] font-normal">min</small>
      </span>
    </div>
  );
}
```

Créer `src/ui/Actualisation.tsx` :

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Rafraîchit la page à intervalles réguliers : une nouvelle alerte apparaît sans recharger. */
export function Actualisation({ secondes = 20 }: { secondes?: number }) {
  const routeur = useRouter();
  useEffect(() => {
    const minuteur = setInterval(() => routeur.refresh(), secondes * 1000);
    return () => clearInterval(minuteur);
  }, [routeur, secondes]);
  return null;
}
```

Créer `src/ui/MenuLateral.tsx` :

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icone } from "./Icone";
import type { NomIcone } from "./icones";

export interface LienMenu {
  href: string;
  libelle: string;
  icone: NomIcone;
}

/** Menu des espaces professionnels ; le premier lien (l'accueil de l'espace) n'est actif que sur son adresse exacte. */
export function MenuLateral({ liens }: { liens: LienMenu[] }) {
  const chemin = usePathname();
  return (
    <nav aria-label="Menu">
      <ul className="flex gap-1 overflow-x-auto md:flex-col">
        {liens.map((l, i) => {
          const actif = chemin === l.href || (i > 0 && chemin.startsWith(`${l.href}/`));
          return (
            <li key={l.href}>
              <Link
                href={l.href}
                aria-current={actif ? "page" : undefined}
                className={`flex items-center gap-2.5 rounded-2xl px-3 py-2.5 text-sm font-bold whitespace-nowrap ${actif ? "bg-lavande-2 text-marque" : "text-gris"}`}
              >
                <Icone nom={l.icone} className="size-5" />
                {l.libelle}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
```

Créer `src/ui/Posologie.tsx` :

```tsx
import { LIBELLE_MOMENT_POSOLOGIE, MOMENTS_PRISE, type MomentPrise } from "@/domain/temps";
import { Icone } from "./Icone";
import { ICONE_MOMENT } from "./pictogrammes";

/** Posologie dessinée : soleil levant, soleil, lune, et autant de comprimés que de prises (spec §4.6). */
export function Posologie({ ligne, grande = false }: { ligne: Record<MomentPrise, number>; grande?: boolean }) {
  return (
    <ul aria-label="Quand le prendre" className="grid grid-cols-3 gap-2">
      {MOMENTS_PRISE.map((moment) => {
        const n = ligne[moment];
        const nuit = moment === "soir";
        return (
          <li
            key={moment}
            aria-label={`${LIBELLE_MOMENT_POSOLOGIE[moment]} : ${n === 0 ? "rien" : `${n} comprimé${n > 1 ? "s" : ""}`}`}
            className={`flex flex-col items-center gap-1.5 rounded-2xl p-2.5 text-center ${n === 0 ? "bg-lavande opacity-60" : nuit ? "bg-lavande-2" : "bg-soleil-pale"}`}
          >
            <Icone nom={ICONE_MOMENT[moment]} className={`${grande ? "size-9" : "size-6"} ${nuit ? "text-marque" : "text-soleil-appuye"}`} />
            <span aria-hidden="true" className="text-xs font-bold">
              {LIBELLE_MOMENT_POSOLOGIE[moment]}
            </span>
            <span aria-hidden="true" className="flex min-h-4 flex-wrap justify-center gap-1">
              {n === 0 ? (
                <span className="text-xs text-gris">—</span>
              ) : (
                Array.from({ length: n }, (_, i) => <i key={i} className={`rounded-full bg-marque ${grande ? "h-3.5 w-6" : "h-2.5 w-4"}`} />)
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
```

Créer `src/ui/CodeRetrait.tsx` :

```tsx
/** Code de retrait d'une ordonnance, lisible de loin et facile à recopier. */
export function CodeRetrait({ code, libelle = "Code de retrait" }: { code: string; libelle?: string }) {
  return (
    <p className="inline-flex flex-col rounded-carte bg-lavande-2 px-5 py-3 text-marque">
      <small className="text-xs font-bold text-gris">{libelle}</small>
      <b className="text-3xl tracking-[0.25em] tabular-nums">{code}</b>
    </p>
  );
}
```

- [ ] **Étape 5 : relancer les tests, vérifier le style et les types**

```bash
set -o pipefail
pnpm vitest run tests/ui && pnpm lint && pnpm typecheck
```

- [ ] **Étape 6 : commit**

```bash
git add src/ui tests/ui public/icons/sprite.svg
git commit -m "feat(ui): compte à rebours, actualisation, menu latéral, posologie dessinée et code de retrait"
```

---

### Tâche 10 : poste soignant « Aujourd'hui »

**Fichiers :**
- Créer : `src/app/soignant/contexte.ts`, `src/app/soignant/actions.ts`, `src/app/soignant/layout.tsx`, `src/app/soignant/CarteAlerte.tsx`, `src/app/soignant/RechercheRapide.tsx`
- Remplacer : `src/app/soignant/page.tsx`

**Interfaces :**
- Consomme : `alertesOuvertes`, `consultationsDuJour`, `patientsASurveiller`, `nomEtablissement` (tâche 8) ; `prendreEnCharge` (tâche 6) ; composants de la tâche 9 ; `EtiquetteRisque`, `Tampon`, `RetourAction`, `Logo`, `seDeconnecter`.
- Produit :
  - `exigerSoignant(): Promise<CompteConnecte & { etablissementId: string }>` ;
  - `type EtatFormulaire = { message?: string; valeurs?: Record<string, string> }` ;
  - `prendreEnChargeAction(formulaire)` : succès → `/soignant/patients/<id>?note=alerte` ; refus → `/soignant?note=<erreur>` ;
  - `RechercheRapide({ valeur? })` : formulaire GET vers `/soignant/patients?q=`.

- [ ] **Étape 1 : écrire le contexte, l'action et la mise en page**

Créer `src/app/soignant/contexte.ts` :

```ts
import { exigerRole } from "@/server/auth/cookies";

/** Session d'un soignant rattaché à un centre de santé : ses droits en dépendent (spec §12). */
export async function exigerSoignant() {
  const compte = await exigerRole("soignant");
  if (!compte.etablissementId) throw new Error("Ce compte soignant n'est rattaché à aucun centre de santé.");
  return { ...compte, etablissementId: compte.etablissementId };
}
```

Créer `src/app/soignant/actions.ts` :

```ts
"use server";

import { redirect } from "next/navigation";
import { db } from "@/server/db/client";
import { prendreEnCharge } from "@/server/soignant/alertes";
import { exigerSoignant } from "./contexte";

export type EtatFormulaire = { message?: string; valeurs?: Record<string, string> };

/** « Je la prends en charge » : ouvre le dossier pour rappeler tout de suite. */
export async function prendreEnChargeAction(formulaire: FormData): Promise<void> {
  const soignant = await exigerSoignant();
  const resultat = await prendreEnCharge(db(), { auteur: soignant, alerteId: String(formulaire.get("alerteId") ?? "") });
  if (resultat.ok) redirect(`/soignant/patients/${resultat.donnees.patientId}?note=alerte`);
  redirect(`/soignant?note=${resultat.erreur}`);
}
```

Créer `src/app/soignant/RechercheRapide.tsx` :

```tsx
import { Icone } from "@/ui/Icone";

/** Une seule case : nom, téléphone ou code du carnet. */
export function RechercheRapide({ valeur = "" }: { valeur?: string }) {
  return (
    <form action="/soignant/patients" role="search" className="flex min-w-[260px] items-center gap-2 rounded-bouton bg-white px-3.5">
      <Icone nom="ph-magnifying-glass" className="size-5 text-gris" />
      <label className="sr-only" htmlFor="q">
        Rechercher un patient
      </label>
      <input id="q" name="q" defaultValue={valeur} placeholder="Nom, téléphone ou code du carnet" className="h-11 flex-1 bg-transparent text-sm outline-none" />
    </form>
  );
}
```

Créer `src/app/soignant/layout.tsx` :

```tsx
import { seDeconnecter } from "@/app/actions-session";
import { env } from "@/config/env";
import { db } from "@/server/db/client";
import { nomEtablissement } from "@/server/requetes/soignant";
import { Icone } from "@/ui/Icone";
import { Logo } from "@/ui/Logo";
import { MenuLateral } from "@/ui/MenuLateral";
import { exigerSoignant } from "./contexte";

const initiales = (nom: string) =>
  nom
    .split(/\s+/)
    .map((mot) => mot[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

export default async function EspaceSoignantLayout({ children }: { children: React.ReactNode }) {
  const soignant = await exigerSoignant();
  const centre = await nomEtablissement(db(), soignant.etablissementId);
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[240px_1fr]">
      <aside className="flex flex-col gap-3 bg-white p-4 md:min-h-dvh md:gap-1 md:p-5">
        <div className="flex items-center gap-3 md:mb-6">
          <Logo className="size-10" />
          <div className="min-w-0">
            <b className="block text-lg leading-tight">{env.NEXT_PUBLIC_APP_NAME}</b>
            <small className="block truncate text-xs text-gris">{centre}</small>
          </div>
        </div>
        <MenuLateral
          liens={[
            { href: "/soignant", libelle: "Aujourd'hui", icone: "ph-house" },
            { href: "/soignant/patients", libelle: "Patients", icone: "ph-users-three" },
          ]}
        />
        <div className="flex items-center gap-2.5 rounded-2xl bg-lavande p-2.5 md:mt-auto">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-marque text-xs font-bold text-white">{initiales(soignant.nomAffiche)}</span>
          <b className="min-w-0 flex-1 truncate text-sm">{soignant.nomAffiche}</b>
          <form action={seDeconnecter}>
            <button aria-label="Se déconnecter" title="Se déconnecter" className="grid size-9 place-items-center rounded-xl text-marque">
              <Icone nom="ph-sign-out" className="size-5" />
            </button>
          </form>
        </div>
      </aside>
      <main className="flex min-w-0 flex-col gap-5 p-4 md:p-7">{children}</main>
    </div>
  );
}
```

- [ ] **Étape 2 : écrire la carte d'alerte et la page**

Créer `src/app/soignant/CarteAlerte.tsx` :

```tsx
import { LIBELLES_SIGNES } from "@/domain/signes-danger";
import { heureMinute } from "@/domain/temps";
import type { AlerteOuverte } from "@/server/requetes/soignant";
import { CompteARebours } from "@/ui/CompteARebours";
import { Icone } from "@/ui/Icone";
import { prendreEnChargeAction } from "./actions";

/** Une alerte à prendre en charge : compte à rebours, signes, appeler, « Je la prends en charge ». */
export function CarteAlerte({ alerte, maintenant }: { alerte: AlerteOuverte; maintenant: Date }) {
  const qui = alerte.semainesGrossesse ? `enceinte de ${alerte.semainesGrossesse} semaines` : alerte.libelleAge;
  return (
    <article className="flex flex-wrap items-center gap-4 rounded-carte bg-white px-4 py-3.5 shadow-[inset_4px_0_0_var(--color-urgence)]">
      <CompteARebours echeance={alerte.echeance.toISOString()} maintenant={maintenant.toISOString()} />
      <div className="min-w-[220px] flex-1">
        <b className="block">
          {alerte.prenom} {alerte.nom}, {qui}
        </b>
        <p className="mt-0.5 text-sm text-gris">
          <span className="inline-flex items-center gap-1.5 font-bold text-urgence">
            <Icone nom="hi-alert-circle" className="size-4" />
            {alerte.signes.map((s) => LIBELLES_SIGNES[s]).join(", ")}
          </span>
          , signalé à {heureMinute(alerte.creeeLe)}. À rappeler avant {heureMinute(alerte.echeance)}.
        </p>
      </div>
      {alerte.telephone && (
        <a
          href={`tel:${alerte.telephone}`}
          className="flex items-center gap-2 rounded-bouton bg-white px-4 py-2.5 text-sm font-bold shadow-[inset_0_0_0_2px_var(--color-lavande-3)]"
        >
          <Icone nom="ph-phone" className="size-5" />
          Appeler
        </a>
      )}
      <form action={prendreEnChargeAction}>
        <input type="hidden" name="alerteId" value={alerte.id} />
        <button className="rounded-bouton bg-urgence px-4 py-2.5 text-sm font-bold text-white">
          Je {alerte.sexe === "F" ? "la" : "le"} prends en charge
        </button>
      </form>
    </article>
  );
}
```

Remplacer `src/app/soignant/page.tsx` par :

```tsx
import Link from "next/link";
import { aujourdhuiAuBenin } from "@/domain/dates";
import { dateLongue, majuscule } from "@/domain/temps";
import { db } from "@/server/db/client";
import { alertesOuvertes, consultationsDuJour, patientsASurveiller, type GroupeDuJour, type PatientASurveiller } from "@/server/requetes/soignant";
import { Actualisation } from "@/ui/Actualisation";
import { EtiquetteRisque } from "@/ui/EtiquetteRisque";
import { Icone } from "@/ui/Icone";
import { ICONE_MOTIF } from "@/ui/pictogrammes";
import { RetourAction } from "@/ui/RetourAction";
import { Tampon } from "@/ui/Tampon";
import { CarteAlerte } from "./CarteAlerte";
import { exigerSoignant } from "./contexte";
import { RechercheRapide } from "./RechercheRapide";

const MESSAGES: Record<string, string> = {
  deja_prise: "Un collègue a déjà pris cette alerte en charge.",
  annulee: "La famille a annulé cette alerte.",
  introuvable: "Cette alerte n'existe plus.",
};

export default async function Aujourdhui({ searchParams }: PageProps<"/soignant">) {
  const soignant = await exigerSoignant();
  const params = await searchParams;
  const aujourdhui = aujourdhuiAuBenin();
  const maintenant = new Date();
  const [alertes, groupes, aSurveiller] = await Promise.all([
    alertesOuvertes(db(), soignant.etablissementId, aujourdhui),
    consultationsDuJour(db(), soignant.etablissementId, aujourdhui),
    patientsASurveiller(db(), soignant.etablissementId, aujourdhui),
  ]);
  const lignes = groupes.flatMap((g) => g.lignes);
  const vus = lignes.filter((l) => l.vu).length;
  const note = typeof params.note === "string" ? MESSAGES[params.note] : undefined;

  return (
    <>
      <Actualisation />
      <header className="flex flex-wrap items-end gap-4">
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Aujourd&apos;hui</h1>
          <p className="mt-1 text-gris">
            {majuscule(dateLongue(aujourdhui))} : {lignes.length} rendez-vous, {vus} déjà vu{vus > 1 ? "s" : ""}
          </p>
        </div>
        <RechercheRapide />
      </header>
      {note && <RetourAction message={note} />}
      {alertes.length > 0 && (
        <section aria-labelledby="titre-alertes" className="flex flex-col gap-3">
          <h2 id="titre-alertes" className="sr-only">
            Alertes à prendre en charge
          </h2>
          {alertes.map((a) => (
            <CarteAlerte key={a.id} alerte={a} maintenant={maintenant} />
          ))}
        </section>
      )}
      <div className="grid items-start gap-5 lg:grid-cols-[1fr_320px]">
        <ConsultationsDuJour groupes={groupes} />
        <ASurveiller patients={aSurveiller} />
      </div>
    </>
  );
}

function Places({ prises, capacite }: { prises: number; capacite: number }) {
  return (
    <span aria-hidden="true" className="flex gap-[3px]">
      {Array.from({ length: Math.min(capacite, 12) }, (_, i) => (
        <i key={i} className={`size-2.5 rounded-full ${i < prises ? "bg-marque" : "bg-lavande-3"}`} />
      ))}
    </span>
  );
}

function ConsultationsDuJour({ groupes }: { groupes: GroupeDuJour[] }) {
  return (
    <section aria-labelledby="titre-jour" className="rounded-carte bg-white p-5">
      <h2 id="titre-jour" className="text-lg font-bold">
        Consultations du jour
      </h2>
      {groupes.length === 0 && <p className="mt-3 text-gris">Aucun rendez-vous aujourd&apos;hui.</p>}
      {groupes.map((g) => (
        <div key={g.cle}>
          <div className="mt-4 mb-1.5 flex flex-wrap items-center justify-between gap-2">
            <b>{g.titre}</b>
            <span className="flex items-center gap-2 text-xs text-gris">
              {g.capacite !== null && <Places prises={g.lignes.length} capacite={g.capacite} />}
              {g.capacite !== null ? `${g.lignes.length} places prises sur ${g.capacite}` : `${g.lignes.length} personne${g.lignes.length > 1 ? "s" : ""}`}
            </span>
          </div>
          <ul>
            {g.lignes.map((l, i) => (
              <li key={l.rendezVousId}>
                <Link
                  href={`/soignant/patients/${l.patientId}`}
                  className={`grid grid-cols-[26px_1fr_auto_64px] items-center gap-3 rounded-2xl px-2 py-2 text-sm ${i % 2 ? "bg-lavande" : ""}`}
                >
                  <span className="font-bold text-gris tabular-nums">{i + 1}</span>
                  <span className="flex min-w-0 items-center gap-2.5 font-bold">
                    <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-lavande-2 text-marque">
                      <Icone nom={ICONE_MOTIF[l.motif]} className="size-5" />
                    </span>
                    <span className="min-w-0">
                      {l.prenom} {l.nom}
                      <small className="block truncate font-normal text-gris">
                        {l.libelleAge}, {l.libelle.toLowerCase()}
                      </small>
                    </span>
                  </span>
                  <EtiquetteRisque niveau={l.risque} />
                  <span className="flex justify-end">{l.vu ? <Tampon libelle="Vu" className="size-8" rang={i} /> : <span className="text-xs text-gris">Attendu</span>}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

function ASurveiller({ patients }: { patients: PatientASurveiller[] }) {
  return (
    <section aria-labelledby="titre-surveiller" className="rounded-carte bg-white p-5">
      <h2 id="titre-surveiller" className="text-lg font-bold">
        À surveiller
      </h2>
      {patients.length === 0 ? (
        <p className="mt-3 text-gris">Aucun patient à risque pour le moment.</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {patients.map((p) => (
            <li key={p.patientId}>
              <Link href={`/soignant/patients/${p.patientId}`} className="flex flex-col gap-1 rounded-2xl bg-lavande px-3 py-2.5 text-sm">
                <span className="flex items-center justify-between gap-2">
                  <b>
                    {p.prenom} {p.nom}
                  </b>
                  <EtiquetteRisque niveau={p.niveau} />
                </span>
                <small className="text-gris">
                  {p.libelleAge} · {p.motif}
                </small>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
```

- [ ] **Étape 3 : vérifier le style, les types et les tests**

```bash
set -o pipefail
pnpm lint && pnpm typecheck && pnpm test
```

- [ ] **Étape 4 : vérifier dans le navigateur**

Base locale de vérification (instance jetable, port 5439, comme au plan 2), `pnpm db:seed`, `pnpm dev`. Avec puppeteer en 1280 × 800 : entrer comme « Firmin Akpovi » par `/demo`, capturer `/soignant`. Attendu : consultations du jour par plage (points de places, tampons « VU » pour les personnes vues), colonne « À surveiller » (Codjo « À surveiller »). Puis signaler un saignement avec le compte d'Awa ; en 20 secondes au plus, l'alerte apparaît chez Firmin avec son compte à rebours. « Je la prends en charge » ouvre le dossier d'Awa (tâche 11).

- [ ] **Étape 5 : commit**

```bash
git add src/app/soignant
git commit -m "feat(soignant): poste « Aujourd'hui » avec alertes, consultations du jour et patients à surveiller"
```

---

### Tâche 11 : recherche et dossier du patient

**Fichiers :**
- Créer : `src/app/soignant/patients/page.tsx`, `src/app/soignant/patients/[id]/page.tsx`

**Interfaces :**
- Consomme : `rechercherPatients`, `dossierPatient`, `Dossier` (tâche 8) ; `Posologie`, `CodeRetrait` (tâche 9) ; `EtiquetteRisque`, `Tampon`, `RetourAction`, `iconePourPersonne` ; `dateCourte`, `dateLongue`, `heureMinute`.
- Produit : `/soignant/patients?q=` et `/soignant/patients/<id>` (notes `?note=consultation|ordonnance|alerte`, `&code=` pour l'ordonnance).

- [ ] **Étape 1 : écrire la page de recherche**

Créer `src/app/soignant/patients/page.tsx` :

```tsx
import Link from "next/link";
import { aujourdhuiAuBenin } from "@/domain/dates";
import { formaterTelephone, normaliserTelephone } from "@/domain/telephone";
import { db } from "@/server/db/client";
import { rechercherPatients } from "@/server/requetes/soignant";
import { iconePourPersonne } from "@/ui/avatar";
import { Icone } from "@/ui/Icone";
import { exigerSoignant } from "../contexte";
import { RechercheRapide } from "../RechercheRapide";

export default async function Patients({ searchParams }: PageProps<"/soignant/patients">) {
  const soignant = await exigerSoignant();
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  const resultats = q ? await rechercherPatients(db(), soignant.etablissementId, q, aujourdhuiAuBenin()) : [];
  return (
    <>
      <header className="flex flex-wrap items-end gap-4">
        <h1 className="flex-1 text-3xl font-bold">Patients</h1>
        <RechercheRapide valeur={q} />
      </header>
      {!q && <p className="text-gris">Tapez un nom, un numéro de téléphone ou le code du carnet (6 caractères, écrit dans le carnet).</p>}
      {q && resultats.length === 0 && <p className="rounded-carte bg-white p-4">Aucun patient du centre ne correspond à « {q} ».</p>}
      <ul className="grid gap-2.5 md:grid-cols-2">
        {resultats.map((p) => {
          const telephone = p.telephone ? normaliserTelephone(p.telephone) : null;
          return (
            <li key={p.id}>
              <Link href={`/soignant/patients/${p.id}`} className="flex items-center gap-3 rounded-carte bg-white p-3.5">
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-lavande-2 text-marque">
                  <Icone nom={iconePourPersonne(p.sexe, p.age)} className="size-7" />
                </span>
                <span className="min-w-0 flex-1">
                  <b className="block">
                    {p.prenom} {p.nom}
                  </b>
                  <small className="block text-gris">
                    {p.libelleAge}
                    {p.village ? ` · ${p.village}` : ""} · carnet {p.codeCourt}
                    {telephone ? ` · ${formaterTelephone(telephone)}` : ""}
                  </small>
                </span>
                <Icone nom="ph-caret-right" className="size-5 text-gris" />
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
```

- [ ] **Étape 2 : écrire le dossier**

Créer `src/app/soignant/patients/[id]/page.tsx` :

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { aujourdhuiAuBenin } from "@/domain/dates";
import { PROGRAMMES } from "@/domain/programmes";
import { dateCourte, dateLongue, heureMinute } from "@/domain/temps";
import { formaterTelephone, normaliserTelephone } from "@/domain/telephone";
import { db } from "@/server/db/client";
import type { EtapeDuCarnet } from "@/server/requetes/carnet";
import type { OrdonnanceDetaillee } from "@/server/requetes/ordonnances";
import type { MesureDatee } from "@/server/requetes/risques";
import { dossierPatient } from "@/server/requetes/soignant";
import { iconePourPersonne } from "@/ui/avatar";
import { CodeRetrait } from "@/ui/CodeRetrait";
import { EtiquetteRisque } from "@/ui/EtiquetteRisque";
import { Icone } from "@/ui/Icone";
import { Posologie } from "@/ui/Posologie";
import { RetourAction } from "@/ui/RetourAction";
import { Tampon } from "@/ui/Tampon";
import { exigerSoignant } from "../../contexte";

const LANGUES: Record<string, string> = { fr: "français", fon: "fon", adja: "adja", yo: "yoruba", bariba: "bariba", dendi: "dendi" };
const CANAUX: Record<string, string> = { whatsapp: "WhatsApp", sms: "SMS", vocal: "appel vocal", relais: "par le relais" };
const texteDe = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);

export default async function DossierPatient({ params, searchParams }: PageProps<"/soignant/patients/[id]">) {
  const soignant = await exigerSoignant();
  const [{ id }, recherche] = await Promise.all([params, searchParams]);
  const dossier = await dossierPatient(db(), soignant.etablissementId, id, aujourdhuiAuBenin());
  if (!dossier) notFound();
  const { patient, risque } = dossier;
  const telephone = patient.telephone ? normaliserTelephone(patient.telephone) : null;
  const note = texteDe(recherche.note);
  const code = texteDe(recherche.code);

  return (
    <>
      <Link href="/soignant" className="flex w-fit items-center gap-2 text-sm font-bold text-marque">
        <Icone nom="ph-arrow-left" className="size-4" />
        Aujourd&apos;hui
      </Link>
      {note === "consultation" && <RetourAction message="Consultation enregistrée. Le risque est à jour." />}
      {note === "alerte" && <RetourAction message={`Alerte prise en charge. Rappelez ${patient.prenom} maintenant.`} />}
      {note === "ordonnance" && code && (
        <div className="flex flex-wrap items-center gap-4">
          <RetourAction message="Ordonnance enregistrée. Donnez ce code au patient pour la pharmacie." />
          <CodeRetrait code={code} />
        </div>
      )}
      <header className="flex flex-wrap items-center gap-4 rounded-carte bg-white p-5">
        <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-lavande-2 text-marque">
          <Icone nom={iconePourPersonne(patient.sexe, patient.age)} className="size-9" />
        </span>
        <div className="min-w-[220px] flex-1">
          <h1 className="text-2xl font-bold">
            {patient.prenom} {patient.nom}
          </h1>
          <p className="text-sm text-gris">
            {patient.libelleAge}
            {patient.village ? ` · ${patient.village}` : ""} · carnet {patient.codeCourt} · parle {LANGUES[patient.langue] ?? patient.langue} · rappels{" "}
            {CANAUX[patient.canalPrefere] ?? patient.canalPrefere}
            {patient.malvoyant ? " · malvoyant·e" : ""}
            {patient.malentendant ? " · malentendant·e" : ""}
          </p>
        </div>
        {telephone && (
          <a href={`tel:${telephone}`} className="flex items-center gap-2 rounded-bouton bg-lavande px-4 py-2.5 text-sm font-bold">
            <Icone nom="ph-phone" className="size-5" />
            {formaterTelephone(telephone)}
          </a>
        )}
        <Link href={`/soignant/patients/${patient.id}/consultation`} className="flex items-center gap-2 rounded-bouton bg-marque px-4 py-2.5 text-sm font-bold text-white">
          <Icone nom="hi-stethoscope" className="size-5" />
          Nouvelle consultation
        </Link>
        <Link href={`/soignant/patients/${patient.id}/ordonnance`} className="flex items-center gap-2 rounded-bouton bg-lavande-2 px-4 py-2.5 text-sm font-bold text-marque">
          <Icone nom="ph-prescription" className="size-5" />
          Ordonnance
        </Link>
      </header>
      {dossier.alertesOuvertes > 0 && (
        <p role="alert" className="flex items-center gap-2 rounded-carte bg-urgence-pale px-4 py-3 font-bold text-urgence">
          <Icone nom="hi-alert-circle" className="size-5" />
          Signe de danger en attente de prise en charge : voir <Link href="/soignant" className="underline">Aujourd&apos;hui</Link>.
        </p>
      )}
      <section aria-labelledby="titre-risque" className="flex flex-col gap-2 rounded-carte bg-white p-5">
        <div className="flex items-center gap-3">
          <h2 id="titre-risque" className="text-lg font-bold">
            Risque
          </h2>
          <EtiquetteRisque niveau={risque.global.niveau} />
        </div>
        {risque.global.motifs.length === 0 ? (
          <p className="text-gris">Rien d&apos;inquiétant dans les relevés et les rendez-vous.</p>
        ) : (
          <ul className="list-disc pl-5">
            {risque.global.motifs.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        )}
      </section>
      <div className="grid items-start gap-5 lg:grid-cols-2">
        <section aria-labelledby="titre-programmes" className="flex flex-col gap-4 rounded-carte bg-white p-5">
          <h2 id="titre-programmes" className="text-lg font-bold">
            Suivi
          </h2>
          {dossier.programmes.length === 0 && <p className="text-gris">Aucun programme de suivi.</p>}
          {dossier.programmes.map((p) => (
            <div key={p.code}>
              <b className="block">{PROGRAMMES[p.code].nom}</b>
              {p.etapes.length === 0 ? (
                <p className="text-sm text-gris">Consultations à la demande.</p>
              ) : (
                <ul className="mt-1.5 flex flex-col">
                  {p.etapes.map((e, i) => (
                    <LigneEtape key={e.code} etape={e} rang={i} />
                  ))}
                </ul>
              )}
            </div>
          ))}
        </section>
        <Releves mesures={dossier.mesures} />
      </div>
      <Ordonnances ordonnances={dossier.ordonnances} />
    </>
  );
}

function LigneEtape({ etape, rang }: { etape: EtapeDuCarnet; rang: number }) {
  return (
    <li className="flex items-center gap-3 border-b border-lavande-2 py-1.5 text-sm last:border-0">
      <span className="grid w-9 shrink-0 place-items-center">
        {etape.statut === "faite" ? (
          <Tampon libelle="Fait" className="size-8" rang={rang} />
        ) : (
          <span aria-hidden="true" className={`size-7 rounded-full ${etape.statut === "manquee" ? "bg-soleil-pale" : "border-2 border-lavande-3"}`} />
        )}
      </span>
      <span className="flex-1">{etape.libelle}</span>
      <span className={`text-xs font-bold ${etape.statut === "manquee" ? "text-soleil-appuye" : "text-gris"}`}>
        {etape.statut === "faite" && etape.faite
          ? `Fait le ${dateCourte(aujourdhuiAuBenin(etape.faite.le))}`
          : etape.statut === "manquee"
            ? "Manqué"
            : etape.reservation
              ? `Réservé : ${dateCourte(etape.reservation.date)}`
              : `Prévu : ${dateCourte(etape.datePrevue)}`}
      </span>
    </li>
  );
}

function Releves({ mesures }: { mesures: MesureDatee[] }) {
  const recents = [...mesures].reverse().slice(0, 8);
  return (
    <section aria-labelledby="titre-releves" className="rounded-carte bg-white p-5">
      <h2 id="titre-releves" className="text-lg font-bold">
        Relevés
      </h2>
      {recents.length === 0 ? (
        <p className="mt-2 text-gris">Aucun relevé.</p>
      ) : (
        <table className="mt-2 w-full text-sm">
          <thead className="text-left text-xs text-gris">
            <tr>
              <th className="py-1 font-bold">Date</th>
              <th className="font-bold">Tension</th>
              <th className="font-bold">Glycémie</th>
              <th className="font-bold">Poids</th>
              <th className="font-bold">Par</th>
            </tr>
          </thead>
          <tbody>
            {recents.map((m, i) => (
              <tr key={`${m.date}-${i}`} className="border-t border-lavande-2">
                <td className="py-1.5 tabular-nums">{dateCourte(m.date)}</td>
                <td className="tabular-nums">{m.tensionSys ? `${m.tensionSys}/${m.tensionDia}` : "—"}</td>
                <td className="tabular-nums">{m.glycemieGL ? `${m.glycemieGL} g/L` : "—"}</td>
                <td className="tabular-nums">{m.poidsKg ? `${m.poidsKg} kg` : "—"}</td>
                <td className="text-gris">{m.source === "mesure" ? "Relevé" : "Consultation"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

function Ordonnances({ ordonnances }: { ordonnances: OrdonnanceDetaillee[] }) {
  return (
    <section aria-labelledby="titre-ordonnances" className="flex flex-col gap-3 rounded-carte bg-white p-5">
      <h2 id="titre-ordonnances" className="text-lg font-bold">
        Ordonnances
      </h2>
      {ordonnances.length === 0 && <p className="text-gris">Aucune ordonnance.</p>}
      {ordonnances.map((o, i) => (
        <article key={o.id} className="flex flex-col gap-3 rounded-2xl bg-lavande p-4">
          <div className="flex flex-wrap items-center gap-3">
            <b className="flex-1">
              Le {dateLongue(aujourdhuiAuBenin(o.emiseLe))}, par {o.prescripteur}
            </b>
            {o.delivrance ? (
              <span className="flex items-center gap-2 text-sm font-bold text-marque">
                <Tampon libelle="Délivrée" className="size-10" rang={i} />
                Délivrée le {dateCourte(aujourdhuiAuBenin(o.delivrance.le))} à {heureMinute(o.delivrance.le)}, {o.delivrance.par}
              </span>
            ) : (
              <CodeRetrait code={o.codeRetrait} libelle="À retirer avec le code" />
            )}
          </div>
          {o.lignes.map((l) => (
            <div key={l.medicament} className="grid items-center gap-3 md:grid-cols-[1fr_320px]">
              <p>
                <b>{l.medicament}</b>
                <small className="block text-gris">
                  {l.indication ? `Pour ${l.indication} · ` : ""}
                  {l.dureeJours} jours{l.conseil ? ` · ${l.conseil}` : ""}
                </small>
              </p>
              <Posologie ligne={l} />
            </div>
          ))}
        </article>
      ))}
    </section>
  );
}
```

- [ ] **Étape 3 : vérifier le style, les types et les écrans**

```bash
set -o pipefail
pnpm lint && pnpm typecheck
```

Dans le navigateur (Firmin) : chercher « codjo », puis « 01 97 00 00 01 », puis le code de son carnet. Ouvrir son dossier : risque « À surveiller » avec « Tension non contrôlée (148/94 puis 145/92) », étapes avec tampons, relevés, ordonnance K7P4QX « Délivrée … Pharmacie Sainte-Rita ». Taper l'adresse du dossier avec un identifiant inventé : page introuvable.

- [ ] **Étape 4 : commit**

```bash
git add src/app/soignant/patients
git commit -m "feat(soignant): recherche par nom, téléphone ou code, et dossier du patient"
```

---

### Tâche 12 : saisir une consultation et une ordonnance

**Fichiers :**
- Modifier : `src/app/soignant/actions.ts`
- Créer : `src/app/soignant/patients/[id]/consultation/page.tsx`, `src/app/soignant/patients/[id]/consultation/FormulaireConsultation.tsx`, `src/app/soignant/patients/[id]/ordonnance/page.tsx`, `src/app/soignant/patients/[id]/ordonnance/FormulaireOrdonnance.tsx`

**Interfaces :**
- Consomme : `lireSaisieConsultation` (tâche 3), `lireLignes`, `MAX_LIGNES` (tâche 1), `enregistrerConsultation`, `emettreOrdonnance` (tâche 6), `dossierPatient` (tâche 8), `motifsProposes`, `LIBELLES_MOTIF`, `MOTIFS_RDV`.
- Produit :
  - `enregistrerConsultationAction(etat, formulaire): Promise<EtatFormulaire>` : succès → `/soignant/patients/<id>?note=consultation` ;
  - `emettreOrdonnanceAction(etat, formulaire): Promise<EtatFormulaire>` : succès → `/soignant/patients/<id>?note=ordonnance&code=<code>`.
  En cas d'erreur, les valeurs saisies sont renvoyées : React vide le formulaire après l'action, et on le remplit à nouveau avec ces valeurs.

- [ ] **Étape 1 : ajouter les actions**

Dans `src/app/soignant/actions.ts`, ajouter les imports :

```ts
import { lireSaisieConsultation } from "@/domain/consultation";
import { lireLignes } from "@/domain/ordonnances";
import { enregistrerConsultation } from "@/server/soignant/consultation";
import { emettreOrdonnance } from "@/server/soignant/ordonnance";
```

et à la fin :

```ts
const texteDu = (formulaire: FormData): Record<string, string> =>
  Object.fromEntries([...formulaire.entries()].filter(([cle]) => !cle.startsWith("$")).map(([cle, valeur]) => [cle, String(valeur)]));

export async function enregistrerConsultationAction(_: EtatFormulaire, formulaire: FormData): Promise<EtatFormulaire> {
  const soignant = await exigerSoignant();
  const valeurs = texteDu(formulaire);
  const lecture = lireSaisieConsultation(valeurs);
  if (!lecture.ok) return { message: lecture.message, valeurs };
  const resultat = await enregistrerConsultation(db(), { auteur: soignant, patientId: valeurs.patientId ?? "", saisie: lecture.saisie });
  if (!resultat.ok) {
    const message = resultat.erreur === "interdit" ? "Ce patient n'est pas suivi dans votre centre." : "Cette étape ne va pas avec le motif choisi.";
    return { message, valeurs };
  }
  redirect(`/soignant/patients/${valeurs.patientId}?note=consultation`);
}

export async function emettreOrdonnanceAction(_: EtatFormulaire, formulaire: FormData): Promise<EtatFormulaire> {
  const soignant = await exigerSoignant();
  const valeurs = texteDu(formulaire);
  const lecture = lireLignes(valeurs);
  if (!lecture.ok) return { message: lecture.message, valeurs };
  const resultat = await emettreOrdonnance(db(), { auteur: soignant, patientId: valeurs.patientId ?? "", lignes: lecture.lignes });
  if (!resultat.ok) {
    const message = resultat.erreur === "interdit" ? "Ce patient n'est pas suivi dans votre centre." : "Le code de retrait n'a pas pu être créé. Réessayez.";
    return { message, valeurs };
  }
  redirect(`/soignant/patients/${valeurs.patientId}?note=ordonnance&code=${resultat.donnees.codeRetrait}`);
}
```

- [ ] **Étape 2 : écrire la consultation**

Créer `src/app/soignant/patients/[id]/consultation/FormulaireConsultation.tsx` :

```tsx
"use client";

import { useActionState, useState } from "react";
import { enregistrerConsultationAction, type EtatFormulaire } from "../../../actions";

export interface EtapeAChoisir {
  code: string;
  motif: string;
  libelle: string;
  /** Étape en retard ou prévue dans les 14 jours : proposée par défaut. */
  proche: boolean;
}

const CHAMP = "flex flex-col gap-1.5 text-sm font-bold";
const SAISIE = "h-11 rounded-xl bg-lavande px-3 text-base font-normal";

export function FormulaireConsultation({
  patientId,
  motifs,
  etapes,
  motifInitial,
}: {
  patientId: string;
  motifs: { code: string; libelle: string }[];
  etapes: EtapeAChoisir[];
  motifInitial: string;
}) {
  const [etat, action, enCours] = useActionState<EtatFormulaire, FormData>(enregistrerConsultationAction, {});
  const [motif, setMotif] = useState(etat.valeurs?.motif ?? motifInitial);
  const etapesDuMotif = etapes.filter((e) => e.motif === motif);
  const valeur = (nom: string) => etat.valeurs?.[nom] ?? "";
  return (
    <form action={action} className="flex max-w-2xl flex-col gap-5 rounded-carte bg-white p-5">
      <input type="hidden" name="patientId" value={patientId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={CHAMP}>
          Motif
          <select name="motif" value={motif} onChange={(e) => setMotif(e.target.value)} className={SAISIE}>
            {motifs.map((m) => (
              <option key={m.code} value={m.code}>
                {m.libelle}
              </option>
            ))}
          </select>
        </label>
        {etapesDuMotif.length > 0 && (
          <label className={CHAMP}>
            Étape du programme
            <select key={motif} name="etape" defaultValue={valeur("etape") || (etapesDuMotif.find((e) => e.proche)?.code ?? "")} className={SAISIE}>
              <option value="">Aucune (consultation simple)</option>
              {etapesDuMotif.map((e) => (
                <option key={e.code} value={e.code}>
                  {e.libelle}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 font-bold">Mesures, si elles sont prises</legend>
        <div className="flex items-end gap-2">
          <label className={`${CHAMP} flex-1`}>
            Tension (haut)
            <input name="tensionSys" inputMode="numeric" placeholder="140" defaultValue={valeur("tensionSys")} className={SAISIE} />
          </label>
          <span className="pb-2.5 text-lg font-bold">/</span>
          <label className={`${CHAMP} flex-1`}>
            Tension (bas)
            <input name="tensionDia" inputMode="numeric" placeholder="90" defaultValue={valeur("tensionDia")} className={SAISIE} />
          </label>
        </div>
        <label className={CHAMP}>
          Glycémie à jeun (g/L)
          <input name="glycemieGL" inputMode="decimal" placeholder="1,1" defaultValue={valeur("glycemieGL")} className={SAISIE} />
        </label>
        <label className={CHAMP}>
          Poids (kg)
          <input name="poidsKg" inputMode="decimal" defaultValue={valeur("poidsKg")} className={SAISIE} />
        </label>
        <label className={CHAMP}>
          Hémoglobine (g/dL)
          <input name="hemoglobineGDL" inputMode="decimal" defaultValue={valeur("hemoglobineGDL")} className={SAISIE} />
        </label>
      </fieldset>
      <label className={CHAMP}>
        Notes
        <textarea name="notes" rows={3} defaultValue={valeur("notes")} className="rounded-xl bg-lavande p-3 text-base font-normal" />
      </label>
      {etat.message && (
        <p role="alert" className="rounded-bouton bg-urgence-pale px-4 py-3 font-bold text-urgence">
          {etat.message}
        </p>
      )}
      <button disabled={enCours} className="h-12 rounded-bouton bg-marque font-bold text-white disabled:opacity-60">
        {enCours ? "Enregistrement…" : "Enregistrer la consultation"}
      </button>
    </form>
  );
}
```

Créer `src/app/soignant/patients/[id]/consultation/page.tsx` :

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { aujourdhuiAuBenin, joursEntre } from "@/domain/dates";
import { MOTIFS_RDV } from "@/domain/programmes";
import { LIBELLES_MOTIF, motifsProposes } from "@/domain/rendez-vous";
import { dateCourte } from "@/domain/temps";
import { db } from "@/server/db/client";
import { dossierPatient } from "@/server/requetes/soignant";
import { Icone } from "@/ui/Icone";
import { exigerSoignant } from "../../../contexte";
import { FormulaireConsultation, type EtapeAChoisir } from "./FormulaireConsultation";

export default async function NouvelleConsultation({ params, searchParams }: PageProps<"/soignant/patients/[id]/consultation">) {
  const soignant = await exigerSoignant();
  const [{ id }, recherche] = await Promise.all([params, searchParams]);
  const aujourdhui = aujourdhuiAuBenin();
  const dossier = await dossierPatient(db(), soignant.etablissementId, id, aujourdhui);
  if (!dossier) notFound();
  const { patient } = dossier;
  const suivis = motifsProposes({ age: patient.age, sexe: patient.sexe, programmes: dossier.programmes.map((p) => p.code) });
  const motifs = [...suivis, ...MOTIFS_RDV.filter((m) => !suivis.includes(m))];
  const etapes: EtapeAChoisir[] = dossier.programmes.flatMap((p) =>
    p.etapes
      .filter((e) => e.rendezVous && e.statut !== "faite")
      .map((e) => {
        const date = e.reservation?.date ?? e.datePrevue;
        return {
          code: e.code,
          motif: e.motif,
          libelle: `${e.libelle} (${e.statut === "manquee" ? "en retard" : dateCourte(date)})`,
          proche: e.statut === "manquee" || Math.abs(joursEntre(aujourdhui, date)) <= 14,
        };
      }),
  );
  const demande = typeof recherche.motif === "string" ? recherche.motif : undefined;
  return (
    <>
      <Link href={`/soignant/patients/${patient.id}`} className="flex w-fit items-center gap-2 text-sm font-bold text-marque">
        <Icone nom="ph-arrow-left" className="size-4" />
        Dossier de {patient.prenom}
      </Link>
      <h1 className="text-3xl font-bold">
        Consultation de {patient.prenom} {patient.nom}
      </h1>
      <FormulaireConsultation
        patientId={patient.id}
        motifs={motifs.map((m) => ({ code: m, libelle: LIBELLES_MOTIF[m] }))}
        etapes={etapes}
        motifInitial={motifs.find((m) => m === demande) ?? motifs[0]!}
      />
    </>
  );
}
```

- [ ] **Étape 3 : écrire l'ordonnance**

Créer `src/app/soignant/patients/[id]/ordonnance/FormulaireOrdonnance.tsx` :

```tsx
"use client";

import { useActionState } from "react";
import { MOMENTS_PRISE } from "@/domain/temps";
import { Icone } from "@/ui/Icone";
import { ICONE_MOMENT } from "@/ui/pictogrammes";
import { emettreOrdonnanceAction, type EtatFormulaire } from "../../../actions";

const CHAMP = "flex flex-col gap-1.5 text-sm font-bold";
const SAISIE = "h-11 rounded-xl bg-white px-3 text-base font-normal";
const MOMENTS = { matin: "Matin", midi: "Midi", soir: "Soir" } as const;
const LIGNES = 3;

export function FormulaireOrdonnance({ patientId }: { patientId: string }) {
  const [etat, action, enCours] = useActionState<EtatFormulaire, FormData>(emettreOrdonnanceAction, {});
  const valeur = (nom: string, parDefaut = "") => etat.valeurs?.[nom] ?? parDefaut;
  return (
    <form action={action} className="flex max-w-3xl flex-col gap-4">
      <input type="hidden" name="patientId" value={patientId} />
      {Array.from({ length: LIGNES }, (_, i) => (
        <fieldset key={i} className="grid gap-3 rounded-carte bg-white p-4 sm:grid-cols-2">
          <legend className="sr-only">Médicament {i + 1}</legend>
          <label className={CHAMP}>
            Médicament {i + 1}
            <input name={`lignes.${i}.medicament`} placeholder={i === 0 ? "Amlodipine 5 mg" : "Facultatif"} defaultValue={valeur(`lignes.${i}.medicament`)} className={`${SAISIE} bg-lavande`} />
          </label>
          <label className={CHAMP}>
            Pour (en mots simples)
            <input name={`lignes.${i}.indication`} placeholder="la tension" defaultValue={valeur(`lignes.${i}.indication`)} className={`${SAISIE} bg-lavande`} />
          </label>
          <div className="grid grid-cols-4 gap-2 sm:col-span-2">
            {MOMENTS_PRISE.map((m) => (
              <label key={m} className={CHAMP}>
                <span className="flex items-center gap-1.5">
                  <Icone nom={ICONE_MOMENT[m]} className="size-5 text-soleil-appuye" />
                  {MOMENTS[m]}
                </span>
                <input name={`lignes.${i}.${m}`} type="number" min={0} max={6} defaultValue={valeur(`lignes.${i}.${m}`, "0")} className={`${SAISIE} bg-lavande`} />
              </label>
            ))}
            <label className={CHAMP}>
              Jours
              <input name={`lignes.${i}.dureeJours`} type="number" min={1} max={180} defaultValue={valeur(`lignes.${i}.dureeJours`)} className={`${SAISIE} bg-lavande`} />
            </label>
          </div>
          <label className={`${CHAMP} sm:col-span-2`}>
            Conseil
            <input name={`lignes.${i}.conseil`} placeholder="avec un verre d'eau" defaultValue={valeur(`lignes.${i}.conseil`)} className={`${SAISIE} bg-lavande`} />
          </label>
        </fieldset>
      ))}
      {etat.message && (
        <p role="alert" className="rounded-bouton bg-urgence-pale px-4 py-3 font-bold text-urgence">
          {etat.message}
        </p>
      )}
      <button disabled={enCours} className="h-12 rounded-bouton bg-marque font-bold text-white disabled:opacity-60">
        {enCours ? "Enregistrement…" : "Enregistrer l'ordonnance"}
      </button>
    </form>
  );
}
```

Créer `src/app/soignant/patients/[id]/ordonnance/page.tsx` :

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { aujourdhuiAuBenin } from "@/domain/dates";
import { db } from "@/server/db/client";
import { dossierPatient } from "@/server/requetes/soignant";
import { Icone } from "@/ui/Icone";
import { exigerSoignant } from "../../../contexte";
import { FormulaireOrdonnance } from "./FormulaireOrdonnance";

export default async function NouvelleOrdonnance({ params }: PageProps<"/soignant/patients/[id]/ordonnance">) {
  const soignant = await exigerSoignant();
  const { id } = await params;
  const dossier = await dossierPatient(db(), soignant.etablissementId, id, aujourdhuiAuBenin());
  if (!dossier) notFound();
  const { patient } = dossier;
  return (
    <>
      <Link href={`/soignant/patients/${patient.id}`} className="flex w-fit items-center gap-2 text-sm font-bold text-marque">
        <Icone nom="ph-arrow-left" className="size-4" />
        Dossier de {patient.prenom}
      </Link>
      <h1 className="text-3xl font-bold">
        Ordonnance pour {patient.prenom} {patient.nom}
      </h1>
      <p className="-mt-3 text-gris">Nombre de comprimés à chaque moment de la journée, et durée. La pharmacie verra la posologie dessinée.</p>
      <FormulaireOrdonnance patientId={patient.id} />
    </>
  );
}
```

- [ ] **Étape 4 : vérifier le style, les types, les tests et le parcours**

```bash
set -o pipefail
pnpm lint && pnpm typecheck && pnpm test
```

Dans le navigateur (Firmin) :
- dossier de Codjo, « Nouvelle consultation », motif Tension, 180 / 110, enregistrer : retour au dossier avec « Consultation enregistrée », risque « Élevé » et « Tension très élevée (180/110) » ;
- saisir 150 sans le chiffre du bas : message « Indiquez les deux chiffres de la tension… » et les valeurs saisies restent ;
- « Ordonnance » : Amlodipine 10 mg, soir 1, 30 jours, enregistrer : code à 6 caractères affiché en grand dans le dossier.

- [ ] **Étape 5 : commit**

```bash
git add src/app/soignant
git commit -m "feat(soignant): saisie de la consultation (risque recalculé) et de l'ordonnance avec code de retrait"
```

---

### Tâche 13 : pharmacie

**Fichiers :**
- Remplacer : `src/app/pharmacie/page.tsx`
- Créer : `src/app/pharmacie/actions.ts`

**Interfaces :**
- Consomme : `ordonnanceParCode`, `delivrer` (tâche 7) ; `normaliserCode`, `quantiteTotale`, `texteDePosologie` (tâche 1) ; `Posologie` (tâche 9) ; `EnTete`, `Tampon`, `RetourAction`, `BoutonEcouter`.
- Produit :
  - `/pharmacie?code=` ;
  - `delivrerAction(formulaire)` (champs `ordonnanceId`, `code`) → `/pharmacie?code=<code>&note=delivree`.

- [ ] **Étape 1 : écrire l'action et la page**

Créer `src/app/pharmacie/actions.ts` :

```ts
"use server";

import { redirect } from "next/navigation";
import { exigerRole } from "@/server/auth/cookies";
import { db } from "@/server/db/client";
import { delivrer } from "@/server/pharmacie/delivrance";

export async function delivrerAction(formulaire: FormData): Promise<void> {
  const compte = await exigerRole("pharmacie");
  const code = String(formulaire.get("code") ?? "");
  const resultat = await delivrer(db(), { auteurId: compte.id, ordonnanceId: String(formulaire.get("ordonnanceId") ?? "") });
  redirect(`/pharmacie?${new URLSearchParams({ code, ...(resultat.ok ? { note: "delivree" } : {}) })}`);
}
```

Remplacer `src/app/pharmacie/page.tsx` par :

```tsx
import { aujourdhuiAuBenin } from "@/domain/dates";
import { normaliserCode, quantiteTotale, texteDePosologie } from "@/domain/ordonnances";
import { dateLongue, heureMinute } from "@/domain/temps";
import { exigerRole } from "@/server/auth/cookies";
import { db } from "@/server/db/client";
import { ordonnanceParCode, type OrdonnancePourPharmacie } from "@/server/pharmacie/delivrance";
import { BoutonEcouter } from "@/ui/BoutonEcouter";
import { EnTete } from "@/ui/EnTete";
import { Icone } from "@/ui/Icone";
import { Posologie } from "@/ui/Posologie";
import { RetourAction } from "@/ui/RetourAction";
import { Tampon } from "@/ui/Tampon";
import { delivrerAction } from "./actions";

export default async function Pharmacie({ searchParams }: PageProps<"/pharmacie">) {
  const compte = await exigerRole("pharmacie");
  const params = await searchParams;
  const saisie = typeof params.code === "string" ? params.code : "";
  const code = saisie ? normaliserCode(saisie) : null;
  const ordonnance = code ? await ordonnanceParCode(db(), code) : null;
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6">
      <EnTete nomAffiche={compte.nomAffiche} />
      <h1 className="text-3xl font-bold">Retrouver une ordonnance</h1>
      <form action="/pharmacie" role="search" className="flex flex-wrap items-end gap-3">
        <label className="flex flex-1 flex-col gap-2 font-bold">
          Code de l&apos;ordonnance
          <input
            name="code"
            defaultValue={saisie}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={9}
            placeholder="K7P4QX"
            className="h-14 rounded-bouton bg-white px-4 text-2xl font-bold tracking-[0.2em] uppercase"
          />
        </label>
        <button className="flex h-14 items-center gap-2 rounded-bouton bg-marque px-6 text-lg font-bold text-white">
          <Icone nom="ph-magnifying-glass" className="size-6" />
          Rechercher
        </button>
      </form>
      {saisie && !code && (
        <p role="alert" className="rounded-bouton bg-soleil-pale px-4 py-3 font-bold">
          Ce code n&apos;a pas la bonne forme : 6 lettres ou chiffres, par exemple K7P4QX.
        </p>
      )}
      {code && !ordonnance && (
        <p role="alert" className="rounded-bouton bg-soleil-pale px-4 py-3 font-bold">
          Aucune ordonnance avec le code {code}. Vérifiez chaque caractère.
        </p>
      )}
      {ordonnance && params.note === "delivree" && <RetourAction message="Délivrance confirmée : les prises apparaissent dans le carnet du patient." />}
      {ordonnance && <FicheOrdonnance ordonnance={ordonnance} />}
    </main>
  );
}

function FicheOrdonnance({ ordonnance }: { ordonnance: OrdonnancePourPharmacie }) {
  const { patient, delivrance } = ordonnance;
  return (
    <section aria-labelledby="titre-ordonnance" className="flex flex-col gap-4 rounded-grande bg-white p-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="titre-ordonnance" className="text-2xl font-bold">
            {patient.prenom} {patient.nom}
          </h2>
          <p className="text-sm text-gris">
            Née ou né en {patient.anneeNaissance} · prescrite par {ordonnance.prescripteur} le {dateLongue(aujourdhuiAuBenin(ordonnance.emiseLe))}
          </p>
        </div>
        <span className="rounded-xl bg-lavande-2 px-3 py-1.5 font-bold tracking-[0.2em] text-marque tabular-nums">{ordonnance.codeRetrait}</span>
      </header>
      {ordonnance.lignes.map((l) => (
        <article key={l.medicament} className="flex flex-col gap-3 rounded-carte bg-lavande p-4">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <h3 className="text-xl font-bold">{l.medicament}</h3>
              <p className="text-sm text-gris">
                {l.indication ? `Pour ${l.indication} · ` : ""}pendant {l.dureeJours} jours{l.conseil ? `, ${l.conseil}` : ""} ·{" "}
                <b className="text-nuit">{quantiteTotale(l)} comprimés à donner</b>
              </p>
            </div>
            <BoutonEcouter variante="rond" libelle={`Écouter la posologie : ${l.medicament}`} texte={texteDePosologie(l)} />
          </div>
          <Posologie ligne={l} grande />
        </article>
      ))}
      {delivrance ? (
        <p className="flex items-center gap-3 font-bold text-marque">
          <Tampon libelle="Délivrée" className="size-14" />
          Délivrée le {dateLongue(aujourdhuiAuBenin(delivrance.le))} à {heureMinute(delivrance.le)}, par {delivrance.par}.
        </p>
      ) : (
        <form action={delivrerAction}>
          <input type="hidden" name="ordonnanceId" value={ordonnance.id} />
          <input type="hidden" name="code" value={ordonnance.codeRetrait} />
          <button className="flex h-14 w-full items-center justify-center gap-2 rounded-bouton bg-marque text-lg font-bold text-white">
            <Icone nom="ph-check-circle" className="size-6" />
            Confirmer la délivrance
          </button>
        </form>
      )}
    </section>
  );
}
```

- [ ] **Étape 2 : vérifier le style, les types et le parcours**

```bash
set -o pipefail
pnpm lint && pnpm typecheck
```

Dans le navigateur (Pharmacie Sainte-Rita) :
- taper « m4r2tn » : Mariam Houngbo, Paracétamol 500 mg, posologie dessinée (matin, midi, soir), « 15 comprimés à donner » ;
- « Confirmer la délivrance » : « Délivrance confirmée » et le tampon « Délivrée » ;
- « K7P4QX » : déjà délivrée, pas de bouton ;
- « K7P4Q0 » : message sur la forme du code.

Côté Firmin, le dossier de Mariam montre le tampon « Délivrée ». Côté Codjo, le carnet de Mariam montre le Paracétamol dans ses médicaments.

- [ ] **Étape 3 : commit**

```bash
git add src/app/pharmacie
git commit -m "feat(pharmacie): ordonnance par code, posologie dessinée et délivrance confirmée"
```

---

### Tâche 14 : côté patient, code du carnet et ordonnances à retirer

**Fichiers :**
- Modifier : `src/server/requetes/carnets.ts`, `src/app/(patient)/(onglets)/carnet/page.tsx`
- Tester : `tests/server/requetes/carnets.test.ts`

**Interfaces :**
- Consomme : `ordonnancesDe` (tâche 7), `CodeRetrait`, `Posologie` (tâche 9).
- Produit : `Carnet.codeCourt: string` ; le carnet affiche le code du carnet (pour que le soignant le retrouve) et la section « À retirer à la pharmacie ».

- [ ] **Étape 1 : écrire le test qui échoue**

Dans `tests/server/requetes/carnets.test.ts`, dans le test « indique les programmes suivis et le centre de rattachement », ajouter :

```ts
    expect(carnets[0]?.codeCourt).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
```

Run : `pnpm vitest run tests/server/requetes/carnets.test.ts`
Expected : FAIL (`codeCourt` absent).

- [ ] **Étape 2 : écrire le code**

Dans `src/server/requetes/carnets.ts` : ajouter `codeCourt: string;` à l'interface `Carnet` (avec le commentaire `/** Code écrit dans le carnet papier : le soignant retrouve la personne avec. */`) et `codeCourt: patients.codeCourt,` dans le `select` de `carnetsDuCompte`.

Run : `pnpm vitest run tests/server/requetes/carnets.test.ts`
Expected : PASS.

Dans `src/app/(patient)/(onglets)/carnet/page.tsx` :

1. Imports :

```ts
import { ordonnancesDe, type OrdonnanceDetaillee } from "@/server/requetes/ordonnances";
import { CodeRetrait } from "@/ui/CodeRetrait";
import { Posologie } from "@/ui/Posologie";
```

2. Remplacer le `Promise.all` par :

```ts
  const [programmes, traitements, lesOrdonnances] = await Promise.all([
    programmesDuCarnet(db(), carnet.patientId, aujourdhui),
    traitementsDes(db(), [carnet.patientId], aujourdhui),
    ordonnancesDe(db(), carnet.patientId),
  ]);
  const aRetirer = lesOrdonnances.filter((o) => !o.delivrance);
```

3. Sous le sous-titre du bandeau (`<p className="text-sm text-lavande-3">{sousTitre}</p>`), ajouter :

```tsx
            <p className="text-xs text-lavande-3">Code du carnet : {carnet.codeCourt}</p>
```

4. Juste avant `{traitements.length > 0 && <Medicaments … />}`, ajouter :

```tsx
      {aRetirer.length > 0 && <ARetirer ordonnances={aRetirer} />}
```

5. À la fin du fichier :

```tsx
function ARetirer({ ordonnances }: { ordonnances: OrdonnanceDetaillee[] }) {
  return (
    <section aria-labelledby="a-retirer" className="flex flex-col gap-2.5">
      <h2 id="a-retirer" className="text-lg font-bold">
        À retirer à la pharmacie
      </h2>
      {ordonnances.map((o) => (
        <article key={o.id} className="flex flex-col gap-3 rounded-carte bg-white p-3.5">
          <CodeRetrait code={o.codeRetrait} libelle="Montrez ce code à la pharmacie" />
          {o.lignes.map((l) => (
            <div key={l.medicament} className="flex flex-col gap-2">
              <b>
                {l.medicament}
                {l.indication ? <small className="font-normal text-gris"> · pour {l.indication}</small> : null}
              </b>
              <Posologie ligne={l} />
            </div>
          ))}
        </article>
      ))}
    </section>
  );
}
```

- [ ] **Étape 3 : vérifier et committer**

```bash
set -o pipefail
pnpm lint && pnpm typecheck && pnpm vitest run tests/server/requetes
git add src/server/requetes/carnets.ts "src/app/(patient)/(onglets)/carnet/page.tsx" tests/server/requetes/carnets.test.ts
git commit -m "feat(patient): code du carnet et ordonnances à retirer à la pharmacie"
```

---

### Tâche 15 : vérification complète, README et mise en ligne

**Fichiers :**
- Modifier : `README.md`

- [ ] **Étape 1 : tout vérifier**

```bash
set -o pipefail
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

Expected : aucune erreur ; le build liste `/soignant`, `/soignant/patients`, `/soignant/patients/[id]`, `/soignant/patients/[id]/consultation`, `/soignant/patients/[id]/ordonnance`, `/pharmacie`.

- [ ] **Étape 2 : README**

Ajouter après la section « Espace patient » :

```markdown
## Poste soignant et pharmacie

- **Aujourd'hui** : les alertes en haut avec leur compte à rebours de 15 minutes et « Je la prends en charge » (un seul soignant la prend) ; les consultations du jour par plage, avec le risque de chacun et le tampon « VU » pour les personnes déjà vues ; les patients à surveiller. La page se met à jour seule.
- **Retrouver un patient** par son nom (sans accent), son numéro ou le code écrit dans son carnet. Un soignant ne voit que les patients de son centre.
- **Dossier** : risque et motifs (règles de la spec, valeurs indicatives), étapes des programmes, relevés, ordonnances avec leur délivrance.
- **Consultation** : tension, glycémie, poids, hémoglobine ; le risque est recalculé tout de suite (180/110 : risque élevé). Un vaccin fait coche l'étape dans le carnet de l'enfant.
- **Ordonnance** : comprimés matin, midi et soir, durée, en mots simples ; un code de 6 caractères à donner au patient.
- **Pharmacie** : le code suffit ; la pharmacie voit l'ordonnance, jamais le dossier. Posologie dessinée, écoute de la posologie, délivrance une seule fois : le tampon apparaît chez le soignant et les prises dans le carnet du patient. Code de démonstration : `M4R2TN`.
```

- [ ] **Étape 3 : pousser, suivre le déploiement, remplir la démo**

```bash
git add README.md
git commit -m "docs: le poste soignant et la pharmacie dans le README"
git push origin main
```

Suivre le déploiement lancé par Coolify (API `/deployments`) jusqu'à `finished`, puis réinitialiser la démo (POST `/api/demo/reinitialiser` avec le secret lu dans `.env`, jamais affiché).

- [ ] **Étape 4 : vérifier en production, puis remettre la démo à zéro**

Scénario §15, étapes 5 à 7 :
- Awa signale un saignement. L'alerte apparaît chez Adjoa avec son compte à rebours, et Adjoa la prend en charge.
- Firmin retrouve Codjo et saisit 180/110 : risque élevé. Il émet une ordonnance.
- La pharmacie tape le code, voit la posologie et délivre. Le tampon apparaît chez Firmin.

Réinitialiser la démo ensuite pour la laisser propre. Arrêter la base locale de vérification et supprimer `.env.local`.
