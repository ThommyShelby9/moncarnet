# Plan 5 : de la grossesse à la naissance, et le patient au quotidien — plan d'implémentation

> **Pour les agents :** sous-skill requis : superpowers:executing-plans (exécution par moi-même, sans agents, à la demande de l'utilisateur). Les étapes utilisent des cases à cocher (`- [ ]`).

**Objectif :** la démo met en avant les deux parcours usagers.
1. **Awa, enceinte de 37 semaines, jusqu'à la naissance :**
   - « Ma grossesse » semaine par semaine : taille du bébé, trimestres, consultations tamponnées, conseils à écouter ;
   - « Préparer la naissance » (plan d'accouchement) ;
   - « Le travail a commencé » dans « J'ai un problème » ;
   - la sage-femme **déclare la naissance** : le carnet du bébé est créé et rattaché à la famille, avec ses vaccins de naissance, et le suivi après l'accouchement commence pour la mère ;
   - Awa retrouve son bébé dans « Famille » et sur l'accueil.
2. **Codjo, patient au quotidien :** sa courbe de tension dans son carnet, en plus de ses médicaments et rendez-vous.

La page `/demo` présente ces deux parcours d'abord, puis les professionnels et l'État.

**Architecture :**
- domaine pur : programme `postnatal` en un fichier, suivi de la grossesse semaine par semaine, plan de naissance, lecture de la déclaration de naissance, nouveaux événements `accouchement` et `plan_naissance`, signe « Le travail a commencé » ;
- serveur : `declarerNaissance` en une transaction, plan de naissance, naissances récentes, dossier avec la mère et les enfants ;
- écrans : `/grossesse` (patient), `/soignant/patients/[id]/naissance`, courbe de tension, `/demo` réorganisée.

**Stack :** inchangée. **Spec :** §3 (personnages), §4.7, §4.9 (grossesse et naissance), §5 (programmes), §7.3 (`accouchement`), §15 (démo), mémoire « Priorités de la démo ».

## Contraintes globales
- Toutes celles des plans précédents : tests dans `tests/` écrits d'abord, français simple, charte unique, pictogramme + mot, aucune mention de l'outil dans les commits.
- Valeurs médicales **indicatives** (taille du bébé, calendrier après l'accouchement, conseils) : l'écran le dit.
- Une naissance ne se déclare qu'une fois par grossesse ; seul un soignant du centre de la mère peut la déclarer (spec §12).
- Le prénom du bébé est facultatif (il est souvent donné plus tard, lors de la sortie de l'enfant) : « Bébé » en attendant.

## Points de vigilance
1. **Naissance déclarée deux fois** (double clic, deux soignants) : la seconde est refusée, un seul carnet de bébé (tâche 3).
2. **Heure de naissance dans le futur, ou poids écrit « 3,2 »** : lecture tolérante du poids (kg ou g), heure future refusée (tâche 2).
3. **Mère qui gère d'autres carnets, ou carnet géré par un proche** : chaque compte qui gère le carnet de la mère reçoit celui du bébé (tâche 3).
4. **Awa à 37 semaines** : les tests qui supposaient 32 semaines sont mis à jour (tâche 4).

## Hors de ce plan
- Pilotage des agents de l'État et du ministère : plan 6.
- Page de présentation de la solution : plan 7.

---

## Structure des fichiers

```
src/ui/icones/svg/            + ph-baby, ph-money, ph-handbag, ph-motorcycle, ph-chart-line-up, ph-confetti, ph-bank, ph-map-trifold,
                                ph-download-simple, ph-trend-up, ph-trend-down, ph-shield-check, ph-device-mobile, ph-heartbeat (Phosphor, plein)
src/domain/programmes/postnatal.ts, types.ts (+ "postnatal"), index.ts ; risque.ts (+ règles postnatal)
src/domain/grossesse.ts       suiviDeGrossesse, ELEMENTS_PLAN, CodePlan
src/domain/naissance.ts       lireDeclarationNaissance, LIBELLES_LIEU, LIBELLES_MODE
src/domain/signes-danger.ts   + debut_travail ; evenements.ts + accouchement, plan_naissance
src/server/codes.ts           codeDuCarnetLibre (partagé)
src/server/soignant/naissance.ts        declarerNaissance
src/server/patient/plan-naissance.ts    enregistrerPlanNaissance
src/server/requetes/grossesse.ts        grossesseDe, planNaissanceDe, naissancesRecentes, tensionsDe
src/server/requetes/soignant.ts         + mere, enfants dans le dossier
src/server/demo/semer.ts, donnees.ts    Awa à 37 semaines, plan de naissance commencé, descriptions des parcours
src/app/(patient)/(onglets)/grossesse/page.tsx, PlanNaissance.tsx ; actions.ts (+ planNaissanceAction)
src/app/(patient)/(onglets)/page.tsx (carte grossesse, félicitations), carnet/page.tsx (lien, courbe de tension)
src/app/soignant/patients/[id]/naissance/page.tsx, FormulaireNaissance.tsx ; actions.ts (+ declarerNaissanceAction) ; page du dossier
src/ui/CourbeTension.tsx, src/ui/pictogrammes.ts (+ debut_travail)
src/app/demo/page.tsx          parcours d'abord
drizzle/0003_*.sql             valeur « postnatal » de l'énumération
```

---

### Tâche 1 : pictogrammes et programme « après l'accouchement »

**Fichiers :**
- Créer : `src/ui/icones/svg/ph-*.svg` (liste ci-dessus), `src/domain/programmes/postnatal.ts`, `drizzle/0003_*.sql` (généré)
- Modifier : `src/domain/programmes/types.ts`, `src/domain/programmes/index.ts`, `src/domain/risque.ts`, `src/ui/icones.ts` et `public/icons/sprite.svg` (générés)
- Tester : `tests/domain/postnatal.test.ts`

**Interfaces :**
- Produit : `CODES_PROGRAMMES` avec `"postnatal"` ; `PROGRAMMES.postnatal` (3 visites : 3ᵉ jour, 2ᵉ semaine, 6 semaines ; motif `grossesse`) ; règles de risque `postnatal` ; nouveaux `NomIcone`.

- [ ] **Étape 1 : ajouter les pictogrammes**

Télécharger les versions « fill » de Phosphor 2.1.1 (licence MIT, déjà citée dans `LICENCES.md`), puis reconstruire le sprite :

```bash
for n in baby money handbag motorcycle chart-line-up confetti bank map-trifold download-simple trend-up trend-down shield-check device-mobile heartbeat; do
  curl -sf "https://cdn.jsdelivr.net/npm/@phosphor-icons/core@2.1.1/assets/fill/$n-fill.svg" -o "src/ui/icones/svg/ph-$n.svg" || echo "absent : $n"
done
pnpm icones
```

Expected : « 75 icônes assemblées. » (61 + 14).

- [ ] **Étape 2 : écrire le test qui échoue**

Créer `tests/domain/postnatal.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { planifier } from "@/domain/calendrier";
import { PROGRAMMES } from "@/domain/programmes";
import { evaluerRisque } from "@/domain/risque";

describe("suivi après l'accouchement", () => {
  it("prévoit les visites du 3ᵉ jour, de la 2ᵉ semaine et des 6 semaines", () => {
    const etapes = planifier(PROGRAMMES.postnatal, "2026-09-26", "2026-09-26");
    expect(etapes.map((e) => [e.code, e.datePrevue, e.motif])).toEqual([
      ["cpon1", "2026-09-29", "grossesse"],
      ["cpon2", "2026-10-06", "grossesse"],
      ["cpon3", "2026-11-07", "grossesse"],
    ]);
  });

  it("voit un risque élevé quand la tension monte après l'accouchement", () => {
    const contexte = { aujourdhui: "2026-10-01", dateNaissance: "2002-04-18", antecedents: {}, etapesManquees: 0, signalementsOuverts: 0 };
    expect(evaluerRisque("postnatal", { ...contexte, mesures: [{ date: "2026-09-30", tensionSys: 150, tensionDia: 95 }] })).toEqual({
      niveau: "eleve",
      motifs: ["Tension élevée après l'accouchement (150/95)"],
    });
    expect(evaluerRisque("postnatal", { ...contexte, mesures: [], signalementsOuverts: 1 }).niveau).toBe("eleve");
    expect(evaluerRisque("postnatal", { ...contexte, mesures: [] })).toEqual({ niveau: "normal", motifs: [] });
  });
});
```

Run : `pnpm vitest run tests/domain/postnatal.test.ts`
Expected : FAIL (`PROGRAMMES.postnatal` indéfini).

- [ ] **Étape 3 : écrire le programme**

Dans `src/domain/programmes/types.ts` : `export const CODES_PROGRAMMES = ["consultation", "hypertension", "grossesse", "vaccination", "diabete", "postnatal"] as const;`

Créer `src/domain/programmes/postnatal.ts` :

```ts
import type { DefinitionEtape, Programme } from "./types";

function visite(code: string, libelle: string, cible: number, debut: number, fin: number): DefinitionEtape {
  return { code, libelle, cibleJours: cible, debutFenetreJours: debut, finFenetreJours: fin, toleranceManqueJours: 7, motif: "grossesse", rendezVous: true };
}

/** Après l'accouchement, la mère est revue au 3ᵉ jour, dans la 2ᵉ semaine et à 6 semaines (valeurs indicatives). */
const ETAPES: DefinitionEtape[] = [
  visite("cpon1", "Visite du 3ᵉ jour après la naissance", 3, 1, 6),
  visite("cpon2", "Visite de la 2ᵉ semaine après la naissance", 10, 7, 14),
  visite("cpon3", "Visite des 6 semaines après la naissance", 42, 35, 56),
];

export const postnatal: Programme = {
  code: "postnatal",
  nom: "Suivi après l'accouchement",
  libelleReference: "Date de l'accouchement",
  etapes: () => ETAPES,
};
```

Dans `src/domain/programmes/index.ts`, importer `postnatal` et l'ajouter à `PROGRAMMES`.

Dans `src/domain/risque.ts`, ajouter à `REGLES` :

```ts
  postnatal: (c) => {
    const derniere = releves(c.mesures, "tensionSys").at(-1);
    return [
      derniere && tensionAuMoins(derniere, 140, 90) ? eleve(`Tension élevée après l'accouchement (${tension(derniere)})`) : null,
      c.signalementsOuverts > 0 ? eleve("Signe de danger non pris en charge") : null,
      manques(c),
    ];
  },
```

Générer la migration de l'énumération :

```bash
pnpm db:generate --name suivi_postnatal
cat drizzle/0003_suivi_postnatal.sql
```

Expected : `ALTER TYPE "public"."code_programme" ADD VALUE 'postnatal';`

- [ ] **Étape 4 : relancer les tests, vérifier les types**

Run : `pnpm vitest run tests/domain && pnpm typecheck`
Expected : PASS. Toute table `Record<CodeProgramme, …>` signalée par le compilateur reçoit son entrée `postnatal`, avec le motif « grossesse » et le libellé « Après l'accouchement ».

- [ ] **Étape 5 : commit**

```bash
git add src/ui/icones src/ui/icones.ts public/icons src/domain drizzle tests/domain/postnatal.test.ts
git commit -m "feat(domaine): suivi après l'accouchement en un fichier ; nouveaux pictogrammes"
```

---

### Tâche 2 : la grossesse semaine par semaine, le plan de naissance, la déclaration de naissance

**Fichiers :**
- Créer : `src/domain/grossesse.ts`, `src/domain/naissance.ts`
- Modifier : `src/domain/evenements.ts`, `src/domain/signes-danger.ts`, `src/ui/pictogrammes.ts`
- Tester : `tests/domain/grossesse.test.ts`, `tests/domain/naissance.test.ts`, `tests/domain/evenements.test.ts`

**Interfaces :**
- Produit :
  - `suiviDeGrossesse(ddr, aujourdhui): SuiviDeGrossesse` avec `{ semaines, jours, trimestre, terme, joursAvantTerme, taille: { semaine, cm, grammes, comme }, conseils: string[] }` ;
  - `ELEMENTS_PLAN` (`lieu`, `transport`, `accompagnant`, `argent`, `sac`, `sang`), `type CodePlan`, `CODES_PLAN` ;
  - `LIEUX_NAISSANCE`, `MODES_NAISSANCE`, `LIBELLES_LIEU`, `LIBELLES_MODE`, `type DeclarationNaissance`, `lireDeclarationNaissance(champs, maintenant)` ;
  - événements `accouchement { le, lieu, mode, enfant: { id, sexe, poidsGrammes } }` et `plan_naissance { elements }` ;
  - signe `debut_travail` (« Le travail a commencé »), proposé pendant la grossesse.

- [ ] **Étape 1 : écrire les tests qui échouent**

Créer `tests/domain/grossesse.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { ajouterJours } from "@/domain/dates";
import { CODES_PLAN, suiviDeGrossesse } from "@/domain/grossesse";

const aujourdhui = "2026-09-26";

describe("suiviDeGrossesse", () => {
  it("dit la semaine, le trimestre, le terme et la taille du bébé", () => {
    const suivi = suiviDeGrossesse(ajouterJours(aujourdhui, -(37 * 7 + 2)), aujourdhui);
    expect(suivi).toMatchObject({ semaines: 37, jours: 2, trimestre: 3, joursAvantTerme: 19, terme: "2026-10-15" });
    expect(suivi.taille).toEqual({ semaine: 36, cm: 47, grammes: 2600, comme: "une igname" });
    expect(suivi.conseils[0]).toContain("Préparez la naissance");
  });

  it("change de conseils selon le trimestre", () => {
    expect(suiviDeGrossesse(ajouterJours(aujourdhui, -70), aujourdhui)).toMatchObject({ semaines: 10, trimestre: 1 });
    expect(suiviDeGrossesse(ajouterJours(aujourdhui, -70), aujourdhui).conseils[0]).toContain("fer");
    expect(suiviDeGrossesse(ajouterJours(aujourdhui, -20 * 7), aujourdhui)).toMatchObject({ trimestre: 2, taille: { comme: "une mangue" } });
  });
});

describe("plan de naissance", () => {
  it("propose six choses à préparer", () => {
    expect(CODES_PLAN).toEqual(["lieu", "transport", "accompagnant", "argent", "sac", "sang"]);
  });
});
```

Créer `tests/domain/naissance.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { lireDeclarationNaissance } from "@/domain/naissance";

const maintenant = new Date("2026-09-26T10:00:00Z");
const base = { date: "2026-09-26", heure: "06:40", lieu: "centre", mode: "voie_basse", sexe: "F", prenom: "", poids: "3,2", vaccins: "on" };

describe("lireDeclarationNaissance", () => {
  it("lit l'heure du Bénin, le poids en kilos, les vaccins faits", () => {
    expect(lireDeclarationNaissance(base, maintenant)).toEqual({
      ok: true,
      saisie: { le: new Date("2026-09-26T05:40:00Z"), lieu: "centre", mode: "voie_basse", sexe: "F", prenom: null, poidsGrammes: 3200, vaccinsNaissance: true },
    });
  });

  it("accepte le poids en grammes et un prénom", () => {
    expect(lireDeclarationNaissance({ ...base, poids: "2950", prenom: " Sènami ", vaccins: undefined }, maintenant)).toMatchObject({
      ok: true,
      saisie: { poidsGrammes: 2950, prenom: "Sènami", vaccinsNaissance: false },
    });
  });

  it("explique ce qui ne va pas", () => {
    expect(lireDeclarationNaissance({ ...base, heure: "14:00" }, maintenant)).toEqual({ ok: false, message: "L'heure de naissance est dans le futur." });
    expect(lireDeclarationNaissance({ ...base, poids: "" }, maintenant)).toEqual({ ok: false, message: "Indiquez le poids du bébé, par exemple 3,2 kg." });
    expect(lireDeclarationNaissance({ ...base, poids: "12" }, maintenant)).toEqual({ ok: false, message: "Indiquez le poids du bébé, par exemple 3,2 kg." });
    expect(lireDeclarationNaissance({ ...base, sexe: "" }, maintenant)).toEqual({ ok: false, message: "Vérifiez : le sexe." });
    expect(lireDeclarationNaissance({ ...base, date: "2026-07-01" }, maintenant)).toEqual({ ok: false, message: "La naissance date de plus de 30 jours : voyez l'état civil." });
  });
});
```

Dans `tests/domain/evenements.test.ts`, ajouter dans le `describe` :

```ts
  it("accepte un accouchement et un plan de naissance", () => {
    const enfant = { id: "0b8f5c1e-3f8a-4b3a-9a57-6f1f2c3d4e5f", sexe: "F", poidsGrammes: 3200 };
    expect(evenementSchema.safeParse({ type: "accouchement", donnees: { le: "2026-09-26T05:40:00.000Z", lieu: "centre", mode: "voie_basse", enfant } }).success).toBe(true);
    expect(evenementSchema.safeParse({ type: "accouchement", donnees: { le: "2026-09-26T05:40:00.000Z", lieu: "lune", mode: "voie_basse", enfant } }).success).toBe(false);
    expect(evenementSchema.safeParse({ type: "plan_naissance", donnees: { elements: ["lieu", "sac"] } }).success).toBe(true);
    expect(evenementSchema.safeParse({ type: "plan_naissance", donnees: { elements: ["piscine"] } }).success).toBe(false);
  });

  it("connaît le début du travail parmi les signes de danger", () => {
    expect(evenementSchema.safeParse({ type: "signalement_danger", donnees: { signes: ["debut_travail"], source: "patient" } }).success).toBe(true);
  });
```

Run : `pnpm vitest run tests/domain`
Expected : FAIL (modules `grossesse`, `naissance` introuvables ; types d'événements inconnus).

- [ ] **Étape 2 : écrire le code**

Créer `src/domain/grossesse.ts` :

```ts
import { joursEntre, type DateISO } from "./dates";
import { termePrevu } from "./programmes/grossesse";

export interface Taille {
  semaine: number;
  cm: number;
  grammes: number;
  /** Comparaison avec ce qu'on trouve au marché : plus parlant qu'un chiffre. */
  comme: string;
}

/** Taille (tête-talons) et poids moyens du bébé : valeurs indicatives. */
const TAILLES: Taille[] = [
  { semaine: 8, cm: 1.6, grammes: 1, comme: "un grain d'arachide" },
  { semaine: 12, cm: 6, grammes: 14, comme: "une noix de cola" },
  { semaine: 16, cm: 12, grammes: 100, comme: "un citron" },
  { semaine: 20, cm: 25, grammes: 300, comme: "une mangue" },
  { semaine: 24, cm: 30, grammes: 600, comme: "un épi de maïs" },
  { semaine: 28, cm: 37, grammes: 1000, comme: "une papaye" },
  { semaine: 32, cm: 42, grammes: 1700, comme: "un ananas" },
  { semaine: 36, cm: 47, grammes: 2600, comme: "une igname" },
  { semaine: 40, cm: 51, grammes: 3400, comme: "une petite pastèque" },
];

const CONSEILS: Record<1 | 2 | 3, string[]> = {
  1: [
    "Prenez chaque jour le fer et l'acide folique donnés au centre.",
    "Dormez sous une moustiquaire imprégnée : le paludisme est dangereux pendant la grossesse.",
    "Faites votre première consultation avant la 12ᵉ semaine.",
  ],
  2: [
    "À chaque consultation, prenez le traitement contre le paludisme donné au centre.",
    "Mangez des haricots, des légumes-feuilles et du poisson : ils donnent du fer.",
    "Le bébé bouge : s'il bouge moins, venez au centre.",
  ],
  3: [
    "Préparez la naissance : où accoucher, comment y aller, qui vous accompagne.",
    "Si vous perdez de l'eau ou du sang, ou si le bébé bouge moins : venez tout de suite.",
    "Allez à toutes les consultations, jusqu'au bout.",
  ],
};

export interface SuiviDeGrossesse {
  semaines: number;
  jours: number;
  trimestre: 1 | 2 | 3;
  terme: DateISO;
  joursAvantTerme: number;
  taille: Taille;
  conseils: string[];
}

/** La grossesse semaine par semaine, à partir de la date des dernières règles. */
export function suiviDeGrossesse(ddr: DateISO, aujourdhui: DateISO): SuiviDeGrossesse {
  const ecoule = Math.max(0, joursEntre(ddr, aujourdhui));
  const semaines = Math.floor(ecoule / 7);
  const trimestre = semaines < 14 ? 1 : semaines < 28 ? 2 : 3;
  const terme = termePrevu(ddr);
  return {
    semaines,
    jours: ecoule % 7,
    trimestre,
    terme,
    joursAvantTerme: joursEntre(aujourdhui, terme),
    taille: [...TAILLES].reverse().find((t) => t.semaine <= semaines) ?? TAILLES[0]!,
    conseils: CONSEILS[trimestre],
  };
}

/** « Préparer la naissance » : ce qu'il faut avoir prévu avant le jour J (plan d'accouchement). */
export const ELEMENTS_PLAN = [
  { code: "lieu", libelle: "Je sais où accoucher", detail: "À la maternité du centre de santé, avec une sage-femme" },
  { code: "transport", libelle: "J'ai prévu comment y aller, même la nuit", detail: "Un zémidjan ou un taxi, et son numéro" },
  { code: "accompagnant", libelle: "Quelqu'un m'accompagnera", detail: "Mon mari, ma mère, une amie" },
  { code: "argent", libelle: "J'ai mis de l'argent de côté", detail: "Pour le transport et les soins" },
  { code: "sac", libelle: "Mon sac est prêt", detail: "Pagnes, layette, savon, serviettes, et ce carnet" },
  { code: "sang", libelle: "Un proche peut donner son sang", detail: "Au cas où il en faudrait" },
] as const;
export type CodePlan = (typeof ELEMENTS_PLAN)[number]["code"];
export const CODES_PLAN = ELEMENTS_PLAN.map((e) => e.code) as [CodePlan, ...CodePlan[]];
```

Créer `src/domain/naissance.ts` :

```ts
import { z } from "zod";

export const LIEUX_NAISSANCE = ["centre", "domicile", "route", "hopital"] as const;
export const MODES_NAISSANCE = ["voie_basse", "cesarienne"] as const;
export type LieuNaissance = (typeof LIEUX_NAISSANCE)[number];
export type ModeNaissance = (typeof MODES_NAISSANCE)[number];

export const LIBELLES_LIEU: Record<LieuNaissance, string> = {
  centre: "Au centre de santé",
  domicile: "À la maison",
  route: "En route",
  hopital: "À l'hôpital",
};
export const LIBELLES_MODE: Record<ModeNaissance, string> = { voie_basse: "Voie basse", cesarienne: "Césarienne" };

export interface DeclarationNaissance {
  le: Date;
  lieu: LieuNaissance;
  mode: ModeNaissance;
  sexe: "F" | "M";
  /** Souvent donné plus tard, à la sortie de l'enfant : « Bébé » en attendant. */
  prenom: string | null;
  poidsGrammes: number;
  vaccinsNaissance: boolean;
}

const schema = z.object({
  date: z.iso.date(),
  heure: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  lieu: z.enum(LIEUX_NAISSANCE),
  mode: z.enum(MODES_NAISSANCE),
  sexe: z.enum(["F", "M"]),
  prenom: z.string().trim().max(60).optional(),
  poids: z.string().optional(),
  vaccins: z.string().optional(),
});

const LIBELLES_CHAMPS: Record<string, string> = { date: "la date", heure: "l'heure", lieu: "le lieu", mode: "le mode d'accouchement", sexe: "le sexe" };
const MESSAGE_POIDS = "Indiquez le poids du bébé, par exemple 3,2 kg.";

/** « 3,2 » ou « 3.2 » : des kilos ; « 3200 » : des grammes. */
function lirePoids(saisie: string | undefined): number | null {
  const nombre = Number((saisie ?? "").trim().replace(",", "."));
  if (!saisie?.trim() || !Number.isFinite(nombre) || nombre <= 0) return null;
  const grammes = Math.round(nombre < 10 ? nombre * 1000 : nombre);
  return grammes >= 400 && grammes <= 6500 ? grammes : null;
}

/** Déclaration de naissance saisie par la sage-femme ; l'heure est celle du Bénin (UTC+1). */
export function lireDeclarationNaissance(
  champs: Record<string, string | undefined>,
  maintenant: Date,
): { ok: true; saisie: DeclarationNaissance } | { ok: false; message: string } {
  const lecture = schema.safeParse(Object.fromEntries(Object.entries(champs).filter(([, v]) => v !== "")));
  if (!lecture.success) {
    const aVerifier = [...new Set(lecture.error.issues.map((p) => LIBELLES_CHAMPS[String(p.path[0])] ?? String(p.path[0])))];
    return { ok: false, message: `Vérifiez : ${aVerifier.join(", ")}.` };
  }
  const s = lecture.data;
  const le = new Date(`${s.date}T${s.heure}:00+01:00`);
  if (le.getTime() > maintenant.getTime() + 5 * 60_000) return { ok: false, message: "L'heure de naissance est dans le futur." };
  if (maintenant.getTime() - le.getTime() > 30 * 86_400_000) return { ok: false, message: "La naissance date de plus de 30 jours : voyez l'état civil." };
  const poidsGrammes = lirePoids(s.poids);
  if (poidsGrammes === null) return { ok: false, message: MESSAGE_POIDS };
  return {
    ok: true,
    saisie: { le, lieu: s.lieu, mode: s.mode, sexe: s.sexe, prenom: s.prenom || null, poidsGrammes, vaccinsNaissance: s.vaccins === "on" },
  };
}
```

Dans `src/domain/signes-danger.ts` : ajouter `"debut_travail"` à `CODES_SIGNES` (après `"perte_des_eaux"`), `debut_travail: "Le travail a commencé"` à `LIBELLES_SIGNES`, et `"debut_travail"` dans la liste `GROSSESSE` (en 1ʳᵉ position : c'est le signe le plus fréquent en fin de grossesse). Dans `src/ui/pictogrammes.ts`, `debut_travail: "ph-baby"`.

Dans `src/domain/evenements.ts` : importer `CODES_PLAN` (`./grossesse`) et `LIEUX_NAISSANCE`, `MODES_NAISSANCE` (`./naissance`), puis ajouter à l'union :

```ts
  z.object({
    type: z.literal("accouchement"),
    donnees: z.object({
      le: z.iso.datetime({ offset: true }),
      lieu: z.enum(LIEUX_NAISSANCE),
      mode: z.enum(MODES_NAISSANCE),
      enfant: z.object({ id: z.uuid(), sexe: z.enum(["F", "M"]), poidsGrammes: z.number().int().min(400).max(6500) }),
    }),
  }),
  z.object({
    type: z.literal("plan_naissance"),
    donnees: z.object({ elements: z.array(z.enum(CODES_PLAN)).max(CODES_PLAN.length) }),
  }),
```

- [ ] **Étape 3 : relancer les tests, vérifier les types**

Run : `pnpm vitest run tests/domain tests/ui && pnpm typecheck`
Expected : PASS (un test existant qui fige la liste des signes de grossesse est mis à jour avec `debut_travail` en tête).

- [ ] **Étape 4 : commit**

```bash
git add src/domain src/ui/pictogrammes.ts tests/domain tests/ui
git commit -m "feat(domaine): grossesse semaine par semaine, plan de naissance, déclaration de naissance, début du travail"
```

---

### Tâche 3 : déclarer la naissance (serveur), plan de naissance, naissances récentes

**Fichiers :**
- Créer : `src/server/codes.ts`, `src/server/soignant/naissance.ts`, `src/server/patient/plan-naissance.ts`, `src/server/requetes/grossesse.ts`
- Modifier : `src/server/relais/inscription.ts` (utilise `codeDuCarnetLibre`), `src/server/requetes/soignant.ts` (mère et enfants)
- Tester : `tests/server/naissance.test.ts`

**Interfaces :**
- Consomme : `DeclarationNaissance`, `CodePlan` (tâche 2), `inscrireAuProgramme`, `patientDuCentre`, `lienAvecPatient`.
- Produit :
  - `codeDuCarnetLibre(db): Promise<string>` ;
  - `declarerNaissance(db, { auteur, mereId, saisie, bebeId?, evenementId? }): Promise<Resultat<{ bebeId: string }, "interdit" | "pas_de_grossesse">>` ;
  - `enregistrerPlanNaissance(db, { compteId, patientId, elements, maintenant? }): Promise<Resultat<null, "interdit" | "invalide">>` ;
  - `grossesseDe(db, patientId): Promise<{ ddr: DateISO } | null>` ;
  - `planNaissanceDe(db, patientId): Promise<CodePlan[]>` ;
  - `naissancesRecentes(db, meres: string[], depuis: Date): Promise<{ mereId; bebeId; prenom; sexe; le: Date }[]>` ;
  - `tensionsDe(db, patientId): Promise<{ date: DateISO; sys: number; dia: number }[]>` (les 8 derniers relevés, du plus ancien au plus récent) ;
  - `Dossier.mere: { id; prenom; nom } | null`, `Dossier.enfants: { id; prenom; libelleAge }[]`.

- [ ] **Étape 1 : écrire les tests qui échouent**

Créer `tests/server/naissance.test.ts` :

```ts
import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/server/db/client";
import { comptes, evenements, inscriptions, patients, responsables } from "@/server/db/schema";
import { semerDemo } from "@/server/demo/semer";
import { enregistrerPlanNaissance } from "@/server/patient/plan-naissance";
import { carnetsDuCompte } from "@/server/requetes/carnets";
import { grossesseDe, naissancesRecentes, planNaissanceDe, tensionsDe } from "@/server/requetes/grossesse";
import { dossierPatient } from "@/server/requetes/soignant";
import { declarerNaissance } from "@/server/soignant/naissance";
import { creerDbDeTest } from "../aides/base-de-test";
import { COMPTE, idCompte, idPatient } from "../aides/demo";

const aujourdhui = "2026-09-26";
let db: Db;
let fermer: () => Promise<void>;
let adjoa: { id: string; etablissementId: string | null };
let awa: string;

beforeAll(async () => {
  ({ db, fermer } = await creerDbDeTest());
  await semerDemo(db, { aujourdhui });
  const [compte] = await db.select().from(comptes).where(eq(comptes.identifiant, "adjoa.gbaguidi"));
  adjoa = { id: compte!.id, etablissementId: compte!.etablissementId };
  awa = await idPatient(db, "Awa");
});
afterAll(async () => fermer());

const saisie = { le: new Date("2026-09-26T05:40:00Z"), lieu: "centre", mode: "voie_basse", sexe: "F", prenom: null, poidsGrammes: 3200, vaccinsNaissance: true } as const;

describe("plan de naissance", () => {
  it("garde ce qu'Awa a déjà préparé, et seulement pour les carnets qu'elle gère", async () => {
    expect(await grossesseDe(db, awa)).toMatchObject({ ddr: expect.any(String) });
    const compteAwa = await idCompte(db, COMPTE.awa);
    expect(await enregistrerPlanNaissance(db, { compteId: compteAwa, patientId: awa, elements: ["lieu", "transport", "sac"] })).toEqual({ ok: true, donnees: null });
    expect(await planNaissanceDe(db, awa)).toEqual(["lieu", "transport", "sac"]);
    expect(await enregistrerPlanNaissance(db, { compteId: await idCompte(db, COMPTE.codjo), patientId: awa, elements: [] })).toEqual({ ok: false, erreur: "interdit" });
  });
});

describe("declarerNaissance", () => {
  it("refuse un soignant d'un autre centre", async () => {
    expect(await declarerNaissance(db, { auteur: { id: adjoa.id, etablissementId: null }, mereId: awa, saisie })).toEqual({ ok: false, erreur: "interdit" });
  });

  it("crée le carnet du bébé, rattaché à la mère et à sa famille, avec ses vaccins de naissance", async () => {
    const r = await declarerNaissance(db, { auteur: adjoa, mereId: awa, saisie });
    expect(r.ok).toBe(true);
    const bebeId = r.ok ? r.donnees.bebeId : "";
    const [bebe] = await db.select().from(patients).where(eq(patients.id, bebeId));
    expect(bebe).toMatchObject({ prenom: "Bébé", nom: "Hounkpatin", sexe: "F", dateNaissance: "2026-09-26", mereId: awa });
    // Le compte d'Awa gère maintenant le carnet de son bébé.
    const carnets = await carnetsDuCompte(db, await idCompte(db, COMPTE.awa), aujourdhui);
    expect(carnets.find((c) => c.patientId === bebeId)).toMatchObject({ lien: "parent", programmes: ["vaccination"] });
    const vaccins = await db.select().from(evenements).where(and(eq(evenements.patientId, bebeId), eq(evenements.type, "vaccination")));
    expect(vaccins).toEqual([expect.objectContaining({ donnees: { etape: "naissance", vaccins: ["BCG", "VPO0"] } })]);
    // La grossesse est close ; le suivi après l'accouchement commence.
    const suivis = await db.select().from(inscriptions).where(eq(inscriptions.patientId, awa));
    expect(suivis.find((i) => i.programme === "grossesse")?.active).toBe(false);
    expect(suivis.find((i) => i.programme === "postnatal")).toMatchObject({ active: true, dateReference: "2026-09-26" });
    expect(await naissancesRecentes(db, [awa], new Date("2026-09-20T00:00:00Z"))).toEqual([
      { mereId: awa, bebeId, prenom: "Bébé", sexe: "F", le: saisie.le },
    ]);
    const dossierBebe = await dossierPatient(db, adjoa.etablissementId!, bebeId, aujourdhui);
    expect(dossierBebe?.mere).toMatchObject({ id: awa, prenom: "Awa" });
    expect((await dossierPatient(db, adjoa.etablissementId!, awa, aujourdhui))?.enfants).toEqual([expect.objectContaining({ id: bebeId, prenom: "Bébé" })]);
  });

  it("ne déclare la naissance qu'une fois", async () => {
    expect(await declarerNaissance(db, { auteur: adjoa, mereId: awa, saisie })).toEqual({ ok: false, erreur: "pas_de_grossesse" });
    const bebes = await db.select().from(patients).where(eq(patients.mereId, awa));
    expect(bebes).toHaveLength(1);
    expect(await db.select().from(responsables).where(eq(responsables.patientId, bebes[0]!.id))).toHaveLength(1);
  });
});

describe("tensionsDe", () => {
  it("donne les relevés de tension de Codjo, du plus ancien au plus récent", async () => {
    const tensions = await tensionsDe(db, await idPatient(db, "Codjo"));
    expect(tensions.length).toBeGreaterThanOrEqual(3);
    expect(tensions.at(-1)).toMatchObject({ sys: 145, dia: 92 });
    expect(tensions.map((t) => t.date)).toEqual([...tensions.map((t) => t.date)].sort());
  });
});
```


Run : `pnpm vitest run tests/server/naissance.test.ts`
Expected : FAIL (modules introuvables).

- [ ] **Étape 2 : écrire le code**

Créer `src/server/codes.ts` :

```ts
import { eq } from "drizzle-orm";
import { genererCodeRetrait } from "@/domain/ordonnances";
import type { Db } from "./db/client";
import { patients } from "./db/schema";

/** Code écrit dans le carnet (même format que le code de retrait) : on en tire un autre s'il est déjà pris. */
export async function codeDuCarnetLibre(db: Pick<Db, "select">): Promise<string> {
  for (;;) {
    const code = genererCodeRetrait();
    const [pris] = await db.select({ id: patients.id }).from(patients).where(eq(patients.codeCourt, code)).limit(1);
    if (!pris) return code;
  }
}
```

Dans `src/server/relais/inscription.ts`, supprimer la fonction locale `codeDuCarnetLibre` et l'import de `genererCodeRetrait`, puis importer `codeDuCarnetLibre` depuis `../codes`.

Créer `src/server/soignant/naissance.ts` :

```ts
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { aujourdhuiAuBenin } from "@/domain/dates";
import type { DeclarationNaissance } from "@/domain/naissance";
import { codeDuCarnetLibre } from "../codes";
import type { Db } from "../db/client";
import { contacts, evenements, inscriptions, patients, responsables } from "../db/schema";
import { patientDuCentre } from "../droits";
import { inscrireAuProgramme } from "../inscriptions";
import { echec, reussite, type Resultat } from "../resultat";
import type { Soignant } from "./consultation";

/**
 * Naissance déclarée par la sage-femme : la grossesse se clôt, le suivi après l'accouchement commence pour la mère,
 * et le carnet du bébé est créé, rattaché à la famille, avec son calendrier de vaccins (spec §4.9).
 */
export async function declarerNaissance(
  db: Db,
  e: { auteur: Soignant; mereId: string; saisie: DeclarationNaissance; bebeId?: string; evenementId?: string },
): Promise<Resultat<{ bebeId: string }, "interdit" | "pas_de_grossesse">> {
  if (!(await patientDuCentre(db, e.auteur.etablissementId, e.mereId))) return echec("interdit");
  const [grossesse] = await db
    .select({ id: inscriptions.id })
    .from(inscriptions)
    .where(and(eq(inscriptions.patientId, e.mereId), eq(inscriptions.programme, "grossesse"), eq(inscriptions.active, true)));
  if (!grossesse) return echec("pas_de_grossesse");
  const [mere] = await db.select().from(patients).where(eq(patients.id, e.mereId));
  if (!mere) return echec("interdit");
  const [liens, telephones, codeCourt] = await Promise.all([
    db.select({ compteId: responsables.compteId, lien: responsables.lien }).from(responsables).where(eq(responsables.patientId, e.mereId)),
    db.select({ telephone: contacts.telephone }).from(contacts).where(and(eq(contacts.patientId, e.mereId), eq(contacts.role, "principal"))),
    codeDuCarnetLibre(db),
  ]);
  const s = e.saisie;
  const bebeId = e.bebeId ?? randomUUID();
  const dateNaissance = aujourdhuiAuBenin(s.le);

  return db.transaction(async (tx) => {
    // Deux déclarations en même temps : une seule clôt la grossesse.
    const close = await tx
      .update(inscriptions)
      .set({ active: false })
      .where(and(eq(inscriptions.id, grossesse.id), eq(inscriptions.active, true)))
      .returning({ id: inscriptions.id });
    if (close.length === 0) return echec("pas_de_grossesse");
    await tx.insert(evenements).values({
      id: e.evenementId ?? randomUUID(),
      patientId: e.mereId,
      type: "accouchement",
      auteurId: e.auteur.id,
      survenuLe: s.le,
      donnees: { le: s.le.toISOString(), lieu: s.lieu, mode: s.mode, enfant: { id: bebeId, sexe: s.sexe, poidsGrammes: s.poidsGrammes } },
    });
    await inscrireAuProgramme(tx, {
      patientId: e.mereId,
      etablissementId: mere.etablissementId,
      programme: "postnatal",
      dateReference: dateNaissance,
      dateInscription: dateNaissance,
      source: "programme",
    });
    await tx.insert(patients).values({
      id: bebeId,
      foyerId: mere.foyerId,
      prenom: s.prenom ?? "Bébé",
      nom: mere.nom,
      dateNaissance,
      sexe: s.sexe,
      langue: mere.langue,
      canalPrefere: mere.canalPrefere,
      codeCourt,
      etablissementId: mere.etablissementId,
      mereId: e.mereId,
    });
    if (telephones[0]) await tx.insert(contacts).values({ patientId: bebeId, telephone: telephones[0].telephone, role: "principal", proprietaire: "proche" });
    if (liens.length) {
      await tx.insert(responsables).values(liens.map((l) => ({ compteId: l.compteId, patientId: bebeId, lien: l.lien === "soi" ? ("parent" as const) : ("aidant" as const) })));
    }
    await inscrireAuProgramme(tx, {
      patientId: bebeId,
      etablissementId: mere.etablissementId,
      programme: "vaccination",
      dateReference: dateNaissance,
      dateInscription: dateNaissance,
      source: "programme",
    });
    await tx.insert(evenements).values({
      id: randomUUID(),
      patientId: bebeId,
      type: "mesure",
      auteurId: e.auteur.id,
      survenuLe: s.le,
      donnees: { mesures: { poidsKg: s.poidsGrammes / 1000 } },
    });
    if (s.vaccinsNaissance) {
      await tx.insert(evenements).values({
        id: randomUUID(),
        patientId: bebeId,
        type: "vaccination",
        auteurId: e.auteur.id,
        survenuLe: s.le,
        donnees: { etape: "naissance", vaccins: ["BCG", "VPO0"] },
      });
    }
    return reussite({ bebeId });
  });
}
```

Créer `src/server/patient/plan-naissance.ts` :

```ts
import { randomUUID } from "node:crypto";
import { evenementSchema } from "@/domain/evenements";
import type { CodePlan } from "@/domain/grossesse";
import type { Db } from "../db/client";
import { evenements } from "../db/schema";
import { lienAvecPatient } from "../droits";
import { echec, reussite, type Resultat } from "../resultat";

/** « Préparer la naissance » : chaque changement est gardé ; le dernier fait foi. */
export async function enregistrerPlanNaissance(
  db: Db,
  e: { compteId: string; patientId: string; elements: CodePlan[]; maintenant?: Date },
): Promise<Resultat<null, "interdit" | "invalide">> {
  if (!(await lienAvecPatient(db, e.compteId, e.patientId))) return echec("interdit");
  const evenement = evenementSchema.safeParse({ type: "plan_naissance", donnees: { elements: [...new Set(e.elements)] } });
  if (!evenement.success) return echec("invalide");
  await db.insert(evenements).values({
    id: randomUUID(),
    patientId: e.patientId,
    type: "plan_naissance",
    auteurId: e.compteId,
    survenuLe: e.maintenant ?? new Date(),
    donnees: evenement.data.donnees,
  });
  return reussite(null);
}
```

Créer `src/server/requetes/grossesse.ts` :

```ts
import { and, asc, desc, eq, gte, inArray } from "drizzle-orm";
import { aujourdhuiAuBenin, type DateISO } from "@/domain/dates";
import type { CodePlan } from "@/domain/grossesse";
import type { Db } from "../db/client";
import { evenements, inscriptions, patients } from "../db/schema";

/** Grossesse en cours : la date des dernières règles, ou null. */
export async function grossesseDe(db: Db, patientId: string): Promise<{ ddr: DateISO } | null> {
  const [g] = await db
    .select({ ddr: inscriptions.dateReference })
    .from(inscriptions)
    .where(and(eq(inscriptions.patientId, patientId), eq(inscriptions.programme, "grossesse"), eq(inscriptions.active, true)));
  return g ?? null;
}

export async function planNaissanceDe(db: Db, patientId: string): Promise<CodePlan[]> {
  const [dernier] = await db
    .select({ donnees: evenements.donnees })
    .from(evenements)
    .where(and(eq(evenements.patientId, patientId), eq(evenements.type, "plan_naissance")))
    .orderBy(desc(evenements.survenuLe), desc(evenements.recuLe))
    .limit(1);
  return (dernier?.donnees.elements as CodePlan[] | undefined) ?? [];
}

/** Naissances déclarées depuis une date, pour féliciter la famille sur l'accueil. */
export async function naissancesRecentes(
  db: Db,
  meres: string[],
  depuis: Date,
): Promise<{ mereId: string; bebeId: string; prenom: string; sexe: "F" | "M"; le: Date }[]> {
  if (meres.length === 0) return [];
  const lignes = await db
    .select({ mereId: evenements.patientId, donnees: evenements.donnees, le: evenements.survenuLe })
    .from(evenements)
    .where(and(inArray(evenements.patientId, meres), eq(evenements.type, "accouchement"), gte(evenements.survenuLe, depuis)));
  const bebeIds = lignes.map((l) => (l.donnees.enfant as { id: string }).id);
  const bebes = bebeIds.length ? await db.select({ id: patients.id, prenom: patients.prenom, sexe: patients.sexe }).from(patients).where(inArray(patients.id, bebeIds)) : [];
  return lignes.flatMap((l) => {
    const bebe = bebes.find((b) => b.id === (l.donnees.enfant as { id: string }).id);
    return bebe ? [{ mereId: l.mereId, bebeId: bebe.id, prenom: bebe.prenom, sexe: bebe.sexe, le: l.le }] : [];
  });
}

/** Relevés de tension (consultations et relevés), les 8 derniers, du plus ancien au plus récent. */
export async function tensionsDe(db: Db, patientId: string): Promise<{ date: DateISO; sys: number; dia: number }[]> {
  const lignes = await db
    .select({ donnees: evenements.donnees, le: evenements.survenuLe })
    .from(evenements)
    .where(and(eq(evenements.patientId, patientId), inArray(evenements.type, ["consultation", "mesure"])))
    .orderBy(asc(evenements.survenuLe));
  return lignes
    .flatMap((l) => {
      const m = l.donnees.mesures as { tensionSys?: number; tensionDia?: number } | undefined;
      return m?.tensionSys && m.tensionDia ? [{ date: aujourdhuiAuBenin(l.le), sys: m.tensionSys, dia: m.tensionDia }] : [];
    })
    .slice(-8);
}
```

Dans `src/server/requetes/soignant.ts` : ajouter à `Dossier` `mere: { id: string; prenom: string; nom: string } | null;` et `enfants: { id: string; prenom: string; libelleAge: string }[];`. Dans `dossierPatient`, sélectionner aussi `mereId: patients.mereId`, puis ajouter au `Promise.all` :

```ts
    p.mereId ? db.select({ id: patients.id, prenom: patients.prenom, nom: patients.nom }).from(patients).where(eq(patients.id, p.mereId)) : Promise.resolve([]),
    db.select({ id: patients.id, prenom: patients.prenom, dateNaissance: patients.dateNaissance }).from(patients).where(eq(patients.mereId, p.id)),
```

et à l'objet renvoyé : `mere: meres[0] ?? null`, `enfants: enfants.map((x) => ({ id: x.id, prenom: x.prenom, libelleAge: libelleAge(x.dateNaissance, aujourdhui) }))`.

- [ ] **Étape 3 : relancer les tests, vérifier les types**

Run : `pnpm vitest run tests/server/naissance.test.ts tests/server/relais tests/server/requetes/soignant.test.ts && pnpm typecheck`
Expected : PASS.

- [ ] **Étape 4 : commit**

```bash
git add src/server tests/server/naissance.test.ts
git commit -m "feat(naissance): déclaration de naissance, carnet du bébé rattaché à la famille, plan de naissance"
```

---

### Tâche 4 : la démo raconte les deux parcours

**Fichiers :**
- Modifier : `src/server/demo/semer.ts`, `src/server/demo/donnees.ts`, `docs/superpowers/specs/2026-09-25-esante-benin-design.md` (§3 : Awa à 37 semaines), tests qui supposaient 32 semaines
- Tester : `tests/server/demo/semer.test.ts`

**Interfaces :**
- Produit :
  - Awa enceinte de **37 semaines et 2 jours**, ses 4 consultations prénatales faites, rien de réservé, plan de naissance commencé (`lieu`, `accompagnant`, `sac`) ;
  - `COMPTES_DEMO` gagne un champ `parcours?: string[]`, les étapes à montrer au jury, et les descriptions des deux parcours.

- [ ] **Étape 1 : écrire le test qui échoue**

Dans `tests/server/demo/semer.test.ts`, ajouter :

```ts
  it("met Awa à 37 semaines, consultations faites et naissance en préparation", async () => {
    await semerDemo(db, { aujourdhui });
    const [awa] = await db.select().from(patients).where(eq(patients.prenom, "Awa"));
    const [grossesse] = await db.select().from(inscriptions).where(and(eq(inscriptions.patientId, awa!.id), eq(inscriptions.programme, "grossesse")));
    expect(grossesse?.dateReference).toBe("2026-01-07");
    const consultations = await db.select().from(evenements).where(and(eq(evenements.patientId, awa!.id), eq(evenements.type, "consultation")));
    expect(consultations.map((c) => c.donnees.etape).sort()).toEqual(["cpn1", "cpn2", "cpn3", "cpn4"]);
    const [plan] = await db.select().from(evenements).where(and(eq(evenements.patientId, awa!.id), eq(evenements.type, "plan_naissance")));
    expect(plan?.donnees).toEqual({ elements: ["lieu", "accompagnant", "sac"] });
    const reserves = await db.select().from(rendezVous).where(and(eq(rendezVous.patientId, awa!.id), isNotNull(rendezVous.creneauId)));
    expect(reserves).toEqual([]);
  });
```

(`aujourdhui` vaut `2026-09-25` dans ce fichier : 37 semaines et 2 jours avant, c'est le `2026-01-07`. Ajouter `inscriptions` à l'import du schéma.)

Run : `pnpm vitest run tests/server/demo/semer.test.ts`
Expected : FAIL (la date de référence d'Awa correspond encore à 32 semaines).

- [ ] **Étape 2 : écrire le code**

Dans `src/server/demo/semer.ts` :
1. Awa : `programmes: [{ code: "grossesse", dateReference: ajouterJours(aujourdhui, -(37 * 7 + 2)), dateInscription: ajouterJours(aujourdhui, -(37 * 7 + 2) + 10 * 7) }]`.
2. Dans la boucle des réservations déjà faites, ne garder que Codjo (`["+2290197000001", "codjo", "tension"]`).
3. Après la visite de Koffi chez Rachida, ajouter :

```ts
  // --- Awa prépare la naissance : 3 choses sur 6 ---
  await db.insert(t.evenements).values({
    id: randomUUID(),
    patientId: idsPersonnages.awa!,
    type: "plan_naissance",
    auteurId: compte("+2290197000002").id,
    survenuLe: depuisDateISO(ajouterJours(aujourdhui, -2)),
    donnees: { elements: ["lieu", "accompagnant", "sac"] },
  });
  nbEvenements++;
```

Dans `src/server/demo/donnees.ts`, ajouter `parcours?: string[]` à `CompteDemo`, puis :

```ts
  {
    identifiant: "+2290197000002",
    secret: "1234",
    role: "patient",
    nomAffiche: "Awa Hounkpatin",
    description: "Enceinte de 37 semaines, jusqu'à la naissance de son bébé",
    parcours: [
      "« Ma grossesse » : la semaine, la taille du bébé, les consultations tamponnées",
      "Préparer la naissance : cocher ce qui est prêt",
      "« J'ai un problème » → « Le travail a commencé » : l'alerte part au centre",
      "Adjoa déclare la naissance : le carnet du bébé apparaît dans « Famille »",
    ],
  },
```

et pour Codjo : `description: "Patient au quotidien : sa tension, ses médicaments, ses rendez-vous, les carnets de sa famille"` avec `parcours: ["Accueil : « Ce soir, 1 comprimé », écouter, « C'est fait »", "Prendre rendez-vous en 4 étapes pour son petit-fils Sèna", "Mon carnet : sa courbe de tension et ses médicaments", "Code de retrait à montrer à la pharmacie"]`.

Mettre à jour la spec §3 (Awa : « Enceinte de 37 semaines ») et le test `alertesOuvertes` (`semainesGrossesse: 37`). Relancer la suite du serveur ; tout test qui supposait la réservation d'Awa est mis à jour (la réservation de démonstration est maintenant celle de Codjo).

- [ ] **Étape 3 : relancer les tests**

Run : `pnpm vitest run tests/server && pnpm typecheck`
Expected : PASS.

- [ ] **Étape 4 : commit**

```bash
git add src/server/demo docs/superpowers/specs tests/server
git commit -m "feat(démo): Awa à 37 semaines, naissance en préparation ; parcours décrits pour le jury"
```

---
### Tâche 5 : « Ma grossesse » et « Préparer la naissance » (patient)

**Fichiers :**
- Créer : `src/app/(patient)/(onglets)/grossesse/page.tsx`, `src/app/(patient)/(onglets)/grossesse/PlanNaissance.tsx`, `src/app/(patient)/(onglets)/grossesse/FriseGrossesse.tsx`
- Modifier : `src/app/(patient)/actions.ts` (+ `planNaissanceAction`), `src/ui/pictogrammes.ts` (+ `ICONE_PLAN`), `src/app/(patient)/(onglets)/carnet/Frise.tsx` (lien), `src/app/(patient)/(onglets)/page.tsx` (carte grossesse, félicitations)
- Tester : `tests/ui/PlanNaissance.test.tsx`, `tests/ui/FriseGrossesse.test.tsx`

**Interfaces :**
- Consomme : `suiviDeGrossesse`, `ELEMENTS_PLAN`, `CodePlan` (tâche 2) ; `grossesseDe`, `planNaissanceDe`, `naissancesRecentes` (tâche 3) ; `programmesDuCarnet`, `etablissementDuPatient`.
- Produit :
  - `planNaissanceAction(patientId, elements): Promise<{ ok: boolean }>` ;
  - `PlanNaissance({ patientId, coches })` ;
  - `FriseGrossesse({ semaines, reperes: { code, libelle, semaine, statut }[] })` ;
  - page `/grossesse?pour=`.

- [ ] **Étape 1 : écrire les tests qui échouent**

Créer `tests/ui/PlanNaissance.test.tsx` :

```tsx
// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { planNaissanceAction } = vi.hoisted(() => ({ planNaissanceAction: vi.fn(async () => ({ ok: true })) }));
vi.mock("@/app/(patient)/actions", () => ({ planNaissanceAction }));

import { PlanNaissance } from "@/app/(patient)/(onglets)/grossesse/PlanNaissance";

afterEach(() => {
  cleanup();
  planNaissanceAction.mockClear();
});

describe("PlanNaissance", () => {
  it("coche une chose prête, la garde tout de suite et compte ce qui est prêt", async () => {
    render(<PlanNaissance patientId="p-awa" coches={["lieu", "accompagnant", "sac"]} />);
    expect(screen.getByText("3 sur 6")).toBeTruthy();
    const transport = screen.getByRole("checkbox", { name: /comment y aller/ });
    expect(transport.getAttribute("aria-checked")).toBe("false");
    fireEvent.click(transport);
    expect(transport.getAttribute("aria-checked")).toBe("true");
    expect(screen.getByText("4 sur 6")).toBeTruthy();
    await waitFor(() => expect(planNaissanceAction).toHaveBeenCalledWith("p-awa", ["lieu", "accompagnant", "sac", "transport"]));
  });

  it("dit quand ce n'est pas enregistré", async () => {
    planNaissanceAction.mockResolvedValueOnce({ ok: false });
    render(<PlanNaissance patientId="p-awa" coches={[]} />);
    fireEvent.click(screen.getByRole("checkbox", { name: /Mon sac est prêt/ }));
    expect((await screen.findByRole("alert")).textContent).toContain("Pas encore enregistré");
  });
});
```

Créer `tests/ui/FriseGrossesse.test.tsx` :

```tsx
// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { FriseGrossesse } from "@/app/(patient)/(onglets)/grossesse/FriseGrossesse";

afterEach(cleanup);

describe("FriseGrossesse", () => {
  it("place la semaine du jour et les consultations sur les trois trimestres", () => {
    render(
      <FriseGrossesse
        semaines={37}
        reperes={[
          { code: "cpn1", libelle: "Consultation prénatale 1", semaine: 12, statut: "faite" },
          { code: "cpn2", libelle: "Consultation prénatale 2", semaine: 26, statut: "faite" },
          { code: "cpn3", libelle: "Consultation prénatale 3", semaine: 32, statut: "manquee" },
          { code: "accouchement", libelle: "Accouchement prévu", semaine: 40, statut: "a_venir" },
        ]}
      />,
    );
    const frise = screen.getByRole("img");
    expect(frise.getAttribute("aria-label")).toBe(
      "Semaine 37 sur 40. Consultation prénatale 1 : faite. Consultation prénatale 2 : faite. Consultation prénatale 3 : manquée. Accouchement prévu : à venir.",
    );
    expect(screen.getAllByText(/trimestre/)).toHaveLength(3);
  });
});
```

Run : `pnpm vitest run tests/ui/PlanNaissance.test.tsx tests/ui/FriseGrossesse.test.tsx`
Expected : FAIL (modules introuvables).

- [ ] **Étape 2 : écrire l'action et les composants**

Dans `src/app/(patient)/actions.ts`, ajouter (importer `CODES_PLAN`, `type CodePlan` de `@/domain/grossesse` et `enregistrerPlanNaissance` de `@/server/patient/plan-naissance`) :

```ts
const champsPlan = z.object({ patientId: z.uuid(), elements: z.array(z.enum(CODES_PLAN)) });

/** « Préparer la naissance » : chaque case cochée est gardée tout de suite. */
export async function planNaissanceAction(patientId: string, elements: CodePlan[]): Promise<{ ok: boolean }> {
  const compte = await exigerRole("patient");
  const lecture = champsPlan.safeParse({ patientId, elements });
  if (!lecture.success) return { ok: false };
  const resultat = await enregistrerPlanNaissance(db(), { compteId: compte.id, ...lecture.data });
  return { ok: resultat.ok };
}
```

Dans `src/ui/pictogrammes.ts` :

```ts
export const ICONE_PLAN: Record<CodePlan, NomIcone> = {
  lieu: "hi-hospital",
  transport: "ph-motorcycle",
  accompagnant: "ph-users-three",
  argent: "ph-money",
  sac: "ph-handbag",
  sang: "hi-blood-drop",
};
```

Créer `src/app/(patient)/(onglets)/grossesse/PlanNaissance.tsx` :

```tsx
"use client";

import { useState, useTransition } from "react";
import { ELEMENTS_PLAN, type CodePlan } from "@/domain/grossesse";
import { Icone } from "@/ui/Icone";
import { ICONE_PLAN } from "@/ui/pictogrammes";
import { planNaissanceAction } from "../../actions";

/** Plan d'accouchement : ce qui est prêt se coche d'un geste et se garde tout de suite. */
export function PlanNaissance({ patientId, coches }: { patientId: string; coches: CodePlan[] }) {
  const [elements, setElements] = useState<CodePlan[]>(coches);
  const [erreur, setErreur] = useState(false);
  const [, demarrer] = useTransition();

  function basculer(code: CodePlan) {
    const suivant = elements.includes(code) ? elements.filter((c) => c !== code) : [...elements, code];
    setElements(suivant);
    demarrer(async () => {
      const resultat = await planNaissanceAction(patientId, suivant);
      setErreur(!resultat.ok);
    });
  }

  return (
    <section aria-labelledby="titre-plan" className="flex flex-col gap-3 rounded-carte bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 id="titre-plan" className="text-lg font-bold">
          Préparer la naissance
        </h2>
        <span className="rounded-lg bg-soleil-pale px-2.5 py-1 text-sm font-bold text-nuit">
          {elements.length} sur {ELEMENTS_PLAN.length}
        </span>
      </div>
      <ul className="flex flex-col gap-2">
        {ELEMENTS_PLAN.map((e) => {
          const fait = elements.includes(e.code);
          return (
            <li key={e.code}>
              <button
                type="button"
                role="checkbox"
                aria-checked={fait}
                onClick={() => basculer(e.code)}
                className="flex w-full items-center gap-3 rounded-2xl bg-lavande p-3 text-left focus-visible:outline-3 focus-visible:outline-soleil-appuye"
              >
                <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${fait ? "bg-marque text-white" : "bg-white text-marque"}`}>
                  <Icone nom={ICONE_PLAN[e.code]} className="size-6" />
                </span>
                <span className="min-w-0 flex-1">
                  <b className="block leading-snug">{e.libelle}</b>
                  <small className="text-sm text-gris">{e.detail}</small>
                </span>
                {fait ? (
                  <Icone nom="ph-check-circle" className="size-7 shrink-0 text-marque" />
                ) : (
                  <span aria-hidden="true" className="size-6 shrink-0 rounded-full border-2 border-lavande-4" />
                )}
              </button>
            </li>
          );
        })}
      </ul>
      {erreur && (
        <p role="alert" className="rounded-bouton bg-soleil-pale px-3 py-2 text-sm font-bold">
          Pas encore enregistré : ce sera fait quand le réseau reviendra.
        </p>
      )}
    </section>
  );
}
```

Créer `src/app/(patient)/(onglets)/grossesse/FriseGrossesse.tsx` :

```tsx
import type { StatutEtape } from "@/domain/statuts";

export interface Repere {
  code: string;
  libelle: string;
  semaine: number;
  statut: StatutEtape;
}

const STATUT: Record<StatutEtape, string> = { faite: "faite", a_venir: "à venir", manquee: "manquée" };
const POINT: Record<StatutEtape, string> = {
  faite: "bg-marque border-marque",
  a_venir: "bg-white border-marque border-dashed",
  manquee: "bg-soleil border-soleil-appuye",
};
const pourcent = (semaine: number) => `${Math.min(100, (semaine / 40) * 100)}%`;

/** Les 40 semaines en trois trimestres : où en est la grossesse, et chaque consultation à sa place. */
export function FriseGrossesse({ semaines, reperes }: { semaines: number; reperes: Repere[] }) {
  const resume = [`Semaine ${semaines} sur 40.`, ...reperes.map((r) => `${r.libelle} : ${STATUT[r.statut]}.`)].join(" ");
  return (
    <div role="img" aria-label={resume} className="rounded-carte bg-white px-4 pt-4 pb-3">
      <div className="relative h-16">
        <div className="absolute inset-x-0 top-7 flex h-3 overflow-hidden rounded-full">
          <span className="w-[35%] bg-lavande-3" />
          <span className="w-[35%] bg-lavande-4" />
          <span className="flex-1 bg-lavande-5" />
        </div>
        <div className="absolute top-7 h-3 rounded-full bg-marque/25" style={{ width: pourcent(semaines) }} />
        {reperes.map((r) => (
          <span
            key={r.code}
            className={`absolute top-[22px] size-[22px] -translate-x-1/2 rounded-full border-[3px] ${POINT[r.statut]}`}
            style={{ left: pourcent(r.semaine) }}
          />
        ))}
        <span className="absolute top-0 -translate-x-1/2 rounded-md bg-soleil px-1.5 text-xs font-bold text-nuit" style={{ left: pourcent(semaines) }}>
          {semaines} sem.
        </span>
      </div>
      <div className="mt-1 grid grid-cols-[35%_35%_1fr] text-xs font-bold text-gris">
        <span>1ᵉʳ trimestre</span>
        <span>2ᵉ trimestre</span>
        <span className="text-right">3ᵉ trimestre</span>
      </div>
    </div>
  );
}
```

- [ ] **Étape 3 : écrire la page**

Créer `src/app/(patient)/(onglets)/grossesse/page.tsx` :

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { joursEntre } from "@/domain/dates";
import { suiviDeGrossesse } from "@/domain/grossesse";
import { formaterTelephone, normaliserTelephone } from "@/domain/telephone";
import { dateLongue, libelleDansJours } from "@/domain/temps";
import { db } from "@/server/db/client";
import { programmesDuCarnet } from "@/server/requetes/carnet";
import { etablissementDuPatient } from "@/server/requetes/carnets";
import { grossesseDe, planNaissanceDe } from "@/server/requetes/grossesse";
import { AvatarsFamille } from "@/ui/AvatarsFamille";
import { BoutonEcouter } from "@/ui/BoutonEcouter";
import { Icone } from "@/ui/Icone";
import { Ondes } from "@/ui/Ondes";
import { contextePatient } from "../../contexte";
import { FriseGrossesse } from "./FriseGrossesse";
import { PlanNaissance } from "./PlanNaissance";

export const metadata: Metadata = { title: "Ma grossesse" };

const nombre = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 1 });

/** La grossesse semaine par semaine : où on en est, la taille du bébé, la préparation de la naissance. */
export default async function MaGrossesse({ searchParams }: PageProps<"/grossesse">) {
  const params = await searchParams;
  const { aujourdhui, carnets, carnet } = await contextePatient(params.pour);
  if (!carnet) redirect("/");
  const grossesse = await grossesseDe(db(), carnet.patientId);
  if (!grossesse) redirect(`/carnet?pour=${carnet.patientId}`);
  const [plan, programmes, centre] = await Promise.all([
    planNaissanceDe(db(), carnet.patientId),
    programmesDuCarnet(db(), carnet.patientId, aujourdhui),
    etablissementDuPatient(db(), carnet.patientId),
  ]);
  const suivi = suiviDeGrossesse(grossesse.ddr, aujourdhui);
  const etapes = programmes.find((p) => p.code === "grossesse")?.etapes ?? [];
  const reperes = etapes.map((e) => ({ code: e.code, libelle: e.libelle, statut: e.statut, semaine: Math.floor(joursEntre(grossesse.ddr, e.datePrevue) / 7) }));
  const telephone = centre?.telephone ? normaliserTelephone(centre.telephone) : null;
  const soi = carnet.lien === "soi";
  const resume = `${soi ? "Vous êtes" : `${carnet.prenom} est`} à ${suivi.semaines} semaines de grossesse. Le terme est prévu le ${dateLongue(suivi.terme)}. Le bébé mesure environ ${nombre(suivi.taille.cm)} centimètres et pèse environ ${nombre(suivi.taille.grammes / 1000)} kilo, à peu près comme ${suivi.taille.comme}. ${suivi.conseils.join(" ")}`;

  return (
    <>
      <AvatarsFamille personnes={carnets} actif={carnet.patientId} lien={(id) => `/grossesse?pour=${id}`} />
      <header className="relative overflow-hidden rounded-grande bg-marque p-5 text-white">
        <Ondes className="-top-10 -right-12 size-56 text-white opacity-10" />
        <div className="relative flex items-center gap-4">
          <div className="grid size-24 shrink-0 place-items-center rounded-full border-[6px] border-white/25 bg-white/10 text-center">
            <span>
              <b className="block text-4xl leading-none">{suivi.semaines}</b>
              <small className="text-xs text-lavande-3">semaines</small>
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl leading-tight font-bold">{soi ? "Ma grossesse" : `Grossesse de ${carnet.prenom}`}</h1>
            <p className="text-lavande-3">
              {suivi.trimestre === 3 ? "3ᵉ trimestre" : suivi.trimestre === 2 ? "2ᵉ trimestre" : "1ᵉʳ trimestre"} · {suivi.jours} jour{suivi.jours > 1 ? "s" : ""} en plus
            </p>
            <p className="mt-1 font-bold">
              Terme prévu : {dateLongue(suivi.terme)}
              {suivi.joursAvantTerme > 0 ? `, ${libelleDansJours(suivi.joursAvantTerme)}` : ""}
            </p>
          </div>
          <BoutonEcouter variante="rond" libelle="Écouter" texte={resume} />
        </div>
      </header>

      <section aria-labelledby="titre-bebe" className="flex items-center gap-4 rounded-carte bg-white p-4">
        <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-soleil-pale text-soleil-appuye">
          <Icone nom="hi-fetus" className="size-11" />
        </span>
        <div>
          <h2 id="titre-bebe" className="text-sm font-bold text-gris">
            Le bébé cette semaine
          </h2>
          <p className="text-lg leading-snug font-bold">
            Environ {nombre(suivi.taille.cm)} cm et {nombre(suivi.taille.grammes / 1000)} kg
          </p>
          <p className="text-gris">À peu près comme {suivi.taille.comme}.</p>
        </div>
      </section>

      <section aria-labelledby="titre-frise" className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <h2 id="titre-frise" className="text-lg font-bold">
            Les consultations
          </h2>
          <Link href={`/carnet?pour=${carnet.patientId}`} className="text-sm font-bold text-marque">
            Voir le carnet
          </Link>
        </div>
        <FriseGrossesse semaines={suivi.semaines} reperes={reperes} />
      </section>

      <PlanNaissance patientId={carnet.patientId} coches={plan} />

      <section aria-labelledby="titre-conseils" className="flex flex-col gap-2 rounded-carte bg-white p-4">
        <h2 id="titre-conseils" className="text-lg font-bold">
          Cette semaine
        </h2>
        <ul className="flex flex-col gap-2.5">
          {suivi.conseils.map((conseil) => (
            <li key={conseil} className="flex items-start gap-3">
              <BoutonEcouter variante="pastille" libelle={`Écouter : ${conseil}`} texte={conseil} />
              <span className="pt-1">{conseil}</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="titre-jour-j" className="relative overflow-hidden rounded-carte bg-nuit p-4 text-white">
        <Ondes className="-right-10 -bottom-16 size-44 text-white opacity-10" />
        <h2 id="titre-jour-j" className="relative text-lg font-bold">
          Le jour J
        </h2>
        <p className="relative mt-1 text-lavande-3">Le travail commence, vous perdez de l&apos;eau ou du sang, le bébé bouge moins : prévenez le centre tout de suite.</p>
        <div className="relative mt-3 grid gap-2 sm:grid-cols-2">
          <Link href={`/probleme?pour=${carnet.patientId}`} className="flex items-center justify-center gap-2 rounded-bouton bg-urgence p-3 font-bold">
            <Icone nom="hi-alert-circle" className="size-6" />
            J&apos;ai un problème
          </Link>
          {telephone && (
            <a href={`tel:${telephone}`} className="flex items-center justify-center gap-2 rounded-bouton bg-white p-3 font-bold text-marque">
              <Icone nom="ph-phone" className="size-6" />
              {formaterTelephone(telephone)}
            </a>
          )}
        </div>
      </section>
      <p className="text-center text-xs text-gris">Valeurs indicatives, à confirmer avec la sage-femme.</p>
    </>
  );
}
```

Dans `src/app/(patient)/(onglets)/carnet/Frise.tsx`, sous la ligne « N semaines · terme prévu le … » du programme `grossesse`, ajouter :

```tsx
          <Link href={`/grossesse?pour=${patientId}`} className="flex items-center gap-2 rounded-carte bg-soleil-pale p-3 font-bold text-nuit">
            <Icone nom="hi-fetus" className="size-7 text-soleil-appuye" />
            Ma grossesse, semaine par semaine
            <Icone nom="ph-caret-right" className="ml-auto size-5" />
          </Link>
```

Dans `src/app/(patient)/(onglets)/page.tsx`, après la pile (et avant « Ensuite ») :
- pour chaque personne affichée dont `programmes` contient `grossesse`, une carte-lien vers `/grossesse?pour=…` :
  - « Semaine {n} : le bébé est comme {comme} » ;
  - « Préparer la naissance : {k} sur 6 » ;
  - calculée avec `grossesseDe`, `suiviDeGrossesse` et `planNaissanceDe` ;
- en haut, si `naissancesRecentes(db(), ids des personnes, il y a 14 jours)` n'est pas vide, un bandeau de félicitations :
  - pictogramme `ph-confetti` ;
  - « Bienvenue à {prénom} ! Née le … » (« Né le … » pour un garçon) ;
  - un lien « Voir son carnet » vers `/carnet?pour={bebeId}`.

```tsx
function Felicitations({ naissance }: { naissance: { bebeId: string; prenom: string; sexe: "F" | "M"; le: Date } }) {
  return (
    <Link href={`/carnet?pour=${naissance.bebeId}`} className="flex items-center gap-3 rounded-carte bg-soleil p-4 text-nuit">
      <Icone nom="ph-confetti" className="size-9 shrink-0" />
      <span className="min-w-0 flex-1">
        <b className="block text-lg leading-tight">Bienvenue à {naissance.prenom} !</b>
        <small className="text-sm">
          {naissance.sexe === "F" ? "Née" : "Né"} le {dateLongue(aujourdhuiAuBenin(naissance.le))}. Son carnet est prêt : ses vaccins commencent.
        </small>
      </span>
      <Icone nom="ph-caret-right" className="size-6 shrink-0" />
    </Link>
  );
}

function CarteGrossesse({ patientId, prenom, semaines, comme, prets }: { patientId: string; prenom: string | null; semaines: number; comme: string; prets: number }) {
  return (
    <Link href={`/grossesse?pour=${patientId}`} className="flex items-center gap-3 rounded-carte bg-white p-3.5">
      <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-soleil-pale text-soleil-appuye">
        <Icone nom="hi-fetus" className="size-8" />
      </span>
      <span className="min-w-0 flex-1">
        <b className="block">
          {prenom ? `${prenom} : ` : ""}semaine {semaines}, le bébé est comme {comme}
        </b>
        <small className="text-sm text-gris">Préparer la naissance : {prets} sur 6</small>
      </span>
      <Icone nom="ph-caret-right" className="size-5 shrink-0 text-gris" />
    </Link>
  );
}
```

- [ ] **Étape 4 : relancer les tests, vérifier les types et le style**

Run : `pnpm vitest run tests/ui && pnpm typecheck && pnpm lint`
Expected : PASS.

- [ ] **Étape 5 : vérifier dans le navigateur**

Awa (390 px) :
1. L'accueil montre la carte « Semaine 37, le bébé est comme une igname · 3 sur 6 ».
2. `/grossesse` : semaine 37, terme dans 19 jours, igname, frise avec 4 consultations faites.
3. Elle coche « J'ai prévu comment y aller » : « 4 sur 6 », et la page rechargée le garde.

Captures `awa-accueil.png`, `awa-grossesse.png`.

- [ ] **Étape 6 : commit**

```bash
git add "src/app/(patient)" src/ui/pictogrammes.ts tests/ui
git commit -m "feat(patient): « Ma grossesse » semaine par semaine et « Préparer la naissance »"
```

---

### Tâche 6 : déclarer la naissance (sage-femme)

**Fichiers :**
- Créer : `src/app/soignant/patients/[id]/naissance/page.tsx`, `src/app/soignant/patients/[id]/naissance/FormulaireNaissance.tsx`
- Modifier : `src/app/soignant/actions.ts` (+ `declarerNaissanceAction`), `src/app/soignant/patients/[id]/page.tsx` (bouton, mère, enfants, message)
- Tester : `tests/ui/FormulaireNaissance.test.tsx`

**Interfaces :**
- Consomme : `lireDeclarationNaissance`, `LIBELLES_LIEU`, `LIBELLES_MODE` (tâche 2), `declarerNaissance` (tâche 3), `Dossier.mere`, `Dossier.enfants`.
- Produit : `declarerNaissanceAction(etat, formulaire)`. En cas de réussite, redirection vers le dossier du bébé (`?note=naissance`).

- [ ] **Étape 1 : écrire le test qui échoue**

Créer `tests/ui/FormulaireNaissance.test.tsx` :

```tsx
// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/soignant/actions", () => ({ declarerNaissanceAction: vi.fn(async () => ({})) }));

import { FormulaireNaissance } from "@/app/soignant/patients/[id]/naissance/FormulaireNaissance";

afterEach(cleanup);

describe("FormulaireNaissance", () => {
  it("propose l'heure du moment, les lieux, et les vaccins de naissance cochés", () => {
    render(<FormulaireNaissance mereId="p-awa" date="2026-09-26" heure="06:40" />);
    expect((screen.getByLabelText("Date") as HTMLInputElement).value).toBe("2026-09-26");
    expect((screen.getByLabelText("Heure") as HTMLInputElement).value).toBe("06:40");
    expect(screen.getAllByRole("radio", { name: /centre de santé|maison|En route|hôpital/ })).toHaveLength(4);
    expect((screen.getByRole("checkbox", { name: /BCG/ }) as HTMLInputElement).checked).toBe(true);
    expect(screen.getByRole("button", { name: "Enregistrer la naissance" })).toBeTruthy();
  });
});
```

Run : `pnpm vitest run tests/ui/FormulaireNaissance.test.tsx`
Expected : FAIL (module introuvable).

- [ ] **Étape 2 : écrire l'action, le formulaire et la page**

Dans `src/app/soignant/actions.ts` (importer `lireDeclarationNaissance` et `declarerNaissance`) :

```ts
export async function declarerNaissanceAction(_: EtatFormulaire, formulaire: FormData): Promise<EtatFormulaire> {
  const soignant = await exigerSoignant();
  const valeurs = texteDu(formulaire);
  const lecture = lireDeclarationNaissance(valeurs, new Date());
  if (!lecture.ok) return { message: lecture.message, valeurs };
  const resultat = await declarerNaissance(db(), { auteur: soignant, mereId: valeurs.mereId ?? "", saisie: lecture.saisie });
  if (!resultat.ok) {
    const message = resultat.erreur === "interdit" ? "Cette patiente n'est pas suivie dans votre centre." : "Aucune grossesse en cours : la naissance est peut-être déjà enregistrée.";
    return { message, valeurs };
  }
  redirect(`/soignant/patients/${resultat.donnees.bebeId}?note=naissance`);
}
```

Créer `src/app/soignant/patients/[id]/naissance/FormulaireNaissance.tsx` :

```tsx
"use client";

import { useActionState } from "react";
import { LIBELLES_LIEU, LIBELLES_MODE, LIEUX_NAISSANCE, MODES_NAISSANCE } from "@/domain/naissance";
import { declarerNaissanceAction, type EtatFormulaire } from "../../../actions";

const CHAMP = "flex flex-col gap-1.5 text-sm font-bold";
const SAISIE = "h-11 rounded-xl bg-lavande px-3 text-base font-normal";
const TUILE = "flex cursor-pointer items-center justify-center rounded-xl bg-lavande px-3 py-2.5 text-sm font-bold has-checked:bg-marque has-checked:text-white";

export function FormulaireNaissance({ mereId, date, heure }: { mereId: string; date: string; heure: string }) {
  const [etat, action, enCours] = useActionState<EtatFormulaire, FormData>(declarerNaissanceAction, {});
  const valeur = (nom: string, defaut = "") => etat.valeurs?.[nom] ?? defaut;
  return (
    <form action={action} className="flex max-w-2xl flex-col gap-5 rounded-carte bg-white p-5">
      <input type="hidden" name="mereId" value={mereId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={CHAMP}>
          Date
          <input type="date" name="date" defaultValue={valeur("date", date)} max={date} className={SAISIE} />
        </label>
        <label className={CHAMP}>
          Heure
          <input type="time" name="heure" defaultValue={valeur("heure", heure)} className={SAISIE} />
        </label>
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-sm font-bold">Lieu</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {LIEUX_NAISSANCE.map((l) => (
            <label key={l} className={TUILE}>
              <input type="radio" name="lieu" value={l} defaultChecked={valeur("lieu", "centre") === l} className="sr-only" />
              {LIBELLES_LIEU[l]}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1.5 text-sm font-bold">Accouchement</legend>
          <div className="grid grid-cols-2 gap-2">
            {MODES_NAISSANCE.map((m) => (
              <label key={m} className={TUILE}>
                <input type="radio" name="mode" value={m} defaultChecked={valeur("mode", "voie_basse") === m} className="sr-only" />
                {LIBELLES_MODE[m]}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1.5 text-sm font-bold">Le bébé</legend>
          <div className="grid grid-cols-2 gap-2">
            <label className={TUILE}>
              <input type="radio" name="sexe" value="F" defaultChecked={valeur("sexe") === "F"} className="sr-only" />
              Fille
            </label>
            <label className={TUILE}>
              <input type="radio" name="sexe" value="M" defaultChecked={valeur("sexe") === "M"} className="sr-only" />
              Garçon
            </label>
          </div>
        </fieldset>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={CHAMP}>
          Poids (kg)
          <input name="poids" inputMode="decimal" placeholder="3,2" defaultValue={valeur("poids")} className={SAISIE} />
        </label>
        <label className={CHAMP}>
          <span>
            Prénom <span className="font-normal text-gris">(facultatif : « Bébé » en attendant)</span>
          </span>
          <input name="prenom" autoComplete="off" defaultValue={valeur("prenom")} className={SAISIE} />
        </label>
      </div>
      <label className="flex items-center gap-3 text-sm font-bold">
        <input type="checkbox" name="vaccins" defaultChecked={valeur("vaccins", "on") === "on"} className="size-5 accent-marque" />
        Vaccins de naissance faits (BCG, polio 0)
      </label>
      {etat.message && (
        <p role="alert" className="rounded-xl bg-urgence-pale px-4 py-3 font-bold text-urgence">
          {etat.message}
        </p>
      )}
      <button disabled={enCours} className="self-start rounded-bouton bg-marque px-6 py-3 font-bold text-white disabled:opacity-60">
        Enregistrer la naissance
      </button>
    </form>
  );
}
```

Créer `src/app/soignant/patients/[id]/naissance/page.tsx` :

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { aujourdhuiAuBenin } from "@/domain/dates";
import { semainesDeGrossesse } from "@/domain/programmes/grossesse";
import { db } from "@/server/db/client";
import { dossierPatient } from "@/server/requetes/soignant";
import { Icone } from "@/ui/Icone";
import { exigerSoignant } from "../../../contexte";
import { FormulaireNaissance } from "./FormulaireNaissance";

export default async function DeclarerNaissance({ params }: PageProps<"/soignant/patients/[id]/naissance">) {
  const soignant = await exigerSoignant();
  const { id } = await params;
  const maintenant = new Date();
  const aujourdhui = aujourdhuiAuBenin(maintenant);
  const dossier = await dossierPatient(db(), soignant.etablissementId, id, aujourdhui);
  if (!dossier) notFound();
  const { patient } = dossier;
  const grossesse = dossier.programmes.find((p) => p.code === "grossesse");
  const heureBenin = new Date(maintenant.getTime() + 3_600_000).toISOString().slice(11, 16);
  return (
    <>
      <Link href={`/soignant/patients/${patient.id}`} className="flex w-fit items-center gap-2 text-sm font-bold text-marque">
        <Icone nom="ph-arrow-left" className="size-4" />
        Dossier de {patient.prenom}
      </Link>
      <h1 className="text-3xl font-bold">
        Naissance chez {patient.prenom} {patient.nom}
      </h1>
      {grossesse ? (
        <>
          <p className="text-gris">
            {semainesDeGrossesse(grossesse.dateReference, aujourdhui)} semaines de grossesse. Le carnet du bébé sera créé et rattaché à la famille ; le suivi après
            l&apos;accouchement commencera pour {patient.prenom}.
          </p>
          <FormulaireNaissance mereId={patient.id} date={aujourdhui} heure={heureBenin} />
        </>
      ) : (
        <p className="rounded-carte bg-white p-5">Aucune grossesse en cours pour {patient.prenom}.</p>
      )}
    </>
  );
}
```

Dans `src/app/soignant/patients/[id]/page.tsx` :
- ajouter au message de retour `note === "naissance"` : `<RetourAction message={\`Naissance enregistrée : le carnet de ${patient.prenom} est créé, avec ses vaccins de naissance.\`} />` ;
- dans l'en-tête, si `dossier.programmes` contient `grossesse`, un lien « Déclarer la naissance » (pictogramme `ph-baby`, fond `bg-soleil text-nuit`) vers `/soignant/patients/${patient.id}/naissance` ;
- sous le nom, si `dossier.mere`, « Mère : » avec un lien vers son dossier, et si `dossier.enfants`, « Enfants : » avec leurs liens (prénom et âge).

- [ ] **Étape 3 : relancer les tests, vérifier les types et le style**

Run : `pnpm vitest run tests/ui && pnpm typecheck && pnpm lint`
Expected : PASS.

- [ ] **Étape 4 : vérifier dans le navigateur**

Script `naissance.mjs` :
1. Awa signale « Le travail a commencé ».
2. Adjoa voit l'alerte, la prend en charge, ouvre « Déclarer la naissance » et saisit : fille, 3,2 kg, vaccins faits.
3. Elle arrive sur le dossier du bébé : message, « Mère : Awa Hounkpatin », vaccins de la naissance « VU ».
4. Awa revient sur l'accueil : félicitations, le bébé dans les avatars, et dans son carnet les vaccins des 6 semaines à venir.

Captures `adjoa-naissance.png`, `awa-felicitations.png`, `bebe-carnet.png`.

- [ ] **Étape 5 : commit**

```bash
git add src/app/soignant tests/ui/FormulaireNaissance.test.tsx
git commit -m "feat(soignant): déclarer la naissance ; mère et enfants dans le dossier"
```

---

### Tâche 7 : la courbe de tension de Codjo

**Fichiers :**
- Créer : `src/ui/CourbeTension.tsx`
- Modifier : `src/app/(patient)/(onglets)/carnet/page.tsx`
- Tester : `tests/ui/CourbeTension.test.tsx`

**Interfaces :**
- Consomme : `tensionsDe` (tâche 3).
- Produit : `CourbeTension({ releves: { date, sys, dia }[] })`. Rien sous deux relevés ; un nom accessible qui lit tous les relevés.

- [ ] **Étape 1 : écrire le test qui échoue**

Créer `tests/ui/CourbeTension.test.tsx` :

```tsx
// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { CourbeTension } from "@/ui/CourbeTension";

afterEach(cleanup);

const releves = [
  { date: "2026-05-28", sys: 150, dia: 95 },
  { date: "2026-07-10", sys: 148, dia: 94 },
  { date: "2026-08-26", sys: 145, dia: 92 },
];

describe("CourbeTension", () => {
  it("dessine chaque relevé et se lit à voix haute", () => {
    const { container } = render(<CourbeTension releves={releves} />);
    expect(screen.getByRole("img").getAttribute("aria-label")).toBe("Tension : 150/95 le 28/05, 148/94 le 10/07, 145/92 le 26/08. Trop haute au-dessus de 140/90.");
    expect(container.querySelectorAll("circle")).toHaveLength(3);
    expect(screen.getByText("145/92")).toBeTruthy();
  });

  it("ne montre rien avec un seul relevé", () => {
    const { container } = render(<CourbeTension releves={releves.slice(0, 1)} />);
    expect(container.innerHTML).toBe("");
  });
});
```

Run : `pnpm vitest run tests/ui/CourbeTension.test.tsx`
Expected : FAIL (module introuvable).

- [ ] **Étape 2 : écrire le composant et l'afficher**

Créer `src/ui/CourbeTension.tsx` :

```tsx
import type { DateISO } from "@/domain/dates";
import { dateCourte } from "@/domain/temps";

const LARGEUR = 320;
const HAUTEUR = 150;
const MARGE = 28;

/** Les derniers relevés de tension : le chiffre du haut en indigo, la limite 140/90 en pointillés rouges. */
export function CourbeTension({ releves }: { releves: { date: DateISO; sys: number; dia: number }[] }) {
  if (releves.length < 2) return null;
  const min = 60;
  const max = Math.max(190, ...releves.map((r) => r.sys + 10));
  const x = (i: number) => MARGE + (i * (LARGEUR - 2 * MARGE)) / (releves.length - 1);
  const y = (v: number) => HAUTEUR - 22 - ((v - min) * (HAUTEUR - 36)) / (max - min);
  const trop = (r: { sys: number; dia: number }) => r.sys >= 140 || r.dia >= 90;
  const derniere = releves[releves.length - 1]!;
  const resume = `Tension : ${releves.map((r) => `${r.sys}/${r.dia} le ${dateCourte(r.date)}`).join(", ")}. Trop haute au-dessus de 140/90.`;
  const ligne = (cle: "sys" | "dia") => releves.map((r, i) => `${x(i)},${y(r[cle])}`).join(" ");
  return (
    <figure className="flex flex-col gap-2 rounded-carte bg-white p-4">
      <figcaption className="flex items-baseline justify-between">
        <b className="text-lg">Ma tension</b>
        <span className={`text-lg font-bold ${trop(derniere) ? "text-urgence" : "text-marque"}`}>
          {derniere.sys}/{derniere.dia}
        </span>
      </figcaption>
      <svg viewBox={`0 0 ${LARGEUR} ${HAUTEUR}`} role="img" aria-label={resume} className="w-full">
        {[140, 90].map((limite) => (
          <g key={limite}>
            <line x1={MARGE} x2={LARGEUR - MARGE} y1={y(limite)} y2={y(limite)} className="stroke-urgence" strokeWidth="1.5" strokeDasharray="5 4" />
            <text x={2} y={y(limite) + 4} className="fill-urgence text-[10px] font-bold">
              {limite}
            </text>
          </g>
        ))}
        <polyline points={ligne("dia")} fill="none" className="stroke-lavande-5" strokeWidth="2.5" strokeLinejoin="round" />
        <polyline points={ligne("sys")} fill="none" className="stroke-marque" strokeWidth="3" strokeLinejoin="round" />
        {releves.map((r, i) => (
          <circle key={r.date + i} cx={x(i)} cy={y(r.sys)} r="5" className={trop(r) ? "fill-urgence" : "fill-marque"} />
        ))}
        {[0, releves.length - 1].map((i) => (
          <text key={i} x={x(i)} y={HAUTEUR - 4} textAnchor="middle" className="fill-gris text-[10px]">
            {dateCourte(releves[i]!.date)}
          </text>
        ))}
      </svg>
      <p className="text-sm text-gris">Au-dessus des pointillés rouges (140/90), la tension est trop haute : prenez bien vos comprimés.</p>
    </figure>
  );
}
```

Dans `src/app/(patient)/(onglets)/carnet/page.tsx` : si `carnet.programmes` contient `hypertension`, charger `tensionsDe(db(), carnet.patientId)` avec les autres requêtes et afficher `<CourbeTension releves={tensions} />` juste après les sections de programmes.

- [ ] **Étape 3 : relancer les tests, vérifier les types**

Run : `pnpm vitest run tests/ui && pnpm typecheck && pnpm lint`
Expected : PASS.

- [ ] **Étape 4 : commit**

```bash
git add src/ui/CourbeTension.tsx "src/app/(patient)/(onglets)/carnet/page.tsx" tests/ui/CourbeTension.test.tsx
git commit -m "feat(patient): la courbe de tension dans le carnet"
```

---

### Tâche 8 : la page de démo raconte les parcours ; mise en ligne

**Fichiers :**
- Modifier : `src/app/demo/page.tsx`, `README.md`
- Tester : `tests/app/demo.test.ts`

**Interfaces :**
- Consomme : `COMPTES_DEMO` et leur `parcours` (tâche 4).
- Produit : `/demo` en 4 groupes :
  - « Deux parcours à suivre » (les comptes qui ont un `parcours`, avec leurs étapes numérotées) ;
  - « Soignants, relais et pharmacie » ;
  - « L'État » (pilotage) ;
  - « Autres comptes ».

- [ ] **Étape 1 : écrire le test qui échoue**

Créer `tests/app/demo.test.ts` :

```tsx
import { describe, expect, it } from "vitest";
import { groupesDemo } from "@/app/demo/groupes";
import { COMPTES_DEMO } from "@/server/demo/donnees";

describe("groupesDemo", () => {
  it("met les deux parcours usagers en premier, puis les professionnels et l'État", () => {
    const groupes = groupesDemo(COMPTES_DEMO);
    expect(groupes.map((g) => g.titre)).toEqual(["Deux parcours à suivre", "Soignants, relais et pharmacie", "L'État", "Autres comptes"]);
    expect(groupes[0]!.comptes.map((c) => c.nomAffiche)).toEqual(["Awa Hounkpatin", "Codjo Houngbo"]);
    expect(groupes[1]!.comptes.map((c) => c.role)).toEqual(["soignant", "soignant", "relais", "pharmacie"]);
  });
});
```

Run : `pnpm vitest run tests/app/demo.test.ts`
Expected : FAIL (module introuvable).

- [ ] **Étape 2 : écrire le code**

Créer `src/app/demo/groupes.ts` :

```ts
import type { CompteDemo } from "@/server/demo/donnees";

export interface GroupeDemo {
  titre: string;
  texte: string;
  comptes: CompteDemo[];
}

const ORDRE_PRO: Record<string, number> = { soignant: 0, relais: 1, pharmacie: 2 };

/** L'ordre dans lequel le jury découvre la plateforme : les deux parcours usagers, puis ceux qui les accompagnent. */
export function groupesDemo(comptes: CompteDemo[]): GroupeDemo[] {
  const parcours = comptes.filter((c) => c.parcours?.length).sort((a, b) => (a.nomAffiche.startsWith("Awa") ? -1 : b.nomAffiche.startsWith("Awa") ? 1 : 0));
  const pros = comptes.filter((c) => c.role in ORDRE_PRO).sort((a, b) => ORDRE_PRO[a.role]! - ORDRE_PRO[b.role]!);
  const etat = comptes.filter((c) => c.role === "pilotage");
  const autres = comptes.filter((c) => !parcours.includes(c) && !pros.includes(c) && !etat.includes(c));
  return [
    { titre: "Deux parcours à suivre", texte: "Une future maman jusqu'à la naissance de son bébé, et un patient au quotidien.", comptes: parcours },
    { titre: "Soignants, relais et pharmacie", texte: "Ceux qui accompagnent les patients, au centre et dans les villages.", comptes: pros },
    { titre: "L'État", texte: "Des indicateurs sans aucun nom, pour décider.", comptes: etat },
    { titre: "Autres comptes", texte: "", comptes: autres },
  ].filter((g) => g.comptes.length > 0);
}
```

Remplacer la liste de `src/app/demo/page.tsx` par les groupes. Chaque compte à parcours devient une grande carte :
- nom, description et étapes numérotées (`<ol>`) ;
- un bouton « Entrer comme {prénom} » (même formulaire `entrerCommeDemo`) ;
- le pictogramme `hi-pregnant` pour Awa, `hi-man` pour Codjo.

Les autres comptes gardent la carte actuelle, avec leur rôle.

Au README, ajouter après l'introduction une section « Deux parcours à suivre », avec les étapes des deux parcours et le lien vers `/demo`. Ajouter dans « Espace patient » :
- « Ma grossesse » ;
- « Préparer la naissance » ;
- « Le travail a commencé » ;
- la déclaration de naissance ;
- la courbe de tension.

- [ ] **Étape 3 : suite complète, build, vérification, mise en ligne**

Run : `pnpm test && pnpm typecheck && pnpm lint && pnpm build`
Expected : tout passe.

1. Envoyer : `git push origin main`.
2. Suivre le déploiement Coolify ; la migration 0003 s'applique au démarrage.
3. Réinitialiser la démo en production.
4. Rejouer sur https://moncarnet.kheios.com les scripts `naissance.mjs` et un aperçu de `/demo`.
5. Réinitialiser la démo.

- [ ] **Étape 4 : commit**

```bash
git add src/app/demo README.md tests/app/demo.test.ts
git commit -m "feat(démo): les deux parcours usagers d'abord, puis les professionnels et l'État"
```
