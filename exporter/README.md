# Telegram Chat Exporter

Mobile-first, client-side Telegram history exporter for **iPhone Safari**.

**Live site:** https://fransjemo.github.io/telegram-chat-exporter/

Source of this app lives in this folder. GitHub Pages serves the production build from `/telegram-chat-exporter/` on [Fransjemo/fransjemo.github.io](https://github.com/Fransjemo/fransjemo.github.io).

## What it does

1. Saves your `api_id` + `api_hash` from [my.telegram.org](https://my.telegram.org) in `localStorage`.
2. Logs in with phone + OTP + optional 2FA cloud password. Persists a GramJS `StringSession`.
3. Lists chats (`getDialogs`), search, multi-select.
4. Exports messages (`iterMessages`) to JSON, readable HTML, and TXT.
5. Downloads via blob + Web Share when Safari supports it.

v1 labels media types only. It does **not** download photos, videos, or other binaries.

Nothing is hardcoded. All data stays in the browser except traffic to Telegram.

## Develop

```bash
npm install
npm run dev
```

Vite `base` is `/telegram-chat-exporter/` so assets match the project Pages URL.

```bash
npm run build
```

From the repository root, `npm run build` also copies `dist/` to `../telegram-chat-exporter/` for user-site Pages.

## iPhone usage

1. Open the live URL in Safari (not in-app browsers).
2. Share → **Add to Home Screen**.
3. Create an app on my.telegram.org (Request Desktop Website if the API page is missing).
4. Paste `api_id` / `api_hash`, then phone + login code.
5. Select chats → Export → JSON / HTML / TXT. Use Share to save to Files.
6. **Log out** clears the session. **Clear saved API keys** removes credentials.
7. Or Settings → Safari → Advanced → Website Data → remove `fransjemo.github.io`.
