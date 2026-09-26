/** Langues des carnets et des contenus : le français, et les langues les plus parlées au Bénin. */
export const LANGUES = ["fr", "fon", "adja", "yo", "bariba", "dendi"] as const;
export type Langue = (typeof LANGUES)[number];

export const LIBELLES_LANGUE: Record<Langue, string> = {
  fr: "Français",
  fon: "Fon",
  adja: "Adja",
  yo: "Yoruba",
  bariba: "Bariba",
  dendi: "Dendi",
};

export const estLangue = (valeur: unknown): valeur is Langue => (LANGUES as readonly unknown[]).includes(valeur);
