export const CODES_INDICATEURS = [
  "cpn4",
  "naissances_centre",
  "penta3",
  "rr1",
  "hta_controles",
  "alertes_15min",
  "alertes_delai",
  "visites_relais",
  "etapes_manquees",
] as const;
export type CodeIndicateur = (typeof CODES_INDICATEURS)[number];

export interface Comptage {
  numerateur: number;
  denominateur: number;
}
export type Valeurs = Record<CodeIndicateur, Comptage>;

export interface DefinitionIndicateur {
  libelle: string;
  court: string;
  unite: "pourcent" | "minutes" | "nombre";
  /** Objectif indicatif ; pour un délai, le maximum souhaité. */
  cible?: number;
  aide: string;
}

/** Indicateurs de la spec §4.10 (valeurs cibles indicatives). */
export const INDICATEURS: Record<CodeIndicateur, DefinitionIndicateur> = {
  cpn4: { libelle: "Femmes allées jusqu'à la 4ᵉ consultation prénatale", court: "4ᵉ consultation prénatale", unite: "pourcent", cible: 60, aide: "Grossesses arrivées au terme de la 4ᵉ consultation" },
  naissances_centre: { libelle: "Naissances au centre de santé ou à l'hôpital", court: "Naissances au centre", unite: "pourcent", cible: 90, aide: "Naissances des 12 derniers mois" },
  penta3: { libelle: "Enfants vaccinés : Penta3, à 14 semaines", court: "Vaccin Penta3", unite: "pourcent", cible: 90, aide: "Enfants qui ont passé l'âge du vaccin" },
  rr1: { libelle: "Enfants vaccinés : rougeole-rubéole, à 9 mois", court: "Rougeole-rubéole", unite: "pourcent", cible: 85, aide: "Enfants qui ont passé l'âge du vaccin" },
  hta_controles: { libelle: "Hypertendus dont la tension est contrôlée", court: "Tension contrôlée", unite: "pourcent", cible: 50, aide: "Dernier relevé des 6 derniers mois sous 140/90" },
  alertes_15min: { libelle: "Signes de danger pris en charge en moins de 15 minutes", court: "Alertes en moins de 15 min", unite: "pourcent", cible: 90, aide: "Alertes des 30 derniers jours" },
  alertes_delai: { libelle: "Délai moyen de prise en charge des alertes", court: "Délai des alertes", unite: "minutes", cible: 15, aide: "Alertes des 30 derniers jours" },
  visites_relais: { libelle: "Visites à domicile des relais", court: "Visites des relais", unite: "nombre", aide: "30 derniers jours" },
  etapes_manquees: { libelle: "Rendez-vous de suivi manqués, à rattraper", court: "Rendez-vous manqués", unite: "nombre", aide: "60 derniers jours" },
};

/** Un chiffre qui porte sur moins de 5 personnes est masqué (spec §4.10). */
export const SEUIL_MASQUE = 5;

export type Niveau = "bon" | "moyen" | "faible";

export interface Lecture {
  valeur: number | null;
  texte: string;
  detail: string;
  masque: boolean;
  niveau: Niveau | null;
}

export function vide(): Valeurs {
  return Object.fromEntries(CODES_INDICATEURS.map((c) => [c, { numerateur: 0, denominateur: 0 }])) as Valeurs;
}

export function agreger(liste: Valeurs[]): Valeurs {
  const total = vide();
  for (const v of liste) {
    for (const c of CODES_INDICATEURS) {
      total[c].numerateur += v[c].numerateur;
      total[c].denominateur += v[c].denominateur;
    }
  }
  return total;
}

const nombre = (n: number) => n.toLocaleString("fr-FR");

