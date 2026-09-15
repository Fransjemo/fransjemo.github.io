# Telegram Chat Exporter

Mobile-first, client-side Telegram history exporter for **iPhone Safari**.

**Live site:** https://fransjemo.github.io/telegram-chat-exporter/

Source of this app lives in this folder. GitHub Pages serves the production build from `/telegram-chat-exporter/` on [Fransjemo/fransjemo.github.io](https://github.com/Fransjemo/fransjemo.github.io).

## What it does

1. Saves your `api_id` + `api_hash` from [my.telegram.org](https://my.telegram.org) in `localStorage`.
2. Logs in with phone + OTP + optional 2FA cloud password. Persists a GramJS `StringSession`.
3. Lists chats (`getDialogs`), search, multi-select.
4. Exports messages (`iterMessages`) to JSON, readable HTML, and TXT.
5. **Export selected** keeps the last batch on-screen so you can tap JSON / HTML / TXT.
   HTML and TXT are skipped when a chat has more than about 8,000 messages.
6. **Export all chats** is JSON only and sequential: one dialog at a time, fetch → download
   JSON → release that chat’s messages → short delay → next. Progress looks like
   `Exporting 3/155: Title (N msgs)`. Already-exported chat ids are stored in
   `localStorage` key `tg_export_done_ids` so you can resume; use **Clear export progress**
   to start over. Per-chat errors are skipped. Telegram FloodWait waits and retries that
   chat. Histories are never held all at once (an earlier all-at-once attempt ran Chrome
   out of memory).
7. Download filenames include the Telegram chat id so two chats with the same title do not
   collide: `{slug}__{chatId}-{YYYYMMDD}.{ext}`
   (examples: `Unknown__8172808504-20260916.json`,
   `Kristina-Pimenova__-1001525425988-20260916.json`).
8. Optional **Include media source URLs** (off by default) adds per-message
   `mediaSourceUrl` / `mediaSourceKind` plus highest-res size metadata. Telegram does
   **not** expose permanent public CDN URLs for private chat photos/videos; we store
   the best available webpage URL or Telegram message / deep link.
9. Downloads via blob + Web Share when Safari supports it.

v1 does **not** download photos, videos, or other binaries. Media types are always
labeled; source URLs are only included when the checkbox is on.

Nothing is hardcoded. All data stays in the browser except traffic to Telegram.

## Develop

```bash
npm install
npm run dev
```

Vite `base` is `/telegram-chat-exporter/` so assets match the project Pages URL. GramJS needs a
Node `crypto` shim: Vite aliases `crypto` / `node:crypto` to `src/crypto-shim.ts`, which re-exports
`crypto-browserify` with `default.randomBytes` (the `r.default.randomBytes` interop GramJS expects).
The shim never assigns to read-only `window.crypto`. The Buffer polyfill in `src/polyfills.ts` stays.

```bash
npm run build
```

From the repository root, `npm run build` also copies `dist/` to `../telegram-chat-exporter/` for user-site Pages.

## iPhone usage

1. Open the live URL in Safari (not in-app browsers).
2. Share → **Add to Home Screen**.
3. Create an app on my.telegram.org (Request Desktop Website if the API page is missing).
4. Paste `api_id` / `api_hash`, then phone + login code.
5. Select chats → **Export selected** → JSON / HTML / TXT, or **Export all chats** (JSON only,
   sequential downloads; allow multiple files if the browser asks). Use Share to save to Files.
   Filenames are `{slug}__{chatId}-{YYYYMMDD}.json`. Turn on **Include media source
   URLs** only if you want Telegram/webpage links and size metadata in the export.
6. **Log out** clears the session. **Clear saved API keys** removes credentials.
7. Or Settings → Safari → Advanced → Website Data → remove `fransjemo.github.io`.
