import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { env } from "@/config/env";
import { COMPTES_DEMO } from "@/server/demo/donnees";
import { Logo } from "@/ui/Logo";
import { entrerCommeDemo } from "./actions";

export const metadata: Metadata = { title: "Démonstration" };

const ROLES = { patient: "Patient", relais: "Relais", soignant: "Soignant", pharmacie: "Pharmacie", pilotage: "Pilotage", admin: "Administration" } as const;

export default async function PageDemo({ searchParams }: { searchParams: Promise<{ erreur?: string }> }) {
  if (!env.DEMO_MODE) notFound();
  const { erreur } = await searchParams;
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8">
      <header className="flex items-center gap-3">
        <Logo className="size-11" />
        <p className="text-2xl font-bold">{env.NEXT_PUBLIC_APP_NAME}</p>
      </header>
      <h1 className="text-3xl font-bold">Choisissez un compte de démonstration</h1>
      <p className="text-gris">Toutes les personnes et données sont fictives.</p>
      {erreur === "base-vide" && (
        <p role="alert" className="rounded-bouton bg-urgence-pale px-4 py-3 font-bold text-urgence">
          La base de démonstration est vide. Lancez « pnpm db:seed ».
        </p>
      )}
      <ul className="grid gap-3">
        {COMPTES_DEMO.map((c) => (
          <li key={c.identifiant}>
            <form action={entrerCommeDemo}>
              <input type="hidden" name="identifiant" value={c.identifiant} />
              <button className="flex w-full items-center gap-4 rounded-carte bg-white p-4 text-left">
                <span className="rounded-lg bg-lavande-2 px-2 py-1 text-xs font-bold text-marque">{ROLES[c.role]}</span>
                <span>
                  <span className="block font-bold">{c.nomAffiche}</span>
                  <span className="text-sm text-gris">{c.description}</span>
                </span>
              </button>
            </form>
          </li>
        ))}
      </ul>
    </main>
  );
}
