import path from "node:path";
import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const dir = path.dirname(fileURLToPath(import.meta.url));

/** workspace パッケージは main が .ts を直指しするので、明示的に src へ向ける。 */
function pkg(name: string): string {
  return path.join(dir, "..", "..", "packages", name, "src", "index.ts");
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.join(dir, "src"),
      "@score-linter/score-model": pkg("score-model"),
      "@score-linter/reader-musicxml": pkg("reader-musicxml"),
      "@score-linter/linter": pkg("linter"),
      "@score-linter/lint-app": pkg("lint-app"),
    },
  },
  build: {
    // 既定では modulepreload polyfill をインライン <script> として吐き、
    // _headers の script-src 'self' に違反する。CSP を守るため必ず false。
    modulePreload: { polyfill: false },
  },
});
