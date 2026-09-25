import Link from "next/link";
import { aujourdhuiAuBenin } from "@/domain/dates";
import { formaterTelephone, normaliserTelephone } from "@/domain/telephone";
import { db } from "@/server/db/client";
import { rechercherPatients } from "@/server/requetes/soignant";
import { iconePourPersonne } from "@/ui/avatar";
import { Icone } from "@/ui/Icone";
import { exigerSoignant } from "../contexte";
import { RechercheRapide } from "../RechercheRapide";

export default async function Patients({ searchParams }: PageProps<"/soignant/patients">) {
  const soignant = await exigerSoignant();
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  const resultats = q ? await rechercherPatients(db(), soignant.etablissementId, q, aujourdhuiAuBenin()) : [];
  return (
    <>
      <header className="flex flex-wrap items-end gap-4">
        <h1 className="flex-1 text-3xl font-bold">Patients</h1>
        <RechercheRapide valeur={q} />
      </header>
      {!q && <p className="text-gris">Tapez un nom, un numéro de téléphone ou le code du carnet (6 caractères, écrit dans le carnet).</p>}
      {q && resultats.length === 0 && <p className="rounded-carte bg-white p-4">Aucun patient du centre ne correspond à « {q} ».</p>}
      <ul className="grid gap-2.5 md:grid-cols-2">
        {resultats.map((p) => {
          const telephone = p.telephone ? normaliserTelephone(p.telephone) : null;
          return (
            <li key={p.id}>
              <Link href={`/soignant/patients/${p.id}`} className="flex items-center gap-3 rounded-carte bg-white p-3.5">
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-lavande-2 text-marque">
                  <Icone nom={iconePourPersonne(p.sexe, p.age)} className="size-7" />
                </span>
                <span className="min-w-0 flex-1">
                  <b className="block">
                    {p.prenom} {p.nom}
                  </b>
                  <small className="block text-gris">
                    {p.libelleAge}
                    {p.village ? ` · ${p.village}` : ""} · carnet {p.codeCourt}
                    {telephone ? ` · ${formaterTelephone(telephone)}` : ""}
                  </small>
                </span>
                <Icone nom="ph-caret-right" className="size-5 text-gris" />
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
