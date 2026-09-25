import Link from "next/link";
import { joursEntre } from "@/domain/dates";
import { LIBELLES_MOTIF } from "@/domain/rendez-vous";
import { dateLongue, LIBELLE_MOMENT_RDV, libelleDansJours, majuscule, nombreDeSoleils } from "@/domain/temps";
import { db } from "@/server/db/client";
import { listeAttenteDe, rendezVousVus } from "@/server/requetes/rendez-vous";
import { Icone } from "@/ui/Icone";
import { ICONE_MOTIF } from "@/ui/pictogrammes";
import { contextePatient } from "../../contexte";

export default async function MesRendezVous() {
  const { aujourdhui, carnets } = await contextePatient();
  const ids = carnets.map((c) => c.patientId);
  const [rendezVous, attentes] = await Promise.all([rendezVousVus(db(), ids, aujourdhui), listeAttenteDe(db(), ids)]);
  const aVenir = rendezVous.filter((r) => !r.faite).slice(0, 8);
  const prenom = (patientId: string) => carnets.find((c) => c.patientId === patientId)?.prenom ?? "";

  return (
    <>
      <h1 className="text-[1.65rem] leading-tight font-bold">Rendez-vous</h1>
      <Link href="/prendre-rendez-vous" className="flex h-14 items-center justify-center gap-2 rounded-bouton bg-marque text-lg font-bold text-white">
        <Icone nom="ph-plus" className="size-6" />
        Prendre un rendez-vous
      </Link>
      <section aria-labelledby="a-venir" className="flex flex-col gap-2.5">
        <h2 id="a-venir" className="text-lg font-bold">
          À venir
        </h2>
        {aVenir.length === 0 ? (
          <p className="rounded-carte bg-white p-4 text-gris">Aucun rendez-vous prévu.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {aVenir.map((r) => {
              const dans = joursEntre(aujourdhui, r.datePrevue);
              return (
                <li key={r.id} className="rounded-carte bg-white p-3.5">
                  <div className="flex items-center gap-3">
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-lavande-2 text-marque">
                      <Icone nom={ICONE_MOTIF[r.motif]} className="size-7" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <b className="block">{r.libelle}</b>
                      <small className="text-sm text-gris">
                        {prenom(r.patientId)} · {majuscule(dateLongue(r.datePrevue))}
                        {r.moment ? `, ${LIBELLE_MOMENT_RDV[r.moment]}` : ""}
                      </small>
                    </div>
                  </div>
                  <div className="mt-2.5 flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1 text-sm text-gris">
                      {Array.from({ length: nombreDeSoleils(dans) }, (_, i) => (
                        <Icone key={i} nom="ph-sun" className="size-4 text-soleil-appuye" />
                      ))}
                      {libelleDansJours(dans)}
                    </span>
                    {r.reserve ? (
                      <span className="rounded-lg bg-lavande-2 px-2 py-1 text-xs font-bold text-marque">Place réservée</span>
                    ) : (
                      <Link href={`/prendre-rendez-vous?pour=${r.patientId}&motif=${r.motif}`} className="rounded-lg bg-marque px-3 py-1.5 text-sm font-bold text-white">
                        Choisir le jour
                      </Link>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      {attentes.length > 0 && (
        <section aria-labelledby="attente" className="flex flex-col gap-2.5">
          <h2 id="attente" className="text-lg font-bold">
            Liste d&apos;attente
          </h2>
          <ul className="flex flex-col gap-2">
            {attentes.map((a) => (
              <li key={a.id} className="flex items-center gap-3 rounded-carte bg-white p-3.5">
                <Icone nom="ph-hourglass-medium" className="size-7 shrink-0 text-marque" />
                <p className="text-sm">
                  <b>
                    {LIBELLES_MOTIF[a.motif]} pour {prenom(a.patientId)}
                  </b>
                  <br />
                  {majuscule(dateLongue(a.dateSouhaitee))}, {LIBELLE_MOMENT_RDV[a.moment]} : on vous prévient si une place se libère.
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
