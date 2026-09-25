# Recherche design : références, typographie, pictogrammes

- **Date** : 25 septembre 2026
- **Objet** : fonder les choix visuels sur des références réelles et sur des études, pour un public qui lit peu, parle surtout des langues locales et utilise des téléphones d'entrée de gamme.
- **Complète** : [la synthèse sur les usages](2026-09-25-synthese-usages.md).

---

## 1. Références visuelles retenues

Chaque page a été ouverte et regardée (captures d'écran), pas seulement lue.

| Référence | Ce qu'on en retient |
|---|---|
| **ElliApp**, Dtail Studio, primée aux Future of Ageing Awards 2024 : https://dribbble.com/shots/27068897-Eldercare-App-UI-Wellness-Mood-Medication-Reminder-Cards | Conçue pour les plus de 70 ans : **une décision par écran**, cibles tactiles énormes, rappels sous forme de grandes cartes, indigo franc. Source directe de notre accueil « une chose à la fois » |
| **MyWisdom**, Phenomenon Studio, nommée aux UX Design Awards 2026 : https://dribbble.com/shots/27104857-Nominated-UX-Design-for-Home-Care-Medical-App-MyWisdom | Calme, beaucoup d'air, surfaces teintées sans bordures, « cercle de confiance » familial |
| **CarePulse**, Phenomenon Studio : https://dribbble.com/shots/26432015-CarePulse-Mobile-App-for-Home-Healthcare | Chaque mesure est une tuile avec pictogramme, un seuil dépassé devient une alerte, un cercle réunit patient, aidant et soignant |
| **Tableau de file d'attente médicale**, J. Szpaczek : https://dribbble.com/shots/19182260--Medical-Queue-Management-Dashboard-Concept-Design | L'essentiel de la salle d'attente en trois chiffres |
| **Flutterwave**, Verve Agency : https://www.behance.net/gallery/157780113/Flutterwave | Une marque africaine vive, qui refuse volontairement le bleu et le vert habituels |
| **Zipline**, Manual : https://manual.studio/work/zipline | Santé en Afrique : une couleur signature et un motif-système tiré du logo |
| **Système de design du NHS** : https://service-manual.nhs.uk/design-system/styles/colour | Ce qu'exprime une couleur doit aussi être dit autrement (icône, mot) |

**Tendances 2025-2026 écartées** : effets de verre et de flou (contraste dégradé, coûteux sur Android bas de gamme, selon l'étude NN/g d'octobre 2025 sur Liquid Glass), texte gris pâle sur pastel, icônes au trait fin, photos de médecins de banque d'images, cartes SaaS génériques à ombre grise.

**Tendance retenue** : Material 3 Expressive (Google, mai 2025), testé sur 18 000 participants. Les éléments clés y sont repérés jusqu'à 4 fois plus vite, et les plus de 45 ans font aussi bien que les jeunes. Nos utilisateurs sont sur Android.

---

## 2. Typographie : Fira Sans, auto-hébergée

Vérifications faites sur les fichiers de police (couverture des glyphes) et dans Chrome (polices réellement utilisées au rendu).

- **Les lettres à couvrir** : ɔ ɛ ɖ ŋ ƒ ʋ ɣ et leurs majuscules (fon, adja, goun, mina), ainsi que les tons, y compris le **caron** (ǒ) et le **circonflexe** du fon. Le yoruba s'écrit au Bénin ɛ́ ɔ̀ (et non ẹ ọ comme au Nigeria).
- **Il leur manque des lettres** : Atkinson Hyperlegible Next, Lexend, Figtree, Plus Jakarta Sans, Manrope, DM Sans, Outfit, Nunito, Poppins, Ubuntu, Work Sans, Open Sans, Roboto, IBM Plex Sans.
- **Polices complètes** : Noto Sans, Inter 4.1 (version de rsms uniquement), **Fira Sans**, Andika, Charis SIL.
- **Piège vérifié** : chargées depuis Google Fonts (ou `next/font/google`), même ces polices affichent ɛ̀ ɔ́ ǒ dans une police de secours, car les découpages de fichiers servis par Google n'incluent pas certains accents combinants. **Solution** : un seul fichier woff2 par graisse, réduit aux caractères utiles et chargé avec `next/font/local`.
- **Choix : Fira Sans**, dessinée à l'origine pour Firefox OS, sur des smartphones d'entrée de gamme. Deux graisses (400 et 700), environ 84 Ko en tout.

---

## 3. Pictogrammes

- **Compréhension en Afrique** : en Afrique du Sud, 20 pictogrammes adaptés au contexte local sur 23 atteignent 85 % de compréhension, contre 11 sur 23 pour les pictogrammes américains USP (Dowse & Ehlers 2001, https://pubmed.ncbi.nlm.nih.gov/11687321/). Au Nigeria, « le matin » (76,5 %) et « au coucher » (81 %) sont bien compris, « toutes les 6 h » très mal (16,5 %) (Abdu-Aguye 2023, https://pmc.ncbi.nlm.nih.gov/articles/PMC10040885/).
- **Conséquence** : on dit les **moments de la journée** (soleil levant, soleil, lune) plutôt que des fréquences ou des heures, et chaque pictogramme est accompagné d'un mot et d'un bouton « écouter ».
- **Bibliothèques** :
  - **Health Icons** (CC0, https://healthicons.org/) : 749 pictogrammes de santé publique, pensés pour les pays à faibles ressources (grossesse, vaccins, tension, personnes âgées, agents de santé communautaires).
  - **Phosphor** (MIT, https://phosphoricons.com) : pour l'interface (lecture, micro, calendrier, soleil, lune).
  - Les pictogrammes USP ne peuvent pas être intégrés : leur licence interdit de les modifier ou de les mélanger avec d'autres symboles.

---

## 4. Interfaces pour personnes qui lisent peu

- **Medhi 2011** (90 personnes en Inde, au Kenya, aux Philippines et en Afrique du Sud) : 56 sur 90 ne savent pas se déplacer dans des menus à plusieurs niveaux. Recommandations : repères graphiques, voix, langue locale, peu de niveaux, pas de saisie de texte, intermédiaires humains (https://www.microsoft.com/en-us/research/wp-content/uploads/2016/02/ToCHI2711_Medhi.pdf).
- **Cadre SARAL** (Srivastava 2021) : mêler texte, audio et vidéo, navigation à plat, aide audio partout, intermédiaires humains (https://anupriyatuli.github.io/publications/2021_CSCW.pdf).
- **Google, programme Next Billion Users** : un bouton voix grand et accessible en un geste, des phrases courtes (https://blog.google/innovation-and-ai/technology/next-billion-users/voice-users-playbook/).

---

## 5. Règles d'interface retenues

1. Toujours **une icône, un mot court et un bouton « écouter »** ensemble. Jamais d'icône seule.
2. **Une seule décision par écran** pour les parcours des patients (accueil en cartes, prise de rendez-vous en étapes).
3. **Deux niveaux de navigation au maximum**, pas de menu caché, rien d'important qui oblige à faire défiler.
4. **Moments de la journée** plutôt qu'heures ou fréquences ; **comptage en images** (deux soleils pour « dans 2 jours », des points pour les places libres).
5. **Aucune saisie de texte** pour les patients : on touche, on dicte, et l'identifiant est le numéro de téléphone avec un code à 4 chiffres.
6. Après chaque action, une **confirmation visuelle, sonore et par vibration**, avec la possibilité d'annuler.
7. Un **mode accompagnant** pour le relais communautaire ou un proche.
8. Avant un déploiement réel : **tester chaque pictogramme** auprès de 20 à 30 personnes, avec au moins 67 % de compréhension (seuil ISO) et 85 % comme objectif.