export function lireIndicateur(code: CodeIndicateur, c: Comptage): Lecture {
  const d = INDICATEURS[code];
  if (d.unite === "nombre") return { valeur: c.numerateur, texte: nombre(c.numerateur), detail: d.aide, masque: false, niveau: null };
  if (c.denominateur === 0) return { valeur: null, texte: "—", detail: "Aucune donnée pour la période", masque: false, niveau: null };
  if (c.denominateur < SEUIL_MASQUE) {
    return { valeur: null, texte: "Masqué", detail: `Moins de ${SEUIL_MASQUE} personnes : chiffre masqué`, masque: true, niveau: null };
  }
  const cible = d.cible ?? 0;
  if (d.unite === "minutes") {
    const valeur = Math.round(c.numerateur / c.denominateur);
    const niveau: Niveau = valeur <= cible ? "bon" : valeur <= cible * 1.5 ? "moyen" : "faible";
    return { valeur, texte: `${valeur} min`, detail: `${nombre(c.denominateur)} alertes`, masque: false, niveau };
  }
  const valeur = Math.round((c.numerateur / c.denominateur) * 100);
  const niveau: Niveau = valeur >= cible ? "bon" : valeur >= cible - 15 ? "moyen" : "faible";
  return { valeur, texte: `${valeur} %`, detail: `${nombre(c.numerateur)} sur ${nombre(c.denominateur)}`, masque: false, niveau };
}

export interface LigneExport extends Comptage {
  orgUnit: string;
  periode: string;
  code: CodeIndicateur;
}

export function lignesDe(orgUnit: string, valeurs: Valeurs, periode: string): LigneExport[] {
  return CODES_INDICATEURS.map((code) => ({ orgUnit, periode, code, ...valeurs[code] }));
}

export const premierDuMois = (d: string): string => `${d.slice(0, 7)}-01`;

/** Les n mois qui précèdent (premiers jours), du plus ancien au plus récent. */
export function moisPrecedents(mois: string, n: number): string[] {
  const [annee, m] = mois.split("-").map(Number);
  const rang = annee! * 12 + (m! - 1);
  return Array.from({ length: n }, (_, i) => {
    const k = rang - (n - i);
    return `${Math.floor(k / 12)}-${String((k % 12) + 1).padStart(2, "0")}-01`;
  });
}

const echapper = (t: string) => (/[;"\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t);

/** Export au format proche de DHIS2 (unité, période, élément, valeur) ; un chiffre masqué reste masqué. */
export function versCsv(lignes: LigneExport[]): string {
  const corps = lignes.map((l) => {
    const lecture = lireIndicateur(l.code, l);
    const cache = lecture.masque;
    return [l.orgUnit, l.periode, l.code, cache ? "" : l.numerateur, cache ? "" : l.denominateur, lecture.valeur ?? ""].map((v) => echapper(String(v))).join(";");
  });
  return ["orgUnit;period;dataElement;numerator;denominator;value", ...corps].join("\n") + "\n";
}

export interface CentreExport {
  nom: string;
  commune: string;
  consultations: number;
  attenteMoyenne: number | null;
  alertes: { total: number; delaiMoyen: number | null; partSous15: number | null };
  remplissage: { prises: number; capacite: number };
}

export interface RelaisExport {
  nom: string;
  foyers: number;
  personnes: number;
  visites: number;
  foyersVisites: number;
  aOrienter: number;
}

/** L'activité des centres et des relais d'une zone, en un seul tableau (des comptes, jamais un nom de patient). */
export function activiteVersCsv(centres: CentreExport[], relais: RelaisExport[], periode: string): string {
  const entete =
    "type;nom;commune;period;consultations_30j;attente_moyenne_min;alertes_30j;alertes_delai_moyen_min;alertes_part_15min;places_prises_7j;places_7j;foyers;personnes;visites_30j;foyers_visites_30j;a_orienter_30j";
  const ligne = (valeurs: (string | number | null)[]) => valeurs.map((v) => echapper(v === null ? "" : String(v))).join(";");
  return (
    [
      entete,
      ...centres.map((c) =>
        ligne(["centre", c.nom, c.commune, periode, c.consultations, c.attenteMoyenne, c.alertes.total, c.alertes.delaiMoyen, c.alertes.partSous15, c.remplissage.prises, c.remplissage.capacite, null, null, null, null, null]),
      ),
      ...relais.map((r) => ligne(["relais", r.nom, null, periode, null, null, null, null, null, null, null, r.foyers, r.personnes, r.visites, r.foyersVisites, r.aOrienter])),
    ].join("\n") + "\n"
  );
}
