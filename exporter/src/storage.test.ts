import assert from "node:assert/strict";
import { test } from "node:test";
import {
  clearExportProgress,
  isExportDone,
  loadExportDoneIds,
  markExportDone,
} from "./storage.ts";

const mem = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: {
    getItem: (key: string) => mem.get(key) ?? null,
    setItem: (key: string, value: string) => {
      mem.set(key, value);
    },
    removeItem: (key: string) => {
      mem.delete(key);
    },
  },
});

test("tg_export_done_ids resume set", () => {
  mem.clear();
  assert.deepEqual(loadExportDoneIds(), []);
  markExportDone("8172808504");
  markExportDone(-1001525425988);
  assert.deepEqual(loadExportDoneIds(), ["8172808504", "-1001525425988"]);
  assert.equal(isExportDone("8172808504"), true);
  assert.equal(isExportDone("missing"), false);
  assert.equal(mem.get("tg_export_done_ids"), JSON.stringify(["8172808504", "-1001525425988"]));
  clearExportProgress();
  assert.deepEqual(loadExportDoneIds(), []);
  assert.equal(mem.has("tg_export_done_ids"), false);
});
