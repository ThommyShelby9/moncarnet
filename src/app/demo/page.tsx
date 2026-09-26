import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { env } from "@/config/env";
import type { RoleCompte } from "@/server/db/schema";
import { COMPTES_DEMO, type CompteDemo } from "@/server/demo/donnees";
import { Icone } from "@/ui/Icone";
import type { NomIcone } from "@/ui/icones";
import { Logo } from "@/ui/Logo";
import { Ondes } from "@/ui/Ondes";
import { entrerCommeDemo } from "./actions";
import { groupesDemo } from "./groupes";

export const metadata: Metadata = { title: "Démonstration" };

const ROLES: Record<RoleCompte, string> = { patient: "Patient", relais: "Relais", soignant: "Soignant", pharmacie: "Pharmacie", pilotage: "État", admin: "Administration" };
const ICONES: Record<RoleCompte, NomIcone> = {
  patient: "hi-woman",
  relais: "hi-community-healthworker",
  soignant: "hi-stethoscope",
  pharmacie: "hi-pharmacy",
  pilotage: "ph-chart-line-up",
  admin: "ph-list-checks",
};

export default async function PageDemo({ searchParams }: { searchParams: Promise<{ erreur?: string }> }) {
  if (!env.DEMO_MODE) notFound();
  const { erreur } = await searchParams;
  const groupes = groupesDemo(COMPTES_DEMO);
  return (
    <main className="cascade mx-auto flex max-w-4xl flex-col gap-8 px-4 py-8">
      <header className="flex items-center gap-3">
        <Logo className="size-11" />
        <p className="text-2xl font-bold">{env.NEXT_PUBLIC_APP_NAME}</p>
        <Link href="/demo/telephone" className="ml-auto text-sm font-bold text-marque underline">
          Le faux téléphone
        </Link>
        <Link href="/decouvrir" className="text-sm font-bold text-marque underline">
          Découvrir la solution
        </Link>
      </header>
      <div>
        <h1 className="text-3xl font-bold">Essayez la plateforme</h1>
        <p className="mt-1 text-gris">Toutes les personnes et données sont fictives. Un clic ouvre le compte, sans mot de passe à taper.</p>
      </div>
      {erreur === "base-vide" && (
        <p role="alert" className="rounded-bouton bg-urgence-pale px-4 py-3 font-bold text-urgence">
          La base de démonstration est vide. Lancez « pnpm db:seed ».
        </p>
      )}
      {groupes.map((groupe, i) => (
        <section key={groupe.titre} aria-labelledby={`groupe-${i}`} className="flex flex-col gap-3">
          <div>
            <h2 id={`groupe-${i}`} className="text-xl font-bold">
              {groupe.titre}
            </h2>
            {groupe.texte && <p className="text-gris">{groupe.texte}</p>}
          </div>
          {i === 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {groupe.comptes.map((c) => (
                <CarteParcours key={c.identifiant} compte={c} />
              ))}
            </div>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {groupe.comptes.map((c) => (
                <li key={c.identifiant}>
                  <CompteSimple compte={c} />
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </main>
  );
}

/** Un parcours usager : qui, et quoi montrer, étape par étape. */
function CarteParcours({ compte }: { compte: CompteDemo }) {
  const enceinte = compte.nomAffiche.startsWith("Awa");
  return (
    <article className="relative flex flex-col gap-4 overflow-hidden rounded-grande bg-marque p-5 text-white">
      <Ondes className="-top-12 -right-14 size-60 text-white opacity-10" />
      <div className="relative flex items-center gap-3">
        <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-white text-marque">
          <Icone nom={enceinte ? "hi-pregnant" : "hi-man"} className="size-9" />
        </span>
        <div>
          <h3 className="text-xl font-bold">{compte.nomAffiche}</h3>
          <p className="text-sm text-lavande-3">{compte.description}</p>
        </div>
      </div>
      <ol className="relative flex flex-col gap-2.5">
        {compte.parcours?.map((etape, i) => (
          <li key={etape} className="flex gap-3">
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-soleil text-xs font-bold text-nuit">{i + 1}</span>
            <span className="text-sm leading-snug">{etape}</span>
          </li>
        ))}
      </ol>
      <form action={entrerCommeDemo} className="relative mt-auto">
        <input type="hidden" name="identifiant" value={compte.identifiant} />
        <button className="flex h-12 w-full items-center justify-center gap-2 rounded-bouton bg-white font-bold text-marque">
          Entrer comme {compte.nomAffiche}
          <Icone nom="ph-caret-right" className="size-5" />
        </button>
      </form>
    </article>
  );
}

function CompteSimple({ compte }: { compte: CompteDemo }) {
  return (
    <form action={entrerCommeDemo} className="h-full">
      <input type="hidden" name="identifiant" value={compte.identifiant} />
      <button className="flex h-full w-full items-center gap-3 rounded-carte bg-white p-4 text-left">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-lavande-2 text-marque">
          <Icone nom={ICONES[compte.role]} className="size-7" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <b>{compte.nomAffiche}</b>
            <span className="rounded-lg bg-lavande-2 px-2 py-0.5 text-xs font-bold text-marque">{ROLES[compte.role]}</span>
          </span>
          <span className="text-sm text-gris">{compte.description}</span>
        </span>
      </button>
    </form>
  );
}
