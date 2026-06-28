const { defineConfig } = require('@playwright/test');

// Extensions require a headed (or new-headless) Chromium with a persistent
// context, so each spec launches its own context. Keep workers at 1 to avoid
// extension/profile contention.
module.exports = defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  timeout: 60000,
  expect: { timeout: 10000 },
});
