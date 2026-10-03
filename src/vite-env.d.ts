/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />

// La génération du PDF est désormais 100 % locale (src/lib/exportReport.ts
// + src/lib/pdf.ts) : aucune variable d'environnement n'est requise.
interface ImportMetaEnv {
  readonly VITE_APP_NAME?: string;
  readonly VITE_APP_VERSION?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}