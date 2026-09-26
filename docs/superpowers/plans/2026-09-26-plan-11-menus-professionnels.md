# Plan 11 : des espaces professionnels complets — plan d'implémentation

> **Pour les agents :** sous-skill requis : superpowers:executing-plans (exécution par moi-même, sans agents, à la demande de l'utilisateur). Étapes en cases à cocher (`- [ ]`).

**Objectif :** les espaces soignant, État et pharmacie n'avaient qu'une ou deux entrées. L'utilisateur a validé l'ajout des menus qui servent à gérer au quotidien, **le soignant d'abord**, puis l'État, puis la pharmacie.

| Espace | Menus |
|---|---|
| Soignant | Aujourd'hui · **Agenda** · Patients · **Suivis** · **Relais** · **Alertes** |
| Zone sanitaire | Tableau de bord · **Indicateurs** · **Centres et relais** · **Alertes** · **Exports** |
| Ministère | Vue nationale · **Zones** (fiche d'une zone) · **Indicateurs** · **Alertes** · **Exports** |
| Pharmacie | Délivrer · **Historique** · **Ruptures** |

**Spec :** §4.4 à §4.10, §12 (droits : un soignant voit son centre ; l'État ne voit que des chiffres, masqués sous 5 personnes).

## Contraintes globales
- Celles des plans précédents (tests d'abord, français simple, charte unique, pictogramme + mot).
- Droits : chaque requête du soignant est bornée à son centre ; la pharmacie ne voit que ses délivrances ; le pilotage ne voit aucun nom.
- Chaque nouvel écran est vérifié dans Chrome et passe l'audit axe.

---

## Soignant

### Tâche 1 : menu et agenda

**Fichiers :**
- Créer : `src/server/soignant/agenda.ts`, `src/app/soignant/agenda/page.tsx`, `src/app/soignant/agenda/[id]/page.tsx`
- Modifier : `src/app/soignant/layout.tsx` (menu), `src/app/soignant/actions.ts`
- Tester : `tests/server/agenda.test.ts`

**Interfaces :**
- `agendaDuCentre(db, etablissementId, du, jours)` : `PlageAgenda[]` avec `{ creneauId, date, moment, motif, capacite, prises, enAttente }`, triées par date puis par moment ;
- `detailPlage(db, etablissementId, creneauId)` : `{ plage, inscrits, attente }` ou `null` si la plage est d'un autre centre ;
- `modifierCapacite(db, { soignant, creneauId, capacite })` : `Resultat<{ capacite }, "interdit" | "trop_bas" | "invalide">` ; jamais sous le nombre de places prises ;
- `ouvrirPlage(db, { soignant, date, moment, motif, capacite, aujourdhui })` : `Resultat<{ creneauId }, "deja_ouverte" | "invalide">`, dans les 60 jours.

- [ ] **Tests** :
  - l'agenda compte les places prises et la liste d'attente ;
  - le détail d'une plage d'un autre centre est refusé ;
  - la capacité ne descend pas sous les places prises ;
  - on ouvre une plage, mais pas deux fois la même, ni dans le passé.
- [ ] **Code**, puis écrans :
  - l'agenda sur 7 jours, avec semaine précédente et suivante ;
  - pour chaque plage : places prises sur capacité et liste d'attente ;
  - le formulaire « Ouvrir une plage » ;
  - le détail d'une plage : inscrits avec lien vers le dossier, liste d'attente, capacité en + et −.

### Tâche 2 : listes de suivi et consignes au relais

**Fichiers :**
- Créer : `src/server/soignant/suivis.ts`, `src/app/soignant/suivis/page.tsx`
- Modifier : schéma (table `consignes`), `src/domain/tournee.ts` (raison « Consigne du centre »), `src/server/requetes/tournee.ts`
- Tester : `tests/server/suivis.test.ts`, `tests/domain/tournee.test.ts`

**Interfaces :**
- `listesDeSuivi(db, etablissementId, aujourdhui)` renvoie quatre listes :
  - `grossesses` : semaines, terme, CPN manquées, risque ; triées par terme ;
  - `vaccins` : enfants avec un vaccin manqué ou dû dans les 7 jours ;
  - `tension` : hypertendus dont le dernier relevé est à 140/90 ou plus, ou dont le contrôle est manqué ;
  - `perdus` : étape manquée depuis plus de 30 jours et aucune consultation depuis 90 jours ;
- chaque ligne porte `{ patientId, prenom, nom, libelleAge, telephone, detail, relais: boolean, consigne: string | null }` ;
- table `consignes` (`patientId`, `auteurId`, `texte`, `creeLe`, `faiteLe`) et `confierAuRelais(db, { soignant, patientId, texte })`. Le patient doit être du centre et vivre dans un foyer suivi par un relais ;
- tournée : raison « Consigne du centre : … » (urgence 1), jusqu'à une visite du relais postérieure à la consigne.

- [ ] **Tests** :
  - Afiavi dans les grossesses (CPN2 manquée) ;
  - un enfant dans les vaccins en retard ;
  - Codjo dans la tension ;
  - la consigne apparaît dans la tournée de Koffi et disparaît après sa visite ;
  - refus pour un patient d'un autre centre ou sans relais.
- [ ] **Écran** :
  - onglets Grossesses, Vaccins, Tension, Perdus de vue (avec le nombre de chaque) ;
  - dans chaque ligne : Appeler, Dossier, « Confier au relais » (texte court).

### Tâche 3 : relais et alertes

**Fichiers :**
- Créer : `src/app/soignant/relais/page.tsx`, `src/app/soignant/alertes/page.tsx`
- Modifier : `src/server/requetes/soignant.ts` (`visitesDuCentre`, `alertesDuCentre`)
- Tester : `tests/server/requetes/soignant.test.ts`

**Interfaces :**
- `visitesDuCentre(db, etablissementId, depuis)` : visites des relais (patient, relais, constat, note, texte), celles « À orienter » d'abord, avec les consignes en cours ;
- `alertesDuCentre(db, etablissementId, depuis, maintenant)` : historique avec statut (en cours, en retard, prise en charge, annulée), délai et qui l'a prise, plus un bilan (délai moyen, part sous 15 minutes).

- [ ] **Tests**, **écrans**, commit.

## État

### Tâche 4 : menu, pages d'indicateur, zones et fiche de zone

**Fichiers :**
- Modifier : `src/app/pilotage/layout.tsx` (menus selon la portée), `src/server/requetes/pilotage.ts`
- Créer : `src/app/pilotage/indicateurs/page.tsx`, `src/app/pilotage/zones/page.tsx`, `src/app/pilotage/zones/[zone]/page.tsx`

**Interfaces :**
- `vueDUneZone(db, zone, aujourdhui, maintenant)` : pour la zone en direct, c'est `vueDeZone` ; pour une zone fictive, les valeurs et la tendance tirées de `indicateurs_zones`, sans communes ;
- la page d'un indicateur (`?code=`) montre sa définition, sa cible, la tendance sur 6 mois, puis le détail : par commune (zone) ou le classement des zones (ministère).

- [ ] **Tests** (fiche d'une zone fictive), **écrans**, commit.

### Tâche 5 : centres et relais, alertes, exports

**Interfaces :**
- `centresDeLaZone(db, communeIds, maintenant)` : par centre, les consultations sur 30 jours, l'attente moyenne en salle d'attente (de l'arrivée à l'appel), le délai moyen des alertes ; par relais, le nombre de foyers, les visites sur 30 jours, la part de foyers visités et les personnes à orienter. Seulement des comptes ;
- `alertesDeLEtat(...)` : zone, alertes par semaine sur 8 semaines, en cours et en retard ; ministère, par zone ;
- exports : les indicateurs du mois (existant), l'historique sur 6 mois, et les centres (zone).

- [ ] **Tests**, **écrans**, commit.

## Pharmacie

### Tâche 6 : menu, historique et ruptures

**Fichiers :**
- Créer : table `ruptures`, `src/server/pharmacie/ruptures.ts`, `src/app/pharmacie/layout.tsx`, `src/app/pharmacie/historique/page.tsx`, `src/app/pharmacie/ruptures/page.tsx`
- Modifier : `src/app/pharmacie/page.tsx`, `src/server/pharmacie/delivrance.ts` (`delivrancesDe`), ordonnance du soignant (bandeau des ruptures)

**Interfaces :**
- `delivrancesDe(db, pharmacieId, depuis)` : date, code, médicaments, patient en initiales ;
- `signalerRupture`, `finirRupture` et `rupturesEnCours(db)` ; le formulaire d'ordonnance montre les ruptures en cours.

- [ ] **Tests**, **écrans**, commit.

## Fin

### Tâche 7 : README, présentation, audit, mise en ligne
