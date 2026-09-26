import type { Metadata } from "next";
import Link from "next/link";
import { aujourdhuiAuBenin } from "@/domain/dates";
import { dateCourte, heureMinute } from "@/domain/temps";
import { exigerRole } from "@/server/auth/cookies";
import { db } from "@/server/db/client";
import { delivrancesDe } from "@/server/pharmacie/delivrance";
import { Chiffre } from "@/ui/Chiffre";
import { Icone } from "@/ui/Icone";

export const metadata: Metadata = { title: "Historique des délivrances" };

const JOURS = 30;

/** Ce que la pharmacie a délivré ces 30 derniers jours : le code retrouve l'ordonnance, les initiales suffisent (spec §12). */
export default async function Historique() {
  const compte = await exigerRole("pharmacie");
  const depuis = new Date(Date.parse(`${aujourdhuiAuBenin()}T00:00:00+01:00`) - JOURS * 86_400_000);
  const liste = compte.etablissementId ? await delivrancesDe(db(), compte.etablissementId, depuis) : [];
  const medicaments = new Map<string, number>();
  for (const d of liste) for (const m of d.medicaments) medicaments.set(m, (medicaments.get(m) ?? 0) + 1);
  const plusDelivres = [...medicaments.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "fr")).slice(0, 5);
  return (
    <>
      <header>
        <h1 className="text-3xl font-bold">Historique</h1>
        <p className="mt-1 text-gris">Les ordonnances délivrées ces {JOURS} derniers jours. Le code rouvre l&apos;ordonnance.</p>
      </header>
      <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Chiffre valeur={String(liste.length)} libelle={liste.length > 1 ? "ordonnances délivrées" : "ordonnance délivrée"} />
        <Chiffre valeur={String(medicaments.size)} libelle="médicaments différents" />
      </dl>
      <div className="grid items-start gap-5 lg:grid-cols-[1fr_300px]">
        <section aria-labelledby="titre-liste" className="rounded-carte bg-white p-5">
          <h2 id="titre-liste" className="text-lg font-bold">
            Délivrances
          </h2>
          {liste.length ? (
            <ul className="mt-3 flex flex-col gap-2">
              {liste.map((d) => (
                <li key={d.id} className="flex flex-wrap items-center gap-3 rounded-2xl bg-lavande px-3 py-2.5 text-sm">
                  <Link
                    href={`/pharmacie?code=${d.code}`}
                    className="rounded-xl bg-white px-2.5 py-1 font-bold tracking-[0.15em] text-marque tabular-nums"
                    aria-label={`Ordonnance ${d.code.split("").join(" ")}`}
                  >
                    {d.code}
                  </Link>
                  <span className="min-w-0 flex-1">
                    <b>{d.medicaments.join(", ")}</b>
                    <small className="block text-gris">
                      Pour {d.patient} · {dateCourte(aujourdhuiAuBenin(d.le))} à {heureMinute(d.le)}
                    </small>
                  </span>
                  <Icone nom="ph-check-circle" className="size-5 text-marque" titre="Délivrée" />
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-gris">Aucune délivrance ces {JOURS} derniers jours.</p>
          )}
        </section>
        <section aria-labelledby="titre-plus" className="rounded-carte bg-white p-5">
          <h2 id="titre-plus" className="text-lg font-bold">
            Les plus délivrés
          </h2>
          {plusDelivres.length ? (
            <ol className="mt-3 flex flex-col gap-2 text-sm">
              {plusDelivres.map(([m, n]) => (
                <li key={m} className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <Icone nom="ph-pill" className="size-4 text-marque" />
                    {m}
                  </span>
                  <b className="tabular-nums">{n}</b>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-2 text-sm text-gris">Rien pour le moment.</p>
          )}
        </section>
      </div>
    </>
  );
}
