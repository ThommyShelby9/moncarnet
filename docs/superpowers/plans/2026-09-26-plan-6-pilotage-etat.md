# Plan 6 : pilotage pour les agents de l'État et le ministère — plan d'implémentation

> **Pour les agents :** sous-skill requis : superpowers:executing-plans (exécution par moi-même, sans agents). Étapes en cases à cocher (`- [ ]`).

**Objectif :** deux vues de pilotage, **sans aucun nom** (spec §4.10, §12).
- **Agents de l'État (zone sanitaire Zogbodomey-Bohicon-Zakpota)** : les indicateurs de la zone calculés en direct depuis les carnets, commune par commune. Un chiffre qui porte sur moins de 5 personnes est masqué. S'y ajoutent la tendance sur 6 mois et l'export.
- **Ministère de la Santé (vue nationale)** : toutes les zones sanitaires (celle de la démo en direct, les autres en données fictives signalées comme telles), les indicateurs nationaux, le classement des zones par indicateur, la tendance sur 6 mois, les zones à appuyer, et un export CSV au format proche de DHIS2.

**Architecture :**
- domaine pur `src/domain/pilotage.ts` : catalogue des indicateurs, lecture avec masquage et niveau (objectif atteint, presque, à appuyer), agrégation, export CSV ;
- serveur `src/server/requetes/pilotage.ts` : calcul en direct par commune (grossesses, vaccins, tension, alertes, naissances, relais, rendez-vous manqués), historique et autres zones (table `indicateurs_zones`, remplie par la démo), vue de zone, vue nationale ;
- écrans `/pilotage` (zone ou national selon le compte) et route `/api/pilotage/export`.

**Stack :** inchangée. **Spec :** §4.10, §12, §14 (bonus : export compatible DHIS2), mémoire « Priorités de la démo ».

## Contraintes globales
- Aucun nom, aucun identifiant de personne dans les écrans ni l'export de pilotage : seulement des comptes et des taux.
- Masquage : un taux ou un délai qui porte sur moins de 5 personnes est affiché « Masqué » ; dans l'export, son numérateur et son dénominateur sont vides.
- Les données des autres zones sont **fictives** et l'écran le dit ; la zone de la démo est calculée en direct.
- Valeurs cibles indicatives (spec §5).

