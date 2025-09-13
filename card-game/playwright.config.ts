import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  use: {
    baseURL: "https://deckofcardsapi.com",
    extraHTTPHeaders: { Accept: "application/json" },
  },
});
