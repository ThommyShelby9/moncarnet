import { z } from "zod";
import { MOTIFS_RDV } from "./programmes/types";
import { CODES_SIGNES } from "./signes-danger";
import { MOMENTS_PRISE } from "./temps";

export const mesuresSchema = z.object({
  tensionSys: z.number().int().min(50).max(300).optional(),
  tensionDia: z.number().int().min(30).max(200).optional(),
  glycemieGL: z.number().min(0.2).max(6).optional(),
  hemoglobineGDL: z.number().min(3).max(25).optional(),
  poidsKg: z.number().min(0.5).max(300).optional(),
});

export const evenementSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("consultation"),
    donnees: z.object({
      motif: z.enum(MOTIFS_RDV),
      etape: z.string().min(1).optional(),
      mesures: mesuresSchema.default({}),
      notes: z.string().max(2000).optional(),
    }),
  }),
  z.object({
    type: z.literal("mesure"),
    donnees: z.object({ mesures: mesuresSchema }),
  }),
  z.object({
    type: z.literal("vaccination"),
    donnees: z.object({ etape: z.string().min(1), vaccins: z.array(z.string().min(1)).min(1) }),
  }),
  z.object({
    type: z.literal("prise_medicament"),
    donnees: z.object({
      traitement: z.string().min(1),
      moment: z.enum(MOMENTS_PRISE),
      statut: z.enum(["fait", "plus_tard", "annule"]),
    }),
  }),
  z.object({
    type: z.literal("signalement_danger"),
    donnees: z.object({
      signes: z.array(z.enum(CODES_SIGNES)).min(1),
      source: z.enum(["patient", "relais", "proche"]),
    }),
  }),
  z.object({
    type: z.literal("delivrance"),
    donnees: z.object({ ordonnanceId: z.uuid() }),
  }),
]);

export type EvenementValide = z.infer<typeof evenementSchema>;
export type TypeEvenement = EvenementValide["type"];
