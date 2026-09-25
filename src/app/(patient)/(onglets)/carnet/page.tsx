import { dateLongue, LIBELLE_MOMENT_POSOLOGIE } from "@/domain/temps";
import type { TraitementEnCours } from "@/domain/traitements";
import { db } from "@/server/db/client";
import { traitementsDes } from "@/server/requetes/accueil";
import { programmesDuCarnet } from "@/server/requetes/carnet";
import { iconePourPersonne } from "@/ui/avatar";
import { AvatarsFamille } from "@/ui/AvatarsFamille";
import { BoutonEcouter } from "@/ui/BoutonEcouter";
import { Icone } from "@/ui/Icone";
import { Ondes } from "@/ui/Ondes";
import { ICONE_MOMENT } from "@/ui/pictogrammes";
import { contextePatient } from "../../contexte";
import { SectionProgramme } from "./Frise";

export default async function MonCarnet({ searchParams }: PageProps<"/carnet">) {
  const params = await searchParams;
  const { aujourdhui, carnets, carnet } = await contextePatient(params.pour);
  if (!carnet) return <p className="rounded-carte bg-white p-4">Aucun carnet pour ce compte.</p>;
  const [programmes, traitements] = await Promise.all([
    programmesDuCarnet(db(), carnet.patientId, aujourdhui),
    traitementsDes(db(), [carnet.patientId], aujourdhui),
  ]);
  const suivis = programmes.filter((p) => p.etapes.length > 0);
  const sousTitre = suivis.length ? suivis.map((p) => p.nom).join(" · ") : "Carnet de santé";
  const faites = suivis.flatMap((p) => p.etapes).filter((e) => e.statut === "faite").length;
  const resume = `Carnet de ${carnet.prenom}, ${carnet.libelleAge}. ${sousTitre}. ${faites} étape${faites > 1 ? "s" : ""} faite${faites > 1 ? "s" : ""}. ${
    traitements.length ? `${traitements.length} médicament${traitements.length > 1 ? "s" : ""} en cours.` : ""
  }`;

  return (
    <>
      <AvatarsFamille personnes={carnets} actif={carnet.patientId} lien={(id) => `/carnet?pour=${id}`} />
      <header className="relative overflow-hidden rounded-grande bg-marque p-4 text-white">
        <Ondes className="-top-8 -right-14 size-52 text-white opacity-10" />
        <div className="relative flex items-center gap-3">
          <span className="grid size-13 shrink-0 place-items-center rounded-[18px] bg-white text-marque">
            <Icone nom={iconePourPersonne(carnet.sexe, carnet.age)} className="size-9" />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl leading-tight font-bold">
              {carnet.prenom}, {carnet.libelleAge}
            </h1>
            <p className="text-sm text-lavande-3">{sousTitre}</p>
          </div>
          <BoutonEcouter variante="rond" libelle="Écouter le carnet" texte={resume} />
        </div>
      </header>
      {suivis.map((p) => (
        <SectionProgramme key={p.code} programme={p} patientId={carnet.patientId} aujourdhui={aujourdhui} />
      ))}
      {traitements.length > 0 && <Medicaments traitements={traitements} soi={carnet.lien === "soi"} />}
      {suivis.length === 0 && traitements.length === 0 && (
        <p className="rounded-carte bg-white p-4 text-gris">Rien à suivre pour le moment. Les consultations se prennent à la demande.</p>
      )}
    </>
  );
}

function Medicaments({ traitements, soi }: { traitements: TraitementEnCours[]; soi: boolean }) {
  return (
    <section aria-labelledby="medicaments" className="flex flex-col gap-2.5">
      <h2 id="medicaments" className="text-lg font-bold">
        {soi ? "Mes médicaments" : "Ses médicaments"}
      </h2>
      <ul className="flex flex-col gap-2">
        {traitements.map((t) => (
          <li key={t.cle} className="rounded-carte bg-white p-3.5">
            <div className="flex items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-lavande-2 text-marque">
                <Icone nom="ph-pill" className="size-6" />
              </span>
              <div className="min-w-0 flex-1">
                <b className="block">{t.medicament}</b>
                <small className="text-xs text-gris">
                  {t.indication ? `Pour ${t.indication} · ` : ""}jusqu&apos;au {dateLongue(t.dernierJour)}
                </small>
              </div>
            </div>
            <ul aria-label="Quand le prendre" className="mt-3 flex flex-wrap gap-2">
              {t.prises.map((p) => (
                <li key={p.moment} className="flex items-center gap-1.5 rounded-xl bg-soleil-pale px-2.5 py-1.5 text-sm font-bold">
                  <Icone nom={ICONE_MOMENT[p.moment]} className="size-5 text-soleil-appuye" />
                  {LIBELLE_MOMENT_POSOLOGIE[p.moment]} : {p.quantite} comprimé{p.quantite > 1 ? "s" : ""}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  );
}
