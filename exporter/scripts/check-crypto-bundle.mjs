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
if (!/tg_export_done_ids/.test(src)) {
  console.error("Bundle is missing tg_export_done_ids resume key");
  process.exit(1);
}
if (!/Clear export progress/.test(src)) {
  console.error("Bundle is missing Clear export progress");
  process.exit(1);
}
if (!/"__"/.test(src) && !/__\$\{/.test(src) && !/`[^`]*__\$\{/.test(src)) {
  console.error("Bundle is missing __chatId filename separator");
  process.exit(1);
}
if (!/Include media source URLs/.test(src)) {
  console.error("Bundle is missing Include media source URLs checkbox");
  process.exit(1);
}
if (!/does not expose permanent public CDN URLs/.test(src)) {
  console.error("Bundle is missing honest media-URL help text");
  process.exit(1);
}
console.log(`crypto + export-all + filename + media-source checks ok (${jsName})`);
