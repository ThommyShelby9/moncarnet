# Plan 2 : espace patient — plan d'implémentation

> **Pour les agents :** sous-skill requis : superpowers:subagent-driven-development (recommandé) ou superpowers:executing-plans, pour exécuter ce plan tâche par tâche. Les étapes utilisent des cases à cocher (`- [ ]`) pour le suivi.

**Objectif :** livrer l'espace patient de Mon Carnet. Accueil « une chose à la fois » (cartes du jour avec écoute, « C'est fait » et « Plus tard »), prise de rendez-vous en 4 étapes avec places et liste d'attente, carnet avec tampons « VU », liste des rendez-vous, famille, et bouton « J'ai un problème » qui crée une alerte au centre, sans jamais laisser croire qu'elle est partie quand il n'y a pas de réseau.

**Architecture :** la logique reste pure dans `src/domain/` : temps et libellés, traitements, cartes du jour, places, signes de danger. Les actions métier (`src/server/patient/`) et les lectures (`src/server/requetes/`) vérifient les droits par `lienAvecPatient` et renvoient un `Resultat` typé. Les pages sont des Server Components dans le groupe de routes `src/app/(patient)/`. Elles utilisent des formulaires reliés à des Server Actions, qui marchent même avant le chargement du JavaScript. Côté client, seulement quatre composants : la pile de cartes, la barre de navigation, le retour d'action (son et vibration) et le formulaire de signalement. Le hors-ligne passe par `experimental.useOffline` de Next 16 : une Server Action lancée sans réseau reste en attente, puis repart toute seule au retour du réseau.

**Stack :** celle du plan 1 (Next.js 16.3.6, React 19.2, TypeScript strict, Tailwind 4.3, Drizzle 0.45.3, PGlite en tests, Zod 4, Vitest 5). Nouveau : `next/offline` (`useOffline`, expérimental).

**Spec :** [`docs/superpowers/specs/2026-09-25-esante-benin-design.md`](../specs/2026-09-25-esante-benin-design.md), §4.1, §4.2, §4.7, §5, §7, §8, §9, §10.3 et §10.4. Maquettes : [`docs/design/maquettes-validees.html`](../../design/maquettes-validees.html) (accueil B, rendez-vous B, carnet de Sèna).

## Contraintes globales

