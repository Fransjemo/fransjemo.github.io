# fransjemo.github.io

User GitHub Pages site for [Francisco / Fransjemo](https://github.com/Fransjemo).

## Telegram Chat Exporter

**Live URL:** https://fransjemo.github.io/telegram-chat-exporter/

iPhone Safari, client-side Telegram history exporter (Vite + React + TypeScript + GramJS).

- App source: [`exporter/`](./exporter/)
- Published files: [`telegram-chat-exporter/`](./telegram-chat-exporter/)
- Usage, privacy, and iPhone steps: [`exporter/README.md`](./exporter/README.md)

```bash
npm run build
```

Vite `base` is `/telegram-chat-exporter/` so JS/CSS load on the project Pages path. **Export all chats**
runs sequentially (one chat in memory at a time). GramJS `crypto` is aliased to a `crypto-browserify`
shim that exposes `randomBytes` as `r.default.randomBytes`. Each push that changes `exporter/` rebuilds
via GitHub Actions and commits the `dist` output into `telegram-chat-exporter/`.

This user Pages site is used because the GitHub App token on this machine can publish here, and it is already the host for `https://fransjemo.github.io/…`.
