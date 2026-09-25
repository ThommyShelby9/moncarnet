# Plan 1 : fondations — plan d'implémentation

> **Pour les agents :** sous-skill requis : superpowers:subagent-driven-development (recommandé) ou superpowers:executing-plans, pour exécuter ce plan tâche par tâche. Les étapes utilisent des cases à cocher (`- [ ]`) pour le suivi.

**Objectif :** livrer un socle déployable. Projet Next.js configuré, charte graphique et composants de base, cœur métier testé (programmes de suivi, calendriers, risques), base de données et migrations, connexion (patients par téléphone et code, personnel par identifiant), données de démonstration, espaces protégés par rôle, image Docker, vérifications automatiques GitHub et procédure Coolify.

**Architecture :** Next.js (App Router) en rendu serveur. Toute la logique métier est dans `src/domain/`, en TypeScript pur et testé. L'accès aux données est dans `src/server/` (Drizzle + Postgres). Les composants de la charte sont dans `src/ui/`. En développement : Postgres local. En tests : PGlite en mémoire. En production : Postgres sur Coolify, avec migrations appliquées au démarrage.

**Stack :** Node 22, pnpm 11.1.2, Next.js 16.3.6, React 19, TypeScript strict, Tailwind CSS 4.3, Drizzle ORM 0.45.3 + drizzle-kit 0.31.11, postgres (postgres.js) 3.4.9, PGlite 0.5.8 (tests), Zod 4.6.5, Vitest 5.0.2, Testing Library React 16.3.3, tsx.

**Spec :** [`docs/superpowers/specs/2026-09-25-esante-benin-design.md`](../specs/2026-09-25-esante-benin-design.md). Recherche : [`docs/recherche/`](../../recherche/). Maquettes : [`docs/design/maquettes-validees.html`](../../design/maquettes-validees.html).

## Feuille de route (plans suivants, rédigés juste avant leur exécution)

| Plan | Contenu |
|---|---|
| 1 (ce plan) | Fondations : projet, charte, domaine, base, connexion, démo, déploiement |
| 2 | Espace patient : cartes du jour « une chose à la fois », écoute, prise de rendez-vous en 4 étapes avec places, carnet de vaccination, « J'ai un problème » |
| 3 | Poste soignant et pharmacie : « Aujourd'hui », consultation, risque, ordonnance, alertes avec délai, délivrance, posologie dessinée |
| 4 | Relais hors-ligne : tournée par foyer, file d'envoi, `/api/sync`, inscription d'une personne |
| 5 | Canaux : rappels et cascade, faux téléphone, puis WhatsApp réel |
| 6 | Salle d'attente, liste d'attente, pilotage, gestion des contenus et audio, audit d'accessibilité, README final |

## Contraintes globales

- Node **22**, pnpm **11.1.2** (champ `packageManager`), Next.js **16.3.6**, TypeScript en mode `strict`.
- **Pas de Docker ni de PGlite en production** : Docker sert uniquement à l'image de production ; PGlite sert uniquement aux tests.
- Développement : Postgres local (`H:\Postgres`, port 5432), base `sante`, URL dans `.env.local` (jamais commitée).
- Le **nom de la plateforme n'est jamais écrit en dur** : il vient de `NEXT_PUBLIC_APP_NAME` (« Gbè » par défaut, provisoire). L'adresse vient de `APP_URL` (`<nom>.kheios.com` en production).
- Police **Fira Sans auto-hébergée** (`next/font/local`), jamais `next/font/google` (les tons du fon s'y affichent mal).
- Couleurs uniquement par les variables de thème : `marque` `#3B3AD9`, `marque-appuye` `#2B2AB0`, `nuit` `#16154A`, `lavande` `#F3F3FE`, `lavande-2` `#E8E8FC`, `lavande-3` `#D6D6F6`, `soleil` `#FFC21A`, `soleil-pale` `#FFF2CC`, `soleil-appuye` `#E09F00`, `urgence` `#D92D20`, `urgence-pale` `#FDECEA`, `gris` `#5D5C7A`. Le soleil sert uniquement à écouter, parler et aux moments du jour ; le rouge uniquement à l'urgence.
- Pictogrammes : Health Icons (CC0) et Phosphor (MIT), toujours accompagnés d'un mot.
- Textes d'interface en **français simple**, phrases courtes, casse de phrase, sans jargon.
- Dates métier au format `DateISO` (`"AAAA-MM-JJ"`), calculées en UTC ; « aujourd'hui » se calcule à l'heure du Bénin (UTC+1).
- Téléphones stockés au format `+22901XXXXXXXX` (10 chiffres depuis le 30/11/2024).
- Données **fictives** uniquement.
- Identifiants de code en français (`patients`, `rendezVous`, `evaluerRisque`), comme dans la spec.

## Points de vigilance à l'usage

Ces cas découlent de la spec sans être au cœur des tests principaux. Chacun a son test dans la tâche indiquée.

1. **Grossesse inscrite tard**, après la fenêtre d'une ou plusieurs consultations : les étapes passées ne sont pas générées, l'étape en cours est planifiée à l'inscription + 7 jours (tâche 6).
2. **Code faux 5 fois puis bon code pendant le verrouillage** : refusé ; 16 minutes plus tard, accepté (tâche 10).
3. **Relevés de tension saisis dans le désordre** : le risque se calcule sur le relevé le plus récent par date, pas par ordre de saisie (tâche 7).
4. **Réinitialiser la démo deux fois de suite** : aucune erreur, mêmes effectifs (tâche 11).
5. **Session expirée (plus de 30 jours) ou jeton inconnu** : traité comme déconnecté, sans erreur (tâche 10).

---

## Structure des fichiers

```
.env.example                      variables d'environnement documentées
.github/workflows/ci.yml          vérifications automatiques
Dockerfile, .dockerignore         image de production
drizzle.config.ts                 configuration drizzle-kit
drizzle/                          migrations SQL générées
next.config.ts                    sortie standalone
vitest.config.ts                  configuration des tests
docs/deploiement.md               procédure Coolify
scripts/
  construire-sprite.mjs           assemble les icônes en sprite SVG
  seed.ts                         remplit la base de développement
public/icons/sprite.svg           sprite généré
src/
  instrumentation.ts              migrations au démarrage du serveur
  config/env.ts                   lecture et validation de l'environnement
  domain/                         logique métier pure (aucune dépendance à Next ni à la base)
    dates.ts                      DateISO, ajout de jours, âges
    telephone.ts                  normalisation des numéros béninois
    calendrier.ts                 planification des étapes d'un programme
    risque.ts                     règles de risque par programme
    statuts.ts                    statut d'une étape (faite, à venir, manquée)
    evenements.ts                 schémas Zod des événements du journal
    programmes/                   types.ts, grossesse.ts, vaccination.ts, controles.ts, index.ts
  server/
    db/schema.ts                  schéma Drizzle
    db/client.ts                  connexion Postgres (dev et prod) et migrations
    db/test-utils.ts              base PGlite en mémoire pour les tests
    auth/mots-de-passe.ts         empreintes scrypt
    auth/sessions.ts              création et lecture des sessions
    auth/connexion.ts             vérification des identifiants et verrouillage
    auth/cookies.ts               cookie de session (Next.js)
    droits.ts                     rôles et espace d'accueil de chaque rôle
    requetes/carnets.ts           carnets de santé gérés par un compte
    demo/donnees.ts               comptes et personnages de démonstration
    demo/semer.ts                 remplissage de la base de démonstration
    demo/autorisation.ts          contrôle de la réinitialisation en production
  ui/
    icones.ts (généré), icones/svg/*.svg, icones/LICENCES.md
    Icone.tsx, Logo.tsx, BoutonEcouter.tsx, EtiquetteRisque.tsx, PaveNumerique.tsx
    avatar.ts                     pictogramme et libellé d'une personne
    EnTete.tsx, EspaceEnPreparation.tsx
  app/
    layout.tsx, globals.css, fonts/fira-400.woff2, fonts/fira-700.woff2
    page.tsx                      accueil patient (provisoire : carnets de la famille)
    actions-session.ts            déconnexion
    connexion/                    page, formulaires, actions, lecture des saisies
    demo/                         comptes de démonstration
    relais/ soignant/ pharmacie/ pilotage/ admin/   espaces protégés (provisoires)
    api/sante/route.ts            état de l'application
    api/demo/reinitialiser/route.ts
```

Les tests sont placés à côté du fichier testé (`*.test.ts`, `*.test.tsx`).

---

### Tâche 1 : créer le projet et l'outillage de test

**Fichiers :**
- Créer (générés) : `package.json`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, `postcss.config.mjs`, `src/app/*`, `next-env.d.ts`
- Créer : `vitest.config.ts`, `src/outillage.test.ts`
- Modifier : `.gitignore`

**Interfaces :**
- Produit : scripts `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build`, `pnpm db:generate`, `pnpm db:seed`, `pnpm icones` ; alias d'import `@/` vers `src/`.

- [ ] **Étape 1 : générer le projet dans un dossier temporaire**

Le dossier du projet contient déjà `docs/`, `.gitignore` et `Sante.pdf`. On génère donc à côté, puis on déplace.

```bash
cd "O:/Projets/santé"
pnpm create next-app@16.3.6 echafaudage --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-pnpm --skip-install --yes
mv .gitignore .gitignore.projet
cp -r echafaudage/. .
rm -rf echafaudage
cat .gitignore.projet >> .gitignore && rm .gitignore.projet
rm -f public/file.svg public/globe.svg public/next.svg public/vercel.svg public/window.svg
printf '\n# Base locale et fichiers d environnement\n.env.local\n' >> .gitignore
npm pkg set name=sante packageManager=pnpm@11.1.2 engines.node=">=22"
```

- [ ] **Étape 2 : installer les dépendances**

```bash
pnpm install
pnpm add drizzle-orm@0.45.3 postgres@3.4.9 zod@4.6.5
pnpm add -D drizzle-kit@0.31.11 @electric-sql/pglite@0.5.8 vitest@5.0.2 @vitejs/plugin-react@6.1.1 @testing-library/react@16.3.3 jsdom tsx
```

- [ ] **Étape 3 : ajouter les scripts**

```bash
npm pkg set scripts.test="vitest run" scripts.test:watch="vitest" scripts.typecheck="tsc --noEmit" scripts.db:generate="drizzle-kit generate" scripts.db:seed="tsx --env-file=.env.local scripts/seed.ts" scripts.icones="node scripts/construire-sprite.mjs"
```

- [ ] **Étape 4 : configurer Vitest**

Créer `vitest.config.ts` :

```ts
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
    testTimeout: 30_000,
  },
});
```

- [ ] **Étape 5 : écrire un premier test qui vérifie l'outillage**

Créer `src/outillage.test.ts` :

```ts
import { describe, expect, it } from "vitest";

describe("outillage", () => {
  it("exécute les tests TypeScript", () => {
    const somme: number = [1, 2, 3].reduce((a, b) => a + b, 0);
    expect(somme).toBe(6);
  });
});
```

- [ ] **Étape 6 : lancer les tests**

Run : `pnpm test`
Expected : `1 passed`.

- [ ] **Étape 7 : configurer Next.js pour la production**

Remplacer `next.config.ts` :

```ts
import type { NextConfig } from "next";

const config: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
};

export default config;
```

- [ ] **Étape 8 : vérifier types, style et construction**

Run : `pnpm typecheck && pnpm lint && pnpm build`
Expected : aucune erreur, `Compiled successfully`.

- [ ] **Étape 9 : commit**

```bash
git add -A
git reset -q Sante.pdf
git commit -m "chore: projet Next.js 16, Tailwind 4 et outillage Vitest"
```

---

### Tâche 2 : lire et valider la configuration

**Fichiers :**
- Créer : `src/config/env.ts`
- Test : `src/config/env.test.ts`

**Interfaces :**
- Produit : `lireEnv(source?: Record<string, string | undefined>): Env` ; `env: Env` ; type `Env = { NODE_ENV; APP_URL: string; NEXT_PUBLIC_APP_NAME: string; DATABASE_URL?: string; CRON_SECRET?: string; DEMO_MODE: boolean; MIGRER_AU_DEMARRAGE: boolean }`.

- [ ] **Étape 1 : écrire le test**

Créer `src/config/env.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { lireEnv } from "./env";

describe("lireEnv", () => {
  it("applique les valeurs par défaut", () => {
    const env = lireEnv({});
    expect(env.NEXT_PUBLIC_APP_NAME).toBe("Gbè");
    expect(env.APP_URL).toBe("http://localhost:3000");
    expect(env.DEMO_MODE).toBe(true);
    expect(env.MIGRER_AU_DEMARRAGE).toBe(true);
    expect(env.DATABASE_URL).toBeUndefined();
  });

  it("lit le nom et l'adresse de la plateforme", () => {
    const env = lireEnv({ NEXT_PUBLIC_APP_NAME: "Nouveau nom", APP_URL: "https://sante.kheios.com" });
    expect(env.NEXT_PUBLIC_APP_NAME).toBe("Nouveau nom");
    expect(env.APP_URL).toBe("https://sante.kheios.com");
  });

  it("convertit les booléens écrits en texte", () => {
    expect(lireEnv({ DEMO_MODE: "false" }).DEMO_MODE).toBe(false);
    expect(lireEnv({ MIGRER_AU_DEMARRAGE: "false" }).MIGRER_AU_DEMARRAGE).toBe(false);
  });

  it("refuse une adresse de base qui n'est pas Postgres", () => {
    expect(() => lireEnv({ DATABASE_URL: "mysql://localhost/sante" })).toThrow(/DATABASE_URL/);
  });

  it("refuse un secret trop court", () => {
    expect(() => lireEnv({ CRON_SECRET: "court" })).toThrow(/CRON_SECRET/);
  });
});
```

- [ ] **Étape 2 : lancer le test pour le voir échouer**

Run : `pnpm vitest run src/config/env.test.ts`
Expected : FAIL, `Cannot find module './env'`.

- [ ] **Étape 3 : écrire le module**

Créer `src/config/env.ts` :

```ts
import { z } from "zod";

const schemaEnv = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.url().default("http://localhost:3000"),
  NEXT_PUBLIC_APP_NAME: z.string().trim().min(1).default("Gbè"),
  DATABASE_URL: z
    .string()
    .regex(/^postgres(ql)?:\/\//, "doit commencer par postgres://")
    .optional(),
  CRON_SECRET: z.string().min(16, "doit contenir au moins 16 caractères").optional(),
  DEMO_MODE: z.stringbool().default(true),
  MIGRER_AU_DEMARRAGE: z.stringbool().default(true),
});

export type Env = z.infer<typeof schemaEnv>;

export function lireEnv(source: Record<string, string | undefined> = process.env): Env {
  const resultat = schemaEnv.safeParse(source);
  if (!resultat.success) {
    const details = resultat.error.issues
      .map((probleme) => `${probleme.path.join(".")} ${probleme.message}`)
      .join(" ; ");
    throw new Error(`Configuration invalide : ${details}`);
  }
  return resultat.data;
}

export const env = lireEnv();
```

- [ ] **Étape 4 : lancer le test**

Run : `pnpm vitest run src/config/env.test.ts`
Expected : `5 passed`.

- [ ] **Étape 5 : documenter les variables**

Créer `.env.example` :

```bash
# Adresse publique de la plateforme (en production : https://<nom>.kheios.com)
APP_URL=http://localhost:3000
# Nom affiché partout (provisoire tant que le nom n'est pas choisi)
NEXT_PUBLIC_APP_NAME=Gbè
# Base Postgres. En local : la base "sante" du Postgres installé sur le poste.
DATABASE_URL=postgres://postgres:MOT_DE_PASSE@localhost:5432/sante
# Secret des tâches planifiées et de la réinitialisation de la démo (openssl rand -hex 32)
CRON_SECRET=
# Active la page des comptes de démonstration
DEMO_MODE=true
# Applique les migrations au démarrage du serveur
MIGRER_AU_DEMARRAGE=true
```

- [ ] **Étape 6 : commit**

```bash
git add src/config .env.example
git commit -m "feat: configuration validée (nom et adresse de la plateforme configurables)"
```

---

### Tâche 3 : charte graphique, police et pictogrammes

**Fichiers :**
- Créer : `src/app/fonts/fira-400.woff2`, `src/app/fonts/fira-700.woff2` (copiés depuis `docs/design/`)
- Remplacer : `src/app/globals.css`, `src/app/layout.tsx`, `src/app/page.tsx`
- Créer : `src/ui/icones/svg/*.svg`, `src/ui/icones/LICENCES.md`, `scripts/construire-sprite.mjs`, `public/icons/sprite.svg` (généré), `src/ui/icones.ts` (généré), `src/ui/Icone.tsx`, `src/ui/Logo.tsx`
- Test : `src/ui/Icone.test.tsx`

**Interfaces :**
- Produit : type `NomIcone` et constante `NOMS_ICONES` (`src/ui/icones.ts`) ; composant `Icone({ nom: NomIcone; className?: string; titre?: string })` ; composant `Logo({ className?: string })` ; classes Tailwind `bg-marque`, `text-nuit`, `bg-lavande-2`, `rounded-carte`, `rounded-bouton`, `rounded-grande`, etc.

- [ ] **Étape 1 : copier la police**

```bash
mkdir -p src/app/fonts
cp docs/design/fira-400.woff2 docs/design/fira-700.woff2 src/app/fonts/
cp docs/design/OFL-FiraSans.txt src/app/fonts/
```

- [ ] **Étape 2 : télécharger les pictogrammes**

```bash
mkdir -p src/ui/icones/svg
HI="https://raw.githubusercontent.com/resolvetosavelives/healthicons/main/public/icons/svg/filled"
for p in people/man people/woman people/boy-0105y people/baby-0306m people/elderly people/old-woman people/pregnant people/community-healthworker devices/blood-pressure devices/syringe-vaccine devices/stethoscope devices/diabetes-measure medications/blister-pills_oval_x4 conditions/chills-fever conditions/pain body/tooth symbols/alert-circle specialties/pharmacy places/ambulatory-clinic places/hospital; do
  curl -fsSL "$HI/$p.svg" -o "src/ui/icones/svg/hi-$(basename "$p").svg"
done
PH="https://unpkg.com/@phosphor-icons/core@2.1.1/assets/fill"
for n in play pause microphone speaker-high calendar-dots calendar-check house users-three bell sun sun-horizon moon check-circle arrow-left caret-right plus cloud-arrow-up phone whatsapp-logo warning-circle list-checks pill sign-out wifi-slash backspace x; do
  curl -fsSL "$PH/$n-fill.svg" -o "src/ui/icones/svg/ph-$n.svg"
done
ls src/ui/icones/svg | wc -l
```

Expected : `46`.

- [ ] **Étape 3 : noter les licences**

Créer `src/ui/icones/LICENCES.md` :

```markdown
# Licences des pictogrammes

- `hi-*.svg` : Health Icons (https://healthicons.org), licence CC0 1.0 (domaine public).
- `ph-*.svg` : Phosphor Icons (https://phosphoricons.com), licence MIT, © 2020-2024 Phosphor Icons.
```

- [ ] **Étape 4 : écrire le script qui assemble le sprite**

Créer `scripts/construire-sprite.mjs` :

```js
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dossier = "src/ui/icones/svg";
const fichiers = readdirSync(dossier).filter((f) => f.endsWith(".svg")).sort();

const symboles = fichiers.map((fichier) => {
  const brut = readFileSync(join(dossier, fichier), "utf8");
  const viewBox = /viewBox="([^"]+)"/.exec(brut)?.[1] ?? "0 0 48 48";
  let interieur = brut.replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "").trim();
  // Phosphor place la couleur sur la balise <svg>, qu'on retire : on la remet sur un groupe.
  if (fichier.startsWith("ph-")) interieur = `<g fill="currentColor">${interieur}</g>`;
  return `<symbol id="${fichier.replace(/\.svg$/, "")}" viewBox="${viewBox}">${interieur}</symbol>`;
});

mkdirSync("public/icons", { recursive: true });
writeFileSync("public/icons/sprite.svg", `<svg xmlns="http://www.w3.org/2000/svg">${symboles.join("")}</svg>\n`);

const noms = fichiers.map((f) => `  "${f.replace(/\.svg$/, "")}",`).join("\n");
writeFileSync(
  "src/ui/icones.ts",
  `// Fichier généré par scripts/construire-sprite.mjs : ne pas modifier à la main.\nexport const NOMS_ICONES = [\n${noms}\n] as const;\n\nexport type NomIcone = (typeof NOMS_ICONES)[number];\n`,
);

console.log(`${fichiers.length} icônes assemblées.`);
```

- [ ] **Étape 5 : générer le sprite**

Run : `pnpm icones`
Expected : `46 icônes assemblées.` ; `public/icons/sprite.svg` et `src/ui/icones.ts` existent.

- [ ] **Étape 6 : écrire le test du composant Icone**

Créer `src/ui/Icone.test.tsx` :

```tsx
// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Icone } from "./Icone";
import { NOMS_ICONES } from "./icones";

afterEach(cleanup);