- Toutes les contraintes du plan 1 s'appliquent : Node 22, pnpm 11.1.2, Next.js 16.3.6, TypeScript `strict`, pas de Docker ni de PGlite en production, Fira Sans auto-hébergée, identifiants en français, données fictives.
- **Tests dans `tests/`**, séparés du code, imports par l'alias `@/`. TDD : le test d'abord, le voir échouer, puis le code.
- **Lire `node_modules/next/dist/docs/`** avant d'utiliser une API Next (AGENTS.md). Pour ce plan : `01-app/02-guides/forms.md`, `01-app/02-guides/offline-support.md`, `01-app/03-api-reference/04-functions/use-offline.md`, `01-app/03-api-reference/03-file-conventions/route-groups.md`.
- Le nom de la plateforme n'est jamais écrit en dur : `env.NEXT_PUBLIC_APP_NAME`.
- Couleurs uniquement par les variables de thème (`marque`, `nuit`, `lavande`…). Le **soleil** sert seulement à écouter, parler, aux moments du jour et à « à surveiller ». Le **rouge** sert seulement à l'urgence.
- Règles d'interface (spec §9) : toujours **icône + mot + écouter** ; **une décision par écran** dans les parcours ; **moments de la journée** plutôt que des heures ; **aucune saisie de texte** pour les patients ; **confirmation visuelle, sonore et par vibration**, avec annulation possible.
- Textes en **français simple**, phrases courtes, casse de phrase. Jamais de diagnostic dans un message.
- « Aujourd'hui » et les heures se calculent **à l'heure du Bénin (UTC+1)**.
- Chaque action métier vérifie que le compte gère le carnet (`lienAvecPatient`) et renvoie `{ ok: true, donnees } | { ok: false, erreur }` (spec §10.4).
- Exécution **par moi-même, tâche par tâche, sans agents** (demande de l'utilisateur). Commits en français, poussés sur `main`.

## Points de vigilance à l'usage

Cas qui découlent de la spec sans être au cœur des tests principaux. Chacun a son test dans la tâche indiquée.

1. **`?pour=` qui désigne le carnet d'une autre famille** (lien recopié, adresse modifiée) : la page revient au carnet du titulaire, et toute action sur ce carnet est refusée (`interdit`) (tâches 7 et 8).
2. **Deux personnes réservent la dernière place au même moment** : une seule obtient la place ; l'autre revient au choix du jour avec « Ce jour vient d'être complet » (tâche 8).
3. **« J'ai un problème » envoyé deux fois** (double appui, ou nouvel essai au retour du réseau) : une seule alerte, grâce à l'identifiant créé sur le téléphone (tâche 8).
4. **Prise notée juste après minuit à l'heure du Bénin** (23 h 30 UTC) : elle compte pour le nouveau jour, pas pour la veille (tâche 10).
5. **« C'est fait » puis « Annuler »** : la carte revient dans la pile, parce que le dernier mot compte (tâches 4 et 5).

## Hors de ce plan (prévu ailleurs)

- Carte « message du centre » et confirmation du rendez-vous par le canal préféré : plan 5 (table `messages`, WhatsApp).
- Écoute en fon et dans les autres langues : plan 6 (contenus audio). Ici, le bouton écouter lit le texte en français par la synthèse vocale du téléphone.
- Écoute automatique pour les personnes malvoyantes : les navigateurs bloquent le son sans geste de l'utilisateur ; à traiter avec l'audit d'accessibilité du plan 6.
- Prise en charge, compte à rebours et remontée des alertes côté soignant : plan 3.
- Ouverture des pages sans aucun réseau (service worker) : plan 4.

---

## Structure des fichiers

```
next.config.ts                                  + experimental.useOffline
src/app/globals.css                             + lavande-4, lavande-5 (pile de cartes)
src/ui/icones/svg/                              + 13 pictogrammes (signes de danger, rendez-vous)

src/domain/
  temps.ts                  heure et jour au Bénin, salutation, moments de prise, libellés de dates, soleils
  identifiants.ts           estUuid
  signes-danger.ts          CODES_SIGNES, LIBELLES_SIGNES, signesProposes, CONSEIL_URGENCE
  alertes.ts                DELAI_PRISE_EN_CHARGE_MINUTES, echeanceAlerte
  evenements.ts             + signalement_danger, delivrance, prise « annule »
  traitements.ts            traitementsEnCours, statutsDesPrises, cleDePrise
  cartes-du-jour.ts         cartesDuJour (pile + « ensuite »), textes des cartes
  rendez-vous.ts            libellés des motifs, motifDePlage, motifsProposes, joursProposes

src/server/
  resultat.ts               Resultat, reussite, echec
  droits.ts                 + lienAvecPatient
  db/schema.ts              + liste_attente, alertes ; LigneOrdonnance = LigneTraitement
  patient/prises.ts         noterPrise
  patient/reservation.ts    reserver, inscrireListeAttente
  patient/signalement.ts    signalerDanger, annulerAlerte
  requetes/carnets.ts       + programmes et établissement du carnet, choisirCarnet, etablissementDuPatient
  requetes/etapes-faites.ts etapesFaites, cleEtape
  requetes/accueil.ts       traitementsDes, prisesDuJour, donneesAccueil
  requetes/rendez-vous.ts   rendezVousVus, placesDisponibles, listeAttenteDe
  requetes/carnet.ts        programmesDuCarnet
  requetes/contenus.ts      texteContenu
  demo/semer.ts             Sèna à 8 mois et 28 jours, traitements délivrés, places prises, réservations

drizzle/0001_espace_patient.sql                 migration générée

src/ui/
  Ondes.tsx, Tampon.tsx (+ FiltreEncre), Etapes.tsx, AvatarsFamille.tsx, TuileChoix.tsx,
  JourDisponible.tsx, EnTeteQuestion.tsx, pictogrammes.ts
  PileDeCartes.tsx, BarreNavigation.tsx, RetourAction.tsx, BandeauHorsLigne.tsx, BoutonEnvoi.tsx (client)
  BoutonEcouter.tsx         + variantes « pastille » et « rond »

src/app/(patient)/
  layout.tsx                colonne mobile + filtre d'encre des tampons
  contexte.ts               contextePatient, texteDe
  actions.ts                Server Actions de l'espace patient
  (onglets)/layout.tsx      barre de navigation
  (onglets)/page.tsx        accueil « une chose à la fois »          → /
  (onglets)/CarteDuJourVue.tsx, (onglets)/Ensuite.tsx
  (onglets)/rendez-vous/page.tsx                                      → /rendez-vous
  (onglets)/carnet/page.tsx, (onglets)/carnet/Frise.tsx               → /carnet
  (onglets)/famille/page.tsx                                          → /famille
  prendre-rendez-vous/page.tsx                                        → /prendre-rendez-vous
  probleme/page.tsx, probleme/loading.tsx, probleme/FormulaireSignalement.tsx → /probleme
src/app/page.tsx            supprimé (remplacé par (patient)/(onglets)/page.tsx)

tests/domain/{temps,identifiants,signes-danger,traitements,cartes-du-jour,rendez-vous}.test.ts
tests/server/lien-patient.test.ts
tests/server/patient/{prises,reservation,signalement}.test.ts
tests/server/requetes/{accueil,carnet,rendez-vous}.test.ts
tests/ui/{PileDeCartes,BarreNavigation,RetourAction,BandeauHorsLigne,charte}.test.tsx
```

---

### Tâche 1 : pictogrammes des signes de danger et de la prise de rendez-vous

**Fichiers :**
- Créer : `src/ui/icones/svg/hi-{blood-drop,headache,foot,fetus,lungs,vomiting,diarrhea}.svg`, `src/ui/icones/svg/ph-{drop,question,hourglass-medium,map-pin,arrow-counter-clockwise,check}.svg`
- Régénérer : `public/icons/sprite.svg`, `src/ui/icones.ts` (par `pnpm icones`)
- Tester : `tests/ui/Icone.test.tsx`

**Interfaces :**
- Produit : les noms `hi-blood-drop`, `hi-headache`, `hi-foot`, `hi-fetus`, `hi-lungs`, `hi-vomiting`, `hi-diarrhea`, `ph-drop`, `ph-question`, `ph-hourglass-medium`, `ph-map-pin`, `ph-arrow-counter-clockwise`, `ph-check` dans `NomIcone`.

- [ ] **Étape 1 : écrire le test qui échoue**

Ajouter dans `tests/ui/Icone.test.tsx`, dans le `describe` :

```tsx
  it("connaît les pictogrammes des signes de danger et du rendez-vous", () => {
    for (const nom of ["hi-blood-drop", "hi-headache", "hi-foot", "hi-fetus", "hi-lungs", "hi-vomiting", "hi-diarrhea", "ph-drop", "ph-question", "ph-hourglass-medium", "ph-map-pin", "ph-arrow-counter-clockwise", "ph-check"]) {
      expect(NOMS_ICONES).toContain(nom);
    }
  });
```

- [ ] **Étape 2 : lancer le test et le voir échouer**

Run : `pnpm vitest run tests/ui/Icone.test.tsx`
Expected : FAIL (`expected [...] to include 'hi-blood-drop'`).

- [ ] **Étape 3 : télécharger les pictogrammes et régénérer le sprite**

```bash
HI="https://raw.githubusercontent.com/resolvetosavelives/healthicons/main/public/icons/svg/filled"
for p in body/blood-drop conditions/headache body/foot people/fetus body/lungs conditions/vomiting conditions/diarrhea; do
  curl -fsSL "$HI/$p.svg" -o "src/ui/icones/svg/hi-$(basename "$p").svg"
done
PH="https://unpkg.com/@phosphor-icons/core@2.1.1/assets/fill"
for n in drop question hourglass-medium map-pin arrow-counter-clockwise check; do
  curl -fsSL "$PH/$n-fill.svg" -o "src/ui/icones/svg/ph-$n.svg"
done
pnpm icones
```

Expected : `59 icônes assemblées.`

- [ ] **Étape 4 : relancer le test**

Run : `pnpm vitest run tests/ui/Icone.test.tsx`
Expected : PASS (5 tests).

- [ ] **Étape 5 : commit**

```bash
git add src/ui/icones public/icons/sprite.svg src/ui/icones.ts tests/ui/Icone.test.tsx
git commit -m "feat(ui): pictogrammes des signes de danger et de la prise de rendez-vous"
```

---

### Tâche 2 : temps et libellés de dates

**Fichiers :**
- Créer : `src/domain/temps.ts`
- Tester : `tests/domain/temps.test.ts`

**Interfaces :**
- Consomme : `depuisDateISO`, `joursEntre`, `DateISO` (`src/domain/dates.ts`).
- Produit :
  - `heureAuBenin(maintenant?: Date): number` ; `debutDuJourAuBenin(jour: DateISO): Date` ; `salutation(heure: number): "Bonjour" | "Bonsoir"` ;
  - `MOMENTS_PRISE`, `type MomentPrise = "matin" | "midi" | "soir"`, `momentCommence(moment, heure): boolean` ;
  - `LIBELLE_MOMENT` (« Ce matin », « À midi », « Ce soir »), `LIBELLE_MOMENT_POSOLOGIE` (« Le matin », « À midi », « Le soir »), `LIBELLE_MOMENT_RDV` (`matin` → « le matin », `apres_midi` → « l'après-midi ») ;
  - `majuscule(texte)`, `nomDuJour(d)`, `dateLongue(d)` (« mercredi 30 septembre »), `dateCourte(d)` (« 30/09 »), `moisEtAnnee(d)` (« mai 2027 ») ;
  - `libelleDansJours(n)`, `libelleJour(d, aujourdhui)`, `nombreDeSoleils(n)`.

- [ ] **Étape 1 : écrire les tests qui échouent**

Créer `tests/domain/temps.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import {
  dateCourte,
  dateLongue,
  debutDuJourAuBenin,
  heureAuBenin,
  libelleDansJours,
  libelleJour,
  majuscule,
  moisEtAnnee,
  momentCommence,
  nombreDeSoleils,
  salutation,
} from "@/domain/temps";

describe("heure et jour au Bénin", () => {
  it("donne l'heure locale, à UTC+1", () => {
    expect(heureAuBenin(new Date("2026-09-25T19:02:00Z"))).toBe(20);
    expect(heureAuBenin(new Date("2026-09-25T23:30:00Z"))).toBe(0);
  });

  it("fait commencer la journée à minuit, heure du Bénin", () => {
    expect(debutDuJourAuBenin("2026-09-25").toISOString()).toBe("2026-09-24T23:00:00.000Z");
  });
});

describe("salutation et moments de prise", () => {
  it("dit bonjour le jour et bonsoir à partir de 17 h", () => {
    expect(salutation(10)).toBe("Bonjour");
    expect(salutation(17)).toBe("Bonsoir");
    expect(salutation(2)).toBe("Bonsoir");
  });

  it("attend la prise du soir à partir de 17 h", () => {
    expect(momentCommence("soir", 16)).toBe(false);
    expect(momentCommence("soir", 17)).toBe(true);
    expect(momentCommence("matin", 5)).toBe(true);
  });
});

describe("libellés de dates", () => {
  it("écrit la date en toutes lettres", () => {
    expect(dateLongue("2026-09-30")).toBe("mercredi 30 septembre");
    expect(dateLongue("2026-10-01")).toBe("jeudi 1er octobre");
    expect(dateCourte("2026-02-12")).toBe("12/02");
    expect(moisEtAnnee("2027-05-03")).toBe("mai 2027");
  });

  it.each([
    [0, "aujourd'hui"],
    [1, "demain"],
    [2, "dans 2 jours"],
    [6, "dans 6 jours"],
    [7, "dans 1 semaine"],
    [13, "dans 1 semaine"],
    [14, "dans 2 semaines"],
    [29, "dans 4 semaines"],
    [45, "dans 1 mois"],
    [95, "dans 3 mois"],
    [-1, "hier"],
    [-3, "il y a 3 jours"],
  ] as const)("%i jours : %s", (n, texte) => {
    expect(libelleDansJours(n)).toBe(texte);
  });

  it("nomme le jour : aujourd'hui, demain, le jour de la semaine, puis la date", () => {
    expect(libelleJour("2026-09-25", "2026-09-25")).toBe("Aujourd'hui");
    expect(libelleJour("2026-09-26", "2026-09-25")).toBe("Demain");
    expect(libelleJour("2026-09-30", "2026-09-25")).toBe("Mercredi");
    expect(libelleJour("2026-10-07", "2026-09-25")).toBe("Mercredi 7 octobre");
  });

  it("met un soleil par jour d'attente, jusqu'à 6", () => {
    expect(nombreDeSoleils(0)).toBe(0);
    expect(nombreDeSoleils(2)).toBe(2);
    expect(nombreDeSoleils(7)).toBe(0);
  });

  it("met une majuscule, accents compris", () => {
    expect(majuscule("écouter")).toBe("Écouter");
  });
});
```

- [ ] **Étape 2 : lancer les tests et les voir échouer**

Run : `pnpm vitest run tests/domain/temps.test.ts`
Expected : FAIL (`Cannot find module '@/domain/temps'`).

- [ ] **Étape 3 : écrire le code**

Créer `src/domain/temps.ts` :

```ts
import { depuisDateISO, joursEntre, type DateISO } from "./dates";

const DECALAGE_BENIN_MS = 60 * 60 * 1000;

/** Heure au Bénin (UTC+1 toute l'année), de 0 à 23. */
export function heureAuBenin(maintenant: Date = new Date()): number {
  return new Date(maintenant.getTime() + DECALAGE_BENIN_MS).getUTCHours();
}

/** Instant de minuit au Bénin pour ce jour-là. */
export function debutDuJourAuBenin(jour: DateISO): Date {
  return new Date(depuisDateISO(jour).getTime() - DECALAGE_BENIN_MS);
}

export function salutation(heure: number): "Bonjour" | "Bonsoir" {
  return heure >= 5 && heure < 17 ? "Bonjour" : "Bonsoir";
}

export const MOMENTS_PRISE = ["matin", "midi", "soir"] as const;
export type MomentPrise = (typeof MOMENTS_PRISE)[number];

/** Heure à partir de laquelle chaque prise est attendue. */
const DEBUT_MOMENT: Record<MomentPrise, number> = { matin: 5, midi: 11, soir: 17 };

export function momentCommence(moment: MomentPrise, heure: number): boolean {
  return heure >= DEBUT_MOMENT[moment];
}

export const LIBELLE_MOMENT: Record<MomentPrise, string> = { matin: "Ce matin", midi: "À midi", soir: "Ce soir" };
export const LIBELLE_MOMENT_POSOLOGIE: Record<MomentPrise, string> = { matin: "Le matin", midi: "À midi", soir: "Le soir" };
export const LIBELLE_MOMENT_RDV = { matin: "le matin", apres_midi: "l'après-midi" } as const;

const JOURS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"] as const;
const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"] as const;

export function majuscule(texte: string): string {
  return texte.charAt(0).toLocaleUpperCase("fr") + texte.slice(1);
}

export function nomDuJour(d: DateISO): string {
  return JOURS[depuisDateISO(d).getUTCDay()]!;
}

/** « mercredi 30 septembre », « jeudi 1er octobre ». */
export function dateLongue(d: DateISO): string {
  const date = depuisDateISO(d);
  const jour = date.getUTCDate();
  return `${JOURS[date.getUTCDay()]} ${jour === 1 ? "1er" : jour} ${MOIS[date.getUTCMonth()]}`;
}

/** « 12/02 », comme sur le carnet papier. */
export function dateCourte(d: DateISO): string {
  return `${d.slice(8, 10)}/${d.slice(5, 7)}`;
}

/** « mai 2027 », pour une étape encore lointaine. */
export function moisEtAnnee(d: DateISO): string {
  const date = depuisDateISO(d);
  return `${MOIS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

export function libelleDansJours(n: number): string {
  if (n === 0) return "aujourd'hui";
  if (n === 1) return "demain";
  if (n === -1) return "hier";
  if (n < 0) return `il y a ${-n} jours`;
  if (n < 7) return `dans ${n} jours`;
  if (n < 30) {
    const semaines = Math.floor(n / 7);
    return `dans ${semaines} semaine${semaines > 1 ? "s" : ""}`;
  }
  return `dans ${Math.floor(n / 30)} mois`;
}

/** « Aujourd'hui », « Demain », « Mercredi » dans la semaine, puis « Mercredi 7 octobre ». */
export function libelleJour(d: DateISO, aujourdhui: DateISO): string {
  const n = joursEntre(aujourdhui, d);
  if (n === 0) return "Aujourd'hui";
  if (n === 1) return "Demain";
  if (n > 1 && n < 7) return majuscule(nomDuJour(d));
  return majuscule(dateLongue(d));
}

/** Les soleils disent dans combien de jours : un par jour d'attente, jusqu'à 6. */
export function nombreDeSoleils(dansJours: number): number {
  return dansJours >= 1 && dansJours <= 6 ? dansJours : 0;
}
```

- [ ] **Étape 4 : relancer les tests**

Run : `pnpm vitest run tests/domain/temps.test.ts`
Expected : PASS (20 tests).

- [ ] **Étape 5 : commit**

```bash
git add src/domain/temps.ts tests/domain/temps.test.ts
git commit -m "feat(domaine): heure du Bénin, moments de prise et libellés de dates"
```

---

### Tâche 3 : signes de danger, alertes et nouveaux événements

**Fichiers :**
- Créer : `src/domain/identifiants.ts`, `src/domain/signes-danger.ts`, `src/domain/alertes.ts`
- Modifier : `src/domain/evenements.ts`
- Tester : `tests/domain/identifiants.test.ts`, `tests/domain/signes-danger.test.ts`, `tests/domain/evenements.test.ts`

**Interfaces :**
- Consomme : `MOMENTS_PRISE` (tâche 2).
- Produit :
  - `estUuid(valeur: unknown): valeur is string` ;
  - `CODES_SIGNES`, `type CodeSigne`, `LIBELLES_SIGNES: Record<CodeSigne, string>`, `signesProposes({ enceinte, age }): CodeSigne[]`, `CONSEIL_URGENCE: string` ;
  - `DELAI_PRISE_EN_CHARGE_MINUTES = 15`, `echeanceAlerte(creeeLe: Date): Date` ;
  - `evenementSchema` accepte en plus `signalement_danger { signes, source }`, `delivrance { ordonnanceId }` et le statut `annule` pour `prise_medicament`.

- [ ] **Étape 1 : écrire les tests qui échouent**

Créer `tests/domain/identifiants.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { estUuid } from "@/domain/identifiants";

describe("estUuid", () => {
  it("reconnaît un identifiant de la base", () => {
    expect(estUuid("0b8f5c1e-3f8a-4b3a-9a57-6f1f2c3d4e5f")).toBe(true);
  });

  it("refuse le reste sans erreur", () => {
    expect(estUuid("n'importe-quoi")).toBe(false);
    expect(estUuid(undefined)).toBe(false);
  });
});
```

Créer `tests/domain/signes-danger.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { echeanceAlerte } from "@/domain/alertes";
import { CODES_SIGNES, LIBELLES_SIGNES, signesProposes } from "@/domain/signes-danger";

describe("signesProposes", () => {
  it("propose à une femme enceinte les 8 pictogrammes de la spec, « autre » en dernier", () => {
    const signes = signesProposes({ enceinte: true, age: 24 });
    expect(signes).toEqual(["saignement", "fievre", "maux_de_tete", "gonflement", "bebe_ne_bouge_plus", "perte_des_eaux", "douleur", "autre"]);
  });

  it("propose la diarrhée pour un jeune enfant, sans les signes de la grossesse", () => {
    const signes = signesProposes({ enceinte: false, age: 0 });
    expect(signes).toContain("diarrhee");
    expect(signes).not.toContain("perte_des_eaux");
    expect(signes).toHaveLength(6);
  });

  it("propose à un adulte la fièvre, la respiration et la douleur", () => {
    expect(signesProposes({ enceinte: false, age: 58 })).toEqual(["fievre", "respiration", "douleur", "saignement", "vomissements", "autre"]);
  });

  it("a un libellé pour chaque signe", () => {
    for (const code of CODES_SIGNES) expect(LIBELLES_SIGNES[code].length).toBeGreaterThan(3);
  });
});

describe("echeanceAlerte", () => {
  it("laisse 15 minutes pour prendre l'alerte en charge", () => {
    expect(echeanceAlerte(new Date("2026-09-25T19:14:00Z")).toISOString()).toBe("2026-09-25T19:29:00.000Z");
  });
});
```

Ajouter dans `tests/domain/evenements.test.ts`, dans le `describe` :

```ts
  it("accepte un signalement de danger et refuse un signalement sans signe", () => {
    const donnees = { signes: ["saignement"], source: "patient" };
    expect(evenementSchema.safeParse({ type: "signalement_danger", donnees }).success).toBe(true);
    expect(evenementSchema.safeParse({ type: "signalement_danger", donnees: { ...donnees, signes: [] } }).success).toBe(false);
    expect(evenementSchema.safeParse({ type: "signalement_danger", donnees: { ...donnees, signes: ["inconnu"] } }).success).toBe(false);
  });

  it("accepte une délivrance d'ordonnance", () => {
    const r = evenementSchema.safeParse({ type: "delivrance", donnees: { ordonnanceId: "0b8f5c1e-3f8a-4b3a-9a57-6f1f2c3d4e5f" } });
    expect(r.success).toBe(true);
  });

  it("accepte l'annulation d'une prise", () => {
    const r = evenementSchema.safeParse({ type: "prise_medicament", donnees: { traitement: "ord:0", moment: "soir", statut: "annule" } });
    expect(r.success).toBe(true);
  });
```

- [ ] **Étape 2 : lancer les tests et les voir échouer**

Run : `pnpm vitest run tests/domain/identifiants.test.ts tests/domain/signes-danger.test.ts tests/domain/evenements.test.ts`
Expected : FAIL (modules introuvables, puis `signalement_danger` refusé).

- [ ] **Étape 3 : écrire le code**

Créer `src/domain/identifiants.ts` :

```ts
import { z } from "zod";

const uuid = z.uuid();

/** Vrai pour un identifiant de la base : à vérifier avant toute requête sur une valeur venue d'un formulaire. */
export function estUuid(valeur: unknown): valeur is string {
  return uuid.safeParse(valeur).success;
}
```

Créer `src/domain/signes-danger.ts` :

```ts
export const CODES_SIGNES = [
  "saignement",
  "fievre",
  "maux_de_tete",
  "gonflement",
  "bebe_ne_bouge_plus",
  "perte_des_eaux",
  "douleur",
  "respiration",
  "vomissements",
  "diarrhee",
  "autre",
] as const;
export type CodeSigne = (typeof CODES_SIGNES)[number];

export const LIBELLES_SIGNES: Record<CodeSigne, string> = {
  saignement: "Saignement",
  fievre: "Forte fièvre",
  maux_de_tete: "Forts maux de tête",
  gonflement: "Pieds ou visage gonflés",
  bebe_ne_bouge_plus: "Le bébé ne bouge plus",
  perte_des_eaux: "Perte des eaux",
  douleur: "Forte douleur",
  respiration: "Respire mal",
  vomissements: "Vomit tout",
  diarrhee: "Diarrhée",
  autre: "Autre problème",
};

/** Conseil affiché tout de suite, avant même que l'alerte parte (spec §10.3). */
export const CONSEIL_URGENCE = "Allez au centre de santé maintenant ou appelez-le. N'attendez pas.";

const GROSSESSE: CodeSigne[] = ["saignement", "fievre", "maux_de_tete", "gonflement", "bebe_ne_bouge_plus", "perte_des_eaux", "douleur", "autre"];
const JEUNE_ENFANT: CodeSigne[] = ["fievre", "respiration", "diarrhee", "vomissements", "douleur", "autre"];
const ADULTE: CodeSigne[] = ["fievre", "respiration", "douleur", "saignement", "vomissements", "autre"];

/** Signes proposés selon la personne : ceux de la grossesse pour une femme enceinte, ceux du jeune enfant avant 5 ans. */
export function signesProposes(personne: { enceinte: boolean; age: number }): CodeSigne[] {
  if (personne.enceinte) return GROSSESSE;
  if (personne.age < 5) return JEUNE_ENFANT;
  return ADULTE;
}
```

Créer `src/domain/alertes.ts` :

```ts
/** Délai laissé au centre pour prendre une alerte en charge avant qu'elle remonte (spec §4.7). */
export const DELAI_PRISE_EN_CHARGE_MINUTES = 15;

export function echeanceAlerte(creeeLe: Date): Date {
  return new Date(creeeLe.getTime() + DELAI_PRISE_EN_CHARGE_MINUTES * 60_000);
}
```

Dans `src/domain/evenements.ts`, ajouter les imports :

```ts
import { CODES_SIGNES } from "./signes-danger";
import { MOMENTS_PRISE } from "./temps";
```

remplacer la branche `prise_medicament` par :

```ts
  z.object({
    type: z.literal("prise_medicament"),
    donnees: z.object({
      traitement: z.string().min(1),
      moment: z.enum(MOMENTS_PRISE),
      statut: z.enum(["fait", "plus_tard", "annule"]),
    }),
  }),
  z.object({
    type: z.literal("signalement_danger"),
    donnees: z.object({
      signes: z.array(z.enum(CODES_SIGNES)).min(1),
      source: z.enum(["patient", "relais", "proche"]),
    }),
  }),
  z.object({
    type: z.literal("delivrance"),
    donnees: z.object({ ordonnanceId: z.uuid() }),
  }),
```

- [ ] **Étape 4 : relancer les tests**

Run : `pnpm vitest run tests/domain`
Expected : PASS (tous les tests du domaine).

- [ ] **Étape 5 : commit**

```bash
git add src/domain/identifiants.ts src/domain/signes-danger.ts src/domain/alertes.ts src/domain/evenements.ts tests/domain
git commit -m "feat(domaine): signes de danger, délai des alertes, signalement et délivrance"
```

---

### Tâche 4 : traitements en cours et statut des prises

**Fichiers :**
- Créer : `src/domain/traitements.ts`
- Tester : `tests/domain/traitements.test.ts`

**Interfaces :**
- Consomme : `ajouterJours`, `joursEntre` (dates), `MOMENTS_PRISE`, `MomentPrise` (tâche 2).
- Produit :
  - `interface LigneTraitement { medicament: string; matin: number; midi: number; soir: number; dureeJours: number; indication?: string; conseil?: string }` ;
  - `interface OrdonnanceVue { id: string; patientId: string; lignes: LigneTraitement[]; delivreeLe: DateISO | null }` ;
  - `interface TraitementEnCours { cle: string; patientId: string; medicament: string; indication?: string; conseil?: string; prises: { moment: MomentPrise; quantite: number }[]; dernierJour: DateISO }` ;
  - `cleTraitement(ordonnanceId, index): string` (`"<ordonnanceId>:<index>"`) ; `traitementsEnCours(ordonnances, aujourdhui): TraitementEnCours[]` ;
  - `type StatutPrise = "fait" | "plus_tard" | "annule"` ; `interface PriseNotee { traitementCle: string; moment: MomentPrise; statut: StatutPrise; survenuLe: Date }` ;
  - `cleDePrise(traitementCle, moment): string` (`"<cle>|<moment>"`) ; `statutsDesPrises(prises): Map<string, "fait" | "plus_tard">`.

- [ ] **Étape 1 : écrire les tests qui échouent**

Créer `tests/domain/traitements.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { statutsDesPrises, traitementsEnCours, type OrdonnanceVue } from "@/domain/traitements";

const ordonnance = (delivreeLe: string | null, dureeJours = 30): OrdonnanceVue => ({
  id: "ord-1",
  patientId: "p1",
  delivreeLe,
  lignes: [{ medicament: "Amlodipine 5 mg", matin: 0, midi: 0, soir: 1, dureeJours, indication: "la tension", conseil: "avec un verre d'eau" }],
});

describe("traitementsEnCours", () => {
  it("fait d'une ordonnance délivrée un traitement, avec ses moments de prise", () => {
    const [traitement] = traitementsEnCours([ordonnance("2026-09-15")], "2026-09-25");
    expect(traitement).toMatchObject({ cle: "ord-1:0", patientId: "p1", medicament: "Amlodipine 5 mg", indication: "la tension", dernierJour: "2026-10-14" });
    expect(traitement?.prises).toEqual([{ moment: "soir", quantite: 1 }]);
  });

  it("ignore une ordonnance pas encore délivrée", () => {
    expect(traitementsEnCours([ordonnance(null)], "2026-09-25")).toEqual([]);
  });

  it("garde le traitement jusqu'au dernier jour inclus, pas le lendemain", () => {
    expect(traitementsEnCours([ordonnance("2026-09-16", 10)], "2026-09-25")).toHaveLength(1);
    expect(traitementsEnCours([ordonnance("2026-09-15", 10)], "2026-09-25")).toEqual([]);
  });

  it("donne une clé par ligne d'ordonnance", () => {
    const o = ordonnance("2026-09-20");
    o.lignes.push({ medicament: "Paracétamol 500 mg", matin: 1, midi: 1, soir: 1, dureeJours: 3 });
    expect(traitementsEnCours([o], "2026-09-21").map((t) => t.cle)).toEqual(["ord-1:0", "ord-1:1"]);
  });
});

describe("statutsDesPrises", () => {
  const le = (heure: string) => new Date(`2026-09-25T${heure}:00Z`);

  it("retient le dernier mot, dans l'ordre des heures", () => {
    const statuts = statutsDesPrises([
      { traitementCle: "a:0", moment: "soir", statut: "fait", survenuLe: le("19:10") },
      { traitementCle: "a:0", moment: "soir", statut: "plus_tard", survenuLe: le("18:00") },
    ]);
    expect(statuts.get("a:0|soir")).toBe("fait");
  });

  it("« Annuler » remet la prise à faire", () => {
    const statuts = statutsDesPrises([
      { traitementCle: "a:0", moment: "soir", statut: "fait", survenuLe: le("19:10") },
      { traitementCle: "a:0", moment: "soir", statut: "annule", survenuLe: le("19:11") },
    ]);
    expect(statuts.has("a:0|soir")).toBe(false);
  });
});
```

- [ ] **Étape 2 : lancer les tests et les voir échouer**

Run : `pnpm vitest run tests/domain/traitements.test.ts`
Expected : FAIL (`Cannot find module '@/domain/traitements'`).

- [ ] **Étape 3 : écrire le code**

Créer `src/domain/traitements.ts` :

```ts
import { ajouterJours, joursEntre, type DateISO } from "./dates";
import { MOMENTS_PRISE, type MomentPrise } from "./temps";

export interface LigneTraitement {
  medicament: string;
  matin: number;
  midi: number;
  soir: number;
  dureeJours: number;
  /** « la tension » : dit pourquoi on le prend, en mots simples. */
  indication?: string;
  /** « avec un verre d'eau ». */
  conseil?: string;
}

export interface OrdonnanceVue {
  id: string;
  patientId: string;
  lignes: LigneTraitement[];
  /** Jour de la délivrance à la pharmacie, ou null si elle n'a pas encore eu lieu. */
  delivreeLe: DateISO | null;
}

export interface TraitementEnCours {
  cle: string;
  patientId: string;
  medicament: string;
  indication?: string;
  conseil?: string;
  prises: { moment: MomentPrise; quantite: number }[];
  dernierJour: DateISO;
}

export function cleTraitement(ordonnanceId: string, index: number): string {
  return `${ordonnanceId}:${index}`;
}

/** Une ligne délivrée est un traitement en cours du jour de la délivrance au dernier jour de la durée prescrite. */
export function traitementsEnCours(ordonnances: OrdonnanceVue[], aujourdhui: DateISO): TraitementEnCours[] {
  return ordonnances.flatMap((o) => {
    const delivreeLe = o.delivreeLe;
    if (!delivreeLe || joursEntre(delivreeLe, aujourdhui) < 0) return [];
    return o.lignes.flatMap((ligne, index) => {
      const dernierJour = ajouterJours(delivreeLe, ligne.dureeJours - 1);
      if (joursEntre(aujourdhui, dernierJour) < 0) return [];
      return [
        {
          cle: cleTraitement(o.id, index),
          patientId: o.patientId,
          medicament: ligne.medicament,
          indication: ligne.indication,
          conseil: ligne.conseil,
          prises: MOMENTS_PRISE.filter((m) => ligne[m] > 0).map((m) => ({ moment: m, quantite: ligne[m] })),
          dernierJour,
        },
      ];
    });
  });
}

export type StatutPrise = "fait" | "plus_tard" | "annule";

export interface PriseNotee {
  traitementCle: string;
  moment: MomentPrise;
  statut: StatutPrise;
  survenuLe: Date;
}

export function cleDePrise(traitementCle: string, moment: MomentPrise): string {
  return `${traitementCle}|${moment}`;
}

/** Le dernier mot compte : « C'est fait » puis « Annuler » remet la prise à faire. */
export function statutsDesPrises(prises: PriseNotee[]): Map<string, "fait" | "plus_tard"> {
  const statuts = new Map<string, "fait" | "plus_tard">();
  for (const p of [...prises].sort((a, b) => a.survenuLe.getTime() - b.survenuLe.getTime())) {
    const cle = cleDePrise(p.traitementCle, p.moment);
    if (p.statut === "annule") statuts.delete(cle);
    else statuts.set(cle, p.statut);
  }
  return statuts;
}
```

- [ ] **Étape 4 : relancer les tests**

Run : `pnpm vitest run tests/domain/traitements.test.ts`
Expected : PASS (6 tests).

- [ ] **Étape 5 : commit**

```bash
git add src/domain/traitements.ts tests/domain/traitements.test.ts
git commit -m "feat(domaine): traitements en cours et statut des prises"
```

---

### Tâche 5 : cartes du jour

**Fichiers :**
- Créer : `src/domain/cartes-du-jour.ts`
- Tester : `tests/domain/cartes-du-jour.test.ts`

**Interfaces :**
- Consomme : `joursEntre`, `DateISO` ; `MotifRdv` ; `MOMENTS_PRISE`, `MomentPrise`, `momentCommence`, `LIBELLE_MOMENT`, `LIBELLE_MOMENT_RDV`, `libelleDansJours`, `libelleJour`, `dateLongue`, `majuscule` (tâche 2) ; `statutsDesPrises`, `cleDePrise`, `PriseNotee`, `TraitementEnCours` (tâche 4).
- Produit :
  - `interface RendezVousVu { id; patientId; motif: MotifRdv; libelle: string; datePrevue: DateISO; moment: "matin" | "apres_midi" | null; reserve: boolean; programme: boolean; faite: boolean }` ;
  - `type CarteDuJour` (union `prise` | `rendez_vous` | `manque`, voir le code) ;
  - `interface EntreeCartes { aujourdhui; heure; traitements; prisesDuJour; rendezVous }` ;
  - `cartesDuJour(e): { pile: CarteDuJour[]; ensuite: CarteDuJour | null }` ;
  - `HORIZON_PILE_JOURS = 7`, `MAX_PILE = 5`, `toleranceManque(motif)` ;
  - `surtitre(carte, aujourdhui)`, `titreCarte(carte)`, `detailCarte(carte, aujourdhui)`, `texteAEcouter(carte, { aujourdhui, pour })`.

Ordre de la pile : ① prise dont le moment a commencé ; ② rendez-vous du jour ; ③ étape manquée ; ④ prise d'un moment pas encore commencé ; ⑤ rendez-vous des 7 prochains jours, du plus proche au plus lointain ; ⑥ prise reportée (« Plus tard »). « Ensuite » est le premier rendez-vous au-delà de 7 jours.

- [ ] **Étape 1 : écrire les tests qui échouent**

Créer `tests/domain/cartes-du-jour.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import {
  cartesDuJour,
  detailCarte,
  surtitre,
  texteAEcouter,
  titreCarte,
  type EntreeCartes,
  type RendezVousVu,
} from "@/domain/cartes-du-jour";
import type { PriseNotee, TraitementEnCours } from "@/domain/traitements";

const traitement: TraitementEnCours = {
  cle: "ord:0",
  patientId: "codjo",
  medicament: "Amlodipine 5 mg",
  indication: "la tension",
  conseil: "avec un verre d'eau",
  prises: [{ moment: "soir", quantite: 1 }],
  dernierJour: "2026-10-14",
};

const rdv = (champs: Partial<RendezVousVu> & { id: string; datePrevue: string }): RendezVousVu => ({
  patientId: "codjo",
  motif: "tension",
  libelle: "Contrôle de la tension",
  moment: "matin",
  reserve: true,
  programme: true,
  faite: false,
  ...champs,
});

const prise = (statut: PriseNotee["statut"], heure: string): PriseNotee => ({
  traitementCle: "ord:0",
  moment: "soir",
  statut,
  survenuLe: new Date(`2026-09-25T${heure}:00Z`),
});

const base: EntreeCartes = { aujourdhui: "2026-09-25", heure: 20, traitements: [traitement], prisesDuJour: [], rendezVous: [] };

describe("cartesDuJour", () => {
  it("le soir, met le comprimé du soir en premier", () => {
    const { pile } = cartesDuJour({ ...base, rendezVous: [rdv({ id: "r1", datePrevue: "2026-10-01" })] });
    expect(pile.map((c) => c.type)).toEqual(["prise", "rendez_vous"]);
    expect(pile[0]).toMatchObject({ moment: "soir", quantite: 1, reportee: false });
  });

  it("retire la prise faite, et la remet après « Annuler »", () => {
    expect(cartesDuJour({ ...base, prisesDuJour: [prise("fait", "19:00")] }).pile).toEqual([]);
    expect(cartesDuJour({ ...base, prisesDuJour: [prise("fait", "19:00"), prise("annule", "19:01")] }).pile).toHaveLength(1);
  });

  it("passe une prise reportée en dernier", () => {
    const { pile } = cartesDuJour({ ...base, prisesDuJour: [prise("plus_tard", "19:00")], rendezVous: [rdv({ id: "r1", datePrevue: "2026-10-01" })] });
    expect(pile.map((c) => c.type)).toEqual(["rendez_vous", "prise"]);
    expect(pile[1]).toMatchObject({ reportee: true });
  });

  it("le matin, un rendez-vous du jour passe avant le comprimé du soir", () => {
    const { pile } = cartesDuJour({ ...base, heure: 9, rendezVous: [rdv({ id: "r1", datePrevue: "2026-09-25" })] });
    expect(pile.map((c) => c.type)).toEqual(["rendez_vous", "prise"]);
  });

  it("le matin, le comprimé du soir passe avant un rendez-vous dans 6 jours", () => {
    const { pile } = cartesDuJour({ ...base, heure: 9, rendezVous: [rdv({ id: "r1", datePrevue: "2026-10-01" })] });
    expect(pile.map((c) => c.type)).toEqual(["prise", "rendez_vous"]);
  });

  it("garde pour « ensuite » le premier rendez-vous au-delà de 7 jours", () => {
    const { pile, ensuite } = cartesDuJour({
      ...base,
      traitements: [],
      rendezVous: [
        rdv({ id: "loin", datePrevue: "2026-10-21" }),
        rdv({ id: "tres-loin", datePrevue: "2026-12-20" }),
        rdv({ id: "proche", datePrevue: "2026-09-27", reserve: false }),
      ],
    });
    expect(pile.map((c) => c.cle)).toEqual(["rdv:proche"]);
    expect(ensuite).toMatchObject({ type: "rendez_vous", rendezVousId: "loin", dansJours: 26 });
  });

  it("signale une étape de programme manquée, sauf si un autre jour est réservé", () => {
    const manquee = rdv({ id: "m", motif: "vaccin", libelle: "Vaccins des 6 semaines", datePrevue: "2026-09-01", reserve: false });
    expect(cartesDuJour({ ...base, traitements: [], rendezVous: [manquee] }).pile).toEqual([
      expect.objectContaining({ type: "manque", rendezVousId: "m" }),
    ]);
    const rattrapage = rdv({ id: "r", motif: "vaccin", datePrevue: "2026-09-30", reserve: true, programme: false });
    expect(cartesDuJour({ ...base, traitements: [], rendezVous: [manquee, rattrapage] }).pile.map((c) => c.type)).toEqual(["rendez_vous"]);
  });

  it("ne montre ni une étape faite, ni un retard encore dans la tolérance", () => {
    const faite = rdv({ id: "f", datePrevue: "2026-09-10", faite: true });
    const recente = rdv({ id: "t", datePrevue: "2026-09-20", reserve: false });
    expect(cartesDuJour({ ...base, traitements: [], rendezVous: [faite, recente] }).pile).toEqual([]);
  });

  it("ne garde que 5 cartes", () => {
    const beaucoup = Array.from({ length: 8 }, (_, i) => rdv({ id: `r${i}`, datePrevue: `2026-09-2${6 + (i % 3)}` }));
    expect(cartesDuJour({ ...base, traitements: [], rendezVous: beaucoup }).pile).toHaveLength(5);
  });
});

describe("textes des cartes", () => {
  it("dit la prise simplement", () => {
    const carte = cartesDuJour(base).pile[0]!;
    expect(surtitre(carte, "2026-09-25")).toBe("Ce soir");
    expect(titreCarte(carte)).toBe("1 comprimé pour la tension");
    expect(detailCarte(carte, "2026-09-25")).toBe("Amlodipine 5 mg, avec un verre d'eau");
  });

  it("dit le jour et le moment d'un rendez-vous réservé", () => {
    const carte = cartesDuJour({ ...base, traitements: [], rendezVous: [rdv({ id: "r", datePrevue: "2026-10-01" })] }).pile[0]!;
    expect(surtitre(carte, "2026-09-25")).toBe("Jeudi");
    expect(detailCarte(carte, "2026-09-25")).toBe("Dans 6 jours, le matin");
  });

  it("prépare le texte à écouter, avec le prénom quand c'est pour un proche", () => {
    const vaccin = rdv({ id: "s", patientId: "sena", motif: "vaccin", libelle: "Vaccins des 9 mois", datePrevue: "2026-09-27", reserve: false });
    const carte = cartesDuJour({ ...base, traitements: [], rendezVous: [vaccin] }).pile[0]!;
    expect(texteAEcouter(carte, { aujourdhui: "2026-09-25", pour: "Sèna" })).toBe(
      "Pour Sèna. À prévoir dans 2 jours. Vaccins des 9 mois. Choisissez votre jour au centre de santé.",
    );
  });
});
```

- [ ] **Étape 2 : lancer les tests et les voir échouer**

Run : `pnpm vitest run tests/domain/cartes-du-jour.test.ts`
Expected : FAIL (`Cannot find module '@/domain/cartes-du-jour'`).

- [ ] **Étape 3 : écrire le code**

Créer `src/domain/cartes-du-jour.ts` :

```ts
import { joursEntre, type DateISO } from "./dates";
import type { MotifRdv } from "./programmes/types";
import {
  dateLongue,
  LIBELLE_MOMENT,
  LIBELLE_MOMENT_RDV,
  libelleDansJours,
  libelleJour,
  majuscule,
  momentCommence,
  MOMENTS_PRISE,
  type MomentPrise,
} from "./temps";
import { cleDePrise, statutsDesPrises, type PriseNotee, type TraitementEnCours } from "./traitements";

/** Rendez-vous des 7 prochains jours dans la pile ; au-delà, le premier devient « ensuite ». */
export const HORIZON_PILE_JOURS = 7;
/** Une chose à la fois : pas plus de 5 cartes. */
export const MAX_PILE = 5;
/** Au-delà de 60 jours, une étape manquée n'est plus rappelée sur l'accueil. */
const RETARD_MAX_JOURS = 60;

export interface RendezVousVu {
  id: string;
  patientId: string;
  motif: MotifRdv;
  libelle: string;
  datePrevue: DateISO;
  moment: "matin" | "apres_midi" | null;
  /** Place réservée sur un créneau. */
  reserve: boolean;
  /** Rendez-vous d'une étape de programme (vaccin, consultation prénatale, contrôle). */
  programme: boolean;
  /** Étape déjà faite (consultation ou vaccin enregistrés). */
  faite: boolean;
}

export type CarteDuJour =
  | {
      type: "prise";
      cle: string;
      patientId: string;
      traitementCle: string;
      moment: MomentPrise;
      quantite: number;
      medicament: string;
      indication?: string;
      conseil?: string;
      reportee: boolean;
    }
  | {
      type: "rendez_vous";
      cle: string;
      patientId: string;
      rendezVousId: string;
      motif: MotifRdv;
      libelle: string;
      date: DateISO;
      moment: "matin" | "apres_midi" | null;
      reserve: boolean;
      dansJours: number;
    }
  | { type: "manque"; cle: string; patientId: string; rendezVousId: string; motif: MotifRdv; libelle: string; date: DateISO };

export interface EntreeCartes {
  aujourdhui: DateISO;
  /** Heure au Bénin, de 0 à 23. */
  heure: number;
  traitements: TraitementEnCours[];
  prisesDuJour: PriseNotee[];
  rendezVous: RendezVousVu[];
}

/** Jours après la date prévue au-delà desquels l'étape est manquée (comme dans les programmes). */
export function toleranceManque(motif: MotifRdv): number {
  return motif === "vaccin" ? 14 : 7;
}

const RANG = { priseDue: 0, rdvDuJour: 1, manque: 2, priseAVenir: 3, rdvProche: 4, priseReportee: 5 } as const;

export function cartesDuJour(e: EntreeCartes): { pile: CarteDuJour[]; ensuite: CarteDuJour | null } {
  const classees: { rang: number; ordre: number; carte: CarteDuJour }[] = [];
  const statuts = statutsDesPrises(e.prisesDuJour);

  for (const t of e.traitements) {
    for (const p of t.prises) {
      const statut = statuts.get(cleDePrise(t.cle, p.moment));
      if (statut === "fait") continue;
      const reportee = statut === "plus_tard";
      const rang = reportee ? RANG.priseReportee : momentCommence(p.moment, e.heure) ? RANG.priseDue : RANG.priseAVenir;
      classees.push({
        rang,
        ordre: MOMENTS_PRISE.indexOf(p.moment),
        carte: {
          type: "prise",
          cle: `prise:${t.cle}:${p.moment}`,
          patientId: t.patientId,
          traitementCle: t.cle,
          moment: p.moment,
          quantite: p.quantite,
          medicament: t.medicament,
          indication: t.indication,
          conseil: t.conseil,
          reportee,
        },
      });
    }
  }

  const aVenir = e.rendezVous
    .filter((r) => !r.faite && joursEntre(e.aujourdhui, r.datePrevue) >= 0)
    .sort((a, b) => a.datePrevue.localeCompare(b.datePrevue));
  let ensuite: CarteDuJour | null = null;
  for (const r of aVenir) {
    const dansJours = joursEntre(e.aujourdhui, r.datePrevue);
    const carte: CarteDuJour = {
      type: "rendez_vous",
      cle: `rdv:${r.id}`,
      patientId: r.patientId,
      rendezVousId: r.id,
      motif: r.motif,
      libelle: r.libelle,
      date: r.datePrevue,
      moment: r.moment,
      reserve: r.reserve,
      dansJours,
    };
    if (dansJours <= HORIZON_PILE_JOURS) classees.push({ rang: dansJours === 0 ? RANG.rdvDuJour : RANG.rdvProche, ordre: dansJours, carte });
    else ensuite ??= carte;
  }

  for (const r of e.rendezVous) {
    if (!r.programme || r.faite) continue;
    const retard = joursEntre(r.datePrevue, e.aujourdhui);
    if (retard <= toleranceManque(r.motif) || retard > RETARD_MAX_JOURS) continue;
    const rattrape = aVenir.some((a) => a.patientId === r.patientId && a.motif === r.motif && a.reserve);
    if (rattrape) continue;
    classees.push({
      rang: RANG.manque,
      ordre: -retard,
      carte: { type: "manque", cle: `manque:${r.id}`, patientId: r.patientId, rendezVousId: r.id, motif: r.motif, libelle: r.libelle, date: r.datePrevue },
    });
  }

  classees.sort((a, b) => a.rang - b.rang || a.ordre - b.ordre);
  return { pile: classees.slice(0, MAX_PILE).map((c) => c.carte), ensuite };
}

export function surtitre(carte: CarteDuJour, aujourdhui: DateISO): string {
  switch (carte.type) {
    case "prise":
      return LIBELLE_MOMENT[carte.moment];
    case "rendez_vous":
      return carte.reserve ? libelleJour(carte.date, aujourdhui) : `À prévoir ${libelleDansJours(carte.dansJours)}`;
    case "manque":
      return "À rattraper";
  }
}

export function titreCarte(carte: CarteDuJour): string {
  if (carte.type !== "prise") return carte.libelle;
  const quantite = `${carte.quantite} comprimé${carte.quantite > 1 ? "s" : ""}`;
  return carte.indication ? `${quantite} pour ${carte.indication}` : `${quantite} de ${carte.medicament}`;
}

export function detailCarte(carte: CarteDuJour, aujourdhui: DateISO): string {
  switch (carte.type) {
    case "prise":
      return carte.conseil ? `${carte.medicament}, ${carte.conseil}` : carte.medicament;
    case "rendez_vous":
      if (!carte.reserve) return "Choisissez votre jour au centre de santé.";
      return `${majuscule(libelleDansJours(joursEntre(aujourdhui, carte.date)))}${carte.moment ? `, ${LIBELLE_MOMENT_RDV[carte.moment]}` : ""}`;
    case "manque":
      return `Prévu le ${dateLongue(carte.date)}. Choisissez un autre jour.`;
  }
}

const phrase = (texte: string) => (/[.!?]$/.test(texte) ? texte : `${texte}.`);

/** Texte lu par le bouton « écouter » (synthèse vocale en français ; audio en langue au plan 6). */
export function texteAEcouter(carte: CarteDuJour, contexte: { aujourdhui: DateISO; pour: string | null }): string {
  return [
    contexte.pour ? `Pour ${contexte.pour}.` : null,
    phrase(surtitre(carte, contexte.aujourdhui)),
    phrase(titreCarte(carte)),
    phrase(detailCarte(carte, contexte.aujourdhui)),
  ]
    .filter(Boolean)
    .join(" ");
}
```

- [ ] **Étape 4 : relancer les tests**

Run : `pnpm vitest run tests/domain/cartes-du-jour.test.ts`
Expected : PASS (12 tests).

- [ ] **Étape 5 : commit**

```bash
git add src/domain/cartes-du-jour.ts tests/domain/cartes-du-jour.test.ts
git commit -m "feat(domaine): cartes du jour, une chose à la fois"
```

---

### Tâche 6 : motifs, plages et jours proposés

**Fichiers :**
- Créer : `src/domain/rendez-vous.ts`
- Tester : `tests/domain/rendez-vous.test.ts`

**Interfaces :**
- Consomme : `joursEntre`, `ajouterJours` ; `CodeProgramme`, `MotifRdv` ; `libelleDansJours`, `libelleJour`, `nombreDeSoleils` (tâche 2).
- Produit :
  - `LIBELLES_MOTIF: Record<MotifRdv, string>` (tuiles) ; `LIBELLES_RDV: Record<MotifRdv, string>` (nom d'un rendez-vous sans étape) ; `LIBELLES_PLAGE: Record<MotifRdv, string>` ;
  - `motifDePlage(motif): MotifRdv` ; `motifsProposes({ age, sexe, programmes }): MotifRdv[]` ;
  - `interface CreneauVu { id: string; date: DateISO; moment: "matin" | "apres_midi"; capacite: number; reserves: number }` ;
  - `interface JourPropose extends CreneauVu { places; complet; dansJours; soleils; libelle; quand }` ; `MAX_JOURS_PROPOSES = 8` ; `joursProposes(creneaux, aujourdhui): JourPropose[]` ; `libellePlaces(n): string`.

- [ ] **Étape 1 : écrire les tests qui échouent**

Créer `tests/domain/rendez-vous.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { ajouterJours } from "@/domain/dates";
import { joursProposes, libellePlaces, motifDePlage, motifsProposes, type CreneauVu } from "@/domain/rendez-vous";

describe("motifsProposes", () => {
  it("met en premier le motif du programme suivi", () => {
    expect(motifsProposes({ age: 58, sexe: "M", programmes: ["hypertension"] })).toEqual(["tension", "consultation", "fievre", "dents"]);
  });

  it("propose d'abord le vaccin pour un bébé", () => {
    expect(motifsProposes({ age: 0, sexe: "M", programmes: ["vaccination"] })).toEqual(["vaccin", "fievre", "consultation", "dents"]);
  });

  it("propose la grossesse aux femmes en âge d'avoir un enfant seulement", () => {
    expect(motifsProposes({ age: 24, sexe: "F", programmes: ["grossesse"] })).toEqual(["grossesse", "consultation", "fievre", "tension", "dents"]);
    expect(motifsProposes({ age: 54, sexe: "F", programmes: ["consultation"] })).toEqual(["consultation", "fievre", "tension", "dents"]);
  });
});

describe("motifDePlage", () => {
  it("reçoit la fièvre et les dents pendant les consultations", () => {
    expect(motifDePlage("fievre")).toBe("consultation");
    expect(motifDePlage("dents")).toBe("consultation");
    expect(motifDePlage("vaccin")).toBe("vaccin");
  });
});

describe("joursProposes", () => {
  const creneau = (id: string, date: string, moment: "matin" | "apres_midi", capacite: number, reserves: number): CreneauVu => ({
    id,
    date,
    moment,
    capacite,
    reserves,
  });

  it("propose à partir de demain, le matin avant l'après-midi", () => {
    const jours = joursProposes(
      [creneau("b", "2026-09-28", "apres_midi", 8, 0), creneau("a", "2026-09-28", "matin", 10, 10), creneau("x", "2026-09-25", "matin", 10, 0)],
      "2026-09-25",
    );
    expect(jours.map((j) => j.id)).toEqual(["a", "b"]);
  });

  it("compte les places et repère les jours complets", () => {
    const [plein, libre] = joursProposes([creneau("a", "2026-09-28", "matin", 10, 10), creneau("b", "2026-09-30", "matin", 12, 9)], "2026-09-25");
    expect(plein).toMatchObject({ complet: true, places: 0 });
    expect(libre).toMatchObject({ complet: false, places: 3, dansJours: 5, soleils: 5, libelle: "Mercredi", quand: "dans 5 jours" });
  });

  it("ne propose pas plus de 8 créneaux", () => {
    const beaucoup = Array.from({ length: 12 }, (_, i) => creneau(`c${i}`, ajouterJours("2026-09-25", i + 1), "matin", 5, 0));
    expect(joursProposes(beaucoup, "2026-09-25")).toHaveLength(8);
  });

  it("dit le nombre de places", () => {
    expect(libellePlaces(0)).toBe("Complet");
    expect(libellePlaces(1)).toBe("1 place");
    expect(libellePlaces(3)).toBe("3 places");
  });
});
```

- [ ] **Étape 2 : lancer les tests et les voir échouer**

Run : `pnpm vitest run tests/domain/rendez-vous.test.ts`
Expected : FAIL (`Cannot find module '@/domain/rendez-vous'`).

- [ ] **Étape 3 : écrire le code**

Créer `src/domain/rendez-vous.ts` :

```ts
import { joursEntre, type DateISO } from "./dates";
import type { CodeProgramme, MotifRdv } from "./programmes/types";
import { libelleDansJours, libelleJour, nombreDeSoleils } from "./temps";

/** Mot sous chaque tuile de l'étape « Pour quoi ? ». */
export const LIBELLES_MOTIF: Record<MotifRdv, string> = {
  consultation: "Consultation",
  tension: "Tension",
  grossesse: "Grossesse",
  vaccin: "Vaccin",
  diabete: "Diabète",
  fievre: "Fièvre",
  dents: "Dents",
};

/** Nom d'un rendez-vous pris sans étape de programme. */
export const LIBELLES_RDV: Record<MotifRdv, string> = {
  consultation: "Consultation",
  tension: "Contrôle de la tension",
  grossesse: "Consultation de grossesse",
  vaccin: "Vaccination",
  diabete: "Contrôle du diabète",
  fievre: "Consultation pour la fièvre",
  dents: "Consultation pour les dents",
};

/** Nom des plages du centre, à l'étape « Quel jour ? ». */
export const LIBELLES_PLAGE: Record<MotifRdv, string> = {
  consultation: "Consultations",
  tension: "Contrôles de la tension",
  grossesse: "Consultations de grossesse",
  vaccin: "Séances de vaccination",
  diabete: "Contrôles du diabète",
  fievre: "Consultations",
  dents: "Consultations",
};

/** La fièvre et les dents se voient pendant les consultations générales. */
export function motifDePlage(motif: MotifRdv): MotifRdv {
  return motif === "fievre" || motif === "dents" ? "consultation" : motif;
}

const MOTIF_DU_PROGRAMME: Partial<Record<CodeProgramme, MotifRdv>> = {
  hypertension: "tension",
  grossesse: "grossesse",
  vaccination: "vaccin",
  diabete: "diabete",
};

/** Motifs de l'étape « Pour quoi ? » : ceux des programmes suivis d'abord, puis ceux qui conviennent à l'âge. */
export function motifsProposes(personne: { age: number; sexe: "F" | "M"; programmes: CodeProgramme[] }): MotifRdv[] {
  const suivis = personne.programmes.flatMap((code) => MOTIF_DU_PROGRAMME[code] ?? []);
  const selonAge: MotifRdv[] =
    personne.age < 5
      ? ["vaccin", "fievre", "consultation", "dents"]
      : [
          "consultation",
          "fievre",
          ...(personne.sexe === "F" && personne.age >= 15 && personne.age < 50 ? (["grossesse"] as const) : []),
          ...(personne.age >= 18 ? (["tension"] as const) : []),
          "dents",
        ];
  return [...new Set([...suivis, ...selonAge])];
}

export interface CreneauVu {
  id: string;
  date: DateISO;
  moment: "matin" | "apres_midi";
  capacite: number;
  reserves: number;
}

export interface JourPropose extends CreneauVu {
  places: number;
  complet: boolean;
  dansJours: number;
  soleils: number;
  /** « Mercredi », « Mercredi 7 octobre ». */
  libelle: string;
  /** « dans 5 jours ». */
  quand: string;
}

export const MAX_JOURS_PROPOSES = 8;

/** Créneaux proposés à partir de demain, dans l'ordre, complets compris (ils mènent à la liste d'attente). */
export function joursProposes(creneaux: CreneauVu[], aujourdhui: DateISO): JourPropose[] {
  return creneaux
    .filter((c) => joursEntre(aujourdhui, c.date) >= 1)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.moment === b.moment ? 0 : a.moment === "matin" ? -1 : 1))
    .slice(0, MAX_JOURS_PROPOSES)
    .map((c) => {
      const dansJours = joursEntre(aujourdhui, c.date);
      const places = Math.max(0, c.capacite - c.reserves);
      return {
        ...c,
        places,
        complet: places === 0,
        dansJours,
        soleils: nombreDeSoleils(dansJours),
        libelle: libelleJour(c.date, aujourdhui),
        quand: libelleDansJours(dansJours),
      };
    });
}

export function libellePlaces(places: number): string {
  if (places === 0) return "Complet";
  return places === 1 ? "1 place" : `${places} places`;
}
```

- [ ] **Étape 4 : relancer les tests**

Run : `pnpm vitest run tests/domain/rendez-vous.test.ts`
Expected : PASS (9 tests).

- [ ] **Étape 5 : commit**

```bash
git add src/domain/rendez-vous.ts tests/domain/rendez-vous.test.ts
git commit -m "feat(domaine): motifs proposés selon la personne et jours avec leurs places"
```

---

### Tâche 7 : tables des alertes et de la liste d'attente, droits sur un carnet

**Fichiers :**
- Créer : `src/server/resultat.ts`, `tests/aides/demo.ts`, `drizzle/0001_espace_patient.sql` (généré)
- Modifier : `src/server/db/schema.ts`, `src/server/droits.ts`, `src/server/requetes/carnets.ts`, `src/server/demo/semer.ts` (liste `TABLES` uniquement)
- Tester : `tests/server/lien-patient.test.ts`, `tests/server/requetes/carnets.test.ts`

**Interfaces :**
- Consomme : `estUuid` (tâche 3), `LigneTraitement` (tâche 4).
- Produit :
  - tables `listeAttente` (`liste_attente`) et `alertes`, enum `statutAttente` ; `LigneOrdonnance = LigneTraitement` ;
  - `type Resultat<T, E extends string>`, `reussite(donnees)`, `echec(erreur)` ;
  - `lienAvecPatient(db, compteId, patientId): Promise<LienResponsable | null>` ;
  - `Carnet` a en plus `etablissementId: string` et `programmes: CodeProgramme[]` ; `choisirCarnet(carnets, demande): Carnet | null` ; `etablissementDuPatient(db, patientId): Promise<{ nom: string; telephone: string | null } | null>` ;
  - aide de test `idCompte(db, identifiant)`, `idPatient(db, prenom)`, `COMPTE` (identifiants de Codjo, Awa, Aïcha).

- [ ] **Étape 1 : écrire les tests qui échouent**

Créer `tests/aides/demo.ts` :

```ts
import { eq } from "drizzle-orm";
import type { Db } from "@/server/db/client";
import { comptes, patients } from "@/server/db/schema";

export const COMPTE = { codjo: "+2290197000001", awa: "+2290197000002", aicha: "+2290197000004" } as const;

export async function idCompte(db: Db, identifiant: string): Promise<string> {
  const [compte] = await db.select({ id: comptes.id }).from(comptes).where(eq(comptes.identifiant, identifiant));
  if (!compte) throw new Error(`Compte de démo introuvable : ${identifiant}`);
  return compte.id;
}

/** Personnages de la démo dont le prénom est unique : Codjo, Mariam, Sèna, Awa, Aïcha, Rachida. */
export async function idPatient(db: Db, prenom: string): Promise<string> {
  const lignes = await db.select({ id: patients.id }).from(patients).where(eq(patients.prenom, prenom));
  if (lignes.length !== 1) throw new Error(`Prénom de démo ambigu ou introuvable : ${prenom}`);
  return lignes[0]!.id;
}
```

Créer `tests/server/lien-patient.test.ts` :

```ts
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/server/db/client";
import { semerDemo } from "@/server/demo/semer";
import { lienAvecPatient } from "@/server/droits";
import { creerDbDeTest } from "../aides/base-de-test";
import { COMPTE, idCompte, idPatient } from "../aides/demo";

let db: Db;
let fermer: () => Promise<void>;

beforeAll(async () => {
  ({ db, fermer } = await creerDbDeTest());
  await semerDemo(db, { aujourdhui: "2026-09-25" });
});
afterAll(async () => fermer());

describe("lienAvecPatient", () => {
  it("donne le lien du compte avec un carnet de sa famille", async () => {
    expect(await lienAvecPatient(db, await idCompte(db, COMPTE.codjo), await idPatient(db, "Sèna"))).toBe("aidant");
    expect(await lienAvecPatient(db, await idCompte(db, COMPTE.codjo), await idPatient(db, "Codjo"))).toBe("soi");
  });

  it("refuse le carnet d'une autre famille", async () => {
    expect(await lienAvecPatient(db, await idCompte(db, COMPTE.codjo), await idPatient(db, "Awa"))).toBeNull();
  });

  it("refuse sans erreur un identifiant qui n'en est pas un", async () => {
    expect(await lienAvecPatient(db, await idCompte(db, COMPTE.codjo), "n'importe-quoi")).toBeNull();
  });
});
```

Dans `tests/server/requetes/carnets.test.ts`, remplacer l'import de `carnetsDuCompte` par :

```ts
import { carnetsDuCompte, choisirCarnet, etablissementDuPatient, type Carnet } from "@/server/requetes/carnets";
```

puis ajouter à la fin du fichier :

```ts
describe("programmes et établissement du carnet", () => {
  it("indique les programmes suivis et le centre de rattachement", async () => {
    const [codjo] = await db.select().from(comptes).where(eq(comptes.identifiant, "+2290197000001"));
    const carnets = await carnetsDuCompte(db, codjo!.id, "2026-09-25");
    expect(carnets.map((c) => c.programmes)).toEqual([["hypertension"], ["consultation"], ["vaccination"]]);
    expect(await etablissementDuPatient(db, carnets[0]!.patientId)).toEqual({ nom: "Centre de santé de Bohicon", telephone: "+2290121000000" });
  });
});

describe("choisirCarnet", () => {
  const carnets = [
    { patientId: "a", lien: "conjoint" },
    { patientId: "b", lien: "soi" },
  ] as Carnet[];

  it("prend le carnet demandé s'il est dans la famille", () => {
    expect(choisirCarnet(carnets, "a")?.patientId).toBe("a");
  });

  it("revient au carnet du titulaire pour un carnet inconnu", () => {
    expect(choisirCarnet(carnets, "zzz")?.patientId).toBe("b");
    expect(choisirCarnet(carnets, undefined)?.patientId).toBe("b");
  });

  it("ne renvoie rien sans carnet", () => {
    expect(choisirCarnet([], undefined)).toBeNull();
  });
});
```

- [ ] **Étape 2 : lancer les tests et les voir échouer**

Run : `pnpm vitest run tests/server/lien-patient.test.ts tests/server/requetes/carnets.test.ts`
Expected : FAIL (`lienAvecPatient` et `choisirCarnet` ne sont pas exportés).

- [ ] **Étape 3 : ajouter les tables et générer la migration**

Dans `src/server/db/schema.ts` :

1. Ajouter l'import de type, sous l'import des programmes :

```ts
import type { LigneTraitement } from "../../domain/traitements";
```

2. Ajouter l'enum, après `sourceRdv` :

```ts
export const statutAttente = pgEnum("statut_attente", ["en_attente", "proposee", "acceptee", "expiree", "annulee"]);
```

3. Remplacer la définition de `LigneOrdonnance` par :

```ts
/** Ligne d'ordonnance : médicament, nombre de prises par moment, durée, et en mots simples pourquoi et comment. */
export type LigneOrdonnance = LigneTraitement;
```

4. Ajouter, après la table `ordonnances` :

```ts
export const listeAttente = pgTable("liste_attente", {
  id: uuid("id").primaryKey().defaultRandom(),
  patientId: uuid("patient_id")
    .notNull()
    .references(() => patients.id, { onDelete: "cascade" }),
  etablissementId: uuid("etablissement_id").notNull().references(() => etablissements.id),
  motif: motifRdv("motif").notNull(),
  dateSouhaitee: date("date_souhaitee", { mode: "string" }).notNull(),
  moment: moment("moment").notNull(),
  statut: statutAttente("statut").notNull().default("en_attente"),
  creeLe: creeLe(),
  proposeLe: horodatage("propose_le"),
  expireLe: horodatage("expire_le"),
});

/** Alerte née d'un signalement de danger : le centre a 15 minutes pour la prendre en charge. */
export const alertes = pgTable("alertes", {
  id: uuid("id").primaryKey().defaultRandom(),
  patientId: uuid("patient_id")
    .notNull()
    .references(() => patients.id, { onDelete: "cascade" }),
  /** Un signalement ne crée qu'une alerte, même s'il arrive deux fois. */
  evenementId: uuid("evenement_id")
    .notNull()
    .unique()
    .references(() => evenements.id, { onDelete: "cascade" }),
  etablissementId: uuid("etablissement_id").notNull().references(() => etablissements.id),
  creeeLe: horodatage("creee_le").defaultNow().notNull(),
  echeance: horodatage("echeance").notNull(),
  priseEnChargePar: uuid("prise_en_charge_par").references(() => comptes.id),
  priseEnChargeLe: horodatage("prise_en_charge_le"),
  remonteeLe: horodatage("remontee_le"),
  annuleeLe: horodatage("annulee_le"),
});
```

Dans `src/server/demo/semer.ts`, ajouter les deux tables en tête de `TABLES` :

```ts
const TABLES = [
  "alertes", "liste_attente",
  "contenus_traductions", "contenus", "ordonnances", "evenements", "rendez_vous", "creneaux", "modeles_plages",
  "inscriptions", "responsables", "consentements", "contacts", "patients", "foyers", "sessions", "comptes",
  "etablissements", "communes",
];
```

Générer la migration :

```bash
pnpm db:generate --name espace_patient
grep -c "CREATE TABLE" drizzle/0001_espace_patient.sql
```

Expected : `2` (tables `alertes` et `liste_attente`), plus le type `statut_attente`.

- [ ] **Étape 4 : écrire le résultat typé, les droits et les carnets**

Créer `src/server/resultat.ts` :

```ts
/** Résultat d'une action métier : un refus attendu n'est jamais une exception (spec §10.4). */
export type Resultat<T, E extends string> = { ok: true; donnees: T } | { ok: false; erreur: E };

export function reussite<T>(donnees: T): { ok: true; donnees: T } {
  return { ok: true, donnees };
}

export function echec<E extends string>(erreur: E): { ok: false; erreur: E } {
  return { ok: false, erreur };
}
```

Remplacer `src/server/droits.ts` par :

```ts
import { and, eq } from "drizzle-orm";
import { estUuid } from "@/domain/identifiants";
import type { Db } from "./db/client";
import { responsables, type LienResponsable, type RoleCompte } from "./db/schema";

const ACCUEILS: Record<RoleCompte, string> = {
  patient: "/",
  relais: "/relais",
  soignant: "/soignant",
  pharmacie: "/pharmacie",
  pilotage: "/pilotage",
  admin: "/admin",
};

export function accueilDuRole(role: RoleCompte): string {
  return ACCUEILS[role];
}

/** Lien du compte avec la personne (« soi », « conjoint »…), ou null s'il ne gère pas son carnet. */
export async function lienAvecPatient(db: Db, compteId: string, patientId: string): Promise<LienResponsable | null> {
  if (!estUuid(patientId)) return null;
  const [ligne] = await db
    .select({ lien: responsables.lien })
    .from(responsables)
    .where(and(eq(responsables.compteId, compteId), eq(responsables.patientId, patientId)))
    .limit(1);
  return ligne?.lien ?? null;
}
```

Remplacer `src/server/requetes/carnets.ts` par :

```ts
import { and, eq, inArray } from "drizzle-orm";
import { ageEnAnnees, libelleAge, type DateISO } from "@/domain/dates";
import type { CodeProgramme } from "@/domain/programmes";
import type { Db } from "../db/client";
import { etablissements, inscriptions, patients, responsables, type LienResponsable } from "../db/schema";

export interface Carnet {
  patientId: string;
  prenom: string;
  nom: string;
  lien: LienResponsable;
  sexe: "F" | "M";
  dateNaissance: DateISO;
  age: number;
  libelleAge: string;
  etablissementId: string;
  /** Programmes de suivi actifs. */
  programmes: CodeProgramme[];
}

const ORDRE: Record<LienResponsable, number> = { soi: 0, conjoint: 1, parent: 2, enfant: 3, aidant: 4 };

export async function carnetsDuCompte(db: Db, compteId: string, aujourdhui: DateISO): Promise<Carnet[]> {
  const lignes = await db
    .select({
      patientId: patients.id,
      prenom: patients.prenom,
      nom: patients.nom,
      lien: responsables.lien,
      sexe: patients.sexe,
      dateNaissance: patients.dateNaissance,
      etablissementId: patients.etablissementId,
    })
    .from(responsables)
    .innerJoin(patients, eq(responsables.patientId, patients.id))
    .where(eq(responsables.compteId, compteId));
  const suivis = lignes.length
    ? await db
        .select({ patientId: inscriptions.patientId, programme: inscriptions.programme })
        .from(inscriptions)
        .where(and(inArray(inscriptions.patientId, lignes.map((l) => l.patientId)), eq(inscriptions.active, true)))
    : [];
  return lignes
    .map((l) => ({
      ...l,
      age: ageEnAnnees(l.dateNaissance, aujourdhui),
      libelleAge: libelleAge(l.dateNaissance, aujourdhui),
      programmes: suivis.filter((s) => s.patientId === l.patientId).map((s) => s.programme),
    }))
    .sort((a, b) => ORDRE[a.lien] - ORDRE[b.lien] || a.prenom.localeCompare(b.prenom, "fr"));
}

/** Carnet affiché : celui demandé s'il fait partie de la famille, sinon celui du titulaire du compte. */
export function choisirCarnet(carnets: Carnet[], demande: string | undefined): Carnet | null {
  return carnets.find((c) => c.patientId === demande) ?? carnets.find((c) => c.lien === "soi") ?? carnets[0] ?? null;
}

export async function etablissementDuPatient(db: Db, patientId: string): Promise<{ nom: string; telephone: string | null } | null> {
  const [ligne] = await db
    .select({ nom: etablissements.nom, telephone: etablissements.telephone })
    .from(patients)
    .innerJoin(etablissements, eq(patients.etablissementId, etablissements.id))
    .where(eq(patients.id, patientId));
  return ligne ?? null;
}
```

- [ ] **Étape 5 : relancer les tests**

Run : `pnpm vitest run tests/server`
Expected : PASS (dont les 3 tests de `lien-patient` et les 4 nouveaux de `carnets`).

- [ ] **Étape 6 : vérifier les types et committer**

```bash
pnpm typecheck
git add src/server/resultat.ts src/server/droits.ts src/server/db/schema.ts src/server/requetes/carnets.ts src/server/demo/semer.ts drizzle tests/aides/demo.ts tests/server/lien-patient.test.ts tests/server/requetes/carnets.test.ts
git commit -m "feat(base): alertes, liste d'attente et droits d'un compte sur un carnet"
```

---

### Tâche 8 : actions métier du patient

**Fichiers :**
- Créer : `src/server/requetes/etapes-faites.ts`, `src/server/patient/prises.ts`, `src/server/patient/reservation.ts`, `src/server/patient/signalement.ts`
- Tester : `tests/server/patient/prises.test.ts`, `tests/server/patient/reservation.test.ts`, `tests/server/patient/signalement.test.ts`

**Interfaces :**
- Consomme : `lienAvecPatient`, `etablissementDuPatient`, `Resultat`, `reussite`, `echec` (tâche 7) ; `evenementSchema`, `estUuid`, `CodeSigne`, `echeanceAlerte` (tâche 3) ; `MomentPrise` (tâche 2) ; `StatutPrise` (tâche 4) ; `motifDePlage` (tâche 6).
- Produit :
  - `cleEtape(motif, etape): string` ; `interface EtapeFaite { le: Date; lieu: string }` ; `etapesFaites(db, patientIds): Promise<Map<string, Map<string, EtapeFaite>>>` ;
  - `noterPrise(db, { compteId, patientId, traitementCle, moment, statut, maintenant? }): Promise<Resultat<null, "interdit" | "introuvable">>` ;
  - `reserver(db, { compteId, patientId, motif, creneauId, aujourdhui, maintenant? }): Promise<Resultat<{ rendezVousId: string }, ErreurReservation>>`, avec `ErreurReservation = "interdit" | "introuvable" | "passe" | "complet" | "deja_reserve"` ;
  - `inscrireListeAttente(db, { compteId, patientId, motif, creneauId }): Promise<Resultat<{ attenteId: string }, "interdit" | "introuvable">>` ;
  - `interface AlerteEnvoyee { alerteId: string; recueLe: Date; echeance: Date; etablissement: { nom: string; telephone: string | null } }` ;
  - `signalerDanger(db, { compteId, patientId, evenementId, signes, maintenant? }): Promise<Resultat<AlerteEnvoyee, "interdit" | "invalide">>` ;
  - `annulerAlerte(db, { compteId, alerteId, maintenant? }): Promise<Resultat<null, "interdit" | "introuvable" | "deja_prise_en_charge">>`.

Règle de réservation : on verrouille le créneau (`SELECT … FOR UPDATE`), on compte les places, on refuse un deuxième rendez-vous le même jour. Si une étape de programme attend (même motif, pas faite, sans créneau, prévue à 30 jours au plus du jour choisi), on la relie au créneau. Sinon, on crée un rendez-vous de source `patient`.

- [ ] **Étape 1 : écrire les tests qui échouent**

Créer `tests/server/patient/prises.test.ts` :

```ts
import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/server/db/client";
import { evenements, ordonnances } from "@/server/db/schema";
import { semerDemo } from "@/server/demo/semer";
import { noterPrise } from "@/server/patient/prises";
import { creerDbDeTest } from "../../aides/base-de-test";
import { COMPTE, idCompte, idPatient } from "../../aides/demo";

let db: Db;
let fermer: () => Promise<void>;
let cle: string;

beforeAll(async () => {
  ({ db, fermer } = await creerDbDeTest());
  await semerDemo(db, { aujourdhui: "2026-09-25" });
  const [ordonnance] = await db.select().from(ordonnances).where(eq(ordonnances.codeRetrait, "K7P4QX"));
  cle = `${ordonnance!.id}:0`;
});
afterAll(async () => fermer());

describe("noterPrise", () => {
  it("note « C'est fait » dans le journal, avec son auteur", async () => {
    const compte = await idCompte(db, COMPTE.codjo);
    const codjo = await idPatient(db, "Codjo");
    const r = await noterPrise(db, { compteId: compte, patientId: codjo, traitementCle: cle, moment: "soir", statut: "fait", maintenant: new Date("2026-09-25T19:05:00Z") });
    expect(r.ok).toBe(true);
    const [prise] = await db.select().from(evenements).where(and(eq(evenements.patientId, codjo), eq(evenements.type, "prise_medicament")));
    expect(prise).toMatchObject({ auteurId: compte, donnees: { traitement: cle, moment: "soir", statut: "fait" } });
  });

  it("refuse le traitement d'une autre personne de la famille", async () => {
    const r = await noterPrise(db, { compteId: await idCompte(db, COMPTE.codjo), patientId: await idPatient(db, "Mariam"), traitementCle: cle, moment: "soir", statut: "fait" });
    expect(r).toEqual({ ok: false, erreur: "introuvable" });
  });

  it("refuse une clé de traitement inventée", async () => {
    const r = await noterPrise(db, { compteId: await idCompte(db, COMPTE.codjo), patientId: await idPatient(db, "Codjo"), traitementCle: "abc:0", moment: "soir", statut: "fait" });
    expect(r).toEqual({ ok: false, erreur: "introuvable" });
  });

  it("refuse le carnet d'une autre famille", async () => {
    const r = await noterPrise(db, { compteId: await idCompte(db, COMPTE.awa), patientId: await idPatient(db, "Codjo"), traitementCle: cle, moment: "soir", statut: "fait" });
    expect(r).toEqual({ ok: false, erreur: "interdit" });
  });
});
```

Créer `tests/server/patient/reservation.test.ts` :

```ts
import { and, asc, eq, gt } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { MotifRdv } from "@/domain/programmes";
import type { Db } from "@/server/db/client";
import { creneaux, patients, rendezVous } from "@/server/db/schema";
import { semerDemo } from "@/server/demo/semer";
import { inscrireListeAttente, reserver } from "@/server/patient/reservation";
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

async function creneau(motif: MotifRdv, date: string, moment: "matin" | "apres_midi" = "matin") {
  const [c] = await db.select().from(creneaux).where(and(eq(creneaux.motif, motif), eq(creneaux.date, date), eq(creneaux.moment, moment)));
  return c!;
}

async function creneauUnePlace(date: string) {
  const [codjo] = await db.select({ etablissementId: patients.etablissementId }).from(patients).where(eq(patients.prenom, "Codjo"));
  const [c] = await db.insert(creneaux).values({ etablissementId: codjo!.etablissementId, motif: "consultation", date, moment: "matin", capacite: 1 }).returning();
  return c!;
}

describe("reserver", () => {
  it("relie la place à l'étape de programme en attente : les vaccins des 9 mois de Sèna", async () => {
    const mercredi = await creneau("vaccin", "2026-09-30");
    const r = await reserver(db, { compteId: await idCompte(db, COMPTE.codjo), patientId: await idPatient(db, "Sèna"), motif: "vaccin", creneauId: mercredi.id, aujourdhui });
    expect(r.ok).toBe(true);
    const [rdv] = await db.select().from(rendezVous).where(eq(rendezVous.id, r.ok ? r.donnees.rendezVousId : ""));
    expect(rdv).toMatchObject({ etapeCode: "9mois", datePrevue: "2026-09-30", moment: "matin", creneauId: mercredi.id, source: "programme" });
  });

  it("crée un rendez-vous « patient » quand aucune étape n'attend", async () => {
    const lundi = await creneau("consultation", "2026-10-05", "apres_midi");
    const r = await reserver(db, { compteId: await idCompte(db, COMPTE.codjo), patientId: await idPatient(db, "Mariam"), motif: "fievre", creneauId: lundi.id, aujourdhui });
    expect(r.ok).toBe(true);
    const [rdv] = await db.select().from(rendezVous).where(eq(rendezVous.id, r.ok ? r.donnees.rendezVousId : ""));
    expect(rdv).toMatchObject({ motif: "fievre", source: "patient", creneauId: lundi.id, etapeCode: null });
  });

  it("refuse un deuxième rendez-vous le même jour", async () => {
    const lundiMatin = await creneau("consultation", "2026-10-05", "matin");
    const r = await reserver(db, { compteId: await idCompte(db, COMPTE.codjo), patientId: await idPatient(db, "Mariam"), motif: "consultation", creneauId: lundiMatin.id, aujourdhui });
    expect(r).toEqual({ ok: false, erreur: "deja_reserve" });
  });

  it("refuse le carnet d'une autre famille", async () => {
    const mercredi = await creneau("vaccin", "2026-09-30");
    const r = await reserver(db, { compteId: await idCompte(db, COMPTE.awa), patientId: await idPatient(db, "Sèna"), motif: "vaccin", creneauId: mercredi.id, aujourdhui });
    expect(r).toEqual({ ok: false, erreur: "interdit" });
  });

  it("refuse un créneau du jour même, ou d'un autre motif", async () => {
    const compteId = await idCompte(db, COMPTE.codjo);
    const codjo = await idPatient(db, "Codjo");
    const duJour = await creneau("consultation", aujourdhui);
    expect(await reserver(db, { compteId, patientId: codjo, motif: "consultation", creneauId: duJour.id, aujourdhui })).toEqual({ ok: false, erreur: "passe" });
    const vaccin = await creneau("vaccin", "2026-10-07");
    expect(await reserver(db, { compteId, patientId: codjo, motif: "tension", creneauId: vaccin.id, aujourdhui })).toEqual({ ok: false, erreur: "introuvable" });
  });

  it("donne la dernière place à une seule des deux réservations simultanées", async () => {
    const samedi = await creneauUnePlace("2026-10-10");
    const [a, b] = await Promise.all([
      reserver(db, { compteId: await idCompte(db, COMPTE.codjo), patientId: await idPatient(db, "Codjo"), motif: "consultation", creneauId: samedi.id, aujourdhui }),
      reserver(db, { compteId: await idCompte(db, COMPTE.aicha), patientId: await idPatient(db, "Aïcha"), motif: "consultation", creneauId: samedi.id, aujourdhui }),
    ]);
    expect([a.ok, b.ok].sort()).toEqual([false, true]);
    expect([a, b].find((r) => !r.ok)).toEqual({ ok: false, erreur: "complet" });
  });
});

describe("inscrireListeAttente", () => {
  it("n'inscrit qu'une fois la même demande", async () => {
    const [complet] = await db
      .select()
      .from(creneaux)
      .where(and(eq(creneaux.motif, "consultation"), eq(creneaux.moment, "matin"), gt(creneaux.date, aujourdhui)))
      .orderBy(asc(creneaux.date));
    const demande = { compteId: await idCompte(db, COMPTE.codjo), patientId: await idPatient(db, "Mariam"), motif: "consultation" as const, creneauId: complet!.id };
    const premiere = await inscrireListeAttente(db, demande);
    const seconde = await inscrireListeAttente(db, demande);
    expect(premiere.ok && seconde.ok && premiere.donnees.attenteId === seconde.donnees.attenteId).toBe(true);
  });

  it("refuse le carnet d'une autre famille", async () => {
    const mercredi = await creneau("vaccin", "2026-09-30");
    const r = await inscrireListeAttente(db, { compteId: await idCompte(db, COMPTE.awa), patientId: await idPatient(db, "Sèna"), motif: "vaccin", creneauId: mercredi.id });
    expect(r).toEqual({ ok: false, erreur: "interdit" });
  });
});
```

Créer `tests/server/patient/signalement.test.ts` :

```ts
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { CodeSigne } from "@/domain/signes-danger";
import type { Db } from "@/server/db/client";
import { alertes, evenements } from "@/server/db/schema";
import { semerDemo } from "@/server/demo/semer";
import { annulerAlerte, signalerDanger } from "@/server/patient/signalement";
import { creerDbDeTest } from "../../aides/base-de-test";
import { COMPTE, idCompte, idPatient } from "../../aides/demo";

let db: Db;
let fermer: () => Promise<void>;

beforeAll(async () => {
  ({ db, fermer } = await creerDbDeTest());
  await semerDemo(db, { aujourdhui: "2026-09-25" });
});
afterAll(async () => fermer());

describe("signalerDanger", () => {
  it("crée le signalement et une alerte au centre, avec 15 minutes pour la prendre en charge", async () => {
    const evenementId = randomUUID();
    const r = await signalerDanger(db, {
      compteId: await idCompte(db, COMPTE.awa),
      patientId: await idPatient(db, "Awa"),
      evenementId,
      signes: ["saignement"],
      maintenant: new Date("2026-09-25T19:14:00Z"),
    });
    expect(r).toMatchObject({ ok: true, donnees: { etablissement: { nom: "Centre de santé de Bohicon", telephone: "+2290121000000" } } });
    expect(r.ok && r.donnees.echeance.toISOString()).toBe("2026-09-25T19:29:00.000Z");
    const [evenement] = await db.select().from(evenements).where(eq(evenements.id, evenementId));
    expect(evenement).toMatchObject({ type: "signalement_danger", donnees: { signes: ["saignement"], source: "patient" } });
  });

  it("ne crée qu'une alerte quand le même signalement arrive deux fois", async () => {
    const envoi = { compteId: await idCompte(db, COMPTE.awa), patientId: await idPatient(db, "Awa"), evenementId: randomUUID(), signes: ["fievre"] as CodeSigne[] };
    const premier = await signalerDanger(db, envoi);
    const second = await signalerDanger(db, envoi);
    expect(premier.ok && second.ok && premier.donnees.alerteId === second.donnees.alerteId).toBe(true);
    expect(await db.select().from(alertes).where(eq(alertes.evenementId, envoi.evenementId))).toHaveLength(1);
  });

  it("note la source « proche » quand un parent signale pour l'enfant", async () => {
    const evenementId = randomUUID();
    await signalerDanger(db, { compteId: await idCompte(db, COMPTE.codjo), patientId: await idPatient(db, "Sèna"), evenementId, signes: ["diarrhee"] });
    const [evenement] = await db.select().from(evenements).where(eq(evenements.id, evenementId));
    expect(evenement?.donnees).toMatchObject({ source: "proche" });
  });

  it("refuse un signe inconnu et le carnet d'une autre famille", async () => {
    const awa = await idPatient(db, "Awa");
    const inconnu = await signalerDanger(db, { compteId: await idCompte(db, COMPTE.awa), patientId: awa, evenementId: randomUUID(), signes: ["xx" as CodeSigne] });
    expect(inconnu).toEqual({ ok: false, erreur: "invalide" });
    const autreFamille = await signalerDanger(db, { compteId: await idCompte(db, COMPTE.codjo), patientId: awa, evenementId: randomUUID(), signes: ["fievre"] });
    expect(autreFamille).toEqual({ ok: false, erreur: "interdit" });
  });
});

describe("annulerAlerte", () => {
  it("annule une alerte envoyée par erreur, seulement depuis la famille", async () => {
    const envoi = await signalerDanger(db, { compteId: await idCompte(db, COMPTE.awa), patientId: await idPatient(db, "Awa"), evenementId: randomUUID(), signes: ["autre"] });
    const alerteId = envoi.ok ? envoi.donnees.alerteId : "";
    expect(await annulerAlerte(db, { compteId: await idCompte(db, COMPTE.codjo), alerteId })).toEqual({ ok: false, erreur: "interdit" });
    expect(await annulerAlerte(db, { compteId: await idCompte(db, COMPTE.awa), alerteId })).toEqual({ ok: true, donnees: null });
    const [alerte] = await db.select().from(alertes).where(eq(alertes.id, alerteId));
    expect(alerte?.annuleeLe).not.toBeNull();
  });
});
```

- [ ] **Étape 2 : lancer les tests et les voir échouer**

Run : `pnpm vitest run tests/server/patient`
Expected : FAIL (modules `@/server/patient/*` introuvables).

- [ ] **Étape 3 : écrire le code**

Créer `src/server/requetes/etapes-faites.ts` :

```ts
import { and, eq, inArray } from "drizzle-orm";
import type { MotifRdv } from "@/domain/programmes";
import type { Db } from "../db/client";
import { comptes, etablissements, evenements } from "../db/schema";

export interface EtapeFaite {
  le: Date;
  /** « Centre de santé de Bohicon », ou « Relais Koffi Agbessi » pour un vaccin fait en tournée. */
  lieu: string;
}

