# Synthèse de recherche : usages, terrain et plateformes existantes

- **Date** : 25 septembre 2026
- **Objet** : fonder les choix de conception de la plateforme de suivi mère-enfant sur des données, et non sur des suppositions.
- **Méthode** : recherche documentaire (enquêtes nationales, régulateur, études publiées, documentation officielle). Chaque chiffre renvoie à sa source en fin de document. Quand une information est ancienne, auto-déclarée ou incertaine, c'est indiqué.

Légende : **[AD]** chiffre auto-déclaré par l'organisation concernée ; **[?]** information incertaine ou non vérifiée dans le texte intégral.

---

## 1. Qui sont les usagères, et avec quels outils

### Téléphone et internet
- **83,8 %** des adultes ont un téléphone portable personnel, mais seulement **75,4 %** des femmes (91,9 % des hommes) [A1].
- **17,2 %** des femmes utilisent le téléphone d'un autre membre du foyer (4 % des hommes). **7,3 %** des femmes n'ont aucun téléphone dans le foyer [A1].
- Seuls **34,3 %** des femmes ont un téléphone qui accède à internet (58,3 % des hommes, 35,3 % en milieu rural) [A1].
- **59,4 %** des femmes n'utilisent jamais internet [A1]. Taux d'usage d'internet dans la population : **32,2 %** [A4].
- Abonnements mobiles par technologie : **38 % en 2G**, 37 % en 3G, 24 % en 4G [A2]. La 4G couvre 88 % de la population, mais **63 % en milieu rural** [A7].
- Les données mobiles coûtent cher : environ 700 à 1 200 FCFA le Go sur les forfaits hebdomadaires (2023-2024) [A6]. Des forfaits d'entrée de gamme ont été supprimés en août 2026 [A8].

### Messageries
- WhatsApp est la messagerie la plus citée par les internautes (47 % des citations), dans une enquête à biais urbain portant sur le Sud et le Centre [A6].
- Aucune mesure nationale représentative de l'usage de WhatsApp ni des notes vocales n'a été trouvée.

### Mobile money
- **73,4 %** des adultes ont un compte mobile money (65,1 % des femmes) [A1]. Les menus numérotés (USSD) sont donc familiers.

### Langues et lecture
- Langue la plus parlée à la maison : **fongbé 41,1 %**, ajagbé 12,5 %, yoruba 11,5 %, batonou/bariba 9,5 %, dendi 7,9 %. **Le français n'est parlé à la maison que par 7,4 %** des personnes (5,1 % des femmes) [A1].
- Taux d'alphabétisation des femmes adultes : **41,5 %** (62,6 % des hommes) [A10]. **37,2 %** des femmes n'ont reçu aucune instruction formelle [A1].

### Handicap
- Recensement 2013 : environ 1 % de la population déclarée handicapée, dont **37,4 % de handicap visuel** et **18 % de handicap auditif** [A16]. Chiffres anciens et probablement sous-estimés.

---

## 2. La santé maternelle et infantile aujourd'hui

- **83 %** des femmes font au moins une consultation prénatale (CPN) avec un personnel qualifié [A5], mais seulement **52,6 % vont jusqu'à 4 CPN**, un chiffre qui stagne [A11]. L'écart entre la 1ʳᵉ et la 4ᵉ consultation est d'environ 30 points.
- La moitié des femmes seulement font leur première CPN avant 4 mois de grossesse [A5].
- Mortalité maternelle : **518 pour 100 000 naissances** (2023) [A10].
- Vaccination : DTC3 à **63 %**, première dose rougeole à **44 %** (estimations OMS/UNICEF 2024) [A10]. Le Bénin fait partie des 10 pays les plus faibles pour la rougeole [A13].
- Obstacles déclarés pour se soigner : l'argent (53 %), la distance (31 %), l'obtention d'une permission (22 %) [A5].
- **Temps d'attente** : **90 minutes en moyenne** pour une CPN dans 40 centres de l'Atlantique [R1]. Dans deux villages du Sud, 70,3 % des mères trouvent l'attente aux séances de vaccination trop longue [R2].
- **Relais communautaires** : environ **15 800 relais** dans les 77 communes, qui font des visites à domicile auprès des femmes enceintes et des nouveau-nés. Ils utilisent déjà un outil numérique, **AlafiaCom** (sur CommCare). La revue nationale de 2025 recommande de le relier à DHIS2 et d'adopter des solutions qui fonctionnent sans internet [P2].
- Aucune donnée n'a été trouvée sur la possession et la conservation du carnet de santé mère-enfant, ni sur l'organisation réelle des centres (jours fixes de CPN, règle du premier arrivé). **À vérifier sur le terrain.**

