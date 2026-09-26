# Plan 7 : la page de présentation — plan d'implémentation

> **Pour les agents :** sous-skill requis : superpowers:executing-plans (exécution par moi-même, sans agents). Étapes en cases à cocher (`- [ ]`).

**Objectif :** une page publique `/decouvrir` qui présente la solution de bout en bout, avec de vraies captures de la plateforme :
- le constat, chiffres sourcés à l'appui ;
- les deux parcours usagers (Awa jusqu'à la naissance, Codjo au quotidien) ;
- ceux qui accompagnent (sage-femme, relais, pharmacie) ;
- l'État (zone sanitaire, ministère) ;
- l'inclusion ;
- ce qu'il y a sous le capot.

Un visiteur non connecté qui ouvre le site arrive sur cette page ; elle mène à la démo et à la connexion.

**Architecture :**
- page statique (composant serveur sans données) ;
- captures WebP produites par un script puppeteer depuis le build de production, avec une démo fraîche, et rangées dans `public/decouvrir/` ;
- image de partage (Open Graph) : capture du haut de la page.

**Spec :** §1 (objectifs, critères), §3, §4, §9 (accessibilité), §15 (démo) ; `docs/recherche/2026-09-25-synthese-usages.md` (chiffres et sources) ; mémoires « Priorités de la démo » et « Exigence design ».

## Contraintes globales
- Une seule charte (indigo, nuit, lavande, soleil, rouge), Fira Sans, motif des ondes ; niveau portfolio.
- Chaque chiffre du constat cite sa source (celle de la synthèse de recherche).
- Chaque image a un texte alternatif qui dit ce qu'elle montre ; la page se lit au clavier et au lecteur d'écran ; mise en page lisible à 390 px comme à 1440 px.
- Aucun lien vers le dépôt (privé). Toutes les données montrées sont fictives, et la page le dit.

## Points de vigilance
1. **Visiteur non connecté sur `/`, ou sur une page patient** : il arrive sur `/decouvrir`, qui mène à la connexion (tâche 3).
2. **Réseau lent** : images en WebP, chargées à la demande sous le premier écran (tâche 2).

---

### Tâche 1 : les captures

**Fichiers :** `public/decouvrir/*.webp`. Le script jetable `captures.mjs` reste dans le dossier de travail : il dépend de puppeteer-core, qui n'est pas une dépendance du projet.

- [ ] **Étape 1 : produire les captures**

Sur le build de production local (`pnpm build`, `pnpm start`), démo fraîche (`pnpm db:seed`), le script enchaîne les parcours et capture en WebP (qualité 80). Téléphone : 390 × 844 à 2×. Bureau : 1280 × 800.

| Fichier | Compte | Écran |
|---|---|---|
| `codjo-accueil` | Codjo | `/` (« Ce soir, 1 comprimé ») |
| `codjo-carnet` | Codjo | `/carnet`, défilé jusqu'à « Ma tension » |
| `codjo-rendez-vous` | Codjo | `/prendre-rendez-vous?pour=<Sèna>&motif=vaccin` (le jour) |
| `awa-accueil` | Awa | `/` (semaine 37) |
| `awa-grossesse` | Awa | `/grossesse` (haut) |
| `awa-plan` | Awa | `/grossesse`, défilé jusqu'à « Préparer la naissance » |
| `awa-probleme` | Awa | `/probleme` |
| `adjoa-alerte` | Adjoa | `/soignant` après « Le travail a commencé » |
| `adjoa-naissance` | Adjoa | formulaire de naissance rempli |
| `awa-felicitations` | Awa | `/` après la naissance |
| `bebe-carnet` | Awa | carnet du bébé |
| `relais-tournee` | Koffi | `/relais` après « Préparer ma tournée » |
| `relais-visite` | Koffi | visite chez Afiavi, note et tension saisies |
| `pharmacie` | Pharmacie | `/pharmacie?code=M4R2TN` |
| `pilotage-zone` | Zone | `/pilotage` |
| `pilotage-ministere` | Ministère | `/pilotage?indicateur=penta3` |

Expected : 16 fichiers WebP, chacun sous 250 Ko.

- [ ] **Étape 2 : commit**

```bash
git add public/decouvrir
git commit -m "feat(présentation): captures de la plateforme pour la page de présentation"
```

---

### Tâche 2 : la page `/decouvrir`

**Fichiers :** créer `src/app/decouvrir/page.tsx` ; tester `tests/app/decouvrir.test.tsx`.

**Interfaces (produit) :** page publique, métadonnées Open Graph (`/decouvrir/apercu.webp`).

- [ ] **Étape 1 : écrire le test qui échoue**

Créer `tests/app/decouvrir.test.tsx` :

```tsx
// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import PageDecouvrir from "@/app/decouvrir/page";

afterEach(cleanup);

describe("page de présentation", () => {
  it("raconte la solution de bout en bout, dans l'ordre", () => {
    render(<PageDecouvrir />);
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual([
      "Le constat",
      "Awa, de la grossesse à la naissance",
      "Codjo, un patient au quotidien",
      "Ceux qui accompagnent",
      "Pour l'État : piloter sans aucun nom",
      "Pensé pour tout le monde",
      "Sous le capot",
      "Essayez les deux parcours",
    ]);
  });

  it("donne un texte à chaque capture, et une source à chaque chiffre", () => {
    render(<PageDecouvrir />);
    const images = screen.getAllByRole("img").filter((i) => i.tagName === "IMG");
    expect(images.length).toBeGreaterThanOrEqual(14);
    expect(images.every((i) => (i.getAttribute("alt") ?? "").length > 20)).toBe(true);
    expect(screen.getAllByText(/Source :/)).toHaveLength(4);
  });

  it("mène à la démo et à la connexion", () => {
    render(<PageDecouvrir />);
    expect(screen.getAllByRole("link", { name: /Essayer la démo/ }).every((a) => a.getAttribute("href") === "/demo")).toBe(true);
    expect(screen.getByRole("link", { name: "Ouvrir mon carnet" }).getAttribute("href")).toBe("/connexion");
  });
});
```

Run : `pnpm vitest run tests/app/decouvrir.test.tsx`
Expected : FAIL (module introuvable).

- [ ] **Étape 2 : écrire la page**

Créer `src/app/decouvrir/page.tsx` (code complet dans le commit ; structure imposée) :
- composants locaux `Telephone({ src, alt, legende, prioritaire? })` (cadre de téléphone arrondi, fond nuit, image 390 × 844) et `Navigateur({ src, alt, legende })` (barre de navigateur, image 1280 × 800). Les deux utilisent `next/image` avec `unoptimized`, en `loading="lazy"` sauf pour le premier écran ;
- en-tête : logo, nom, liens d'ancre (Parcours, Soignants, État), bouton « Essayer la démo » ;
- héros (fond indigo, ondes) :
  - « Le carnet de santé familial qui parle. », puis une phrase sur la famille, la voix, le réseau et les acteurs ;
  - boutons « Essayer la démo » (`/demo`) et « Ouvrir mon carnet » (`/connexion`) ;
  - deux téléphones : `awa-grossesse`, `codjo-accueil` ;
- « Le constat » : 4 chiffres, chacun avec « Source : … » :
  - 52,6 % des femmes vont jusqu'à la 4ᵉ consultation prénatale (OMS, MICS 2021-2022) ;
  - le français n'est parlé à la maison que par 7,4 % des personnes, le fongbé par 41,1 % (Afrobaromètre, round 10, 2024) ;
  - 41,5 % des femmes adultes savent lire (Banque mondiale) ;
  - 38 % des abonnements mobiles sont encore en 2G (ARCEP Bénin, 2025) ;
  - puis « Notre réponse » en une phrase ;
- « Awa, de la grossesse à la naissance » : 4 étapes numérotées avec téléphones (`awa-grossesse` ou `awa-plan`, `awa-probleme`, `awa-felicitations`, `bebe-carnet`) et la déclaration de naissance au bureau (`adjoa-naissance`) ;
- « Codjo, un patient au quotidien » : `codjo-accueil`, `codjo-rendez-vous`, `codjo-carnet`, et `pharmacie` au bureau ;
- « Ceux qui accompagnent » :
  - la sage-femme (`adjoa-alerte` : 15 minutes pour prendre l'alerte) ;
  - le relais (`relais-tournee`, `relais-visite` : sans réseau, note vocale, tout part au retour du réseau) ;
  - la pharmacie (code, posologie dessinée) ;
- « Pour l'État : piloter sans aucun nom » : `pilotage-zone` et `pilotage-ministere`, avec quatre points : en direct depuis les carnets, masquage sous 5 personnes, classement et zones à appuyer, export au format DHIS2 ;
- « Pensé pour tout le monde » : six principes, chacun avec son pictogramme :
  - tout s'écoute ;
  - un pictogramme et un mot ;
  - une chose à la fois ;
  - sans réseau ;
  - un téléphone pour toute la famille, effacé à la déconnexion ;
  - lecteur d'écran et gros boutons pour les malvoyants ;
- « Sous le capot » :
  - Next.js 16, TypeScript strict, Postgres et Drizzle ;
  - application installable et service worker ;
  - file d'envoi sans doublon (UUID v7) ;
  - près de 400 tests automatiques ;
  - un programme de suivi = un fichier (`postnatal.ts`) ;
  - valeurs médicales indicatives ;
  - déployée sur Coolify ;
- « Essayez les deux parcours » : bouton vers `/demo` ; pied de page : « Toutes les personnes et données de la démonstration sont fictives. Challenge e-Santé Bénin 2026. »

- [ ] **Étape 3 : relancer le test, vérifier les types et le style**

Run : `pnpm vitest run tests/app/decouvrir.test.tsx && pnpm typecheck && pnpm lint`
Expected : PASS.

- [ ] **Étape 4 : commit**

```bash
git add src/app/decouvrir tests/app/decouvrir.test.tsx
git commit -m "feat(présentation): la solution de bout en bout, avec les vraies captures"
```

---

### Tâche 3 : les visiteurs arrivent sur la présentation

**Fichiers :** modifier `src/app/(patient)/contexte.ts`, `src/app/connexion/page.tsx`, `src/app/demo/page.tsx`, `README.md`.

- [ ] **Étape 1 : écrire le code**

Dans `contextePatient`, avant `exigerRole("patient")` : `if (!(await compteCourant())) redirect("/decouvrir");`. Un visiteur sans session voit la présentation, et un compte d'un autre rôle garde sa redirection vers son espace.

Sur `/connexion` et `/demo`, ajouter un lien « Découvrir Mon Carnet » vers `/decouvrir`.

Produire `public/decouvrir/apercu.webp` : capture 1200 × 630 du haut de `/decouvrir`.

Au README, ajouter en tête le lien vers `/decouvrir`.

- [ ] **Étape 2 : vérifier, mettre en ligne**

Vérifier dans Chrome :
1. `/` sans session → `/decouvrir` ;
2. la page à 390 et à 1440 px (captures `decouvrir-mobile.png`, `decouvrir-bureau.png`) ;
3. aucune erreur dans la console.

Ensuite : `pnpm test && pnpm typecheck && pnpm lint && pnpm build`, puis envoi, déploiement, réinitialisation de la démo et vérification en production.

```bash
git add "src/app/(patient)/contexte.ts" src/app/connexion src/app/demo public/decouvrir/apercu.webp README.md
git commit -m "feat(présentation): les visiteurs arrivent sur la présentation ; image de partage"
```