describe("Icone", () => {
  it("pointe vers le symbole du sprite", () => {
    const { container } = render(<Icone nom="hi-blood-pressure" />);
    const use = container.querySelector("use");
    expect(use?.getAttribute("href")).toBe("/icons/sprite.svg#hi-blood-pressure");
  });

  it("est décorative quand elle n'a pas de titre", () => {
    const { container } = render(<Icone nom="ph-sun" />);
    expect(container.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
  });

  it("porte un nom accessible quand elle a un titre", () => {
    const { getByRole } = render(<Icone nom="ph-moon" titre="Le soir" />);
    expect(getByRole("img", { name: "Le soir" })).toBeTruthy();
  });

  it("connaît les pictogrammes indispensables", () => {
    for (const nom of ["hi-pregnant", "hi-syringe-vaccine", "ph-play", "ph-sun-horizon", "ph-backspace"]) {
      expect(NOMS_ICONES).toContain(nom);
    }
  });
});
```

- [ ] **Étape 7 : lancer le test pour le voir échouer**

Run : `pnpm vitest run src/ui/Icone.test.tsx`
Expected : FAIL, `Cannot find module './Icone'`.

- [ ] **Étape 8 : écrire les composants Icone et Logo**

Créer `src/ui/Icone.tsx` :

```tsx
import type { NomIcone } from "./icones";

type Props = { nom: NomIcone; className?: string; titre?: string };

export function Icone({ nom, className = "size-6", titre }: Props) {
  return (
    <svg
      className={className}
      aria-hidden={titre ? undefined : true}
      role={titre ? "img" : undefined}
      aria-label={titre}
      focusable="false"
    >
      <use href={`/icons/sprite.svg#${nom}`} />
    </svg>
  );
}
```

Créer `src/ui/Logo.tsx` (le motif des ondes de la voix) :

```tsx
export function Logo({ className = "size-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true" focusable="false">
      <circle cx="24" cy="24" r="24" className="fill-marque" />
      <circle cx="17" cy="24" r="5.5" fill="#fff" />
      <path
        d="M26 15.5a12 12 0 0 1 0 17M31.5 10.5a19 19 0 0 1 0 27"
        fill="none"
        stroke="#fff"
        strokeWidth="3.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
```

- [ ] **Étape 9 : lancer le test**

Run : `pnpm vitest run src/ui/Icone.test.tsx`
Expected : `4 passed`.

- [ ] **Étape 10 : poser la charte**

Remplacer `src/app/globals.css` :

```css
@import "tailwindcss";

@theme {
  --color-marque: #3b3ad9;
  --color-marque-appuye: #2b2ab0;
  --color-nuit: #16154a;
  --color-lavande: #f3f3fe;
  --color-lavande-2: #e8e8fc;
  --color-lavande-3: #d6d6f6;
  --color-soleil: #ffc21a;
  --color-soleil-pale: #fff2cc;
  --color-soleil-appuye: #e09f00;
  --color-urgence: #d92d20;
  --color-urgence-pale: #fdecea;
  --color-gris: #5d5c7a;

  --font-sans: var(--font-fira), system-ui, sans-serif;

  --radius-bouton: 1rem;
  --radius-carte: 1.5rem;
  --radius-grande: 1.875rem;
}

html {
  color: var(--color-nuit);
  background: var(--color-lavande);
}

body {
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
}

:focus-visible {
  outline: 3px solid var(--color-soleil-appuye);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

Remplacer `src/app/layout.tsx` :

```tsx
import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { env } from "@/config/env";
import "./globals.css";

const fira = localFont({
  src: [
    { path: "./fonts/fira-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/fira-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-fira",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: env.NEXT_PUBLIC_APP_NAME, template: `%s | ${env.NEXT_PUBLIC_APP_NAME}` },
  description: "Le carnet de santé familial qui parle",
  applicationName: env.NEXT_PUBLIC_APP_NAME,
};

export const viewport: Viewport = {
  themeColor: "#3b3ad9",
  width: "device-width",
  initialScale: 1,
};

export default function RacineLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={fira.variable}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
```

Remplacer `src/app/page.tsx` (page provisoire, remplacée à la tâche 12) :

```tsx
import { env } from "@/config/env";
import { Icone } from "@/ui/Icone";
import { Logo } from "@/ui/Logo";

export default function Accueil() {
  return (
    <main className="mx-auto flex max-w-md flex-col gap-4 px-4 py-10">
      <div className="flex items-center gap-3">
        <Logo />
        <p className="text-2xl font-bold">{env.NEXT_PUBLIC_APP_NAME}</p>
      </div>
      <p className="text-lg">Fɔ̀ngbè : ɛ̀ ɔ́ ɖ ǒ. Yorùbá : ɛ́ ɔ̀.</p>
      <p className="flex items-center gap-2 rounded-carte bg-white p-4 font-bold text-marque">
        <Icone nom="hi-blood-pressure" className="size-8" />
        Contrôle de la tension
      </p>
    </main>
  );
}
```

- [ ] **Étape 11 : vérifier le rendu de la police**

Run : `pnpm dev`, puis ouvrir `http://localhost:3000`.
Expected : les lettres `ɛ̀ ɔ́ ɖ ǒ` s'affichent dans la même police que le reste, les accents bien placés ; le pictogramme de tension s'affiche en indigo. Arrêter le serveur.

- [ ] **Étape 12 : vérifier types et construction**

Run : `pnpm typecheck && pnpm build`
Expected : aucune erreur.

- [ ] **Étape 13 : commit**

```bash
git add src/app src/ui scripts public
git commit -m "feat: charte graphique, Fira Sans auto-hébergée et pictogrammes en sprite"
```

---

### Tâche 4 : composants de base (écouter, étiquette de risque, pavé numérique)

**Fichiers :**
- Créer : `src/ui/BoutonEcouter.tsx`, `src/ui/EtiquetteRisque.tsx`, `src/ui/PaveNumerique.tsx`
- Test : `src/ui/BoutonEcouter.test.tsx`, `src/ui/EtiquetteRisque.test.tsx`, `src/ui/PaveNumerique.test.tsx`

**Interfaces :**
- Consomme : `Icone` (tâche 3).
- Produit : `BoutonEcouter({ libelle: string; sousLibelle?: string; source?: string; texte?: string; langueTexte?: string; className?: string })` ; `EtiquetteRisque({ niveau: "normal" | "surveillance" | "eleve" })` ; `PaveNumerique({ name: string; libelle: string; longueur?: number; onComplet?: (code: string) => void })`.

- [ ] **Étape 1 : écrire les tests**

Créer `src/ui/EtiquetteRisque.test.tsx` :

```tsx
// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { EtiquetteRisque } from "./EtiquetteRisque";

afterEach(cleanup);

describe("EtiquetteRisque", () => {
  it.each([
    ["normal", "Normal"],
    ["surveillance", "À surveiller"],
    ["eleve", "Élevé"],
  ] as const)("affiche %s en toutes lettres", (niveau, texte) => {
    const { getByText } = render(<EtiquetteRisque niveau={niveau} />);
    expect(getByText(texte)).toBeTruthy();
  });

  it("réserve le rouge au risque élevé", () => {
    const { getByText } = render(<EtiquetteRisque niveau="eleve" />);
    expect(getByText("Élevé").className).toContain("bg-urgence");
  });
});
```

Créer `src/ui/PaveNumerique.test.tsx` :

```tsx
// @vitest-environment jsdom
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PaveNumerique } from "./PaveNumerique";

afterEach(cleanup);

function taper(getByRole: ReturnType<typeof render>["getByRole"], chiffres: string) {
  for (const c of chiffres) fireEvent.click(getByRole("button", { name: c }));
}

describe("PaveNumerique", () => {
  it("renvoie le code complet et le place dans le champ caché", () => {
    const onComplet = vi.fn();
    const { getByRole, container } = render(<PaveNumerique name="code" libelle="Mon code" onComplet={onComplet} />);
    taper(getByRole, "1234");
    expect(onComplet).toHaveBeenCalledWith("1234");
    expect(container.querySelector<HTMLInputElement>('input[name="code"]')?.value).toBe("1234");
  });

  it("ignore les chiffres au-delà de la longueur", () => {
    const { getByRole, container } = render(<PaveNumerique name="code" libelle="Mon code" />);
    taper(getByRole, "12345");
    expect(container.querySelector<HTMLInputElement>('input[name="code"]')?.value).toBe("1234");
  });

  it("efface le dernier chiffre et l'annonce", () => {
    const { getByRole } = render(<PaveNumerique name="code" libelle="Mon code" />);
    taper(getByRole, "123");
    fireEvent.click(getByRole("button", { name: "Effacer le dernier chiffre" }));
    expect(getByRole("status").getAttribute("aria-label")).toBe("2 chiffres sur 4");
  });
});
```

Créer `src/ui/BoutonEcouter.test.tsx` :

```tsx
// @vitest-environment jsdom
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BoutonEcouter } from "./BoutonEcouter";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("BoutonEcouter", () => {
  it("a un nom accessible", () => {
    const { getByRole } = render(<BoutonEcouter libelle="Écouter" source="/audio/test.mp3" />);
    expect(getByRole("button", { name: /Écouter/ })).toBeTruthy();
  });

  it("lit le fichier audio et passe en lecture", async () => {
    const lecture = vi.spyOn(window.HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
    const { getByRole } = render(<BoutonEcouter libelle="Écouter" source="/audio/test.mp3" />);
    fireEvent.click(getByRole("button"));
    expect(lecture).toHaveBeenCalledOnce();
    await waitFor(() => expect(getByRole("button").getAttribute("aria-pressed")).toBe("true"));
  });

  it("est désactivé sans audio ni synthèse vocale", () => {
    const { getByRole } = render(<BoutonEcouter libelle="Écouter" texte="Bonjour" />);
    expect((getByRole("button") as HTMLButtonElement).disabled).toBe(true);
  });
});
```

- [ ] **Étape 2 : lancer les tests pour les voir échouer**

Run : `pnpm vitest run src/ui`
Expected : FAIL pour les trois nouveaux fichiers (modules introuvables).

- [ ] **Étape 3 : écrire les composants**

Créer `src/ui/EtiquetteRisque.tsx` :

```tsx
type Niveau = "normal" | "surveillance" | "eleve";

const LIBELLES: Record<Niveau, string> = {
  normal: "Normal",
  surveillance: "À surveiller",
  eleve: "Élevé",
};

const STYLES: Record<Niveau, string> = {
  normal: "bg-lavande-2 text-gris",
  surveillance: "bg-soleil text-nuit",
  eleve: "bg-urgence text-white",
};

export function EtiquetteRisque({ niveau }: { niveau: Niveau }) {
  return (
    <span className={`inline-block rounded-lg px-2 py-0.5 text-xs font-bold whitespace-nowrap ${STYLES[niveau]}`}>
      {LIBELLES[niveau]}
    </span>
  );
}
```

Créer `src/ui/PaveNumerique.tsx` :

```tsx
"use client";

import { useState } from "react";
import { Icone } from "./Icone";

type Props = { name: string; libelle: string; longueur?: number; onComplet?: (code: string) => void };

const TOUCHES = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

export function PaveNumerique({ name, libelle, longueur = 4, onComplet }: Props) {
  const [code, setCode] = useState("");

  function taper(chiffre: string) {
    if (code.length >= longueur) return;
    const suivant = code + chiffre;
    setCode(suivant);
    if (suivant.length === longueur) onComplet?.(suivant);
  }

  const touche = "h-16 rounded-bouton bg-white text-2xl font-bold text-nuit active:bg-lavande-2";

  return (
    <fieldset className="flex flex-col">
      <legend className="mb-3 font-bold">{libelle}</legend>
      <input type="hidden" name={name} value={code} />
      <div
        role="status"
        aria-live="polite"
        aria-label={`${code.length} chiffre${code.length > 1 ? "s" : ""} sur ${longueur}`}
        className="mb-4 flex justify-center gap-3"
      >
        {Array.from({ length: longueur }, (_, i) => (
          <span key={i} className={`size-4 rounded-full ${i < code.length ? "bg-marque" : "bg-lavande-3"}`} />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {TOUCHES.map((c) => (
          <button key={c} type="button" className={touche} onClick={() => taper(c)}>
            {c}
          </button>
        ))}
        <button
          type="button"
          aria-label="Effacer le dernier chiffre"
          className="grid h-16 place-items-center rounded-bouton bg-lavande-2 text-marque"
          onClick={() => setCode((c) => c.slice(0, -1))}
        >
          <Icone nom="ph-backspace" className="size-7" />
        </button>
        <button type="button" className={touche} onClick={() => taper("0")}>
          0
        </button>
        <span aria-hidden="true" />
      </div>
    </fieldset>
  );
}
```

Créer `src/ui/BoutonEcouter.tsx` :

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { Icone } from "./Icone";

type Props = {
  libelle: string;
  sousLibelle?: string;
  source?: string;
  texte?: string;
  langueTexte?: string;
  className?: string;
};

export function BoutonEcouter({ libelle, sousLibelle, source, texte, langueTexte = "fr-FR", className = "" }: Props) {
  const [enLecture, setEnLecture] = useState(false);
  const [synthese, setSynthese] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setSynthese("speechSynthesis" in window);
    return () => {
      audio.current?.pause();
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);

  const disponible = Boolean(source) || (Boolean(texte) && synthese);

  function arreter() {
    audio.current?.pause();
    if (synthese) window.speechSynthesis.cancel();
    setEnLecture(false);
  }

  function lancer() {
    if (source) {
      audio.current ??= new Audio(source);
      audio.current.onended = () => setEnLecture(false);
      audio.current
        .play()
        .then(() => setEnLecture(true))
        .catch(() => setEnLecture(false));
      return;
    }
    if (texte && synthese) {
      const enonce = new SpeechSynthesisUtterance(texte);
      enonce.lang = langueTexte;
      enonce.onend = () => setEnLecture(false);
      window.speechSynthesis.speak(enonce);
      setEnLecture(true);
    }
  }

  return (
    <button
      type="button"
      onClick={enLecture ? arreter : lancer}
      disabled={!disponible}
      aria-pressed={enLecture}
      title={disponible ? undefined : "Audio indisponible"}
      className={`inline-flex items-center gap-3 text-left disabled:opacity-50 ${className}`}
    >
      <span className="grid size-14 shrink-0 place-items-center rounded-full bg-soleil text-nuit shadow-[0_0_0_7px_rgb(255_194_26_/_0.25)]">
        <Icone nom={enLecture ? "ph-pause" : "ph-play"} className="size-6" />
      </span>
      <span>
        <span className="block font-bold">{libelle}</span>
        {sousLibelle && <span className="block text-sm opacity-80">{sousLibelle}</span>}
      </span>
    </button>
  );
}
```

- [ ] **Étape 4 : lancer les tests**

Run : `pnpm vitest run src/ui`
Expected : `14 passed` (Icone 4, EtiquetteRisque 4, PaveNumerique 3, BoutonEcouter 3).

- [ ] **Étape 5 : commit**

```bash
git add src/ui
git commit -m "feat: bouton écouter, étiquette de risque et pavé numérique accessibles"
```

---

### Tâche 5 : dates et numéros de téléphone

**Fichiers :**
- Créer : `src/domain/dates.ts`, `src/domain/telephone.ts`
- Test : `src/domain/dates.test.ts`, `src/domain/telephone.test.ts`

**Interfaces :**
- Produit : `type DateISO = string` ; `depuisDateISO(d: DateISO): Date` ; `versDateISO(date: Date): DateISO` ; `ajouterJours(d: DateISO, jours: number): DateISO` ; `joursEntre(de: DateISO, a: DateISO): number` ; `ageEnAnnees(naissance: DateISO, le: DateISO): number` ; `libelleAge(naissance: DateISO, le: DateISO): string` ; `aujourdhuiAuBenin(maintenant?: Date): DateISO` ; `normaliserTelephone(saisie: string): TelephoneBenin | null` ; `formaterTelephone(t: TelephoneBenin): string` ; `type TelephoneBenin = \`+229${string}\``.

- [ ] **Étape 1 : écrire les tests**

Créer `src/domain/dates.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { ageEnAnnees, ajouterJours, aujourdhuiAuBenin, depuisDateISO, joursEntre, libelleAge } from "./dates";

describe("dates", () => {
  it("ajoute des jours en passant les mois, les années et le 29 février", () => {
    expect(ajouterJours("2026-09-25", 7)).toBe("2026-10-02");
    expect(ajouterJours("2026-12-31", 1)).toBe("2027-01-01");
    expect(ajouterJours("2028-02-28", 1)).toBe("2028-02-29");
    expect(ajouterJours("2027-02-28", 1)).toBe("2027-03-01");
    expect(ajouterJours("2026-01-01", -1)).toBe("2025-12-31");
  });

  it("compte les jours entre deux dates", () => {
    expect(joursEntre("2026-09-25", "2026-10-25")).toBe(30);
    expect(joursEntre("2026-10-25", "2026-09-25")).toBe(-30);
  });

  it("refuse une date qui n'existe pas", () => {
    expect(() => depuisDateISO("2026-02-30")).toThrow(/Date invalide/);
    expect(() => depuisDateISO("25/09/2026")).toThrow(/Date invalide/);
  });

  it("calcule l'âge à la veille et au jour de l'anniversaire", () => {
    expect(ageEnAnnees("1968-09-26", "2026-09-25")).toBe(57);
    expect(ageEnAnnees("1968-09-25", "2026-09-25")).toBe(58);
  });

  it("dit l'âge en mois avant 2 ans", () => {
    expect(libelleAge("2026-01-25", "2026-09-25")).toBe("8 mois");
    expect(libelleAge("2026-09-01", "2026-09-25")).toBe("moins d'un mois");
    expect(libelleAge("2024-09-25", "2026-09-25")).toBe("2 ans");
    expect(libelleAge("1968-03-12", "2026-09-25")).toBe("58 ans");
  });

  it("donne la date du jour à l'heure du Bénin (UTC+1)", () => {
    expect(aujourdhuiAuBenin(new Date("2026-09-25T23:30:00Z"))).toBe("2026-09-26");
    expect(aujourdhuiAuBenin(new Date("2026-09-25T22:59:00Z"))).toBe("2026-09-25");
  });
});
```

Créer `src/domain/telephone.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { formaterTelephone, normaliserTelephone } from "./telephone";

describe("normaliserTelephone", () => {
  it.each([
    ["01 97 12 34 56", "+2290197123456"],
    ["0197123456", "+2290197123456"],
    ["+229 01 97 12 34 56", "+2290197123456"],
    ["00229 0197123456", "+2290197123456"],
    ["97 12 34 56", "+2290197123456"],
    ["+229 97 12 34 56", "+2290197123456"],
  ])("accepte %s", (saisie, attendu) => {
    expect(normaliserTelephone(saisie)).toBe(attendu);
  });

  it.each(["", "12345", "+33 6 12 34 56 78", "02 97 12 34 56", "01 97 12 34 5"])("refuse %s", (saisie) => {
    expect(normaliserTelephone(saisie)).toBeNull();
  });

  it("formate pour l'affichage", () => {
    expect(formaterTelephone("+2290197123456")).toBe("01 97 12 34 56");
  });
});
```

- [ ] **Étape 2 : lancer les tests pour les voir échouer**

Run : `pnpm vitest run src/domain`
Expected : FAIL, modules introuvables.

- [ ] **Étape 3 : écrire les modules**

Créer `src/domain/dates.ts` :

```ts
/** Date sans heure, au format AAAA-MM-JJ, calculée en UTC. */
export type DateISO = string;

const MS_PAR_JOUR = 86_400_000;
const FORMAT = /^\d{4}-\d{2}-\d{2}$/;

export function versDateISO(date: Date): DateISO {
  return date.toISOString().slice(0, 10);
}

export function depuisDateISO(d: DateISO): Date {
  if (!FORMAT.test(d)) throw new Error(`Date invalide : ${d}`);
  const date = new Date(`${d}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || versDateISO(date) !== d) throw new Error(`Date invalide : ${d}`);
  return date;
}

export function ajouterJours(d: DateISO, jours: number): DateISO {
  return versDateISO(new Date(depuisDateISO(d).getTime() + jours * MS_PAR_JOUR));
}

export function joursEntre(de: DateISO, a: DateISO): number {
  return Math.round((depuisDateISO(a).getTime() - depuisDateISO(de).getTime()) / MS_PAR_JOUR);
}

function moisEntre(naissance: Date, le: Date): number {
  let mois = (le.getUTCFullYear() - naissance.getUTCFullYear()) * 12 + (le.getUTCMonth() - naissance.getUTCMonth());
  if (le.getUTCDate() < naissance.getUTCDate()) mois -= 1;
  return mois;
}

export function ageEnAnnees(naissance: DateISO, le: DateISO): number {
  return Math.floor(moisEntre(depuisDateISO(naissance), depuisDateISO(le)) / 12);
}

export function libelleAge(naissance: DateISO, le: DateISO): string {
  const mois = moisEntre(depuisDateISO(naissance), depuisDateISO(le));
  if (mois < 1) return "moins d'un mois";
  if (mois < 24) return `${mois} mois`;
  return `${Math.floor(mois / 12)} ans`;
}

/** Le Bénin est à UTC+1 toute l'année (pas d'heure d'été). */
export function aujourdhuiAuBenin(maintenant: Date = new Date()): DateISO {
  return versDateISO(new Date(maintenant.getTime() + 60 * 60 * 1000));
}
```

Créer `src/domain/telephone.ts` :

```ts
export type TelephoneBenin = `+229${string}`;

/**
 * Normalise un numéro béninois au format +22901XXXXXXXX.
 * Depuis le 30/11/2024, les numéros mobiles ont 10 chiffres et commencent par 01 ;
 * un ancien numéro à 8 chiffres reçoit le préfixe 01.
 */
export function normaliserTelephone(saisie: string): TelephoneBenin | null {
  let chiffres = saisie.replace(/\D/g, "");
  if (chiffres.startsWith("00229")) chiffres = chiffres.slice(5);
  else if (chiffres.startsWith("229") && (chiffres.length === 13 || chiffres.length === 11)) chiffres = chiffres.slice(3);
  if (chiffres.length === 8) chiffres = `01${chiffres}`;
  if (chiffres.length !== 10 || !chiffres.startsWith("01")) return null;
  return `+229${chiffres}`;
}

export function formaterTelephone(telephone: TelephoneBenin): string {
  const n = telephone.slice(4);
  return [0, 2, 4, 6, 8].map((i) => n.slice(i, i + 2)).join(" ");
}
```

- [ ] **Étape 4 : lancer les tests**

Run : `pnpm vitest run src/domain`
Expected : tous les tests de `dates.test.ts` et `telephone.test.ts` passent.

- [ ] **Étape 5 : commit**

```bash
git add src/domain
git commit -m "feat(domaine): dates à l'heure du Bénin et numéros de téléphone béninois"
```

---

### Tâche 6 : programmes de suivi et calendriers

**Fichiers :**
- Créer : `src/domain/programmes/types.ts`, `src/domain/programmes/grossesse.ts`, `src/domain/programmes/vaccination.ts`, `src/domain/programmes/controles.ts`, `src/domain/programmes/index.ts`, `src/domain/calendrier.ts`
- Test : `src/domain/calendrier.test.ts`

**Interfaces :**
- Consomme : `DateISO`, `ajouterJours`, `joursEntre` (tâche 5).
- Produit :
  - `CODES_PROGRAMMES`, `type CodeProgramme = "consultation" | "hypertension" | "grossesse" | "vaccination" | "diabete"` ;
  - `MOTIFS_RDV`, `type MotifRdv = "consultation" | "tension" | "grossesse" | "vaccin" | "diabete" | "fievre" | "dents"` ;
  - `type NiveauRisque = "normal" | "surveillance" | "eleve"` ;
  - `interface DefinitionEtape { code; libelle; cibleJours; debutFenetreJours; finFenetreJours; toleranceManqueJours; motif: MotifRdv; rendezVous: boolean; details?: string }` ;
  - `interface Programme { code: CodeProgramme; nom: string; libelleReference: string; etapes(dateReference: DateISO, dateInscription: DateISO): DefinitionEtape[] }` ;
  - `PROGRAMMES: Record<CodeProgramme, Programme>` ;
  - `interface EtapePlanifiee { code; libelle; motif; rendezVous; datePrevue: DateISO; debutFenetre: DateISO; finFenetre: DateISO; toleranceManqueJours: number; details?: string }` ;
  - `planifier(programme: Programme, dateReference: DateISO, dateInscription: DateISO): EtapePlanifiee[]` ;
  - `termePrevu(ddr: DateISO): DateISO` ; `semainesDeGrossesse(ddr: DateISO, le: DateISO): number`.

> ⚠️ Valeurs indicatives (spec §5), pour une démonstration sur données fictives.

- [ ] **Étape 1 : écrire le test**

Créer `src/domain/calendrier.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { planifier } from "./calendrier";
import { ajouterJours } from "./dates";
import { PROGRAMMES } from "./programmes";
import { semainesDeGrossesse, termePrevu } from "./programmes/grossesse";

const DDR = "2026-03-06";

describe("grossesse", () => {
  it("planifie les 4 consultations et l'accouchement pour une inscription précoce", () => {
    const etapes = planifier(PROGRAMMES.grossesse, DDR, ajouterJours(DDR, 8 * 7));
    expect(etapes.map((e) => e.code)).toEqual(["cpn1", "cpn2", "cpn3", "cpn4", "accouchement"]);
    expect(etapes[0]?.datePrevue).toBe(ajouterJours(DDR, 12 * 7));
    expect(etapes[1]?.datePrevue).toBe(ajouterJours(DDR, 26 * 7));
    expect(etapes.at(-1)?.datePrevue).toBe(termePrevu(DDR));
    expect(etapes.at(-1)?.rendezVous).toBe(false);
  });

  it("ne génère pas une consultation dont la fenêtre est passée", () => {
    const etapes = planifier(PROGRAMMES.grossesse, DDR, ajouterJours(DDR, 20 * 7));
    expect(etapes.map((e) => e.code)).toEqual(["cpn2", "cpn3", "cpn4", "accouchement"]);
  });

  it("planifie à l'inscription + 7 jours une consultation dont la date cible est passée mais la fenêtre ouverte", () => {
    const inscription = ajouterJours(DDR, 27 * 7);
    const cpn2 = planifier(PROGRAMMES.grossesse, DDR, inscription).find((e) => e.code === "cpn2");
    expect(cpn2?.datePrevue).toBe(ajouterJours(inscription, 7));
  });

  it("calcule le terme et l'âge de la grossesse", () => {
    expect(termePrevu(DDR)).toBe(ajouterJours(DDR, 280));
    expect(semainesDeGrossesse(DDR, ajouterJours(DDR, 32 * 7 + 3))).toBe(32);
  });
});

describe("vaccination de l'enfant", () => {
  it("planifie les 6 séances depuis la naissance", () => {
    const naissance = "2026-01-25";
    const etapes = planifier(PROGRAMMES.vaccination, naissance, naissance);
    expect(etapes.map((e) => e.code)).toEqual(["naissance", "6sem", "10sem", "14sem", "9mois", "15mois"]);
    expect(etapes.find((e) => e.code === "9mois")?.datePrevue).toBe(ajouterJours(naissance, 270));
    expect(etapes.every((e) => e.motif === "vaccin" && e.toleranceManqueJours === 14)).toBe(true);
  });
});

describe("contrôles périodiques", () => {
  it("planifie un contrôle de la tension tous les 90 jours sur un an", () => {
    const ref = "2026-09-25";
    const etapes = planifier(PROGRAMMES.hypertension, ref, ref);
    expect(etapes.map((e) => e.datePrevue)).toEqual([90, 180, 270, 360].map((j) => ajouterJours(ref, j)));
    expect(etapes.every((e) => e.motif === "tension")).toBe(true);
  });

  it("reprend au prochain contrôle pour un diagnostic ancien", () => {
    const ref = "2026-01-01";
    const etapes = planifier(PROGRAMMES.hypertension, ref, ajouterJours(ref, 100));
    expect(etapes[0]?.code).toBe("controle-2");
    expect(etapes[0]?.datePrevue).toBe(ajouterJours(ref, 180));
  });

  it("utilise le même rythme pour le diabète", () => {
    const etapes = planifier(PROGRAMMES.diabete, "2026-09-25", "2026-09-25");
    expect(etapes).toHaveLength(4);
    expect(etapes[0]?.motif).toBe("diabete");
  });
});

describe("consultation générale", () => {
  it("n'a pas d'étape planifiée", () => {
    expect(planifier(PROGRAMMES.consultation, "2026-09-25", "2026-09-25")).toEqual([]);
  });
});
```

- [ ] **Étape 2 : lancer le test pour le voir échouer**

Run : `pnpm vitest run src/domain/calendrier.test.ts`
Expected : FAIL, modules introuvables.

- [ ] **Étape 3 : écrire les types**

Créer `src/domain/programmes/types.ts` :

```ts
import type { DateISO } from "../dates";

export const CODES_PROGRAMMES = ["consultation", "hypertension", "grossesse", "vaccination", "diabete"] as const;
export type CodeProgramme = (typeof CODES_PROGRAMMES)[number];

export const MOTIFS_RDV = ["consultation", "tension", "grossesse", "vaccin", "diabete", "fievre", "dents"] as const;
export type MotifRdv = (typeof MOTIFS_RDV)[number];

export type NiveauRisque = "normal" | "surveillance" | "eleve";

export interface DefinitionEtape {
  code: string;
  libelle: string;
  /** Jours après la date de référence (dernières règles, naissance, diagnostic). */
  cibleJours: number;
  debutFenetreJours: number;
  finFenetreJours: number;
  /** Jours après la date prévue au-delà desquels l'étape est manquée. */
  toleranceManqueJours: number;
  motif: MotifRdv;
  /** Faux pour une étape qui n'est pas un rendez-vous (accouchement prévu). */
  rendezVous: boolean;
  details?: string;
}

export interface Programme {
  code: CodeProgramme;
  nom: string;
  libelleReference: string;
  etapes(dateReference: DateISO, dateInscription: DateISO): DefinitionEtape[];
}
```

- [ ] **Étape 4 : écrire les programmes**

Créer `src/domain/programmes/grossesse.ts` :

```ts
import { ajouterJours, joursEntre, type DateISO } from "../dates";
import type { DefinitionEtape, Programme } from "./types";

const SA = (semaines: number) => semaines * 7;

function consultation(numero: number, cible: number, debut: number, fin: number): DefinitionEtape {
  return {
    code: `cpn${numero}`,
    libelle: `Consultation prénatale ${numero}`,
    cibleJours: cible,
    debutFenetreJours: debut,
    finFenetreJours: fin,
    toleranceManqueJours: 7,
    motif: "grossesse",
    rendezVous: true,
  };
}

const ETAPES: DefinitionEtape[] = [
  consultation(1, SA(12), 0, SA(16)),
  consultation(2, SA(26), SA(24), SA(28)),
  consultation(3, SA(32), SA(32) - 7, SA(32) + 7),
  consultation(4, SA(36), SA(36) - 7, SA(36) + 7),
  {
    code: "accouchement",
    libelle: "Accouchement prévu",
    cibleJours: 280,
    debutFenetreJours: SA(37),
    finFenetreJours: SA(42),
    toleranceManqueJours: 14,
    motif: "grossesse",
    rendezVous: false,
  },
];

export const grossesse: Programme = {
  code: "grossesse",
  nom: "Suivi de grossesse",
  libelleReference: "Date des dernières règles",
  etapes: () => ETAPES,
};

export function termePrevu(ddr: DateISO): DateISO {
  return ajouterJours(ddr, 280);
}

export function semainesDeGrossesse(ddr: DateISO, le: DateISO): number {
  return Math.floor(joursEntre(ddr, le) / 7);
}
```

Créer `src/domain/programmes/vaccination.ts` :

```ts
import type { DefinitionEtape, Programme } from "./types";

function seance(code: string, libelle: string, cible: number, details: string): DefinitionEtape {
  return {
    code,
    libelle,
    cibleJours: cible,
    debutFenetreJours: cible,
    finFenetreJours: cible + (cible === 0 ? 14 : 28),
    toleranceManqueJours: 14,
    motif: "vaccin",
    rendezVous: true,
    details,
  };
}

const ETAPES: DefinitionEtape[] = [
  seance("naissance", "Vaccins de la naissance", 0, "BCG, VPO0"),
  seance("6sem", "Vaccins des 6 semaines", 42, "Penta1, VPO1, PCV1, Rota1"),
  seance("10sem", "Vaccins des 10 semaines", 70, "Penta2, VPO2, PCV2, Rota2"),
  seance("14sem", "Vaccins des 14 semaines", 98, "Penta3, VPO3, PCV3, VPI"),
  seance("9mois", "Vaccins des 9 mois", 270, "Rougeole-rubéole 1, fièvre jaune"),
  seance("15mois", "Vaccins des 15 mois", 450, "Rougeole-rubéole 2"),
];

export const vaccination: Programme = {
  code: "vaccination",
  nom: "Vaccination de l'enfant",
  libelleReference: "Date de naissance",
  etapes: () => ETAPES,
};
```

Créer `src/domain/programmes/controles.ts` :

```ts
import { joursEntre } from "../dates";
import type { DefinitionEtape, MotifRdv, Programme } from "./types";

const INTERVALLE_JOURS = 90;
const HORIZON_JOURS = 365;

function controlesPeriodiques(motif: MotifRdv, libelle: string) {
  return (dateReference: string, dateInscription: string): DefinitionEtape[] => {
    const ecoule = joursEntre(dateReference, dateInscription);
    const premier = Math.max(1, Math.ceil(ecoule / INTERVALLE_JOURS));
    const etapes: DefinitionEtape[] = [];
    for (let k = premier; k * INTERVALLE_JOURS - ecoule <= HORIZON_JOURS; k++) {
      const cible = k * INTERVALLE_JOURS;
      etapes.push({
        code: `controle-${k}`,
        libelle,
        cibleJours: cible,
        debutFenetreJours: cible - 14,
        finFenetreJours: cible + 14,
        toleranceManqueJours: 7,
        motif,
        rendezVous: true,
      });
    }
    return etapes;
  };
}

export const hypertension: Programme = {
  code: "hypertension",
  nom: "Suivi de la tension",
  libelleReference: "Date du diagnostic",
  etapes: controlesPeriodiques("tension", "Contrôle de la tension"),
};

export const diabete: Programme = {
  code: "diabete",
  nom: "Suivi du diabète",
  libelleReference: "Date du diagnostic",
  etapes: controlesPeriodiques("diabete", "Contrôle du diabète"),
};

export const consultation: Programme = {
  code: "consultation",
  nom: "Consultation générale",
  libelleReference: "Date d'inscription",
  etapes: () => [],
};
```

Créer `src/domain/programmes/index.ts` :

```ts
import { consultation, diabete, hypertension } from "./controles";
import { grossesse } from "./grossesse";
import type { CodeProgramme, Programme } from "./types";
import { vaccination } from "./vaccination";

export const PROGRAMMES: Record<CodeProgramme, Programme> = {
  consultation,
  hypertension,
  grossesse,
  vaccination,
  diabete,
};

export * from "./types";
```

- [ ] **Étape 5 : écrire la planification**

Créer `src/domain/calendrier.ts` :

```ts
import { ajouterJours, joursEntre, type DateISO } from "./dates";
import type { MotifRdv, Programme } from "./programmes/types";

export interface EtapePlanifiee {
  code: string;
  libelle: string;
  motif: MotifRdv;
  rendezVous: boolean;
  datePrevue: DateISO;
  debutFenetre: DateISO;
  finFenetre: DateISO;
  toleranceManqueJours: number;
  details?: string;
}

/**
 * Planifie les étapes d'un programme pour une personne.
 * Une étape dont la fenêtre est entièrement passée à l'inscription n'est pas générée ;
 * une étape dont la date cible est passée mais la fenêtre encore ouverte est planifiée à l'inscription + 7 jours.
 */
export function planifier(programme: Programme, dateReference: DateISO, dateInscription: DateISO): EtapePlanifiee[] {
  return programme.etapes(dateReference, dateInscription).flatMap((etape) => {
    const finFenetre = ajouterJours(dateReference, etape.finFenetreJours);
    if (joursEntre(dateInscription, finFenetre) < 0) return [];
    const cible = ajouterJours(dateReference, etape.cibleJours);
    const datePrevue = joursEntre(dateInscription, cible) >= 0 ? cible : ajouterJours(dateInscription, 7);
    return [
      {
        code: etape.code,
        libelle: etape.libelle,
        motif: etape.motif,
        rendezVous: etape.rendezVous,
        datePrevue,
        debutFenetre: ajouterJours(dateReference, etape.debutFenetreJours),
        finFenetre,
        toleranceManqueJours: etape.toleranceManqueJours,
        details: etape.details,
      },
    ];
  });
}
```

- [ ] **Étape 6 : lancer le test**

Run : `pnpm vitest run src/domain/calendrier.test.ts`
Expected : `9 passed`.

- [ ] **Étape 7 : commit**

```bash
git add src/domain
git commit -m "feat(domaine): programmes de suivi et planification des étapes"
```

---

### Tâche 7 : règles de risque

**Fichiers :**
- Créer : `src/domain/risque.ts`
- Test : `src/domain/risque.test.ts`

**Interfaces :**
- Consomme : `CodeProgramme`, `NiveauRisque` (tâche 6), `ageEnAnnees` (tâche 5).
- Produit : `interface Mesure { date: DateISO; tensionSys?; tensionDia?; glycemieGL?; hemoglobineGDL?; poidsKg? }` ; `interface ContexteRisque { aujourdhui: DateISO; dateNaissance: DateISO; antecedents: { cesarienne?: boolean }; mesures: Mesure[]; etapesManquees: number; signalementsOuverts: number }` ; `interface ResultatRisque { niveau: NiveauRisque; motifs: string[] }` ; `evaluerRisque(code: CodeProgramme, contexte: ContexteRisque): ResultatRisque` ; `risqueGlobal(resultats: ResultatRisque[]): ResultatRisque`.

- [ ] **Étape 1 : écrire le test**

Créer `src/domain/risque.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { evaluerRisque, risqueGlobal, type ContexteRisque } from "./risque";

const base: ContexteRisque = {
  aujourdhui: "2026-09-25",
  dateNaissance: "1995-05-10",
  antecedents: {},
  mesures: [],
  etapesManquees: 0,
  signalementsOuverts: 0,
};

describe("grossesse", () => {
  it("est normale sans facteur de risque", () => {
    expect(evaluerRisque("grossesse", base)).toEqual({ niveau: "normal", motifs: [] });
  });

  it("passe en élevé avec une tension à 150/95", () => {
    const r = evaluerRisque("grossesse", { ...base, mesures: [{ date: "2026-09-20", tensionSys: 150, tensionDia: 95 }] });
    expect(r.niveau).toBe("eleve");
    expect(r.motifs).toContain("Tension élevée (150/95)");
  });

  it("passe en élevé avec un signe de danger non pris en charge", () => {
    expect(evaluerRisque("grossesse", { ...base, signalementsOuverts: 1 }).niveau).toBe("eleve");
  });

  it("cumule les motifs de surveillance", () => {
    const r = evaluerRisque("grossesse", {
      ...base,
      dateNaissance: "1988-01-01",
      antecedents: { cesarienne: true },
      mesures: [{ date: "2026-09-01", hemoglobineGDL: 9.8 }],
      etapesManquees: 2,
    });
    expect(r.niveau).toBe("surveillance");
    expect(r.motifs).toEqual([
      "Grossesse après 35 ans (38 ans)",
      "Césarienne antérieure",
      "Anémie (9.8 g/dL)",
      "2 rendez-vous manqués",
    ]);
  });

  it("signale une grossesse avant 18 ans", () => {
    expect(evaluerRisque("grossesse", { ...base, dateNaissance: "2009-06-01" }).motifs).toContain("Grossesse avant 18 ans (17 ans)");
  });
});

describe("hypertension", () => {
  it("passe en élevé au-delà de 180/110", () => {
    const r = evaluerRisque("hypertension", { ...base, mesures: [{ date: "2026-09-24", tensionSys: 182, tensionDia: 112 }] });
    expect(r).toEqual({ niveau: "eleve", motifs: ["Tension très élevée (182/112)"] });
  });

  it("surveille une tension non contrôlée sur les deux derniers relevés", () => {
    const r = evaluerRisque("hypertension", {
      ...base,
      mesures: [
        { date: "2026-06-01", tensionSys: 150, tensionDia: 95 },
        { date: "2026-09-01", tensionSys: 145, tensionDia: 92 },
      ],
    });
    expect(r).toEqual({ niveau: "surveillance", motifs: ["Tension non contrôlée (150/95 puis 145/92)"] });
  });

  it("se fie au relevé le plus récent par date, même saisi en premier", () => {
    const r = evaluerRisque("hypertension", {
      ...base,
      mesures: [
        { date: "2026-09-20", tensionSys: 125, tensionDia: 80 },
        { date: "2026-03-01", tensionSys: 185, tensionDia: 115 },
        { date: "2026-06-01", tensionSys: 150, tensionDia: 95 },
      ],
    });
    expect(r.niveau).toBe("normal");
  });
});

describe("diabète", () => {
  it("passe en élevé au-delà de 2,5 g/L", () => {
    expect(evaluerRisque("diabete", { ...base, mesures: [{ date: "2026-09-01", glycemieGL: 2.7 }] }).niveau).toBe("eleve");
  });

  it("surveille deux glycémies à jeun au-dessus de 1,26 g/L", () => {
    const r = evaluerRisque("diabete", {
      ...base,
      mesures: [
        { date: "2026-08-01", glycemieGL: 1.4 },
        { date: "2026-09-01", glycemieGL: 1.35 },
      ],
    });
    expect(r.niveau).toBe("surveillance");
  });
});

describe("vaccination et consultation", () => {
  it("surveille un vaccin en retard", () => {
    expect(evaluerRisque("vaccination", { ...base, etapesManquees: 1 })).toEqual({ niveau: "surveillance", motifs: ["1 vaccin en retard"] });
  });

  it("reste normal pour une consultation générale", () => {
    expect(evaluerRisque("consultation", { ...base, etapesManquees: 5 }).niveau).toBe("normal");
  });
});

describe("risqueGlobal", () => {
  it("retient le niveau le plus haut et tous les motifs", () => {
    const r = risqueGlobal([
      { niveau: "surveillance", motifs: ["A"] },
      { niveau: "eleve", motifs: ["B"] },
      { niveau: "normal", motifs: [] },
    ]);
    expect(r).toEqual({ niveau: "eleve", motifs: ["A", "B"] });
  });
});
```

- [ ] **Étape 2 : lancer le test pour le voir échouer**

Run : `pnpm vitest run src/domain/risque.test.ts`
Expected : FAIL, module introuvable.

- [ ] **Étape 3 : écrire les règles**

Créer `src/domain/risque.ts` :

```ts
import { ageEnAnnees, type DateISO } from "./dates";
import type { CodeProgramme, NiveauRisque } from "./programmes/types";

export interface Mesure {
  date: DateISO;
  tensionSys?: number;
  tensionDia?: number;
  glycemieGL?: number;
  hemoglobineGDL?: number;
  poidsKg?: number;
}

export interface ContexteRisque {
  aujourdhui: DateISO;
  dateNaissance: DateISO;
  antecedents: { cesarienne?: boolean };
  mesures: Mesure[];
  etapesManquees: number;
  signalementsOuverts: number;
}

export interface ResultatRisque {
  niveau: NiveauRisque;
  motifs: string[];
}

type Regle = { niveau: Exclude<NiveauRisque, "normal">; motif: string } | null;

const ORDRE: Record<NiveauRisque, number> = { normal: 0, surveillance: 1, eleve: 2 };
const eleve = (motif: string): Regle => ({ niveau: "eleve", motif });
const surveillance = (motif: string): Regle => ({ niveau: "surveillance", motif });

function combiner(regles: Regle[]): ResultatRisque {
  const actives = regles.filter((r): r is NonNullable<Regle> => r !== null);
  const niveau = actives.reduce<NiveauRisque>((max, r) => (ORDRE[r.niveau] > ORDRE[max] ? r.niveau : max), "normal");
  return { niveau, motifs: actives.map((r) => r.motif) };
}

/** Relevés qui contiennent la valeur demandée, du plus ancien au plus récent. */
function releves(mesures: Mesure[], cle: keyof Omit<Mesure, "date">): Mesure[] {
  return mesures.filter((m) => m[cle] !== undefined).sort((a, b) => a.date.localeCompare(b.date));
}

const tension = (m: Mesure) => `${m.tensionSys}/${m.tensionDia}`;
const tensionAuMoins = (m: Mesure, sys: number, dia: number) => (m.tensionSys ?? 0) >= sys || (m.tensionDia ?? 0) >= dia;
const manques = (c: ContexteRisque): Regle =>
  c.etapesManquees >= 2 ? surveillance(`${c.etapesManquees} rendez-vous manqués`) : null;

const REGLES: Record<CodeProgramme, (c: ContexteRisque) => Regle[]> = {
  consultation: () => [],

  grossesse: (c) => {
    const derniereTension = releves(c.mesures, "tensionSys").at(-1);
    const derniereHb = releves(c.mesures, "hemoglobineGDL").at(-1);
    const age = ageEnAnnees(c.dateNaissance, c.aujourdhui);
    return [
      derniereTension && tensionAuMoins(derniereTension, 140, 90) ? eleve(`Tension élevée (${tension(derniereTension)})`) : null,
      c.signalementsOuverts > 0 ? eleve("Signe de danger non pris en charge") : null,
      age < 18 ? surveillance(`Grossesse avant 18 ans (${age} ans)`) : age > 35 ? surveillance(`Grossesse après 35 ans (${age} ans)`) : null,
      c.antecedents.cesarienne ? surveillance("Césarienne antérieure") : null,
      derniereHb && (derniereHb.hemoglobineGDL ?? Infinity) < 11 ? surveillance(`Anémie (${derniereHb.hemoglobineGDL} g/dL)`) : null,
      manques(c),
    ];
  },

  hypertension: (c) => {
    const t = releves(c.mesures, "tensionSys");
    const derniere = t.at(-1);
    const avant = t.at(-2);
    let regle: Regle = null;
    if (derniere && tensionAuMoins(derniere, 180, 110)) regle = eleve(`Tension très élevée (${tension(derniere)})`);
    else if (derniere && avant && tensionAuMoins(derniere, 140, 90) && tensionAuMoins(avant, 140, 90))
      regle = surveillance(`Tension non contrôlée (${tension(avant)} puis ${tension(derniere)})`);
    return [regle, manques(c)];
  },

  diabete: (c) => {
    const g = releves(c.mesures, "glycemieGL");
    const derniere = g.at(-1)?.glycemieGL;
    const avant = g.at(-2)?.glycemieGL;
    let regle: Regle = null;
    if (derniere !== undefined && derniere >= 2.5) regle = eleve(`Glycémie très élevée (${derniere} g/L)`);
    else if (derniere !== undefined && avant !== undefined && derniere >= 1.26 && avant >= 1.26)
      regle = surveillance(`Diabète non contrôlé (${avant} puis ${derniere} g/L)`);
    return [regle, manques(c)];
  },

  vaccination: (c) => [
    c.etapesManquees >= 1
      ? surveillance(c.etapesManquees === 1 ? "1 vaccin en retard" : `${c.etapesManquees} vaccins en retard`)
      : null,
  ],
};

export function evaluerRisque(code: CodeProgramme, contexte: ContexteRisque): ResultatRisque {
  return combiner(REGLES[code](contexte));
}

export function risqueGlobal(resultats: ResultatRisque[]): ResultatRisque {
  return resultats.reduce<ResultatRisque>(
    (acc, r) => ({
      niveau: ORDRE[r.niveau] > ORDRE[acc.niveau] ? r.niveau : acc.niveau,
      motifs: [...acc.motifs, ...r.motifs],
    }),
    { niveau: "normal", motifs: [] },
  );
}
```

- [ ] **Étape 4 : lancer le test**

Run : `pnpm vitest run src/domain/risque.test.ts`
Expected : `13 passed`.

- [ ] **Étape 5 : commit**

```bash
git add src/domain
git commit -m "feat(domaine): règles de risque par programme"
```

---

### Tâche 8 : statuts des étapes et schémas des événements

**Fichiers :**
- Créer : `src/domain/statuts.ts`, `src/domain/evenements.ts`
- Test : `src/domain/statuts.test.ts`, `src/domain/evenements.test.ts`

**Interfaces :**
- Consomme : `EtapePlanifiee` (tâche 6), `MOTIFS_RDV` (tâche 6), `joursEntre` (tâche 5).
- Produit : `type StatutEtape = "faite" | "a_venir" | "manquee"` ; `statutEtape(etape: { datePrevue: DateISO; toleranceManqueJours: number }, faite: boolean, aujourdhui: DateISO): StatutEtape` ; `compterManquees(etapes: EtapePlanifiee[], codesFaits: ReadonlySet<string>, aujourdhui: DateISO): number` ; `evenementSchema` (union Zod discriminée sur `type`) ; `type EvenementValide` ; `type TypeEvenement = "consultation" | "mesure" | "vaccination" | "prise_medicament"` ; `mesuresSchema`.

- [ ] **Étape 1 : écrire les tests**

Créer `src/domain/statuts.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import type { EtapePlanifiee } from "./calendrier";
import { compterManquees, statutEtape } from "./statuts";

const etape = { datePrevue: "2026-09-10", toleranceManqueJours: 7 };

describe("statutEtape", () => {
  it("est faite quand un événement l'a honorée, même en retard", () => {
    expect(statutEtape(etape, true, "2026-12-01")).toBe("faite");
  });

  it("reste à venir jusqu'à la fin de la tolérance", () => {
    expect(statutEtape(etape, false, "2026-09-17")).toBe("a_venir");
  });

  it("devient manquée le lendemain de la tolérance", () => {
    expect(statutEtape(etape, false, "2026-09-18")).toBe("manquee");
  });
});

describe("compterManquees", () => {
  it("ignore les étapes qui ne sont pas des rendez-vous", () => {
    const etapes = [
      { code: "cpn1", datePrevue: "2026-05-01", toleranceManqueJours: 7, rendezVous: true },
      { code: "cpn2", datePrevue: "2026-07-01", toleranceManqueJours: 7, rendezVous: true },
      { code: "accouchement", datePrevue: "2026-08-01", toleranceManqueJours: 14, rendezVous: false },
    ] as EtapePlanifiee[];
    expect(compterManquees(etapes, new Set(["cpn1"]), "2026-09-25")).toBe(1);
  });
});
```

Créer `src/domain/evenements.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { evenementSchema } from "./evenements";

describe("evenementSchema", () => {
  it("accepte une consultation avec une tension", () => {
    const r = evenementSchema.safeParse({
      type: "consultation",
      donnees: { motif: "tension", etape: "controle-1", mesures: { tensionSys: 150, tensionDia: 95 } },
    });
    expect(r.success).toBe(true);
  });

  it("refuse une tension impossible", () => {
    const r = evenementSchema.safeParse({ type: "mesure", donnees: { mesures: { tensionSys: 900, tensionDia: 95 } } });
    expect(r.success).toBe(false);
  });

  it("refuse une vaccination sans vaccin", () => {
    expect(evenementSchema.safeParse({ type: "vaccination", donnees: { etape: "6sem", vaccins: [] } }).success).toBe(false);
  });

  it("accepte une prise de médicament", () => {
    const r = evenementSchema.safeParse({
      type: "prise_medicament",
      donnees: { traitement: "Amlodipine 5 mg", moment: "soir", statut: "fait" },
    });
    expect(r.success).toBe(true);
  });

  it("refuse un type inconnu", () => {
    expect(evenementSchema.safeParse({ type: "inconnu", donnees: {} }).success).toBe(false);
  });
});
```

- [ ] **Étape 2 : lancer les tests pour les voir échouer**

Run : `pnpm vitest run src/domain/statuts.test.ts src/domain/evenements.test.ts`
Expected : FAIL, modules introuvables.

- [ ] **Étape 3 : écrire les modules**

Créer `src/domain/statuts.ts` :

```ts
import type { EtapePlanifiee } from "./calendrier";
import { joursEntre, type DateISO } from "./dates";

export type StatutEtape = "faite" | "a_venir" | "manquee";

export function statutEtape(
  etape: { datePrevue: DateISO; toleranceManqueJours: number },
  faite: boolean,
  aujourdhui: DateISO,
): StatutEtape {
  if (faite) return "faite";
  return joursEntre(etape.datePrevue, aujourdhui) > etape.toleranceManqueJours ? "manquee" : "a_venir";
}

export function compterManquees(etapes: EtapePlanifiee[], codesFaits: ReadonlySet<string>, aujourdhui: DateISO): number {
  return etapes.filter((e) => e.rendezVous && statutEtape(e, codesFaits.has(e.code), aujourdhui) === "manquee").length;
}
```

Créer `src/domain/evenements.ts` :

```ts
import { z } from "zod";
import { MOTIFS_RDV } from "./programmes/types";

export const mesuresSchema = z.object({
  tensionSys: z.number().int().min(50).max(300).optional(),
  tensionDia: z.number().int().min(30).max(200).optional(),
  glycemieGL: z.number().min(0.2).max(6).optional(),
  hemoglobineGDL: z.number().min(3).max(25).optional(),
  poidsKg: z.number().min(0.5).max(300).optional(),
});

export const evenementSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("consultation"),
    donnees: z.object({
      motif: z.enum(MOTIFS_RDV),
      etape: z.string().min(1).optional(),
      mesures: mesuresSchema.default({}),
      notes: z.string().max(2000).optional(),
    }),
  }),
  z.object({
    type: z.literal("mesure"),
    donnees: z.object({ mesures: mesuresSchema }),
  }),
  z.object({
    type: z.literal("vaccination"),
    donnees: z.object({ etape: z.string().min(1), vaccins: z.array(z.string().min(1)).min(1) }),
  }),
  z.object({
    type: z.literal("prise_medicament"),
    donnees: z.object({
      traitement: z.string().min(1),
      moment: z.enum(["matin", "midi", "soir"]),
      statut: z.enum(["fait", "plus_tard"]),
    }),
  }),
]);

