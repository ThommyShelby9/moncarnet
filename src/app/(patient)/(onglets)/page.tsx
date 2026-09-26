import Link from "next/link";
import { cartesDuJour } from "@/domain/cartes-du-jour";
import { ajouterJours, aujourdhuiAuBenin } from "@/domain/dates";
import { suiviDeGrossesse } from "@/domain/grossesse";
import { dateLongue, debutDuJourAuBenin, heureAuBenin, libelleDansJours, salutation } from "@/domain/temps";
import type { TraitementEnCours } from "@/domain/traitements";
import { db } from "@/server/db/client";
import { donneesAccueil } from "@/server/requetes/accueil";
import { grossesseDe, naissancesRecentes, planNaissanceDe } from "@/server/requetes/grossesse";
import { peuventArriver, placesDuJour } from "@/server/salle-attente";
import { Actualisation } from "@/ui/Actualisation";
import { AvatarsFamille } from "@/ui/AvatarsFamille";
import { Icone } from "@/ui/Icone";
import { Logo } from "@/ui/Logo";
import { Ondes } from "@/ui/Ondes";
import { PileDeCartes } from "@/ui/PileDeCartes";
import { RetourAction } from "@/ui/RetourAction";
import { noterPriseAction } from "../actions";
import { contextePatient, texteDe } from "../contexte";
import { CarteDuJourVue } from "./CarteDuJourVue";
import { CarteSalleAttente } from "./CarteSalleAttente";
import { Ensuite } from "./Ensuite";

const MESSAGES: Record<string, string> = {
  fait: "C'est noté.",
  plus_tard: "D'accord, c'est pour plus tard.",
  annule: "C'est annulé : la prise est de nouveau à faire.",
  alerte_annulee: "L'alerte est annulée.",
  alerte_deja_prise: "Un soignant s'occupe déjà de votre alerte.",
  arrive: "C'est noté : votre numéro de passage est là. Le téléphone vous dira quand c'est votre tour.",
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
  const [grossesses, naissances] = await Promise.all([
    Promise.all(
      personnes
        .filter((c) => c.programmes.includes("grossesse"))
        .map(async (c) => {
          const [grossesse, plan] = await Promise.all([grossesseDe(db(), c.patientId), planNaissanceDe(db(), c.patientId)]);
          return grossesse ? { carnet: c, suivi: suiviDeGrossesse(grossesse.ddr, aujourdhui), prets: plan.length } : null;
        }),
    ),
    // Une naissance des 14 derniers jours : la famille est félicitée, le carnet du bébé est à un geste.
    naissancesRecentes(db(), personnes.map((c) => c.patientId), debutDuJourAuBenin(ajouterJours(aujourdhui, -14))),
  ]);
  const enCours = grossesses.filter((g) => g !== null);
  // Salle d'attente : la place de chacun aujourd'hui, ou « Je suis arrivé » pour qui a rendez-vous ou une alerte du jour.
  const idsAffiches = personnes.map((c) => c.patientId);
  const [places, arrivees] = await Promise.all([placesDuJour(db(), idsAffiches, aujourdhui), peuventArriver(db(), idsAffiches, aujourdhui)]);
  const auCentre = personnes.filter((c) => places.has(c.patientId) || arrivees.has(c.patientId));
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
      {naissances.map((n) => (
        <Felicitations key={n.bebeId} naissance={n} />
      ))}
      {places.size > 0 && <Actualisation secondes={15} />}
      {auCentre.map((c) => (
        <CarteSalleAttente key={c.patientId} patientId={c.patientId} prenom={prenomPour(c.patientId)} place={places.get(c.patientId) ?? null} />
      ))}
      {pile.length > 0 ? (
        <PileDeCartes titre="À faire">
          {pile.map((carte) => (
            <CarteDuJourVue key={carte.cle} carte={carte} aujourdhui={aujourdhui} pour={prenomPour(carte.patientId)} retour={retour} />
          ))}
        </PileDeCartes>
      ) : enCours.length === 0 ? (
        <RienAFaire patientId={carnet.patientId} />
      ) : null}
      {enCours.map((g) => (
        <CarteGrossesse
          key={g.carnet.patientId}
          patientId={g.carnet.patientId}
          prenom={prenomPour(g.carnet.patientId)}
          semaines={g.suivi.semaines}
          comme={g.suivi.taille.comme}
          joursAvantTerme={g.suivi.joursAvantTerme}
          prets={g.prets}
        />
      ))}
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

function Felicitations({ naissance }: { naissance: { bebeId: string; prenom: string; sexe: "F" | "M"; le: Date } }) {
  return (
    <Link href={`/carnet?pour=${naissance.bebeId}`} className="flex items-center gap-3 rounded-carte bg-soleil p-4 text-nuit">
      <Icone nom="ph-confetti" className="size-9 shrink-0" />
      <span className="min-w-0 flex-1">
        <b className="block text-lg leading-tight">Bienvenue à {naissance.prenom} !</b>
        <small className="text-sm">
          {naissance.sexe === "F" ? "Née" : "Né"} le {dateLongue(aujourdhuiAuBenin(naissance.le))}. Son carnet est prêt : ses vaccins commencent.
        </small>
      </span>
      <Icone nom="ph-caret-right" className="size-6 shrink-0" />
    </Link>
  );
}

/** Pendant la grossesse, la grande carte de l'accueil : la semaine, le bébé, la préparation de la naissance. */
function CarteGrossesse({
  patientId,
  prenom,
  semaines,
  comme,
  joursAvantTerme,
  prets,
}: {
  patientId: string;
  prenom: string | null;
  semaines: number;
  comme: string;
  joursAvantTerme: number;
  prets: number;
}) {
  return (
    <Link href={`/grossesse?pour=${patientId}`} className="relative flex flex-col overflow-hidden rounded-grande bg-marque p-5 text-white shadow-[0_18px_34px_-18px_rgb(59_58_217_/_0.8)]">
      <Ondes className="-top-12 -right-14 size-60 text-white opacity-10" />
      <span className="relative flex items-center gap-2 text-sm font-bold text-soleil">
        <Icone nom="hi-pregnant" className="size-5" />
        {prenom ? `Grossesse de ${prenom}` : "Ma grossesse"}
      </span>
      <b className="relative mt-2 text-4xl leading-none">Semaine {semaines}</b>
      <span className="relative mt-2 text-lavande-3">
        Le bébé est comme {comme}
        {joursAvantTerme > 0 ? ` · terme ${libelleDansJours(joursAvantTerme)}` : ""}
      </span>
      <span className="relative mt-4 rounded-2xl bg-white/10 p-3">
        <span className="flex justify-between text-sm font-bold">
          <span>Préparer la naissance</span>
          <span>{prets} sur 6</span>
        </span>
        <span className="mt-2 block h-2 rounded-full bg-white/20">
          <span className="block h-2 rounded-full bg-soleil" style={{ width: `${(prets / 6) * 100}%` }} />
        </span>
      </span>
      <span className="relative mt-4 flex h-12 items-center justify-center gap-2 rounded-bouton bg-white font-bold text-marque">
        Voir ma grossesse
        <Icone nom="ph-caret-right" className="size-5" />
      </span>
    </Link>
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