---

## 3. Ce que nous apprennent les plateformes existantes

### Au Bénin
- **SNIS / DHIS2** : système national de données sanitaires agrégées [P1].
- **AlafiaCom** : outil des relais communautaires, issu du projet ANCRE [P2]. [?] Effet de l'arrêt des financements USAID en 2025 inconnu.
- **LUCY** : SMS hebdomadaires de la grossesse au premier anniversaire, envoyés aussi aux pères. Bilan uniquement qualitatif [P3].
- **Privé** : goMediCAL (prise de rendez-vous, environ 15 000 utilisateurs [AD]), Kea Medicals, PharMap [P4]. Ces services touchent surtout des publics urbains et instruits.
- **Aucun service de rappels de CPN ou de vaccination en fon ou en yoruba déployé à grande échelle n'a été trouvé.**

### Ailleurs
- **MomConnect** (Afrique du Sud) : inscription à la clinique, environ 5 millions de mères. 10 % des femmes perdues à cause d'un changement de numéro [P5]. Engagement « dix fois » supérieur après le passage à WhatsApp [AD] [P6].
- **PROMPTS** (Kenya, essai randomisé sur 6 139 femmes) : +3,1 points de femmes à 4 CPN ou plus, +7,4 points de suivi postnatal. **Aucun effet significatif sur le recours aux soins en cas de signes de danger** [P7].
- **Kilkari** (Inde, messages vocaux) : 61 % des abonnées retirées avant 12 mois, surtout parce qu'elles n'écoutaient pas [P8].
- **mMitra** (Inde) : des appels humains ciblés réduisent les abandons d'environ 30 % [P9].
- **Chipatala cha pa Foni** (Malawi) : les SMS ont été remplacés par des messages vocaux parce que les femmes ne pouvaient pas les lire. Des volontaires prêtaient leur téléphone et inscrivaient les femmes [P10].
- **Vaccination** : une méta-analyse de 18 études africaines montre que les rappels par téléphone **doublent à peu près** les chances d'être vacciné (OR 2,15) [P11].
- **Messages vocaux à Lagos** : 58,8 % des appels décrochés, mais 22,7 % seulement écoutés jusqu'au message clé. Les auteurs recommandent des messages de **moins de 60 secondes** [P12].

### Rendez-vous et attente
- **Mozambique** : passer de la pile de carnets à des rendez-vous par tranches horaires, avec une plage réservée aux femmes sans rendez-vous, a réduit l'attente de **100 minutes** et augmenté de **16 points** la part de femmes allant jusqu'à 4 CPN. Mais 58 % des femmes étaient encore reçues après leur créneau : l'outil ne suffit pas si l'équipe ne suit pas l'ordre prévu [R3].
- **Rappels** : un SMS fait passer la présence de 67,8 % à 78,6 % (revue Cochrane) [R4]. En Côte d'Ivoire, un rappel 2 jours avant plus 2 relances ont porté de 35,7 % à 58,3 % la part d'enfants ayant fait les 5 visites de vaccination [R5].
- **Vaccination** : les flacons multidoses poussent les agents à reporter les séances quand il y a peu d'enfants. Les mères font parfois plusieurs déplacements pour rien [R6].
- Au Bénin, les frais sont déjà le premier frein : **la réservation doit rester gratuite**.

---

## 4. WhatsApp : ce qui est possible

