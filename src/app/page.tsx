import { aujourdhuiAuBenin } from "@/domain/dates";
import { exigerRole } from "@/server/auth/cookies";
import { db } from "@/server/db/client";
import { carnetsDuCompte } from "@/server/requetes/carnets";
import { iconePourPersonne, libelleLien } from "@/ui/avatar";
import { EnTete } from "@/ui/EnTete";
import { Icone } from "@/ui/Icone";

export default async function AccueilPatient() {
  const compte = await exigerRole("patient");
  const carnets = await carnetsDuCompte(db(), compte.id, aujourdhuiAuBenin());
  const moi = carnets.find((c) => c.lien === "soi");

  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 px-4 py-6">
      <EnTete nomAffiche={compte.nomAffiche} />
      <h1 className="text-3xl font-bold">Bonjour {moi?.prenom ?? compte.nomAffiche}</h1>
      <section aria-labelledby="titre-carnets" className="flex flex-col gap-3">
        <h2 id="titre-carnets" className="text-lg font-bold">
          Les carnets de ma famille
        </h2>
        <ul className="grid gap-3">
          {carnets.map((c) => (
            <li key={c.patientId} className="flex items-center gap-3 rounded-carte bg-white p-4">
              <span className="grid size-12 place-items-center rounded-full bg-lavande-2 text-marque">
                <Icone nom={iconePourPersonne(c.sexe, c.age)} className="size-8" />
              </span>
              <span>
                <span className="block font-bold">
                  {c.prenom} {c.nom}
                </span>
                <span className="text-sm text-gris">
                  {libelleLien(c.lien, c.sexe)}, {c.libelleAge}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
