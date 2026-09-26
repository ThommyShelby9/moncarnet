import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { joursEntre } from "@/domain/dates";
import { suiviDeGrossesse } from "@/domain/grossesse";
import { formaterTelephone, normaliserTelephone } from "@/domain/telephone";
import { dateLongue, libelleDansJours, majuscule } from "@/domain/temps";
import { db } from "@/server/db/client";
import { programmesDuCarnet } from "@/server/requetes/carnet";
import { etablissementDuPatient } from "@/server/requetes/carnets";
import { grossesseDe, planNaissanceDe } from "@/server/requetes/grossesse";
import { AvatarsFamille } from "@/ui/AvatarsFamille";
import { BoutonEcouter } from "@/ui/BoutonEcouter";
import { Icone } from "@/ui/Icone";
import { Ondes } from "@/ui/Ondes";
import { contextePatient } from "../../contexte";
import { FriseGrossesse } from "./FriseGrossesse";
import { PlanNaissance } from "./PlanNaissance";

export const metadata: Metadata = { title: "Ma grossesse" };

const nombre = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 1 });

/** La grossesse semaine par semaine : où on en est, la taille du bébé, la préparation de la naissance. */
export default async function MaGrossesse({ searchParams }: PageProps<"/grossesse">) {
  const params = await searchParams;
  const { aujourdhui, carnets, carnet } = await contextePatient(params.pour);
  if (!carnet) redirect("/");
  const grossesse = await grossesseDe(db(), carnet.patientId);
  if (!grossesse) redirect(`/carnet?pour=${carnet.patientId}`);
  const [plan, programmes, centre] = await Promise.all([
    planNaissanceDe(db(), carnet.patientId),
    programmesDuCarnet(db(), carnet.patientId, aujourdhui),
    etablissementDuPatient(db(), carnet.patientId),
  ]);
  const suivi = suiviDeGrossesse(grossesse.ddr, aujourdhui);
  const etapes = programmes.find((p) => p.code === "grossesse")?.etapes ?? [];
  const reperes = etapes.map((e) => ({ code: e.code, libelle: e.libelle, statut: e.statut, semaine: Math.floor(joursEntre(grossesse.ddr, e.datePrevue) / 7) }));
  const telephone = centre?.telephone ? normaliserTelephone(centre.telephone) : null;
  const soi = carnet.lien === "soi";
  const resume = `${soi ? "Vous êtes" : `${carnet.prenom} est`} à ${suivi.semaines} semaines de grossesse. Le terme est prévu le ${dateLongue(suivi.terme)}. Le bébé mesure environ ${nombre(suivi.taille.cm)} centimètres et pèse environ ${nombre(suivi.taille.grammes / 1000)} kilo, à peu près comme ${suivi.taille.comme}. ${suivi.conseils.join(" ")}`;

  return (
    <>
      <AvatarsFamille personnes={carnets} actif={carnet.patientId} lien={(id) => `/grossesse?pour=${id}`} />
      <header className="relative overflow-hidden rounded-grande bg-marque p-5 text-white">
        <Ondes className="-top-10 -right-12 size-56 text-white opacity-10" />
        <div className="relative flex items-start justify-between gap-3">
          <h1 className="text-2xl leading-tight font-bold">{soi ? "Ma grossesse" : `Grossesse de ${carnet.prenom}`}</h1>
          <BoutonEcouter variante="rond" libelle="Écouter" texte={resume} />
        </div>
        <div className="relative mt-3 flex items-center gap-4">
          <div className="grid size-24 shrink-0 place-items-center rounded-full border-[6px] border-white/25 bg-white/10 text-center">
            <span>
              <b className="block text-4xl leading-none">{suivi.semaines}</b>
              <small className="text-xs text-white">semaines</small>
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-bold">{suivi.trimestre === 3 ? "3ᵉ trimestre" : suivi.trimestre === 2 ? "2ᵉ trimestre" : "1ᵉʳ trimestre"}</p>
            <p className="text-sm text-lavande-3">
              {suivi.semaines} semaines et {suivi.jours} jour{suivi.jours > 1 ? "s" : ""}
            </p>
            <p className="mt-1.5 font-bold">Terme prévu : {dateLongue(suivi.terme)}</p>
            {suivi.joursAvantTerme > 0 && <p className="text-sm text-soleil">{majuscule(libelleDansJours(suivi.joursAvantTerme))}</p>}
          </div>
        </div>
      </header>

      <section aria-labelledby="titre-bebe" className="flex items-center gap-4 rounded-carte bg-white p-4">
        <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-soleil-pale text-soleil-appuye">
          <Icone nom="hi-fetus" className="size-11" />
        </span>
        <div>
          <h2 id="titre-bebe" className="text-sm font-bold text-gris">
            Le bébé cette semaine
          </h2>
          <p className="text-lg leading-snug font-bold">
            Environ {nombre(suivi.taille.cm)} cm et {nombre(suivi.taille.grammes / 1000)} kg
          </p>
          <p className="text-gris">À peu près comme {suivi.taille.comme}.</p>
        </div>
      </section>

      <section aria-labelledby="titre-frise" className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <h2 id="titre-frise" className="text-lg font-bold">
            Les consultations
          </h2>
          <Link href={`/carnet?pour=${carnet.patientId}`} className="text-sm font-bold text-marque">
            Voir le carnet
          </Link>
        </div>
        <FriseGrossesse semaines={suivi.semaines} reperes={reperes} />
      </section>

      <PlanNaissance patientId={carnet.patientId} coches={plan} />

      <section aria-labelledby="titre-conseils" className="flex flex-col gap-2 rounded-carte bg-white p-4">
        <h2 id="titre-conseils" className="text-lg font-bold">
          Cette semaine
        </h2>
        <ul className="flex flex-col gap-2.5">
          {suivi.conseils.map((conseil) => (
            <li key={conseil} className="flex items-start gap-3">
              <BoutonEcouter variante="pastille" libelle={`Écouter : ${conseil}`} texte={conseil} />
              <span className="pt-1">{conseil}</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="titre-jour-j" className="relative overflow-hidden rounded-carte bg-nuit p-4 text-white">
        <Ondes className="-right-10 -bottom-16 size-44 text-white opacity-10" />
        <h2 id="titre-jour-j" className="relative text-lg font-bold">
          Le jour J
        </h2>
        <p className="relative mt-1 text-lavande-3">Le travail commence, vous perdez de l&apos;eau ou du sang, le bébé bouge moins : prévenez le centre tout de suite.</p>
        <div className="relative mt-3 grid gap-2 sm:grid-cols-2">
          <Link href={`/probleme?pour=${carnet.patientId}`} className="flex items-center justify-center gap-2 rounded-bouton bg-urgence p-3 font-bold">
            <Icone nom="hi-alert-circle" className="size-6" />
            J&apos;ai un problème
          </Link>
          {telephone && (
            <a href={`tel:${telephone}`} className="flex items-center justify-center gap-2 rounded-bouton bg-white p-3 font-bold text-marque">
              <Icone nom="ph-phone" className="size-6" />
              {formaterTelephone(telephone)}
            </a>
          )}
        </div>
      </section>
      <p className="text-center text-xs text-gris">Valeurs indicatives, à confirmer avec la sage-femme.</p>
    </>
  );
}