## Points de vigilance
1. **Zone sans aucune donnée** (aucun accouchement dans l'année) : « — » et « Aucune donnée pour la période », jamais « 0 % » (tâche 1).
2. **Petite commune** : les chiffres de moins de 5 personnes sont masqués, alors que le total de la zone s'affiche (tâche 2).
3. **Compte de pilotage sans zone** : c'est la vue nationale. Un compte rattaché à une commune sans zone sanitaire voit un message clair (tâche 4).

---

## Structure des fichiers

```
src/domain/pilotage.ts                   CODES_INDICATEURS, INDICATEURS, SEUIL_MASQUE, lireIndicateur, agreger, vide, lignesDe, versCsv
src/server/db/schema.ts                  + communes.zoneSanitaire, table indicateurs_zones ; drizzle/0004_*.sql
src/server/requetes/pilotage.ts          indicateursDesCommunes, vueDeZone, vueNationale, premierDuMois
src/server/demo/semer.ts, donnees.ts     zone sanitaire des communes, compte du ministère, alertes et naissances passées, historique et autres zones
src/app/pilotage/layout.tsx, page.tsx, CarteIndicateur.tsx, ClassementZones.tsx, CourbeIndicateur.tsx, TableauCommunes.tsx
src/app/api/pilotage/export/route.ts
tests/domain/pilotage.test.ts, tests/server/pilotage.test.ts, tests/ui/pilotage.test.tsx
```

---

### Tâche 1 : les indicateurs (domaine)

**Fichiers :** créer `src/domain/pilotage.ts` ; tester `tests/domain/pilotage.test.ts`.

**Interfaces (produit) :**
- `CODES_INDICATEURS` (`cpn4`, `naissances_centre`, `penta3`, `rr1`, `hta_controles`, `alertes_15min`, `alertes_delai`, `visites_relais`, `etapes_manquees`), `type CodeIndicateur`, `INDICATEURS: Record<CodeIndicateur, DefinitionIndicateur>` ;
- `interface Comptage { numerateur; denominateur }`, `type Valeurs = Record<CodeIndicateur, Comptage>`, `vide()`, `agreger(Valeurs[])` ;
- `SEUIL_MASQUE = 5`, `lireIndicateur(code, comptage): Lecture` avec `{ valeur, texte, detail, masque, niveau }` ;
- `lignesDe(orgUnit, valeurs, periode): LigneExport[]`, `versCsv(LigneExport[]): string` ;
- `premierDuMois(d)`, `moisPrecedents(mois, n)` (les n mois avant, du plus ancien au plus récent).

- [ ] **Étape 1 : écrire le test qui échoue**

Créer `tests/domain/pilotage.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { agreger, lignesDe, lireIndicateur, moisPrecedents, premierDuMois, versCsv, vide } from "@/domain/pilotage";

describe("lireIndicateur", () => {
  it("masque un taux qui porte sur moins de 5 personnes", () => {
    expect(lireIndicateur("cpn4", { numerateur: 3, denominateur: 4 })).toEqual({
      valeur: null,
      texte: "Masqué",
      detail: "Moins de 5 personnes : chiffre masqué",
      masque: true,
      niveau: null,
    });
  });

  it("dit si l'objectif est atteint, presque atteint, ou s'il faut appuyer", () => {
    expect(lireIndicateur("cpn4", { numerateur: 6, denominateur: 10 })).toEqual({ valeur: 60, texte: "60 %", detail: "6 sur 10", masque: false, niveau: "bon" });
    expect(lireIndicateur("cpn4", { numerateur: 5, denominateur: 10 }).niveau).toBe("moyen");
    expect(lireIndicateur("cpn4", { numerateur: 3, denominateur: 10 }).niveau).toBe("faible");
  });

  it("lit un délai en minutes : plus il est court, mieux c'est", () => {
    expect(lireIndicateur("alertes_delai", { numerateur: 60, denominateur: 6 })).toMatchObject({ valeur: 10, texte: "10 min", detail: "6 alertes", niveau: "bon" });
    expect(lireIndicateur("alertes_delai", { numerateur: 130, denominateur: 6 }).niveau).toBe("moyen");
    expect(lireIndicateur("alertes_delai", { numerateur: 200, denominateur: 6 }).niveau).toBe("faible");
  });

  it("donne un simple nombre pour les visites, et « — » quand il n'y a aucune donnée", () => {
    expect(lireIndicateur("visites_relais", { numerateur: 12, denominateur: 0 })).toMatchObject({ valeur: 12, texte: "12", masque: false });
    expect(lireIndicateur("penta3", { numerateur: 0, denominateur: 0 })).toMatchObject({ valeur: null, texte: "—", detail: "Aucune donnée pour la période" });
  });
});

describe("agreger et exporter", () => {
  it("additionne les communes pour faire la zone", () => {
    const a = { ...vide(), cpn4: { numerateur: 2, denominateur: 3 } };
    const b = { ...vide(), cpn4: { numerateur: 3, denominateur: 4 } };
    expect(agreger([a, b]).cpn4).toEqual({ numerateur: 5, denominateur: 7 });
  });

  it("exporte au format de DHIS2, sans les chiffres masqués", () => {
    const valeurs = { ...vide(), cpn4: { numerateur: 6, denominateur: 10 }, penta3: { numerateur: 2, denominateur: 3 } };
    const csv = versCsv(lignesDe("Zone ; test", valeurs, "202609").filter((l) => l.code === "cpn4" || l.code === "penta3"));
    expect(csv).toBe('orgUnit;period;dataElement;numerator;denominator;value\n"Zone ; test";202609;cpn4;6;10;60\n"Zone ; test";202609;penta3;;;\n');
  });
});

describe("mois", () => {
  it("compte les mois sans en sauter, même autour de février", () => {
    expect(premierDuMois("2026-09-26")).toBe("2026-09-01");
    expect(moisPrecedents("2026-03-01", 3)).toEqual(["2025-12-01", "2026-01-01", "2026-02-01"]);
    expect(moisPrecedents("2026-09-01", 5)).toEqual(["2026-04-01", "2026-05-01", "2026-06-01", "2026-07-01", "2026-08-01"]);
  });
});
```

Run : `pnpm vitest run tests/domain/pilotage.test.ts`
Expected : FAIL (module introuvable).

- [ ] **Étape 2 : écrire le code**

Créer `src/domain/pilotage.ts` :

```ts
export const CODES_INDICATEURS = [
  "cpn4",
  "naissances_centre",
  "penta3",
  "rr1",
  "hta_controles",
  "alertes_15min",
  "alertes_delai",
  "visites_relais",
  "etapes_manquees",
] as const;
export type CodeIndicateur = (typeof CODES_INDICATEURS)[number];

export interface Comptage {
  numerateur: number;
  denominateur: number;
}
export type Valeurs = Record<CodeIndicateur, Comptage>;

export interface DefinitionIndicateur {
  libelle: string;
  court: string;
  unite: "pourcent" | "minutes" | "nombre";
  /** Objectif indicatif ; pour un délai, le maximum souhaité. */
  cible?: number;
  aide: string;
}

/** Indicateurs de la spec §4.10 (valeurs cibles indicatives). */
export const INDICATEURS: Record<CodeIndicateur, DefinitionIndicateur> = {
  cpn4: { libelle: "Femmes allées jusqu'à la 4ᵉ consultation prénatale", court: "4ᵉ consultation prénatale", unite: "pourcent", cible: 60, aide: "Grossesses arrivées au terme de la 4ᵉ consultation" },
  naissances_centre: { libelle: "Naissances au centre de santé ou à l'hôpital", court: "Naissances au centre", unite: "pourcent", cible: 90, aide: "Naissances des 12 derniers mois" },
  penta3: { libelle: "Enfants vaccinés : Penta3, à 14 semaines", court: "Vaccin Penta3", unite: "pourcent", cible: 90, aide: "Enfants qui ont passé l'âge du vaccin" },
  rr1: { libelle: "Enfants vaccinés : rougeole-rubéole, à 9 mois", court: "Rougeole-rubéole", unite: "pourcent", cible: 85, aide: "Enfants qui ont passé l'âge du vaccin" },
  hta_controles: { libelle: "Hypertendus dont la tension est contrôlée", court: "Tension contrôlée", unite: "pourcent", cible: 50, aide: "Dernier relevé des 6 derniers mois sous 140/90" },
  alertes_15min: { libelle: "Signes de danger pris en charge en moins de 15 minutes", court: "Alertes en moins de 15 min", unite: "pourcent", cible: 90, aide: "Alertes des 30 derniers jours" },
  alertes_delai: { libelle: "Délai moyen de prise en charge des alertes", court: "Délai des alertes", unite: "minutes", cible: 15, aide: "Alertes des 30 derniers jours" },
  visites_relais: { libelle: "Visites à domicile des relais", court: "Visites des relais", unite: "nombre", aide: "30 derniers jours" },
  etapes_manquees: { libelle: "Rendez-vous de suivi manqués, à rattraper", court: "Rendez-vous manqués", unite: "nombre", aide: "60 derniers jours" },
};

/** Un chiffre qui porte sur moins de 5 personnes est masqué (spec §4.10). */
export const SEUIL_MASQUE = 5;

export type Niveau = "bon" | "moyen" | "faible";

export interface Lecture {
  valeur: number | null;
  texte: string;
  detail: string;
  masque: boolean;
  niveau: Niveau | null;
}

export function vide(): Valeurs {
  return Object.fromEntries(CODES_INDICATEURS.map((c) => [c, { numerateur: 0, denominateur: 0 }])) as Valeurs;
}

export function agreger(liste: Valeurs[]): Valeurs {
  const total = vide();
  for (const v of liste) {
    for (const c of CODES_INDICATEURS) {
      total[c].numerateur += v[c].numerateur;
      total[c].denominateur += v[c].denominateur;
    }
  }
  return total;
}

export function lireIndicateur(code: CodeIndicateur, c: Comptage): Lecture {
  const d = INDICATEURS[code];
  if (d.unite === "nombre") return { valeur: c.numerateur, texte: String(c.numerateur), detail: d.aide, masque: false, niveau: null };
  if (c.denominateur === 0) return { valeur: null, texte: "—", detail: "Aucune donnée pour la période", masque: false, niveau: null };
  if (c.denominateur < SEUIL_MASQUE) {
    return { valeur: null, texte: "Masqué", detail: `Moins de ${SEUIL_MASQUE} personnes : chiffre masqué`, masque: true, niveau: null };
  }
  const cible = d.cible ?? 0;
  if (d.unite === "minutes") {
    const valeur = Math.round(c.numerateur / c.denominateur);
    const niveau: Niveau = valeur <= cible ? "bon" : valeur <= cible * 1.5 ? "moyen" : "faible";
    return { valeur, texte: `${valeur} min`, detail: `${c.denominateur} alertes`, masque: false, niveau };
  }
  const valeur = Math.round((c.numerateur / c.denominateur) * 100);
  const niveau: Niveau = valeur >= cible ? "bon" : valeur >= cible - 15 ? "moyen" : "faible";
  return { valeur, texte: `${valeur} %`, detail: `${c.numerateur} sur ${c.denominateur}`, masque: false, niveau };
}

export interface LigneExport extends Comptage {
  orgUnit: string;
  periode: string;
  code: CodeIndicateur;
}

export function lignesDe(orgUnit: string, valeurs: Valeurs, periode: string): LigneExport[] {
  return CODES_INDICATEURS.map((code) => ({ orgUnit, periode, code, ...valeurs[code] }));
}

export const premierDuMois = (d: string): string => `${d.slice(0, 7)}-01`;

/** Les n mois qui précèdent (premiers jours), du plus ancien au plus récent. */
export function moisPrecedents(mois: string, n: number): string[] {
  const [annee, m] = mois.split("-").map(Number);
  const rang = annee! * 12 + (m! - 1);
  return Array.from({ length: n }, (_, i) => {
    const k = rang - (n - i);
    return `${Math.floor(k / 12)}-${String((k % 12) + 1).padStart(2, "0")}-01`;
  });
}

const echapper = (t: string) => (/[;"\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t);

/** Export au format proche de DHIS2 (unité, période, élément, valeur) ; un chiffre masqué reste masqué. */
export function versCsv(lignes: LigneExport[]): string {
  const corps = lignes.map((l) => {
    const lecture = lireIndicateur(l.code, l);
    const cache = lecture.masque;
    return [l.orgUnit, l.periode, l.code, cache ? "" : l.numerateur, cache ? "" : l.denominateur, lecture.valeur ?? ""].map((v) => echapper(String(v))).join(";");
  });
  return ["orgUnit;period;dataElement;numerator;denominator;value", ...corps].join("\n") + "\n";
}
```

- [ ] **Étape 3 : relancer le test**

Run : `pnpm vitest run tests/domain/pilotage.test.ts`
Expected : PASS (7 tests).

- [ ] **Étape 4 : commit**

```bash
git add src/domain/pilotage.ts tests/domain/pilotage.test.ts
git commit -m "feat(pilotage): indicateurs, masquage sous 5 personnes, export au format DHIS2"
```

---

### Tâche 2 : calcul en direct, zones et démo

**Fichiers :**
- Modifier : `src/server/db/schema.ts`, `src/server/demo/semer.ts`, `src/server/demo/donnees.ts`
- Créer : `src/server/requetes/pilotage.ts`, `drizzle/0004_*.sql` (généré)
- Tester : `tests/server/pilotage.test.ts`

**Interfaces (produit) :**
- `communes.zoneSanitaire` (texte, facultatif) ; table `indicateursZones` (`zone`, `departement`, `mois`, `code`, `numerateur`, `denominateur`, unique `zone + mois + code`) ;
- `CompteDemo.portee?: "national"` ; nouveau compte `ministere.sante` (pilotage, sans commune) ; le compte `zone.bohicon` s'appelle « Zone sanitaire Zogbodomey-Bohicon-Zakpota » ;
- `indicateursDesCommunes(db, communeIds, aujourdhui, maintenant): Promise<Map<string, Valeurs>>` ;
- `vueDeZone(db, communeId, aujourdhui, maintenant): Promise<VueZone | null>` avec `{ zone, departement, communes: { nom, valeurs }[], total, tendance: { mois, valeurs }[] }` ;
- `vueNationale(db, aujourdhui, maintenant): Promise<VueNationale>` avec `{ mois, zones: { zone, departement, valeurs, direct }[], national, tendance }`.

- [ ] **Étape 1 : écrire le test qui échoue**

Créer `tests/server/pilotage.test.ts` :

```ts
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { lireIndicateur } from "@/domain/pilotage";
import type { Db } from "@/server/db/client";
import { comptes } from "@/server/db/schema";
import { semerDemo } from "@/server/demo/semer";
import { vueDeZone, vueNationale } from "@/server/requetes/pilotage";
import { creerDbDeTest } from "../aides/base-de-test";

const aujourdhui = "2026-09-26";
const maintenant = new Date("2026-09-26T10:00:00Z");
let db: Db;
let fermer: () => Promise<void>;

beforeAll(async () => {
  ({ db, fermer } = await creerDbDeTest());
  await semerDemo(db, { aujourdhui });
});
afterAll(async () => fermer());

describe("vueDeZone", () => {
  it("calcule en direct les indicateurs de la zone, commune par commune", async () => {
    const [zone] = await db.select().from(comptes).where(eq(comptes.identifiant, "zone.bohicon"));
    const vue = await vueDeZone(db, zone!.communeId!, aujourdhui, maintenant);
    expect(vue).toMatchObject({ zone: "Zogbodomey-Bohicon-Zakpota", departement: "Zou" });
    expect(vue!.communes.map((c) => c.nom)).toEqual(["Bohicon", "Zogbodomey"]);
    // Les 9 alertes passées de la démo ont toutes été prises en charge.
    expect(vue!.total.alertes_delai.denominateur).toBe(9);
    expect(lireIndicateur("alertes_delai", vue!.total.alertes_delai).niveau).toBe("bon");
    expect(vue!.total.alertes_15min).toEqual({ numerateur: 7, denominateur: 9 });
    expect(vue!.total.visites_relais.numerateur).toBeGreaterThanOrEqual(1);
    expect(vue!.total.cpn4.denominateur).toBeGreaterThanOrEqual(1);
    expect(vue!.total.hta_controles.denominateur).toBeGreaterThanOrEqual(5);
    // Chaque commune ne pèse qu'une partie de la zone.
    const somme = vue!.communes.reduce((s, c) => s + c.valeurs.alertes_delai.denominateur, 0);
    expect(somme).toBe(9);
    expect(vue!.tendance).toHaveLength(6);
    expect(vue!.tendance.at(-1)).toEqual({ mois: "2026-09-01", valeurs: vue!.total });
  });
});

describe("vueNationale", () => {
  it("réunit la zone de la démo (en direct) et les autres zones du pays", async () => {
    const vue = await vueNationale(db, aujourdhui, maintenant);
    expect(vue.mois).toBe("2026-09-01");
    expect(vue.zones).toHaveLength(11);
    expect(vue.zones.filter((z) => z.direct).map((z) => z.zone)).toEqual(["Zogbodomey-Bohicon-Zakpota"]);
    expect(vue.national.cpn4.denominateur).toBe(vue.zones.reduce((s, z) => s + z.valeurs.cpn4.denominateur, 0));
    expect(vue.tendance.map((t) => t.mois)).toEqual(["2026-04-01", "2026-05-01", "2026-06-01", "2026-07-01", "2026-08-01", "2026-09-01"]);
  });
});
```

Run : `pnpm vitest run tests/server/pilotage.test.ts`
Expected : FAIL (module introuvable).

- [ ] **Étape 2 : schéma et migration**

Dans `src/server/db/schema.ts` :
- `communes` gagne `zoneSanitaire: text("zone_sanitaire")` ;
- ajouter :

```ts
/** Indicateurs mensuels déjà agrégés par zone sanitaire : historique, et zones du pays sans carnets dans la démo (données fictives). */
export const indicateursZones = pgTable(
  "indicateurs_zones",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    zone: text("zone").notNull(),
    departement: text("departement").notNull(),
    mois: date("mois", { mode: "string" }).notNull(),
    code: text("code").notNull(),
    numerateur: integer("numerateur").notNull(),
    denominateur: integer("denominateur").notNull(),
  },
  (t) => [uniqueIndex("indicateurs_zones_unique").on(t.zone, t.mois, t.code)],
);
```

```bash
pnpm db:generate --name pilotage
```

Expected : `drizzle/0004_pilotage.sql` ajoute la colonne et la table.

- [ ] **Étape 3 : calcul en direct**

Créer `src/server/requetes/pilotage.ts` :

```ts
import { and, asc, eq, gte, inArray, isNotNull, isNull } from "drizzle-orm";
import { planifier } from "@/domain/calendrier";
import { joursEntre, type DateISO } from "@/domain/dates";
import { agreger, CODES_INDICATEURS, premierDuMois, vide, type CodeIndicateur, type Valeurs } from "@/domain/pilotage";
import { PROGRAMMES } from "@/domain/programmes";
import { statutEtape } from "@/domain/statuts";
import type { Db } from "../db/client";
import { alertes, communes, evenements, foyers, indicateursZones, inscriptions, patients } from "../db/schema";
import { cleEtape, etapesFaites } from "./etapes-faites";
import { mesuresDes } from "./risques";

const JOUR_MS = 86_400_000;

/** Indicateurs calculés en direct, commune par commune, à partir des carnets : seuls des comptes sortent, jamais un nom. */
export async function indicateursDesCommunes(db: Db, communeIds: string[], aujourdhui: DateISO, maintenant: Date): Promise<Map<string, Valeurs>> {
  const resultat = new Map(communeIds.map((id) => [id, vide()]));
  if (communeIds.length === 0) return resultat;
  const personnes = await db
    .select({ id: patients.id, communeId: foyers.communeId })
    .from(patients)
    .innerJoin(foyers, eq(patients.foyerId, foyers.id))
    .where(inArray(foyers.communeId, communeIds));
  const ids = personnes.map((p) => p.id);
  if (ids.length === 0) return resultat;
  const communeDe = new Map(personnes.map((p) => [p.id, p.communeId]));
  const valeursDe = (patientId: string) => resultat.get(communeDe.get(patientId)!)!;
  const [lesInscriptions, faites, mesures, lesAlertes, lesEvenements] = await Promise.all([
    db.select().from(inscriptions).where(inArray(inscriptions.patientId, ids)),
    etapesFaites(db, ids),
    mesuresDes(db, ids),
    db
      .select({ patientId: alertes.patientId, creeeLe: alertes.creeeLe, prise: alertes.priseEnChargeLe })
      .from(alertes)
      .where(and(inArray(alertes.patientId, ids), gte(alertes.creeeLe, new Date(maintenant.getTime() - 30 * JOUR_MS)), isNull(alertes.annuleeLe))),
    db
      .select({ patientId: evenements.patientId, type: evenements.type, donnees: evenements.donnees, le: evenements.survenuLe })
      .from(evenements)
      .where(
        and(
          inArray(evenements.patientId, ids),
          inArray(evenements.type, ["accouchement", "visite_domicile"]),
          gte(evenements.survenuLe, new Date(maintenant.getTime() - 365 * JOUR_MS)),
        ),
      ),
  ]);

  for (const i of lesInscriptions) {
    const v = valeursDe(i.patientId);
    const faitesDuPatient = faites.get(i.patientId);
    const etapes = planifier(PROGRAMMES[i.programme], i.dateReference, i.dateInscription);
    const faite = (e: (typeof etapes)[number]) => Boolean(faitesDuPatient?.has(cleEtape(e.motif, e.code)));
    const compter = (code: CodeIndicateur, codeEtape: string) => {
      const e = etapes.find((x) => x.code === codeEtape);
      // Seules les étapes dont le délai est passé comptent : un vaccin encore à venir n'est pas un échec.
      if (!e || joursEntre(e.datePrevue, aujourdhui) <= e.toleranceManqueJours) return;
      v[code].denominateur++;
      if (faite(e)) v[code].numerateur++;
    };
    if (i.programme === "grossesse") compter("cpn4", "cpn4");
    if (i.programme === "vaccination") {
      compter("penta3", "14sem");
      compter("rr1", "9mois");
    }
    if (i.programme === "hypertension" && i.active) {
      const derniere = (mesures.get(i.patientId) ?? [])
        .filter((m) => m.tensionSys !== undefined && joursEntre(m.date, aujourdhui) <= 180)
        .sort((a, b) => a.date.localeCompare(b.date))
        .at(-1);
      if (derniere) {
        v.hta_controles.denominateur++;
        if ((derniere.tensionSys ?? 0) < 140 && (derniere.tensionDia ?? 0) < 90) v.hta_controles.numerateur++;
      }
    }
    if (i.active) {
      for (const e of etapes) {
        if (e.rendezVous && !faite(e) && statutEtape(e, false, aujourdhui) === "manquee" && joursEntre(e.datePrevue, aujourdhui) <= 60) v.etapes_manquees.numerateur++;
      }
    }
  }
  for (const a of lesAlertes) {
    const v = valeursDe(a.patientId);
    v.alertes_15min.denominateur++;
    if (a.prise) {
      const minutes = (a.prise.getTime() - a.creeeLe.getTime()) / 60_000;
      v.alertes_delai.numerateur += Math.round(minutes);
      v.alertes_delai.denominateur++;
      if (minutes <= 15) v.alertes_15min.numerateur++;
    }
  }
  for (const e of lesEvenements) {
    const v = valeursDe(e.patientId);
    if (e.type === "accouchement") {
      v.naissances_centre.denominateur++;
      if (e.donnees.lieu === "centre" || e.donnees.lieu === "hopital") v.naissances_centre.numerateur++;
    }
    if (e.type === "visite_domicile" && maintenant.getTime() - e.le.getTime() <= 30 * JOUR_MS) v.visites_relais.numerateur++;
  }
  return resultat;
}

/** Historique mensuel (table `indicateurs_zones`), additionné sur les zones demandées (toutes si aucune). */
async function historique(db: Db, zones?: string[]): Promise<{ mois: DateISO; valeurs: Valeurs }[]> {
  const lignes = await db
    .select()
    .from(indicateursZones)
    .where(zones ? inArray(indicateursZones.zone, zones) : undefined)
    .orderBy(asc(indicateursZones.mois));
  const parMois = new Map<DateISO, Valeurs>();
  for (const l of lignes) {
    if (!CODES_INDICATEURS.includes(l.code as CodeIndicateur)) continue;
    const v = parMois.get(l.mois) ?? vide();
    v[l.code as CodeIndicateur].numerateur += l.numerateur;
    v[l.code as CodeIndicateur].denominateur += l.denominateur;
    parMois.set(l.mois, v);
  }
  return [...parMois.entries()].map(([mois, valeurs]) => ({ mois, valeurs }));
}

export interface VueZone {
  zone: string;
  departement: string;
  communes: { nom: string; valeurs: Valeurs }[];
  total: Valeurs;
  tendance: { mois: DateISO; valeurs: Valeurs }[];
}

/** Ce que voient les agents de l'État d'une zone sanitaire : ses communes, en direct, et la tendance sur 6 mois. */
export async function vueDeZone(db: Db, communeId: string, aujourdhui: DateISO, maintenant: Date): Promise<VueZone | null> {
  const [commune] = await db.select().from(communes).where(eq(communes.id, communeId));
  if (!commune?.zoneSanitaire) return null;
  const lesCommunes = await db.select().from(communes).where(eq(communes.zoneSanitaire, commune.zoneSanitaire)).orderBy(asc(communes.nom));
  const parCommune = await indicateursDesCommunes(db, lesCommunes.map((c) => c.id), aujourdhui, maintenant);
  const total = agreger([...parCommune.values()]);
  const mois = premierDuMois(aujourdhui);
  const passe = (await historique(db, [commune.zoneSanitaire])).filter((h) => h.mois < mois);
  return {
    zone: commune.zoneSanitaire,
    departement: commune.departement,
    communes: lesCommunes.map((c) => ({ nom: c.nom, valeurs: parCommune.get(c.id)! })),
    total,
    tendance: [...passe, { mois, valeurs: total }].slice(-6),
  };
}

export interface VueNationale {
  mois: DateISO;
  zones: { zone: string; departement: string; valeurs: Valeurs; direct: boolean }[];
  national: Valeurs;
  tendance: { mois: DateISO; valeurs: Valeurs }[];
}

/** Ce que voit le ministère : toutes les zones sanitaires, les chiffres nationaux et leur tendance. */
export async function vueNationale(db: Db, aujourdhui: DateISO, maintenant: Date): Promise<VueNationale> {
  const mois = premierDuMois(aujourdhui);
  const zonesDirectes = await db
    .selectDistinct({ zone: communes.zoneSanitaire, departement: communes.departement })
    .from(communes)
    .where(isNotNull(communes.zoneSanitaire));
  const directes = await Promise.all(
    zonesDirectes.map(async (z) => {
      const ids = (await db.select({ id: communes.id }).from(communes).where(eq(communes.zoneSanitaire, z.zone!))).map((c) => c.id);
      return { zone: z.zone!, departement: z.departement, valeurs: agreger([...(await indicateursDesCommunes(db, ids, aujourdhui, maintenant)).values()]), direct: true };
    }),
  );
  const nomsDirects = new Set(directes.map((d) => d.zone));
  const duMois = await db.select().from(indicateursZones).where(eq(indicateursZones.mois, mois));
  const autres = new Map<string, { zone: string; departement: string; valeurs: Valeurs; direct: boolean }>();
  for (const l of duMois) {
    if (nomsDirects.has(l.zone) || !CODES_INDICATEURS.includes(l.code as CodeIndicateur)) continue;
    const z = autres.get(l.zone) ?? { zone: l.zone, departement: l.departement, valeurs: vide(), direct: false };
    z.valeurs[l.code as CodeIndicateur] = { numerateur: l.numerateur, denominateur: l.denominateur };
    autres.set(l.zone, z);
  }
  const zones = [...directes, ...autres.values()].sort((a, b) => a.zone.localeCompare(b.zone, "fr"));
  const national = agreger(zones.map((z) => z.valeurs));
  const passe = (await historique(db)).filter((h) => h.mois < mois);
  return { mois, zones, national, tendance: [...passe, { mois, valeurs: national }].slice(-6) };
}
```

- [ ] **Étape 4 : la démo**

Dans `src/server/demo/donnees.ts` :
- ajouter `portee?: "national"` à `CompteDemo` ;
- renommer le compte `zone.bohicon` : `nomAffiche: "Zone sanitaire Zogbodomey-Bohicon-Zakpota"`, `description: "Agents de l'État : les indicateurs de la zone, commune par commune, sans aucun nom"` ;
- ajouter, après lui :

```ts
  {
    identifiant: "ministere.sante",
    secret: "demo1234",
    role: "pilotage",
    nomAffiche: "Ministère de la Santé",
    description: "Vue nationale : toutes les zones sanitaires, tendances, zones à appuyer, export (données fictives)",
    portee: "national",
  },
```

Dans `src/server/demo/semer.ts` :
1. Les communes : `zoneSanitaire: "Zogbodomey-Bohicon-Zakpota"` pour Bohicon et Zogbodomey ; ajouter `"indicateurs_zones"` à `TABLES`.
2. Les comptes : `communeId: c.role === "relais" || (c.role === "pilotage" && c.portee !== "national") ? bohicon!.id : null`.
3. `patientsPopulation` garde aussi `sexe`, `foyerId` et `naissance` (dates de naissance) de chaque personne.
4. Juste avant « Contenus de base », ajouter :

```ts
  // --- Alertes des 30 derniers jours, toutes prises en charge : délais réalistes pour le pilotage ---
  const delais = [4, 6, 7, 9, 11, 12, 14, 18, 26];
  for (const [i, minutes] of delais.entries()) {
    const personne = h.parmi(patientsPopulation.filter((p) => p.age >= 1));
    const creeeLe = new Date(depuisDateISO(ajouterJours(aujourdhui, -(3 + i * 3))).getTime() + (8 + i) * 3_600_000);
    const evenementId = randomUUID();
    await db.insert(t.evenements).values({
      id: evenementId,
      patientId: personne.id,
      type: "signalement_danger",
      survenuLe: creeeLe,
      donnees: { signes: [h.parmi(["fievre", "douleur", "respiration"] as const)], source: "proche" },
    });
    await db.insert(t.alertes).values({
      patientId: personne.id,
      evenementId,
      etablissementId: cs!.id,
      creeeLe,
      echeance: new Date(creeeLe.getTime() + 15 * 60_000),
      priseEnChargePar: i % 2 ? firmin.id : adjoa.id,
      priseEnChargeLe: new Date(creeeLe.getTime() + minutes * 60_000),
    });
    nbEvenements++;
  }

  // --- Naissances de l'année : chaque bébé de moins d'un an né d'une femme de son foyer ---
  for (const bebe of patientsPopulation.filter((p) => p.programme === "vaccination" && p.age === 0)) {
    const mere = patientsPopulation.find((p) => p.foyerId === bebe.foyerId && p.sexe === "F" && p.age >= 17 && p.age <= 45);
    if (!mere) continue;
    const le = new Date(depuisDateISO(bebe.naissance).getTime() + 7 * 3_600_000);
    await db.insert(t.evenements).values({
      id: randomUUID(),
      patientId: mere.id,
      type: "accouchement",
      auteurId: adjoa.id,
      survenuLe: le,
      donnees: {
        le: le.toISOString(),
        lieu: h.chance(0.8) ? "centre" : "domicile",
        mode: h.chance(0.9) ? "voie_basse" : "cesarienne",
        enfant: { id: bebe.id, sexe: bebe.sexe, poidsGrammes: h.entier(2600, 3900) },
      },
    });
    nbEvenements++;
  }

  // --- Historique des 5 derniers mois et autres zones du pays (données fictives, générées à part) ---
  await db.insert(t.indicateursZones).values(indicateursFictifs(aujourdhui));
```

5. Ajouter en bas du fichier :

```ts
const ZONES_FICTIVES: [string, string][] = [
  ["Abomey-Calavi / Sô-Ava", "Atlantique"],
  ["Cotonou 1-4", "Littoral"],
  ["Covè / Ouinhi / Zangnanado", "Zou"],
  ["Dassa-Zoumè / Glazoué", "Collines"],
  ["Djougou / Copargo / Ouaké", "Donga"],
  ["Kandi / Gogounou / Ségbana", "Alibori"],
  ["Lokossa / Athiémé", "Mono"],
  ["Natitingou / Boukoumbé / Toucountouna", "Atacora"],
  ["Parakou / N'Dali", "Borgou"],
  ["Porto-Novo / Aguégués / Sèmè-Podji", "Ouémé"],
];

/** Taux de départ (bas, haut) et effectifs (petit, grand) par indicateur : valeurs fictives mais plausibles. */
const PROFILS: Record<CodeIndicateur, { taux?: [number, number]; effectif: [number, number]; minutes?: [number, number] }> = {
  cpn4: { taux: [0.38, 0.7], effectif: [120, 600] },
  naissances_centre: { taux: [0.7, 0.95], effectif: [150, 700] },
  penta3: { taux: [0.7, 0.95], effectif: [150, 700] },
  rr1: { taux: [0.62, 0.9], effectif: [140, 650] },
  hta_controles: { taux: [0.24, 0.55], effectif: [200, 900] },
  alertes_15min: { taux: [0.55, 0.95], effectif: [20, 90] },
  alertes_delai: { effectif: [20, 90], minutes: [8, 28] },
  visites_relais: { effectif: [300, 1500] },
  etapes_manquees: { effectif: [40, 300] },
};

/**
 * Indicateurs mensuels fictifs : les 10 autres zones (6 mois, dont le mois en cours), et l'historique de la zone de la démo
 * (5 mois passés, à l'échelle de ses carnets). Graine à part : le reste de la démo ne change pas.
 */
function indicateursFictifs(aujourdhui: DateISO) {
  const h = hasard(20260926);
  const mois = premierDuMois(aujourdhui);
  const lignes: (typeof t.indicateursZones.$inferInsert)[] = [];
  const zones: [string, string, number, boolean][] = [...ZONES_FICTIVES.map(([z, d]) => [z, d, 1, false] as [string, string, number, boolean]), ["Zogbodomey-Bohicon-Zakpota", "Zou", 0.03, true]];
  for (const [zone, departement, echelle, demo] of zones) {
    const base = Object.fromEntries(CODES_INDICATEURS.map((c) => [c, h.nombre()])) as Record<CodeIndicateur, number>;
    const lesMois = [...moisPrecedents(mois, 5), ...(demo ? [] : [mois])];
    for (const [rang, m] of lesMois.entries()) {
      for (const code of CODES_INDICATEURS) {
        const p = PROFILS[code];
        const effectif = Math.max(demo ? 5 : 1, Math.round((p.effectif[0] + base[code] * (p.effectif[1] - p.effectif[0])) * echelle * (0.9 + h.nombre() * 0.2)));
        if (p.taux) {
          const taux = Math.min(0.99, p.taux[0] + base[code] * (p.taux[1] - p.taux[0]) + rang * 0.01 + (h.nombre() - 0.5) * 0.04);
          lignes.push({ zone, departement, mois: m, code, numerateur: Math.round(effectif * taux), denominateur: effectif });
        } else if (p.minutes) {
          const minutes = p.minutes[0] + base[code] * (p.minutes[1] - p.minutes[0]) - rang * 0.4;
          lignes.push({ zone, departement, mois: m, code, numerateur: Math.round(effectif * minutes), denominateur: effectif });
        } else {
          lignes.push({ zone, departement, mois: m, code, numerateur: effectif, denominateur: 0 });
        }
      }
    }
  }
  return lignes;
}
```

(Importer `CODES_INDICATEURS`, `moisPrecedents`, `premierDuMois` et `type CodeIndicateur` de `@/domain/pilotage`.)

- [ ] **Étape 5 : relancer les tests, vérifier les types**

Run : `pnpm vitest run tests/server && pnpm typecheck`
Expected : PASS (les tests existants de la démo tiennent compte du compte du ministère : leur nombre suit `COMPTES_DEMO`).

- [ ] **Étape 6 : commit**

```bash
git add src/server drizzle tests/server/pilotage.test.ts
git commit -m "feat(pilotage): indicateurs calculés en direct par commune ; zones du pays et historique pour la démo"
```

---

### Tâche 3 : les écrans de pilotage

**Fichiers :**
- Créer : `src/app/pilotage/layout.tsx`, `src/app/pilotage/CarteIndicateur.tsx`, `src/app/pilotage/ClassementZones.tsx`, `src/app/pilotage/CourbeIndicateur.tsx`, `src/app/pilotage/TableauCommunes.tsx`, `src/app/api/pilotage/export/route.ts`
- Modifier : `src/app/pilotage/page.tsx`
- Tester : `tests/ui/pilotage.test.tsx`

**Interfaces :**
- Consomme : `lireIndicateur`, `INDICATEURS`, `Valeurs` (tâche 1) ; `vueDeZone`, `vueNationale` (tâche 2).
- Produit :
  - `CarteIndicateur({ code, comptage, precedent? })` ;
  - `ClassementZones({ code, zones })` ;
  - `CourbeIndicateur({ code, points: { mois, comptage }[] })` ;
  - `TableauCommunes({ lignes: { nom, valeurs }[] })` ;
  - `GET /api/pilotage/export` : CSV de la zone (par commune et total) ou national (par zone).

- [ ] **Étape 1 : écrire le test qui échoue**

Créer `tests/ui/pilotage.test.tsx` :

```tsx
// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { CarteIndicateur } from "@/app/pilotage/CarteIndicateur";
import { ClassementZones } from "@/app/pilotage/ClassementZones";
import { vide } from "@/domain/pilotage";

afterEach(cleanup);

describe("CarteIndicateur", () => {
  it("montre le taux, l'objectif et la progression depuis le mois dernier", () => {
    render(<CarteIndicateur code="cpn4" comptage={{ numerateur: 62, denominateur: 100 }} precedent={{ numerateur: 55, denominateur: 100 }} />);
    expect(screen.getByText("62 %")).toBeTruthy();
    expect(screen.getByText("Objectif atteint")).toBeTruthy();
    expect(screen.getByText("62 sur 100 · objectif 60 %")).toBeTruthy();
    expect(screen.getByText("+7 points")).toBeTruthy();
  });

  it("masque un chiffre qui porte sur moins de 5 personnes", () => {
    render(<CarteIndicateur code="penta3" comptage={{ numerateur: 2, denominateur: 3 }} />);
    expect(screen.getByText("Masqué")).toBeTruthy();
    expect(screen.getByText("Moins de 5 personnes : chiffre masqué")).toBeTruthy();
  });
});

describe("ClassementZones", () => {
  it("classe les zones de la meilleure à celle à appuyer, les chiffres masqués à la fin", () => {
    const zone = (nom: string, numerateur: number, denominateur: number, direct = false) => ({
      zone: nom,
      departement: "Zou",
      direct,
      valeurs: { ...vide(), cpn4: { numerateur, denominateur } },
    });
    render(<ClassementZones code="cpn4" zones={[zone("B", 40, 100), zone("A", 70, 100), zone("Démo", 2, 3, true), zone("C", 55, 100)]} />);
    const lignes = screen.getAllByRole("listitem");
    expect(lignes.map((l) => within(l).getByRole("heading").textContent)).toEqual(["A", "C", "B", "Démo"]);
    expect(within(lignes[3]!).getByText("Masqué")).toBeTruthy();
    expect(within(lignes[3]!).getByText("En direct")).toBeTruthy();
  });
});
```

Run : `pnpm vitest run tests/ui/pilotage.test.tsx`
Expected : FAIL (modules introuvables).

- [ ] **Étape 2 : écrire les composants**

Créer `src/app/pilotage/CarteIndicateur.tsx` :

```tsx
import { INDICATEURS, lireIndicateur, type CodeIndicateur, type Comptage, type Niveau } from "@/domain/pilotage";
import { Icone } from "@/ui/Icone";

export const STYLE_NIVEAU: Record<Niveau, { texte: string; badge: string; barre: string; libelle: string }> = {
  bon: { texte: "text-marque", badge: "bg-lavande-2 text-marque", barre: "bg-marque", libelle: "Objectif atteint" },
  moyen: { texte: "text-soleil-appuye", badge: "bg-soleil-pale text-nuit", barre: "bg-soleil", libelle: "Presque" },
  faible: { texte: "text-urgence", badge: "bg-urgence-pale text-urgence", barre: "bg-urgence", libelle: "À appuyer" },
};

/** Un indicateur : sa valeur, son objectif, et l'écart avec le mois dernier. */
export function CarteIndicateur({ code, comptage, precedent }: { code: CodeIndicateur; comptage: Comptage; precedent?: Comptage }) {
  const d = INDICATEURS[code];
  const lecture = lireIndicateur(code, comptage);
  const avant = precedent ? lireIndicateur(code, precedent) : null;
  const ecart = lecture.valeur !== null && avant?.valeur != null && d.unite !== "nombre" ? lecture.valeur - avant.valeur : null;
  const mieux = ecart !== null && (d.unite === "minutes" ? ecart < 0 : ecart > 0);
  const style = lecture.niveau ? STYLE_NIVEAU[lecture.niveau] : null;
  const unite = d.unite === "minutes" ? " min" : " points";
  return (
    <article className="flex flex-col gap-2 rounded-carte bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm leading-snug font-bold text-gris">{d.court}</h3>
        {style && <span className={`shrink-0 rounded-lg px-2 py-0.5 text-xs font-bold ${style.badge}`}>{style.libelle}</span>}
      </div>
      {lecture.masque ? (
        <p className="flex items-center gap-2 text-2xl font-bold text-gris">
          <Icone nom="ph-shield-check" className="size-7" />
          Masqué
        </p>
      ) : (
        <p className={`text-3xl font-bold ${style?.texte ?? "text-nuit"}`}>{lecture.texte}</p>
      )}
      {d.unite === "pourcent" && lecture.valeur !== null && (
        <div className="relative h-2 rounded-full bg-lavande-2">
          <div className={`h-2 rounded-full ${style?.barre ?? "bg-marque"}`} style={{ width: `${Math.min(100, lecture.valeur)}%` }} />
          <span className="absolute -top-1 h-4 w-0.5 bg-nuit" style={{ left: `${d.cible}%` }} title={`Objectif ${d.cible} %`} />
        </div>
      )}
      <p className="text-xs text-gris">
        {lecture.masque || lecture.valeur === null || d.unite === "nombre"
          ? lecture.detail
          : `${lecture.detail} · objectif ${d.unite === "minutes" ? `${d.cible} min au plus` : `${d.cible} %`}`}
      </p>
      {ecart !== null && ecart !== 0 && (
        <p className={`flex items-center gap-1 text-xs font-bold ${mieux ? "text-marque" : "text-urgence"}`}>
          <Icone nom={ecart > 0 ? "ph-trend-up" : "ph-trend-down"} className="size-4" />
          {ecart > 0 ? "+" : ""}
          {ecart}
          {unite}
        </p>
      )}
    </article>
  );
}
```

Créer `src/app/pilotage/ClassementZones.tsx` :

```tsx
import { lireIndicateur, type CodeIndicateur, type Valeurs } from "@/domain/pilotage";
import { STYLE_NIVEAU } from "./CarteIndicateur";

interface Zone {
  zone: string;
  departement: string;
  valeurs: Valeurs;
  direct: boolean;
}

/** Les zones rangées pour un indicateur : les mieux placées d'abord, les chiffres masqués ou absents à la fin. */
export function ClassementZones({ code, zones }: { code: CodeIndicateur; zones: Zone[] }) {
  const minutes = code === "alertes_delai";
  const lues = zones.map((z) => ({ ...z, lecture: lireIndicateur(code, z.valeurs[code]) }));
  const rang = (v: number | null) => (v === null ? Number.POSITIVE_INFINITY : minutes ? v : -v);
  lues.sort((a, b) => rang(a.lecture.valeur) - rang(b.lecture.valeur) || a.zone.localeCompare(b.zone, "fr"));
  const max = Math.max(1, ...lues.map((z) => z.lecture.valeur ?? 0));
  return (
    <ol className="flex flex-col gap-2">
      {lues.map((z) => {
        const style = z.lecture.niveau ? STYLE_NIVEAU[z.lecture.niveau] : null;
        const largeur = z.lecture.valeur === null ? 0 : minutes ? (z.lecture.valeur / max) * 100 : z.lecture.valeur;
        return (
          <li key={z.zone} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 rounded-2xl bg-white px-4 py-3 sm:grid-cols-[minmax(0,16rem)_1fr_auto]">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-bold">{z.zone}</h3>
              <p className="flex items-center gap-2 text-xs text-gris">
                {z.departement}
                {z.direct && <span className="rounded-md bg-soleil px-1.5 font-bold text-nuit">En direct</span>}
              </p>
            </div>
            <div className="col-span-2 h-2.5 rounded-full bg-lavande-2 sm:col-span-1">
              <div className={`h-2.5 rounded-full ${style?.barre ?? "bg-lavande-4"}`} style={{ width: `${Math.min(100, largeur)}%` }} />
            </div>
            <b className={`row-start-1 text-right sm:row-auto ${style?.texte ?? "text-gris"}`}>{z.lecture.texte}</b>
          </li>
        );
      })}
    </ol>
  );
}
```

Créer `src/app/pilotage/CourbeIndicateur.tsx` :

```tsx
import { INDICATEURS, lireIndicateur, type CodeIndicateur, type Comptage } from "@/domain/pilotage";

const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const LARGEUR = 560;
const HAUTEUR = 180;

/** La tendance sur 6 mois ; la ligne pointillée est l'objectif. */
export function CourbeIndicateur({ code, points }: { code: CodeIndicateur; points: { mois: string; comptage: Comptage }[] }) {
  const d = INDICATEURS[code];
  const lus = points.map((p) => ({ mois: p.mois, valeur: lireIndicateur(code, p.comptage).valeur }));
  const valeurs = lus.flatMap((p) => (p.valeur === null ? [] : [p.valeur]));
  if (valeurs.length < 2) return <p className="rounded-carte bg-white p-4 text-sm text-gris">Pas assez de mois pour une tendance.</p>;
  const haut = d.unite === "pourcent" ? 100 : Math.max(...valeurs, d.cible ?? 0) * 1.2;
  const x = (i: number) => 40 + (i * (LARGEUR - 60)) / (lus.length - 1);
  const y = (v: number) => HAUTEUR - 28 - (v / haut) * (HAUTEUR - 48);
  const trace = lus.flatMap((p, i) => (p.valeur === null ? [] : [`${x(i)},${y(p.valeur)}`])).join(" ");
  const resume = `${d.libelle} : ${lus.map((p) => `${MOIS[Number(p.mois.slice(5, 7)) - 1]} ${p.valeur ?? "masqué"}`).join(", ")}.`;
  return (
    <svg viewBox={`0 0 ${LARGEUR} ${HAUTEUR}`} role="img" aria-label={resume} className="w-full rounded-carte bg-white p-2">
      {d.cible !== undefined && (
        <g>
          <line x1={40} x2={LARGEUR - 20} y1={y(d.cible)} y2={y(d.cible)} className="stroke-nuit" strokeDasharray="5 4" strokeWidth="1" />
          <text x={4} y={y(d.cible) + 4} className="fill-nuit text-[11px] font-bold">
            {d.cible}
          </text>
        </g>
      )}
      <polyline points={trace} fill="none" className="stroke-marque" strokeWidth="3" strokeLinejoin="round" />
      {lus.map((p, i) =>
        p.valeur === null ? null : (
          <g key={p.mois}>
            <circle cx={x(i)} cy={y(p.valeur)} r="5" className="fill-marque" />
            <text x={x(i)} y={y(p.valeur) - 10} textAnchor="middle" className="fill-nuit text-[11px] font-bold">
              {p.valeur}
            </text>
          </g>
        ),
      )}
      {lus.map((p, i) => (
        <text key={`m-${p.mois}`} x={x(i)} y={HAUTEUR - 6} textAnchor="middle" className="fill-gris text-[11px]">
          {MOIS[Number(p.mois.slice(5, 7)) - 1]}
        </text>
      ))}
    </svg>
  );
}
```

Créer `src/app/pilotage/TableauCommunes.tsx` :

```tsx
import { CODES_INDICATEURS, INDICATEURS, lireIndicateur, type Valeurs } from "@/domain/pilotage";
import { STYLE_NIVEAU } from "./CarteIndicateur";

/** Les communes de la zone côte à côte ; un chiffre sur moins de 5 personnes reste masqué. */
export function TableauCommunes({ lignes }: { lignes: { nom: string; valeurs: Valeurs; total?: boolean }[] }) {
  return (
    <div className="overflow-x-auto rounded-carte bg-white">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="text-left text-xs text-gris">
            <th className="p-3 font-bold">Commune</th>
            {CODES_INDICATEURS.map((c) => (
              <th key={c} className="p-3 font-bold">
                {INDICATEURS[c].court}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lignes.map((l) => (
            <tr key={l.nom} className={`border-t border-lavande-2 ${l.total ? "bg-lavande font-bold" : ""}`}>
              <th scope="row" className="p-3 text-left font-bold">
                {l.nom}
              </th>
              {CODES_INDICATEURS.map((c) => {
                const lecture = lireIndicateur(c, l.valeurs[c]);
                return (
                  <td key={c} className={`p-3 ${lecture.niveau ? STYLE_NIVEAU[lecture.niveau].texte : "text-gris"}`} title={lecture.detail}>
                    {lecture.texte}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Étape 3 : la mise en page, la page et l'export**

Créer `src/app/pilotage/layout.tsx` :

```tsx
import { env } from "@/config/env";
import { exigerRole } from "@/server/auth/cookies";
import { BoutonDeconnexion } from "@/ui/BoutonDeconnexion";
import { Icone } from "@/ui/Icone";
import { Logo } from "@/ui/Logo";
import { MenuLateral } from "@/ui/MenuLateral";

export default async function PilotageLayout({ children }: { children: React.ReactNode }) {
  const compte = await exigerRole("pilotage");
  const national = !compte.communeId;
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[240px_1fr]">
      <aside className="flex flex-col gap-3 bg-white p-4 md:min-h-dvh md:gap-1 md:p-5">
        <div className="flex items-center gap-3 md:mb-6">
          <Logo className="size-10" />
          <div className="min-w-0">
            <b className="block text-lg leading-tight">{env.NEXT_PUBLIC_APP_NAME}</b>
            <small className="block truncate text-xs text-gris">{national ? "Vue nationale" : "Zone sanitaire"}</small>
          </div>
        </div>
        <MenuLateral liens={[{ href: "/pilotage", libelle: national ? "Vue nationale" : "Ma zone", icone: national ? "ph-bank" : "ph-map-trifold" }]} />
        <div className="flex items-center gap-2.5 rounded-2xl bg-lavande p-2.5 md:mt-auto">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-marque text-white">
            <Icone nom={national ? "ph-bank" : "ph-map-trifold"} className="size-5" />
          </span>
          <b className="min-w-0 flex-1 truncate text-sm">{compte.nomAffiche}</b>
          <BoutonDeconnexion compact className="grid size-9 place-items-center rounded-xl text-marque" />
        </div>
      </aside>
      <main className="flex min-w-0 flex-col gap-6 p-4 md:p-7">{children}</main>
    </div>
  );
}
```


Remplacer `src/app/pilotage/page.tsx` :

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { aujourdhuiAuBenin } from "@/domain/dates";
import { CODES_INDICATEURS, INDICATEURS, lireIndicateur, type CodeIndicateur } from "@/domain/pilotage";
import { exigerRole } from "@/server/auth/cookies";
import { db } from "@/server/db/client";
import { vueDeZone, vueNationale } from "@/server/requetes/pilotage";
import { Icone } from "@/ui/Icone";
import { CarteIndicateur } from "./CarteIndicateur";
import { ClassementZones } from "./ClassementZones";
import { CourbeIndicateur } from "./CourbeIndicateur";
import { TableauCommunes } from "./TableauCommunes";

export const metadata: Metadata = { title: "Pilotage" };

const TAUX = CODES_INDICATEURS.filter((c) => INDICATEURS[c].unite !== "nombre");
const choisir = (v: string | string[] | undefined): CodeIndicateur => (TAUX.find((c) => c === v) ?? "cpn4") as CodeIndicateur;

function Confidentialite() {
  return (
    <p className="flex items-center gap-2 rounded-carte bg-lavande-2 px-4 py-3 text-sm font-bold text-marque">
      <Icone nom="ph-shield-check" className="size-5 shrink-0" />
      Aucun nom ne sort de cet écran. Un chiffre qui porte sur moins de 5 personnes est masqué.
    </p>
  );
}

function Onglets({ actif }: { actif: CodeIndicateur }) {
  return (
    <nav aria-label="Indicateur" className="flex gap-2 overflow-x-auto pb-1">
      {TAUX.map((c) => (
        <Link
          key={c}
          href={`/pilotage?indicateur=${c}`}
          aria-current={c === actif ? "page" : undefined}
          scroll={false}
          className={`rounded-bouton px-3 py-2 text-sm font-bold whitespace-nowrap ${c === actif ? "bg-marque text-white" : "bg-white text-marque"}`}
        >
          {INDICATEURS[c].court}
        </Link>
      ))}
    </nav>
  );
}

function Exporter() {
  return (
    <a href="/api/pilotage/export" className="flex items-center gap-2 rounded-bouton bg-white px-4 py-2.5 text-sm font-bold text-marque">
      <Icone nom="ph-download-simple" className="size-5" />
      Exporter (CSV, format DHIS2)
    </a>
  );
}

export default async function Pilotage({ searchParams }: PageProps<"/pilotage">) {
  const compte = await exigerRole("pilotage");
  const indicateur = choisir((await searchParams).indicateur);
  const maintenant = new Date();
  const aujourdhui = aujourdhuiAuBenin(maintenant);

  if (compte.communeId) {
    const vue = await vueDeZone(db(), compte.communeId, aujourdhui, maintenant);
    if (!vue) return <p className="rounded-carte bg-white p-5">Ce compte n&apos;est rattaché à aucune zone sanitaire.</p>;
    const precedent = vue.tendance.at(-2)?.valeurs;
    return (
      <>
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-gris">Zone sanitaire · {vue.departement}</p>
            <h1 className="text-3xl font-bold">{vue.zone}</h1>
            <p className="text-gris">Calculé en direct depuis les carnets de {vue.communes.map((c) => c.nom).join(" et ")}.</p>
          </div>
          <Exporter />
        </header>
        <Confidentialite />
        <section aria-labelledby="titre-indicateurs" className="flex flex-col gap-3">
          <h2 id="titre-indicateurs" className="text-lg font-bold">
            Ce mois-ci
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {CODES_INDICATEURS.map((c) => (
              <CarteIndicateur key={c} code={c} comptage={vue.total[c]} precedent={precedent?.[c]} />
            ))}
          </div>
        </section>
        <section aria-labelledby="titre-tendance" className="flex flex-col gap-3">
          <h2 id="titre-tendance" className="text-lg font-bold">
            Sur 6 mois : {INDICATEURS[indicateur].libelle.toLowerCase()}
          </h2>
          <Onglets actif={indicateur} />
          <CourbeIndicateur code={indicateur} points={vue.tendance.map((t) => ({ mois: t.mois, comptage: t.valeurs[indicateur] }))} />
        </section>
        <section aria-labelledby="titre-communes" className="flex flex-col gap-3">
          <h2 id="titre-communes" className="text-lg font-bold">
            Commune par commune
          </h2>
          <TableauCommunes lignes={[...vue.communes, { nom: "Toute la zone", valeurs: vue.total, total: true }]} />
        </section>
      </>
    );
  }

  const vue = await vueNationale(db(), aujourdhui, maintenant);
  const precedent = vue.tendance.at(-2)?.valeurs;
  const aAppuyer = vue.zones
    .map((z) => ({ zone: z.zone, faibles: TAUX.filter((c) => lireIndicateur(c, z.valeurs[c]).niveau === "faible").map((c) => INDICATEURS[c].court) }))
    .filter((z) => z.faibles.length > 0)
    .sort((a, b) => b.faibles.length - a.faibles.length);
  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-gris">Ministère de la Santé</p>
          <h1 className="text-3xl font-bold">Vue nationale</h1>
          <p className="text-gris">
            {vue.zones.length} zones sanitaires. La zone Zogbodomey-Bohicon-Zakpota est calculée en direct ; les autres sont des données fictives de démonstration.
          </p>
        </div>
        <Exporter />
      </header>
      <Confidentialite />
      <section aria-labelledby="titre-national" className="flex flex-col gap-3">
        <h2 id="titre-national" className="text-lg font-bold">
          Le pays ce mois-ci
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {TAUX.map((c) => (
            <CarteIndicateur key={c} code={c} comptage={vue.national[c]} precedent={precedent?.[c]} />
          ))}
        </div>
      </section>
      <section aria-labelledby="titre-zones" className="flex flex-col gap-3">
        <h2 id="titre-zones" className="text-lg font-bold">
          Les zones : {INDICATEURS[indicateur].libelle.toLowerCase()}
        </h2>
        <Onglets actif={indicateur} />
        <div className="grid gap-4 xl:grid-cols-[1fr_minmax(0,28rem)]">
          <ClassementZones code={indicateur} zones={vue.zones} />
          <div className="flex flex-col gap-3">
            <h3 className="font-bold">Tendance nationale sur 6 mois</h3>
            <CourbeIndicateur code={indicateur} points={vue.tendance.map((t) => ({ mois: t.mois, comptage: t.valeurs[indicateur] }))} />
            {aAppuyer.length > 0 && (
              <div className="rounded-carte bg-white p-4">
                <h3 className="font-bold text-urgence">Zones à appuyer</h3>
                <ul className="mt-2 flex flex-col gap-2 text-sm">
                  {aAppuyer.slice(0, 5).map((z) => (
                    <li key={z.zone}>
                      <b>{z.zone}</b> : {z.faibles.join(", ")}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
```

