import Link from "next/link";
import { seDeconnecter } from "@/app/actions-session";
import { iconePourPersonne, libelleLien } from "@/ui/avatar";
import { Icone } from "@/ui/Icone";
import { contextePatient } from "../../contexte";

export default async function Famille() {
  const { compte, carnets } = await contextePatient();
  return (
    <>
      <h1 className="text-[1.65rem] leading-tight font-bold">Ma famille</h1>
      <p className="-mt-2 text-gris">Les carnets suivis sur ce téléphone.</p>
      <ul className="flex flex-col gap-2.5">
        {carnets.map((c) => (
          <li key={c.patientId}>
            <Link href={`/carnet?pour=${c.patientId}`} className="flex items-center gap-3 rounded-carte bg-white p-3">
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-lavande-2 text-marque">
                <Icone nom={iconePourPersonne(c.sexe, c.age)} className="size-8" />
              </span>
              <span className="flex-1">
                <b className="block text-lg">
                  {c.prenom} {c.nom}
                </b>
                <span className="text-sm text-gris">
                  {libelleLien(c.lien, c.sexe)}, {c.libelleAge}
                </span>
              </span>
              <Icone nom="ph-caret-right" className="size-5 text-gris" />
            </Link>
          </li>
        ))}
      </ul>
      <form action={seDeconnecter} className="mt-auto">
        <button className="flex w-full items-center justify-center gap-2 rounded-bouton bg-white py-3.5 font-bold text-marque">
          <Icone nom="ph-sign-out" className="size-5" />
          Se déconnecter
        </button>
      </form>
      <p className="text-center text-xs text-gris">Compte : {compte.nomAffiche}</p>
    </>
  );
}