export type EvenementValide = z.infer<typeof evenementSchema>;
export type TypeEvenement = EvenementValide["type"];
```

- [ ] **Étape 4 : lancer les tests**

Run : `pnpm vitest run src/domain`
Expected : tous les tests du domaine passent.

- [ ] **Étape 5 : commit**

```bash
git add src/domain
git commit -m "feat(domaine): statuts des étapes et schémas des événements"
```

---

### Tâche 9 : base de données, migrations et base de test

**Fichiers :**
- Créer : `src/server/db/schema.ts`, `src/server/db/client.ts`, `src/server/db/test-utils.ts`, `drizzle.config.ts`, `drizzle/*` (généré)
- Test : `src/server/db/schema.test.ts`

**Interfaces :**
- Consomme : `CODES_PROGRAMMES`, `MOTIFS_RDV` (tâche 6), `env` (tâche 2).
- Produit :
  - tables Drizzle : `communes`, `etablissements`, `comptes`, `sessions`, `foyers`, `patients`, `contacts`, `consentements`, `responsables`, `inscriptions`, `modelesPlages`, `creneaux`, `rendezVous`, `evenements`, `ordonnances`, `contenus`, `contenusTraductions` ;
  - constantes et types : `ROLES_COMPTE` / `RoleCompte`, `LIENS_RESPONSABLE` / `LienResponsable`, `LANGUES` / `Langue`, `CANAUX` / `Canal`, `LigneOrdonnance` ;
  - `type Db` ; `ouvrirConnexion(url: string): { db: Db; migrer(): Promise<void>; fermer(): Promise<void> }` ; `connexion()` ; `db(): Db` ;
  - `creerDbDeTest(): Promise<{ db: Db; fermer(): Promise<void> }>`.

- [ ] **Étape 1 : écrire le schéma**

Créer `src/server/db/schema.ts` (imports relatifs uniquement : drizzle-kit ne résout pas l'alias `@/`) :

```ts
import {
  boolean,
  date,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { CODES_PROGRAMMES, MOTIFS_RDV } from "../../domain/programmes/types";

export const ROLES_COMPTE = ["patient", "relais", "soignant", "pharmacie", "pilotage", "admin"] as const;
export type RoleCompte = (typeof ROLES_COMPTE)[number];
/** Relation du titulaire du compte avec la personne dont il gère le carnet. */
export const LIENS_RESPONSABLE = ["soi", "conjoint", "parent", "enfant", "aidant"] as const;
export type LienResponsable = (typeof LIENS_RESPONSABLE)[number];
export const LANGUES = ["fr", "fon", "adja", "yo", "bariba", "dendi"] as const;
export type Langue = (typeof LANGUES)[number];
export const CANAUX = ["whatsapp", "sms", "vocal", "relais"] as const;
export type Canal = (typeof CANAUX)[number];

