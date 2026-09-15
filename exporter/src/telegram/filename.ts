/** Skip HTML/TXT for selected export when a chat is larger than this. */
export const HTML_TXT_MAX_MESSAGES = 8_000;

export function allowsHtmlTxt(messageCount: number): boolean {
  return messageCount <= HTML_TXT_MAX_MESSAGES;
}

export function slugify(title: string): string {
  const slug = title
    .trim()
    .replace(/[^\w]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return slug || "chat";
}

export function ymd(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10).replaceAll("-", "");
}

/** `{slug}__{chatId}-{YYYYMMDD}.{ext}` — chat id avoids title collisions. */
export function exportFilename(
  title: string,
  chatId: string | number,
  ext: string,
  date: Date = new Date(),
): string {
  const cleanExt = ext.replace(/^\./, "");
  return `${slugify(title)}__${chatId}-${ymd(date)}.${cleanExt}`;
}
