import Link from "next/link";
import { notFound } from "next/navigation";
import { aujourdhuiAuBenin } from "@/domain/dates";
import { semainesDeGrossesse } from "@/domain/programmes/grossesse";
import { db } from "@/server/db/client";
import { dossierPatient } from "@/server/requetes/soignant";
import { Icone } from "@/ui/Icone";
import { exigerSoignant } from "../../../contexte";
import { FormulaireNaissance } from "./FormulaireNaissance";

export default async function DeclarerNaissance({ params }: PageProps<"/soignant/patients/[id]/naissance">) {
  const soignant = await exigerSoignant();
  const { id } = await params;
  const maintenant = new Date();
  const aujourdhui = aujourdhuiAuBenin(maintenant);
  const dossier = await dossierPatient(db(), soignant.etablissementId, id, aujourdhui);
  if (!dossier) notFound();
  const { patient } = dossier;
  const grossesse = dossier.programmes.find((p) => p.code === "grossesse");
  const heureBenin = new Date(maintenant.getTime() + 3_600_000).toISOString().slice(11, 16);
  return (
    <>
      <Link href={`/soignant/patients/${patient.id}`} className="flex w-fit items-center gap-2 text-sm font-bold text-marque">
        <Icone nom="ph-arrow-left" className="size-4" />
        Dossier de {patient.prenom}
      </Link>
      <h1 className="text-3xl font-bold">
        Naissance chez {patient.prenom} {patient.nom}
      </h1>
      {grossesse ? (
        <>
          <p className="text-gris">
            {semainesDeGrossesse(grossesse.dateReference, aujourdhui)} semaines de grossesse. Le carnet du bébé sera créé et rattaché à la famille ; le suivi après
            l&apos;accouchement commencera pour {patient.prenom}.
          </p>
          <FormulaireNaissance mereId={patient.id} date={aujourdhui} heure={heureBenin} />
        </>
      ) : (
        <p className="rounded-carte bg-white p-5">Aucune grossesse en cours pour {patient.prenom}.</p>
      )}
    </>
  );
}