export const roleCompte = pgEnum("role_compte", ROLES_COMPTE);
export const typeEtablissement = pgEnum("type_etablissement", ["centre_sante", "pharmacie"]);
export const langue = pgEnum("langue", LANGUES);
export const canal = pgEnum("canal", CANAUX);
export const sexe = pgEnum("sexe", ["F", "M"]);
export const lienResponsable = pgEnum("lien_responsable", LIENS_RESPONSABLE);
export const roleContact = pgEnum("role_contact", ["principal", "secours"]);
export const proprietaireContact = pgEnum("proprietaire_contact", ["soi", "proche", "relais"]);
export const codeProgramme = pgEnum("code_programme", CODES_PROGRAMMES);
export const motifRdv = pgEnum("motif_rdv", MOTIFS_RDV);
export const moment = pgEnum("moment", ["matin", "apres_midi"]);
export const sourceRdv = pgEnum("source_rdv", ["programme", "patient", "relais", "soignant"]);

const horodatage = (nom: string) => timestamp(nom, { withTimezone: true });
const creeLe = () => horodatage("cree_le").defaultNow().notNull();

export const communes = pgTable("communes", {
  id: uuid("id").primaryKey().defaultRandom(),
  nom: text("nom").notNull(),
  departement: text("departement").notNull(),
});

export const etablissements = pgTable("etablissements", {
  id: uuid("id").primaryKey().defaultRandom(),
  nom: text("nom").notNull(),
  type: typeEtablissement("type").notNull(),
  communeId: uuid("commune_id").notNull().references(() => communes.id),
  telephone: text("telephone"),
});

export const comptes = pgTable("comptes", {
  id: uuid("id").primaryKey().defaultRandom(),
  role: roleCompte("role").notNull(),
  /** Téléphone normalisé (+229…) pour les patients, nom d'utilisateur pour le personnel. */
  identifiant: text("identifiant").notNull().unique(),
  nomAffiche: text("nom_affiche").notNull(),
  empreinteSecret: text("empreinte_secret").notNull(),
  etablissementId: uuid("etablissement_id").references(() => etablissements.id),
  communeId: uuid("commune_id").references(() => communes.id),
  echecsConnexion: integer("echecs_connexion").notNull().default(0),
  verrouilleJusqua: horodatage("verrouille_jusqua"),
  creeLe: creeLe(),
});

export const sessions = pgTable("sessions", {
  /** Empreinte SHA-256 du jeton : le jeton lui-même n'est jamais stocké. */
  id: text("id").primaryKey(),
  compteId: uuid("compte_id")
    .notNull()
    .references(() => comptes.id, { onDelete: "cascade" }),
  expireLe: horodatage("expire_le").notNull(),
  creeLe: creeLe(),
});

export const foyers = pgTable("foyers", {
  id: uuid("id").primaryKey().defaultRandom(),
  nom: text("nom").notNull(),
  village: text("village").notNull(),
  communeId: uuid("commune_id").notNull().references(() => communes.id),
  relaisId: uuid("relais_id").references(() => comptes.id),
  creeLe: creeLe(),
});

export const patients = pgTable("patients", {
  id: uuid("id").primaryKey().defaultRandom(),
  foyerId: uuid("foyer_id").references(() => foyers.id),
  prenom: text("prenom").notNull(),
  nom: text("nom").notNull(),
  dateNaissance: date("date_naissance", { mode: "string" }).notNull(),
  sexe: sexe("sexe").notNull(),
  langue: langue("langue").notNull().default("fon"),
  canalPrefere: canal("canal_prefere").notNull().default("sms"),
  malvoyant: boolean("malvoyant").notNull().default(false),
  malentendant: boolean("malentendant").notNull().default(false),
  codeCourt: text("code_court").notNull().unique(),
  etablissementId: uuid("etablissement_id").notNull().references(() => etablissements.id),
  mereId: uuid("mere_id").references((): AnyPgColumn => patients.id),
  antecedents: jsonb("antecedents").$type<{ cesarienne?: boolean }>().notNull().default({}),
  creeLe: creeLe(),
});

export const contacts = pgTable("contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  patientId: uuid("patient_id")
    .notNull()
    .references(() => patients.id, { onDelete: "cascade" }),
  telephone: text("telephone").notNull(),
  role: roleContact("role").notNull(),
  proprietaire: proprietaireContact("proprietaire").notNull(),
  verifieLe: horodatage("verifie_le"),
});

export const consentements = pgTable("consentements", {
  id: uuid("id").primaryKey().defaultRandom(),
  patientId: uuid("patient_id")
    .notNull()
    .references(() => patients.id, { onDelete: "cascade" }),
  canal: canal("canal").notNull(),
  accordeLe: horodatage("accorde_le").defaultNow().notNull(),
  retireLe: horodatage("retire_le"),
  recueilliPar: uuid("recueilli_par").references(() => comptes.id),
});

export const responsables = pgTable(
  "responsables",
  {
    compteId: uuid("compte_id")
      .notNull()
      .references(() => comptes.id, { onDelete: "cascade" }),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    lien: lienResponsable("lien").notNull(),
  },
  (t) => [primaryKey({ columns: [t.compteId, t.patientId] })],
);

export const inscriptions = pgTable("inscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  patientId: uuid("patient_id")
    .notNull()
    .references(() => patients.id, { onDelete: "cascade" }),
  programme: codeProgramme("programme").notNull(),
  dateReference: date("date_reference", { mode: "string" }).notNull(),
  dateInscription: date("date_inscription", { mode: "string" }).notNull(),
  active: boolean("active").notNull().default(true),
  creeLe: creeLe(),
});

export const modelesPlages = pgTable("modeles_plages", {
  id: uuid("id").primaryKey().defaultRandom(),
  etablissementId: uuid("etablissement_id").notNull().references(() => etablissements.id),
  motif: motifRdv("motif").notNull(),
  /** 1 = lundi … 7 = dimanche. */
  jourSemaine: integer("jour_semaine").notNull(),
  moment: moment("moment").notNull(),
  capacite: integer("capacite").notNull(),
});

export const creneaux = pgTable(
  "creneaux",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    etablissementId: uuid("etablissement_id").notNull().references(() => etablissements.id),
    motif: motifRdv("motif").notNull(),
    date: date("date", { mode: "string" }).notNull(),
    moment: moment("moment").notNull(),
    capacite: integer("capacite").notNull(),
  },
  (t) => [uniqueIndex("creneaux_unique").on(t.etablissementId, t.motif, t.date, t.moment)],
);

export const rendezVous = pgTable("rendez_vous", {
  id: uuid("id").primaryKey().defaultRandom(),
  patientId: uuid("patient_id")
    .notNull()
    .references(() => patients.id, { onDelete: "cascade" }),
  inscriptionId: uuid("inscription_id").references(() => inscriptions.id, { onDelete: "set null" }),
  etapeCode: text("etape_code"),
  motif: motifRdv("motif").notNull(),
  datePrevue: date("date_prevue", { mode: "string" }).notNull(),
  moment: moment("moment"),
  creneauId: uuid("creneau_id").references(() => creneaux.id),
  etablissementId: uuid("etablissement_id").notNull().references(() => etablissements.id),
  source: sourceRdv("source").notNull(),
  reserveLe: horodatage("reserve_le"),
  annuleLe: horodatage("annule_le"),
  creeLe: creeLe(),
});

export const evenements = pgTable("evenements", {
  /** Identifiant créé sur l'appareil (UUID) : rend la synchronisation hors-ligne idempotente. */
  id: uuid("id").primaryKey(),
  patientId: uuid("patient_id")
    .notNull()
    .references(() => patients.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  auteurId: uuid("auteur_id").references(() => comptes.id),
  survenuLe: horodatage("survenu_le").notNull(),
  recuLe: horodatage("recu_le").defaultNow().notNull(),
  donnees: jsonb("donnees").$type<Record<string, unknown>>().notNull(),
});

export type LigneOrdonnance = { medicament: string; matin: number; midi: number; soir: number; dureeJours: number };

export const ordonnances = pgTable("ordonnances", {
  id: uuid("id").primaryKey().defaultRandom(),
  patientId: uuid("patient_id")
    .notNull()
    .references(() => patients.id, { onDelete: "cascade" }),
  prescripteurId: uuid("prescripteur_id").notNull().references(() => comptes.id),
  lignes: jsonb("lignes").$type<LigneOrdonnance[]>().notNull(),
  codeRetrait: text("code_retrait").notNull().unique(),
  emiseLe: horodatage("emise_le").defaultNow().notNull(),
});

export const contenus = pgTable("contenus", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  categorie: text("categorie").notNull(),
  pictogramme: text("pictogramme").notNull(),
});

