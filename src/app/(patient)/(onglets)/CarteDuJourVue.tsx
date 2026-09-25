import Link from "next/link";
import { detailCarte, surtitre, texteAEcouter, titreCarte, type CarteDuJour } from "@/domain/cartes-du-jour";
import type { DateISO } from "@/domain/dates";
import { BoutonEcouter } from "@/ui/BoutonEcouter";
import { Icone } from "@/ui/Icone";
import { Ondes } from "@/ui/Ondes";
import { ICONE_MOMENT, ICONE_MOTIF } from "@/ui/pictogrammes";
import { noterPriseAction } from "../actions";

const BOUTON_BLANC = "flex items-center justify-center gap-1.5 rounded-bouton bg-white py-3.5 font-bold text-marque";

/** Grande carte indigo : ce qu'il faut faire, à écouter, avec une seule action. */
export function CarteDuJourVue({ carte, aujourdhui, pour, retour }: { carte: CarteDuJour; aujourdhui: DateISO; pour: string | null; retour: string }) {
  const prise = carte.type === "prise";
  return (
    <article className="relative flex h-full flex-col overflow-hidden rounded-grande bg-marque p-4 text-white">
      <Ondes className="-top-12 -right-12 size-48 text-white opacity-15" />
      <div className="relative flex items-center gap-2 text-sm font-bold text-soleil-pale">
        <span className={`grid size-9 place-items-center rounded-xl ${prise ? "bg-soleil text-nuit" : "bg-white/15 text-white"}`}>
          <Icone nom={prise ? ICONE_MOMENT[carte.moment] : ICONE_MOTIF[carte.motif]} className="size-6" />
        </span>
        {surtitre(carte, aujourdhui)}
        <BoutonEcouter variante="rond" libelle="Écouter" texte={texteAEcouter(carte, { aujourdhui, pour })} className="ml-auto" />
      </div>
      {pour && <p className="relative mt-3 text-sm font-bold text-lavande-3">Pour {pour}</p>}
      <h2 className="relative mt-2 text-[1.45rem] leading-tight font-bold">{titreCarte(carte)}</h2>
      <p className="relative mt-2.5 flex items-center gap-2.5 text-sm text-lavande-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-white/15 text-white">
          <Icone nom={prise ? "hi-blister-pills_oval_x4" : carte.type === "manque" ? "ph-warning-circle" : "ph-calendar-dots"} className="size-6" />
        </span>
        {detailCarte(carte, aujourdhui)}
      </p>
      <div className="relative mt-auto pt-4">
        {carte.type === "prise" ? (
          <form action={noterPriseAction} className="grid grid-cols-[1.4fr_1fr] gap-2">
            <input type="hidden" name="patientId" value={carte.patientId} />
            <input type="hidden" name="traitementCle" value={carte.traitementCle} />
            <input type="hidden" name="moment" value={carte.moment} />
            <input type="hidden" name="pour" value={retour} />
            <button name="statut" value="fait" className={BOUTON_BLANC}>
              <Icone nom="ph-check-circle" className="size-5" />
              C&apos;est fait
            </button>
            <button name="statut" value="plus_tard" className="rounded-bouton bg-white/15 py-3.5 font-bold">
              Plus tard
            </button>
          </form>
        ) : carte.type === "rendez_vous" && carte.reserve ? (
          <Link href="/rendez-vous" className={BOUTON_BLANC}>
            <Icone nom="ph-calendar-check" className="size-5" />
            Voir mes rendez-vous
          </Link>
        ) : (
          <Link href={`/prendre-rendez-vous?pour=${carte.patientId}&motif=${carte.motif}`} className={BOUTON_BLANC}>
            <Icone nom="ph-calendar-dots" className="size-5" />
            Choisir le jour
          </Link>
        )}
      </div>
    </article>
  );
}
