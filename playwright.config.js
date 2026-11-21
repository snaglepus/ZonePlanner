// End-to-end tests (dev only): `npm run test:e2e`. The gate doesn't run them.
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  webServer: {
    command: "python3 -m http.server 4173 --bind 127.0.0.1",
    url: "http://127.0.0.1:4173/index.html",
    reuseExistingServer: false,
    stderr: "ignore"
  },
  use: {
    baseURL: "http://127.0.0.1:4173/",
    locale: "en-GB"
  },
  projects: [
    { name: "phone", use: { ...devices["iPhone 13"], viewport: { width: 390, height: 844 } } },
    { name: "desktop", use: { ...devices["Desktop Chrome"] } }
  ]
});
