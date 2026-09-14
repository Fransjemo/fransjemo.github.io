import { buildHtml, buildJson, buildTxt, slugFor } from "./telegram/export";
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

/** Immediate JSON/HTML/TXT downloads for one chat; caller must then release the bundle. */
export function downloadBundleFormats(bundle: ExportBundle): void {
  const slug = slugFor(bundle);
  downloadBlob(
    new Blob([buildJson(bundle)], { type: "application/json;charset=utf-8" }),
    `${slug}.json`,
  );
  downloadBlob(
    new Blob([buildHtml(bundle)], { type: "text/html;charset=utf-8" }),
    `${slug}.html`,
  );
  downloadBlob(
    new Blob([buildTxt(bundle)], { type: "text/plain;charset=utf-8" }),
    `${slug}.txt`,
  );
}
