import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // « prompt » : c'est l'utilisateur qui décide quand recharger
      // (évite d'interrompre la saisie d'un relevé en cours).
      registerType: "prompt",
      // L'enregistrement du Service Worker est géré par l'application
      // (hook React PwaUpdater), donc pas de script injecté automatiquement.
      injectRegister: null,
      includeAssets: [
        "favicon.svg",
        "favicon-48.png",
        "apple-touch-icon-180x180.png",
        "pwa-64x64.png",
        "pwa-192x192.png",
        "pwa-512x512.png",
        "maskable-icon-512x512.png",
      ],
      manifest: {
        name: "Relevé Index",
        short_name: "Relevé Index",
        description:
          "Suivi des relevés de compteurs d'eau et d'électricité, 100 % hors-ligne.",
        lang: "fr",
        dir: "ltr",
        theme_color: "#0f766e",
        background_color: "#0f766e",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        scope: "/",
        icons: [
          { src: "pwa-64x64.png", sizes: "64x64", type: "image/png" },
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "maskable-icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
        // Les splash screens iOS sont chargés par l'OS au lancement de l'app :
        // inutile (et coûteux) de les précacher dans le Service Worker.
        globIgnores: ["**/apple-splash-*.png"],
        cleanupOutdatedCaches: true,
      },
      devOptions: { enabled: false },
    }),
  ],
});