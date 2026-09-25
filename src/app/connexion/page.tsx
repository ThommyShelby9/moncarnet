import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { env } from "@/config/env";
import { compteCourant } from "@/server/auth/cookies";
import { accueilDuRole } from "@/server/droits";
import { Logo } from "@/ui/Logo";
import { FormulairePatient } from "./FormulairePatient";
import { FormulairePersonnel } from "./FormulairePersonnel";

export const metadata: Metadata = { title: "Connexion" };

export default async function PageConnexion({ searchParams }: { searchParams: Promise<{ acces?: string }> }) {
  const compte = await compteCourant();
  if (compte) redirect(accueilDuRole(compte.role));
  const personnel = (await searchParams).acces === "personnel";
  const onglet = (actif: boolean) =>
    `rounded-xl px-3 py-3 text-center font-bold ${actif ? "bg-marque text-white" : "text-marque"}`;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 px-4 py-8">
      <header className="flex items-center gap-3">
        <Logo className="size-11" />
        <p className="text-2xl font-bold">{env.NEXT_PUBLIC_APP_NAME}</p>
      </header>
      <h1 className="text-3xl leading-tight font-bold">
        {personnel ? "Accès des professionnels" : "Ouvrir mon carnet de santé"}
      </h1>
      <nav aria-label="Type d'accès" className="grid grid-cols-2 gap-1 rounded-bouton bg-white p-1">
        <Link href="/connexion" className={onglet(!personnel)} aria-current={personnel ? undefined : "page"}>
          Mon carnet
        </Link>
        <Link href="/connexion?acces=personnel" className={onglet(personnel)} aria-current={personnel ? "page" : undefined}>
          Professionnels
        </Link>
      </nav>
      {personnel ? <FormulairePersonnel /> : <FormulairePatient />}
      {env.DEMO_MODE && (
        <Link href="/demo" className="text-center font-bold text-marque underline">
          Essayer avec un compte de démonstration
        </Link>
      )}
    </main>
  );
}
