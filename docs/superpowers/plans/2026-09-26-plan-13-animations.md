# Plan 13 : un site vivant — animations

**Demande de l'utilisateur :** « il faut ajouter des animations, le site n'est pas vivant ».

## Principes
- **Une boîte à outils dans la charte** (`globals.css`) :
  - deux courbes : « douce » pour les arrivées, « ressort » pour les moments forts ;
  - des animations nommées : `apparition`, `fondu`, `arrivee`, `tampon`, `remplir`, `tracer`, `respire`, `flotte`, `pulsation`, `onde`, `battement` ;
  - deux utilitaires : `cascade` (les blocs d'une page arrivent l'un après l'autre) et `revele` (apparition au défilement, sans JavaScript).
- **Seulement `transform` et `opacity`**, sans bibliothèque : fluide sur un petit téléphone, rien à télécharger en plus.
- **« Réduire les animations »** (réglage du téléphone) : tout s'arrête, y compris les boucles et les révélations au défilement.
- **Le sens avant la décoration** :
  - le tampon « VU » est un vrai coup de tampon ;
  - l'alerte envoyée émet des ondes ;
  - le compte à rebours bat quand il reste peu de temps ;
  - les chiffres se remplissent.

## Tâches
1. Boîte à outils CSS, et un test : le réglage « réduire les animations » coupe les boucles.
2. Partout :
   - chaque page arrive en cascade (espaces patient, soignant, relais, pharmacie, État, administration) ;
   - les boutons s'enfoncent au toucher ;
   - les confirmations glissent depuis le haut.
3. Espace patient :
   - les ondes respirent ;
   - « Écouter » pulse pendant la lecture ;
   - tampon « VU » ;
   - cartes du jour ;
   - salle d'attente : le numéro bat quand c'est bientôt ;
   - alerte envoyée : des ondes ;
   - félicitations à la naissance.
4. Poste soignant et État :
   - le compte à rebours bat sous 5 minutes ;
   - les places de l'agenda s'allument ;
   - les barres se remplissent ;
   - les courbes se tracent ;
   - les zones de la carte apparaissent une à une.
5. Page Découvrir : les sections se révèlent au défilement et les téléphones flottent.
6. Vérifications :
   - dans Chrome, les animations tournent, puis s'arrêtent avec « réduire les animations » ;
   - audit axe, suite complète, mise en ligne.
