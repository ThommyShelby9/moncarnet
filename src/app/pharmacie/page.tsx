import { aujourdhuiAuBenin } from "@/domain/dates";
import { normaliserCode, quantiteTotale, texteDePosologie } from "@/domain/ordonnances";
import { dateLongue, heureMinute } from "@/domain/temps";
import { exigerRole } from "@/server/auth/cookies";
import { db } from "@/server/db/client";
import { ordonnanceParCode, type OrdonnancePourPharmacie } from "@/server/pharmacie/delivrance";
import { BoutonEcouter } from "@/ui/BoutonEcouter";
import { EnTete } from "@/ui/EnTete";
import { Icone } from "@/ui/Icone";
import { Posologie } from "@/ui/Posologie";
import { RetourAction } from "@/ui/RetourAction";
import { Tampon } from "@/ui/Tampon";
import { delivrerAction } from "./actions";

export default async function Pharmacie({ searchParams }: PageProps<"/pharmacie">) {
  const compte = await exigerRole("pharmacie");
  const params = await searchParams;
  const saisie = typeof params.code === "string" ? params.code : "";
  const code = saisie ? normaliserCode(saisie) : null;
  const ordonnance = code ? await ordonnanceParCode(db(), code) : null;
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6">
      <EnTete nomAffiche={compte.nomAffiche} />
      <h1 className="text-3xl font-bold">Retrouver une ordonnance</h1>
      <form action="/pharmacie" role="search" className="flex flex-wrap items-end gap-3">
        <label className="flex flex-1 flex-col gap-2 font-bold">
          Code de l&apos;ordonnance
          <input
            name="code"
            defaultValue={saisie}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={9}
            placeholder="K7P4QX"
            className="h-14 rounded-bouton bg-white px-4 text-2xl font-bold tracking-[0.2em] uppercase"
          />
        </label>
        <button className="flex h-14 items-center gap-2 rounded-bouton bg-marque px-6 text-lg font-bold text-white">
          <Icone nom="ph-magnifying-glass" className="size-6" />
          Rechercher
        </button>
      </form>
      {saisie && !code && (
        <p role="alert" className="rounded-bouton bg-soleil-pale px-4 py-3 font-bold">
          Ce code n&apos;a pas la bonne forme : 6 lettres ou chiffres, par exemple K7P4QX.
        </p>
      )}
      {code && !ordonnance && (
        <p role="alert" className="rounded-bouton bg-soleil-pale px-4 py-3 font-bold">
          Aucune ordonnance avec le code {code}. Vérifiez chaque caractère.
        </p>
      )}
      {ordonnance && params.note === "delivree" && <RetourAction message="Délivrance confirmée : les prises apparaissent dans le carnet du patient." />}
      {ordonnance && <FicheOrdonnance ordonnance={ordonnance} />}
    </main>
  );
}

function FicheOrdonnance({ ordonnance }: { ordonnance: OrdonnancePourPharmacie }) {
  const { patient, delivrance } = ordonnance;
  return (
    <section aria-labelledby="titre-ordonnance" className="flex flex-col gap-4 rounded-grande bg-white p-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="titre-ordonnance" className="text-2xl font-bold">
            {patient.prenom} {patient.nom}
          </h2>
          <p className="text-sm text-gris">
            Née ou né en {patient.anneeNaissance} · prescrite par {ordonnance.prescripteur} le {dateLongue(aujourdhuiAuBenin(ordonnance.emiseLe))}
          </p>
        </div>
        <span className="rounded-xl bg-lavande-2 px-3 py-1.5 font-bold tracking-[0.2em] text-marque tabular-nums">{ordonnance.codeRetrait}</span>
      </header>
      {ordonnance.lignes.map((l) => (
        <article key={l.medicament} className="flex flex-col gap-3 rounded-carte bg-lavande p-4">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <h3 className="text-xl font-bold">{l.medicament}</h3>
              <p className="text-sm text-gris">
                {l.indication ? `Pour ${l.indication} · ` : ""}pendant {l.dureeJours} jours{l.conseil ? `, ${l.conseil}` : ""} ·{" "}
                <b className="text-nuit">{quantiteTotale(l)} comprimés à donner</b>
              </p>
            </div>
            <BoutonEcouter variante="rond" libelle={`Écouter la posologie : ${l.medicament}`} texte={texteDePosologie(l)} />
          </div>
          <Posologie ligne={l} grande />
        </article>
      ))}
      {delivrance ? (
        <p className="flex items-center gap-3 font-bold text-marque">
          <Tampon libelle="Délivrée" className="size-14" />
          Délivrée le {dateLongue(aujourdhuiAuBenin(delivrance.le))} à {heureMinute(delivrance.le)}, par {delivrance.par}.
        </p>
      ) : (
        <form action={delivrerAction}>
          <input type="hidden" name="ordonnanceId" value={ordonnance.id} />
          <input type="hidden" name="code" value={ordonnance.codeRetrait} />
          <button className="flex h-14 w-full items-center justify-center gap-2 rounded-bouton bg-marque text-lg font-bold text-white">
            <Icone nom="ph-check-circle" className="size-6" />
            Confirmer la délivrance
          </button>
        </form>
      )}
    </section>
  );
}