export const contenusTraductions = pgTable(
  "contenus_traductions",
  {
    contenuId: uuid("contenu_id")
      .notNull()
      .references(() => contenus.id, { onDelete: "cascade" }),
    langue: langue("langue").notNull(),
    texte: text("texte").notNull(),
    audioMp3: text("audio_mp3"),
    audioOgg: text("audio_ogg"),
    videoSignes: text("video_signes"),
  },
  (t) => [primaryKey({ columns: [t.contenuId, t.langue] })],
);
```

- [ ] **Étape 2 : configurer drizzle-kit et générer la migration**

Créer `drizzle.config.ts` :

```ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
});
```

Run : `pnpm db:generate --name socle`
Expected : un fichier `drizzle/0000_socle.sql` et `drizzle/meta/_journal.json` sont créés.

- [ ] **Étape 3 : écrire la connexion et la base de test**

Créer `src/server/db/client.ts` :

```ts
import path from "node:path";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { env } from "@/config/env";
import * as schema from "./schema";

/** Type commun à Postgres (développement, production) et PGlite (tests). */
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

export interface Connexion {
  db: Db;
  migrer(): Promise<void>;
  fermer(): Promise<void>;
}

export const DOSSIER_MIGRATIONS = path.join(process.cwd(), "drizzle");

export function ouvrirConnexion(url: string): Connexion {
  const client = postgres(url, { max: 10 });
  const base = drizzle({ client, schema });
  return {
    db: base as unknown as Db,
    migrer: () => migrate(base, { migrationsFolder: DOSSIER_MIGRATIONS }),
    fermer: () => client.end(),
  };
}

const globale = globalThis as typeof globalThis & { __connexionSante?: Connexion };

/** Connexion unique au processus (réutilisée par le rechargement à chaud en développement). */
export function connexion(): Connexion {
  if (!env.DATABASE_URL) throw new Error("DATABASE_URL n'est pas définie (voir .env.example).");
  globale.__connexionSante ??= ouvrirConnexion(env.DATABASE_URL);
  return globale.__connexionSante;
}

export const db = (): Db => connexion().db;
```

Créer `src/server/db/test-utils.ts` :

```ts
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { DOSSIER_MIGRATIONS, type Db } from "./client";
import * as schema from "./schema";

/** Base Postgres en mémoire (PGlite), migrée, propre à chaque test. */
export async function creerDbDeTest(): Promise<{ db: Db; fermer: () => Promise<void> }> {
  const client = new PGlite();
  const base = drizzle({ client, schema });
  await migrate(base, { migrationsFolder: DOSSIER_MIGRATIONS });
  return { db: base as unknown as Db, fermer: () => client.close() };
}
```

- [ ] **Étape 4 : écrire le test du schéma**

Créer `src/server/db/schema.test.ts` :

```ts
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "./client";
import { communes, comptes, etablissements, patients, responsables } from "./schema";
import { creerDbDeTest } from "./test-utils";

let db: Db;
let fermer: () => Promise<void>;

beforeEach(async () => {
  ({ db, fermer } = await creerDbDeTest());
});
afterEach(async () => fermer());

async function etablissement() {
  const [commune] = await db.insert(communes).values({ nom: "Bohicon", departement: "Zou" }).returning();
  const [cs] = await db
    .insert(etablissements)
    .values({ nom: "Centre de santé de Bohicon", type: "centre_sante", communeId: commune!.id })
    .returning();
  return cs!;
}

describe("schéma", () => {
  it("applique les migrations et enregistre un patient", async () => {
    const cs = await etablissement();
    await db.insert(patients).values({
      prenom: "Codjo",
      nom: "Houngbo",
      dateNaissance: "1968-03-12",
      sexe: "M",
      codeCourt: "HNG7K2",
      etablissementId: cs.id,
    });
    const [lu] = await db.select().from(patients).where(eq(patients.codeCourt, "HNG7K2"));
    expect(lu?.dateNaissance).toBe("1968-03-12");
    expect(lu?.langue).toBe("fon");
    expect(lu?.antecedents).toEqual({});
  });

  it("refuse deux carnets avec le même code", async () => {
    const cs = await etablissement();
    const patient = { prenom: "A", nom: "B", dateNaissance: "2000-01-01", sexe: "F" as const, codeCourt: "DBL001", etablissementId: cs.id };
    await db.insert(patients).values(patient);
    await expect(db.insert(patients).values(patient)).rejects.toThrow();
  });

  it("refuse de lier deux fois le même carnet au même compte", async () => {
    const cs = await etablissement();
    const [compte] = await db
      .insert(comptes)
      .values({ role: "patient", identifiant: "+2290197000001", nomAffiche: "Codjo", empreinteSecret: "x" })
      .returning();
    const [patient] = await db
      .insert(patients)
      .values({ prenom: "Codjo", nom: "Houngbo", dateNaissance: "1968-03-12", sexe: "M", codeCourt: "HNG001", etablissementId: cs.id })
      .returning();
    const lien = { compteId: compte!.id, patientId: patient!.id, lien: "soi" as const };
    await db.insert(responsables).values(lien);
    await expect(db.insert(responsables).values(lien)).rejects.toThrow();
  });
});
```

- [ ] **Étape 5 : lancer le test**

Run : `pnpm vitest run src/server/db`
Expected : `3 passed`.

- [ ] **Étape 6 : créer la base de développement**

Demander le mot de passe de l'utilisateur `postgres` à l'utilisateur, puis :

```bash
"H:/Postgres/bin/psql.exe" -U postgres -h localhost -c "CREATE DATABASE sante"
cp .env.example .env.local
```

Remplacer `MOT_DE_PASSE` dans `.env.local` par le vrai mot de passe. `.env.local` n'est jamais commité.

- [ ] **Étape 7 : commit**

```bash
git add src/server drizzle drizzle.config.ts
git commit -m "feat(base): schéma, migrations, connexion Postgres et base de test PGlite"
```

---

### Tâche 10 : connexion, sessions et verrouillage

**Fichiers :**
- Créer : `src/server/auth/mots-de-passe.ts`, `src/server/auth/sessions.ts`, `src/server/auth/connexion.ts`, `src/server/droits.ts`
- Test : `src/server/auth/auth.test.ts`, `src/server/droits.test.ts`

**Interfaces :**
- Consomme : `Db`, `comptes`, `sessions`, `RoleCompte` (tâche 9), `creerDbDeTest` (tâche 9).
- Produit :
  - `hacher(secret: string): Promise<string>` ; `verifier(secret: string, empreinte: string): Promise<boolean>` ;
  - `DUREE_SESSION_JOURS = 30` ; `creerSession(db, compteId, maintenant?): Promise<{ jeton: string; expireLe: Date }>` ; `lireSession(db, jeton: string | undefined, maintenant?): Promise<CompteConnecte | null>` ; `supprimerSession(db, jeton): Promise<void>` ; `interface CompteConnecte { id: string; role: RoleCompte; nomAffiche: string; etablissementId: string | null; communeId: string | null }` ;
  - `ECHECS_MAX = 5`, `VERROU_MINUTES = 15` ; `verifierIdentifiants(db, identifiant, secret, maintenant?): Promise<ResultatConnexion>` avec `ResultatConnexion = { ok: true; compteId: string; role: RoleCompte } | { ok: false; raison: "identifiants" | "verrouille"; jusqua?: Date }` ;
  - `accueilDuRole(role: RoleCompte): string`.

- [ ] **Étape 1 : écrire les tests**

Créer `src/server/auth/auth.test.ts` :

```ts
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "../db/client";
import { comptes } from "../db/schema";
import { creerDbDeTest } from "../db/test-utils";
import { ECHECS_MAX, verifierIdentifiants } from "./connexion";
import { hacher, verifier } from "./mots-de-passe";
import { creerSession, lireSession, supprimerSession } from "./sessions";

let db: Db;
let fermer: () => Promise<void>;
const T0 = new Date("2026-09-25T10:00:00Z");
const plusMinutes = (m: number) => new Date(T0.getTime() + m * 60_000);

beforeEach(async () => {
  ({ db, fermer } = await creerDbDeTest());
  await db.insert(comptes).values({
    role: "patient",
    identifiant: "+2290197000001",
    nomAffiche: "Codjo Houngbo",
    empreinteSecret: await hacher("1234"),
  });
});
afterEach(async () => fermer());

describe("empreintes", () => {
  it("vérifie le bon secret et refuse le mauvais", async () => {
    const empreinte = await hacher("1234");
    expect(empreinte.startsWith("scrypt$")).toBe(true);
    expect(await verifier("1234", empreinte)).toBe(true);
    expect(await verifier("4321", empreinte)).toBe(false);
    expect(await verifier("1234", "format-inconnu")).toBe(false);
  });
});

describe("verifierIdentifiants", () => {
  it("connecte avec le bon code", async () => {
    const r = await verifierIdentifiants(db, "+2290197000001", "1234", T0);
    expect(r).toMatchObject({ ok: true, role: "patient" });
  });

  it("refuse un code faux ou un compte inconnu avec le même message", async () => {
    expect(await verifierIdentifiants(db, "+2290197000001", "0000", T0)).toEqual({ ok: false, raison: "identifiants" });
    expect(await verifierIdentifiants(db, "+2290197999999", "1234", T0)).toEqual({ ok: false, raison: "identifiants" });
  });

  it("verrouille après 5 codes faux, refuse le bon code pendant 15 minutes, puis l'accepte", async () => {
    for (let i = 1; i < ECHECS_MAX; i++) {
      expect(await verifierIdentifiants(db, "+2290197000001", "0000", T0)).toEqual({ ok: false, raison: "identifiants" });
    }
    const cinquieme = await verifierIdentifiants(db, "+2290197000001", "0000", T0);
    expect(cinquieme).toMatchObject({ ok: false, raison: "verrouille" });
    expect(await verifierIdentifiants(db, "+2290197000001", "1234", plusMinutes(10))).toMatchObject({ ok: false, raison: "verrouille" });
    expect(await verifierIdentifiants(db, "+2290197000001", "1234", plusMinutes(16))).toMatchObject({ ok: true });
  });

  it("remet le compteur à zéro après une connexion réussie", async () => {
    for (let i = 0; i < ECHECS_MAX - 1; i++) await verifierIdentifiants(db, "+2290197000001", "0000", T0);
    await verifierIdentifiants(db, "+2290197000001", "1234", T0);
    expect(await verifierIdentifiants(db, "+2290197000001", "0000", T0)).toEqual({ ok: false, raison: "identifiants" });
  });
});

describe("sessions", () => {
  async function compteId() {
    const r = await verifierIdentifiants(db, "+2290197000001", "1234", T0);
    if (!r.ok) throw new Error("connexion impossible");
    return r.compteId;
  }

  it("retrouve le compte à partir du jeton", async () => {
    const { jeton } = await creerSession(db, await compteId(), T0);
    expect(await lireSession(db, jeton, plusMinutes(5))).toMatchObject({ nomAffiche: "Codjo Houngbo", role: "patient" });
  });

  it("traite comme déconnecté un jeton absent, inconnu ou expiré", async () => {
    const { jeton } = await creerSession(db, await compteId(), T0);
    expect(await lireSession(db, undefined)).toBeNull();
    expect(await lireSession(db, "jeton-inconnu", T0)).toBeNull();
    expect(await lireSession(db, jeton, plusMinutes(31 * 24 * 60))).toBeNull();
  });

  it("oublie la session à la déconnexion", async () => {
    const { jeton } = await creerSession(db, await compteId(), T0);
    await supprimerSession(db, jeton);
    expect(await lireSession(db, jeton, T0)).toBeNull();
  });
});
```

Créer `src/server/droits.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { accueilDuRole } from "./droits";

describe("accueilDuRole", () => {
  it.each([
    ["patient", "/"],
    ["relais", "/relais"],
    ["soignant", "/soignant"],
    ["pharmacie", "/pharmacie"],
    ["pilotage", "/pilotage"],
    ["admin", "/admin"],
  ] as const)("envoie %s vers %s", (role, chemin) => {
    expect(accueilDuRole(role)).toBe(chemin);
  });
});
```

- [ ] **Étape 2 : lancer les tests pour les voir échouer**

Run : `pnpm vitest run src/server/auth src/server/droits.test.ts`
Expected : FAIL, modules introuvables.

- [ ] **Étape 3 : écrire les modules**

Créer `src/server/auth/mots-de-passe.ts` :

```ts
import { randomBytes, scrypt as scryptRappel, timingSafeEqual, type ScryptOptions } from "node:crypto";

function scrypt(secret: string, sel: Buffer, longueur: number, options: ScryptOptions): Promise<Buffer> {
  return new Promise((resoudre, rejeter) =>
    scryptRappel(secret, sel, longueur, options, (erreur, cle) => (erreur ? rejeter(erreur) : resoudre(cle))),
  );
}

const N = 16384;
const R = 8;
const P = 1;
const LONGUEUR = 32;
const MEMOIRE_MAX = 64 * 1024 * 1024;

/** Empreinte au format scrypt$N$r$p$sel$cle (base64url). */
export async function hacher(secret: string): Promise<string> {
  const sel = randomBytes(16);
  const cle = await scrypt(secret, sel, LONGUEUR, { N, r: R, p: P, maxmem: MEMOIRE_MAX });
  return ["scrypt", N, R, P, sel.toString("base64url"), cle.toString("base64url")].join("$");
}

export async function verifier(secret: string, empreinte: string): Promise<boolean> {
  const [algo, n, r, p, sel, cle] = empreinte.split("$");
  if (algo !== "scrypt" || !n || !r || !p || !sel || !cle) return false;
  const attendue = Buffer.from(cle, "base64url");
  const calculee = await scrypt(secret, Buffer.from(sel, "base64url"), attendue.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
    maxmem: MEMOIRE_MAX,
  });
  return calculee.length === attendue.length && timingSafeEqual(calculee, attendue);
}
```

Créer `src/server/auth/sessions.ts` :

```ts
import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import type { Db } from "../db/client";
import { comptes, sessions, type RoleCompte } from "../db/schema";

export const DUREE_SESSION_JOURS = 30;

export interface CompteConnecte {
  id: string;
  role: RoleCompte;
  nomAffiche: string;
  etablissementId: string | null;
  communeId: string | null;
}

const empreinte = (jeton: string) => createHash("sha256").update(jeton).digest("hex");

export async function creerSession(db: Db, compteId: string, maintenant = new Date()) {
  const jeton = randomBytes(32).toString("base64url");
  const expireLe = new Date(maintenant.getTime() + DUREE_SESSION_JOURS * 86_400_000);
  await db.insert(sessions).values({ id: empreinte(jeton), compteId, expireLe });
  return { jeton, expireLe };
}

export async function lireSession(db: Db, jeton: string | undefined, maintenant = new Date()): Promise<CompteConnecte | null> {
  if (!jeton) return null;
  const [ligne] = await db
    .select({
      id: comptes.id,
      role: comptes.role,
      nomAffiche: comptes.nomAffiche,
      etablissementId: comptes.etablissementId,
      communeId: comptes.communeId,
    })
    .from(sessions)
    .innerJoin(comptes, eq(sessions.compteId, comptes.id))
    .where(and(eq(sessions.id, empreinte(jeton)), gt(sessions.expireLe, maintenant)))
    .limit(1);
  return ligne ?? null;
}

export async function supprimerSession(db: Db, jeton: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, empreinte(jeton)));
}
```

Créer `src/server/auth/connexion.ts` :

```ts
import { eq } from "drizzle-orm";
import type { Db } from "../db/client";
import { comptes, type RoleCompte } from "../db/schema";
import { verifier } from "./mots-de-passe";

export const ECHECS_MAX = 5;
export const VERROU_MINUTES = 15;

export type ResultatConnexion =
  | { ok: true; compteId: string; role: RoleCompte }
  | { ok: false; raison: "identifiants" | "verrouille"; jusqua?: Date };

/** Empreinte factice : un compte inconnu coûte le même temps de calcul qu'un compte existant. */
const EMPREINTE_FACTICE = `scrypt$16384$8$1$${"A".repeat(22)}$${"A".repeat(43)}`;

export async function verifierIdentifiants(db: Db, identifiant: string, secret: string, maintenant = new Date()): Promise<ResultatConnexion> {
  const [compte] = await db.select().from(comptes).where(eq(comptes.identifiant, identifiant)).limit(1);
  if (!compte) {
    await verifier(secret, EMPREINTE_FACTICE);
    return { ok: false, raison: "identifiants" };
  }
  if (compte.verrouilleJusqua && compte.verrouilleJusqua > maintenant) {
    return { ok: false, raison: "verrouille", jusqua: compte.verrouilleJusqua };
  }
  if (!(await verifier(secret, compte.empreinteSecret))) {
    const echecs = compte.echecsConnexion + 1;
    const verrou = echecs >= ECHECS_MAX ? new Date(maintenant.getTime() + VERROU_MINUTES * 60_000) : null;
    await db
      .update(comptes)
      .set({ echecsConnexion: verrou ? 0 : echecs, verrouilleJusqua: verrou })
      .where(eq(comptes.id, compte.id));
    return verrou ? { ok: false, raison: "verrouille", jusqua: verrou } : { ok: false, raison: "identifiants" };
  }
  await db.update(comptes).set({ echecsConnexion: 0, verrouilleJusqua: null }).where(eq(comptes.id, compte.id));
  return { ok: true, compteId: compte.id, role: compte.role };
}
```

Créer `src/server/droits.ts` :

```ts
import type { RoleCompte } from "./db/schema";

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
```

- [ ] **Étape 4 : lancer les tests**

Run : `pnpm vitest run src/server`
Expected : tous les tests passent (`schema`, `auth`, `droits`).

- [ ] **Étape 5 : écrire le pont avec les cookies de Next.js**

Créer `src/server/auth/cookies.ts` (non testé unitairement : il ne fait que relier les cookies de Next.js aux fonctions testées) :

```ts
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { env } from "@/config/env";
import { db } from "../db/client";
import type { RoleCompte } from "../db/schema";
import { accueilDuRole } from "../droits";
import { creerSession, lireSession, supprimerSession, type CompteConnecte } from "./sessions";

export const NOM_COOKIE = "session";

export async function ouvrirSession(compteId: string): Promise<void> {
  const { jeton, expireLe } = await creerSession(db(), compteId);
  (await cookies()).set(NOM_COOKIE, jeton, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    path: "/",
    expires: expireLe,
  });
}

export async function compteCourant(): Promise<CompteConnecte | null> {
  const jeton = (await cookies()).get(NOM_COOKIE)?.value;
  return lireSession(db(), jeton);
}

/** Exige une session d'un des rôles donnés ; sinon renvoie vers la connexion ou vers l'espace du rôle. */
export async function exigerRole(...roles: RoleCompte[]): Promise<CompteConnecte> {
  const compte = await compteCourant();
  if (!compte) redirect("/connexion");
  if (!roles.includes(compte.role)) redirect(accueilDuRole(compte.role));
  return compte;
}

export async function fermerSession(): Promise<void> {
  const magasin = await cookies();
  const jeton = magasin.get(NOM_COOKIE)?.value;
  if (jeton) await supprimerSession(db(), jeton);
  magasin.delete(NOM_COOKIE);
}
```

- [ ] **Étape 6 : vérifier les types**

Run : `pnpm typecheck`
Expected : aucune erreur.

- [ ] **Étape 7 : commit**

```bash
git add src/server
git commit -m "feat(auth): empreintes scrypt, sessions et verrouillage après 5 essais"
```

---

### Tâche 11 : données de démonstration

**Fichiers :**
- Créer : `src/server/demo/donnees.ts`, `src/server/demo/semer.ts`, `scripts/seed.ts`
- Test : `src/server/demo/semer.test.ts`

**Interfaces :**
- Consomme : tables (tâche 9), `hacher` (tâche 10), `planifier`, `PROGRAMMES` (tâche 6), `ajouterJours`, `joursEntre`, `DateISO` (tâche 5).
- Produit : `COMPTES_DEMO: CompteDemo[]` avec `interface CompteDemo { identifiant: string; secret: string; role: RoleCompte; nomAffiche: string; description: string }` ; `semerDemo(db: Db, options: { aujourdhui: DateISO }): Promise<BilanDemo>` avec `interface BilanDemo { comptes: number; foyers: number; patients: number; rendezVous: number; evenements: number }`.

- [ ] **Étape 1 : écrire le test**

Créer `src/server/demo/semer.test.ts` :

```ts
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { verifierIdentifiants } from "../auth/connexion";
import type { Db } from "../db/client";
import { comptes, creneaux, patients, responsables } from "../db/schema";
import { creerDbDeTest } from "../db/test-utils";
import { COMPTES_DEMO } from "./donnees";
import { semerDemo } from "./semer";

let db: Db;
let fermer: () => Promise<void>;
const aujourdhui = "2026-09-25";

beforeEach(async () => {
  ({ db, fermer } = await creerDbDeTest());
});
afterEach(async () => fermer());

