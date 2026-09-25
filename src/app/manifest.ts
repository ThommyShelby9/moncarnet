import type { MetadataRoute } from "next";
import { env } from "@/config/env";

/** L'application s'installe sur l'écran d'accueil du téléphone, comme une application. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: env.NEXT_PUBLIC_APP_NAME,
    short_name: env.NEXT_PUBLIC_APP_NAME,
    description: "Le carnet de santé familial qui parle",
    lang: "fr",
    start_url: "/",
    display: "standalone",
    background_color: "#f3f3fe",
    theme_color: "#3b3ad9",
    icons: [
      { src: "/app-192.png", sizes: "192x192", type: "image/png" },
      { src: "/app-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
