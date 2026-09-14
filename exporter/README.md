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
6. **Export all chats** is sequential: one dialog at a time, fetch → download JSON/HTML/TXT →
   release that chat’s messages → short delay → next. Progress looks like
   `Exporting 3/155: Title (N msgs)`. Per-chat errors are skipped. Telegram FloodWait waits
   and retries that chat. Histories are never held all at once (an earlier all-at-once attempt
   ran Chrome out of memory).
7. Downloads via blob + Web Share when Safari supports it.

v1 labels media types only. It does **not** download photos, videos, or other binaries.

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
5. Select chats → **Export selected** → JSON / HTML / TXT, or **Export all chats** (sequential
   downloads; allow multiple files if the browser asks). Use Share to save to Files.
6. **Log out** clears the session. **Clear saved API keys** removes credentials.
7. Or Settings → Safari → Advanced → Website Data → remove `fransjemo.github.io`.
