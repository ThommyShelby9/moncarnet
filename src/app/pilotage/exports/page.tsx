import type { Metadata } from "next";
import { exigerRole } from "@/server/auth/cookies";
import { Icone } from "@/ui/Icone";
import { Confidentialite } from "../communs";

export const metadata: Metadata = { title: "Exports" };

/** Les fichiers à reprendre dans DHIS2 ou un tableur : des chiffres, jamais un nom (spec §4.10). */
export default async function Exports() {
  const compte = await exigerRole("pilotage");
  const zone = Boolean(compte.communeId);
  const fichiers = [
    {
      quoi: "mois",
      titre: "Indicateurs du mois",
      texte: zone ? "Chaque commune et toute la zone, pour les 9 indicateurs." : "Chaque zone sanitaire, pour les 9 indicateurs.",
    },
    {
      quoi: "historique",
      titre: "Historique sur 6 mois",
      texte: zone ? "Les 9 indicateurs de la zone, mois par mois." : "Chaque zone sanitaire, mois par mois.",
    },
    ...(zone
      ? [{ quoi: "centres", titre: "Centres et relais", texte: "Consultations, attente, alertes et places par centre ; foyers et visites par relais." }]
      : []),
  ];
  return (
    <>
      <header>
        <h1 className="text-3xl font-bold">Exports</h1>
        <p className="mt-1 text-gris">
          Fichiers CSV (séparateur « ; ») au format proche de DHIS2 : unité, période, élément, numérateur, dénominateur, valeur.
        </p>
      </header>
      <Confidentialite />
      <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {fichiers.map((f) => (
          <li key={f.quoi} className="flex flex-col gap-3 rounded-carte bg-white p-5">
            <h2 className="text-lg font-bold">{f.titre}</h2>
            <p className="flex-1 text-sm text-gris">{f.texte}</p>
            <a
              href={`/api/pilotage/export?quoi=${f.quoi}`}
              className="flex items-center justify-center gap-2 rounded-bouton bg-marque px-4 py-2.5 text-sm font-bold text-white"
            >
              <Icone nom="ph-download-simple" className="size-5" />
              Télécharger<span className="sr-only"> : {f.titre}</span>
            </a>
          </li>
        ))}
      </ul>
    </>
  );
}
