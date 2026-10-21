import path from "node:path";
import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const dir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.join(dir, "src"),
    },
  },
  build: {
    // 既定では modulepreload polyfill をインライン <script> として吐き、
    // _headers の script-src 'self' に違反する。CSP を守るため必ず false。
    modulePreload: { polyfill: false },
  },
});