/** Deux programmes peuvent avoir des étapes de même code (« controle-1 ») : la clé porte aussi le motif. */
export function cleEtape(motif: MotifRdv, etape: string): string {
  return `${motif}:${etape}`;
}

/** Étapes de programme faites (consultations et vaccins enregistrés), par personne puis par clé d'étape. */
export async function etapesFaites(db: Db, patientIds: string[]): Promise<Map<string, Map<string, EtapeFaite>>> {
  const resultat = new Map<string, Map<string, EtapeFaite>>();
  if (patientIds.length === 0) return resultat;
  const lignes = await db
    .select({
      patientId: evenements.patientId,
      type: evenements.type,
      donnees: evenements.donnees,
      survenuLe: evenements.survenuLe,
      role: comptes.role,
      auteur: comptes.nomAffiche,
      etablissement: etablissements.nom,
    })
    .from(evenements)
    .leftJoin(comptes, eq(evenements.auteurId, comptes.id))
    .leftJoin(etablissements, eq(comptes.etablissementId, etablissements.id))
    .where(and(inArray(evenements.patientId, patientIds), inArray(evenements.type, ["consultation", "vaccination"])));
  for (const l of lignes) {
    const etape = l.donnees.etape;
    if (typeof etape !== "string") continue;
    const motif = (l.type === "vaccination" ? "vaccin" : l.donnees.motif) as MotifRdv;
    const parPatient = resultat.get(l.patientId) ?? new Map<string, EtapeFaite>();
    parPatient.set(cleEtape(motif, etape), { le: l.survenuLe, lieu: l.role === "relais" ? `Relais ${l.auteur}` : (l.etablissement ?? "") });
    resultat.set(l.patientId, parPatient);
  }
  return resultat;
}
```

Créer `src/server/patient/prises.ts` :

```ts
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { evenementSchema } from "@/domain/evenements";
import { estUuid } from "@/domain/identifiants";
import type { MomentPrise } from "@/domain/temps";
import type { StatutPrise } from "@/domain/traitements";
import type { Db } from "../db/client";
import { evenements, ordonnances } from "../db/schema";
import { lienAvecPatient } from "../droits";
import { echec, reussite, type Resultat } from "../resultat";

