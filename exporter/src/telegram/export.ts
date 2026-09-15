import type { Api } from "telegram";
import { getClient } from "./client";
import type { ChatItem, ExportBundle, ExportedMessage, ExportProgress } from "./types";

export {
  allowsHtmlTxt,
  exportFilename,
  HTML_TXT_MAX_MESSAGES,
  slugify,
  ymd,
} from "./filename";

function isoDate(value: Date | number | undefined): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "number") return new Date(value * 1000).toISOString();
  return new Date().toISOString();
}

function senderName(message: Api.Message): string {
  const sender = message.sender as
    | { title?: string; firstName?: string; lastName?: string; username?: string }
    | undefined;
  if (sender?.title) return sender.title;
  const name = [sender?.firstName, sender?.lastName].filter(Boolean).join(" ").trim();
  if (name) return name;
  if (sender?.username) return `@${sender.username}`;
  const id = message.senderId?.toString();
  return id ? `id:${id}` : "Unknown";
}

function mediaLabel(message: Api.Message): string | null {
  if (!message.media) return null;
  if (message.photo) return "photo";
  if (message.video) return "video";
  if (message.voice) return "voice";
  if (message.audio) return "audio";
  if (message.sticker) return "sticker";
  if (message.gif) return "gif";
  if (message.poll) return "poll";
  if (message.contact) return "contact";
  if (message.geo || message.venue) return "location";
  if (message.webPreview) return "link preview";
  if (message.document) {
    const mime = (message.document as { mimeType?: string }).mimeType ?? "";
    if (mime.startsWith("image/")) return "image";
    if (mime.startsWith("video/")) return "video";
    if (mime.startsWith("audio/")) return "audio";
    return "document";
  }
  const className = (message.media as { className?: string }).className ?? "media";
  return className.replace(/^MessageMedia/, "").toLowerCase() || "media";
}

function replyToId(message: Api.Message): number | null {
  const reply = message.replyTo as { replyToMsgId?: number } | undefined;
  return reply?.replyToMsgId ?? message.replyToMsgId ?? null;
}

export async function exportChat(
  chat: ChatItem,
  limit: number | undefined,
  onProgress: (progress: ExportProgress) => void,
): Promise<ExportBundle> {
  const client = getClient();
  const messages: ExportedMessage[] = [];

  for await (const message of client.iterMessages(chat.entity as never, {
    limit: limit && limit > 0 ? limit : undefined,
    reverse: true,
  })) {
    if (!("id" in message) || typeof message.id !== "number") continue;
    const exported: ExportedMessage = {
      id: message.id,
      date: isoDate(message.date as Date | number | undefined),
      sender: senderName(message),
      text: message.text ?? message.message ?? "",
      replyTo: replyToId(message),
      media: mediaLabel(message),
    };
    messages.push(exported);
    if (messages.length === 1 || messages.length % 25 === 0) {
      onProgress({
        count: messages.length,
        lastId: exported.id,
        lastDate: exported.date,
      });
      await yieldToUi();
    }
  }

  onProgress({
    count: messages.length,
    lastId: messages.at(-1)?.id ?? null,
    lastDate: messages.at(-1)?.date ?? null,
  });

  return {
    chatTitle: chat.title,
    chatId: String(chat.id),
    exportedAt: new Date().toISOString(),
    messageCount: messages.length,
    messages,
  };
}

function yieldToUi(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

export function buildJson(bundle: ExportBundle): string {
  return JSON.stringify(bundle, null, 2);
}

export function buildTxt(bundle: ExportBundle): string {
  const lines = [
    `Chat: ${bundle.chatTitle}`,
    `Exported: ${bundle.exportedAt}`,
    `Messages: ${bundle.messageCount}`,
    "",
  ];
  for (const m of bundle.messages) {
    const media = m.media ? ` [${m.media}]` : "";
    const reply = m.replyTo ? ` (reply to ${m.replyTo})` : "";
    lines.push(`[${m.id}] ${m.date}  ${m.sender}${reply}${media}`);
    lines.push(m.text || "");
    lines.push("");
  }
  return lines.join("\n");
}

export function buildHtml(bundle: ExportBundle): string {
  const rows = bundle.messages
    .map((m) => {
      const media = m.media ? `<div class="media">Media: ${escapeHtml(m.media)}</div>` : "";
      const reply = m.replyTo ? `<div class="reply">Reply to #${m.replyTo}</div>` : "";
      return `<article class="msg">
  <header><span class="id">#${m.id}</span> <time>${escapeHtml(m.date)}</time> <strong>${escapeHtml(m.sender)}</strong></header>
  ${reply}
  <p>${escapeHtml(m.text) || "<em>No text</em>"}</p>
  ${media}
</article>`;
    })
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(bundle.chatTitle)} — Telegram export</title>
  <style>
    :root { color-scheme: light dark; }
    body { font-family: ui-sans-serif, system-ui, sans-serif; max-width: 42rem; margin: 0 auto; padding: 1.25rem; line-height: 1.45; }
    h1 { font-size: 1.25rem; }
    .meta { color: #666; font-size: 0.9rem; }
    .msg { padding: 0.75rem 0; border-bottom: 1px solid #ddd; }
    header { font-size: 0.85rem; color: #555; }
    .id { opacity: 0.7; }
    p { white-space: pre-wrap; margin: 0.35rem 0 0; }
    .reply, .media { font-size: 0.8rem; color: #777; }
  </style>
</head>
<body>
  <h1>${escapeHtml(bundle.chatTitle)}</h1>
  <p class="meta">${bundle.messageCount} messages · exported ${escapeHtml(bundle.exportedAt)}</p>
  ${rows}
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}


/** Drop message rows so a sequential export can GC before the next chat. */
export function releaseBundle(bundle: ExportBundle): void {
  bundle.messages.length = 0;
}
