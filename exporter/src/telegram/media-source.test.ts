import assert from "node:assert/strict";
import { test } from "node:test";
import {
  channelInternalId,
  isSkippedPhotoSize,
  largestPhotoSize,
  metaFromDocument,
  resolveMediaSource,
  telegramChannelUrl,
  telegramDeepLink,
  telegramMessageUrl,
} from "./media-source.ts";

test("webpage url wins", () => {
  assert.deepEqual(
    resolveMediaSource({
      webpageUrl: "https://example.com/photo",
      username: "channel",
      peerKind: "channel",
      chatId: "-1001525425988",
      messageId: 42,
      hasMedia: true,
    }),
    { mediaSourceUrl: "https://example.com/photo", mediaSourceKind: "webpage" },
  );
});

test("public username uses t.me message link", () => {
  assert.deepEqual(
    resolveMediaSource({
      username: "KristinaPimenova",
      peerKind: "channel",
      chatId: "-1001525425988",
      messageId: 99,
      hasMedia: true,
    }),
    {
      mediaSourceUrl: telegramMessageUrl("KristinaPimenova", 99),
      mediaSourceKind: "telegram_message",
    },
  );
  assert.equal(telegramMessageUrl("@foo", 3), "https://t.me/foo/3");
});

test("private channel strips -100 prefix for t.me/c", () => {
  assert.equal(channelInternalId("-1001525425988"), "1525425988");
  assert.equal(channelInternalId("1001525425988"), "1525425988");
  assert.equal(telegramChannelUrl("-1001525425988", 7), "https://t.me/c/1525425988/7");
  assert.deepEqual(
    resolveMediaSource({
      peerKind: "channel",
      chatId: "-1001525425988",
      messageId: 7,
      hasMedia: true,
    }),
    { mediaSourceUrl: "https://t.me/c/1525425988/7", mediaSourceKind: "telegram_message" },
  );
});

test("private user DM uses tg deep link", () => {
  assert.equal(
    telegramDeepLink("8172808504", 12),
    "tg://openmessage?user_id=8172808504&message_id=12",
  );
  assert.deepEqual(
    resolveMediaSource({
      peerKind: "user",
      chatId: "8172808504",
      messageId: 12,
      hasMedia: true,
    }),
    {
      mediaSourceUrl: "tg://openmessage?user_id=8172808504&message_id=12",
      mediaSourceKind: "telegram_deep_link",
    },
  );
});

test("text-only messages stay empty", () => {
  assert.deepEqual(
    resolveMediaSource({
      username: "foo",
      peerKind: "channel",
      chatId: "-1001",
      messageId: 1,
      hasMedia: false,
    }),
    { mediaSourceUrl: null, mediaSourceKind: null },
  );
});

test("largest photo size skips stripped and path", () => {
  assert.equal(isSkippedPhotoSize({ className: "PhotoStrippedSize", type: "i" }), true);
  assert.equal(isSkippedPhotoSize({ className: "PhotoPathSize", type: "j" }), true);
  const best = largestPhotoSize([
    { className: "PhotoStrippedSize", type: "i" },
    { className: "PhotoPathSize", type: "j" },
    { className: "PhotoSize", type: "m", w: 320, h: 240, size: 12000 },
    { className: "PhotoSize", type: "x", w: 1280, h: 720, size: 88000 },
  ]);
  assert.deepEqual(best, { w: 1280, h: 720, size: 88000 });
});

test("document attributes supply filename mime and dimensions", () => {
  assert.deepEqual(
    metaFromDocument({
      mimeType: "video/mp4",
      size: 2048,
      attributes: [
        { className: "DocumentAttributeFilename", fileName: "clip.mp4" },
        { className: "DocumentAttributeVideo", w: 1920, h: 1080 },
      ],
    }),
    {
      mediaFileName: "clip.mp4",
      mediaMimeType: "video/mp4",
      mediaWidth: 1920,
      mediaHeight: 1080,
      mediaSizeBytes: 2048,
    },
  );
});
