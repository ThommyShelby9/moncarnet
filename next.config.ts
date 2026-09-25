import type { NextConfig } from "next";

const config: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  experimental: {
    // Sans réseau, une Server Action reste en attente et repart au retour du réseau ; `useOffline` le dit à l'écran (spec §10.3).
    useOffline: true,
  },
};

export default config;