/** Note « C'est fait », « Plus tard » ou « Annuler » pour une prise de médicament. */
export async function noterPrise(
  db: Db,
  e: { compteId: string; patientId: string; traitementCle: string; moment: MomentPrise; statut: StatutPrise; maintenant?: Date },
): Promise<Resultat<null, "interdit" | "introuvable">> {
  if (!(await lienAvecPatient(db, e.compteId, e.patientId))) return echec("interdit");
  const [ordonnanceId, index] = e.traitementCle.split(":");
  if (!estUuid(ordonnanceId)) return echec("introuvable");
  const [ordonnance] = await db
    .select({ patientId: ordonnances.patientId, lignes: ordonnances.lignes })
    .from(ordonnances)
    .where(eq(ordonnances.id, ordonnanceId));
  if (!ordonnance || ordonnance.patientId !== e.patientId || !ordonnance.lignes[Number(index)]) return echec("introuvable");
  const evenement = evenementSchema.parse({
    type: "prise_medicament",
    donnees: { traitement: e.traitementCle, moment: e.moment, statut: e.statut },
  });
  await db.insert(evenements).values({
    id: randomUUID(),
    patientId: e.patientId,
    type: evenement.type,
    auteurId: e.compteId,
    survenuLe: e.maintenant ?? new Date(),
    donnees: evenement.donnees,
  });
  return reussite(null);
}
```

Créer `src/server/patient/reservation.ts` :

```ts
import { and, asc, count, eq, isNotNull, isNull } from "drizzle-orm";
import { joursEntre, type DateISO } from "@/domain/dates";
import { estUuid } from "@/domain/identifiants";
import type { MotifRdv } from "@/domain/programmes";
import { motifDePlage } from "@/domain/rendez-vous";
import type { Db } from "../db/client";
import { creneaux, listeAttente, patients, rendezVous } from "../db/schema";
import { lienAvecPatient } from "../droits";
import { cleEtape, etapesFaites } from "../requetes/etapes-faites";
import { echec, reussite, type Resultat } from "../resultat";

/** Écart maximal entre la date prévue d'une étape et le jour choisi pour qu'on les relie. */
const ECART_ETAPE_JOURS = 30;

export type ErreurReservation = "interdit" | "introuvable" | "passe" | "complet" | "deja_reserve";
type ResultatReservation = Resultat<{ rendezVousId: string }, ErreurReservation>;

export async function reserver(
  db: Db,
  e: { compteId: string; patientId: string; motif: MotifRdv; creneauId: string; aujourdhui: DateISO; maintenant?: Date },
): Promise<ResultatReservation> {
  if (!(await lienAvecPatient(db, e.compteId, e.patientId))) return echec("interdit");
  if (!estUuid(e.creneauId)) return echec("introuvable");
  const [patient] = await db.select({ etablissementId: patients.etablissementId }).from(patients).where(eq(patients.id, e.patientId));
  const faites = (await etapesFaites(db, [e.patientId])).get(e.patientId);
  const maintenant = e.maintenant ?? new Date();

  return db.transaction(async (tx): Promise<ResultatReservation> => {
    // Verrou sur le créneau : deux réservations de la dernière place passent l'une après l'autre.
    const [creneau] = await tx.select().from(creneaux).where(eq(creneaux.id, e.creneauId)).for("update");
    if (!creneau || creneau.motif !== motifDePlage(e.motif) || creneau.etablissementId !== patient?.etablissementId) return echec("introuvable");
    if (joursEntre(e.aujourdhui, creneau.date) < 1) return echec("passe");

    const [occupation] = await tx
      .select({ reserves: count() })
      .from(rendezVous)
      .where(and(eq(rendezVous.creneauId, creneau.id), isNull(rendezVous.annuleLe)));
    if ((occupation?.reserves ?? 0) >= creneau.capacite) return echec("complet");

    const memeJour = await tx
      .select({ id: rendezVous.id })
      .from(rendezVous)
      .where(and(eq(rendezVous.patientId, e.patientId), eq(rendezVous.datePrevue, creneau.date), isNotNull(rendezVous.creneauId), isNull(rendezVous.annuleLe)))
      .limit(1);
    if (memeJour.length > 0) return echec("deja_reserve");

    const place = { datePrevue: creneau.date, moment: creneau.moment, creneauId: creneau.id, reserveLe: maintenant };
    const enAttente = await tx
      .select({ id: rendezVous.id, etapeCode: rendezVous.etapeCode, datePrevue: rendezVous.datePrevue })
      .from(rendezVous)
      .where(
        and(
          eq(rendezVous.patientId, e.patientId),
          eq(rendezVous.motif, e.motif),
          eq(rendezVous.source, "programme"),
          isNull(rendezVous.creneauId),
          isNull(rendezVous.annuleLe),
        ),
      )
      .orderBy(asc(rendezVous.datePrevue));
    const etape = enAttente.find(
      (r) => r.etapeCode && !faites?.has(cleEtape(e.motif, r.etapeCode)) && Math.abs(joursEntre(r.datePrevue, creneau.date)) <= ECART_ETAPE_JOURS,
    );
    if (etape) {
      await tx.update(rendezVous).set(place).where(eq(rendezVous.id, etape.id));
      return reussite({ rendezVousId: etape.id });
    }
    const [cree] = await tx
      .insert(rendezVous)
      .values({ ...place, patientId: e.patientId, motif: e.motif, etablissementId: creneau.etablissementId, source: "patient" })
      .returning({ id: rendezVous.id });
    return reussite({ rendezVousId: cree!.id });
  });
}

/** Demande une place sur un créneau complet ; la même demande deux fois n'en fait qu'une. */
export async function inscrireListeAttente(
  db: Db,
  e: { compteId: string; patientId: string; motif: MotifRdv; creneauId: string },
): Promise<Resultat<{ attenteId: string }, "interdit" | "introuvable">> {
  if (!(await lienAvecPatient(db, e.compteId, e.patientId))) return echec("interdit");
  if (!estUuid(e.creneauId)) return echec("introuvable");
  const [creneau] = await db.select().from(creneaux).where(eq(creneaux.id, e.creneauId));
  if (!creneau || creneau.motif !== motifDePlage(e.motif)) return echec("introuvable");
  const souhait = { patientId: e.patientId, etablissementId: creneau.etablissementId, motif: e.motif, dateSouhaitee: creneau.date, moment: creneau.moment };
  const [existante] = await db
    .select({ id: listeAttente.id })
    .from(listeAttente)
    .where(
      and(
        eq(listeAttente.patientId, souhait.patientId),
        eq(listeAttente.motif, souhait.motif),
        eq(listeAttente.dateSouhaitee, souhait.dateSouhaitee),
        eq(listeAttente.moment, souhait.moment),
        eq(listeAttente.statut, "en_attente"),
      ),
    );
  if (existante) return reussite({ attenteId: existante.id });
  const [cree] = await db.insert(listeAttente).values(souhait).returning({ id: listeAttente.id });
  return reussite({ attenteId: cree!.id });
}
```

Créer `src/server/patient/signalement.ts` :

```ts
import { and, eq, isNull } from "drizzle-orm";
import { echeanceAlerte } from "@/domain/alertes";
import { evenementSchema } from "@/domain/evenements";
import { estUuid } from "@/domain/identifiants";
import type { CodeSigne } from "@/domain/signes-danger";
import type { Db } from "../db/client";
import { alertes, evenements, patients } from "../db/schema";
import { lienAvecPatient } from "../droits";
import { etablissementDuPatient } from "../requetes/carnets";
import { echec, reussite, type Resultat } from "../resultat";

export interface AlerteEnvoyee {
  alerteId: string;
  recueLe: Date;
  echeance: Date;
  etablissement: { nom: string; telephone: string | null };
}

type ResultatSignalement = Resultat<AlerteEnvoyee, "interdit" | "invalide">;

/**
 * Enregistre un signe de danger et crée l'alerte du centre de rattachement.
 * L'identifiant de l'événement vient du téléphone : renvoyer le même signalement ne crée pas une deuxième alerte.
 */
export async function signalerDanger(
  db: Db,
  e: { compteId: string; patientId: string; evenementId: string; signes: CodeSigne[]; maintenant?: Date },
): Promise<ResultatSignalement> {
  const lien = await lienAvecPatient(db, e.compteId, e.patientId);
  if (!lien) return echec("interdit");
  const evenement = evenementSchema.safeParse({
    type: "signalement_danger",
    donnees: { signes: e.signes, source: lien === "soi" ? "patient" : "proche" },
  });
  if (!evenement.success || !estUuid(e.evenementId)) return echec("invalide");
  const [patient] = await db.select({ etablissementId: patients.etablissementId }).from(patients).where(eq(patients.id, e.patientId));
  const etablissement = await etablissementDuPatient(db, e.patientId);
  if (!patient || !etablissement) return echec("invalide");
  const maintenant = e.maintenant ?? new Date();

  return db.transaction(async (tx): Promise<ResultatSignalement> => {
    const insere = await tx
      .insert(evenements)
      .values({ id: e.evenementId, patientId: e.patientId, type: "signalement_danger", auteurId: e.compteId, survenuLe: maintenant, donnees: evenement.data.donnees })
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
      .values({ patientId: e.patientId, evenementId: e.evenementId, etablissementId: patient.etablissementId, creeeLe: maintenant, echeance: echeanceAlerte(maintenant) })
      .returning();
    return reussite({ alerteId: alerte!.id, recueLe: alerte!.creeeLe, echeance: alerte!.echeance, etablissement });
  });
}

/** « Je me suis trompé » : possible tant qu'aucun soignant n'a pris l'alerte en charge. */
export async function annulerAlerte(
  db: Db,
  e: { compteId: string; alerteId: string; maintenant?: Date },
): Promise<Resultat<null, "interdit" | "introuvable" | "deja_prise_en_charge">> {
  if (!estUuid(e.alerteId)) return echec("introuvable");
  const [alerte] = await db.select().from(alertes).where(eq(alertes.id, e.alerteId));
  if (!alerte) return echec("introuvable");
  if (!(await lienAvecPatient(db, e.compteId, alerte.patientId))) return echec("interdit");
  if (alerte.priseEnChargeLe) return echec("deja_prise_en_charge");
  await db
    .update(alertes)
    .set({ annuleeLe: e.maintenant ?? new Date() })
    .where(and(eq(alertes.id, alerte.id), isNull(alertes.annuleeLe)));
  return reussite(null);
}
```

- [ ] **Étape 4 : relancer les tests**

Run : `pnpm vitest run tests/server/patient`
Expected : PASS (4 + 8 + 5 tests).

- [ ] **Étape 5 : vérifier les types et committer**

```bash
pnpm typecheck
git add src/server/requetes/etapes-faites.ts src/server/patient tests/server/patient
git commit -m "feat(patient): prises, réservation avec verrou, liste d'attente et signalement de danger"
```

---

### Tâche 9 : démo prête pour l'espace patient

**Fichiers :**
- Modifier : `src/server/demo/semer.ts`
- Tester : `tests/server/demo/semer.test.ts`

**Interfaces :**
- Consomme : `reserver` (tâche 8).
- Produit, dans la démo semée le 25/09/2026 :
  - Sèna a 8 mois et 28 jours : ses vaccins des 9 mois sont prévus dans 2 jours ;
  - Codjo prend de l'Amlodipine 5 mg le soir (ordonnance K7P4QX délivrée il y a 10 jours) ; Rachida prend de la Metformine matin et soir ;
  - la première matinée de consultation et le premier contrôle de tension sont complets (liste d'attente) ; la séance de vaccination du mercredi 30/09 garde 3 places ;
  - Codjo a réservé son contrôle de tension du jeudi 01/10, et Awa sa consultation prénatale du mercredi 30/09.

- [ ] **Étape 1 : écrire le test qui échoue**

Dans `tests/server/demo/semer.test.ts`, remplacer les imports de `drizzle-orm` et du schéma par :

```ts
import { and, asc, eq, gt, isNotNull, isNull } from "drizzle-orm";
import { comptes, creneaux, evenements, patients, rendezVous, responsables } from "@/server/db/schema";
```

puis ajouter dans le `describe` :

```ts
  it("prépare l'espace patient : traitements délivrés, places prises et réservations", async () => {
    await semerDemo(db, { aujourdhui });
    expect(await db.select().from(evenements).where(eq(evenements.type, "delivrance"))).toHaveLength(2);

    const aVenir = await db.select().from(creneaux).where(gt(creneaux.date, aujourdhui)).orderBy(asc(creneaux.date), asc(creneaux.moment));
    const reserves = async (id: string) =>
      (await db.select().from(rendezVous).where(and(eq(rendezVous.creneauId, id), isNull(rendezVous.annuleLe)))).length;
    const vaccin = aVenir.find((c) => c.motif === "vaccin")!;
    expect(vaccin.date).toBe("2026-09-30");
    expect(vaccin.capacite - (await reserves(vaccin.id))).toBe(3);
    const consultation = aVenir.find((c) => c.motif === "consultation" && c.moment === "matin")!;
    expect(await reserves(consultation.id)).toBe(consultation.capacite);

    const [codjo] = await db.select().from(patients).where(eq(patients.prenom, "Codjo"));
    const places = await db.select().from(rendezVous).where(and(eq(rendezVous.patientId, codjo!.id), isNotNull(rendezVous.creneauId)));
    expect(places).toEqual([expect.objectContaining({ motif: "tension", datePrevue: "2026-10-01", source: "programme" })]);
  });
```

- [ ] **Étape 2 : lancer le test et le voir échouer**

Run : `pnpm vitest run tests/server/demo/semer.test.ts`
Expected : FAIL (aucune délivrance enregistrée).

- [ ] **Étape 3 : modifier la démo**

Dans `src/server/demo/semer.ts` :

1. Imports : remplacer `import { sql } from "drizzle-orm";` par `import { asc, sql } from "drizzle-orm";` et ajouter :

```ts
import { reserver } from "../patient/reservation";
```

2. Juste après `const codesUtilises = new Set<string>();`, réserver le code de l'ordonnance de Codjo :

```ts
  codesUtilises.add("K7P4QX");
```

3. Remplacer `const naissanceSena = ajouterJours(aujourdhui, -243);` par :

```ts
  // 8 mois et 28 jours : ses vaccins des 9 mois tombent dans 2 jours (scénario de démo, spec §15).
  const naissanceSena = ajouterJours(aujourdhui, -268);
```

4. Après `const adjoa = compte("adjoa.gbaguidi");`, ajouter :

```ts
  const pharmacien = compte("pharmacie.sainte-rita");
```

5. Déclarer, à côté de `const idsPersonnages` :

```ts
  const idsPopulation: string[] = [];
```

et, dans la boucle, juste après `if (personne.cle) idsPersonnages[personne.cle] = patient!.id;` :

```ts
    else idsPopulation.push(patient!.id);
```

6. Remplacer toute la section « Ordonnance en cours de Codjo » par :

```ts
  // --- Traitements en cours : ordonnances délivrées à la pharmacie ---
  const ordonnancesDelivrees = [
    {
      patientId: idsPersonnages.codjo!,
      codeRetrait: "K7P4QX",
      joursDepuisDelivrance: 10,
      lignes: [{ medicament: "Amlodipine 5 mg", matin: 0, midi: 0, soir: 1, dureeJours: 30, indication: "la tension", conseil: "avec un verre d'eau" }],
    },
    {
      patientId: idsPersonnages.rachida!,
      codeRetrait: codeUnique(),
      joursDepuisDelivrance: 20,
      lignes: [{ medicament: "Metformine 500 mg", matin: 1, midi: 0, soir: 1, dureeJours: 60, indication: "le diabète", conseil: "pendant le repas" }],
    },
  ];
  for (const o of ordonnancesDelivrees) {
    const emiseLe = depuisDateISO(ajouterJours(aujourdhui, -o.joursDepuisDelivrance));
    const [ordonnance] = await db
      .insert(t.ordonnances)
      .values({ patientId: o.patientId, prescripteurId: firmin.id, lignes: o.lignes, codeRetrait: o.codeRetrait, emiseLe })
      .returning();
    await db.insert(t.evenements).values({
      id: randomUUID(),
      patientId: o.patientId,
      type: "delivrance",
      auteurId: pharmacien.id,
      survenuLe: new Date(emiseLe.getTime() + 10 * 3_600_000),
      donnees: { ordonnanceId: ordonnance!.id },
    });
    nbEvenements++;
  }
```

7. Après `await db.insert(t.creneaux).values(places);`, ajouter :

```ts
  // --- Places déjà prises : la première matinée de consultation et le premier contrôle de tension sont complets
  //     (liste d'attente) ; la séance de vaccination de mercredi garde 3 places (scénario de démo) ---
  const aVenir = (await db.select().from(t.creneaux).orderBy(asc(t.creneaux.date), asc(t.creneaux.moment))).filter((c) => c.date > aujourdhui);
  const premier = (motif: MotifRdv, moment?: "matin" | "apres_midi") => aVenir.find((c) => c.motif === motif && (!moment || c.moment === moment))!;
  const consultationComplete = premier("consultation", "matin");
  const tensionComplete = premier("tension");
  const seanceVaccin = premier("vaccin");
  const reservations = aVenir.flatMap((creneau) => {
    const nombre =
      creneau === consultationComplete || creneau === tensionComplete
        ? creneau.capacite
        : creneau === seanceVaccin
          ? creneau.capacite - 3
          : h.entier(0, Math.floor(creneau.capacite / 2));
    return Array.from({ length: nombre }, () => ({
      patientId: h.parmi(idsPopulation),
      motif: creneau.motif,
      datePrevue: creneau.date,
      moment: creneau.moment,
      creneauId: creneau.id,
      etablissementId: cs!.id,
      source: "patient" as const,
      reserveLe: depuisDateISO(ajouterJours(aujourdhui, -h.entier(1, 10))),
    }));
  });
  await db.insert(t.rendezVous).values(reservations);
  nbRendezVous += reservations.length;

  // --- Rendez-vous déjà réservés : le contrôle de Codjo et la consultation prénatale d'Awa ---
  for (const [identifiant, cle, motif] of [
    ["+2290197000001", "codjo", "tension"],
    ["+2290197000002", "awa", "grossesse"],
  ] as const) {
    const creneau = aVenir.find((c) => c.motif === motif && c !== tensionComplete)!;
    const resultat = await reserver(db, {
      compteId: compte(identifiant).id,
      patientId: idsPersonnages[cle]!,
      motif,
      creneauId: creneau.id,
      aujourdhui,
      maintenant: depuisDateISO(ajouterJours(aujourdhui, -3)),
    });
    if (!resultat.ok) throw new Error(`Réservation de démo impossible (${cle}) : ${resultat.erreur}`);
  }
```

- [ ] **Étape 4 : relancer les tests de la démo et de tout le serveur**

Run : `pnpm vitest run tests/server`
Expected : PASS (la démo relancée deux fois donne toujours le même bilan).

- [ ] **Étape 5 : commit**

```bash
git add src/server/demo/semer.ts tests/server/demo/semer.test.ts
git commit -m "feat(démo): traitements délivrés, places prises et rendez-vous réservés"
```

---

### Tâche 10 : lectures de l'espace patient

**Fichiers :**
- Créer : `src/server/requetes/rendez-vous.ts`, `src/server/requetes/accueil.ts`, `src/server/requetes/carnet.ts`, `src/server/requetes/contenus.ts`
- Tester : `tests/server/requetes/accueil.test.ts`, `tests/server/requetes/carnet.test.ts`, `tests/server/requetes/rendez-vous.test.ts`

**Interfaces :**
- Consomme : `etapesFaites`, `cleEtape`, `EtapeFaite` (tâche 8) ; `RendezVousVu`, `EntreeCartes` (tâche 5) ; `traitementsEnCours`, `PriseNotee`, `StatutPrise`, `TraitementEnCours` (tâche 4) ; `LIBELLES_RDV`, `CreneauVu` (tâche 6) ; `debutDuJourAuBenin` (tâche 2) ; `planifier`, `PROGRAMMES`, `statutEtape`.
- Produit :
  - `interface RendezVousDetaille extends RendezVousVu { etablissement: string }` ; `rendezVousVus(db, patientIds, depuis): Promise<RendezVousDetaille[]>` (triés par date) ;
  - `placesDisponibles(db, { etablissementId, motif, du, au }): Promise<CreneauVu[]>` ;
  - `interface AttenteVue { id; patientId; motif; dateSouhaitee; moment }` ; `listeAttenteDe(db, patientIds): Promise<AttenteVue[]>` ;
  - `traitementsDes(db, patientIds, aujourdhui)`, `prisesDuJour(db, patientIds, jour)`, `donneesAccueil(db, patientIds, aujourdhui): Promise<Pick<EntreeCartes, "traitements" | "prisesDuJour" | "rendezVous">>` ;
  - `interface EtapeDuCarnet { code; libelle; details?; motif; rendezVous; statut: StatutEtape; datePrevue; faite: EtapeFaite | null; reservation: { date; moment } | null }` ; `interface ProgrammeDuCarnet { code; nom; dateReference; etapes }` ; `programmesDuCarnet(db, patientId, aujourdhui)` ;
  - `texteContenu(db, code, langue?): Promise<string | null>`.

- [ ] **Étape 1 : écrire les tests qui échouent**

Créer `tests/server/requetes/accueil.test.ts` :

```ts
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { cartesDuJour } from "@/domain/cartes-du-jour";
import type { Db } from "@/server/db/client";
import { ordonnances } from "@/server/db/schema";
import { semerDemo } from "@/server/demo/semer";
import { noterPrise } from "@/server/patient/prises";
import { donneesAccueil, prisesDuJour } from "@/server/requetes/accueil";
import { creerDbDeTest } from "../../aides/base-de-test";
import { COMPTE, idCompte, idPatient } from "../../aides/demo";

const aujourdhui = "2026-09-25";
let db: Db;
let fermer: () => Promise<void>;
let famille: { codjo: string; mariam: string; sena: string };