- **API officielle de Meta (Cloud API)** : numéro de test gratuit, sans vérification d'entreprise, opérationnel en moins d'une heure. **5 destinataires au plus** d'après des sources tierces, chiffre non relu sur une page Meta affichée en entier [W5].
- **Modèles de messages** obligatoires pour écrire en premier à une patiente. Validation par Meta en **24 heures au plus** [W7].
- **Le fon et le yoruba ne sont pas des langues de modèle disponibles** [W6]. D'où le rappel en français avec un bouton « Écouter en fon », qui ouvre une fenêtre de 24 heures pendant laquelle la note vocale peut être envoyée.
- **Pas d'audio dans un modèle** : la voix arrive toujours après la réponse de la patiente [W9].
- **Boutons de réponse** (« Je viendrai », « Je ne peux pas ») reçus par la plateforme, avec vérification de signature [W12][W13].
- **Consentement explicite** obligatoire. Les données de santé sont des données sensibles au sens du Code du numérique béninois (loi 2017-20, sous l'autorité de l'APDP) [W14][W24].
- **Bibliothèques non officielles exclues** : elles exposent le numéro à un blocage [W15][W19].

---

## 5. Ce que nous en tirons pour la conception

| Constat | Décision |
|---|---|
| Seulement 34 % des femmes ont un téléphone connecté, et 17 % utilisent celui d'un proche | **Cascade de canaux** : WhatsApp si possible, puis SMS, puis appel vocal, puis visite du relais. **Messages neutres**, sans diagnostic. **Numéro de secours** par patiente |
| Français parlé à la maison par 7 % des gens, 41,5 % des femmes savent lire | **La voix d'abord** : messages audio de moins de 60 secondes en fon, adja, yoruba, bariba, dendi et français. Pictogrammes et comptage en images |
| Le numéro de téléphone est le premier point de rupture | Numéro **vérifié à l'inscription**. Après plusieurs échecs d'envoi, **visite du relais** déclenchée automatiquement |
| Les messages seuls n'ont pas d'effet sur les signes de danger | **Un humain rappelle** : délai de prise en charge de 15 minutes, suivi et remonté à quelqu'un d'autre s'il est dépassé |
| Les rendez-vous par tranches réduisent fortement l'attente | **Tranches d'une heure avec capacité**, plage sans rendez-vous, numéro de passage, liste d'attente pour les places libérées |
| Les rappels doublent la vaccination | Rappels à J-2 et relances pour les **vaccins**, séances confirmées à l'avance |
| Les relais ont déjà AlafiaCom, relié à DHIS2 | **Compléter, pas dupliquer** : export des indicateurs dans un format compatible DHIS2 |
| Le fon et le yoruba ne sont pas disponibles dans les modèles WhatsApp | Rappel en français + bouton **« Écouter en fon »** + note vocale |
| La 2G représente encore 38 % des abonnements | Pages de moins de 300 Ko, fonctionnement hors-ligne, audio compressé et mis en cache |

**Effets à annoncer honnêtement** : les études montrent un effet net des rappels sur la vaccination, et un effet modéré sur le nombre de consultations prénatales.

**À vérifier sur le terrain avant un déploiement réel** : jours de CPN et de vaccination, usage du carnet papier, part de femmes utilisant WhatsApp, qualité de la voix de synthèse en langues locales.

---

## Sources

### Usages et santé
- [A1] Afrobaromètre, Bénin, round 10 (2024) : https://www.afrobarometer.org/wp-content/uploads/2024/08/Resume-des-resultats-Benin-Afrobarometer-R10-29Juin24-rev-1nov25.pdf
- [A2] ARCEP Bénin, tableau de bord annuel de la téléphonie mobile (2025) : https://arcep.bj/wp-content/uploads/2025/04/TB-Annuel_T%C3%A9l%C3%A9phonie-Mobile.pdf
- [A4] DataReportal, Digital 2026 Benin : https://datareportal.com/reports/digital-2026-benin
- [A5] Enquête démographique et de santé (EDS) Bénin 2017-2018 : https://dhsprogram.com/what-we-do/survey/survey-display-491.cfm
- [A6] ISOC Bénin, usage d'internet au Bénin (2024) : https://infodumoment.info/wp-content/uploads/2024/10/01.Rapport_Usage_Internet_Au_Benin_ISOCBJ_SCG-2.pdf
- [A7] GSMA, couverture mobile au Bénin (2024) : https://www.telecomschamber.org/industry-news/benin-94-mobile-internet-coverage-low-usage-gsma/
- [A8] La Nouvelle Tribune, suppression de forfaits internet (août 2026) : https://lanouvelletribune.info/2026/08/benin-les-forfaits-internet-illimites-a-5-000-et-10-000-fcfa-disparaissent/
- [A10] Banque mondiale, indicateurs du Bénin : https://data.worldbank.org/country/benin
- [A11] OMS, Observatoire mondial de la santé (MICS 2021-2022) : https://ghoapi.azureedge.net/api/WHS4_154
- [A13] Gavi, WUENIC 2024 : https://www.gavi.org/news/media-room/2024-wuenic-immunisation-lower-income-countries
- [A16] African Disability Rights Yearbook, rapport Bénin : https://www.adry.up.ac.za/country-reports-2018/republique-de-benin

