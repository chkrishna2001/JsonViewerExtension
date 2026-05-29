import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

import fs from 'fs'

const browser = process.env.BROWSER || 'chrome';
const outDir = browser === 'firefox' ? 'dist-firefox' : 'dist-chrome';

function modifyManifestPlugin() {
  return {
    name: 'modify-manifest',
    closeBundle() {
      const manifestPath = resolve(__dirname, outDir, 'manifest.json');
      if (fs.existsSync(manifestPath)) {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
        
        if (browser === 'firefox') {
          manifest.background = {
            scripts: ["background.js"],
            type: "module"
          };
          // Firefox MV3 does not support the sandbox manifest key
          delete manifest.sandbox;

          // Delete unused sandbox assets to prevent security scanner flags in Firefox
          const htmlPath = resolve(__dirname, outDir, 'sandbox.html');
          const jsPath = resolve(__dirname, outDir, 'sandbox.js');
          if (fs.existsSync(htmlPath)) fs.unlinkSync(htmlPath);
          if (fs.existsSync(jsPath)) fs.unlinkSync(jsPath);
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
    outDir: outDir,
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
