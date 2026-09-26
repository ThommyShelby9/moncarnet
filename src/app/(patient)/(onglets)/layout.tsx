import { BarreNavigation } from "@/ui/BarreNavigation";

export default function OngletsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <main className="cascade flex flex-1 flex-col gap-4 px-4 pt-5 pb-6">{children}</main>
      <BarreNavigation />
    </>
  );
}
