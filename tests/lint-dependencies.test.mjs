import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { resolve } from "node:path";

// Keep the glob replacement compatible with the Next.js linter's public call site.
const require = createRequire(import.meta.url);
const configRequire = createRequire(require.resolve("eslint-config-next"));
const pluginRequire = createRequire(configRequire.resolve("@next/eslint-plugin-next"));
const { getRootDirs } = pluginRequire("./utils/get-root-dirs");
assert.deepEqual(getRootDirs({ cwd: process.cwd(), settings: { next: { rootDir: ["app", "components/*"] } } }).sort(), ["app", "components/funds"]);
assert.deepEqual(getRootDirs({ cwd: process.cwd(), settings: { next: { rootDir: resolve("app") } } }), [resolve("app")]);
assert.deepEqual(getRootDirs({ cwd: process.cwd(), settings: {} }), [process.cwd()]);
console.log("Next.js linter glob compatibility check passed.");
