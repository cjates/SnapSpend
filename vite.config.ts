import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import {defineConfig} from 'vite';

// Self-healing check: Ensure firebase-applet-config.json exists so that it doesn't break
// builds or result in a 404 Pre-transform error when gitignored or deleted.
const configPath = path.resolve(__dirname, 'firebase-applet-config.json');
if (!fs.existsSync(configPath)) {
  try {
    fs.writeFileSync(
      configPath,
      JSON.stringify(
        {
          apiKey: "",
          authDomain: "",
          projectId: "",
          storageBucket: "",
          messagingSenderId: "",
          appId: "",
          measurementId: "",
          firestoreDatabaseId: ""
        },
        null,
        2
      )
    );
    console.log("[SnapSpend] Auto-created placeholder firebase-applet-config.json securely.");
  } catch (err) {
    console.warn("[SnapSpend] Failed to auto-create firebase-applet-config.json:", err);
  }
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
