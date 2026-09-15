import type { ReactNode } from "react";
import { allowsHtmlTxt, HTML_TXT_MAX_MESSAGES } from "./telegram/filename";
import type { ChatItem, ExportBundle, ExportProgress } from "./telegram/types";

type ChatListProps = {
  chats: ChatItem[];
  visibleChats: ChatItem[];
  selected: Record<string, boolean>;
  onToggle: (key: string) => void;
  query: string;
  onQueryChange: (value: string) => void;
  doneIds: string[];
  doneIdSet: Set<string>;
  limit: string;
  onLimitChange: (value: string) => void;
  includeMediaSources: boolean;
  onIncludeMediaSourcesChange: (value: boolean) => void;
  busy: boolean;
  progress: ExportProgress | null;
  bundles: ExportBundle[];
  onExportSelected: () => void;
  onExportAll: () => void;
  onClearProgress: () => void;
  onSaveBundle: (bundle: ExportBundle, kind: "json" | "html" | "txt") => void;
  children?: ReactNode;
};

export function ChatList({
  chats,
  visibleChats,
  selected,
  onToggle,
  query,
  onQueryChange,
  doneIds,
  doneIdSet,
  limit,
  onLimitChange,
  includeMediaSources,
  onIncludeMediaSourcesChange,
  busy,
  progress,
  bundles,
  onExportSelected,
  onExportAll,
  onClearProgress,
  onSaveBundle,
  children,
}: ChatListProps) {
  const selectedCount = chats.filter((c) => selected[c.key]).length;

  return (
    <section className="card">
      <input
        className="search"
        type="search"
        placeholder="Search chats"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
      />
      <p className="selected">
        {selectedCount} selected · {visibleChats.length} shown
        {doneIds.length ? ` · ${doneIds.length} already exported` : ""}
      </p>
      <ul className="chats">
        {visibleChats.map((chat) => (
          <li className="chat" key={chat.key}>
            <input
              type="checkbox"
              checked={Boolean(selected[chat.key])}
              onChange={() => onToggle(chat.key)}
              aria-label={`Select ${chat.title}`}
            />
            <div>
              <div className="chat-title">{chat.title}</div>
              <div className="chat-sub">
                {chat.subtitle}
                {doneIdSet.has(String(chat.id)) ? " · exported" : ""}
              </div>
            </div>
          </li>
        ))}
      </ul>
      <label htmlFor="limit">Message limit (0 = all)</label>
      <input
        id="limit"
        inputMode="numeric"
        value={limit}
        onChange={(e) => onLimitChange(e.target.value)}
      />
      <label className="option" htmlFor="includeMediaSources">
        <input
          id="includeMediaSources"
          type="checkbox"
          checked={includeMediaSources}
          onChange={(e) => onIncludeMediaSourcesChange(e.target.checked)}
        />
        <span>Include media source URLs (highest-res / Telegram message links)</span>
      </label>
      <p className="hint">
        Telegram does not expose permanent public CDN URLs for private chat photos/videos. We store
        the best available Telegram/webpage link plus highest-res size metadata.
      </p>
      <div className="actions">
        <button className="primary" type="button" disabled={busy} onClick={onExportSelected}>
          {busy ? "Exporting…" : "Export selected"}
        </button>
        <button
          className="secondary"
          type="button"
          disabled={busy || chats.length === 0}
          onClick={onExportAll}
        >
          {busy ? "Exporting…" : `Export all chats${chats.length ? ` (${chats.length})` : ""}`}
        </button>
        <button
          className="secondary"
          type="button"
          disabled={busy || doneIds.length === 0}
          onClick={onClearProgress}
        >
          Clear export progress
        </button>
      </div>
      <p className="hint">
        Export all is JSON only and runs one dialog at a time (fetch → download → clear memory →
        short delay). Already-exported chat ids in localStorage <code>tg_export_done_ids</code> are
        skipped. Files are named <code>{"{slug}__{chatId}-{YYYYMMDD}.json"}</code>. Selected export
        can still save HTML/TXT (skipped above {HTML_TXT_MAX_MESSAGES.toLocaleString()} messages).
        FloodWait waits and retries; other per-chat errors are skipped.
      </p>
      {progress ? (
        <p className="progress">
          {progress.count} messages
          {progress.lastDate ? ` · last ${progress.lastDate}` : ""}
        </p>
      ) : null}
      {bundles.map((bundle) => (
        <div className="exports" key={`${bundle.chatId}-${bundle.exportedAt}`}>
          <strong>
            {bundle.chatTitle} · {bundle.chatId} · {bundle.messageCount}
          </strong>
          <div className="row">
            <button className="secondary" type="button" onClick={() => onSaveBundle(bundle, "json")}>
              JSON
            </button>
            {allowsHtmlTxt(bundle.messageCount) ? (
              <button className="secondary" type="button" onClick={() => onSaveBundle(bundle, "html")}>
                HTML
              </button>
            ) : (
              <span className="hint">HTML/TXT skipped (&gt;{HTML_TXT_MAX_MESSAGES} msgs)</span>
            )}
          </div>
          {allowsHtmlTxt(bundle.messageCount) ? (
            <button className="secondary" type="button" onClick={() => onSaveBundle(bundle, "txt")}>
              TXT
            </button>
          ) : null}
        </div>
      ))}
      {children}
    </section>
  );
}