beforeAll(async () => {
  ({ db, fermer } = await creerDbDeTest());
  await semerDemo(db, { aujourdhui });
  famille = { codjo: await idPatient(db, "Codjo"), mariam: await idPatient(db, "Mariam"), sena: await idPatient(db, "Sèna") };
});
afterAll(async () => fermer());

describe("donneesAccueil", () => {
  it("réunit le traitement de Codjo et les rendez-vous de la famille", async () => {
    const d = await donneesAccueil(db, Object.values(famille), aujourdhui);
    expect(d.traitements).toEqual([expect.objectContaining({ patientId: famille.codjo, medicament: "Amlodipine 5 mg", indication: "la tension" })]);
    expect(d.rendezVous).toContainEqual(
      expect.objectContaining({ patientId: famille.sena, libelle: "Vaccins des 9 mois", datePrevue: "2026-09-27", reserve: false, faite: false }),
    );
    expect(d.rendezVous).toContainEqual(
      expect.objectContaining({ patientId: famille.codjo, libelle: "Contrôle de la tension", datePrevue: "2026-10-01", reserve: true }),
    );
  });

  it("donne à Codjo, le soir : son comprimé, puis le vaccin de Sèna, puis son contrôle", async () => {
    const { pile, ensuite } = cartesDuJour({ aujourdhui, heure: 20, ...(await donneesAccueil(db, Object.values(famille), aujourdhui)) });
    expect(pile.map((c) => [c.type, c.patientId])).toEqual([
      ["prise", famille.codjo],
      ["rendez_vous", famille.sena],
      ["rendez_vous", famille.codjo],
    ]);
    expect(ensuite).toMatchObject({ type: "rendez_vous", patientId: famille.codjo });
  });

  it("compte une prise notée juste après minuit au Bénin pour le nouveau jour", async () => {
    const [ordonnance] = await db.select().from(ordonnances).where(eq(ordonnances.codeRetrait, "K7P4QX"));
    const prise = { compteId: await idCompte(db, COMPTE.codjo), patientId: famille.codjo, traitementCle: `${ordonnance!.id}:0`, moment: "soir" as const };
    await noterPrise(db, { ...prise, statut: "plus_tard", maintenant: new Date("2026-09-24T22:30:00Z") });
    await noterPrise(db, { ...prise, statut: "fait", maintenant: new Date("2026-09-24T23:30:00Z") });
    expect((await prisesDuJour(db, [famille.codjo], "2026-09-25")).map((p) => p.statut)).toEqual(["fait"]);
    expect((await prisesDuJour(db, [famille.codjo], "2026-09-24")).map((p) => p.statut)).toEqual(["plus_tard"]);
  });
});
```

Créer `tests/server/requetes/carnet.test.ts` :

```ts
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/server/db/client";
import { semerDemo } from "@/server/demo/semer";
import { programmesDuCarnet } from "@/server/requetes/carnet";
import { texteContenu } from "@/server/requetes/contenus";
import { creerDbDeTest } from "../../aides/base-de-test";
import { idPatient } from "../../aides/demo";

const aujourdhui = "2026-09-25";
let db: Db;
let fermer: () => Promise<void>;

beforeAll(async () => {
  ({ db, fermer } = await creerDbDeTest());
  await semerDemo(db, { aujourdhui });
});
afterAll(async () => fermer());

describe("programmesDuCarnet", () => {
  it("montre les vaccins faits de Sèna avec leur lieu, puis les suivants", async () => {
    const [vaccination] = await programmesDuCarnet(db, await idPatient(db, "Sèna"), aujourdhui);
    expect(vaccination?.code).toBe("vaccination");
    expect(vaccination?.etapes.map((e) => e.statut)).toEqual(["faite", "faite", "faite", "faite", "a_venir", "a_venir"]);
    expect(vaccination?.etapes[0]?.faite?.lieu).toBe("Centre de santé de Bohicon");
    expect(vaccination?.etapes[4]).toMatchObject({ code: "9mois", motif: "vaccin", reservation: null, datePrevue: "2026-09-27" });
  });

  it("montre la place réservée du prochain contrôle de Codjo", async () => {
    const [tension] = await programmesDuCarnet(db, await idPatient(db, "Codjo"), aujourdhui);
    const prochain = tension?.etapes.find((e) => e.statut === "a_venir");
    expect(prochain).toMatchObject({ libelle: "Contrôle de la tension", reservation: { date: "2026-10-01", moment: "matin" } });
  });
});

describe("texteContenu", () => {
  it("donne le texte d'un contenu en français", async () => {
    expect(await texteContenu(db, "danger_conseil")).toBe("Allez au centre de santé maintenant ou appelez-le. N'attendez pas.");
    expect(await texteContenu(db, "inconnu")).toBeNull();
  });
});
```

Créer `tests/server/requetes/rendez-vous.test.ts` :

```ts
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/server/db/client";
import { patients } from "@/server/db/schema";
import { semerDemo } from "@/server/demo/semer";
import { inscrireListeAttente } from "@/server/patient/reservation";
import { listeAttenteDe, placesDisponibles, rendezVousVus } from "@/server/requetes/rendez-vous";
import { creerDbDeTest } from "../../aides/base-de-test";
import { COMPTE, idCompte, idPatient } from "../../aides/demo";

const aujourdhui = "2026-09-25";
let db: Db;
let fermer: () => Promise<void>;
let etablissementId: string;

beforeAll(async () => {
  ({ db, fermer } = await creerDbDeTest());
  await semerDemo(db, { aujourdhui });
  const [codjo] = await db.select({ etablissementId: patients.etablissementId }).from(patients).where(eq(patients.prenom, "Codjo"));
  etablissementId = codjo!.etablissementId;
});
afterAll(async () => fermer());

describe("placesDisponibles", () => {
  it("compte les places prises sur chaque séance de vaccination", async () => {
    const seances = await placesDisponibles(db, { etablissementId, motif: "vaccin", du: "2026-09-26", au: "2026-10-16" });
    expect(seances.map((c) => c.date).sort()).toEqual(["2026-09-30", "2026-10-07", "2026-10-14"]);
    const mercredi = seances.find((c) => c.date === "2026-09-30")!;
    expect(mercredi.capacite - mercredi.reserves).toBe(3);
  });
});

describe("rendezVousVus", () => {
  it("nomme les rendez-vous d'après l'étape de leur programme", async () => {
    const [prochain] = await rendezVousVus(db, [await idPatient(db, "Sèna")], aujourdhui);
    expect(prochain).toMatchObject({ libelle: "Vaccins des 9 mois", etablissement: "Centre de santé de Bohicon", programme: true });
  });
});

describe("listeAttenteDe", () => {
  it("liste les demandes en attente de la famille", async () => {
    const complet = (await placesDisponibles(db, { etablissementId, motif: "consultation", du: "2026-09-26", au: "2026-10-16" })).find(
      (c) => c.reserves >= c.capacite,
    )!;
    const mariam = await idPatient(db, "Mariam");
    const r = await inscrireListeAttente(db, { compteId: await idCompte(db, COMPTE.codjo), patientId: mariam, motif: "consultation", creneauId: complet.id });
    expect(r.ok).toBe(true);
    expect(await listeAttenteDe(db, [mariam, await idPatient(db, "Codjo")])).toEqual([
      expect.objectContaining({ patientId: mariam, motif: "consultation", dateSouhaitee: complet.date }),
    ]);
  });
});
```

- [ ] **Étape 2 : lancer les tests et les voir échouer**

Run : `pnpm vitest run tests/server/requetes`
Expected : FAIL (modules `accueil`, `carnet`, `contenus`, `rendez-vous` introuvables).

- [ ] **Étape 3 : écrire le code**

Créer `src/server/requetes/rendez-vous.ts` :

```ts
import { and, asc, eq, gte, inArray, isNull, lte, sql } from "drizzle-orm";
import type { RendezVousVu } from "@/domain/cartes-du-jour";
import type { DateISO } from "@/domain/dates";
import { PROGRAMMES, type MotifRdv } from "@/domain/programmes";
import { LIBELLES_RDV, type CreneauVu } from "@/domain/rendez-vous";
import type { Db } from "../db/client";
import { creneaux, etablissements, inscriptions, listeAttente, rendezVous } from "../db/schema";
import { cleEtape, etapesFaites } from "./etapes-faites";

export interface RendezVousDetaille extends RendezVousVu {
  etablissement: string;
}

/** Rendez-vous non annulés depuis une date, nommés d'après l'étape de leur programme, avec l'étape faite ou non. */
export async function rendezVousVus(db: Db, patientIds: string[], depuis: DateISO): Promise<RendezVousDetaille[]> {
  if (patientIds.length === 0) return [];
  const [lignes, faites] = await Promise.all([
    db
      .select({
        id: rendezVous.id,
        patientId: rendezVous.patientId,
        motif: rendezVous.motif,
        etapeCode: rendezVous.etapeCode,
        datePrevue: rendezVous.datePrevue,
        moment: rendezVous.moment,
        creneauId: rendezVous.creneauId,
        source: rendezVous.source,
        programme: inscriptions.programme,
        dateReference: inscriptions.dateReference,
        dateInscription: inscriptions.dateInscription,
        etablissement: etablissements.nom,
      })
      .from(rendezVous)
      .leftJoin(inscriptions, eq(rendezVous.inscriptionId, inscriptions.id))
      .innerJoin(etablissements, eq(rendezVous.etablissementId, etablissements.id))
      .where(and(inArray(rendezVous.patientId, patientIds), isNull(rendezVous.annuleLe), gte(rendezVous.datePrevue, depuis)))
      .orderBy(asc(rendezVous.datePrevue)),
    etapesFaites(db, patientIds),
  ]);
  return lignes.map((l) => {
    const etape =
      l.etapeCode && l.programme && l.dateReference && l.dateInscription
        ? PROGRAMMES[l.programme].etapes(l.dateReference, l.dateInscription).find((d) => d.code === l.etapeCode)
        : undefined;
    return {
      id: l.id,
      patientId: l.patientId,
      motif: l.motif,
      libelle: etape?.libelle ?? LIBELLES_RDV[l.motif],
      datePrevue: l.datePrevue,
      moment: l.moment,
      reserve: l.creneauId !== null,
      programme: l.source === "programme" && l.etapeCode !== null,
      faite: l.etapeCode !== null && (faites.get(l.patientId)?.has(cleEtape(l.motif, l.etapeCode)) ?? false),
      etablissement: l.etablissement,
    };
  });
}

/** Créneaux d'une plage avec le nombre de places déjà prises. */
export async function placesDisponibles(
  db: Db,
  filtre: { etablissementId: string; motif: MotifRdv; du: DateISO; au: DateISO },
): Promise<CreneauVu[]> {
  return db
    .select({
      id: creneaux.id,
      date: creneaux.date,
      moment: creneaux.moment,
      capacite: creneaux.capacite,
      reserves: sql<number>`count(${rendezVous.id})::int`,
    })
    .from(creneaux)
    .leftJoin(rendezVous, and(eq(rendezVous.creneauId, creneaux.id), isNull(rendezVous.annuleLe)))
    .where(
      and(
        eq(creneaux.etablissementId, filtre.etablissementId),
        eq(creneaux.motif, filtre.motif),
        gte(creneaux.date, filtre.du),
        lte(creneaux.date, filtre.au),
      ),
    )
    .groupBy(creneaux.id);
}

export interface AttenteVue {
  id: string;
  patientId: string;
  motif: MotifRdv;
  dateSouhaitee: DateISO;
  moment: "matin" | "apres_midi";
}

export async function listeAttenteDe(db: Db, patientIds: string[]): Promise<AttenteVue[]> {
  if (patientIds.length === 0) return [];
  return db
    .select({
      id: listeAttente.id,
      patientId: listeAttente.patientId,
      motif: listeAttente.motif,
      dateSouhaitee: listeAttente.dateSouhaitee,
      moment: listeAttente.moment,
    })
    .from(listeAttente)
    .where(and(inArray(listeAttente.patientId, patientIds), eq(listeAttente.statut, "en_attente")))
    .orderBy(asc(listeAttente.dateSouhaitee));
}
```

Créer `src/server/requetes/accueil.ts` :

```ts
import { and, eq, gte, inArray, lt } from "drizzle-orm";
import type { EntreeCartes } from "@/domain/cartes-du-jour";
import { ajouterJours, aujourdhuiAuBenin, type DateISO } from "@/domain/dates";
import { debutDuJourAuBenin, type MomentPrise } from "@/domain/temps";
import { traitementsEnCours, type PriseNotee, type StatutPrise, type TraitementEnCours } from "@/domain/traitements";
import type { Db } from "../db/client";
import { evenements, ordonnances } from "../db/schema";
import { rendezVousVus } from "./rendez-vous";

/** Traitements en cours : ordonnances dont la délivrance est enregistrée. */
export async function traitementsDes(db: Db, patientIds: string[], aujourdhui: DateISO): Promise<TraitementEnCours[]> {
  if (patientIds.length === 0) return [];
  const [lesOrdonnances, delivrances] = await Promise.all([
    db
      .select({ id: ordonnances.id, patientId: ordonnances.patientId, lignes: ordonnances.lignes })
      .from(ordonnances)
      .where(inArray(ordonnances.patientId, patientIds)),
    db
      .select({ donnees: evenements.donnees, survenuLe: evenements.survenuLe })
      .from(evenements)
      .where(and(inArray(evenements.patientId, patientIds), eq(evenements.type, "delivrance"))),
  ]);
  const delivreeLe = new Map<string, DateISO>();
  for (const d of delivrances) {
    const ordonnanceId = d.donnees.ordonnanceId;
    if (typeof ordonnanceId === "string" && !delivreeLe.has(ordonnanceId)) delivreeLe.set(ordonnanceId, aujourdhuiAuBenin(d.survenuLe));
  }
  return traitementsEnCours(
    lesOrdonnances.map((o) => ({ ...o, delivreeLe: delivreeLe.get(o.id) ?? null })),
    aujourdhui,
  );
}

/** Prises notées ce jour-là, de minuit à minuit à l'heure du Bénin. */
export async function prisesDuJour(db: Db, patientIds: string[], jour: DateISO): Promise<PriseNotee[]> {
  if (patientIds.length === 0) return [];
  const lignes = await db
    .select({ donnees: evenements.donnees, survenuLe: evenements.survenuLe })
    .from(evenements)
    .where(
      and(
        inArray(evenements.patientId, patientIds),
        eq(evenements.type, "prise_medicament"),
        gte(evenements.survenuLe, debutDuJourAuBenin(jour)),
        lt(evenements.survenuLe, debutDuJourAuBenin(ajouterJours(jour, 1))),
      ),
    );
  return lignes.map((l) => {
    const d = l.donnees as { traitement: string; moment: MomentPrise; statut: StatutPrise };
    return { traitementCle: d.traitement, moment: d.moment, statut: d.statut, survenuLe: l.survenuLe };
  });
}

/** Tout ce qu'il faut pour calculer les cartes du jour d'une famille. */
export async function donneesAccueil(
  db: Db,
  patientIds: string[],
  aujourdhui: DateISO,
): Promise<Pick<EntreeCartes, "traitements" | "prisesDuJour" | "rendezVous">> {
  const [traitements, prises, rendezVous] = await Promise.all([
    traitementsDes(db, patientIds, aujourdhui),
    prisesDuJour(db, patientIds, aujourdhui),
    rendezVousVus(db, patientIds, ajouterJours(aujourdhui, -60)),
  ]);
  return { traitements, prisesDuJour: prises, rendezVous };
}
```

Créer `src/server/requetes/carnet.ts` :

```ts
import { and, asc, eq, isNull } from "drizzle-orm";
import { planifier } from "@/domain/calendrier";
import type { DateISO } from "@/domain/dates";
import { PROGRAMMES, type CodeProgramme, type MotifRdv } from "@/domain/programmes";
import { statutEtape, type StatutEtape } from "@/domain/statuts";
import type { Db } from "../db/client";
import { inscriptions, rendezVous } from "../db/schema";
import { cleEtape, etapesFaites, type EtapeFaite } from "./etapes-faites";

export interface EtapeDuCarnet {
  code: string;
  libelle: string;
  details?: string;
  motif: MotifRdv;
  rendezVous: boolean;
  statut: StatutEtape;
  datePrevue: DateISO;
  faite: EtapeFaite | null;
  reservation: { date: DateISO; moment: "matin" | "apres_midi" | null } | null;
}

export interface ProgrammeDuCarnet {
  code: CodeProgramme;
  nom: string;
  dateReference: DateISO;
  etapes: EtapeDuCarnet[];
}

/** Programmes suivis par une personne, étape par étape : faite (avec le lieu), réservée, à venir ou manquée. */
export async function programmesDuCarnet(db: Db, patientId: string, aujourdhui: DateISO): Promise<ProgrammeDuCarnet[]> {
  const [lesInscriptions, rdvs, faites] = await Promise.all([
    db
      .select()
      .from(inscriptions)
      .where(and(eq(inscriptions.patientId, patientId), eq(inscriptions.active, true)))
      .orderBy(asc(inscriptions.creeLe)),
    db
      .select({
        inscriptionId: rendezVous.inscriptionId,
        etapeCode: rendezVous.etapeCode,
        datePrevue: rendezVous.datePrevue,
        moment: rendezVous.moment,
        creneauId: rendezVous.creneauId,
      })
      .from(rendezVous)
      .where(and(eq(rendezVous.patientId, patientId), isNull(rendezVous.annuleLe))),
    etapesFaites(db, [patientId]),
  ]);
  const faitesDuPatient = faites.get(patientId);
  return lesInscriptions.map((inscription) => ({
    code: inscription.programme,
    nom: PROGRAMMES[inscription.programme].nom,
    dateReference: inscription.dateReference,
    etapes: planifier(PROGRAMMES[inscription.programme], inscription.dateReference, inscription.dateInscription).map((etape) => {
      const faite = faitesDuPatient?.get(cleEtape(etape.motif, etape.code)) ?? null;
      const rdv = rdvs.find((r) => r.inscriptionId === inscription.id && r.etapeCode === etape.code);
      const reservation = rdv?.creneauId ? { date: rdv.datePrevue, moment: rdv.moment } : null;
      const statut: StatutEtape = faite
        ? "faite"
        : reservation && reservation.date >= aujourdhui
          ? "a_venir"
          : statutEtape(etape, false, aujourdhui);
      return {
        code: etape.code,
        libelle: etape.libelle,
        details: etape.details,
        motif: etape.motif,
        rendezVous: etape.rendezVous,
        statut,
        datePrevue: etape.datePrevue,
        faite,
        reservation,
      };
    }),
  }));
}
```

Créer `src/server/requetes/contenus.ts` :

```ts
import { and, eq } from "drizzle-orm";
import type { Db } from "../db/client";
import { contenus, contenusTraductions, type Langue } from "../db/schema";

/** Texte d'un contenu géré dans l'admin, dans une langue (français par défaut). */
export async function texteContenu(db: Db, code: string, langue: Langue = "fr"): Promise<string | null> {
  const [ligne] = await db
    .select({ texte: contenusTraductions.texte })
    .from(contenus)
    .innerJoin(contenusTraductions, eq(contenusTraductions.contenuId, contenus.id))
    .where(and(eq(contenus.code, code), eq(contenusTraductions.langue, langue)));
  return ligne?.texte ?? null;
}
```

- [ ] **Étape 4 : relancer les tests**

Run : `pnpm vitest run tests/server/requetes`
Expected : PASS.

- [ ] **Étape 5 : vérifier les types et committer**

```bash
pnpm typecheck
git add src/server/requetes tests/server/requetes
git commit -m "feat(patient): lectures de l'accueil, du carnet, des places et de la liste d'attente"
```

---

### Tâche 11 : composants de la charte pour l'espace patient

**Fichiers :**
- Créer : `src/ui/Ondes.tsx`, `src/ui/Tampon.tsx`, `src/ui/Etapes.tsx`, `src/ui/AvatarsFamille.tsx`, `src/ui/TuileChoix.tsx`, `src/ui/JourDisponible.tsx`, `src/ui/EnTeteQuestion.tsx`, `src/ui/pictogrammes.ts`, `src/ui/PileDeCartes.tsx`, `src/ui/BarreNavigation.tsx`, `src/ui/RetourAction.tsx`, `src/ui/BandeauHorsLigne.tsx`, `src/ui/BoutonEnvoi.tsx`
- Modifier : `src/ui/BoutonEcouter.tsx`, `src/app/globals.css`
- Tester : `tests/ui/PileDeCartes.test.tsx`, `tests/ui/BarreNavigation.test.tsx`, `tests/ui/RetourAction.test.tsx`, `tests/ui/BandeauHorsLigne.test.tsx`, `tests/ui/charte.test.tsx`, `tests/ui/BoutonEcouter.test.tsx`

**Interfaces :**
- Consomme : `JourPropose`, `libellePlaces` (tâche 6) ; `MotifRdv`, `CodeSigne`, `MomentPrise` ; `Icone`, `NomIcone`, `iconePourPersonne`.
- Produit :
  - `Ondes({ className })`, `FiltreEncre()`, `Tampon({ rang?, libelle?, className? })`, `Etapes({ numero, total })` ;
  - `AvatarsFamille({ personnes: PersonneAvatar[], actif, lien: (patientId) => string })` ;
  - `TuileChoix({ href, icone, libelle, ecoute? })`, `JourDisponible({ jour, href })`, `EnTeteQuestion({ retour, etape?, total?, question, aide?, ecoute })` ;
  - `ICONE_MOTIF`, `ICONE_SIGNE`, `ICONE_MOMENT` ;
  - composants client : `PileDeCartes({ titre, children })`, `BarreNavigation()`, `RetourAction({ message, children? })`, `BandeauHorsLigne({ message? })`, `BoutonEnvoi({ children, enCours, horsLigne, className? })` ;
  - `BoutonEcouter` accepte `variante?: "complet" | "pastille" | "rond"` (les deux dernières : rond seul, nom accessible = `libelle`).

- [ ] **Étape 1 : écrire les tests qui échouent**

Créer `tests/ui/PileDeCartes.test.tsx` :

```tsx
// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PileDeCartes } from "@/ui/PileDeCartes";

afterEach(cleanup);

