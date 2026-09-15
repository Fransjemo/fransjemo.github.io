import assert from "node:assert/strict";
import { test } from "node:test";
import {
  allowsHtmlTxt,
  exportFilename,
  HTML_TXT_MAX_MESSAGES,
  slugify,
  ymd,
} from "./filename.ts";

const day = new Date("2026-09-16T12:00:00.000Z");

test("exportFilename includes slug, chat id, and YYYYMMDD", () => {
  assert.equal(
    exportFilename("Unknown", "8172808504", "json", day),
    "Unknown__8172808504-20260916.json",
  );
  assert.equal(
    exportFilename("Kristina Pimenova", "-1001525425988", "json", day),
    "Kristina-Pimenova__-1001525425988-20260916.json",
  );
});

test("slugify and ymd helpers", () => {
  assert.equal(slugify("Kristina Pimenova"), "Kristina-Pimenova");
  assert.equal(slugify(""), "chat");
  assert.equal(ymd(day), "20260916");
});

test("selected HTML/TXT skipped above 8k messages", () => {
  assert.equal(allowsHtmlTxt(8000), true);
  assert.equal(allowsHtmlTxt(8001), false);
  assert.equal(HTML_TXT_MAX_MESSAGES, 8000);
});