Créer `src/app/api/pilotage/export/route.ts` :

```ts
import { aujourdhuiAuBenin } from "@/domain/dates";
import { lignesDe, versCsv } from "@/domain/pilotage";
import { compteCourant } from "@/server/auth/cookies";
import { db } from "@/server/db/client";
import { vueDeZone, vueNationale } from "@/server/requetes/pilotage";

export const dynamic = "force-dynamic";

/** Export des indicateurs du mois (CSV proche de DHIS2) : jamais de nom, les chiffres masqués restent masqués. */
export async function GET() {
  const compte = await compteCourant();
  if (compte?.role !== "pilotage") return new Response("Connexion requise", { status: 401 });
  const maintenant = new Date();
  const aujourdhui = aujourdhuiAuBenin(maintenant);
  const periode = aujourdhui.slice(0, 7).replace("-", "");
  let csv: string;
  let nom: string;
  if (compte.communeId) {
    const vue = await vueDeZone(db(), compte.communeId, aujourdhui, maintenant);
    if (!vue) return new Response("Aucune zone sanitaire", { status: 404 });
    csv = versCsv([...vue.communes.flatMap((c) => lignesDe(c.nom, c.valeurs, periode)), ...lignesDe(vue.zone, vue.total, periode)]);
    nom = "zone";
  } else {
    const vue = await vueNationale(db(), aujourdhui, maintenant);
    csv = versCsv(vue.zones.flatMap((z) => lignesDe(z.zone, z.valeurs, periode)));
    nom = "national";
  }
  return new Response(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="indicateurs-${nom}-${periode}.csv"`, "Cache-Control": "no-store" },
  });
}
```

- [ ] **Étape 4 : relancer les tests, vérifier les types et le style**

Run : `pnpm vitest run tests/ui tests/domain && pnpm typecheck && pnpm lint`
Expected : PASS.

- [ ] **Étape 5 : vérifier dans le navigateur (1280 px)**

- **Zone** :
  - neuf cartes, dont le délai des alertes et « Alertes en moins de 15 min » ;
  - la tendance ;
  - le tableau des communes, avec des chiffres « Masqué » ;
  - l'export CSV téléchargé (en-tête DHIS2).
- **Ministère** :
  - onze zones, dont la zone de la démo « En direct » ;
  - le classement change avec les onglets ;
  - « Zones à appuyer » ;
  - l'export national.

Captures `pilotage-zone.png`, `pilotage-ministere.png`.

- [ ] **Étape 6 : commit**

```bash
git add src/app/pilotage src/app/api/pilotage tests/ui/pilotage.test.tsx
git commit -m "feat(pilotage): la zone sanitaire en direct et la vue nationale du ministère, avec l'export"
```

---

### Tâche 4 : README et mise en ligne

- [ ] **Étape 1 : README**

Ajouter une section « Pilotage (État) » :
- la zone sanitaire en direct, commune par commune ;
- le ministère : vue nationale, classement, tendance, zones à appuyer ;
- l'export CSV au format DHIS2 ;
- le masquage sous 5 personnes ;
- aucun nom.

Dans le tableau des comptes, ajouter `ministere.sante / demo1234` et renommer la zone.

- [ ] **Étape 2 : suite complète, build, envoi, déploiement**

Run : `pnpm test && pnpm typecheck && pnpm lint && pnpm build`
Expected : tout passe.

Ensuite :
1. `git push origin main` ;
2. suivre le déploiement (migration 0004) ;
3. réinitialiser la démo en production ;
4. vérifier la zone et le ministère sur https://moncarnet.kheios.com ;
5. réinitialiser la démo.

```bash
git add README.md
git commit -m "docs: le pilotage de l'État dans le README"
```
