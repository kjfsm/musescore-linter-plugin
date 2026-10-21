import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.E2E_PORT ?? 8788);

export default defineConfig({
  testDir: "e2e",
  // WSL で既定（コア数の半分）にすると、workerd とブラウザがメモリを使い切って VM ごと落ちる
  ...(process.env.CI ? {} : { workers: 2 }),
  use: { baseURL: `http://localhost:${port}` },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // vite dev ではなく wrangler dev で dist を配る。_headers の CSP は wrangler の静的配信だけが付ける
    command: `vite build && wrangler dev --port ${port}`,
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
