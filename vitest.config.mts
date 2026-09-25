import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.{ts,tsx}"],
    testTimeout: 30_000,
    // Chaque fichier de test crée sa base PGlite en mémoire et applique les migrations :
    // en parallèle sur toute la suite, cette préparation dépasse le délai par défaut de 10 s.
    hookTimeout: 60_000,
  },
});