### Plateformes existantes
- [P1] HISP WCA (2025) : https://hispwca.org/hispwca/?p=1689
- [P2] UNICEF Bénin, revue de la politique de santé communautaire (2025) : https://www.unicef.org/benin/recits/revue-de-la-politique-de-sant%C3%A9-communautaire%E2%80%AF-le-b%C3%A9nin-consolide-son-syst%C3%A8me-de-sant%C3%A9-de
- [P3] PlanBørnefonden (2024) : https://planbornefonden.dk/nyheder/i-benin-er-foedslerne-blevet-mere-sikre-nu-skal-aborterne-vaere-det-samme/
- [P4] UNCDF, goMediCAL (2019) : https://www.uncdf.org/fr/article/5149/gomedical-the-app-that-is-transforming-access-to-health-care-in-benin
- [P5] MomConnect, BMJ Global Health (2018) : https://pmc.ncbi.nlm.nih.gov/articles/PMC5922477/
- [P6] Reach Digital Health, chatbot MomConnect : https://www.reachdigitalhealth.org/resources/momconnect-chatbot
- [P7] PROMPTS, essai randomisé (2025) : https://pmc.ncbi.nlm.nih.gov/articles/PMC11835334/
- [P8] Kilkari (2022) : https://pmc.ncbi.nlm.nih.gov/articles/PMC9366343/
- [P9] mMitra (2021) : https://arxiv.org/abs/2109.08075
- [P10] Chipatala cha pa Foni (2025) : https://pmc.ncbi.nlm.nih.gov/articles/PMC12013878
- [P11] Méta-analyse des rappels de vaccination en Afrique, PLOS One (2024) : https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0294442
- [P12] Messages vocaux à Lagos (2022) : https://pmc.ncbi.nlm.nih.gov/articles/PMC9639833/

### Rendez-vous et attente
- [R1] Ochieng et al., BMJ Public Health (2024) : https://pmc.ncbi.nlm.nih.gov/articles/PMC11177242/
- [R2] Damien et al. (2024) : https://pmc.ncbi.nlm.nih.gov/articles/PMC11151914/
- [R3] Steenland et al., BMJ Global Health (2019) : https://pmc.ncbi.nlm.nih.gov/articles/PMC6882551/
- [R4] Gurol-Urganci, revue Cochrane (2013) : https://doi.org/10.1002/14651858.CD007458.pub3
- [R5] Dissieka et al. (2019) : https://publichealthinafrica.org/index.php/jphia/article/view/895
- [R6] Olorunsaiye et al. (2017) : https://pmc.ncbi.nlm.nih.gov/articles/PMC5745949/

### WhatsApp (documentation Meta consultée le 25/09/2026)
- [W5] Démarrage et numéro de test : https://developers.facebook.com/documentation/business-messaging/whatsapp/about-the-platform
- [W6] Langues des modèles : https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/supported-languages
- [W7] Validation des modèles : https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/template-review
- [W9] Composants des modèles : https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/components
- [W12] Webhooks : https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/overview
- [W13] Réponses par bouton : https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/reference/messages/button
- [W14] Politique WhatsApp Business (version du 23/09/2026) : https://whatsappbusiness.com/policy/
- [W15] Conditions d'utilisation de WhatsApp : https://www.whatsapp.com/legal/terms-of-service
- [W19] whatsapp-web.js : https://github.com/pedroslopez/whatsapp-web.js
- [W24] Loi béninoise sur la protection des données : https://dataprotection.africa/wp-content/uploads/2022/09/Benin_DPA.pdf
