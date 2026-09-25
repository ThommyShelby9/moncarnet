import { FiltreEncre } from "@/ui/Tampon";

/** Espace patient : une colonne de téléphone, même sur un grand écran. */
export default function EspacePatientLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
      {children}
      <FiltreEncre />
    </div>
  );
}
