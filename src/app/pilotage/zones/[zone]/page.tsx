import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { aujourdhuiAuBenin } from "@/domain/dates";
import { CODES_INDICATEURS, INDICATEURS } from "@/domain/pilotage";
import { exigerRole } from "@/server/auth/cookies";
import { db } from "@/server/db/client";
import { lieuxDeLaZone, vueDUneZone } from "@/server/requetes/pilotage-etat";
import { Icone } from "@/ui/Icone";
import { CarteIndicateur } from "../../CarteIndicateur";
import { CarteZone } from "../../Cartes";
import { Confidentialite, EnCeMoment, lireCode, Onglets } from "../../communs";
import { CourbeIndicateur } from "../../CourbeIndicateur";
import { TableauCommunes } from "../../TableauCommunes";

export const metadata: Metadata = { title: "Fiche de zone" };

/** La fiche d'une zone sanitaire pour le ministère : ses indicateurs, sa tendance, et en direct ses communes et ses alertes. */
export default async function FicheZone({ params, searchParams }: PageProps<"/pilotage/zones/[zone]">) {
  const compte = await exigerRole("pilotage");
  if (compte.communeId) redirect("/pilotage");
  const [{ zone: brut }, recherche] = await Promise.all([params, searchParams]);
  const zone = decodeURIComponent(brut);
  const maintenant = new Date();
  const fiche = await vueDUneZone(db(), zone, aujourdhuiAuBenin(maintenant), maintenant);
  if (!fiche) notFound();
  const indicateur = lireCode(recherche.indicateur);
  const precedent = fiche.tendance.at(-2)?.valeurs;
  const base = `/pilotage/zones/${encodeURIComponent(zone)}?indicateur=`;
  const lieux = fiche.direct ? await lieuxDeLaZone(db(), zone) : [];

  return (
    <>
      <Link href="/pilotage/zones" className="flex items-center gap-1.5 self-start text-sm font-bold text-marque">
        <Icone nom="ph-arrow-left" className="size-4" />
        Zones sanitaires
      </Link>
      <header>
        <p className="flex items-center gap-2 text-sm font-bold text-gris">
          Zone sanitaire · {fiche.departement}
          {fiche.direct ? (
            <span className="rounded-md bg-soleil px-1.5 text-nuit">En direct</span>
          ) : (
            <span className="rounded-md bg-lavande-2 px-1.5 text-gris">Données de démonstration</span>
          )}
        </p>
        <h1 className="text-3xl font-bold">{fiche.zone}</h1>
        <p className="mt-1 text-gris">
          {fiche.direct
            ? `Calculé en direct depuis les carnets de ${fiche.communes.map((c) => c.nom).join(" et ")}.`
            : "Chiffres mensuels transmis par la zone (fictifs dans cette démonstration)."}
        </p>
      </header>
      <Confidentialite />
      {fiche.alertes && <EnCeMoment alertes={fiche.alertes} />}
      <section aria-labelledby="titre-mois" className="flex flex-col gap-3">
        <h2 id="titre-mois" className="text-lg font-bold">
          Ce mois-ci
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {CODES_INDICATEURS.map((c) => (
            <CarteIndicateur key={c} code={c} comptage={fiche.valeurs[c]} precedent={precedent?.[c]} />
          ))}
        </div>
      </section>
      <section aria-labelledby="titre-tendance" className="flex flex-col gap-3">
        <h2 id="titre-tendance" className="text-lg font-bold">
          Sur la carte et sur 6 mois : {INDICATEURS[indicateur].libelle.toLowerCase()}
        </h2>
        <Onglets actif={indicateur} base={base} />
        <div className="grid items-start gap-4 xl:grid-cols-2">
          <CarteZone
            zone={fiche.zone}
            code={indicateur}
            {...(fiche.direct ? { communes: fiche.communes, lieux } : { valeurZone: fiche.valeurs })}
            titre={`Carte de la zone ${fiche.zone} : ${INDICATEURS[indicateur].libelle.toLowerCase()}`}
          />
          <CourbeIndicateur code={indicateur} points={fiche.tendance.map((t) => ({ mois: t.mois, comptage: t.valeurs[indicateur] }))} />
        </div>
      </section>
      {fiche.communes.length > 0 && (
        <section aria-labelledby="titre-communes" className="flex flex-col gap-3">
          <h2 id="titre-communes" className="text-lg font-bold">
            Commune par commune
          </h2>
          <TableauCommunes lignes={[...fiche.communes, { nom: "Toute la zone", valeurs: fiche.valeurs, total: true }]} />
        </section>
      )}
    </>
  );
}
