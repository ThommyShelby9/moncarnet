import type { Metadata } from "next";
import Link from "next/link";
import { aujourdhuiAuBenin } from "@/domain/dates";
import { CONSIGNE_MAX } from "@/server/consignes";
import { db } from "@/server/db/client";
import { listesDeSuivi, type LigneSuivi, type ListesDeSuivi } from "@/server/soignant/suivis";
import { Icone } from "@/ui/Icone";
import type { NomIcone } from "@/ui/icones";
import { RetourAction } from "@/ui/RetourAction";
import { confierAuRelaisAction } from "../actions";
import { exigerSoignant } from "../contexte";

export const metadata: Metadata = { title: "Suivis" };

type CleListe = keyof ListesDeSuivi;

const LISTES: Record<CleListe, { titre: string; icone: NomIcone; aide: string; consigne: string; vide: string }> = {
  grossesses: {
    titre: "Grossesses",
    icone: "hi-pregnant",
    aide: "Toutes les grossesses suivies, du terme le plus proche au plus lointain.",
    consigne: "Rappeler la consultation prénatale et vérifier le plan de naissance",
    vide: "Aucune grossesse suivie pour le moment.",
  },
  vaccins: {
    titre: "Vaccins",
    icone: "hi-syringe-vaccine",
    aide: "Les enfants en retard d'abord, puis les vaccins à faire dans les 7 jours (sans rendez-vous pris).",
    consigne: "Rappeler les vaccins de l'enfant",
    vide: "Aucun vaccin en retard ni à faire cette semaine.",
  },
  tension: {
    titre: "Tension",
    icone: "hi-blood-pressure",
    aide: "Les personnes hypertendues dont la dernière tension est à 140/90 ou plus, ou dont le contrôle est manqué.",
    consigne: "Prendre la tension et rappeler le contrôle",
    vide: "Toutes les tensions suivies sont contrôlées.",
  },
  perdus: {
    titre: "Perdus de vue",
    icone: "ph-hourglass-medium",
    aide: "Une étape manquée depuis plus d'un mois, aucune venue depuis 3 mois et aucun rendez-vous pris.",
    consigne: "Prendre des nouvelles et proposer un rendez-vous",
    vide: "Personne n'est perdu de vue.",
  },
};

const NOTES: Record<string, { texte: string; ok: boolean }> = {
  confiee: { texte: "Confié au relais : la consigne est dans sa tournée.", ok: true },
  sans_relais: { texte: "Ce foyer n'est suivi par aucun relais : appelez la famille.", ok: false },
  invalide: { texte: `Consigne vide ou trop longue (${CONSIGNE_MAX} caractères au plus).`, ok: false },
  interdit: { texte: "Cette personne n'est pas suivie dans votre centre.", ok: false },
};

