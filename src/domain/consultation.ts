import { z } from "zod";
import type { mesuresSchema } from "./evenements";
import { MOTIFS_RDV, type MotifRdv } from "./programmes/types";

type Mesures = z.infer<typeof mesuresSchema>;

export interface SaisieConsultation {
  motif: MotifRdv;
  etape?: string;
  mesures: Mesures;
  notes?: string;
}

/** Champ numérique facultatif d'un formulaire : vide = absent, virgule décimale acceptée. */
const nombre = (min: number, max: number, entier = false) =>
  z.preprocess(
    (v) => (v === undefined || v === null || String(v).trim() === "" ? undefined : Number(String(v).trim().replace(",", "."))),
    (entier ? z.number().int() : z.number()).min(min).max(max).optional(),
  );

const schema = z.object({
  motif: z.enum(MOTIFS_RDV),
  etape: z.string().trim().max(40).optional(),
  tensionSys: nombre(50, 300, true),
  tensionDia: nombre(30, 200, true),
  glycemieGL: nombre(0.2, 6),
  hemoglobineGDL: nombre(3, 25),
  poidsKg: nombre(0.5, 300),
  notes: z.string().trim().max(2000).optional(),
});

const LIBELLES_CHAMPS: Record<string, string> = {
  motif: "le motif",
  etape: "l'étape",
  tensionSys: "la tension (chiffre du haut)",
  tensionDia: "la tension (chiffre du bas)",
  glycemieGL: "la glycémie",
  hemoglobineGDL: "l'hémoglobine",
  poidsKg: "le poids",
  notes: "les notes",
};

export const TENSION_INCOMPLETE = "Indiquez les deux chiffres de la tension, par exemple 140 sur 90.";

export function lireSaisieConsultation(champs: Record<string, unknown>): { ok: true; saisie: SaisieConsultation } | { ok: false; message: string } {
  const lecture = schema.safeParse(champs);
  if (!lecture.success) {
    const aVerifier = [...new Set(lecture.error.issues.map((p) => LIBELLES_CHAMPS[String(p.path[0])] ?? String(p.path[0])))];
    return { ok: false, message: `Vérifiez : ${aVerifier.join(", ")}.` };
  }
  const { motif, etape, notes, ...valeurs } = lecture.data;
  if ((valeurs.tensionSys === undefined) !== (valeurs.tensionDia === undefined)) return { ok: false, message: TENSION_INCOMPLETE };
  const mesures = Object.fromEntries(Object.entries(valeurs).filter(([, v]) => v !== undefined)) as Mesures;
  return { ok: true, saisie: { motif, etape: etape || undefined, mesures, notes: notes || undefined } };
}
