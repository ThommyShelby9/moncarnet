import { ageEnAnnees, type DateISO } from "./dates";
import type { CodeProgramme, NiveauRisque } from "./programmes/types";

export interface Mesure {
  date: DateISO;
  tensionSys?: number;
  tensionDia?: number;
  glycemieGL?: number;
  hemoglobineGDL?: number;
  poidsKg?: number;
}

export interface ContexteRisque {
  aujourdhui: DateISO;
  dateNaissance: DateISO;
  antecedents: { cesarienne?: boolean };
  mesures: Mesure[];
  etapesManquees: number;
  signalementsOuverts: number;
}

export interface ResultatRisque {
  niveau: NiveauRisque;
  motifs: string[];
}

type Regle = { niveau: Exclude<NiveauRisque, "normal">; motif: string } | null;

const ORDRE: Record<NiveauRisque, number> = { normal: 0, surveillance: 1, eleve: 2 };
const eleve = (motif: string): Regle => ({ niveau: "eleve", motif });
const surveillance = (motif: string): Regle => ({ niveau: "surveillance", motif });

function combiner(regles: Regle[]): ResultatRisque {
  const actives = regles.filter((r): r is NonNullable<Regle> => r !== null);
  const niveau = actives.reduce<NiveauRisque>((max, r) => (ORDRE[r.niveau] > ORDRE[max] ? r.niveau : max), "normal");
  return { niveau, motifs: actives.map((r) => r.motif) };
}

/** Relevés qui contiennent la valeur demandée, du plus ancien au plus récent. */
function releves(mesures: Mesure[], cle: keyof Omit<Mesure, "date">): Mesure[] {
  return mesures.filter((m) => m[cle] !== undefined).sort((a, b) => a.date.localeCompare(b.date));
}

const tension = (m: Mesure) => `${m.tensionSys}/${m.tensionDia}`;
const tensionAuMoins = (m: Mesure, sys: number, dia: number) => (m.tensionSys ?? 0) >= sys || (m.tensionDia ?? 0) >= dia;
const manques = (c: ContexteRisque): Regle =>
  c.etapesManquees >= 2 ? surveillance(`${c.etapesManquees} rendez-vous manqués`) : null;

const REGLES: Record<CodeProgramme, (c: ContexteRisque) => Regle[]> = {
  consultation: () => [],

  grossesse: (c) => {
    const derniereTension = releves(c.mesures, "tensionSys").at(-1);
    const derniereHb = releves(c.mesures, "hemoglobineGDL").at(-1);
    const age = ageEnAnnees(c.dateNaissance, c.aujourdhui);
    return [
      derniereTension && tensionAuMoins(derniereTension, 140, 90) ? eleve(`Tension élevée (${tension(derniereTension)})`) : null,
      c.signalementsOuverts > 0 ? eleve("Signe de danger non pris en charge") : null,
      age < 18 ? surveillance(`Grossesse avant 18 ans (${age} ans)`) : age > 35 ? surveillance(`Grossesse après 35 ans (${age} ans)`) : null,
      c.antecedents.cesarienne ? surveillance("Césarienne antérieure") : null,
      derniereHb && (derniereHb.hemoglobineGDL ?? Infinity) < 11 ? surveillance(`Anémie (${derniereHb.hemoglobineGDL} g/dL)`) : null,
      manques(c),
    ];
  },

  hypertension: (c) => {
    const t = releves(c.mesures, "tensionSys");
    const derniere = t.at(-1);
    const avant = t.at(-2);
    let regle: Regle = null;
    if (derniere && tensionAuMoins(derniere, 180, 110)) regle = eleve(`Tension très élevée (${tension(derniere)})`);
    else if (derniere && avant && tensionAuMoins(derniere, 140, 90) && tensionAuMoins(avant, 140, 90))
      regle = surveillance(`Tension non contrôlée (${tension(avant)} puis ${tension(derniere)})`);
    return [regle, manques(c)];
  },

  diabete: (c) => {
    const g = releves(c.mesures, "glycemieGL");
    const derniere = g.at(-1)?.glycemieGL;
    const avant = g.at(-2)?.glycemieGL;
    let regle: Regle = null;
    if (derniere !== undefined && derniere >= 2.5) regle = eleve(`Glycémie très élevée (${derniere} g/L)`);
    else if (derniere !== undefined && avant !== undefined && derniere >= 1.26 && avant >= 1.26)
      regle = surveillance(`Diabète non contrôlé (${avant} puis ${derniere} g/L)`);
    return [regle, manques(c)];
  },

  postnatal: (c) => {
    const derniere = releves(c.mesures, "tensionSys").at(-1);
    return [
      derniere && tensionAuMoins(derniere, 140, 90) ? eleve(`Tension élevée après l'accouchement (${tension(derniere)})`) : null,
      c.signalementsOuverts > 0 ? eleve("Signe de danger non pris en charge") : null,
      manques(c),
    ];
  },

  vaccination: (c) => [
    c.etapesManquees >= 1
      ? surveillance(c.etapesManquees === 1 ? "1 vaccin en retard" : `${c.etapesManquees} vaccins en retard`)
      : null,
  ],
};

export function evaluerRisque(code: CodeProgramme, contexte: ContexteRisque): ResultatRisque {
  return combiner(REGLES[code](contexte));
}

export function risqueGlobal(resultats: ResultatRisque[]): ResultatRisque {
  return resultats.reduce<ResultatRisque>(
    (acc, r) => ({
      niveau: ORDRE[r.niveau] > ORDRE[acc.niveau] ? r.niveau : acc.niveau,
      motifs: [...acc.motifs, ...r.motifs],
    }),
    { niveau: "normal", motifs: [] },
  );
}
