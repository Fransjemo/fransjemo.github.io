import { buildHtml, buildJson, buildTxt } from "./telegram/export";
import { allowsHtmlTxt, exportFilename } from "./telegram/filename";
import type { ExportBundle } from "./telegram/types";

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export async function shareOrDownload(file: File): Promise<"shared" | "downloaded"> {
  const nav = navigator as Navigator & {
    canShare?: (data?: ShareData) => boolean;
    share?: (data?: ShareData) => Promise<void>;
  };
  try {
    if (nav.canShare?.({ files: [file] })) {
      await nav.share({ files: [file], title: file.name });
      return "shared";
    }
  } catch (err) {
    const name = err instanceof Error ? err.name : "";
    if (name === "AbortError") return "shared";
  }
  downloadBlob(file, file.name);
  return "downloaded";
}

/** Export-all: JSON only, one file, then caller must release the bundle. */
export function downloadJson(title: string, chatId: string | number, json: string): void {
  downloadBlob(
    new Blob([json], { type: "application/json;charset=utf-8" }),
    exportFilename(title, chatId, "json"),
  );
}

/** Selected export: JSON always; HTML/TXT only when the chat is small enough. */
export function downloadSelectedFormats(bundle: ExportBundle): void {
  const chatId = bundle.chatId;
  downloadBlob(
    new Blob([buildJson(bundle)], { type: "application/json;charset=utf-8" }),
    exportFilename(bundle.chatTitle, chatId, "json"),
  );
  if (!allowsHtmlTxt(bundle.messageCount)) return;
  downloadBlob(
    new Blob([buildHtml(bundle)], { type: "text/html;charset=utf-8" }),
    exportFilename(bundle.chatTitle, chatId, "html"),
  );
  downloadBlob(
    new Blob([buildTxt(bundle)], { type: "text/plain;charset=utf-8" }),
    exportFilename(bundle.chatTitle, chatId, "txt"),
  );
}
