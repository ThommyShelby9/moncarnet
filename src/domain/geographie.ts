/** Une commune : son nom officiel, et le nom du fond de carte (geoBoundaries) quand il s'écrit autrement. */
export interface Commune {
  nom: string;
  source: string;
}

export interface ZoneSanitaire {
  zone: string;
  departement: string;
  communes: Commune[];
}

/** « Sèmè-Kpodji » → « seme-kpodji » : pour rapprocher des noms écrits avec ou sans accents. */
export function sansAccents(texte: string): string {
  return texte
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

const c = (nom: string, source?: string): Commune => ({ nom, source: source ?? sansAccents(nom) });

/**
 * Les 34 zones sanitaires du Bénin et leurs communes (découpage du ministère de la Santé).
 * Cotonou compte quatre zones sur une seule commune.
 */
export const ZONES_SANITAIRES: ZoneSanitaire[] = [
  { zone: "Banikoara", departement: "Alibori", communes: [c("Banikoara")] },
  { zone: "Kandi / Gogounou / Ségbana", departement: "Alibori", communes: [c("Kandi"), c("Gogounou"), c("Ségbana")] },
  { zone: "Malanville / Karimama", departement: "Alibori", communes: [c("Malanville"), c("Karimama")] },
  { zone: "Natitingou / Boukoumbé / Toucountouna", departement: "Atacora", communes: [c("Natitingou"), c("Boukoumbé", "boukombe"), c("Toucountouna")] },
  { zone: "Tanguiéta / Matéri / Cobly", departement: "Atacora", communes: [c("Tanguiéta"), c("Matéri"), c("Cobly", "kobli")] },
  { zone: "Kouandé / Péhunco / Kérou", departement: "Atacora", communes: [c("Kouandé"), c("Péhunco"), c("Kérou")] },
  { zone: "Abomey-Calavi / Sô-Ava", departement: "Atlantique", communes: [c("Abomey-Calavi"), c("Sô-Ava")] },
  { zone: "Allada / Toffo / Zè", departement: "Atlantique", communes: [c("Allada"), c("Toffo"), c("Zè")] },
  { zone: "Ouidah / Kpomassè / Tori-Bossito", departement: "Atlantique", communes: [c("Ouidah"), c("Kpomassè"), c("Tori-Bossito")] },
  { zone: "Parakou / N'Dali", departement: "Borgou", communes: [c("Parakou"), c("N'Dali")] },
  { zone: "Bembèrèkè / Sinendé", departement: "Borgou", communes: [c("Bembèrèkè"), c("Sinendé")] },
  { zone: "Nikki / Kalalé / Pèrèrè", departement: "Borgou", communes: [c("Nikki"), c("Kalalé"), c("Pèrèrè")] },
  { zone: "Tchaourou", departement: "Borgou", communes: [c("Tchaourou")] },
  { zone: "Dassa-Zoumè / Glazoué", departement: "Collines", communes: [c("Dassa-Zoumè"), c("Glazoué")] },
  { zone: "Savalou / Bantè", departement: "Collines", communes: [c("Savalou"), c("Bantè")] },
  { zone: "Savè / Ouèssè", departement: "Collines", communes: [c("Savè"), c("Ouèssè")] },
  { zone: "Aplahoué / Djakotomey / Dogbo", departement: "Couffo", communes: [c("Aplahoué"), c("Djakotomey"), c("Dogbo")] },
  { zone: "Klouékanmè / Toviklin / Lalo", departement: "Couffo", communes: [c("Klouékanmè"), c("Toviklin"), c("Lalo")] },
  { zone: "Djougou / Copargo / Ouaké", departement: "Donga", communes: [c("Djougou"), c("Copargo"), c("Ouaké")] },
  { zone: "Bassila", departement: "Donga", communes: [c("Bassila")] },
  { zone: "Cotonou 1-4", departement: "Littoral", communes: [c("Cotonou")] },
  { zone: "Cotonou 2-3", departement: "Littoral", communes: [c("Cotonou")] },
  { zone: "Cotonou 5", departement: "Littoral", communes: [c("Cotonou")] },
  { zone: "Cotonou 6", departement: "Littoral", communes: [c("Cotonou")] },
  { zone: "Lokossa / Athiémé", departement: "Mono", communes: [c("Lokossa"), c("Athiémé")] },
  { zone: "Comè / Bopa / Grand-Popo / Houéyogbé", departement: "Mono", communes: [c("Comè"), c("Bopa"), c("Grand-Popo"), c("Houéyogbé")] },
  { zone: "Porto-Novo / Aguégués / Sèmè-Podji", departement: "Ouémé", communes: [c("Porto-Novo"), c("Aguégués"), c("Sèmè-Kpodji")] },
  { zone: "Adjohoun / Bonou / Dangbo", departement: "Ouémé", communes: [c("Adjohoun"), c("Bonou"), c("Dangbo")] },
  { zone: "Avrankou / Adjarra / Akpro-Missérété", departement: "Ouémé", communes: [c("Avrankou"), c("Adjarra"), c("Akpro-Missérété", "akpo-misserete")] },
  { zone: "Pobè / Kétou / Adja-Ouèrè", departement: "Plateau", communes: [c("Pobè"), c("Kétou"), c("Adja-Ouèrè")] },
  { zone: "Sakété / Ifangni", departement: "Plateau", communes: [c("Sakété"), c("Ifangni")] },
  { zone: "Abomey / Agbangnizoun / Djidja", departement: "Zou", communes: [c("Abomey"), c("Agbangnizoun"), c("Djidja")] },
  { zone: "Covè / Ouinhi / Zangnanado", departement: "Zou", communes: [c("Covè"), c("Ouinhi"), c("Zagnanado")] },
  { zone: "Zogbodomey-Bohicon-Zakpota", departement: "Zou", communes: [c("Zogbodomey"), c("Bohicon"), c("Za-Kpota")] },
];

/** Les 77 communes, une seule fois chacune. */
export const COMMUNES: Commune[] = [...new Map(ZONES_SANITAIRES.flatMap((z) => z.communes).map((x) => [x.nom, x])).values()];

/** Les zones d'une commune (plusieurs pour Cotonou), par son nom avec ou sans accents. */
export function zonesDeLaCommune(nom: string): ZoneSanitaire[] {
  const cle = sansAccents(nom);
  return ZONES_SANITAIRES.filter((z) => z.communes.some((x) => sansAccents(x.nom) === cle || x.source === cle));
}
