import Link from "next/link";
import { cartesDuJour } from "@/domain/cartes-du-jour";
import { heureAuBenin, salutation } from "@/domain/temps";
import type { TraitementEnCours } from "@/domain/traitements";
import { db } from "@/server/db/client";
import { donneesAccueil } from "@/server/requetes/accueil";
import { AvatarsFamille } from "@/ui/AvatarsFamille";
import { Icone } from "@/ui/Icone";
import { Logo } from "@/ui/Logo";
import { PileDeCartes } from "@/ui/PileDeCartes";
import { RetourAction } from "@/ui/RetourAction";
import { noterPriseAction } from "../actions";
import { contextePatient, texteDe } from "../contexte";
import { CarteDuJourVue } from "./CarteDuJourVue";
import { Ensuite } from "./Ensuite";

const MESSAGES: Record<string, string> = {
  fait: "C'est noté.",
  plus_tard: "D'accord, c'est pour plus tard.",
  annule: "C'est annulé : la prise est de nouveau à faire.",
  alerte_annulee: "L'alerte est annulée.",
  alerte_deja_prise: "Un soignant s'occupe déjà de votre alerte.",
};

export default async function Accueil({ searchParams }: PageProps<"/">) {
  const params = await searchParams;
  const { aujourdhui, carnets, carnet, titulaire } = await contextePatient(params.pour);
  if (!carnet || !titulaire) return <SansCarnet />;

  // Le titulaire voit les cartes de toute la famille ; un avatar ne montre que la personne choisie.
  const vueFamille = carnet.patientId === titulaire.patientId;
  const personnes = vueFamille ? carnets : [carnet];
  const heure = heureAuBenin();
  const donnees = await donneesAccueil(db(), personnes.map((c) => c.patientId), aujourdhui);
  const { pile, ensuite } = cartesDuJour({ aujourdhui, heure, ...donnees });
  const prenomPour = (patientId: string) =>
    patientId === titulaire.patientId ? null : (carnets.find((c) => c.patientId === patientId)?.prenom ?? null);
  const retour = vueFamille ? "" : carnet.patientId;

  return (
    <>
      <div className="flex items-start gap-3">
        <AvatarsFamille personnes={carnets} actif={carnet.patientId} lien={(id) => (id === titulaire.patientId ? "/" : `/?pour=${id}`)} />
        <Logo className="ml-auto size-9 shrink-0" />
      </div>
      <div>
        <h1 className="text-[1.65rem] leading-tight font-bold">
          {salutation(heure)} {titulaire.prenom}
        </h1>
        {!vueFamille && <p className="text-gris">Le carnet de {carnet.prenom}</p>}
      </div>
      <Retour note={texteDe(params.note)} carte={texteDe(params.carte)} traitements={donnees.traitements} retour={retour} />
      {pile.length > 0 ? (
        <PileDeCartes titre="À faire">
          {pile.map((carte) => (
            <CarteDuJourVue key={carte.cle} carte={carte} aujourdhui={aujourdhui} pour={prenomPour(carte.patientId)} retour={retour} />
          ))}
        </PileDeCartes>
      ) : (
        <RienAFaire patientId={carnet.patientId} />
      )}
      {ensuite && <Ensuite carte={ensuite} pour={prenomPour(ensuite.patientId)} />}
      <Link
        href={`/probleme?pour=${carnet.patientId}`}
        className="mt-auto flex items-center justify-center gap-2.5 rounded-[18px] bg-urgence p-3.5 text-lg font-bold text-white shadow-[0_8px_18px_-8px_rgb(217_45_32_/_0.7)]"
      >
        <Icone nom="hi-alert-circle" className="size-6" />
        J&apos;ai un problème
      </Link>
    </>
  );
}

function Retour({ note, carte, traitements, retour }: { note?: string; carte?: string; traitements: TraitementEnCours[]; retour: string }) {
  const message = note ? MESSAGES[note] : undefined;
  if (!message) return null;
  const [traitementCle, moment] = (carte ?? "").split("|");
  const traitement = traitements.find((t) => t.cle === traitementCle);
  return (
    <RetourAction message={message}>
      {note === "fait" && traitement && moment && (
        <form action={noterPriseAction}>
          <input type="hidden" name="patientId" value={traitement.patientId} />
          <input type="hidden" name="traitementCle" value={traitement.cle} />
          <input type="hidden" name="moment" value={moment} />
          <input type="hidden" name="pour" value={retour} />
          <button name="statut" value="annule" className="flex items-center gap-1.5 rounded-bouton bg-white/15 px-3 py-2 text-sm font-bold">
            <Icone nom="ph-arrow-counter-clockwise" className="size-4" />
            Annuler
          </button>
        </form>
      )}
    </RetourAction>
  );
}

function RienAFaire({ patientId }: { patientId: string }) {
  return (
    <section className="flex flex-col gap-2 rounded-grande bg-white p-5">
      <Icone nom="ph-sun" className="size-10 text-soleil-appuye" />
      <h2 className="text-xl font-bold">Rien à faire pour le moment</h2>
      <p className="text-gris">Pas de médicament à prendre ni de rendez-vous proche.</p>
      <Link href={`/prendre-rendez-vous?pour=${patientId}`} className="mt-2 flex h-12 items-center justify-center gap-2 rounded-bouton bg-marque font-bold text-white">
        <Icone nom="ph-calendar-check" className="size-5" />
        Prendre un rendez-vous
      </Link>
    </section>
  );
}

function SansCarnet() {
  return (
    <section className="rounded-grande bg-white p-5">
      <h1 className="text-xl font-bold">Aucun carnet pour ce compte</h1>
      <p className="mt-2 text-gris">Demandez au centre de santé ou à votre relais de lier votre carnet à ce téléphone.</p>
    </section>
  );
}
