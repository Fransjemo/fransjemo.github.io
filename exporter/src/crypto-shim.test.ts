import assert from "node:assert/strict";
import { test } from "node:test";
import shim, { randomBytes } from "./crypto-shim.ts";

test("GramJS interop: r.default.randomBytes", () => {
  const r = shim;
  assert.equal(typeof r.default.randomBytes, "function");
  assert.equal(typeof randomBytes, "function");
  const bytes = r.default.randomBytes(32);
  assert.equal(bytes.length, 32);
});

test("does not replace window.crypto", () => {
  assert.notEqual(shim, globalThis.crypto);
  assert.equal(typeof globalThis.crypto.getRandomValues, "function");
});
