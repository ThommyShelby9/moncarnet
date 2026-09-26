import type { Metadata } from "next";
import Link from "next/link";
import { aujourdhuiAuBenin } from "@/domain/dates";
import { LIBELLES_CONSTAT } from "@/domain/evenements";
import { dateCourte, heureMinute } from "@/domain/temps";
import { consignesDuCentre, type ConsigneDuCentre } from "@/server/consignes";
import { db } from "@/server/db/client";
import { visitesDuCentre, type VisiteDuCentre } from "@/server/soignant/activite";
import { BoutonEcouter } from "@/ui/BoutonEcouter";
import { Chiffre } from "@/ui/Chiffre";
import { Icone } from "@/ui/Icone";
import { exigerSoignant } from "../contexte";

export const metadata: Metadata = { title: "Relais" };

const JOURS = 30;
const quand = (le: Date) => `${dateCourte(aujourdhuiAuBenin(le))}, ${heureMinute(le)}`;

/** Ce que les relais ont vu chez les patients du centre, et les visites que le centre leur a confiées (spec §4.8). */
export default async function Relais() {
  const soignant = await exigerSoignant();
  const depuis = new Date(Date.parse(`${aujourdhuiAuBenin()}T00:00:00+01:00`) - JOURS * 86_400_000);
  const [visites, consignes] = await Promise.all([visitesDuCentre(db(), soignant.etablissementId, depuis), consignesDuCentre(db(), soignant.etablissementId, depuis)]);
  const aOrienter = visites.filter((v) => v.constat === "a_orienter");
  const absents = visites.filter((v) => v.constat === "absent").length;
  const enAttente = consignes.filter((c) => !c.faiteLe).length;

  return (
    <>
      <header>
        <h1 className="text-3xl font-bold">Relais</h1>
        <p className="mt-1 text-gris">Ce que les relais ont vu chez vos patients ces {JOURS} derniers jours.</p>
      </header>
      <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Chiffre valeur={String(visites.length)} libelle="visites à domicile" />
        <Chiffre valeur={String(aOrienter.length)} libelle="personnes à orienter" alerte={aOrienter.length > 0} />
        <Chiffre valeur={String(absents)} libelle={absents > 1 ? "foyers absents" : "foyer absent"} />
        <Chiffre valeur={String(enAttente)} libelle={enAttente > 1 ? "consignes en attente" : "consigne en attente"} />
      </dl>

      <div className="grid items-start gap-5 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-5">
          <section aria-labelledby="titre-orienter" className="flex flex-col gap-3 rounded-carte bg-white p-5">
            <h2 id="titre-orienter" className="text-lg font-bold">
              À orienter vers le centre
            </h2>
            {aOrienter.length ? (
              <ul className="flex flex-col gap-3">
                {aOrienter.map((v) => (
                  <Visite key={v.id} visite={v} forte />
                ))}
              </ul>
            ) : (
              <p className="text-gris">Aucune personne à orienter.</p>
            )}
          </section>
          <section aria-labelledby="titre-visites" className="flex flex-col gap-3 rounded-carte bg-white p-5">
            <h2 id="titre-visites" className="text-lg font-bold">
              Toutes les visites
            </h2>
            {visites.length ? (
              <ul className="flex flex-col gap-3">
                {visites
                  .filter((v) => v.constat !== "a_orienter")
                  .map((v) => (
                    <Visite key={v.id} visite={v} />
                  ))}
              </ul>
            ) : (
              <p className="text-gris">Aucune visite ces {JOURS} derniers jours.</p>
            )}
          </section>
        </div>
        <Consignes consignes={consignes} />
      </div>
    </>
  );
}

function Visite({ visite: v, forte = false }: { visite: VisiteDuCentre; forte?: boolean }) {
  return (
    <li className={`flex items-start gap-3 rounded-2xl p-3 ${forte ? "bg-urgence-pale" : "bg-lavande"}`}>
      <span className={`grid size-10 shrink-0 place-items-center rounded-xl bg-white ${forte ? "text-urgence" : "text-marque"}`}>
        <Icone nom={forte ? "hi-alert-circle" : "hi-community-healthworker"} className="size-6" />
      </span>
      <div className="min-w-0 flex-1">
        <p>
          <Link href={`/soignant/patients/${v.patientId}`} className="font-bold underline decoration-lavande-4 underline-offset-2">
            {v.prenom} {v.nom}
          </Link>
          <span className="text-sm text-gris">
            {" "}
            · {LIBELLES_CONSTAT[v.constat]} · {quand(v.le)} · {v.relais}
          </span>
        </p>
        {v.texte && <p className="text-sm">« {v.texte} »</p>}
        {v.note && (
          <BoutonEcouter variante="complet" libelle="Écouter la visite" sousLibelle={`Note vocale de ${v.relais}`} source={`/api/fichiers/${v.id}`} className="mt-2" />
        )}
      </div>
    </li>
  );
}

function Consignes({ consignes }: { consignes: ConsigneDuCentre[] }) {
  return (
    <section aria-labelledby="titre-consignes" className="flex flex-col gap-3 rounded-carte bg-white p-5">
      <h2 id="titre-consignes" className="text-lg font-bold">
        Visites confiées aux relais
      </h2>
      <p className="-mt-2 text-sm text-gris">
        Depuis les{" "}
        <Link href="/soignant/suivis" className="font-bold text-marque underline">
          listes de suivi
        </Link>{" "}
        : la consigne est dans la tournée du relais jusqu&apos;à sa visite.
      </p>
      {consignes.length ? (
        <ul className="flex flex-col gap-2">
          {consignes.map((c) => (
            <li key={c.id} className="rounded-2xl bg-lavande p-3 text-sm">
              <Link href={`/soignant/patients/${c.patientId}`} className="font-bold">
                {c.prenom} {c.nom}
              </Link>
              <p>« {c.texte} »</p>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gris">
                {c.faiteLe ? (
                  <span className="rounded-lg bg-white px-2 py-0.5 font-bold text-marque">Visite faite le {dateCourte(aujourdhuiAuBenin(c.faiteLe))}</span>
                ) : (
                  <span className="rounded-lg bg-soleil-pale px-2 py-0.5 font-bold text-nuit">En attente de la visite</span>
                )}
                {c.auteur}, le {dateCourte(aujourdhuiAuBenin(c.creeLe))}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gris">Aucune visite confiée ces 30 derniers jours.</p>
      )}
    </section>
  );
}
