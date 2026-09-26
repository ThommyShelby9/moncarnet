import Link from "next/link";
import { CONSEIL_URGENCE, LIBELLES_SIGNES, signesProposes } from "@/domain/signes-danger";
import { db } from "@/server/db/client";
import { etablissementDuPatient } from "@/server/requetes/carnets";
import { contenuPour } from "@/server/contenus";
import { AvatarsFamille } from "@/ui/AvatarsFamille";
import { Icone } from "@/ui/Icone";
import { contextePatient } from "../contexte";
import { FormulaireSignalement } from "./FormulaireSignalement";

export default async function Probleme({ searchParams }: PageProps<"/probleme">) {
  const params = await searchParams;
  const { carnets, carnet, titulaire } = await contextePatient(params.pour);
  if (!carnet) return <main className="px-4 pt-5">Aucun carnet pour ce compte.</main>;
  const [centre, conseil, conseilParle] = await Promise.all([
    etablissementDuPatient(db(), carnet.patientId),
    contenuPour(db(), "danger_conseil", "fr"),
    contenuPour(db(), "danger_conseil", (titulaire ?? carnet).langue),
  ]);
  const signes = signesProposes({ enceinte: carnet.programmes.includes("grossesse"), age: carnet.age });

  return (
    <main className="flex flex-1 flex-col gap-4 px-4 pt-5 pb-6">
      <div className="flex items-start gap-3">
        <AvatarsFamille personnes={carnets} actif={carnet.patientId} lien={(id) => `/probleme?pour=${id}`} />
        <Link href="/" aria-label="Fermer" className="ml-auto grid size-10 shrink-0 place-items-center rounded-full bg-white">
          <Icone nom="ph-x" className="size-5" />
        </Link>
      </div>
      <FormulaireSignalement
        key={carnet.patientId}
        patientId={carnet.patientId}
        prenom={carnet.lien === "soi" ? null : carnet.prenom}
        signes={signes.map((code) => ({ code, libelle: LIBELLES_SIGNES[code] }))}
        centre={{ nom: centre?.nom ?? "centre de santé", telephone: centre?.telephone ?? null }}
        conseil={conseil?.texte || CONSEIL_URGENCE}
        audioConseil={conseilParle?.audio ?? null}
      />
    </main>
  );
}
