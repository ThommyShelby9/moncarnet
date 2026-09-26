import Link from "next/link";
import { notFound } from "next/navigation";
import { aujourdhuiAuBenin } from "@/domain/dates";
import { dateCourte } from "@/domain/temps";
import { db } from "@/server/db/client";
import { rupturesEnCours } from "@/server/pharmacie/ruptures";
import { dossierPatient } from "@/server/requetes/soignant";
import { Icone } from "@/ui/Icone";
import { exigerSoignant } from "../../../contexte";
import { FormulaireOrdonnance } from "./FormulaireOrdonnance";

export default async function NouvelleOrdonnance({ params }: PageProps<"/soignant/patients/[id]/ordonnance">) {
  const soignant = await exigerSoignant();
  const { id } = await params;
  const [dossier, ruptures] = await Promise.all([dossierPatient(db(), soignant.etablissementId, id, aujourdhuiAuBenin()), rupturesEnCours(db())]);
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
      {ruptures.length > 0 && (
        <section aria-labelledby="titre-ruptures" className="flex items-start gap-3 rounded-carte bg-soleil-pale px-4 py-3">
          <Icone nom="ph-package" className="size-6 shrink-0 text-soleil-fonce" />
          <div>
            <h2 id="titre-ruptures" className="font-bold">
              En rupture dans les pharmacies
            </h2>
            <ul className="text-sm">
              {ruptures.map((r) => (
                <li key={r.id}>
                  <b>{r.medicament}</b> : {r.pharmacie}, depuis le {dateCourte(aujourdhuiAuBenin(r.signaleeLe))}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
      <FormulaireOrdonnance patientId={patient.id} />
    </>
  );
}
