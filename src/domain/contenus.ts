export const CATEGORIES_CONTENU = {
  grossesse: "Grossesse",
  traitement: "Médicaments",
  vaccination: "Vaccination",
  urgence: "Urgence",
  rendez_vous: "Rendez-vous",
} as const;
export type CategorieContenu = keyof typeof CATEGORIES_CONTENU;

export interface ContenuDeBase {
  code: string;
  categorie: CategorieContenu;
  titre: string;
  /** Nom du pictogramme (sprite de l'interface). */
  pictogramme: string;
  /** Texte français ; une ligne par conseil. */
  texte: string;
}

/**
 * Les messages de santé que l'application dit aux familles. L'administration les modifie
 * et enregistre leur version parlée dans chaque langue (fon d'abord) : c'est elle qui est jouée, sinon la voix du téléphone lit le français.
 */
export const CONTENUS_DE_BASE: ContenuDeBase[] = [
  {
    code: "conseil_grossesse_t1",
    categorie: "grossesse",
    titre: "Grossesse : les 3 premiers mois",
    pictogramme: "hi-pregnant",
    texte: [
      "Prenez chaque jour le fer et l'acide folique donnés au centre.",
      "Dormez sous une moustiquaire imprégnée : le paludisme est dangereux pendant la grossesse.",
      "Faites votre première consultation avant la 12ᵉ semaine.",
    ].join("\n"),
  },
  {
    code: "conseil_grossesse_t2",
    categorie: "grossesse",
    titre: "Grossesse : du 4ᵉ au 6ᵉ mois",
    pictogramme: "hi-pregnant",
    texte: [
      "À chaque consultation, prenez le traitement contre le paludisme donné au centre.",
      "Mangez des haricots, des légumes-feuilles et du poisson : ils donnent du fer.",
      "Le bébé bouge : s'il bouge moins, venez au centre.",
    ].join("\n"),
  },
  {
    code: "conseil_grossesse_t3",
    categorie: "grossesse",
    titre: "Grossesse : les 3 derniers mois",
    pictogramme: "hi-pregnant",
    texte: [
      "Préparez la naissance : où accoucher, comment y aller, qui vous accompagne.",
      "Si vous perdez de l'eau ou du sang, ou si le bébé bouge moins : venez tout de suite.",
      "Allez à toutes les consultations, jusqu'au bout.",
    ].join("\n"),
  },
  { code: "prise_matin", categorie: "traitement", titre: "Médicament du matin", pictogramme: "ph-sun-horizon", texte: "Ce matin : prenez votre médicament, comme le montre le dessin." },
  { code: "prise_midi", categorie: "traitement", titre: "Médicament de midi", pictogramme: "ph-sun", texte: "À midi : prenez votre médicament, comme le montre le dessin." },
  { code: "prise_soir", categorie: "traitement", titre: "Médicament du soir", pictogramme: "ph-moon", texte: "Ce soir : prenez votre comprimé avec un verre d'eau." },
  {
    code: "conseil_vaccination",
    categorie: "vaccination",
    titre: "Pourquoi vacciner",
    pictogramme: "hi-syringe-vaccine",
    texte: "Les vaccins protègent votre enfant contre des maladies graves. Apportez son carnet à chaque séance.",
  },
  { code: "danger_conseil", categorie: "urgence", titre: "Signe de danger", pictogramme: "hi-alert-circle", texte: "Allez au centre de santé maintenant ou appelez-le. N'attendez pas." },
  {
    code: "rappel_rendez_vous",
    categorie: "rendez_vous",
    titre: "Rappel de rendez-vous",
    pictogramme: "ph-calendar-dots",
    texte: "Rappel : vous avez un rendez-vous au centre de santé. Pensez à votre carnet.",
  },
  {
    code: "rendez_vous_manque",
    categorie: "rendez_vous",
    titre: "Rendez-vous manqué",
    pictogramme: "ph-calendar-dots",
    texte: "Vous n'avez pas pu venir à votre rendez-vous. Choisissez un autre jour.",
  },
];

export const TEXTE_MAX = 800;

/** Les conseils d'un contenu, une ligne chacun. */
export const lignesDuContenu = (texte: string): string[] =>
  texte
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

/** Code du contenu des conseils de la grossesse pour un trimestre. */
export const codeConseilsGrossesse = (trimestre: 1 | 2 | 3) => `conseil_grossesse_t${trimestre}`;
