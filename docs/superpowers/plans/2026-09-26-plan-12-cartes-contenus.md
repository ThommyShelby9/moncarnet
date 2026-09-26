# Plan 12 : cartes du pilotage, gestion de contenu et inclusion — plan d'implémentation

> **Pour les agents :** exécution par moi-même, sans agents (demande de l'utilisateur). Étapes en cases à cocher.

**Objectif :** répondre à deux demandes de l'utilisateur.
- Des **cartes géographiques avec les indicateurs** pour les agents de l'État et le ministère.
- Se remettre **en conformité avec le PDF du challenge**. La « gestion de contenu, même basique » est dans le minimum non négociable et n'a pas d'écran. L'écoute « en fon » annoncée n'existe pas. Un appel vocal peut partir vers une personne malentendante.

**Données géographiques :**
- geoBoundaries `gbOpen/BEN/ADM2`, 77 communes, domaine public (Map Maker Ltd., Stanford Earthworks), copiées dans `data/geo/`.
- Les 34 zones sanitaires regroupent ces communes.
- Rendu en SVG calculé à l'avance, sans bibliothèque de carte ni tuiles : léger et lisible sans réseau.

## Contraintes globales
- Celles des plans précédents : tests d'abord, charte unique, pictogramme + mot, aucune mention de Claude dans les commits.
- La couleur ne porte jamais seule l'information : chaque zone affiche sa valeur (ou la donne au survol et au clavier), avec une légende en mots. Le tableau et le classement restent l'équivalent textuel.
- Aucun nom de patient sur les cartes ; un chiffre sur moins de 5 personnes est masqué.

---

### Tâche 1 : géographie et fond de carte
- `src/domain/geographie.ts` :
  - `ZONES_SANITAIRES` : 34 zones, leur département et leurs communes (noms officiels, nom de la source quand il diffère) ;
  - `zoneDeLaCommune`, `sansAccents`.
- `scripts/construire-carte.ts` (tsx) : topologie, simplification qui garde les frontières communes, projection équirectangulaire corrigée à 9,3° N. Il produit `src/domain/carte-benin.ts`, généré :
  - les chemins des communes, des zones et des départements ;
  - les boîtes et les points d'étiquette ;
  - `projeter(lon, lat)`.
- Tests :
  - 34 zones, 77 communes, chaque commune dans exactement une zone ;
  - chaque commune a un tracé ;
  - la zone de la démo compte Bohicon, Zogbodomey et Za-Kpota ;
  - Bohicon se projette dans la boîte de Bohicon.

### Tâche 2 : données de la démo
- Les 33 autres zones (fictives, signalées comme telles) sont ajoutées à la fin de `ZONES_FICTIVES`, pour ne pas changer les valeurs existantes.
- Coordonnées des établissements (`latitude`, `longitude`, migration 0009) : centre de santé et pharmacie de Bohicon.
- Tests mis à jour : la vue nationale compte 34 zones.

### Tâche 3 : cartes du pilotage
- `CarteNationale` (ministère) :
  - les communes colorées selon le niveau de leur zone (objectif atteint, presque, à appuyer, masqué, sans donnée) ;
  - frontières des zones et des départements ;
  - valeur écrite sur chaque zone assez grande ;
  - chaque zone est un lien vers sa fiche, avec un nom accessible.
- `CarteZone` (agents de la zone, fiche de zone) : les communes de la zone et leurs voisines, la valeur de chaque commune, les établissements en points.
- Où les cartes apparaissent :
  - Vue nationale : la carte et la tendance, à la place du classement ;
  - Ma zone, fiche d'une zone, Indicateurs et Centres et relais (établissements).
- Tests de rendu : valeur et lien d'une zone, légende, zone masquée, commune sans donnée.

### Tâche 4 : gestion de contenu
- Admin `/admin/contenus` : les contenus par catégorie. Pour chacun, le texte en français et en fon, un enregistrement audio par langue (micro du navigateur, ou fichier) et l'écoute.
- Serveur :
  - `modifierTexte` et `enregistrerAudio` (types et taille contrôlés, audio stocké dans `fichiers`) ;
  - lecture `/api/contenus/[code]/[langue]`.
- Côté patient :
  - le bouton « Écouter » joue l'enregistrement dans la langue de la personne s'il existe, sinon la voix du navigateur en français ;
  - les conseils de la grossesse et le conseil d'urgence viennent des contenus gérés.
- Tests : droits (admin seulement), validation, repli sur le français.

### Tâche 5 : inclusion
- La cascade de rappels ne propose jamais l'appel vocal à une personne malentendante : SMS, puis relais.
- Page Découvrir : ne plus promettre le fon là où il n'existe pas ; le dire exactement.

### Tâche 6 : finitions
README, page de présentation, audit axe, suite complète, envoi, déploiement, démo réinitialisée, vérification en production.

## Bilan

Tâches 1 à 6 livrées.

**Cartes**
- Carte nationale des 34 zones, avec le Sud agrandi.
- Carte de chaque zone : communes, établissements.
- Présentes sur les tableaux de bord, la fiche de zone, les indicateurs et les centres.

**Gestion de contenu**
- 10 contenus : texte, et voix par langue enregistrée au micro ou envoyée en fichier.
- Joués chez les familles dans la langue de la personne qui tient le téléphone.
- Conservés lors d'une remise à zéro de la démo.

**Inclusion**
- Plus d'appel vocal pour une personne malentendante.
- La promesse du fon est maintenant exacte.

**Décisions**
- Un fond de carte calculé à l'avance plutôt qu'une bibliothèque de cartes, pour rester léger et lisible sans réseau.
- Cotonou (4 zones sur une seule commune) est affichée comme un seul ensemble qui renvoie au tableau des zones.
- Le texte affiché reste en français : la voix du téléphone ne sait pas lire le fon. Seul l'enregistrement change de langue.

**Mineurs laissés de côté**
- Aucune voix en fon n'est préenregistrée : elles se font dans l'administration.
- La vidéo en langue des signes reste un champ prévu, sans écran.
