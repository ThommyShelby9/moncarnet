import Link from "next/link";
import { notFound } from "next/navigation";
import { aujourdhuiAuBenin } from "@/domain/dates";
import { db } from "@/server/db/client";
import { dossierPatient } from "@/server/requetes/soignant";
import { Icone } from "@/ui/Icone";
import { exigerSoignant } from "../../../contexte";
import { FormulaireOrdonnance } from "./FormulaireOrdonnance";

export default async function NouvelleOrdonnance({ params }: PageProps<"/soignant/patients/[id]/ordonnance">) {
  const soignant = await exigerSoignant();
  const { id } = await params;
  const dossier = await dossierPatient(db(), soignant.etablissementId, id, aujourdhuiAuBenin());
  if (!dossier) notFound();
  const { patient } = dossier;
  return (
    <>
      <Link href={`/soignant/patients/${patient.id}`} className="flex w-fit items-center gap-2 text-sm font-bold text-marque">
        <Icone nom="ph-arrow-left" className="size-4" />
        Dossier de {patient.prenom}
      </Link>
      <h1 className="text-3xl font-bold">
        Ordonnance pour {patient.prenom} {patient.nom}
      </h1>
      <p className="-mt-3 text-gris">Nombre de comprimés à chaque moment de la journée, et durée. La pharmacie verra la posologie dessinée.</p>
      <FormulaireOrdonnance patientId={patient.id} />
    </>
  );
}
