import Link from "next/link";
import { notFound } from "next/navigation";
import { aujourdhuiAuBenin, joursEntre } from "@/domain/dates";
import { MOTIFS_RDV } from "@/domain/programmes";
import { LIBELLES_MOTIF, motifsProposes } from "@/domain/rendez-vous";
import { dateCourte } from "@/domain/temps";
import { db } from "@/server/db/client";
import { dossierPatient } from "@/server/requetes/soignant";
import { Icone } from "@/ui/Icone";
import { exigerSoignant } from "../../../contexte";
import { FormulaireConsultation, type EtapeAChoisir } from "./FormulaireConsultation";

export default async function NouvelleConsultation({ params, searchParams }: PageProps<"/soignant/patients/[id]/consultation">) {
  const soignant = await exigerSoignant();
  const [{ id }, recherche] = await Promise.all([params, searchParams]);
  const aujourdhui = aujourdhuiAuBenin();
  const dossier = await dossierPatient(db(), soignant.etablissementId, id, aujourdhui);
  if (!dossier) notFound();
  const { patient } = dossier;
  const suivis = motifsProposes({ age: patient.age, sexe: patient.sexe, programmes: dossier.programmes.map((p) => p.code) });
  const motifs = [...suivis, ...MOTIFS_RDV.filter((m) => !suivis.includes(m))];
  const etapes: EtapeAChoisir[] = dossier.programmes.flatMap((p) =>
    p.etapes
      .filter((e) => e.rendezVous && e.statut !== "faite")
      .map((e) => {
        const date = e.reservation?.date ?? e.datePrevue;
        return {
          code: e.code,
          motif: e.motif,
          libelle: `${e.libelle} (${e.statut === "manquee" ? "en retard" : dateCourte(date)})`,
          proche: e.statut === "manquee" || Math.abs(joursEntre(aujourdhui, date)) <= 14,
        };
      }),
  );
  const demande = typeof recherche.motif === "string" ? recherche.motif : undefined;
  return (
    <>
      <Link href={`/soignant/patients/${patient.id}`} className="flex w-fit items-center gap-2 text-sm font-bold text-marque">
        <Icone nom="ph-arrow-left" className="size-4" />
        Dossier de {patient.prenom}
      </Link>
      <h1 className="text-3xl font-bold">
        Consultation de {patient.prenom} {patient.nom}
      </h1>
      <FormulaireConsultation
        patientId={patient.id}
        motifs={motifs.map((m) => ({ code: m, libelle: LIBELLES_MOTIF[m] }))}
        etapes={etapes}
        motifInitial={motifs.find((m) => m === demande) ?? motifs[0]!}
      />
    </>
  );
}
