import { z } from "zod";
import { ajouterJours, joursEntre, type DateISO } from "./dates";
import type { InscriptionDonnees } from "./evenements";
import type { CodeProgramme } from "./programmes/types";
import { normaliserTelephone } from "./telephone";

export const TYPES_INSCRIPTION = ["nouveau_ne", "grossesse", "tension", "diabete", "personne_agee"] as const;
export type TypeInscription = (typeof TYPES_INSCRIPTION)[number];

export const LIBELLES_INSCRIPTION: Record<TypeInscription, string> = {
  nouveau_ne: "Nouveau-né",
  grossesse: "Femme enceinte",
  tension: "Tension",
  diabete: "Diabète",
  personne_agee: "Personne âgée",
};

const PROGRAMME: Record<TypeInscription, CodeProgramme> = {
  nouveau_ne: "vaccination",
  grossesse: "grossesse",
  tension: "hypertension",
  diabete: "diabete",
  personne_agee: "consultation",
};

const entier = (min: number, max: number) =>
  z.preprocess((v) => (v === undefined || v === null || String(v).trim() === "" ? undefined : Number(v)), z.number().int().min(min).max(max).optional());

const schema = z.object({
  type: z.enum(TYPES_INSCRIPTION),
  foyerId: z.uuid(),
  prenom: z.string().trim().min(1).max(60),
  nom: z.string().trim().min(1).max(60),
  sexe: z.enum(["F", "M"]),
  nele: z.string().optional(),
  age: entier(0, 120),
  semaines: entier(4, 42),
  telephone: z.string().trim().max(20).optional(),
});

const LIBELLES_CHAMPS: Record<string, string> = {
  type: "ce qui amène l'inscription",
  foyerId: "le foyer",
  prenom: "le prénom",
  nom: "le nom",
  sexe: "le sexe",
  age: "l'âge",
  semaines: "les semaines de grossesse",
};

type Lecture = { ok: true; donnees: InscriptionDonnees } | { ok: false; message: string };
const refus = (message: string): Lecture => ({ ok: false, message });

/** Inscription saisie par le relais : la date de naissance et le programme de suivi viennent de ce qui amène l'inscription. */
export function lireInscription(champs: Record<string, unknown>, aujourdhui: DateISO): Lecture {
  const lecture = schema.safeParse(champs);
  if (!lecture.success) {
    const aVerifier = [...new Set(lecture.error.issues.map((p) => LIBELLES_CHAMPS[String(p.path[0])] ?? String(p.path[0])))];
    return refus(`Vérifiez : ${aVerifier.join(", ")}.`);
  }
  const s = lecture.data;
  let dateNaissance: DateISO;
  if (s.type === "nouveau_ne") {
    const valide = /^\d{4}-\d{2}-\d{2}$/.test(s.nele ?? "") && !Number.isNaN(Date.parse(s.nele!));
    const age = valide ? joursEntre(s.nele!, aujourdhui) : -1;
    if (age < 0 || age > 365) return refus("Indiquez la date de naissance du bébé (moins d'un an).");
    dateNaissance = s.nele!;
  } else {
    if (s.age === undefined) return refus("Indiquez l'âge.");
    dateNaissance = ajouterJours(aujourdhui, -s.age * 365);
  }
  let dateReference: DateISO = s.type === "nouveau_ne" ? dateNaissance : aujourdhui;
  if (s.type === "grossesse") {
    if (s.sexe !== "F") return refus("Une grossesse concerne une femme : vérifiez le sexe.");
    if (s.semaines === undefined) return refus("Indiquez les semaines de grossesse.");
    dateReference = ajouterJours(aujourdhui, -s.semaines * 7);
  }
  let telephone: string | undefined;
  if (s.telephone) {
    const normalise = normaliserTelephone(s.telephone);
    if (!normalise) return refus("Le numéro de téléphone n'est pas un numéro du Bénin.");
    telephone = normalise;
  }
  return {
    ok: true,
    donnees: {
      foyerId: s.foyerId,
      prenom: s.prenom,
      nom: s.nom,
      sexe: s.sexe,
      dateNaissance,
      ...(telephone ? { telephone } : {}),
      programme: { code: PROGRAMME[s.type], dateReference },
    },
  };
}