describe("PileDeCartes", () => {
  it("dit où l'on est dans la pile", () => {
    render(
      <PileDeCartes titre="À faire">
        <p>Comprimé</p>
        <p>Vaccin</p>
        <p>Contrôle</p>
      </PileDeCartes>,
    );
    expect(screen.getByText("1 sur 3")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Carte précédente" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("passe à la carte suivante avec la flèche", () => {
    render(
      <PileDeCartes titre="À faire">
        <p>Comprimé</p>
        <p>Vaccin</p>
      </PileDeCartes>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Carte suivante" }));
    expect(screen.getByText("2 sur 2")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Carte suivante" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("n'affiche pas de flèches pour une seule carte", () => {
    render(
      <PileDeCartes titre="À faire">
        <p>Comprimé</p>
      </PileDeCartes>,
    );
    expect(screen.queryByRole("button")).toBeNull();
  });
});
```

Créer `tests/ui/BarreNavigation.test.tsx` :

```tsx
// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BarreNavigation } from "@/ui/BarreNavigation";

vi.mock("next/navigation", () => ({ usePathname: () => "/carnet" }));
afterEach(cleanup);

describe("BarreNavigation", () => {
  it("marque l'onglet de la page ouverte", () => {
    render(<BarreNavigation />);
    expect(screen.getByRole("link", { name: "Mon carnet" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("link", { name: "Accueil" }).getAttribute("aria-current")).toBeNull();
  });

  it("a quatre onglets, chacun avec un mot", () => {
    render(<BarreNavigation />);
    expect(screen.getAllByRole("link").map((l) => l.textContent)).toEqual(["Accueil", "Rendez-vous", "Mon carnet", "Famille"]);
  });
});
```

Créer `tests/ui/RetourAction.test.tsx` :

```tsx
// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RetourAction } from "@/ui/RetourAction";

afterEach(cleanup);

describe("RetourAction", () => {
  it("confirme par un message annoncé et une vibration", () => {
    const vibrer = vi.fn();
    Object.defineProperty(navigator, "vibrate", { value: vibrer, configurable: true });
    render(<RetourAction message="C'est noté." />);
    expect(screen.getByRole("status").textContent).toContain("C'est noté.");
    expect(vibrer).toHaveBeenCalledWith(80);
  });

  it("affiche l'action d'annulation fournie", () => {
    render(
      <RetourAction message="C'est noté.">
        <button>Annuler</button>
      </RetourAction>,
    );
    expect(screen.getByRole("button", { name: "Annuler" })).toBeTruthy();
  });
});
```

Créer `tests/ui/BandeauHorsLigne.test.tsx` :

```tsx
// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BandeauHorsLigne } from "@/ui/BandeauHorsLigne";

const reseau = vi.hoisted(() => ({ horsLigne: false }));
vi.mock("next/offline", () => ({ useOffline: () => reseau.horsLigne }));
afterEach(cleanup);

describe("BandeauHorsLigne", () => {
  it("ne dit rien quand le réseau est là", () => {
    reseau.horsLigne = false;
    render(<BandeauHorsLigne />);
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("prévient quand il n'y a pas de réseau", () => {
    reseau.horsLigne = true;
    render(<BandeauHorsLigne message="Pas de réseau pour le moment." />);
    expect(screen.getByRole("status").textContent).toContain("Pas de réseau pour le moment.");
  });
});
```

Créer `tests/ui/charte.test.tsx` :

```tsx
// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { JourPropose } from "@/domain/rendez-vous";
import { Etapes } from "@/ui/Etapes";
import { JourDisponible } from "@/ui/JourDisponible";
import { Tampon } from "@/ui/Tampon";
import { TuileChoix } from "@/ui/TuileChoix";

afterEach(cleanup);

const mercredi: JourPropose = {
  id: "c1",
  date: "2026-09-30",
  moment: "matin",
  capacite: 12,
  reserves: 9,
  places: 3,
  complet: false,
  dansJours: 5,
  soleils: 5,
  libelle: "Mercredi",
  quand: "dans 5 jours",
};

describe("composants de la charte", () => {
  it("Tampon : le « VU » du carnet papier, avec un nom accessible", () => {
    render(<Tampon libelle="Vaccin fait" />);
    expect(screen.getByRole("img", { name: "Vaccin fait" }).textContent).toBe("VU");
  });

  it("Etapes : dit l'avancement en toutes lettres", () => {
    render(<Etapes numero={2} total={4} />);
    expect(screen.getByText("2 sur 4")).toBeTruthy();
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("2");
  });

  it("JourDisponible : le jour, le moment, les places et les soleils", () => {
    render(<JourDisponible jour={mercredi} href="/x" />);
    const lien = screen.getByRole("link");
    expect(lien.textContent).toContain("Mercredi, le matin");
    expect(lien.textContent).toContain("3 places");
    expect(lien.textContent).toContain("dans 5 jours");
  });

  it("JourDisponible : un jour complet propose la liste d'attente", () => {
    render(<JourDisponible jour={{ ...mercredi, places: 0, complet: true }} href="/x" />);
    expect(screen.getByRole("link").textContent).toContain("Liste d'attente");
  });

  it("TuileChoix : un lien avec un mot, et un bouton écouter à côté", () => {
    render(<TuileChoix href="/x" icone="hi-syringe-vaccine" libelle="Vaccin" />);
    expect(screen.getByRole("link", { name: "Vaccin" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Écouter : Vaccin" })).toBeTruthy();
  });
});
```

Ajouter dans `tests/ui/BoutonEcouter.test.tsx`, dans le `describe` :

```tsx
  it("en rond seul, garde un nom accessible", () => {
    const { getByRole } = render(<BoutonEcouter variante="rond" libelle="Écouter la question" texte="Quel jour ?" />);
    expect(getByRole("button", { name: "Écouter la question" })).toBeTruthy();
  });
```

- [ ] **Étape 2 : lancer les tests et les voir échouer**

Run : `pnpm vitest run tests/ui`
Expected : FAIL (composants introuvables).

- [ ] **Étape 3 : ajouter les deux teintes de la pile de cartes**

Dans `src/app/globals.css`, dans `@theme`, après `--color-lavande-3` :

```css
  --color-lavande-4: #c9c8f5;
  --color-lavande-5: #a9a7ef;
```

- [ ] **Étape 4 : écrire les composants serveur**

Créer `src/ui/Ondes.tsx` :

```tsx
/** Motif de marque : les ondes de la voix, en décor des grandes cartes et des en-têtes. */
export function Ondes({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 160" aria-hidden="true" focusable="false" className={`pointer-events-none absolute ${className}`}>
      <g fill="none" stroke="currentColor" strokeWidth="6">
        <circle cx="80" cy="80" r="30" />
        <circle cx="80" cy="80" r="52" />
        <circle cx="80" cy="80" r="74" />
      </g>
    </svg>
  );
}
```

Créer `src/ui/Tampon.tsx` :

```tsx
/** Filtre « encre » des tampons : placé une fois dans la mise en page de l'espace patient. */
export function FiltreEncre() {
  return (
    <svg width="0" height="0" className="absolute" aria-hidden="true" focusable="false">
      <defs>
        <filter id="encre" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.95" numOctaves="2" seed="4" result="bruit" />
          <feColorMatrix in="bruit" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.1 1.95" result="masque" />
          <feComposite in="SourceGraphic" in2="masque" operator="in" />
        </filter>
      </defs>
    </svg>
  );
}

const INCLINAISONS = [-12, 8, -6, 11, -9, 5];

/** Tampon « VU » posé sur chaque étape faite, comme sur le carnet papier. */
export function Tampon({ rang = 0, libelle = "Fait", className = "size-9" }: { rang?: number; libelle?: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      role="img"
      aria-label={libelle}
      className={`text-marque ${className}`}
      style={{ transform: `rotate(${INCLINAISONS[rang % INCLINAISONS.length]}deg)` }}
    >
      <g filter="url(#encre)">
        <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="5" />
        <circle cx="50" cy="50" r="27" fill="none" stroke="currentColor" strokeWidth="2.5" />
        <text x="50" y="59" textAnchor="middle" fontSize="24" fontWeight="700" fill="currentColor">
          VU
        </text>
      </g>
    </svg>
  );
}
```

Créer `src/ui/Etapes.tsx` :

```tsx
/** Barre d'avancement d'un parcours : « 2 sur 4 ». */
export function Etapes({ numero, total }: { numero: number; total: number }) {
  return (
    <div className="flex flex-1 items-center gap-3">
      <span
        role="progressbar"
        aria-label="Avancement"
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={numero}
        className="h-1.5 flex-1 overflow-hidden rounded-full bg-lavande-3"
      >
        <span className="block h-full rounded-full bg-marque" style={{ width: `${(numero / total) * 100}%` }} />
      </span>
      <small className="text-xs font-bold whitespace-nowrap text-gris">
        {numero} sur {total}
      </small>
    </div>
  );
}
```

Créer `src/ui/AvatarsFamille.tsx` :

```tsx
import Link from "next/link";
import { iconePourPersonne } from "./avatar";
import { Icone } from "./Icone";

export interface PersonneAvatar {
  patientId: string;
  prenom: string;
  sexe: "F" | "M";
  age: number;
}

/** Changer de carnet d'un geste : un avatar et un prénom par personne de la famille. */
export function AvatarsFamille({ personnes, actif, lien }: { personnes: PersonneAvatar[]; actif: string; lien: (patientId: string) => string }) {
  if (personnes.length < 2) return null;
  return (
    <nav aria-label="Changer de carnet">
      <ul className="flex gap-2">
        {personnes.map((p) => {
          const estActif = p.patientId === actif;
          return (
            <li key={p.patientId}>
              <Link
                href={lien(p.patientId)}
                aria-current={estActif ? "true" : undefined}
                className={`flex w-14 flex-col items-center gap-1 text-xs font-bold ${estActif ? "text-marque" : "text-gris"}`}
              >
                <span className={`grid size-11 place-items-center rounded-full bg-white text-marque ${estActif ? "ring-3 ring-marque" : ""}`}>
                  <Icone nom={iconePourPersonne(p.sexe, p.age)} className="size-7" />
                </span>
                <span className="max-w-full truncate">{p.prenom}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
```

Créer `src/ui/TuileChoix.tsx` :

```tsx
import Link from "next/link";
import { BoutonEcouter } from "./BoutonEcouter";
import { Icone } from "./Icone";
import type { NomIcone } from "./icones";

/** Grande tuile : pictogramme + mot, toute la tuile est cliquable, le bouton écouter reste à part. */
export function TuileChoix({ href, icone, libelle, ecoute }: { href: string; icone: NomIcone; libelle: string; ecoute?: string }) {
  return (
    <div className="relative flex h-24 flex-col justify-between rounded-carte bg-white p-3 font-bold">
      <Icone nom={icone} className="size-9 text-marque" />
      <Link href={href} className="after:absolute after:inset-0 after:rounded-carte focus-visible:outline-none focus-visible:after:outline-3 focus-visible:after:outline-soleil-appuye">
        {libelle}
      </Link>
      <BoutonEcouter variante="pastille" libelle={`Écouter : ${libelle}`} texte={ecoute ?? libelle} className="absolute top-2.5 right-2.5 z-10" />
    </div>
  );
}
```

Créer `src/ui/JourDisponible.tsx` :

```tsx
import Link from "next/link";
import { libellePlaces, type JourPropose } from "@/domain/rendez-vous";
import { LIBELLE_MOMENT_RDV } from "@/domain/temps";
import { Icone } from "./Icone";

const JOURS_COURTS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"] as const;

/** Un jour proposé : le calendrier, les soleils qui disent dans combien de jours, et les places. */
export function JourDisponible({ jour, href }: { jour: JourPropose; href: string }) {
  const date = new Date(`${jour.date}T00:00:00Z`);
  return (
    <Link href={href} className="flex items-center gap-3 rounded-carte bg-white px-3.5 py-2.5">
      <span className={`grid h-[50px] w-[46px] shrink-0 place-items-center rounded-bouton leading-none ${jour.complet ? "bg-lavande text-gris" : "bg-lavande-2 text-marque"}`}>
        <span className="text-[0.62rem] font-bold">{JOURS_COURTS[date.getUTCDay()]}</span>
        <b className="text-xl tabular-nums">{date.getUTCDate()}</b>
      </span>
      <span className="min-w-0 flex-1">
        <b className="block">
          {jour.libelle}, {LIBELLE_MOMENT_RDV[jour.moment]}
        </b>
        <span className="mt-0.5 flex items-center gap-1 text-sm text-gris">
          {Array.from({ length: jour.soleils }, (_, i) => (
            <Icone key={i} nom="ph-sun" className="size-4 text-soleil-appuye" />
          ))}
          {jour.quand}
        </span>
      </span>
      <span className={`rounded-lg px-2 py-1 text-xs font-bold whitespace-nowrap ${jour.complet ? "bg-soleil-pale text-nuit" : "bg-lavande-2 text-marque"}`}>
        {jour.complet ? "Liste d'attente" : libellePlaces(jour.places)}
      </span>
    </Link>
  );
}
```

Créer `src/ui/EnTeteQuestion.tsx` :

```tsx
import Link from "next/link";
import { BoutonEcouter } from "./BoutonEcouter";
import { Etapes } from "./Etapes";
import { Icone } from "./Icone";

/** En-tête d'un parcours « une question par écran » : retour, avancement, écouter, puis la question. */
export function EnTeteQuestion({
  retour,
  etape,
  total = 4,
  question,
  aide,
  ecoute,
}: {
  retour: string;
  etape?: number;
  total?: number;
  question: string;
  aide?: string;
  ecoute: string;
}) {
  return (
    <header className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Link href={retour} aria-label="Retour" className="grid size-10 shrink-0 place-items-center rounded-full bg-white">
          <Icone nom="ph-arrow-left" className="size-5" />
        </Link>
        {etape ? <Etapes numero={etape} total={total} /> : <span className="flex-1" />}
        <BoutonEcouter variante="rond" libelle="Écouter la question" texte={ecoute} />
      </div>
      <h1 className="text-[1.45rem] leading-tight font-bold">
        {question}
        {aide && <small className="mt-1 block text-sm font-normal text-gris">{aide}</small>}
      </h1>
    </header>
  );
}
```

Créer `src/ui/pictogrammes.ts` :

```ts
import type { MotifRdv } from "@/domain/programmes";
import type { CodeSigne } from "@/domain/signes-danger";
import type { MomentPrise } from "@/domain/temps";
import type { NomIcone } from "./icones";

export const ICONE_MOTIF: Record<MotifRdv, NomIcone> = {
  consultation: "hi-stethoscope",
  tension: "hi-blood-pressure",
  grossesse: "hi-pregnant",
  vaccin: "hi-syringe-vaccine",
  diabete: "hi-diabetes-measure",
  fievre: "hi-chills-fever",
  dents: "hi-tooth",
};

export const ICONE_SIGNE: Record<CodeSigne, NomIcone> = {
  saignement: "hi-blood-drop",
  fievre: "hi-chills-fever",
  maux_de_tete: "hi-headache",
  gonflement: "hi-foot",
  bebe_ne_bouge_plus: "hi-fetus",
  perte_des_eaux: "ph-drop",
  douleur: "hi-pain",
  respiration: "hi-lungs",
  vomissements: "hi-vomiting",
  diarrhee: "hi-diarrhea",
  autre: "ph-question",
};

/** Moments de la journée plutôt que des heures : soleil levant, soleil, lune. */
export const ICONE_MOMENT: Record<MomentPrise, NomIcone> = {
  matin: "ph-sun-horizon",
  midi: "ph-sun",
  soir: "ph-moon",
};
```

- [ ] **Étape 5 : écrire les composants client**

Créer `src/ui/PileDeCartes.tsx` :

```tsx
"use client";

import { Children, useRef, useState, type ReactNode } from "react";
import { Icone } from "./Icone";

/** Une chose à la fois : les cartes défilent d'un geste du doigt, ou avec les flèches. */
export function PileDeCartes({ titre, children }: { titre: string; children: ReactNode }) {
  const cartes = Children.toArray(children);
  const liste = useRef<HTMLOListElement>(null);
  const [index, setIndex] = useState(0);
  const total = cartes.length;

  function aller(cible: number) {
    const i = Math.min(Math.max(cible, 0), total - 1);
    const element = liste.current?.children[i] as HTMLElement | undefined;
    element?.scrollIntoView?.({ behavior: "smooth", block: "nearest", inline: "start" });
    setIndex(i);
  }

  function suivreLeDoigt() {
    const el = liste.current;
    if (el && el.clientWidth > 0) setIndex(Math.round(el.scrollLeft / el.clientWidth));
  }

  return (
    <section aria-label={titre} className="flex flex-col gap-3">
      <div className="relative pb-4">
        {total > 1 && (
          <>
            <span aria-hidden="true" className="absolute inset-x-[18px] bottom-0 h-8 rounded-b-grande bg-lavande-4" />
            <span aria-hidden="true" className="absolute inset-x-[9px] bottom-2 h-8 rounded-b-grande bg-lavande-5" />
          </>
        )}
        <ol
          ref={liste}
          onScroll={suivreLeDoigt}
          className="relative z-10 flex snap-x snap-mandatory overflow-x-auto rounded-grande [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {cartes.map((carte, i) => (
            <li key={i} aria-label={`${i + 1} sur ${total}`} className="w-full shrink-0 snap-start">
              {carte}
            </li>
          ))}
        </ol>
      </div>
      {total > 1 && (
        <div className="flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => aller(index - 1)}
            disabled={index === 0}
            aria-label="Carte précédente"
            className="grid size-10 place-items-center rounded-full bg-white text-marque disabled:opacity-40"
          >
            <Icone nom="ph-arrow-left" className="size-5" />
          </button>
          <p aria-live="polite" className="flex items-center gap-1.5 text-xs font-bold text-gris">
            {cartes.map((_, i) => (
              <i key={i} aria-hidden="true" className={i === index ? "h-[7px] w-5 rounded bg-marque" : "size-[7px] rounded-full bg-lavande-3"} />
            ))}
            <span className="ml-1">
              {index + 1} sur {total}
            </span>
          </p>
          <button
            type="button"
            onClick={() => aller(index + 1)}
            disabled={index === total - 1}
            aria-label="Carte suivante"
            className="grid size-10 place-items-center rounded-full bg-white text-marque disabled:opacity-40"
          >
            <Icone nom="ph-arrow-left" className="size-5 rotate-180" />
          </button>
        </div>
      )}
    </section>
  );
}
```

Créer `src/ui/BarreNavigation.tsx` :

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icone } from "./Icone";
import type { NomIcone } from "./icones";

const ONGLETS: { href: string; libelle: string; icone: NomIcone }[] = [
  { href: "/", libelle: "Accueil", icone: "ph-house" },
  { href: "/rendez-vous", libelle: "Rendez-vous", icone: "ph-calendar-dots" },
  { href: "/carnet", libelle: "Mon carnet", icone: "ph-list-checks" },
  { href: "/famille", libelle: "Famille", icone: "ph-users-three" },
];

/** Deux niveaux de navigation au plus : ces quatre onglets, puis l'écran. */
export function BarreNavigation() {
  const chemin = usePathname();
  return (
    <nav aria-label="Navigation principale" className="sticky bottom-0 z-20 border-t border-lavande-2 bg-white pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <ul className="grid grid-cols-4 px-1.5 pt-2">
        {ONGLETS.map((o) => {
          const actif = o.href === "/" ? chemin === "/" : chemin.startsWith(o.href);
          return (
            <li key={o.href}>
              <Link
                href={o.href}
                aria-current={actif ? "page" : undefined}
                className={`flex flex-col items-center gap-1 text-xs font-bold ${actif ? "text-marque" : "text-gris"}`}
              >
                <span className={`grid h-8 w-14 place-items-center rounded-full ${actif ? "bg-lavande-2" : ""}`}>
                  <Icone nom={o.icone} className="size-6" />
                </span>
                {o.libelle}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
```

Créer `src/ui/RetourAction.tsx` :

```tsx
"use client";

import { useEffect, type ReactNode } from "react";
import { Icone } from "./Icone";

/** Petit son de confirmation, sans fichier à télécharger. */
function bip() {
  try {
    const Contexte = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Contexte) return;
    const contexte = new Contexte();
    const oscillateur = contexte.createOscillator();
    const volume = contexte.createGain();
    oscillateur.frequency.value = 880;
    volume.gain.value = 0.08;
    oscillateur.connect(volume).connect(contexte.destination);
    oscillateur.onended = () => void contexte.close();
    oscillateur.start();
    oscillateur.stop(contexte.currentTime + 0.12);
  } catch {
    // Le son est un plus : la confirmation reste visible et annoncée.
  }
}

/** Confirmation visuelle, sonore et par vibration après une action (spec §9, règle 6). */
export function RetourAction({ message, children }: { message: string; children?: ReactNode }) {
  useEffect(() => {
    navigator.vibrate?.(80);
    bip();
  }, [message]);
  return (
    <div role="status" className="flex items-center gap-3 rounded-carte bg-nuit px-4 py-3 text-white">
      <Icone nom="ph-check-circle" className="size-6 shrink-0 text-lavande-3" />
      <p className="flex-1 font-bold">{message}</p>
      {children}
    </div>
  );
}
```

Créer `src/ui/BandeauHorsLigne.tsx` :

```tsx
"use client";

import { useOffline } from "next/offline";
import { Icone } from "./Icone";

/** Dit clairement qu'il n'y a pas de réseau (détection de Next : `experimental.useOffline`). */
export function BandeauHorsLigne({ message = "Pas de réseau pour le moment. Ce que vous voyez peut dater un peu." }: { message?: string }) {
  const horsLigne = useOffline();
  if (!horsLigne) return null;
  return (
    <p role="status" className="flex items-center gap-2 rounded-bouton bg-nuit px-4 py-3 text-sm font-bold text-white">
      <Icone nom="ph-wifi-slash" className="size-5 shrink-0" />
      {message}
    </p>
  );
}
```

Créer `src/ui/BoutonEnvoi.tsx` :

```tsx
"use client";

import { useOffline } from "next/offline";
import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

/** Bouton d'envoi : dit « en cours », et sans réseau, que l'envoi partira au retour du réseau. */
export function BoutonEnvoi({ children, enCours, horsLigne, className = "" }: { children: ReactNode; enCours: string; horsLigne: string; className?: string }) {
  const { pending } = useFormStatus();
  const sansReseau = useOffline();
  return (
    <>
      <button disabled={pending} className={className}>
        {pending ? enCours : children}
      </button>
      {pending && sansReseau && (
        <p role="status" className="rounded-bouton bg-nuit px-4 py-3 text-sm font-bold text-white">
          {horsLigne}
        </p>
      )}
    </>
  );
}
```

Dans `src/ui/BoutonEcouter.tsx`, ajouter `variante?: "complet" | "pastille" | "rond";` au type `Props`, la récupérer (`variante = "complet"`) dans la signature, et insérer juste avant le `return` final :

```tsx
  if (variante !== "complet") {
    const rond = variante === "rond";
    return (
      <button
        type="button"
        onClick={enLecture ? arreter : lancer}
        disabled={!disponible}
        aria-pressed={enLecture}
        aria-label={libelle}
        title={disponible ? libelle : "Audio indisponible"}
        className={`grid shrink-0 place-items-center rounded-full text-nuit disabled:opacity-50 ${
          rond ? "size-11 bg-soleil shadow-[0_0_0_6px_rgb(255_194_26_/_0.25)]" : "size-8 bg-soleil-pale"
        } ${className}`}
      >
        <Icone nom={enLecture ? "ph-pause" : "ph-speaker-high"} className={rond ? "size-5" : "size-4"} />
      </button>
    );
  }
```

- [ ] **Étape 6 : relancer les tests**

Run : `pnpm vitest run tests/ui`
Expected : PASS.

- [ ] **Étape 7 : vérifier le style et les types, puis committer**

```bash
set -o pipefail
pnpm lint && pnpm typecheck
git add src/ui src/app/globals.css tests/ui
git commit -m "feat(ui): pile de cartes, tampon VU, tuiles, jours, navigation et retours d'action"
```

---

### Tâche 12 : structure de l'espace patient et accueil « une chose à la fois »

**Fichiers :**
- Créer : `src/app/(patient)/layout.tsx`, `src/app/(patient)/contexte.ts`, `src/app/(patient)/actions.ts`, `src/app/(patient)/(onglets)/layout.tsx`, `src/app/(patient)/(onglets)/page.tsx`, `src/app/(patient)/(onglets)/CarteDuJourVue.tsx`, `src/app/(patient)/(onglets)/Ensuite.tsx`
- Supprimer : `src/app/page.tsx`
- Modifier : `next.config.ts`

**Interfaces :**
- Consomme : `carnetsDuCompte`, `choisirCarnet` (tâche 7) ; `noterPrise` (tâche 8) ; `donneesAccueil` (tâche 10) ; `cartesDuJour` et les textes (tâche 5) ; composants de la tâche 11.
- Produit :
  - `contextePatient(pour?): Promise<{ compte, aujourdhui, carnets, carnet: Carnet | null, titulaire: Carnet | null }>` ; `texteDe(valeur): string | undefined` ;
  - `noterPriseAction(formulaire: FormData): Promise<void>` (champs `patientId`, `traitementCle`, `moment`, `statut`, `pour`) ; revient à `/?note=<statut>&carte=<cle>|<moment>` ;
  - la page `/` et les onglets (barre de navigation) pour les tâches 13 à 15.

À lire avant : `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route-groups.md`, `node_modules/next/dist/docs/01-app/02-guides/forms.md`.

- [ ] **Étape 1 : activer la détection du hors-ligne**

Remplacer `next.config.ts` par :

```ts
import type { NextConfig } from "next";

const config: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  experimental: {
    // Sans réseau, une Server Action reste en attente et repart au retour du réseau ; `useOffline` le dit à l'écran (spec §10.3).
    useOffline: true,
  },
};

export default config;
```

- [ ] **Étape 2 : écrire les mises en page, le contexte et l'action**

Créer `src/app/(patient)/layout.tsx` :

```tsx
import { FiltreEncre } from "@/ui/Tampon";

/** Espace patient : une colonne de téléphone, même sur un grand écran. */
export default function EspacePatientLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
      {children}
      <FiltreEncre />
    </div>
  );
}
```

Créer `src/app/(patient)/(onglets)/layout.tsx` :

```tsx
import { BarreNavigation } from "@/ui/BarreNavigation";

export default function OngletsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <main className="flex flex-1 flex-col gap-4 px-4 pt-5 pb-6">{children}</main>
      <BarreNavigation />
    </>
  );
}
```

Créer `src/app/(patient)/contexte.ts` :

```ts
import { aujourdhuiAuBenin } from "@/domain/dates";
import { exigerRole } from "@/server/auth/cookies";
import { db } from "@/server/db/client";
import { carnetsDuCompte, choisirCarnet } from "@/server/requetes/carnets";

type Parametre = string | string[] | undefined;

export const texteDe = (valeur: Parametre): string | undefined => (typeof valeur === "string" ? valeur : undefined);

/** Compte connecté, carnets de la famille et carnet affiché (`?pour=`), pour toutes les pages patient. */
export async function contextePatient(pour?: Parametre) {
  const compte = await exigerRole("patient");
  const aujourdhui = aujourdhuiAuBenin();
  const carnets = await carnetsDuCompte(db(), compte.id, aujourdhui);
  const carnet = choisirCarnet(carnets, texteDe(pour));
  const titulaire = carnets.find((c) => c.lien === "soi") ?? carnets[0] ?? null;
  return { compte, aujourdhui, carnets, carnet, titulaire };
}
```

Créer `src/app/(patient)/actions.ts` :

```ts
"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { MOMENTS_PRISE } from "@/domain/temps";
import { exigerRole } from "@/server/auth/cookies";
import { db } from "@/server/db/client";
import { noterPrise } from "@/server/patient/prises";

const champsPrise = z.object({
  patientId: z.uuid(),
  traitementCle: z.string().min(3).max(80),
  moment: z.enum(MOMENTS_PRISE),
  statut: z.enum(["fait", "plus_tard", "annule"]),
  pour: z.string().max(40).optional(),
});

/** « C'est fait », « Plus tard » ou « Annuler » sur une carte de prise ; revient à l'accueil avec la confirmation. */
export async function noterPriseAction(formulaire: FormData): Promise<void> {
  const compte = await exigerRole("patient");
  const saisie = champsPrise.safeParse(Object.fromEntries(formulaire));
  if (!saisie.success) redirect("/");
  const { pour, ...prise } = saisie.data;
  const resultat = await noterPrise(db(), { compteId: compte.id, ...prise });
  const retour = new URLSearchParams();
  if (pour) retour.set("pour", pour);
  if (resultat.ok) {
    retour.set("note", prise.statut);
    retour.set("carte", `${prise.traitementCle}|${prise.moment}`);
  }
  redirect(`/?${retour}`);
}
```

- [ ] **Étape 3 : écrire l'accueil**

Supprimer l'accueil provisoire :

```bash
git rm src/app/page.tsx
```

Créer `src/app/(patient)/(onglets)/CarteDuJourVue.tsx` :

```tsx
import Link from "next/link";
import { detailCarte, surtitre, texteAEcouter, titreCarte, type CarteDuJour } from "@/domain/cartes-du-jour";
import type { DateISO } from "@/domain/dates";
import { BoutonEcouter } from "@/ui/BoutonEcouter";
import { Icone } from "@/ui/Icone";
import { Ondes } from "@/ui/Ondes";
import { ICONE_MOMENT, ICONE_MOTIF } from "@/ui/pictogrammes";
import { noterPriseAction } from "../actions";

const BOUTON_BLANC = "flex items-center justify-center gap-1.5 rounded-bouton bg-white py-3.5 font-bold text-marque";

/** Grande carte indigo : ce qu'il faut faire, à écouter, avec une seule action. */
export function CarteDuJourVue({ carte, aujourdhui, pour, retour }: { carte: CarteDuJour; aujourdhui: DateISO; pour: string | null; retour: string }) {
  const prise = carte.type === "prise";
  return (
    <article className="relative h-full overflow-hidden rounded-grande bg-marque p-4 text-white">
      <Ondes className="-top-12 -right-12 size-48 text-white opacity-15" />
      <div className="relative flex items-center gap-2 text-sm font-bold text-soleil-pale">
        <span className={`grid size-9 place-items-center rounded-xl ${prise ? "bg-soleil text-nuit" : "bg-white/15 text-white"}`}>
          <Icone nom={prise ? ICONE_MOMENT[carte.moment] : ICONE_MOTIF[carte.motif]} className="size-6" />
        </span>
        {surtitre(carte, aujourdhui)}
        <BoutonEcouter variante="rond" libelle="Écouter" texte={texteAEcouter(carte, { aujourdhui, pour })} className="ml-auto" />
      </div>
      {pour && <p className="relative mt-3 text-sm font-bold text-lavande-3">Pour {pour}</p>}
      <h2 className="relative mt-2 text-[1.45rem] leading-tight font-bold">{titreCarte(carte)}</h2>
      <p className="relative mt-2.5 flex items-center gap-2.5 text-sm text-lavande-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-white/15 text-white">
          <Icone nom={prise ? "hi-blister-pills_oval_x4" : carte.type === "manque" ? "ph-warning-circle" : "ph-calendar-dots"} className="size-6" />
        </span>
        {detailCarte(carte, aujourdhui)}
      </p>
      <div className="relative mt-4">
        {carte.type === "prise" ? (
          <form action={noterPriseAction} className="grid grid-cols-[1.4fr_1fr] gap-2">
            <input type="hidden" name="patientId" value={carte.patientId} />
            <input type="hidden" name="traitementCle" value={carte.traitementCle} />
            <input type="hidden" name="moment" value={carte.moment} />
            <input type="hidden" name="pour" value={retour} />
            <button name="statut" value="fait" className={BOUTON_BLANC}>
              <Icone nom="ph-check-circle" className="size-5" />
              C'est fait
            </button>
            <button name="statut" value="plus_tard" className="rounded-bouton bg-white/15 py-3.5 font-bold">
              Plus tard
            </button>
          </form>
        ) : carte.type === "rendez_vous" && carte.reserve ? (
          <Link href="/rendez-vous" className={BOUTON_BLANC}>
            <Icone nom="ph-calendar-check" className="size-5" />
            Voir mes rendez-vous
          </Link>
        ) : (
          <Link href={`/prendre-rendez-vous?pour=${carte.patientId}&motif=${carte.motif}`} className={BOUTON_BLANC}>
            <Icone nom="ph-calendar-dots" className="size-5" />
            Choisir le jour
          </Link>
        )}
      </div>
    </article>
  );
}
```

Créer `src/app/(patient)/(onglets)/Ensuite.tsx` :

```tsx
import Link from "next/link";
import type { CarteDuJour } from "@/domain/cartes-du-jour";
import { dateLongue, libelleDansJours, majuscule } from "@/domain/temps";
import { Icone } from "@/ui/Icone";
import { ICONE_MOTIF } from "@/ui/pictogrammes";

/** Le rendez-vous suivant, au-delà de la semaine : discret, sous la pile. */
export function Ensuite({ carte, pour }: { carte: CarteDuJour; pour: string | null }) {
  if (carte.type !== "rendez_vous") return null;
  return (
    <Link href="/rendez-vous" className="flex items-center gap-3 rounded-[20px] bg-white px-3 py-2.5">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-lavande-2 text-marque">
        <Icone nom={ICONE_MOTIF[carte.motif]} className="size-6" />
      </span>
      <span className="min-w-0 flex-1">
        <b className="block text-sm">
          Ensuite{pour ? ` pour ${pour}` : ""} : {carte.libelle}
        </b>
        <small className="text-xs text-gris">
          {majuscule(libelleDansJours(carte.dansJours))}, {dateLongue(carte.date)}
        </small>
      </span>
      <Icone nom="ph-caret-right" className="size-4 text-gris" />
    </Link>
  );
}
```

Créer `src/app/(patient)/(onglets)/page.tsx` :

```tsx
import Link from "next/link";
import { cartesDuJour } from "@/domain/cartes-du-jour";
import { heureAuBenin, salutation } from "@/domain/temps";
import type { TraitementEnCours } from "@/domain/traitements";
import { db } from "@/server/db/client";
import { donneesAccueil } from "@/server/requetes/accueil";
import { AvatarsFamille } from "@/ui/AvatarsFamille";
import { Icone } from "@/ui/Icone";
import { Logo } from "@/ui/Logo";
import { PileDeCartes } from "@/ui/PileDeCartes";
import { RetourAction } from "@/ui/RetourAction";
import { noterPriseAction } from "../actions";
import { contextePatient, texteDe } from "../contexte";
import { CarteDuJourVue } from "./CarteDuJourVue";
import { Ensuite } from "./Ensuite";

const MESSAGES: Record<string, string> = {
  fait: "C'est noté.",
  plus_tard: "D'accord, c'est pour plus tard.",
  annule: "C'est annulé : la prise est de nouveau à faire.",
  alerte_annulee: "L'alerte est annulée.",
  alerte_deja_prise: "Un soignant s'occupe déjà de votre alerte.",
};

export default async function Accueil({ searchParams }: PageProps<"/">) {
  const params = await searchParams;
  const { aujourdhui, carnets, carnet, titulaire } = await contextePatient(params.pour);
  if (!carnet || !titulaire) return <SansCarnet />;

  // Le titulaire voit les cartes de toute la famille ; un avatar ne montre que la personne choisie.
  const vueFamille = carnet.patientId === titulaire.patientId;
  const personnes = vueFamille ? carnets : [carnet];
  const heure = heureAuBenin();
  const donnees = await donneesAccueil(db(), personnes.map((c) => c.patientId), aujourdhui);
  const { pile, ensuite } = cartesDuJour({ aujourdhui, heure, ...donnees });
  const prenomPour = (patientId: string) =>
    patientId === titulaire.patientId ? null : (carnets.find((c) => c.patientId === patientId)?.prenom ?? null);
  const retour = vueFamille ? "" : carnet.patientId;

  return (
    <>
      <div className="flex items-start gap-3">
        <AvatarsFamille personnes={carnets} actif={carnet.patientId} lien={(id) => (id === titulaire.patientId ? "/" : `/?pour=${id}`)} />
        <Logo className="ml-auto size-9 shrink-0" />
      </div>
      <div>
        <h1 className="text-[1.65rem] leading-tight font-bold">
          {salutation(heure)} {titulaire.prenom}
        </h1>
        {!vueFamille && <p className="text-gris">Le carnet de {carnet.prenom}</p>}
      </div>
      <Retour note={texteDe(params.note)} carte={texteDe(params.carte)} traitements={donnees.traitements} retour={retour} />
      {pile.length > 0 ? (
        <PileDeCartes titre="À faire">
          {pile.map((carte) => (
            <CarteDuJourVue key={carte.cle} carte={carte} aujourdhui={aujourdhui} pour={prenomPour(carte.patientId)} retour={retour} />
          ))}
        </PileDeCartes>
      ) : (
        <RienAFaire patientId={carnet.patientId} />
      )}
      {ensuite && <Ensuite carte={ensuite} pour={prenomPour(ensuite.patientId)} />}
      <Link
        href={`/probleme?pour=${carnet.patientId}`}
        className="mt-auto flex items-center justify-center gap-2.5 rounded-[18px] bg-urgence p-3.5 text-lg font-bold text-white shadow-[0_8px_18px_-8px_rgb(217_45_32_/_0.7)]"
      >
        <Icone nom="hi-alert-circle" className="size-6" />
        J'ai un problème
      </Link>
    </>
  );
}

function Retour({ note, carte, traitements, retour }: { note?: string; carte?: string; traitements: TraitementEnCours[]; retour: string }) {
  const message = note ? MESSAGES[note] : undefined;
  if (!message) return null;
  const [traitementCle, moment] = (carte ?? "").split("|");
  const traitement = traitements.find((t) => t.cle === traitementCle);
  return (
    <RetourAction message={message}>
      {note === "fait" && traitement && moment && (
        <form action={noterPriseAction}>
          <input type="hidden" name="patientId" value={traitement.patientId} />
          <input type="hidden" name="traitementCle" value={traitement.cle} />
          <input type="hidden" name="moment" value={moment} />
          <input type="hidden" name="pour" value={retour} />
          <button name="statut" value="annule" className="flex items-center gap-1.5 rounded-bouton bg-white/15 px-3 py-2 text-sm font-bold">
            <Icone nom="ph-arrow-counter-clockwise" className="size-4" />
            Annuler
          </button>
        </form>
      )}
    </RetourAction>
  );
}

function RienAFaire({ patientId }: { patientId: string }) {
  return (
    <section className="flex flex-col gap-2 rounded-grande bg-white p-5">
      <Icone nom="ph-sun" className="size-10 text-soleil-appuye" />
      <h2 className="text-xl font-bold">Rien à faire pour le moment</h2>
      <p className="text-gris">Pas de médicament à prendre ni de rendez-vous proche.</p>
      <Link href={`/prendre-rendez-vous?pour=${patientId}`} className="mt-2 flex h-12 items-center justify-center gap-2 rounded-bouton bg-marque font-bold text-white">
        <Icone nom="ph-calendar-check" className="size-5" />
        Prendre un rendez-vous
      </Link>
    </section>
  );
}

function SansCarnet() {
  return (
    <section className="rounded-grande bg-white p-5">
      <h1 className="text-xl font-bold">Aucun carnet pour ce compte</h1>
      <p className="mt-2 text-gris">Demandez au centre de santé ou à votre relais de lier votre carnet à ce téléphone.</p>
    </section>
  );
}
```

- [ ] **Étape 4 : vérifier le style, les types et les tests**

```bash
set -o pipefail
pnpm lint && pnpm typecheck && pnpm test
```

Expected : aucune erreur, tous les tests au vert.

- [ ] **Étape 5 : préparer une base locale de vérification (une seule fois)**

Une instance Postgres à part, dans le dossier de travail de la session, sur le port 5433 : on ne touche pas à la base de l'utilisateur.

```bash
S="C:/Users/hp/AppData/Local/Temp/claude/o--Projets-sant-/56fbe848-df4e-4180-bfb5-3563c57b1838/scratchpad"
"H:/Postgres/bin/initdb.exe" -D "$S/pgdata" -U postgres --auth=trust -E UTF8 --locale=C
"H:/Postgres/bin/pg_ctl.exe" -D "$S/pgdata" -o "-p 5433" -l "$S/pg.log" start
"H:/Postgres/bin/createdb.exe" -h localhost -p 5433 -U postgres sante
printf 'DATABASE_URL=postgres://postgres@localhost:5433/sante\nCRON_SECRET=verification-locale-0001\n' > .env.local
pnpm db:seed
```

Expected : `Démo prête : { comptes: 9, … }`.

Créer `$S/fonts/ecrans.mjs` (outil de vérification, hors du dépôt) :

```js
import puppeteer from "puppeteer-core";
const SITE = process.env.SITE ?? "http://localhost:3000";
const [compte = "Codjo Houngbo", ...chemins] = process.argv.slice(2);
const navigateur = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: "new" });
const page = await navigateur.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
page.on("pageerror", (e) => console.log("ERREUR PAGE :", e.message));
page.on("console", (m) => m.type() === "error" && console.log("CONSOLE :", m.text()));
await page.goto(SITE + "/demo", { waitUntil: "networkidle0" });
await Promise.all([page.waitForNavigation({ waitUntil: "networkidle0" }), page.click(`xpath/.//button[contains(., "${compte}")]`)]);
for (const chemin of chemins.length ? chemins : ["/"]) {
  await page.goto(SITE + chemin, { waitUntil: "networkidle0" });
  const nom = chemin.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "accueil";
  await page.screenshot({ path: `../ecran-${nom}.png`, fullPage: true });
  console.log(chemin, "→", new URL(page.url()).pathname, "|", await page.$eval("h1", (e) => e.textContent).catch(() => "(pas de h1)"));
}
await navigateur.close();
```

- [ ] **Étape 6 : vérifier l'accueil dans le navigateur**

Lancer `pnpm dev` en arrière-plan, puis :

```bash
cd "$S/fonts" && node ecrans.mjs "Codjo Houngbo" /
```

(Pour les vues d'une seule personne, l'identifiant de Sèna se lit dans le lien de son avatar : `/?pour=<identifiant>`.)

Regarder `ecran-accueil.png` : avatars de la famille (Codjo entouré), « Bonjour Codjo » ou « Bonsoir Codjo », pile de 3 cartes (comprimé du soir, vaccins des 9 mois de Sèna, contrôle de jeudi), « 1 sur 3 », « Ensuite », bouton rouge « J'ai un problème », barre de navigation. Aucune erreur dans la console. Tester « C'est fait » : le message « C'est noté. » et « Annuler » apparaissent, la carte disparaît ; « Annuler » la fait revenir.

- [ ] **Étape 7 : commit**

```bash
git add next.config.ts "src/app/(patient)"
git commit -m "feat(patient): accueil « une chose à la fois » avec écoute, « C'est fait » et « Plus tard »"
```

---

### Tâche 13 : prise de rendez-vous en 4 étapes et liste d'attente

**Fichiers :**
- Créer : `src/app/(patient)/prendre-rendez-vous/page.tsx`
- Modifier : `src/app/(patient)/actions.ts`

**Interfaces :**
- Consomme : `reserver`, `inscrireListeAttente` (tâche 8) ; `placesDisponibles`, `rendezVousVus`, `listeAttenteDe` (tâche 10) ; `etablissementDuPatient` (tâche 7) ; `motifsProposes`, `motifDePlage`, `joursProposes`, `LIBELLES_MOTIF`, `LIBELLES_PLAGE`, `libellePlaces` (tâche 6) ; composants de la tâche 11.
- Produit :
  - `reserverAction(formulaire)` (champs `patientId`, `motif`, `creneauId`) : succès → `/prendre-rendez-vous?fait=<rendezVousId>` ; refus → retour au choix du jour avec `&erreur=<code>` ;
  - `listeAttenteAction(formulaire)` : succès → `/prendre-rendez-vous?attente=<attenteId>` ;
  - la page `/prendre-rendez-vous` : `?pour` → `?motif` → `?creneau` → récapitulatif ; une seule personne dans le carnet → l'étape 1 est sautée.

- [ ] **Étape 1 : ajouter les actions**

Dans `src/app/(patient)/actions.ts`, compléter les imports :

```ts
import { aujourdhuiAuBenin } from "@/domain/dates";
import { MOTIFS_RDV } from "@/domain/programmes";
import { inscrireListeAttente, reserver } from "@/server/patient/reservation";
```

et ajouter à la fin :

```ts
const champsReservation = z.object({ patientId: z.uuid(), motif: z.enum(MOTIFS_RDV), creneauId: z.uuid() });

/** Réserve la place choisie ; si elle vient d'être prise, revient au choix du jour avec le motif du refus. */
export async function reserverAction(formulaire: FormData): Promise<void> {
  const compte = await exigerRole("patient");
  const saisie = champsReservation.safeParse(Object.fromEntries(formulaire));
  if (!saisie.success) redirect("/prendre-rendez-vous");
  const resultat = await reserver(db(), { compteId: compte.id, ...saisie.data, aujourdhui: aujourdhuiAuBenin() });
  if (resultat.ok) redirect(`/prendre-rendez-vous?fait=${resultat.donnees.rendezVousId}`);
  redirect(`/prendre-rendez-vous?pour=${saisie.data.patientId}&motif=${saisie.data.motif}&erreur=${resultat.erreur}`);
}

/** Inscrit sur la liste d'attente d'un jour complet. */
export async function listeAttenteAction(formulaire: FormData): Promise<void> {
  const compte = await exigerRole("patient");
  const saisie = champsReservation.safeParse(Object.fromEntries(formulaire));
  if (!saisie.success) redirect("/prendre-rendez-vous");
  const resultat = await inscrireListeAttente(db(), { compteId: compte.id, ...saisie.data });
  if (resultat.ok) redirect(`/prendre-rendez-vous?attente=${resultat.donnees.attenteId}`);
  redirect(`/prendre-rendez-vous?pour=${saisie.data.patientId}&motif=${saisie.data.motif}&erreur=${resultat.erreur}`);
}
```

- [ ] **Étape 2 : écrire la page**

Créer `src/app/(patient)/prendre-rendez-vous/page.tsx` :

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { ajouterJours, type DateISO } from "@/domain/dates";
import type { MotifRdv } from "@/domain/programmes";
import { joursProposes, LIBELLES_MOTIF, LIBELLES_PLAGE, libellePlaces, motifDePlage, motifsProposes, type JourPropose } from "@/domain/rendez-vous";
import { dateLongue, LIBELLE_MOMENT_RDV, majuscule } from "@/domain/temps";
import { db } from "@/server/db/client";
import { etablissementDuPatient, type Carnet } from "@/server/requetes/carnets";
import { listeAttenteDe, placesDisponibles, rendezVousVus } from "@/server/requetes/rendez-vous";
import { iconePourPersonne, libelleLien } from "@/ui/avatar";
import { BandeauHorsLigne } from "@/ui/BandeauHorsLigne";
import { BoutonEcouter } from "@/ui/BoutonEcouter";
import { BoutonEnvoi } from "@/ui/BoutonEnvoi";
import { EnTeteQuestion } from "@/ui/EnTeteQuestion";
import { Icone } from "@/ui/Icone";
import type { NomIcone } from "@/ui/icones";
import { JourDisponible } from "@/ui/JourDisponible";
import { Ondes } from "@/ui/Ondes";
import { ICONE_MOTIF } from "@/ui/pictogrammes";
import { RetourAction } from "@/ui/RetourAction";
import { TuileChoix } from "@/ui/TuileChoix";
import { listeAttenteAction, reserverAction } from "../actions";
import { contextePatient, texteDe } from "../contexte";

const PAGE = "flex flex-1 flex-col gap-5 px-4 pt-5 pb-6";
const BOUTON = "flex h-14 w-full items-center justify-center gap-2 rounded-bouton bg-marque text-lg font-bold text-white disabled:opacity-60";
const HORS_LIGNE = "Pas de réseau pour le moment. Pour réserver, il faut le réseau. Vous pouvez aussi demander à votre relais.";
const ERREURS: Record<string, string> = {
  complet: "Ce jour vient d'être complet. Choisissez un autre jour.",
  deja_reserve: "Il y a déjà un rendez-vous ce jour-là. Choisissez un autre jour.",
  passe: "Ce jour n'est plus proposé. Choisissez un autre jour.",
  introuvable: "Ce jour n'est plus proposé. Choisissez un autre jour.",
};

const lien = (params: Record<string, string>) => `/prendre-rendez-vous?${new URLSearchParams(params)}`;

export default async function PrendreRendezVous({ searchParams }: PageProps<"/prendre-rendez-vous">) {
  const params = await searchParams;
  const { aujourdhui, carnets } = await contextePatient();
  const fait = texteDe(params.fait);
  if (fait) return <Enregistre rendezVousId={fait} carnets={carnets} aujourdhui={aujourdhui} />;
  const attente = texteDe(params.attente);
  if (attente) return <SurListeAttente attenteId={attente} carnets={carnets} />;

  // Étape 1 : pour qui ? (sautée quand le carnet n'a qu'une personne)
  const personne = carnets.find((c) => c.patientId === texteDe(params.pour)) ?? (carnets.length === 1 ? carnets[0] : undefined);
  if (!personne) return <PourQui carnets={carnets} />;

  // Étape 2 : pour quoi ?
  const motifs = motifsProposes(personne);
  const motif = motifs.find((m) => m === texteDe(params.motif));
  if (!motif) return <PourQuoi personne={personne} motifs={motifs} retour={carnets.length > 1 ? "/prendre-rendez-vous" : "/"} />;

  // Étape 3 : quel jour ?
  const creneaux = await placesDisponibles(db(), {
    etablissementId: personne.etablissementId,
    motif: motifDePlage(motif),
    du: ajouterJours(aujourdhui, 1),
    au: ajouterJours(aujourdhui, 21),
  });
  const jours = joursProposes(creneaux, aujourdhui);
  const jour = jours.find((j) => j.id === texteDe(params.creneau));
  if (!jour) return <QuelJour personne={personne} motif={motif} jours={jours} erreur={texteDe(params.erreur)} />;

  // Étape 4 : c'est bien ça ?
  const centre = await etablissementDuPatient(db(), personne.patientId);
  return <Recapitulatif personne={personne} motif={motif} jour={jour} centre={centre?.nom ?? "Centre de santé"} />;
}

function PourQui({ carnets }: { carnets: Carnet[] }) {
  return (
    <main className={PAGE}>
      <EnTeteQuestion
        retour="/"
        etape={1}
        question="Pour qui est le rendez-vous ?"
        aide="Touchez une personne"
        ecoute={`Pour qui est le rendez-vous ? ${carnets.map((c) => c.prenom).join(", ")}.`}
      />
      <BandeauHorsLigne message={HORS_LIGNE} />
      <ul className="flex flex-col gap-2.5">
        {carnets.map((c) => (
          <li key={c.patientId}>
            <Link href={lien({ pour: c.patientId })} className="flex items-center gap-3 rounded-carte bg-white p-3">
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-lavande-2 text-marque">
                <Icone nom={iconePourPersonne(c.sexe, c.age)} className="size-8" />
              </span>
              <span className="flex-1">
                <b className="block text-lg">{c.prenom}</b>
                <span className="text-sm text-gris">
                  {libelleLien(c.lien, c.sexe)}, {c.libelleAge}
                </span>
              </span>
              <Icone nom="ph-caret-right" className="size-5 text-gris" />
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}

function questionPourquoi(personne: Carnet): string {
  if (personne.lien === "soi") return "Pourquoi venez-vous ?";
  return `Pourquoi ${personne.prenom} doit-${personne.sexe === "F" ? "elle" : "il"} venir ?`;
}

function PourQuoi({ personne, motifs, retour }: { personne: Carnet; motifs: MotifRdv[]; retour: string }) {
  const question = questionPourquoi(personne);
  return (
    <main className={PAGE}>
      <EnTeteQuestion
        retour={retour}
        etape={2}
        question={question}
        aide="Touchez une image"
        ecoute={`${question} ${motifs.map((m) => LIBELLES_MOTIF[m]).join(", ")}.`}
      />
      <div className="grid grid-cols-2 gap-2.5">
        {motifs.map((m) => (
          <TuileChoix key={m} href={lien({ pour: personne.patientId, motif: m })} icone={ICONE_MOTIF[m]} libelle={LIBELLES_MOTIF[m]} />
        ))}
      </div>
    </main>
  );
}

function QuelJour({ personne, motif, jours, erreur }: { personne: Carnet; motif: MotifRdv; jours: JourPropose[]; erreur?: string }) {
  const ecoute = jours.map((j) => `${j.libelle}, ${LIBELLE_MOMENT_RDV[j.moment]}, ${j.complet ? "complet" : libellePlaces(j.places)}`).join(". ");
  return (
    <main className={PAGE}>
      <EnTeteQuestion
        retour={lien({ pour: personne.patientId })}
        etape={3}
        question="Quel jour ?"
        aide={`${LIBELLES_PLAGE[motif]} au centre de santé`}
        ecoute={`Quel jour ? ${ecoute}.`}
      />
      {erreur && ERREURS[erreur] && (
        <p role="alert" className="rounded-bouton bg-soleil-pale px-4 py-3 font-bold">
          {ERREURS[erreur]}
        </p>
      )}
      {jours.length === 0 ? (
        <p className="rounded-carte bg-white p-4">Pas de place dans les 3 prochaines semaines. Appelez le centre de santé ou demandez à votre relais.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {jours.map((j) => (
            <li key={j.id}>
              <JourDisponible jour={j} href={lien({ pour: personne.patientId, motif, creneau: j.id })} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function Ligne({ icone, titre, valeur }: { icone: NomIcone; titre: string; valeur: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-lavande-2 text-marque">
        <Icone nom={icone} className="size-6" />
      </span>
      <div>
        <dt className="text-xs font-bold text-gris">{titre}</dt>
        <dd className="font-bold">{valeur}</dd>
      </div>
    </div>
  );
}

function Recapitulatif({ personne, motif, jour, centre }: { personne: Carnet; motif: MotifRdv; jour: JourPropose; centre: string }) {
  const quand = `${majuscule(dateLongue(jour.date))}, ${LIBELLE_MOMENT_RDV[jour.moment]}`;
  const ecoute = jour.complet
    ? `${quand} est complet. Voulez-vous être sur la liste d'attente ? Si une place se libère, on vous prévient.`
    : `Rendez-vous pour ${personne.prenom} : ${LIBELLES_MOTIF[motif]}, ${quand}, au ${centre}. Touchez « Confirmer le rendez-vous ».`;
  return (
    <main className={PAGE}>
      <EnTeteQuestion
        retour={lien({ pour: personne.patientId, motif })}
        etape={4}
        question={jour.complet ? "Ce jour est complet" : "C'est bien ça ?"}
        aide={jour.complet ? "Vous pouvez attendre qu'une place se libère" : undefined}
        ecoute={ecoute}
      />
      <BandeauHorsLigne message={HORS_LIGNE} />
      <dl className="flex flex-col gap-3 rounded-carte bg-white p-4">
        <Ligne icone={iconePourPersonne(personne.sexe, personne.age)} titre="Pour" valeur={personne.prenom} />
        <Ligne icone={ICONE_MOTIF[motif]} titre="Pour quoi" valeur={LIBELLES_MOTIF[motif]} />
        <Ligne icone="ph-calendar-check" titre="Quand" valeur={quand} />
        <Ligne icone="ph-map-pin" titre="Où" valeur={centre} />
      </dl>
      <form action={jour.complet ? listeAttenteAction : reserverAction} className="mt-auto flex flex-col gap-3">
        <input type="hidden" name="patientId" value={personne.patientId} />
        <input type="hidden" name="motif" value={motif} />
        <input type="hidden" name="creneauId" value={jour.id} />
        <BoutonEnvoi className={BOUTON} enCours="Envoi en cours…" horsLigne="Pas de réseau : la demande partira dès que le réseau revient.">
          <Icone nom={jour.complet ? "ph-hourglass-medium" : "ph-calendar-check"} className="size-6" />
          {jour.complet ? "M'inscrire sur la liste d'attente" : "Confirmer le rendez-vous"}
        </BoutonEnvoi>
        {jour.complet && (
          <Link href={lien({ pour: personne.patientId, motif })} className="text-center font-bold text-marque">
            Choisir un autre jour
          </Link>
        )}
      </form>
    </main>
  );
}

async function Enregistre({ rendezVousId, carnets, aujourdhui }: { rendezVousId: string; carnets: Carnet[]; aujourdhui: DateISO }) {
  const rdv = (await rendezVousVus(db(), carnets.map((c) => c.patientId), aujourdhui)).find((r) => r.id === rendezVousId);
  const personne = carnets.find((c) => c.patientId === rdv?.patientId);
  if (!rdv || !personne) notFound();
  const quand = `${majuscule(dateLongue(rdv.datePrevue))}${rdv.moment ? `, ${LIBELLE_MOMENT_RDV[rdv.moment]}` : ""}`;
  return (
    <main className={PAGE}>
      <RetourAction message="Rendez-vous enregistré" />
      <section className="relative flex flex-col items-center gap-2 overflow-hidden rounded-grande bg-marque p-6 text-center text-white">
        <Ondes className="-top-10 -right-10 size-44 text-white opacity-15" />
        <span className="relative grid size-16 place-items-center rounded-full bg-white text-marque">
          <Icone nom="ph-check" className="size-9" />
        </span>
        <h1 className="relative text-2xl font-bold">C'est enregistré</h1>
        <p className="relative text-lavande-3">
          {rdv.libelle} pour {personne.prenom}
        </p>
        <p className="relative text-xl font-bold">{quand}</p>
        <p className="relative text-sm text-lavande-3">{rdv.etablissement}</p>
        <BoutonEcouter
          libelle="Écouter"
          texte={`C'est enregistré. ${rdv.libelle} pour ${personne.prenom}, ${quand}, au ${rdv.etablissement}. Venez avec le carnet.`}
          className="relative mt-2"
        />
      </section>
      <p className="rounded-carte bg-white p-4 text-sm">Venez avec le carnet. Si vous ne pouvez pas venir, prévenez le centre : la place servira à quelqu'un d'autre.</p>
      <Link href="/" className={`mt-auto ${BOUTON}`}>
        Retour à l'accueil
      </Link>
      <Link href="/rendez-vous" className="text-center font-bold text-marque">
        Voir mes rendez-vous
      </Link>
    </main>
  );
}

async function SurListeAttente({ attenteId, carnets }: { attenteId: string; carnets: Carnet[] }) {
  const attente = (await listeAttenteDe(db(), carnets.map((c) => c.patientId))).find((a) => a.id === attenteId);
  const personne = carnets.find((c) => c.patientId === attente?.patientId);
  if (!attente || !personne) notFound();
  return (
    <main className={PAGE}>
      <RetourAction message="Vous êtes sur la liste d'attente" />
      <section className="flex flex-col gap-2 rounded-grande bg-white p-5">
        <Icone nom="ph-hourglass-medium" className="size-10 text-marque" />
        <h1 className="text-xl font-bold">Liste d'attente</h1>
        <p>
          {LIBELLES_MOTIF[attente.motif]} pour {personne.prenom}, {dateLongue(attente.dateSouhaitee)}, {LIBELLE_MOMENT_RDV[attente.moment]}.
        </p>
        <p className="text-gris">Si une place se libère, on vous prévient. Vous pouvez aussi choisir un autre jour.</p>
      </section>
      <Link href={lien({ pour: personne.patientId, motif: attente.motif })} className={BOUTON}>
        Choisir un autre jour
      </Link>
      <Link href="/" className="text-center font-bold text-marque">
        Retour à l'accueil
      </Link>
    </main>
  );
}
```

- [ ] **Étape 3 : vérifier le style, les types et les tests**

```bash
set -o pipefail
pnpm lint && pnpm typecheck && pnpm test
```

- [ ] **Étape 4 : vérifier le parcours dans le navigateur**

Avec `pnpm dev` lancé : `node ecrans.mjs "Codjo Houngbo" /prendre-rendez-vous "/prendre-rendez-vous?pour=<Sèna>" "/prendre-rendez-vous?pour=<Sèna>&motif=vaccin"`. Vérifier : étape 1 avec les 3 personnes ; étape 2 « Pourquoi Sèna doit-il venir ? » avec Vaccin en premier ; étape 3 avec « Mercredi, le matin », 5 soleils et « 3 places » ; puis réserver le mercredi : écran « C'est enregistré ». Pour la liste d'attente, en compte d'Aïcha : la première matinée de consultation est « Liste d'attente », et s'y inscrire mène à l'écran « Liste d'attente ».

- [ ] **Étape 5 : commit**

```bash
git add "src/app/(patient)"
git commit -m "feat(patient): prise de rendez-vous en 4 étapes, avec places et liste d'attente"
```

---

### Tâche 14 : carnet avec tampons, rendez-vous et famille

**Fichiers :**
- Créer : `src/app/(patient)/(onglets)/carnet/page.tsx`, `src/app/(patient)/(onglets)/carnet/Frise.tsx`, `src/app/(patient)/(onglets)/rendez-vous/page.tsx`, `src/app/(patient)/(onglets)/famille/page.tsx`

**Interfaces :**
- Consomme : `programmesDuCarnet`, `ProgrammeDuCarnet`, `EtapeDuCarnet` (tâche 10) ; `traitementsDes`, `rendezVousVus`, `listeAttenteDe` (tâche 10) ; `semainesDeGrossesse`, `termePrevu` ; `Tampon`, `AvatarsFamille`, `Ondes` (tâche 11) ; `seDeconnecter` (`src/app/actions-session.ts`).
- Produit : les pages `/carnet?pour=`, `/rendez-vous` et `/famille`.

- [ ] **Étape 1 : écrire la frise du carnet**

Créer `src/app/(patient)/(onglets)/carnet/Frise.tsx` :

```tsx
import Link from "next/link";
import { aujourdhuiAuBenin, joursEntre, type DateISO } from "@/domain/dates";
import { semainesDeGrossesse, termePrevu } from "@/domain/programmes/grossesse";
import { dateCourte, dateLongue, LIBELLE_MOMENT_RDV, libelleDansJours, majuscule, moisEtAnnee } from "@/domain/temps";
import type { EtapeDuCarnet, ProgrammeDuCarnet } from "@/server/requetes/carnet";
import { Icone } from "@/ui/Icone";
import { ICONE_MOTIF } from "@/ui/pictogrammes";
import { Tampon } from "@/ui/Tampon";

const lienReserver = (patientId: string, etape: EtapeDuCarnet) => `/prendre-rendez-vous?pour=${patientId}&motif=${etape.motif}`;

/** Un programme suivi, comme une page du carnet papier : chaque étape faite porte son tampon « VU ». */
export function SectionProgramme({ programme, patientId, aujourdhui }: { programme: ProgrammeDuCarnet; patientId: string; aujourdhui: DateISO }) {
  const prochaine = programme.etapes.find((e) => e.statut === "a_venir" && e.rendezVous);
  return (
    <section aria-labelledby={`programme-${programme.code}`} className="flex flex-col gap-2.5">
      <h2 id={`programme-${programme.code}`} className="text-lg font-bold">
        {programme.nom}
      </h2>
      {programme.code === "grossesse" && (
        <p className="-mt-1.5 text-sm text-gris">
          {semainesDeGrossesse(programme.dateReference, aujourdhui)} semaines · terme prévu le {dateLongue(termePrevu(programme.dateReference))}
        </p>
      )}
      {prochaine && <Prochaine etape={prochaine} patientId={patientId} />}
      <ol className="rounded-carte bg-white px-3.5 py-1">
        {programme.etapes.map((etape, index) => (
          <EtapeFrise key={etape.code} etape={etape} rang={index} prochaine={etape === prochaine} patientId={patientId} aujourdhui={aujourdhui} />
        ))}
      </ol>
    </section>
  );
}

function Prochaine({ etape, patientId }: { etape: EtapeDuCarnet; patientId: string }) {
  return (
    <div className="rounded-carte bg-white p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <small className="text-xs text-gris">Prochaine étape</small>
          <b className="block">{etape.libelle}</b>
          {etape.details && <small className="text-xs text-gris">{etape.details}</small>}
        </div>
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-lavande-2 text-marque">
          <Icone nom={ICONE_MOTIF[etape.motif]} className="size-6" />
        </span>
      </div>
      {etape.reservation ? (
        <span className="mt-2.5 inline-flex items-center gap-1.5 rounded-xl bg-lavande-2 px-2.5 py-1.5 text-xs font-bold text-marque">
          <Icone nom="ph-check-circle" className="size-4" />
          Place réservée : {dateLongue(etape.reservation.date)}
          {etape.reservation.moment ? `, ${LIBELLE_MOMENT_RDV[etape.reservation.moment]}` : ""}
        </span>
      ) : (
        <Link href={lienReserver(patientId, etape)} className="mt-2.5 inline-flex items-center gap-1.5 rounded-xl bg-marque px-3 py-2 text-sm font-bold text-white">
          <Icone nom="ph-calendar-dots" className="size-4" />
          Choisir le jour
        </Link>
      )}
    </div>
  );
}

function EtapeFrise({
  etape,
  rang,
  prochaine,
  patientId,
  aujourdhui,
}: {
  etape: EtapeDuCarnet;
  rang: number;
  prochaine: boolean;
  patientId: string;
  aujourdhui: DateISO;
}) {
  const date = etape.reservation?.date ?? etape.datePrevue;
  return (
    <li className="grid grid-cols-[40px_1fr_auto] items-center gap-2.5 border-b border-lavande-2 py-2 last:border-0">
      {etape.statut === "faite" ? (
        <Tampon rang={rang} libelle="Fait" className="size-9" />
      ) : etape.statut === "manquee" ? (
        <span className="grid size-[34px] place-items-center rounded-full bg-lavande-2 text-gris">
          <Icone nom="ph-warning-circle" className="size-5" titre="Manqué" />
        </span>
      ) : (
        <span
          aria-hidden="true"
          className={`size-[34px] rounded-full ${prochaine ? "border-[2.5px] border-dashed border-marque" : "border-2 border-lavande-3"}`}
        />
      )}
      <div className="min-w-0">
        <b className="block text-sm">{etape.libelle}</b>
        <small className="text-xs text-gris">
          {etape.statut === "faite" ? etape.faite?.lieu : etape.statut === "manquee" ? "Manqué : à rattraper" : (etape.details ?? "")}
        </small>
      </div>
      <span className={`text-right text-xs font-bold ${prochaine ? "text-marque" : "text-gris"}`}>
        {etape.statut === "faite" && etape.faite ? (
          dateCourte(aujourdhuiAuBenin(etape.faite.le))
        ) : etape.statut === "manquee" ? (
          <Link href={lienReserver(patientId, etape)} className="text-marque underline">
            Choisir un jour
          </Link>
        ) : prochaine ? (
          majuscule(libelleDansJours(joursEntre(aujourdhui, date)))
        ) : (
          moisEtAnnee(date)
        )}
      </span>
    </li>
  );
}
```

- [ ] **Étape 2 : écrire la page du carnet**

Créer `src/app/(patient)/(onglets)/carnet/page.tsx` :

```tsx
import { dateLongue, LIBELLE_MOMENT_POSOLOGIE } from "@/domain/temps";
import type { TraitementEnCours } from "@/domain/traitements";
import { db } from "@/server/db/client";
import { traitementsDes } from "@/server/requetes/accueil";
import { programmesDuCarnet } from "@/server/requetes/carnet";
import { iconePourPersonne } from "@/ui/avatar";
import { AvatarsFamille } from "@/ui/AvatarsFamille";
import { BoutonEcouter } from "@/ui/BoutonEcouter";
import { Icone } from "@/ui/Icone";
import { Ondes } from "@/ui/Ondes";
import { ICONE_MOMENT } from "@/ui/pictogrammes";
import { contextePatient } from "../../contexte";
import { SectionProgramme } from "./Frise";

export default async function MonCarnet({ searchParams }: PageProps<"/carnet">) {
  const params = await searchParams;
  const { aujourdhui, carnets, carnet } = await contextePatient(params.pour);
  if (!carnet) return <p className="rounded-carte bg-white p-4">Aucun carnet pour ce compte.</p>;
  const [programmes, traitements] = await Promise.all([
    programmesDuCarnet(db(), carnet.patientId, aujourdhui),
    traitementsDes(db(), [carnet.patientId], aujourdhui),
  ]);
  const suivis = programmes.filter((p) => p.etapes.length > 0);
  const sousTitre = suivis.length ? suivis.map((p) => p.nom).join(" · ") : "Carnet de santé";
  const faites = suivis.flatMap((p) => p.etapes).filter((e) => e.statut === "faite").length;
  const resume = `Carnet de ${carnet.prenom}, ${carnet.libelleAge}. ${sousTitre}. ${faites} étape${faites > 1 ? "s" : ""} faite${faites > 1 ? "s" : ""}. ${
    traitements.length ? `${traitements.length} médicament${traitements.length > 1 ? "s" : ""} en cours.` : ""
  }`;

  return (
    <>
      <AvatarsFamille personnes={carnets} actif={carnet.patientId} lien={(id) => `/carnet?pour=${id}`} />
      <header className="relative overflow-hidden rounded-grande bg-marque p-4 text-white">
        <Ondes className="-top-8 -right-14 size-52 text-white opacity-10" />
        <div className="relative flex items-center gap-3">
          <span className="grid size-13 shrink-0 place-items-center rounded-[18px] bg-white text-marque">
            <Icone nom={iconePourPersonne(carnet.sexe, carnet.age)} className="size-9" />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl leading-tight font-bold">
              {carnet.prenom}, {carnet.libelleAge}
            </h1>
            <p className="text-sm text-lavande-3">{sousTitre}</p>
          </div>
          <BoutonEcouter variante="rond" libelle="Écouter le carnet" texte={resume} />
        </div>
      </header>
      {suivis.map((p) => (
        <SectionProgramme key={p.code} programme={p} patientId={carnet.patientId} aujourdhui={aujourdhui} />
      ))}
      {traitements.length > 0 && <Medicaments traitements={traitements} soi={carnet.lien === "soi"} />}
      {suivis.length === 0 && traitements.length === 0 && (
        <p className="rounded-carte bg-white p-4 text-gris">Rien à suivre pour le moment. Les consultations se prennent à la demande.</p>
      )}
    </>
  );
}

function Medicaments({ traitements, soi }: { traitements: TraitementEnCours[]; soi: boolean }) {
  return (
    <section aria-labelledby="medicaments" className="flex flex-col gap-2.5">
      <h2 id="medicaments" className="text-lg font-bold">
        {soi ? "Mes médicaments" : "Ses médicaments"}
      </h2>
      <ul className="flex flex-col gap-2">
        {traitements.map((t) => (
          <li key={t.cle} className="rounded-carte bg-white p-3.5">
            <div className="flex items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-lavande-2 text-marque">
                <Icone nom="ph-pill" className="size-6" />
              </span>
              <div className="min-w-0 flex-1">
                <b className="block">{t.medicament}</b>
                <small className="text-xs text-gris">
                  {t.indication ? `Pour ${t.indication} · ` : ""}jusqu'au {dateLongue(t.dernierJour)}
                </small>
              </div>
            </div>
            <ul aria-label="Quand le prendre" className="mt-3 flex flex-wrap gap-2">
              {t.prises.map((p) => (
                <li key={p.moment} className="flex items-center gap-1.5 rounded-xl bg-soleil-pale px-2.5 py-1.5 text-sm font-bold">
                  <Icone nom={ICONE_MOMENT[p.moment]} className="size-5 text-soleil-appuye" />
                  {LIBELLE_MOMENT_POSOLOGIE[p.moment]} : {p.quantite} comprimé{p.quantite > 1 ? "s" : ""}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

- [ ] **Étape 3 : écrire les pages des rendez-vous et de la famille**

Créer `src/app/(patient)/(onglets)/rendez-vous/page.tsx` :

```tsx
import Link from "next/link";
import { joursEntre } from "@/domain/dates";
import { LIBELLES_MOTIF } from "@/domain/rendez-vous";
import { dateLongue, LIBELLE_MOMENT_RDV, libelleDansJours, majuscule, nombreDeSoleils } from "@/domain/temps";
import { db } from "@/server/db/client";
import { listeAttenteDe, rendezVousVus } from "@/server/requetes/rendez-vous";
import { Icone } from "@/ui/Icone";
import { ICONE_MOTIF } from "@/ui/pictogrammes";
import { contextePatient } from "../../contexte";

export default async function MesRendezVous() {
  const { aujourdhui, carnets } = await contextePatient();
  const ids = carnets.map((c) => c.patientId);
  const [rendezVous, attentes] = await Promise.all([rendezVousVus(db(), ids, aujourdhui), listeAttenteDe(db(), ids)]);
  const aVenir = rendezVous.filter((r) => !r.faite).slice(0, 8);
  const prenom = (patientId: string) => carnets.find((c) => c.patientId === patientId)?.prenom ?? "";

  return (
    <>
      <h1 className="text-[1.65rem] leading-tight font-bold">Rendez-vous</h1>
      <Link href="/prendre-rendez-vous" className="flex h-14 items-center justify-center gap-2 rounded-bouton bg-marque text-lg font-bold text-white">
        <Icone nom="ph-plus" className="size-6" />
        Prendre un rendez-vous
      </Link>
      <section aria-labelledby="a-venir" className="flex flex-col gap-2.5">
        <h2 id="a-venir" className="text-lg font-bold">
          À venir
        </h2>
        {aVenir.length === 0 ? (
          <p className="rounded-carte bg-white p-4 text-gris">Aucun rendez-vous prévu.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {aVenir.map((r) => {
              const dans = joursEntre(aujourdhui, r.datePrevue);
              return (
                <li key={r.id} className="rounded-carte bg-white p-3.5">
                  <div className="flex items-center gap-3">
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-lavande-2 text-marque">
                      <Icone nom={ICONE_MOTIF[r.motif]} className="size-7" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <b className="block">{r.libelle}</b>
                      <small className="text-sm text-gris">
                        {prenom(r.patientId)} · {majuscule(dateLongue(r.datePrevue))}
                        {r.moment ? `, ${LIBELLE_MOMENT_RDV[r.moment]}` : ""}
                      </small>
                    </div>
                  </div>
                  <div className="mt-2.5 flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1 text-sm text-gris">
                      {Array.from({ length: nombreDeSoleils(dans) }, (_, i) => (
                        <Icone key={i} nom="ph-sun" className="size-4 text-soleil-appuye" />
                      ))}
                      {libelleDansJours(dans)}
                    </span>
                    {r.reserve ? (
                      <span className="rounded-lg bg-lavande-2 px-2 py-1 text-xs font-bold text-marque">Place réservée</span>
                    ) : (
                      <Link href={`/prendre-rendez-vous?pour=${r.patientId}&motif=${r.motif}`} className="rounded-lg bg-marque px-3 py-1.5 text-sm font-bold text-white">
                        Choisir le jour
                      </Link>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      {attentes.length > 0 && (
        <section aria-labelledby="attente" className="flex flex-col gap-2.5">
          <h2 id="attente" className="text-lg font-bold">
            Liste d'attente
          </h2>
          <ul className="flex flex-col gap-2">
            {attentes.map((a) => (
              <li key={a.id} className="flex items-center gap-3 rounded-carte bg-white p-3.5">
                <Icone nom="ph-hourglass-medium" className="size-7 shrink-0 text-marque" />
                <p className="text-sm">
                  <b>
                    {LIBELLES_MOTIF[a.motif]} pour {prenom(a.patientId)}
                  </b>
                  <br />
                  {majuscule(dateLongue(a.dateSouhaitee))}, {LIBELLE_MOMENT_RDV[a.moment]} : on vous prévient si une place se libère.
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
```

Créer `src/app/(patient)/(onglets)/famille/page.tsx` :

```tsx
import Link from "next/link";
import { seDeconnecter } from "@/app/actions-session";
import { iconePourPersonne, libelleLien } from "@/ui/avatar";
import { Icone } from "@/ui/Icone";
import { contextePatient } from "../../contexte";

export default async function Famille() {
  const { compte, carnets } = await contextePatient();
  return (
    <>
      <h1 className="text-[1.65rem] leading-tight font-bold">Ma famille</h1>
      <p className="-mt-2 text-gris">Les carnets suivis sur ce téléphone.</p>
      <ul className="flex flex-col gap-2.5">
        {carnets.map((c) => (
          <li key={c.patientId}>
            <Link href={`/carnet?pour=${c.patientId}`} className="flex items-center gap-3 rounded-carte bg-white p-3">
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-lavande-2 text-marque">
                <Icone nom={iconePourPersonne(c.sexe, c.age)} className="size-8" />
              </span>
              <span className="flex-1">
                <b className="block text-lg">
                  {c.prenom} {c.nom}
                </b>
                <span className="text-sm text-gris">
                  {libelleLien(c.lien, c.sexe)}, {c.libelleAge}
                </span>
              </span>
              <Icone nom="ph-caret-right" className="size-5 text-gris" />
            </Link>
          </li>
        ))}
      </ul>
      <form action={seDeconnecter} className="mt-auto">
        <button className="flex w-full items-center justify-center gap-2 rounded-bouton bg-white py-3.5 font-bold text-marque">
          <Icone nom="ph-sign-out" className="size-5" />
          Se déconnecter
        </button>
      </form>
      <p className="text-center text-xs text-gris">Compte : {compte.nomAffiche}</p>
    </>
  );
}
```

- [ ] **Étape 4 : vérifier le style, les types, les tests et les écrans**

```bash
set -o pipefail
pnpm lint && pnpm typecheck && pnpm test
cd "$S/fonts" && node ecrans.mjs "Codjo Houngbo" /carnet "/carnet?pour=<Sèna>" /rendez-vous /famille
```

Regarder : carnet de Sèna avec 4 tampons « VU » inclinés, « Prochaine étape : Vaccins des 9 mois », 9 mois en cercle pointillé « Dans 2 jours », 15 mois vide (« mars 2027 ») ; carnet de Codjo avec son contrôle réservé et « Le soir : 1 comprimé » ; rendez-vous avec soleils et « Place réservée » ; famille avec « Se déconnecter ».

- [ ] **Étape 5 : commit**

```bash
git add "src/app/(patient)/(onglets)"
git commit -m "feat(patient): carnet avec tampons VU, rendez-vous à venir et famille"
```

---

### Tâche 15 : « J'ai un problème »

**Fichiers :**
- Créer : `src/app/(patient)/probleme/page.tsx`, `src/app/(patient)/probleme/loading.tsx`, `src/app/(patient)/probleme/FormulaireSignalement.tsx`
- Modifier : `src/app/(patient)/actions.ts`

**Interfaces :**
- Consomme : `signalerDanger`, `annulerAlerte` (tâche 8) ; `etablissementDuPatient` (tâche 7) ; `texteContenu` (tâche 10) ; `signesProposes`, `LIBELLES_SIGNES`, `CONSEIL_URGENCE`, `CODES_SIGNES` (tâche 3) ; `normaliserTelephone`, `formaterTelephone` ; `ICONE_SIGNE`, `RetourAction`, `BoutonEcouter`, `AvatarsFamille` (tâche 11).
- Produit :
  - `type ReponseSignalement = { ok: true; alerteId: string; recueLe: string; centre: string } | { ok: false; message: string }` ; `signalerAction({ evenementId, patientId, signe }): Promise<ReponseSignalement>` ;
  - `annulerAlerteAction(formulaire)` (champs `alerteId`, `pour`) → `/?note=alerte_annulee` ou `/?note=alerte_deja_prise` ;
  - la page `/probleme?pour=`.

Comportement attendu (spec §4.7 et §10.3) : toucher un signe envoie l'alerte tout de suite. Sans réseau, l'écran dit « L'alerte n'est pas encore partie » et affiche tout de suite le numéro du centre et le conseil. L'action reste en attente et repart seule au retour du réseau (`experimental.useOffline`). « Le centre a reçu votre alerte » n'apparaît qu'après la réponse du serveur. L'identifiant du signalement est créé sur le téléphone : un nouvel essai ne crée pas de deuxième alerte.

À lire avant : `node_modules/next/dist/docs/01-app/02-guides/offline-support.md` (section « Retry Server Actions after the network returns »).

- [ ] **Étape 1 : ajouter les actions**

Dans `src/app/(patient)/actions.ts`, compléter les imports :

```ts
import { CODES_SIGNES } from "@/domain/signes-danger";
import { annulerAlerte, signalerDanger } from "@/server/patient/signalement";
```

et ajouter à la fin :

```ts
const champsSignalement = z.object({ evenementId: z.uuid(), patientId: z.uuid(), signe: z.enum(CODES_SIGNES) });

export type ReponseSignalement = { ok: true; alerteId: string; recueLe: string; centre: string } | { ok: false; message: string };

/** Appelée depuis le téléphone avec un identifiant créé sur place : un nouvel essai ne double pas l'alerte. */
export async function signalerAction(entree: z.input<typeof champsSignalement>): Promise<ReponseSignalement> {
  const compte = await exigerRole("patient");
  const saisie = champsSignalement.safeParse(entree);
  if (!saisie.success) return { ok: false, message: "Choisissez ce qui ne va pas." };
  const resultat = await signalerDanger(db(), {
    compteId: compte.id,
    patientId: saisie.data.patientId,
    evenementId: saisie.data.evenementId,
    signes: [saisie.data.signe],
  });
  if (!resultat.ok) return { ok: false, message: "L'alerte n'a pas pu partir. Appelez le centre de santé." };
  return { ok: true, alerteId: resultat.donnees.alerteId, recueLe: resultat.donnees.recueLe.toISOString(), centre: resultat.donnees.etablissement.nom };
}

export async function annulerAlerteAction(formulaire: FormData): Promise<void> {
  const compte = await exigerRole("patient");
  const saisie = z.object({ alerteId: z.uuid(), pour: z.string().max(40).optional() }).safeParse(Object.fromEntries(formulaire));
  if (!saisie.success) redirect("/");
  const resultat = await annulerAlerte(db(), { compteId: compte.id, alerteId: saisie.data.alerteId });
  const note = resultat.ok ? "alerte_annulee" : resultat.erreur === "deja_prise_en_charge" ? "alerte_deja_prise" : null;
  redirect(`/?${new URLSearchParams({ ...(saisie.data.pour ? { pour: saisie.data.pour } : {}), ...(note ? { note } : {}) })}`);
}
```

- [ ] **Étape 2 : écrire le formulaire (client)**

Créer `src/app/(patient)/probleme/FormulaireSignalement.tsx` :

```tsx
"use client";

import { useOffline } from "next/offline";
import { useRef, useState, useTransition } from "react";
import type { CodeSigne } from "@/domain/signes-danger";
import { formaterTelephone, normaliserTelephone } from "@/domain/telephone";
import { BoutonEcouter } from "@/ui/BoutonEcouter";
import { Icone } from "@/ui/Icone";
import { ICONE_SIGNE } from "@/ui/pictogrammes";
import { RetourAction } from "@/ui/RetourAction";
import { annulerAlerteAction, signalerAction } from "../actions";

type Etat =
  | { etape: "choix" }
  | { etape: "envoi" }
  | { etape: "recu"; alerteId: string; recueLe: string; centre: string }
  | { etape: "erreur"; message: string };

interface Props {
  patientId: string;
  /** Prénom de la personne quand ce n'est pas le titulaire du compte. */
  prenom: string | null;
  signes: { code: CodeSigne; libelle: string }[];
  centre: { nom: string; telephone: string | null };
  conseil: string;
}

const heureLocale = (iso: string) =>
  new Intl.DateTimeFormat("fr-FR", { hour: "numeric", minute: "2-digit", timeZone: "Africa/Porto-Novo" }).format(new Date(iso)).replace(":", " h ");

export function FormulaireSignalement({ patientId, prenom, signes, centre, conseil }: Props) {
  const [etat, setEtat] = useState<Etat>({ etape: "choix" });
  const [, demarrer] = useTransition();
  const horsLigne = useOffline();
  const identifiant = useRef<string | null>(null);
  const question = prenom ? `Qu'est-ce qui ne va pas pour ${prenom} ?` : "Qu'est-ce qui ne va pas ?";

  function envoyer(signe: CodeSigne) {
    identifiant.current ??= crypto.randomUUID();
    const evenementId = identifiant.current;
    setEtat({ etape: "envoi" });
    demarrer(async () => {
      const reponse = await signalerAction({ evenementId, patientId, signe });
      setEtat(reponse.ok ? { etape: "recu", alerteId: reponse.alerteId, recueLe: reponse.recueLe, centre: reponse.centre } : { etape: "erreur", message: reponse.message });
    });
  }

  if (etat.etape === "choix") {
    return (
      <>
        <div className="flex items-start gap-3">
          <h1 className="flex-1 text-[1.45rem] leading-tight font-bold">
            {question}
            <small className="mt-1 block text-sm font-normal text-gris">Touchez une image : l'alerte part tout de suite au centre de santé.</small>
          </h1>
          <BoutonEcouter
            variante="rond"
            libelle="Écouter"
            texte={`${question} ${signes.map((s) => s.libelle).join(", ")}. L'alerte part tout de suite au centre de santé.`}
          />
        </div>
        <ul className="grid grid-cols-2 gap-2.5">
          {signes.map((s) => (
            <li key={s.code}>
              <button type="button" onClick={() => envoyer(s.code)} className="flex h-24 w-full flex-col justify-between rounded-carte bg-white p-3 text-left font-bold">
                <Icone nom={ICONE_SIGNE[s.code]} className="size-9 text-urgence" />
                {s.libelle}
              </button>
            </li>
          ))}
        </ul>
        <Appeler centre={centre} discret />
      </>
    );
  }

  if (etat.etape === "envoi") {
    return horsLigne ? (
      <>
        <section role="alert" className="flex flex-col gap-3 rounded-grande bg-urgence-pale p-5">
          <Icone nom="ph-wifi-slash" className="size-9 text-urgence" />
          <h1 className="text-xl font-bold text-urgence">L'alerte n'est pas encore partie</h1>
          <p>Il n'y a pas de réseau. Elle partira toute seule dès que le réseau revient. N'attendez pas :</p>
          <p className="font-bold">{conseil}</p>
          <BoutonEcouter libelle="Écouter le conseil" texte={`L'alerte n'est pas encore partie. ${conseil}`} />
        </section>
        <Appeler centre={centre} />
      </>
    ) : (
      <>
        <p role="status" className="rounded-grande bg-white p-5 text-lg font-bold">
          Envoi de l'alerte au {centre.nom}…
        </p>
        <Appeler centre={centre} discret />
      </>
    );
  }

  if (etat.etape === "recu") {
    return (
      <>
        <RetourAction message="Le centre a reçu votre alerte" />
        <section className="flex flex-col gap-2 rounded-grande bg-white p-5">
          <h1 className="text-xl font-bold">Alerte reçue à {heureLocale(etat.recueLe)}</h1>
          <p>Le {etat.centre} a reçu l'alerte. Un soignant va s'en occuper.</p>
          <p className="font-bold">{conseil}</p>
          <BoutonEcouter libelle="Écouter" texte={`Le centre a reçu votre alerte. Un soignant va s'en occuper. ${conseil}`} />
        </section>
        <Appeler centre={centre} />
        <form action={annulerAlerteAction}>
          <input type="hidden" name="alerteId" value={etat.alerteId} />
          <button className="w-full py-3 font-bold text-gris underline">Je me suis trompé : annuler l'alerte</button>
        </form>
      </>
    );
  }

  return (
    <>
      <p role="alert" className="rounded-grande bg-urgence-pale p-5 font-bold text-urgence">
        {etat.message}
      </p>
      <Appeler centre={centre} />
      <button type="button" onClick={() => setEtat({ etape: "choix" })} className="py-3 font-bold text-marque underline">
        Réessayer
      </button>
    </>
  );
}

function Appeler({ centre, discret = false }: { centre: Props["centre"]; discret?: boolean }) {
  const numero = centre.telephone ? normaliserTelephone(centre.telephone) : null;
  if (!numero) return null;
  return (
    <a
      href={`tel:${numero}`}
      className={`flex h-14 items-center justify-center gap-2 rounded-bouton text-lg font-bold ${discret ? "bg-white text-urgence" : "bg-urgence text-white"}`}
    >
      <Icone nom="ph-phone" className="size-6" />
      Appeler le centre : {formaterTelephone(numero)}
    </a>
  );
}
```

- [ ] **Étape 3 : écrire la page et l'écran de chargement**

Créer `src/app/(patient)/probleme/page.tsx` :

```tsx
import Link from "next/link";
import { CONSEIL_URGENCE, LIBELLES_SIGNES, signesProposes } from "@/domain/signes-danger";
import { db } from "@/server/db/client";
import { etablissementDuPatient } from "@/server/requetes/carnets";
import { texteContenu } from "@/server/requetes/contenus";
import { AvatarsFamille } from "@/ui/AvatarsFamille";
import { Icone } from "@/ui/Icone";
import { contextePatient } from "../contexte";
import { FormulaireSignalement } from "./FormulaireSignalement";

export default async function Probleme({ searchParams }: PageProps<"/probleme">) {
  const params = await searchParams;
  const { carnets, carnet } = await contextePatient(params.pour);
  if (!carnet) return <main className="px-4 pt-5">Aucun carnet pour ce compte.</main>;
  const [centre, conseil] = await Promise.all([etablissementDuPatient(db(), carnet.patientId), texteContenu(db(), "danger_conseil")]);
  const signes = signesProposes({ enceinte: carnet.programmes.includes("grossesse"), age: carnet.age });

  return (
    <main className="flex flex-1 flex-col gap-4 px-4 pt-5 pb-6">
      <div className="flex items-start gap-3">
        <AvatarsFamille personnes={carnets} actif={carnet.patientId} lien={(id) => `/probleme?pour=${id}`} />
        <Link href="/" aria-label="Fermer" className="ml-auto grid size-10 shrink-0 place-items-center rounded-full bg-white">
          <Icone nom="ph-x" className="size-5" />
        </Link>
      </div>
      <FormulaireSignalement
        key={carnet.patientId}
        patientId={carnet.patientId}
        prenom={carnet.lien === "soi" ? null : carnet.prenom}
        signes={signes.map((code) => ({ code, libelle: LIBELLES_SIGNES[code] }))}
        centre={{ nom: centre?.nom ?? "centre de santé", telephone: centre?.telephone ?? null }}
        conseil={conseil ?? CONSEIL_URGENCE}
      />
    </main>
  );
}
```

Créer `src/app/(patient)/probleme/loading.tsx` :

```tsx
"use client";

import { useOffline } from "next/offline";
import { CONSEIL_URGENCE } from "@/domain/signes-danger";

/** Ouverture de « J'ai un problème » sans réseau : le conseil d'urgence s'affiche quand même. */
export default function Chargement() {
  const horsLigne = useOffline();
  return (
    <main className="flex flex-1 flex-col gap-4 px-4 pt-5">
      {horsLigne ? (
        <section role="alert" className="flex flex-col gap-3 rounded-grande bg-urgence-pale p-5">
          <h1 className="text-xl font-bold text-urgence">Pas de réseau : l'alerte ne peut pas partir</h1>
          <p className="font-bold">{CONSEIL_URGENCE}</p>
        </section>
      ) : (
        <p role="status" className="text-gris">
          Ouverture…
        </p>
      )}
    </main>
  );
}
```

- [ ] **Étape 4 : vérifier le style, les types, les tests et le parcours**

```bash
set -o pipefail
pnpm lint && pnpm typecheck && pnpm test
```

Dans le navigateur (compte d'Awa) : `/probleme` affiche les 8 pictogrammes de la grossesse ; toucher « Saignement » affiche « Le centre a reçu votre alerte » avec l'heure et le numéro du centre. Couper le réseau du navigateur (puppeteer : `page.setOfflineMode(true)`) avant de toucher un signe : l'écran dit « L'alerte n'est pas encore partie ». Rétablir le réseau : « Le centre a reçu votre alerte » apparaît, et la base ne contient qu'une alerte.

- [ ] **Étape 5 : commit**

```bash
git add "src/app/(patient)"
git commit -m "feat(patient): « J'ai un problème » avec alerte au centre, même sans réseau"
```

---

### Tâche 16 : vérification complète, README et mise en ligne

**Fichiers :**
- Modifier : `README.md`

- [ ] **Étape 1 : tout vérifier**

```bash
set -o pipefail
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

Expected : aucune erreur ; tous les tests au vert ; le build liste `/`, `/carnet`, `/famille`, `/prendre-rendez-vous`, `/probleme`, `/rendez-vous`.

- [ ] **Étape 2 : mettre à jour le README**

Dans `README.md`, ajouter après la présentation une section :

```markdown
## Espace patient

- **Accueil « une chose à la fois »** : une grande carte dit ce qu'il faut faire maintenant (le comprimé du soir, le vaccin de Sèna, le contrôle de jeudi), avec « Écouter », « C'est fait » et « Plus tard ». Le dernier mot compte : « Annuler » remet la prise à faire.
- **Carnet familial** : un même téléphone suit les carnets de toute la famille ; les avatars changent de carnet d'un geste.
- **Prendre rendez-vous en 4 étapes** : pour qui, pour quoi, quel jour (les soleils disent dans combien de jours, avec les places restantes), puis confirmation. Un jour complet propose la liste d'attente. Deux personnes qui visent la dernière place : une seule l'obtient.
- **Carnet** : chaque vaccin ou consultation fait porte son tampon « VU », comme sur le carnet papier ; les médicaments en cours sont dessinés par moment de la journée.
- **J'ai un problème** : les signes de danger en images (ceux de la grossesse pour une femme enceinte). L'alerte part au centre avec 15 minutes pour la prendre en charge. Sans réseau, l'écran dit que l'alerte n'est pas encore partie, donne le numéro du centre, et l'envoi repart seul au retour du réseau, sans doublon.
```

- [ ] **Étape 3 : pousser et déployer**

```bash
git add README.md
git commit -m "docs: l'espace patient dans le README"
git push origin main
```

Si Coolify ne déploie pas seul à l'envoi, lancer `node deployer.mjs` (dossier de travail de la session, POST `/deploy` de l'API Coolify) et attendre `finished`.

- [ ] **Étape 4 : remplir la démo en production et vérifier**

Réinitialiser la démo (POST `/api/demo/reinitialiser` avec `Authorization: Bearer <MONCARNET_CRON_SECRET>`, lu dans `.env` sans l'afficher). Puis `SITE=https://moncarnet.kheios.com node ecrans.mjs "Codjo Houngbo" / /carnet /rendez-vous /prendre-rendez-vous` et `… "Awa Hounkpatin" /probleme`. Vérifier les écrans et l'absence d'erreur dans la console.

- [ ] **Étape 5 : arrêter la base locale de vérification**

```bash
"H:/Postgres/bin/pg_ctl.exe" -D "$S/pgdata" stop
```
