import assert from "node:assert/strict";
import { test } from "node:test";
import { chatIdFromEntity } from "./chat-id.ts";

test("marks channel ids with -100 prefix", () => {
  assert.equal(
    chatIdFromEntity({ className: "Channel", id: "1525425988", megagroup: true }),
    "-1001525425988",
  );
});

test("keeps user ids unmarked", () => {
  assert.equal(chatIdFromEntity({ className: "User", id: 8172808504 }), "8172808504");
});

test("negates basic group chat ids", () => {
  assert.equal(chatIdFromEntity({ className: "Chat", id: 123456 }), "-123456");
});

test("preserves already-marked ids", () => {
  assert.equal(chatIdFromEntity({ className: "Channel", id: "-1001525425988" }), "-1001525425988");
});
