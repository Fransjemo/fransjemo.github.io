import assert from "node:assert/strict";
import { test } from "node:test";
import { floodWaitSeconds, formatTelegramError, withFloodWaitRetry } from "./errors.ts";

test("floodWaitSeconds reads GramJS seconds", () => {
  assert.equal(floodWaitSeconds({ seconds: 12, errorMessage: "FLOOD_WAIT_12" }), 12);
});

test("floodWaitSeconds parses FLOOD_WAIT_N messages", () => {
  assert.equal(floodWaitSeconds(new Error("FLOOD_WAIT_34")), 34);
  assert.equal(floodWaitSeconds({ errorMessage: "FLOOD_WAIT_7" }), 7);
  assert.equal(floodWaitSeconds({ message: "A wait of 9 seconds is required" }), 9);
});

test("floodWaitSeconds ignores other errors", () => {
  assert.equal(floodWaitSeconds(new Error("PHONE_CODE_INVALID")), null);
  assert.equal(floodWaitSeconds({ seconds: 0 }), null);
});

test("withFloodWaitRetry retries then succeeds", async () => {
  let calls = 0;
  const waits: number[] = [];
  const value = await withFloodWaitRetry(
    async () => {
      calls += 1;
      if (calls === 1) throw Object.assign(new Error("FLOOD_WAIT_1"), { seconds: 0.001 });
      return "ok";
    },
    (seconds) => waits.push(seconds),
  );
  assert.equal(value, "ok");
  assert.equal(calls, 2);
  assert.deepEqual(waits, [1]);
});

test("formatTelegramError still explains FloodWait", () => {
  assert.match(
    formatTelegramError({ errorMessage: "FLOOD_WAIT_15", seconds: 15 }),
    /15 seconds/,
  );
});
