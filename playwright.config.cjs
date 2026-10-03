const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  testMatch: 'ui-regression.cjs',
  timeout: 60000,
  workers: 1,
  use: { locale: 'es-ES', colorScheme: 'dark', viewport: { width: 1280, height: 900 } },
  projects: [
    { name: 'production', grepInvert: /Strict Mode/, use: { baseURL: 'http://127.0.0.1:3030' } },
    { name: 'development', grep: /Strict Mode/, use: { baseURL: 'http://127.0.0.1:3031' } },
  ],
  webServer: [
    { command: 'pnpm start --port 3030 --hostname 127.0.0.1', url: 'http://127.0.0.1:3030', timeout: 60000 },
    { command: 'pnpm dev --port 3031 --hostname 127.0.0.1', url: 'http://127.0.0.1:3031', timeout: 60000 },
  ],
});
