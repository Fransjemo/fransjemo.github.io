export type MediaSourceKind = "webpage" | "telegram_message" | "telegram_deep_link";

export type PeerKind = "user" | "channel" | "chat";

export type MediaSource = {
  mediaSourceUrl: string | null;
  mediaSourceKind: MediaSourceKind | null;
};

export type MediaMeta = {
  mediaFileName: string | null;
  mediaMimeType: string | null;
  mediaWidth: number | null;
  mediaHeight: number | null;
  mediaSizeBytes: number | null;
};

/** `t.me/c/{id}` uses the channel id without the `-100` mark. */
export function channelInternalId(chatId: string | number): string {
  const raw = String(chatId);
  const marked = raw.match(/^-?100(\d+)$/);
  if (marked) return marked[1];
  const digits = raw.replace(/\D/g, "");
  return digits || raw.replace(/^-/, "");
}

export function userIdForDeepLink(chatId: string | number): string {
  return String(chatId).replace(/^-/, "");
}

export function telegramMessageUrl(username: string, messageId: number): string {
  const slug = username.replace(/^@/, "");
  return `https://t.me/${slug}/${messageId}`;
}

export function telegramChannelUrl(chatId: string | number, messageId: number): string {
  return `https://t.me/c/${channelInternalId(chatId)}/${messageId}`;
}

export function telegramDeepLink(userId: string | number, messageId: number): string {
  return `tg://openmessage?user_id=${userIdForDeepLink(userId)}&message_id=${messageId}`;
}

export function resolveMediaSource(input: {
  webpageUrl?: string | null;
  username?: string | null;
  peerKind: PeerKind;
  chatId: string | number;
  messageId: number;
  hasMedia?: boolean;
}): MediaSource {
  if (!input.hasMedia && !input.webpageUrl) {
    return { mediaSourceUrl: null, mediaSourceKind: null };
  }
  if (input.webpageUrl) {
    return { mediaSourceUrl: input.webpageUrl, mediaSourceKind: "webpage" };
  }
  const username = input.username?.replace(/^@/, "").trim();
  if (username) {
    return {
      mediaSourceUrl: telegramMessageUrl(username, input.messageId),
      mediaSourceKind: "telegram_message",
    };
  }
  if (input.peerKind === "channel") {
    return {
      mediaSourceUrl: telegramChannelUrl(input.chatId, input.messageId),
      mediaSourceKind: "telegram_message",
    };
  }
  if (input.peerKind === "user") {
    return {
      mediaSourceUrl: telegramDeepLink(input.chatId, input.messageId),
      mediaSourceKind: "telegram_deep_link",
    };
  }
  return { mediaSourceUrl: null, mediaSourceKind: null };
}

export function isSkippedPhotoSize(size: { className?: string; type?: string }): boolean {
  const name = size.className ?? "";
  const type = size.type ?? "";
  if (/stripped|path/i.test(name)) return true;
  if (type === "i" || type === "j") return true;
  return false;
}

export function photoSizeBytes(size: {
  size?: number;
  sizes?: number[];
  bytes?: { length?: number };
}): number {
  if (typeof size.size === "number" && Number.isFinite(size.size)) return size.size;
  if (Array.isArray(size.sizes) && size.sizes.length) return Math.max(...size.sizes);
  if (typeof size.bytes?.length === "number") return size.bytes.length;
  return 0;
}

export function largestPhotoSize(
  sizes: Array<{
    className?: string;
    type?: string;
    w?: number;
    h?: number;
    size?: number;
    sizes?: number[];
    bytes?: { length?: number };
  }>,
): { w: number | null; h: number | null; size: number | null } | null {
  const usable = sizes.filter((size) => !isSkippedPhotoSize(size) && (size.w || size.h));
  if (!usable.length) return null;
  const best = usable.reduce((winner, size) => {
    const area = (size.w ?? 0) * (size.h ?? 0);
    const winnerArea = (winner.w ?? 0) * (winner.h ?? 0);
    if (area > winnerArea) return size;
    if (area === winnerArea && photoSizeBytes(size) > photoSizeBytes(winner)) return size;
    return winner;
  });
  return {
    w: typeof best.w === "number" ? best.w : null,
    h: typeof best.h === "number" ? best.h : null,
    size: photoSizeBytes(best) || null,
  };
}

export function emptyMediaMeta(): MediaMeta {
  return {
    mediaFileName: null,
    mediaMimeType: null,
    mediaWidth: null,
    mediaHeight: null,
    mediaSizeBytes: null,
  };
}

export function metaFromPhoto(photo: {
  sizes?: Array<{
    className?: string;
    type?: string;
    w?: number;
    h?: number;
    size?: number;
    sizes?: number[];
    bytes?: { length?: number };
  }>;
}): MediaMeta {
  const best = photo.sizes?.length ? largestPhotoSize(photo.sizes) : null;
  return {
    mediaFileName: null,
    mediaMimeType: "image/jpeg",
    mediaWidth: best?.w ?? null,
    mediaHeight: best?.h ?? null,
    mediaSizeBytes: best?.size ?? null,
  };
}

export function metaFromDocument(document: {
  mimeType?: string;
  size?: unknown;
  attributes?: Array<{
    className?: string;
    fileName?: string;
    w?: number;
    h?: number;
  }>;
}): MediaMeta {
  const attrs = document.attributes ?? [];
  const fileName =
    attrs.find((a) => a.className === "DocumentAttributeFilename")?.fileName ?? null;
  const sized =
    attrs.find(
      (a) =>
        a.className === "DocumentAttributeImageSize" || a.className === "DocumentAttributeVideo",
    ) ?? null;
  const sizeBytes = toFiniteNumber(document.size);
  return {
    mediaFileName: fileName,
    mediaMimeType: document.mimeType ?? null,
    mediaWidth: typeof sized?.w === "number" ? sized.w : null,
    mediaHeight: typeof sized?.h === "number" ? sized.h : null,
    mediaSizeBytes: sizeBytes,
  };
}

function toFiniteNumber(value: unknown): number | null {
  if (value == null) return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}
