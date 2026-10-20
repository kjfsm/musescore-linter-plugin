import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    reporter: process.env.CI ? ["dot"] : ["verbose"],
  },
});