describe("semerDemo", () => {
  it("crée les personnages, les comptes et un historique", async () => {
    const bilan = await semerDemo(db, { aujourdhui });
    expect(bilan.comptes).toBe(COMPTES_DEMO.length);
    expect(bilan.foyers).toBe(24);
    expect(bilan.patients).toBeGreaterThanOrEqual(47);
    expect(bilan.rendezVous).toBeGreaterThan(80);
    expect(bilan.evenements).toBeGreaterThan(40);
  });

  it("donne à Codjo les carnets de sa femme et de son petit-fils", async () => {
    await semerDemo(db, { aujourdhui });
    const [codjo] = await db.select().from(comptes).where(eq(comptes.identifiant, "+2290197000001"));
    const carnets = await db
      .select({ prenom: patients.prenom, lien: responsables.lien })
      .from(responsables)
      .innerJoin(patients, eq(responsables.patientId, patients.id))
      .where(eq(responsables.compteId, codjo!.id));
    expect(carnets.map((c) => `${c.prenom}:${c.lien}`).sort()).toEqual(["Codjo:soi", "Mariam:conjoint", "Sèna:aidant"]);
  });

  it("permet de se connecter avec chaque compte de démonstration", async () => {
    await semerDemo(db, { aujourdhui });
    for (const compte of COMPTES_DEMO) {
      expect(await verifierIdentifiants(db, compte.identifiant, compte.secret)).toMatchObject({ ok: true, role: compte.role });
    }
  });

  it("ouvre des places sur les 3 prochaines semaines", async () => {
    await semerDemo(db, { aujourdhui });
    const places = await db.select().from(creneaux);
    expect(places.length).toBeGreaterThan(30);
    expect(places.every((c) => c.date >= aujourdhui && c.date <= "2026-10-16")).toBe(true);
  });

  it("peut être relancée sans erreur et donne le même résultat", async () => {
    const premier = await semerDemo(db, { aujourdhui });
    const second = await semerDemo(db, { aujourdhui });
    expect(second).toEqual(premier);
  });
});
```

- [ ] **Étape 2 : lancer le test pour le voir échouer**

Run : `pnpm vitest run src/server/demo`
Expected : FAIL, modules introuvables.

- [ ] **Étape 3 : écrire les comptes de démonstration**

Créer `src/server/demo/donnees.ts` :

```ts
import type { RoleCompte } from "../db/schema";

export interface CompteDemo {
  identifiant: string;
  secret: string;
  role: RoleCompte;
  nomAffiche: string;
  description: string;
}

/** Comptes fictifs. Codes et mots de passe publics : réservés à la démonstration. */
export const COMPTES_DEMO: CompteDemo[] = [
  { identifiant: "+2290197000001", secret: "1234", role: "patient", nomAffiche: "Codjo Houngbo", description: "58 ans, suit sa tension, gère les carnets de sa femme et de son petit-fils" },
  { identifiant: "+2290197000002", secret: "1234", role: "patient", nomAffiche: "Awa Hounkpatin", description: "Enceinte de 32 semaines" },
  { identifiant: "+2290197000004", secret: "1234", role: "patient", nomAffiche: "Aïcha Salifou", description: "S'occupe de sa mère Rachida, 71 ans, malvoyante et diabétique" },
  { identifiant: "koffi.agbessi", secret: "demo1234", role: "relais", nomAffiche: "Koffi Agbessi", description: "Relais communautaire de Sèhoun" },
  { identifiant: "adjoa.gbaguidi", secret: "demo1234", role: "soignant", nomAffiche: "Adjoa Gbaguidi", description: "Sage-femme, centre de santé de Bohicon" },
  { identifiant: "firmin.akpovi", secret: "demo1234", role: "soignant", nomAffiche: "Firmin Akpovi", description: "Infirmier, centre de santé de Bohicon" },
  { identifiant: "pharmacie.sainte-rita", secret: "demo1234", role: "pharmacie", nomAffiche: "Pharmacie Sainte-Rita", description: "Pharmacie de Bohicon" },
  { identifiant: "zone.bohicon", secret: "demo1234", role: "pilotage", nomAffiche: "Zone sanitaire de Bohicon", description: "Indicateurs anonymes (zone fictive)" },
  { identifiant: "admin", secret: "demo1234", role: "admin", nomAffiche: "Administration", description: "Contenus, plages de rendez-vous et comptes" },
];
```

- [ ] **Étape 4 : écrire le remplissage**

Créer `src/server/demo/semer.ts` :

```ts
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { planifier } from "@/domain/calendrier";
import { ajouterJours, depuisDateISO, joursEntre, type DateISO } from "@/domain/dates";
import { PROGRAMMES, type CodeProgramme, type MotifRdv } from "@/domain/programmes";
import { hacher } from "../auth/mots-de-passe";
import type { Db } from "../db/client";
import * as t from "../db/schema";
import { COMPTES_DEMO } from "./donnees";

export interface BilanDemo {
  comptes: number;
  foyers: number;
  patients: number;
  rendezVous: number;
  evenements: number;
}

/** Générateur pseudo-aléatoire déterministe (mulberry32) : la démo est identique à chaque remplissage. */
function hasard(graine: number) {
  let a = graine;
  const suivant = () => {
    a = (a + 0x6d2b79f5) | 0;
    let x = Math.imul(a ^ (a >>> 15), 1 | a);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
  return {
    nombre: suivant,
    entier: (min: number, max: number) => min + Math.floor(suivant() * (max - min + 1)),
    parmi: <T,>(liste: readonly T[]): T => liste[Math.floor(suivant() * liste.length)]!,
    chance: (p: number) => suivant() < p,
  };
}

const PRENOMS_F = ["Afiavi", "Bernadette", "Chantal", "Dossi", "Estelle", "Fifamè", "Florence", "Gisèle", "Hortense", "Jocelyne", "Nadège", "Pélagie", "Reine", "Sandrine", "Victoire", "Rose"] as const;
const PRENOMS_M = ["Arsène", "Bienvenu", "Cocou", "Dieudonné", "Éric", "Fiacre", "Gildas", "Hervé", "Kokou", "Mathias", "Noël", "Rodrigue", "Sèdjro", "Wilfried"] as const;
const NOMS = ["Adjovi", "Agossou", "Ahouandjinou", "Assogba", "Gbèdo", "Kpadonou", "Tossou", "Zinsou", "Houénou", "Sossou", "Adanlé", "Dansou", "Hounsa", "Kiki"] as const;
const VILLAGES_BOHICON = ["Bohicon centre", "Gnidjazoun", "Lissèzoun", "Passagon"] as const;
const VILLAGES_SEHOUN = ["Sèhoun", "Kinta", "Adingnigon"] as const;
const ALPHABET_CODE = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const TABLES = [
  "contenus_traductions", "contenus", "ordonnances", "evenements", "rendez_vous", "creneaux", "modeles_plages",
  "inscriptions", "responsables", "consentements", "contacts", "patients", "foyers", "sessions", "comptes",
  "etablissements", "communes",
];

interface Personne {
  prenom: string;
  nom: string;
  sexe: "F" | "M";
  dateNaissance: DateISO;
  foyerId: string;
  langue?: t.Langue;
  canalPrefere?: t.Canal;
  malvoyant?: boolean;
  antecedents?: { cesarienne?: boolean };
  telephone?: string;
  proprietaireTelephone?: "soi" | "proche" | "relais";
  programmes: { code: CodeProgramme; dateReference: DateISO; dateInscription: DateISO }[];
}

export async function semerDemo(db: Db, { aujourdhui }: { aujourdhui: DateISO }): Promise<BilanDemo> {
  const h = hasard(20260925);
  await db.execute(sql.raw(`TRUNCATE TABLE ${TABLES.map((n) => `"${n}"`).join(", ")} RESTART IDENTITY CASCADE`));

  const codeCourt = () => Array.from({ length: 6 }, () => h.parmi([...ALPHABET_CODE])).join("");
  const codesUtilises = new Set<string>();
  const codeUnique = () => {
    let code = codeCourt();
    while (codesUtilises.has(code)) code = codeCourt();
    codesUtilises.add(code);
    return code;
  };

  // --- Lieux ---
  const [bohicon, zogbodomey] = await db
    .insert(t.communes)
    .values([
      { nom: "Bohicon", departement: "Zou" },
      { nom: "Zogbodomey", departement: "Zou" },
    ])
    .returning();
  const [cs, pharmacie] = await db
    .insert(t.etablissements)
    .values([
      { nom: "Centre de santé de Bohicon", type: "centre_sante", communeId: bohicon!.id, telephone: "+2290121000000" },
      { nom: "Pharmacie Sainte-Rita", type: "pharmacie", communeId: bohicon!.id, telephone: "+2290121000001" },
    ])
    .returning();

  // --- Comptes ---
  const lignesComptes = await Promise.all(
    COMPTES_DEMO.map(async (c) => ({
      role: c.role,
      identifiant: c.identifiant,
      nomAffiche: c.nomAffiche,
      empreinteSecret: await hacher(c.secret),
      etablissementId: c.role === "soignant" ? cs!.id : c.role === "pharmacie" ? pharmacie!.id : null,
      communeId: c.role === "pilotage" || c.role === "relais" ? bohicon!.id : null,
    })),
  );
  const listeComptes = await db.insert(t.comptes).values(lignesComptes).returning();
  const compte = (identifiant: string) => listeComptes.find((c) => c.identifiant === identifiant)!;
  const relais = compte("koffi.agbessi");
  const firmin = compte("firmin.akpovi");
  const adjoa = compte("adjoa.gbaguidi");

  // --- Foyers ---
  const creerFoyer = async (nom: string, village: string, communeId: string) => {
    const [f] = await db.insert(t.foyers).values({ nom, village, communeId, relaisId: relais.id }).returning();
    return f!;
  };
  const fHoungbo = await creerFoyer("Houngbo", "Bohicon centre", bohicon!.id);
  const fHounkpatin = await creerFoyer("Hounkpatin", "Lissèzoun", bohicon!.id);
  const fDossou = await creerFoyer("Dossou", "Sèhoun", zogbodomey!.id);
  const fSalifou = await creerFoyer("Salifou", "Sèhoun", zogbodomey!.id);

  const naissanceSena = ajouterJours(aujourdhui, -243);
  const personnages: (Personne & { cle: string })[] = [
    { cle: "codjo", prenom: "Codjo", nom: "Houngbo", sexe: "M", dateNaissance: "1968-03-12", foyerId: fHoungbo.id, canalPrefere: "whatsapp", telephone: "+2290197000001", proprietaireTelephone: "soi",
      programmes: [{ code: "hypertension", dateReference: "2023-05-10", dateInscription: ajouterJours(aujourdhui, -200) }] },
    { cle: "mariam", prenom: "Mariam", nom: "Houngbo", sexe: "F", dateNaissance: "1972-07-02", foyerId: fHoungbo.id, canalPrefere: "whatsapp", telephone: "+2290197000001", proprietaireTelephone: "proche",
      programmes: [{ code: "consultation", dateReference: ajouterJours(aujourdhui, -200), dateInscription: ajouterJours(aujourdhui, -200) }] },
    { cle: "sena", prenom: "Sèna", nom: "Houngbo", sexe: "M", dateNaissance: naissanceSena, foyerId: fHoungbo.id, canalPrefere: "whatsapp", telephone: "+2290197000001", proprietaireTelephone: "proche",
      programmes: [{ code: "vaccination", dateReference: naissanceSena, dateInscription: naissanceSena }] },
    { cle: "awa", prenom: "Awa", nom: "Hounkpatin", sexe: "F", dateNaissance: "2002-04-18", foyerId: fHounkpatin.id, canalPrefere: "whatsapp", telephone: "+2290197000002", proprietaireTelephone: "soi",
      programmes: [{ code: "grossesse", dateReference: ajouterJours(aujourdhui, -32 * 7), dateInscription: ajouterJours(aujourdhui, -24 * 7) }] },
    { cle: "afiavi", prenom: "Afiavi", nom: "Dossou", sexe: "F", dateNaissance: "1995-01-09", foyerId: fDossou.id, canalPrefere: "sms", telephone: "+2290197000003", proprietaireTelephone: "soi",
      programmes: [{ code: "grossesse", dateReference: ajouterJours(aujourdhui, -29 * 7), dateInscription: ajouterJours(aujourdhui, -19 * 7) }] },
    { cle: "rachida", prenom: "Rachida", nom: "Salifou", sexe: "F", dateNaissance: "1955-02-14", foyerId: fSalifou.id, canalPrefere: "vocal", malvoyant: true, telephone: "+2290197000004", proprietaireTelephone: "proche",
      programmes: [{ code: "diabete", dateReference: "2020-03-01", dateInscription: ajouterJours(aujourdhui, -300) }] },
    { cle: "aicha", prenom: "Aïcha", nom: "Salifou", sexe: "F", dateNaissance: "1985-10-30", foyerId: fSalifou.id, canalPrefere: "whatsapp", telephone: "+2290197000004", proprietaireTelephone: "soi",
      programmes: [{ code: "consultation", dateReference: ajouterJours(aujourdhui, -300), dateInscription: ajouterJours(aujourdhui, -300) }] },
  ];

  // --- Population générée : 20 foyers de 1 à 4 personnes ---
  const population: Personne[] = [];
  for (let i = 0; i < 20; i++) {
    const nom = h.parmi(NOMS);
    const enBohicon = h.chance(0.6);
    const foyer = await creerFoyer(nom, h.parmi(enBohicon ? VILLAGES_BOHICON : VILLAGES_SEHOUN), enBohicon ? bohicon!.id : zogbodomey!.id);
    const taille = h.entier(2, 4);
    for (let j = 0; j < taille; j++) {
      const sexe = h.chance(0.55) ? "F" : "M";
      const profil = h.nombre();
      const personne: Personne = {
        prenom: h.parmi(sexe === "F" ? PRENOMS_F : PRENOMS_M),
        nom,
        sexe,
        dateNaissance: ajouterJours(aujourdhui, -h.entier(20, 70) * 365 - h.entier(0, 364)),
        foyerId: foyer.id,
        canalPrefere: h.parmi(["whatsapp", "sms", "sms", "vocal", "relais"] as const),
        telephone: `+22901${String(h.entier(40_000_000, 99_999_999))}`,
        proprietaireTelephone: h.chance(0.7) ? "soi" : "proche",
        programmes: [],
      };
      const inscription = ajouterJours(aujourdhui, -h.entier(30, 360));
      if (sexe === "F" && profil < 0.25) {
        personne.dateNaissance = ajouterJours(aujourdhui, -h.entier(17, 40) * 365);
        const semaines = h.entier(6, 38);
        const ddr = ajouterJours(aujourdhui, -semaines * 7);
        personne.antecedents = { cesarienne: h.chance(0.1) };
        personne.programmes.push({ code: "grossesse", dateReference: ddr, dateInscription: ajouterJours(ddr, Math.min(semaines, h.entier(6, 14)) * 7) });
      } else if (profil < 0.45) {
        const naissance = ajouterJours(aujourdhui, -h.entier(10, 500));
        personne.dateNaissance = naissance;
        personne.programmes.push({ code: "vaccination", dateReference: naissance, dateInscription: naissance });
      } else if (profil < 0.7) {
        personne.programmes.push({ code: "hypertension", dateReference: ajouterJours(inscription, -h.entier(0, 900)), dateInscription: inscription });
      } else if (profil < 0.8) {
        personne.programmes.push({ code: "diabete", dateReference: ajouterJours(inscription, -h.entier(0, 900)), dateInscription: inscription });
      } else {
        personne.programmes.push({ code: "consultation", dateReference: inscription, dateInscription: inscription });
      }
      population.push(personne);
    }
  }

  // --- Patients, contacts, consentements, inscriptions, rendez-vous, historique ---
  const idsPersonnages: Record<string, string> = {};
  let nbRendezVous = 0;
  let nbEvenements = 0;

  for (const personne of [...personnages, ...population]) {
    const [patient] = await db
      .insert(t.patients)
      .values({
        foyerId: personne.foyerId,
        prenom: personne.prenom,
        nom: personne.nom,
        dateNaissance: personne.dateNaissance,
        sexe: personne.sexe,
        langue: personne.langue ?? "fon",
        canalPrefere: personne.canalPrefere ?? "sms",
        malvoyant: personne.malvoyant ?? false,
        codeCourt: codeUnique(),
        etablissementId: cs!.id,
        antecedents: personne.antecedents ?? {},
      })
      .returning();
    if ("cle" in personne) idsPersonnages[(personne as { cle: string }).cle] = patient!.id;

    if (personne.telephone) {
      await db.insert(t.contacts).values({ patientId: patient!.id, telephone: personne.telephone, role: "principal", proprietaire: personne.proprietaireTelephone ?? "soi" });
      await db.insert(t.consentements).values({ patientId: patient!.id, canal: personne.canalPrefere === "whatsapp" ? "whatsapp" : "sms", recueilliPar: relais.id });
    }

    for (const p of personne.programmes) {
      const [inscription] = await db
        .insert(t.inscriptions)
        .values({ patientId: patient!.id, programme: p.code, dateReference: p.dateReference, dateInscription: p.dateInscription })
        .returning();
      const etapes = planifier(PROGRAMMES[p.code], p.dateReference, p.dateInscription).filter((e) => e.rendezVous);
      for (const [index, etape] of etapes.entries()) {
        await db.insert(t.rendezVous).values({
          patientId: patient!.id,
          inscriptionId: inscription!.id,
          etapeCode: etape.code,
          motif: etape.motif,
          datePrevue: etape.datePrevue,
          moment: "matin",
          etablissementId: cs!.id,
          source: "programme",
        });
        nbRendezVous++;
        const passee = joursEntre(etape.datePrevue, aujourdhui) > 0;
        if (!passee) continue;
        const faite = decisionFaite("cle" in personne ? (personne as { cle: string }).cle : null, p.code, etape.code, index, h.chance(0.8));
        if (!faite) continue;
        await db.insert(t.evenements).values({
          id: randomUUID(),
          patientId: patient!.id,
          type: p.code === "vaccination" ? "vaccination" : "consultation",
          auteurId: p.code === "grossesse" || p.code === "vaccination" ? adjoa.id : firmin.id,
          survenuLe: depuisDateISO(etape.datePrevue),
          donnees:
            p.code === "vaccination"
              ? { etape: etape.code, vaccins: (etape.details ?? "").split(", ") }
              : { motif: etape.motif, etape: etape.code, mesures: mesuresPour(p.code, h, "cle" in personne ? (personne as { cle: string }).cle : null) },
        });
        nbEvenements++;
      }
    }
  }

  // --- Relevés de tension de Codjo (surveillance : deux relevés au-dessus de 140/90) ---
  for (const [jours, sys, dia] of [[-120, 150, 95], [-30, 145, 92]] as const) {
    await db.insert(t.evenements).values({
      id: randomUUID(),
      patientId: idsPersonnages.codjo!,
      type: "mesure",
      auteurId: relais.id,
      survenuLe: depuisDateISO(ajouterJours(aujourdhui, jours)),
      donnees: { mesures: { tensionSys: sys, tensionDia: dia } },
    });
    nbEvenements++;
  }

  // --- Carnets familiaux ---
  await db.insert(t.responsables).values([
    { compteId: compte("+2290197000001").id, patientId: idsPersonnages.codjo!, lien: "soi" },
    { compteId: compte("+2290197000001").id, patientId: idsPersonnages.mariam!, lien: "conjoint" },
    { compteId: compte("+2290197000001").id, patientId: idsPersonnages.sena!, lien: "aidant" },
    { compteId: compte("+2290197000002").id, patientId: idsPersonnages.awa!, lien: "soi" },
    { compteId: compte("+2290197000004").id, patientId: idsPersonnages.aicha!, lien: "soi" },
    { compteId: compte("+2290197000004").id, patientId: idsPersonnages.rachida!, lien: "enfant" },
  ]);

  // --- Ordonnance en cours de Codjo ---
  await db.insert(t.ordonnances).values({
    patientId: idsPersonnages.codjo!,
    prescripteurId: firmin.id,
    lignes: [{ medicament: "Amlodipine 5 mg", matin: 0, midi: 0, soir: 1, dureeJours: 30 }],
    codeRetrait: "K7P4QX",
  });

  // --- Plages de rendez-vous et places des 3 prochaines semaines ---
  const modeles: { motif: MotifRdv; jours: number[]; moment: "matin" | "apres_midi"; capacite: number }[] = [
    { motif: "consultation", jours: [1, 2, 3, 4, 5], moment: "matin", capacite: 10 },
    { motif: "consultation", jours: [1, 2, 3, 4, 5], moment: "apres_midi", capacite: 8 },
    { motif: "tension", jours: [2, 4], moment: "matin", capacite: 6 },
    { motif: "diabete", jours: [4], moment: "apres_midi", capacite: 6 },
    { motif: "grossesse", jours: [3, 5], moment: "matin", capacite: 8 },
    { motif: "vaccin", jours: [3], moment: "matin", capacite: 12 },
  ];
  await db.insert(t.modelesPlages).values(
    modeles.flatMap((m) => m.jours.map((jourSemaine) => ({ etablissementId: cs!.id, motif: m.motif, jourSemaine, moment: m.moment, capacite: m.capacite }))),
  );
  const places = [];
  for (let d = 0; d <= 21; d++) {
    const date = ajouterJours(aujourdhui, d);
    const jourSemaine = ((depuisDateISO(date).getUTCDay() + 6) % 7) + 1;
    for (const m of modeles) {
      if (m.jours.includes(jourSemaine)) places.push({ etablissementId: cs!.id, motif: m.motif, date, moment: m.moment, capacite: m.capacite });
    }
  }
  await db.insert(t.creneaux).values(places);

  // --- Contenus de base (texte français ; l'audio arrive au plan 6) ---
  const contenus = [
    { code: "rappel_rendez_vous", categorie: "rappel", pictogramme: "ph-calendar-dots", texte: "Rappel : vous avez un rendez-vous au centre de santé. Pensez à votre carnet." },
    { code: "rendez_vous_manque", categorie: "rappel", pictogramme: "ph-calendar-dots", texte: "Vous n'avez pas pu venir à votre rendez-vous. Choisissez un autre jour." },
    { code: "prise_soir", categorie: "rappel", pictogramme: "ph-moon", texte: "Ce soir : prenez votre comprimé avec un verre d'eau." },
    { code: "danger_conseil", categorie: "danger", pictogramme: "hi-alert-circle", texte: "Allez au centre de santé maintenant ou appelez-le. N'attendez pas." },
  ];
  for (const c of contenus) {
    const [contenu] = await db.insert(t.contenus).values({ code: c.code, categorie: c.categorie, pictogramme: c.pictogramme }).returning();
    await db.insert(t.contenusTraductions).values({ contenuId: contenu!.id, langue: "fr", texte: c.texte });
  }

  const nbPatients = personnages.length + population.length;
  const nbFoyers = (await db.select({ id: t.foyers.id }).from(t.foyers)).length;
  return { comptes: listeComptes.length, foyers: nbFoyers, patients: nbPatients, rendezVous: nbRendezVous, evenements: nbEvenements };
}

/** Pour les personnages, l'historique est fixé par la spec ; pour les autres, il suit le hasard. */
function decisionFaite(cle: string | null, programme: CodeProgramme, etape: string, index: number, hasardFait: boolean): boolean {
  if (cle === "afiavi") return etape === "cpn1";
  if (cle === "awa" || cle === "sena" || cle === "codjo" || cle === "rachida") return true;
  return index === 0 ? true : hasardFait && programme !== "consultation";
}

/** Mesures prises en consultation : fixes pour les personnages (leur niveau de risque est connu), aléatoires sinon. */
function mesuresPour(programme: CodeProgramme, h: ReturnType<typeof hasard>, cle: string | null): Record<string, number> {
  if (cle === "codjo") return { tensionSys: 148, tensionDia: 94 };
  if (cle === "rachida") return { glycemieGL: 1.4 };
  if (cle === "awa") return { tensionSys: 118, tensionDia: 76, poidsKg: 68 };
  if (cle === "afiavi") return { tensionSys: 120, tensionDia: 78, poidsKg: 62 };
  if (programme === "hypertension") return { tensionSys: h.entier(125, 170), tensionDia: h.entier(80, 105) };
  if (programme === "diabete") return { glycemieGL: Math.round((1 + h.nombre() * 1.2) * 100) / 100 };
  if (programme === "grossesse") return { tensionSys: h.entier(100, 135), tensionDia: h.entier(60, 88), poidsKg: h.entier(55, 85) };
  return {};
}
```

- [ ] **Étape 5 : lancer le test**

Run : `pnpm vitest run src/server/demo`
Expected : `5 passed`.

- [ ] **Étape 6 : écrire le script de remplissage**

Créer `scripts/seed.ts` :

```ts
import { aujourdhuiAuBenin } from "@/domain/dates";
import { connexion } from "@/server/db/client";
import { semerDemo } from "@/server/demo/semer";

async function principal() {
  const c = connexion();
  await c.migrer();
  const bilan = await semerDemo(c.db, { aujourdhui: aujourdhuiAuBenin() });
  console.log("Démo prête :", bilan);
  await c.fermer();
}

principal().catch((erreur) => {
  console.error(erreur);
  process.exit(1);
});
```

- [ ] **Étape 7 : remplir la base de développement**

Run : `pnpm db:seed`
Expected : `Démo prête : { comptes: 9, foyers: 24, patients: …, rendezVous: …, evenements: … }`.

- [ ] **Étape 8 : commit**

```bash
git add src/server/demo scripts/seed.ts
git commit -m "feat(démo): personnages, population fictive, historique et places de rendez-vous"
```

---

### Tâche 12 : pages de connexion, de démonstration et espaces protégés

**Fichiers :**
- Créer : `src/ui/avatar.ts`, `src/ui/EnTete.tsx`, `src/ui/EspaceEnPreparation.tsx`, `src/server/requetes/carnets.ts`, `src/app/actions-session.ts`, `src/app/connexion/formulaires.ts`, `src/app/connexion/actions.ts`, `src/app/connexion/FormulairePatient.tsx`, `src/app/connexion/FormulairePersonnel.tsx`, `src/app/connexion/page.tsx`, `src/app/demo/actions.ts`, `src/app/demo/page.tsx`, `src/app/relais/page.tsx`, `src/app/soignant/page.tsx`, `src/app/pharmacie/page.tsx`, `src/app/pilotage/page.tsx`, `src/app/admin/page.tsx`
- Remplacer : `src/app/page.tsx`
- Test : `src/ui/avatar.test.ts`, `src/server/requetes/carnets.test.ts`, `src/app/connexion/formulaires.test.ts`

**Interfaces :**
- Consomme : `exigerRole`, `compteCourant`, `ouvrirSession`, `fermerSession` (tâche 10), `verifierIdentifiants` (tâche 10), `accueilDuRole` (tâche 10), `COMPTES_DEMO` (tâche 11), `normaliserTelephone`, `ageEnAnnees`, `libelleAge`, `aujourdhuiAuBenin` (tâche 5), `Icone`, `Logo`, `PaveNumerique` (tâches 3 et 4).
- Produit : `iconePourPersonne(sexe: "F" | "M", age: number): NomIcone` ; `libelleLien(lien: LienResponsable, sexe: "F" | "M"): string` ; `carnetsDuCompte(db: Db, compteId: string, aujourdhui: DateISO): Promise<Carnet[]>` avec `interface Carnet { patientId; prenom; nom; lien: LienResponsable; sexe: "F" | "M"; dateNaissance: DateISO; age: number; libelleAge: string }` ; `lireConnexionPatient(fd: FormData)`, `lireConnexionPersonnel(fd: FormData)`, `messageEchec(raison, jusqua, public)`, `heureBenin(date: Date): string`, `type EtatFormulaire = { message?: string }`.

- [ ] **Étape 1 : écrire les tests**

Créer `src/ui/avatar.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { iconePourPersonne, libelleLien } from "./avatar";

describe("iconePourPersonne", () => {
  it.each([
    ["M", 0, "hi-baby-0306m"],
    ["F", 7, "hi-boy-0105y"],
    ["F", 30, "hi-woman"],
    ["M", 58, "hi-man"],
    ["F", 71, "hi-old-woman"],
    ["M", 70, "hi-elderly"],
  ] as const)("%s de %i ans : %s", (sexe, age, icone) => {
    expect(iconePourPersonne(sexe, age)).toBe(icone);
  });
});

describe("libelleLien", () => {
  it("dit la relation du point de vue du titulaire du compte", () => {
    expect(libelleLien("soi", "M")).toBe("Moi");
    expect(libelleLien("conjoint", "F")).toBe("Ma femme");
    expect(libelleLien("conjoint", "M")).toBe("Mon mari");
    expect(libelleLien("parent", "F")).toBe("Ma fille");
    expect(libelleLien("enfant", "F")).toBe("Ma mère");
    expect(libelleLien("aidant", "M")).toBe("Je m'en occupe");
  });
});
```

Créer `src/server/requetes/carnets.test.ts` :

```ts
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "../db/client";
import { comptes } from "../db/schema";
import { creerDbDeTest } from "../db/test-utils";
import { semerDemo } from "../demo/semer";
import { carnetsDuCompte } from "./carnets";

let db: Db;
let fermer: () => Promise<void>;

beforeAll(async () => {
  ({ db, fermer } = await creerDbDeTest());
  await semerDemo(db, { aujourdhui: "2026-09-25" });
});
afterAll(async () => fermer());

describe("carnetsDuCompte", () => {
  it("liste le carnet du titulaire en premier, puis sa famille", async () => {
    const [codjo] = await db.select().from(comptes).where(eq(comptes.identifiant, "+2290197000001"));
    const carnets = await carnetsDuCompte(db, codjo!.id, "2026-09-25");
    expect(carnets.map((c) => c.prenom)).toEqual(["Codjo", "Mariam", "Sèna"]);
    expect(carnets[0]).toMatchObject({ lien: "soi", age: 58 });
    expect(carnets[2]?.libelleAge).toBe("8 mois");
  });

  it("ne renvoie rien pour un compte sans carnet", async () => {
    const [firmin] = await db.select().from(comptes).where(eq(comptes.identifiant, "firmin.akpovi"));
    expect(await carnetsDuCompte(db, firmin!.id, "2026-09-25")).toEqual([]);
  });
});
```

Créer `src/app/connexion/formulaires.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { heureBenin, lireConnexionPatient, lireConnexionPersonnel, messageEchec } from "./formulaires";

const formulaire = (valeurs: Record<string, string>) => {
  const fd = new FormData();
  for (const [cle, valeur] of Object.entries(valeurs)) fd.set(cle, valeur);
  return fd;
};

describe("lireConnexionPatient", () => {
  it("normalise le numéro", () => {
    expect(lireConnexionPatient(formulaire({ telephone: "01 97 00 00 01", code: "1234" }))).toEqual({
      ok: true,
      identifiant: "+2290197000001",
      code: "1234",
    });
  });

  it("explique un code incomplet", () => {
    expect(lireConnexionPatient(formulaire({ telephone: "0197000001", code: "12" }))).toEqual({
      ok: false,
      message: "Le code doit avoir 4 chiffres.",
    });
  });

  it("explique un numéro qui n'est pas béninois", () => {
    expect(lireConnexionPatient(formulaire({ telephone: "+33 6 12 34 56 78", code: "1234" }))).toEqual({
      ok: false,
      message: "Ce numéro n'est pas un numéro béninois valide.",
    });
  });
});

describe("lireConnexionPersonnel", () => {
  it("met l'identifiant en minuscules", () => {
    expect(lireConnexionPersonnel(formulaire({ identifiant: " Adjoa.Gbaguidi ", motDePasse: "demo1234" }))).toEqual({
      ok: true,
      identifiant: "adjoa.gbaguidi",
      motDePasse: "demo1234",
    });
  });
});

describe("messages d'échec", () => {
  it("donne l'heure du Bénin pour un compte verrouillé", () => {
    expect(heureBenin(new Date("2026-09-25T13:32:00Z"))).toBe("14 h 32");
    expect(messageEchec("verrouille", new Date("2026-09-25T13:32:00Z"), "patient")).toBe(
      "Trop d'essais. Vous pourrez réessayer à 14 h 32.",
    );
  });

  it("ne dit pas si c'est le numéro ou le code qui est faux", () => {
    expect(messageEchec("identifiants", undefined, "patient")).toBe("Numéro ou code incorrect.");
    expect(messageEchec("identifiants", undefined, "personnel")).toBe("Identifiant ou mot de passe incorrect.");
  });
});
```

- [ ] **Étape 2 : lancer les tests pour les voir échouer**

Run : `pnpm vitest run src/ui/avatar.test.ts src/server/requetes src/app/connexion`
Expected : FAIL, modules introuvables.

- [ ] **Étape 3 : écrire les modules testés**

Créer `src/ui/avatar.ts` :

```ts
import type { LienResponsable } from "@/server/db/schema";
import type { NomIcone } from "./icones";

export function iconePourPersonne(sexe: "F" | "M", age: number): NomIcone {
  if (age < 3) return "hi-baby-0306m";
  if (age < 13) return "hi-boy-0105y";
  if (age >= 65) return sexe === "F" ? "hi-old-woman" : "hi-elderly";
  return sexe === "F" ? "hi-woman" : "hi-man";
}

/** Relation vue par le titulaire du compte : « parent » = il est le parent de la personne. */
export function libelleLien(lien: LienResponsable, sexe: "F" | "M"): string {
  const f = sexe === "F";
  switch (lien) {
    case "soi":
      return "Moi";
    case "conjoint":
      return f ? "Ma femme" : "Mon mari";
    case "parent":
      return f ? "Ma fille" : "Mon fils";
    case "enfant":
      return f ? "Ma mère" : "Mon père";
    case "aidant":
      return "Je m'en occupe";
  }
}
```

Créer `src/server/requetes/carnets.ts` :

```ts
import { eq } from "drizzle-orm";
import { ageEnAnnees, libelleAge, type DateISO } from "@/domain/dates";
import type { Db } from "../db/client";
import { patients, responsables, type LienResponsable } from "../db/schema";

export interface Carnet {
  patientId: string;
  prenom: string;
  nom: string;
  lien: LienResponsable;
  sexe: "F" | "M";
  dateNaissance: DateISO;
  age: number;
  libelleAge: string;
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
    })
    .from(responsables)
    .innerJoin(patients, eq(responsables.patientId, patients.id))
    .where(eq(responsables.compteId, compteId));
  return lignes
    .map((l) => ({ ...l, age: ageEnAnnees(l.dateNaissance, aujourdhui), libelleAge: libelleAge(l.dateNaissance, aujourdhui) }))
    .sort((a, b) => ORDRE[a.lien] - ORDRE[b.lien] || a.prenom.localeCompare(b.prenom, "fr"));
}
```

Créer `src/app/connexion/formulaires.ts` :

```ts
import { z } from "zod";
import { normaliserTelephone } from "@/domain/telephone";