/** Les listes de travail : qui relancer, et une visite à confier au relais en un geste (spec §4.5, §4.8). */
export default async function Suivis({ searchParams }: PageProps<"/soignant/suivis">) {
  const soignant = await exigerSoignant();
  const params = await searchParams;
  const listes = await listesDeSuivi(db(), soignant.etablissementId, aujourdhuiAuBenin());
  const cle: CleListe = (Object.keys(LISTES) as CleListe[]).find((c) => c === params.liste) ?? "grossesses";
  const note = typeof params.note === "string" ? NOTES[params.note] : undefined;
  const liste = LISTES[cle];

  return (
    <>
      <header>
        <h1 className="text-3xl font-bold">Suivis</h1>
        <p className="mt-1 text-gris">Les personnes à relancer, liste par liste.</p>
      </header>
      {note?.ok && <RetourAction message={note.texte} />}
      {note && !note.ok && (
        <p role="alert" className="rounded-carte bg-soleil-pale px-4 py-3 font-bold">
          {note.texte}
        </p>
      )}
      <nav aria-label="Listes de suivi" className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {(Object.keys(LISTES) as CleListe[]).map((c) => (
          <Link
            key={c}
            href={`/soignant/suivis?liste=${c}`}
            aria-current={c === cle ? "page" : undefined}
            className={`flex items-center gap-3 rounded-carte px-4 py-3 ${c === cle ? "bg-marque text-white" : "bg-white text-nuit"}`}
          >
            <Icone nom={LISTES[c].icone} className={`size-8 shrink-0 ${c === cle ? "text-white" : "text-marque"}`} />
            <span className="min-w-0">
              <b className="block text-2xl leading-none tabular-nums">{listes[c].length}</b>
              <span className="text-sm font-bold">{LISTES[c].titre}</span>
            </span>
          </Link>
        ))}
      </nav>

      <section aria-labelledby="titre-liste" className="rounded-carte bg-white p-5">
        <h2 id="titre-liste" className="text-lg font-bold">
          {liste.titre}
        </h2>
        <p className="text-sm text-gris">{liste.aide}</p>
        {listes[cle].length ? (
          <ul className="cascade mt-4 flex flex-col gap-2">
            {listes[cle].map((l) => (
              <Ligne key={l.patientId} ligne={l} liste={cle} consigne={liste.consigne} />
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-gris">{liste.vide}</p>
        )}
      </section>
    </>
  );
}

function Ligne({ ligne: l, liste, consigne }: { ligne: LigneSuivi; liste: CleListe; consigne: string }) {
  return (
    <li className="flex flex-col gap-2 rounded-2xl bg-lavande p-3 md:flex-row md:items-start md:gap-4">
      <div className="min-w-0 flex-1">
        <b>
          {l.prenom} {l.nom}
        </b>
        <span className="text-sm text-gris"> · {l.libelleAge}</span>
        <p className="text-sm">{l.detail}</p>
        {(l.alerte || l.consigne) && (
          <p className="mt-1 flex flex-wrap gap-1.5 text-xs font-bold">
            {l.alerte && <span className="rounded-lg bg-urgence-pale px-2 py-0.5 text-urgence">{l.alerte}</span>}
            {l.consigne && <span className="rounded-lg bg-soleil-pale px-2 py-0.5 text-nuit">Confié au relais : {l.consigne}</span>}
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-start gap-2 md:justify-end">
        {l.telephone && (
          <a href={`tel:${l.telephone}`} className="flex items-center gap-1.5 rounded-bouton bg-white px-3 py-2 text-sm font-bold text-marque">
            <Icone nom="ph-phone" className="size-4" />
            Appeler
          </a>
        )}
        <Link href={`/soignant/patients/${l.patientId}`} className="flex items-center gap-1.5 rounded-bouton bg-white px-3 py-2 text-sm font-bold text-marque">
          Dossier
          <Icone nom="ph-caret-right" className="size-4" />
        </Link>
        {l.relais ? (
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-bouton bg-marque px-3 py-2 text-sm font-bold text-white">
              <Icone nom="hi-community-healthworker" className="size-4" />
              Confier au relais
            </summary>
            <form action={confierAuRelaisAction} className="mt-2 flex flex-col gap-2 rounded-2xl bg-white p-3 md:w-80">
              <input type="hidden" name="patientId" value={l.patientId} />
              <input type="hidden" name="liste" value={liste} />
              <label className="flex flex-col gap-1 text-sm font-bold">
                Ce que le relais doit faire
                <textarea name="texte" required minLength={3} maxLength={CONSIGNE_MAX} rows={2} defaultValue={consigne} className="rounded-xl border-2 border-lavande-3 px-2.5 py-2 font-normal" />
              </label>
              <button className="flex items-center justify-center gap-1.5 rounded-bouton bg-marque py-2 text-sm font-bold text-white">
                <Icone nom="ph-paper-plane-tilt" className="size-4" />
                Mettre dans sa tournée
              </button>
            </form>
          </details>
        ) : (
          <span className="px-1 text-xs text-gris">Pas de relais pour ce foyer</span>
        )}
      </div>
    </li>
  );
}
