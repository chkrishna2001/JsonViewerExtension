import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

import fs from 'fs'

function modifyManifestPlugin() {
  return {
    name: 'modify-manifest',
    closeBundle() {
      const manifestPath = resolve(__dirname, 'dist/manifest.json');
      if (fs.existsSync(manifestPath)) {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
        const browser = process.env.BROWSER || 'chrome';
        
        if (browser === 'firefox') {
          manifest.background = {
            scripts: ["background.js"],
            type: "module"
          };
        } else {
          // Chrome/Edge use service_worker
          manifest.background = {
            service_worker: "background.js",
            type: "module"
          };
          // Remove Firefox-specific settings for Chrome/Edge
          delete manifest.browser_specific_settings;
        }
        
        fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
      }
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), modifyManifestPlugin()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        background: resolve(__dirname, 'src/background/background.ts'),
        content: resolve(__dirname, 'src/content/content.ts')
      },
      output: {
        entryFileNames: `[name].js`,
        chunkFileNames: `[name].js`,
        assetFileNames: `[name].[ext]`
      }
    }
  }
})