export type EtatFormulaire = { message?: string };

type Lecture<T> = ({ ok: true } & T) | { ok: false; message: string };

const schemaPatient = z.object({
  telephone: z.string().trim().min(1, "Indiquez votre numéro de téléphone."),
  code: z.string().regex(/^\d{4}$/, "Le code doit avoir 4 chiffres."),
});

const schemaPersonnel = z.object({
  identifiant: z.string().trim().toLowerCase().min(3, "Indiquez votre identifiant."),
  motDePasse: z.string().min(8, "Le mot de passe a au moins 8 caractères."),
});

export function lireConnexionPatient(fd: FormData): Lecture<{ identifiant: string; code: string }> {
  const lu = schemaPatient.safeParse({ telephone: fd.get("telephone") ?? "", code: fd.get("code") ?? "" });
  if (!lu.success) return { ok: false, message: lu.error.issues[0]!.message };
  const telephone = normaliserTelephone(lu.data.telephone);
  if (!telephone) return { ok: false, message: "Ce numéro n'est pas un numéro béninois valide." };
  return { ok: true, identifiant: telephone, code: lu.data.code };
}

export function lireConnexionPersonnel(fd: FormData): Lecture<{ identifiant: string; motDePasse: string }> {
  const lu = schemaPersonnel.safeParse({ identifiant: fd.get("identifiant") ?? "", motDePasse: fd.get("motDePasse") ?? "" });
  if (!lu.success) return { ok: false, message: lu.error.issues[0]!.message };
  return { ok: true, ...lu.data };
}

export function heureBenin(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Porto-Novo" })
    .format(date)
    .replace(":", " h ");
}

export function messageEchec(raison: "identifiants" | "verrouille", jusqua: Date | undefined, publicVise: "patient" | "personnel"): string {
  if (raison === "verrouille" && jusqua) return `Trop d'essais. Vous pourrez réessayer à ${heureBenin(jusqua)}.`;
  return publicVise === "patient" ? "Numéro ou code incorrect." : "Identifiant ou mot de passe incorrect.";
}
```

- [ ] **Étape 4 : lancer les tests**

Run : `pnpm vitest run src/ui/avatar.test.ts src/server/requetes src/app/connexion`
Expected : tous les tests passent.

- [ ] **Étape 5 : écrire les actions**

Créer `src/app/connexion/actions.ts` :

```ts
"use server";

import { redirect } from "next/navigation";
import { verifierIdentifiants } from "@/server/auth/connexion";
import { ouvrirSession } from "@/server/auth/cookies";
import { db } from "@/server/db/client";
import { accueilDuRole } from "@/server/droits";
import { lireConnexionPatient, lireConnexionPersonnel, messageEchec, type EtatFormulaire } from "./formulaires";

export async function connecterPatient(_: EtatFormulaire, fd: FormData): Promise<EtatFormulaire> {
  const saisie = lireConnexionPatient(fd);
  if (!saisie.ok) return { message: saisie.message };
  const resultat = await verifierIdentifiants(db(), saisie.identifiant, saisie.code);
  if (!resultat.ok) return { message: messageEchec(resultat.raison, resultat.jusqua, "patient") };
  if (resultat.role !== "patient") return { message: "Ce compte est un compte professionnel. Utilisez l'accès des professionnels." };
  await ouvrirSession(resultat.compteId);
  redirect("/");
}

export async function connecterPersonnel(_: EtatFormulaire, fd: FormData): Promise<EtatFormulaire> {
  const saisie = lireConnexionPersonnel(fd);
  if (!saisie.ok) return { message: saisie.message };
  const resultat = await verifierIdentifiants(db(), saisie.identifiant, saisie.motDePasse);
  if (!resultat.ok) return { message: messageEchec(resultat.raison, resultat.jusqua, "personnel") };
  if (resultat.role === "patient") return { message: "Ce compte est un compte patient. Utilisez l'accès « Mon carnet »." };
  await ouvrirSession(resultat.compteId);
  redirect(accueilDuRole(resultat.role));
}
```

Créer `src/app/actions-session.ts` :

```ts
"use server";

import { redirect } from "next/navigation";
import { fermerSession } from "@/server/auth/cookies";

export async function seDeconnecter(): Promise<void> {
  await fermerSession();
  redirect("/connexion");
}
```

Créer `src/app/demo/actions.ts` :

```ts
"use server";

import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { env } from "@/config/env";
import { ouvrirSession } from "@/server/auth/cookies";
import { db } from "@/server/db/client";
import { comptes } from "@/server/db/schema";
import { COMPTES_DEMO } from "@/server/demo/donnees";
import { accueilDuRole } from "@/server/droits";

export async function entrerCommeDemo(fd: FormData): Promise<void> {
  if (!env.DEMO_MODE) notFound();
  const identifiant = String(fd.get("identifiant") ?? "");
  if (!COMPTES_DEMO.some((c) => c.identifiant === identifiant)) notFound();
  const [compte] = await db().select().from(comptes).where(eq(comptes.identifiant, identifiant)).limit(1);
  if (!compte) redirect("/demo?erreur=base-vide");
  await ouvrirSession(compte.id);
  redirect(accueilDuRole(compte.role));
}
```

- [ ] **Étape 6 : écrire les composants d'interface**

Créer `src/ui/EnTete.tsx` :

```tsx
import { seDeconnecter } from "@/app/actions-session";
import { env } from "@/config/env";
import { Icone } from "./Icone";
import { Logo } from "./Logo";

export function EnTete({ nomAffiche, sousTitre }: { nomAffiche: string; sousTitre?: string }) {
  return (
    <header className="flex items-center gap-3">
      <Logo />
      <div className="min-w-0 flex-1">
        <p className="text-lg leading-tight font-bold">{env.NEXT_PUBLIC_APP_NAME}</p>
        <p className="truncate text-sm text-gris">{sousTitre ?? nomAffiche}</p>
      </div>
      <form action={seDeconnecter}>
        <button className="flex items-center gap-2 rounded-bouton bg-white px-3 py-2 text-sm font-bold text-marque">
          <Icone nom="ph-sign-out" className="size-5" />
          Se déconnecter
        </button>
      </form>
    </header>
  );
}
```

Créer `src/ui/EspaceEnPreparation.tsx` :

```tsx
import { EnTete } from "./EnTete";
import { Icone } from "./Icone";
import type { NomIcone } from "./icones";

type Props = { nomAffiche: string; titre: string; icone: NomIcone; texte: string };

export function EspaceEnPreparation({ nomAffiche, titre, icone, texte }: Props) {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-6">
      <EnTete nomAffiche={nomAffiche} />
      <section className="flex flex-col items-start gap-4 rounded-grande bg-white p-6">
        <span className="grid size-14 place-items-center rounded-2xl bg-lavande-2 text-marque">
          <Icone nom={icone} className="size-9" />
        </span>
        <h1 className="text-3xl font-bold">{titre}</h1>
        <p className="text-lg text-gris">{texte}</p>
      </section>
    </main>
  );
}
```

Créer `src/app/connexion/FormulairePatient.tsx` :

```tsx
"use client";

import { useActionState } from "react";
import { PaveNumerique } from "@/ui/PaveNumerique";
import { connecterPatient } from "./actions";

export function FormulairePatient() {
  const [etat, action, enCours] = useActionState(connecterPatient, {});
  return (
    <form action={action} className="flex flex-col gap-6">
      <label className="flex flex-col gap-2 font-bold">
        Mon numéro de téléphone
        <input
          name="telephone"
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          placeholder="01 97 12 34 56"
          required
          className="h-14 rounded-bouton bg-white px-4 text-xl font-normal tracking-wide"
        />
      </label>
      <PaveNumerique name="code" libelle="Mon code secret à 4 chiffres" />
      {etat.message && (
        <p role="alert" className="rounded-bouton bg-urgence-pale px-4 py-3 font-bold text-urgence">
          {etat.message}
        </p>
      )}
      <button disabled={enCours} className="h-14 rounded-bouton bg-marque text-lg font-bold text-white disabled:opacity-60">
        {enCours ? "Ouverture…" : "Ouvrir mon carnet"}
      </button>
    </form>
  );
}
```

Créer `src/app/connexion/FormulairePersonnel.tsx` :

```tsx
"use client";

import { useActionState } from "react";
import { connecterPersonnel } from "./actions";

const champ = "h-14 rounded-bouton bg-white px-4 text-lg font-normal";

