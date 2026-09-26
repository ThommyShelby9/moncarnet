import type { Metadata } from "next";
import Link from "next/link";
import { env } from "@/config/env";
import { aujourdhuiAuBenin } from "@/domain/dates";
import { exigerRole } from "@/server/auth/cookies";
import { db } from "@/server/db/client";
import { etatDeLaDemo } from "@/server/demo/etat";
import { EnTete } from "@/ui/EnTete";
import { Icone } from "@/ui/Icone";
import type { NomIcone } from "@/ui/icones";
import { RetourAction } from "@/ui/RetourAction";
import { envoyerRappelsAction, reinitialiserDemoAction, relancerRappelsAction } from "./actions";

export const metadata: Metadata = { title: "Administration" };

const NOTES: Record<string, { texte: string; alerte?: boolean }> = {
  reinitialisee: { texte: "La démo est remise à zéro : les parcours peuvent être rejoués." },
  a_confirmer: { texte: "Cochez la case pour confirmer la remise à zéro.", alerte: true },
  hors_demo: { texte: "La remise à zéro n'est possible qu'en mode démonstration.", alerte: true },
};

export default async function PageAdmin({ searchParams }: PageProps<"/admin">) {
  const compte = await exigerRole("admin");
  const params = await searchParams;
  const nombre = Number(params.nombre ?? 0);
  const note =
    params.note === "rappels"
      ? { texte: `${nombre} rappel${nombre > 1 ? "s" : ""} envoyé${nombre > 1 ? "s" : ""} pour les places de dans 2 jours.` }
      : params.note === "relances"
        ? { texte: `${nombre} relance${nombre > 1 ? "s" : ""} sur le canal suivant.` }
        : NOTES[String(params.note ?? "")];
  const etat = await etatDeLaDemo(db(), aujourdhuiAuBenin());
  const chiffres: { icone: NomIcone; valeur: number; libelle: string }[] = [
    { icone: "ph-users-three", valeur: etat.comptes, libelle: "comptes" },
    { icone: "ph-list-checks", valeur: etat.carnets, libelle: "carnets" },
    { icone: "ph-house", valeur: etat.foyers, libelle: "foyers" },
    { icone: "hi-alert-circle", valeur: etat.alertesEnCours, libelle: "alertes en cours" },
    { icone: "hi-hospital", valeur: etat.enSalleAttente, libelle: "en salle d'attente" },
  ];
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6">
      <EnTete nomAffiche={compte.nomAffiche} sousTitre="Administration" />
      <nav aria-label="Administration" className="flex gap-2">
        <Link href="/admin" aria-current="page" className="rounded-bouton bg-marque px-4 py-2 text-sm font-bold text-white">
          La démo
        </Link>
        <Link href="/admin/contenus" className="rounded-bouton bg-white px-4 py-2 text-sm font-bold text-marque">
          Contenus de santé
        </Link>
      </nav>
      <h1 className="text-3xl font-bold">Administration</h1>
      {note && (note.alerte ? <p role="alert" className="rounded-carte bg-urgence-pale px-4 py-3 font-bold text-urgence">{note.texte}</p> : <RetourAction message={note.texte} />)}
      <section aria-labelledby="titre-etat" className="flex flex-col gap-3">
        <h2 id="titre-etat" className="text-lg font-bold">
          La démo en ce moment
        </h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {chiffres.map((c) => (
            <li key={c.libelle} className="flex items-center gap-3 rounded-carte bg-white p-4">
              <Icone nom={c.icone} className="size-7 shrink-0 text-marque" />
              <span>
                <b className="block text-2xl leading-none">{c.valeur}</b>
                <small className="text-sm text-gris">{c.libelle}</small>
              </span>
            </li>
          ))}
        </ul>
      </section>
      {env.DEMO_MODE && (
        <section aria-labelledby="titre-remise" className="flex flex-col gap-3 rounded-carte bg-white p-5">
          <h2 id="titre-remise" className="text-lg font-bold">
            Rejouer les parcours
          </h2>
          <p className="text-gris">
            Remet toute la démo dans son état de départ : Awa enceinte de 37 semaines, Mariam attendue ce matin, la tournée de Koffi, les indicateurs de la zone. Les
            comptes de démonstration restent les mêmes.
          </p>
          <form action={reinitialiserDemoAction} className="flex flex-col gap-3">
            <label className="flex items-center gap-3 font-bold">
              <input type="checkbox" name="confirmer" required className="size-5 accent-marque" />
              Je remets toute la démo à zéro
            </label>
            <button className="flex items-center justify-center gap-2 self-start rounded-bouton bg-marque px-5 py-3 font-bold text-white">
              <Icone nom="ph-arrow-counter-clockwise" className="size-5" />
              Réinitialiser la démo
            </button>
          </form>
        </section>
      )}
      {env.DEMO_MODE && (
        <section aria-labelledby="titre-rappels" className="flex flex-col gap-3 rounded-carte bg-white p-5">
          <h2 id="titre-rappels" className="text-lg font-bold">
            Rappels en cascade <span className="text-sm font-normal text-gris">(canaux simulés)</span>
          </h2>
          <p className="text-gris">
            À J-2, un rappel part sur le premier canal de la personne ; sans réponse, il passe au suivant : WhatsApp, SMS, appel vocal, puis le relais du village.
          </p>
          <div className="flex flex-wrap gap-2">
            <form action={envoyerRappelsAction}>
              <button className="flex items-center gap-2 rounded-bouton bg-marque px-4 py-2.5 font-bold text-white">
                <Icone nom="ph-bell" className="size-5" />
                Envoyer les rappels de J-2
              </button>
            </form>
            <form action={relancerRappelsAction}>
              <button className="flex items-center gap-2 rounded-bouton bg-lavande-2 px-4 py-2.5 font-bold text-marque">
                <Icone nom="ph-arrow-counter-clockwise" className="size-5" />
                Relancer ceux sans réponse
              </button>
            </form>
            <Link href="/demo/telephone" className="flex items-center gap-2 rounded-bouton bg-lavande px-4 py-2.5 font-bold text-marque">
              <Icone nom="ph-device-mobile" className="size-5" />
              Le faux téléphone
            </Link>
          </div>
        </section>
      )}
      <p className="text-sm text-gris">
        Voir aussi :{" "}
        <Link href="/demo" className="font-bold text-marque underline">
          les comptes de démonstration
        </Link>{" "}
        et{" "}
        <Link href="/decouvrir" className="font-bold text-marque underline">
          la présentation
        </Link>
        .
      </p>
    </main>
  );
}
