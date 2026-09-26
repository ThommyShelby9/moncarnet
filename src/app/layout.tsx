import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { env } from "@/config/env";
import { EnregistrementServiceWorker } from "@/ui/EnregistrementServiceWorker";
import "./globals.css";

const fira = localFont({
  src: [
    { path: "./fonts/fira-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/fira-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-fira",
  display: "swap",
});

export const metadata: Metadata = {
  // Adresse publique : les images de partage (Open Graph) pointent vers le vrai site.
  metadataBase: new URL(env.APP_URL),
  title: { default: env.NEXT_PUBLIC_APP_NAME, template: `%s | ${env.NEXT_PUBLIC_APP_NAME}` },
  description: "Le carnet de santé familial qui parle",
  applicationName: env.NEXT_PUBLIC_APP_NAME,
};

export const viewport: Viewport = {
  themeColor: "#3b3ad9",
  width: "device-width",
  initialScale: 1,
};

export default function RacineLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={fira.variable}>
      <body className="min-h-dvh">
        {children}
        <EnregistrementServiceWorker />
      </body>
    </html>
  );
}
