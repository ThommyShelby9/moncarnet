import type { NextConfig } from "next";

const config: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  experimental: {
    // Sans réseau, une Server Action reste en attente et repart au retour du réseau ; `useOffline` le dit à l'écran (spec §10.3).
    useOffline: true,
  },
  async headers() {
    // Le sprite est appelé avec sa version (?v=empreinte) : on peut le garder un an, et les pictogrammes restent visibles sans réseau.
    return [
      { source: "/icons/:fichier*", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
      {
        // Le service worker doit toujours être relu : une nouvelle version remplace l'ancienne dès la visite suivante.
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
        ],
      },
    ];
  },
};

export default config;