export function FormulairePersonnel() {
  const [etat, action, enCours] = useActionState(connecterPersonnel, {});
  return (
    <form action={action} className="flex flex-col gap-5">
      <label className="flex flex-col gap-2 font-bold">
        Identifiant
        <input name="identifiant" autoComplete="username" required className={champ} />
      </label>
      <label className="flex flex-col gap-2 font-bold">
        Mot de passe
        <input name="motDePasse" type="password" autoComplete="current-password" required className={champ} />
      </label>
      {etat.message && (
        <p role="alert" className="rounded-bouton bg-urgence-pale px-4 py-3 font-bold text-urgence">
          {etat.message}
        </p>
      )}
      <button disabled={enCours} className="h-14 rounded-bouton bg-marque text-lg font-bold text-white disabled:opacity-60">
        {enCours ? "Connexion…" : "Se connecter"}
      </button>
    </form>
  );
}
```

- [ ] **Étape 7 : écrire les pages**

Créer `src/app/connexion/page.tsx` :

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { env } from "@/config/env";
import { compteCourant } from "@/server/auth/cookies";
import { accueilDuRole } from "@/server/droits";
import { Logo } from "@/ui/Logo";
import { FormulairePatient } from "./FormulairePatient";
import { FormulairePersonnel } from "./FormulairePersonnel";

export const metadata: Metadata = { title: "Connexion" };

export default async function PageConnexion({ searchParams }: { searchParams: Promise<{ acces?: string }> }) {
  const compte = await compteCourant();
  if (compte) redirect(accueilDuRole(compte.role));
  const personnel = (await searchParams).acces === "personnel";
  const onglet = (actif: boolean) =>
    `rounded-xl px-3 py-3 text-center font-bold ${actif ? "bg-marque text-white" : "text-marque"}`;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 px-4 py-8">
      <header className="flex items-center gap-3">
        <Logo className="size-11" />
        <p className="text-2xl font-bold">{env.NEXT_PUBLIC_APP_NAME}</p>
      </header>
      <h1 className="text-3xl leading-tight font-bold">
        {personnel ? "Accès des professionnels" : "Ouvrir mon carnet de santé"}
      </h1>
      <nav aria-label="Type d'accès" className="grid grid-cols-2 gap-1 rounded-bouton bg-white p-1">
        <Link href="/connexion" className={onglet(!personnel)} aria-current={personnel ? undefined : "page"}>
          Mon carnet
        </Link>
        <Link href="/connexion?acces=personnel" className={onglet(personnel)} aria-current={personnel ? "page" : undefined}>
          Professionnels
        </Link>
      </nav>
      {personnel ? <FormulairePersonnel /> : <FormulairePatient />}
      {env.DEMO_MODE && (
        <Link href="/demo" className="text-center font-bold text-marque underline">
          Essayer avec un compte de démonstration
        </Link>
      )}
    </main>
  );
}
```

Créer `src/app/demo/page.tsx` :

```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { env } from "@/config/env";
import { COMPTES_DEMO } from "@/server/demo/donnees";
import { Logo } from "@/ui/Logo";
import { entrerCommeDemo } from "./actions";

export const metadata: Metadata = { title: "Démonstration" };

const ROLES = { patient: "Patient", relais: "Relais", soignant: "Soignant", pharmacie: "Pharmacie", pilotage: "Pilotage", admin: "Administration" } as const;

export default async function PageDemo({ searchParams }: { searchParams: Promise<{ erreur?: string }> }) {
  if (!env.DEMO_MODE) notFound();
  const { erreur } = await searchParams;
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8">
      <header className="flex items-center gap-3">
        <Logo className="size-11" />
        <p className="text-2xl font-bold">{env.NEXT_PUBLIC_APP_NAME}</p>
      </header>
      <h1 className="text-3xl font-bold">Choisissez un compte de démonstration</h1>
      <p className="text-gris">Toutes les personnes et données sont fictives.</p>
      {erreur === "base-vide" && (
        <p role="alert" className="rounded-bouton bg-urgence-pale px-4 py-3 font-bold text-urgence">
          La base de démonstration est vide. Lancez « pnpm db:seed ».
        </p>
      )}
      <ul className="grid gap-3">
        {COMPTES_DEMO.map((c) => (
          <li key={c.identifiant}>
            <form action={entrerCommeDemo}>
              <input type="hidden" name="identifiant" value={c.identifiant} />
              <button className="flex w-full items-center gap-4 rounded-carte bg-white p-4 text-left">
                <span className="rounded-lg bg-lavande-2 px-2 py-1 text-xs font-bold text-marque">{ROLES[c.role]}</span>
                <span>
                  <span className="block font-bold">{c.nomAffiche}</span>
                  <span className="text-sm text-gris">{c.description}</span>
                </span>
              </button>
            </form>
          </li>
        ))}
      </ul>
    </main>
  );
}
```

Remplacer `src/app/page.tsx` (accueil patient provisoire, remplacé au plan 2) :

```tsx
import { aujourdhuiAuBenin } from "@/domain/dates";
import { exigerRole } from "@/server/auth/cookies";
import { db } from "@/server/db/client";
import { carnetsDuCompte } from "@/server/requetes/carnets";
import { iconePourPersonne, libelleLien } from "@/ui/avatar";
import { EnTete } from "@/ui/EnTete";
import { Icone } from "@/ui/Icone";

export default async function AccueilPatient() {
  const compte = await exigerRole("patient");
  const carnets = await carnetsDuCompte(db(), compte.id, aujourdhuiAuBenin());
  const moi = carnets.find((c) => c.lien === "soi");

  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 px-4 py-6">
      <EnTete nomAffiche={compte.nomAffiche} />
      <h1 className="text-3xl font-bold">Bonjour {moi?.prenom ?? compte.nomAffiche}</h1>
      <section aria-labelledby="titre-carnets" className="flex flex-col gap-3">
        <h2 id="titre-carnets" className="text-lg font-bold">
          Les carnets de ma famille
        </h2>
        <ul className="grid gap-3">
          {carnets.map((c) => (
            <li key={c.patientId} className="flex items-center gap-3 rounded-carte bg-white p-4">
              <span className="grid size-12 place-items-center rounded-full bg-lavande-2 text-marque">
                <Icone nom={iconePourPersonne(c.sexe, c.age)} className="size-8" />
              </span>
              <span>
                <span className="block font-bold">
                  {c.prenom} {c.nom}
                </span>
                <span className="text-sm text-gris">
                  {libelleLien(c.lien, c.sexe)}, {c.libelleAge}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
```

Créer les cinq espaces du personnel. `src/app/relais/page.tsx` :

```tsx
import { exigerRole } from "@/server/auth/cookies";
import { EspaceEnPreparation } from "@/ui/EspaceEnPreparation";

export default async function PageRelais() {
  const compte = await exigerRole("relais");
  return (
    <EspaceEnPreparation
      nomAffiche={compte.nomAffiche}
      titre="Ma tournée"
      icone="hi-community-healthworker"
      texte="La tournée par foyer, utilisable sans réseau, est en cours de préparation."
    />
  );
}
```

`src/app/soignant/page.tsx` :

```tsx
import { exigerRole } from "@/server/auth/cookies";
import { EspaceEnPreparation } from "@/ui/EspaceEnPreparation";

export default async function PageSoignant() {
  const compte = await exigerRole("soignant");
  return (
    <EspaceEnPreparation
      nomAffiche={compte.nomAffiche}
      titre="Aujourd'hui"
      icone="hi-stethoscope"
      texte="Les consultations du jour, les alertes et la salle d'attente sont en cours de préparation."
    />
  );
}
```

`src/app/pharmacie/page.tsx` :

```tsx
import { exigerRole } from "@/server/auth/cookies";
import { EspaceEnPreparation } from "@/ui/EspaceEnPreparation";

export default async function PagePharmacie() {
  const compte = await exigerRole("pharmacie");
  return (
    <EspaceEnPreparation
      nomAffiche={compte.nomAffiche}
      titre="Ordonnances"
      icone="hi-pharmacy"
      texte="La recherche d'une ordonnance par son code et la délivrance sont en cours de préparation."
    />
  );
}
```

`src/app/pilotage/page.tsx` :

```tsx
import { exigerRole } from "@/server/auth/cookies";
import { EspaceEnPreparation } from "@/ui/EspaceEnPreparation";

export default async function PagePilotage() {
  const compte = await exigerRole("pilotage");
  return (
    <EspaceEnPreparation
      nomAffiche={compte.nomAffiche}
      titre="Pilotage"
      icone="hi-ambulatory-clinic"
      texte="Les indicateurs anonymes par commune sont en cours de préparation."
    />
  );
}
```

`src/app/admin/page.tsx` :

```tsx
import { exigerRole } from "@/server/auth/cookies";
import { EspaceEnPreparation } from "@/ui/EspaceEnPreparation";

export default async function PageAdmin() {
  const compte = await exigerRole("admin");
  return (
    <EspaceEnPreparation
      nomAffiche={compte.nomAffiche}
      titre="Administration"
      icone="ph-list-checks"
      texte="La gestion des contenus, des plages de rendez-vous et des comptes est en cours de préparation."
    />
  );
}
```

- [ ] **Étape 8 : vérifier types, style, tests et construction**

Run : `pnpm typecheck && pnpm lint && pnpm test && pnpm build`
Expected : aucune erreur ; tous les tests passent.

- [ ] **Étape 9 : vérifier les parcours à la main**

Run : `pnpm dev`, puis dans le navigateur :
1. `http://localhost:3000` renvoie vers `/connexion`.
2. Onglet « Mon carnet » : numéro `01 97 00 00 01`, code `1234` au pavé, « Ouvrir mon carnet » : l'accueil affiche « Bonjour Codjo » et les carnets Codjo (Moi, 58 ans), Mariam (Ma femme), Sèna (Je m'en occupe, 8 mois environ).
3. « Se déconnecter », puis « Professionnels » : `adjoa.gbaguidi` / `demo1234` : l'espace « Aujourd'hui » s'affiche.
4. Taper `/` pendant la session d'Adjoa : renvoi vers `/soignant`.
5. Cinq codes faux pour Codjo : le message « Trop d'essais. Vous pourrez réessayer à … » s'affiche.
6. `/demo` : chaque bouton ouvre l'espace du bon rôle.

- [ ] **Étape 10 : commit**

```bash
git add src
git commit -m "feat: connexion patient et professionnels, comptes de démonstration, espaces protégés"
```

---

### Tâche 13 : mise en production (santé, migrations au démarrage, Docker, vérifications, Coolify)

**Fichiers :**
- Créer : `src/app/api/sante/route.ts`, `src/instrumentation.ts`, `src/server/demo/autorisation.ts`, `src/app/api/demo/reinitialiser/route.ts`, `Dockerfile`, `.dockerignore`, `.github/workflows/ci.yml`, `docs/deploiement.md`, `README.md` (remplace celui généré)
- Test : `src/server/demo/autorisation.test.ts`

**Interfaces :**
- Consomme : `connexion`, `db` (tâche 9), `semerDemo` (tâche 11), `env` (tâche 2), `aujourdhuiAuBenin` (tâche 5).
- Produit : `GET /api/sante` → `{ ok: true, application: string }` ou `503` ; `POST /api/demo/reinitialiser` (en-tête `Authorization: Bearer <CRON_SECRET>`) → `{ ok: true, bilan }` ou `403` ; `autoriserReinitialisation(entete: string | null, config: { DEMO_MODE: boolean; CRON_SECRET?: string }): boolean`.

- [ ] **Étape 1 : écrire le test de l'autorisation**

Créer `src/server/demo/autorisation.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { autoriserReinitialisation } from "./autorisation";

const secret = "0123456789abcdef0123456789abcdef";

describe("autoriserReinitialisation", () => {
  it("accepte le bon secret en mode démo", () => {
    expect(autoriserReinitialisation(`Bearer ${secret}`, { DEMO_MODE: true, CRON_SECRET: secret })).toBe(true);
  });

  it("refuse hors mode démo, sans secret configuré, ou avec un mauvais secret", () => {
    expect(autoriserReinitialisation(`Bearer ${secret}`, { DEMO_MODE: false, CRON_SECRET: secret })).toBe(false);
    expect(autoriserReinitialisation(`Bearer ${secret}`, { DEMO_MODE: true })).toBe(false);
    expect(autoriserReinitialisation("Bearer faux", { DEMO_MODE: true, CRON_SECRET: secret })).toBe(false);
    expect(autoriserReinitialisation(null, { DEMO_MODE: true, CRON_SECRET: secret })).toBe(false);
  });
});
```

- [ ] **Étape 2 : lancer le test pour le voir échouer**

Run : `pnpm vitest run src/server/demo/autorisation.test.ts`
Expected : FAIL, module introuvable.

- [ ] **Étape 3 : écrire l'autorisation et les routes**

Créer `src/server/demo/autorisation.ts` :

```ts
import { timingSafeEqual } from "node:crypto";

export function autoriserReinitialisation(entete: string | null, config: { DEMO_MODE: boolean; CRON_SECRET?: string }): boolean {
  if (!config.DEMO_MODE || !config.CRON_SECRET || !entete) return false;
  const recu = Buffer.from(entete);
  const attendu = Buffer.from(`Bearer ${config.CRON_SECRET}`);
  return recu.length === attendu.length && timingSafeEqual(recu, attendu);
}
```

Créer `src/app/api/demo/reinitialiser/route.ts` :

```ts
import { env } from "@/config/env";
import { aujourdhuiAuBenin } from "@/domain/dates";
import { db } from "@/server/db/client";
import { autoriserReinitialisation } from "@/server/demo/autorisation";
import { semerDemo } from "@/server/demo/semer";

export const dynamic = "force-dynamic";

export async function POST(requete: Request) {
  if (!autoriserReinitialisation(requete.headers.get("authorization"), env)) {
    return Response.json({ ok: false }, { status: 403 });
  }
  const bilan = await semerDemo(db(), { aujourdhui: aujourdhuiAuBenin() });
  return Response.json({ ok: true, bilan });
}
```

Créer `src/app/api/sante/route.ts` :

```ts
import { sql } from "drizzle-orm";
import { env } from "@/config/env";
import { db } from "@/server/db/client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db().execute(sql`select 1`);
    return Response.json({ ok: true, application: env.NEXT_PUBLIC_APP_NAME });
  } catch (erreur) {
    console.error("Base de données injoignable :", erreur);
    return Response.json({ ok: false }, { status: 503 });
  }
}
```

Créer `src/instrumentation.ts` :

```ts
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { env } = await import("@/config/env");
  if (!env.MIGRER_AU_DEMARRAGE || !env.DATABASE_URL) return;
  const { connexion } = await import("@/server/db/client");
  await connexion().migrer();
  console.log("Migrations appliquées.");
}
```

- [ ] **Étape 4 : lancer les tests**

Run : `pnpm test`
Expected : tous les tests passent.

- [ ] **Étape 5 : écrire l'image de production**

Créer `Dockerfile` :

```dockerfile
FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS dependances
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS construction
COPY --from=dependances /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_APP_NAME=Gbè
ENV NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

FROM node:22-alpine AS execution
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup -S sante && adduser -S sante -G sante
COPY --from=construction /app/public ./public
COPY --from=construction --chown=sante:sante /app/.next/standalone ./
COPY --from=construction --chown=sante:sante /app/.next/static ./.next/static
COPY --from=construction /app/drizzle ./drizzle
USER sante
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s CMD wget -qO- http://127.0.0.1:3000/api/sante || exit 1
CMD ["node", "server.js"]
```

Créer `.dockerignore` :

```
.git
.next
node_modules
.env*
!.env.example
docs
.superpowers
Sante.pdf
coverage
playwright-report
test-results
```

- [ ] **Étape 6 : écrire les vérifications automatiques**

Créer `.github/workflows/ci.yml` :

```yaml
name: Vérifications

on:
  push:
    branches: [main]
  pull_request:

jobs:
  verifier:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test
      - run: pnpm build
```

- [ ] **Étape 7 : écrire la procédure Coolify**

Créer `docs/deploiement.md` :

````markdown
# Déploiement sur Coolify

L'adresse finale sera `<nom>.kheios.com`. Tant que le nom n'est pas choisi, on utilise un sous-domaine provisoire (exemple : `sante.kheios.com`).

## 1. DNS
Chez le gestionnaire du domaine `kheios.com`, créer un enregistrement **A** : `sante` → adresse IP du serveur Coolify.

## 2. Base de données
Dans Coolify : **New Resource → Database → PostgreSQL 16**. Noter l'URL de connexion **interne** (`postgres://…`).

## 3. Application
**New Resource → Application → dépôt GitHub** du projet, branche `main`, **Build Pack : Dockerfile**, port **3000**.

- Domaine : `https://sante.kheios.com` (Coolify obtient le certificat HTTPS).
- Health check : chemin `/api/sante`.
- Variables d'environnement :

| Variable | Valeur | Remarque |
|---|---|---|
| `APP_URL` | `https://sante.kheios.com` | |
| `NEXT_PUBLIC_APP_NAME` | nom affiché | cocher « Build Variable » (lue à la construction) |
| `DATABASE_URL` | URL interne de l'étape 2 | |
| `CRON_SECRET` | résultat de `openssl rand -hex 32` | |
| `DEMO_MODE` | `true` | |
| `MIGRER_AU_DEMARRAGE` | `true` | |

- Activer le **déploiement automatique** à chaque envoi sur `main`.

## 4. Premier remplissage de la démo
Après le premier déploiement (les migrations s'appliquent au démarrage) :

```bash
curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://sante.kheios.com/api/demo/reinitialiser
```

La réponse contient le bilan (`comptes`, `foyers`, `patients`, `rendezVous`, `evenements`).

## 5. Changer de nom plus tard
1. Créer l'enregistrement DNS du nouveau sous-domaine.
2. Dans Coolify : changer le domaine, `APP_URL` et `NEXT_PUBLIC_APP_NAME`, puis redéployer.
````

- [ ] **Étape 8 : écrire le README**

Remplacer `README.md` :

````markdown
# Carnet de santé familial qui parle

Plateforme de suivi des patients pour le Challenge e-Santé Bénin. Chaque personne a son carnet ; un même téléphone gère les carnets de toute la famille ; tout s'écoute dans sa langue ; les rappels arrivent par WhatsApp, SMS, appel ou par le relais communautaire.

Le nom de la plateforme est configurable (`NEXT_PUBLIC_APP_NAME`, « Gbè » provisoirement).

- Spec : [docs/superpowers/specs/2026-09-25-esante-benin-design.md](docs/superpowers/specs/2026-09-25-esante-benin-design.md)
- Pourquoi ces choix : [docs/recherche/](docs/recherche/) (usages au Bénin, plateformes existantes, design), avec les sources
- Maquettes validées : [docs/design/maquettes-validees.html](docs/design/maquettes-validees.html)
- Déploiement : [docs/deploiement.md](docs/deploiement.md)

## Démarrer en local

Prérequis : Node 22, pnpm 11, un Postgres local.

```bash
pnpm install
psql -U postgres -h localhost -c "CREATE DATABASE sante"
cp .env.example .env.local   # puis renseigner DATABASE_URL
pnpm db:seed                 # migrations + données de démonstration
pnpm dev                     # http://localhost:3000
```

## Comptes de démonstration

Toutes les personnes sont fictives. La page `/demo` ouvre chaque compte en un clic.

| Rôle | Identifiant | Secret |
|---|---|---|
| Patient (Codjo, carnet familial) | 01 97 00 00 01 | 1234 |
| Patiente (Awa, enceinte) | 01 97 00 00 02 | 1234 |
| Patiente (Aïcha, s'occupe de sa mère) | 01 97 00 00 04 | 1234 |
| Relais | koffi.agbessi | demo1234 |
| Sage-femme | adjoa.gbaguidi | demo1234 |
| Infirmier | firmin.akpovi | demo1234 |
| Pharmacie | pharmacie.sainte-rita | demo1234 |
| Pilotage | zone.bohicon | demo1234 |
| Administration | admin | demo1234 |

## Commandes

| Commande | Rôle |
|---|---|
| `pnpm test` | tests (Vitest ; base PGlite en mémoire, aucune configuration) |
| `pnpm typecheck` / `pnpm lint` | vérification des types et du style |
| `pnpm db:generate` | génère une migration après modification du schéma |
| `pnpm db:seed` | réinitialise la base locale avec la démo |
| `pnpm icones` | reconstruit le sprite de pictogrammes |

## Organisation du code

- `src/domain/` : logique métier pure et testée (programmes de suivi, calendriers, risques).
- `src/server/` : base de données, connexion, requêtes.
- `src/ui/` : composants de la charte.
- `src/app/` : pages et routes.
````

- [ ] **Étape 9 : vérifier en conditions de production**

Run (Git Bash, depuis la racine du projet) :

```bash
pnpm build
set -a; source .env.local; set +a
node .next/standalone/server.js
```

Dans un autre terminal : `curl http://localhost:3000/api/sante`.
Expected : `{"ok":true,"application":"Gbè"}` et, dans les journaux du serveur, `Migrations appliquées.`

- [ ] **Étape 10 : commit**

```bash
git add -A
git reset -q Sante.pdf
git commit -m "chore: santé de l'application, migrations au démarrage, Docker, CI et procédure Coolify"
```

- [ ] **Étape 11 : publier sur GitHub (avec l'accord de l'utilisateur)**

Demander à l'utilisateur le nom du dépôt et sa visibilité (privé ou public), puis :

```bash
gh repo create <nom-du-depot> --private --source . --remote origin --push
```

Vérifier que l'onglet **Actions** du dépôt affiche les vérifications au vert, puis suivre `docs/deploiement.md`.
