import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const assets = join(root, "../dist/assets");
const jsName = readdirSync(assets).find((name) => name.endsWith(".js"));
if (!jsName) {
  console.error("No built JS in exporter/dist/assets");
  process.exit(1);
}
const src = readFileSync(join(assets, jsName), "utf8");

if (/window\.crypto\s*=/.test(src)) {
  console.error("Bundle assigns window.crypto (must stay read-only)");
  process.exit(1);
}
if (!/randomBytes/.test(src)) {
  console.error("Bundle is missing randomBytes");
  process.exit(1);
}
if (!/default\.randomBytes/.test(src)) {
  console.error("Bundle is missing default.randomBytes (GramJS interop)");
  process.exit(1);
}
if (!/Export all chats/.test(src)) {
  console.error("Bundle is missing Export all chats UI");
  process.exit(1);
}
console.log(`crypto + export-all checks ok (${jsName})`);
