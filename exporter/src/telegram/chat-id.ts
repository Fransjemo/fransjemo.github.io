/** Fallback marked Telegram id when GramJS `dialog.id` / `getPeerId` is unavailable. */
export function chatIdFromEntity(entity: unknown): string {
  if (entity == null || typeof entity !== "object") return "unknown";
  const e = entity as {
    className?: string;
    id?: { toString(): string } | number | bigint | string;
    channelId?: { toString(): string } | number | bigint | string;
    chatId?: { toString(): string } | number | bigint | string;
    userId?: { toString(): string } | number | bigint | string;
    megagroup?: boolean;
    broadcast?: boolean;
  };

  const raw =
    stringifyId(e.id) ||
    stringifyId(e.channelId) ||
    stringifyId(e.chatId) ||
    stringifyId(e.userId);
  if (!raw) return "unknown";
  if (raw.startsWith("-")) return raw;

  const className = e.className ?? "";
  const isChannel =
    className.includes("Channel") || e.broadcast === true || e.megagroup === true;
  if (isChannel) return `-100${raw}`;
  if (className === "Chat" || className === "ChatForbidden") return `-${raw}`;
  return raw;
}

function stringifyId(value: unknown): string {
  if (value == null) return "";
  return String(value);
}
