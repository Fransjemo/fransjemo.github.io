import { useEffect, useMemo, useState } from "react";
import {
  clearAllAppData,
  clearCredentials,
  clearSession,
  loadCredentials,
  loadSession,
  saveCredentials,
} from "./storage";
import { formatTelegramError, sleepMs, withFloodWaitRetry } from "./errors";
import {
  connectFresh,
  connectWithSession,
  disconnectClient,
  getMeLabel,
  loadChats,
  persistSession,
  sendLoginCode,
  signInWithCode,
  signInWithPassword,
} from "./telegram/client";
import { buildHtml, buildJson, buildTxt, exportChat, releaseBundle, slugFor } from "./telegram/export";
import type { ChatItem, ExportBundle, ExportProgress } from "./telegram/types";
import { downloadBundleFormats, shareOrDownload } from "./download";
import "./App.css";

type Screen = "credentials" | "login" | "chats";
type LoginPhase = "phone" | "code" | "password";

const savedCreds = loadCredentials();
const savedSession = loadSession();

export default function App() {
  const [screen, setScreen] = useState<Screen>("credentials");
  const [apiId, setApiId] = useState(savedCreds ? String(savedCreds.apiId) : "");
  const [apiHash, setApiHash] = useState(savedCreds?.apiHash ?? "");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [phoneCodeHash, setPhoneCodeHash] = useState("");
  const [loginPhase, setLoginPhase] = useState<LoginPhase>("phone");
  const [codeViaApp, setCodeViaApp] = useState(false);
  const [me, setMe] = useState("");
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [limit, setLimit] = useState("0");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [bundles, setBundles] = useState<ExportBundle[]>([]);
  const [booting, setBooting] = useState(Boolean(savedCreds && savedSession));

  useEffect(() => {
    if (savedCreds && savedSession) void handleResume();
    // resume once on first paint when a StringSession already exists
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visibleChats = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return chats;
    return chats.filter(
      (c) => c.title.toLowerCase().includes(q) || c.subtitle.toLowerCase().includes(q),
    );
  }, [chats, query]);

  const selectedChats = chats.filter((c) => selected[c.key]);

  async function afterAuthorized() {
    persistSession();
    const [label, list] = await Promise.all([getMeLabel(), loadChats()]);
    setMe(label);
    setChats(list);
    setScreen("chats");
    setInfo(`Signed in as ${label}. ${list.length} chats loaded.`);
  }

  async function handleResume() {
    if (!savedCreds || !savedSession) {
      setBooting(false);
      return;
    }
    setBusy(true);
    setError("");
    try {
      await connectWithSession({
        apiId: savedCreds.apiId,
        apiHash: savedCreds.apiHash,
        session: savedSession,
      });
      await afterAuthorized();
    } catch (err) {
      clearSession();
      setError(formatTelegramError(err));
      setScreen("login");
    } finally {
      setBusy(false);
      setBooting(false);
    }
  }

  async function handleSaveCredentials(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    const id = Number(apiId.trim());
    const hash = apiHash.trim();
    if (!Number.isInteger(id) || id <= 0 || !/^[a-f0-9]{32}$/i.test(hash)) {
      setError(
        "Enter a numeric api_id and the 32-character api_hash from my.telegram.org. Nothing is hardcoded.",
      );
      return;
    }
    saveCredentials(id, hash);
    setInfo("API credentials saved in this browser only.");
    if (loadSession()) {
      setBooting(true);
      await handleResume();
      return;
    }
    setScreen("login");
  }

  async function handleSendCode(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setInfo("");
    try {
      const creds = loadCredentials();
      if (!creds) throw new Error("Save api_id and api_hash first.");
      await connectFresh(creds);
      const result = await sendLoginCode(phone.trim());
      setPhoneCodeHash(result.phoneCodeHash);
      setCodeViaApp(result.viaApp);
      setLoginPhase("code");
      setInfo(
        result.viaApp
          ? "Open Telegram on your other devices — the login code is in Messages."
          : "Telegram sent an SMS login code.",
      );
    } catch (err) {
      setError(formatTelegramError(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleVerifyCode(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await signInWithCode(phone.trim(), phoneCodeHash, code);
      if (result === "password") {
        setLoginPhase("password");
        setInfo("Two-step verification is on. Enter your Telegram cloud password.");
        return;
      }
      await afterAuthorized();
    } catch (err) {
      setError(formatTelegramError(err));
    } finally {
      setBusy(false);
    }
  }

  async function handlePassword(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await signInWithPassword(password);
      await afterAuthorized();
    } catch (err) {
      setError(formatTelegramError(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleLogout() {
    setBusy(true);
    try {
      await disconnectClient();
    } finally {
      clearSession();
      setMe("");
      setChats([]);
      setSelected({});
      setBundles([]);
      setPassword("");
      setCode("");
      setLoginPhase("phone");
      setScreen("login");
      setInfo("Session cleared from this browser.");
      setBusy(false);
    }
  }

  function handleClearAll() {
    void disconnectClient();
    clearAllAppData();
    setApiId("");
    setApiHash("");
    setPhone("");
    setCode("");
    setPassword("");
    setMe("");
    setChats([]);
    setBundles([]);
    setSelected({});
    setLoginPhase("phone");
    setScreen("credentials");
    setInfo("API credentials and session removed from localStorage.");
  }

  function toggleChat(key: string) {
    setSelected((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function handleExport() {
    if (!selectedChats.length) {
      setError("Select at least one chat.");
      return;
    }
    setBusy(true);
    setError("");
    setBundles([]);
    const parsed = Number(limit);
    const messageLimit = Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
    const next: ExportBundle[] = [];
    try {
      for (const chat of selectedChats) {
        setInfo(`Exporting “${chat.title}”…`);
        setProgress({ count: 0, lastId: null, lastDate: null });
        const bundle = await withFloodWaitRetry(
          () => exportChat(chat, messageLimit, setProgress),
          (seconds) => setInfo(`FloodWait: waiting ${seconds}s, then retrying “${chat.title}”…`),
        );
        next.push(bundle);
      }
      setBundles(next);
      setInfo(`Exported ${next.reduce((n, b) => n + b.messageCount, 0)} messages from ${next.length} chat(s). Media files are labeled only — binaries are not downloaded in v1.`);
    } catch (err) {
      setError(formatTelegramError(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleExportAll() {
    if (!chats.length) {
      setError("No chats loaded.");
      return;
    }
    if (
      !window.confirm(
        `Export all ${chats.length} chats one at a time? Each chat downloads JSON, HTML, and TXT, then memory is released before the next chat. Allow multiple downloads if the browser asks.`,
      )
    ) {
      return;
    }
    setBusy(true);
    setError("");
    setBundles([]);
    setProgress({ count: 0, lastId: null, lastDate: null });
    const parsed = Number(limit);
    const messageLimit = Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
    let exported = 0;
    let skipped = 0;
    const skipReasons: string[] = [];
    const total = chats.length;

    try {
      for (let i = 0; i < chats.length; i++) {
        const chat = chats[i];
        const n = i + 1;
        setInfo(`Exporting ${n}/${total}: ${chat.title} (0 msgs)`);
        setProgress({ count: 0, lastId: null, lastDate: null });
        try {
          const bundle = await withFloodWaitRetry(
            () =>
              exportChat(chat, messageLimit, (p) => {
                setProgress(p);
                setInfo(`Exporting ${n}/${total}: ${chat.title} (${p.count} msgs)`);
              }),
            (seconds) => {
              setInfo(`FloodWait: waiting ${seconds}s, then retrying “${chat.title}”…`);
            },
          );
          setInfo(`Exporting ${n}/${total}: ${chat.title} (${bundle.messageCount} msgs)`);
          downloadBundleFormats(bundle);
          releaseBundle(bundle);
          exported += 1;
        } catch (err) {
          skipped += 1;
          skipReasons.push(`${chat.title}: ${formatTelegramError(err)}`);
          setInfo(`Skipping ${n}/${total}: ${chat.title} — ${formatTelegramError(err)}`);
        }
        await sleepMs(400);
      }
      setProgress(null);
      setInfo(
        `Finished sequential export: ${exported} ok, ${skipped} skipped of ${total}. Media files are labeled only — binaries are not downloaded in v1.`,
      );
      if (skipReasons.length) {
        const extra = skipReasons.length > 12 ? ` · +${skipReasons.length - 12} more` : "";
        setError(skipReasons.slice(0, 12).join(" · ") + extra);
      }
    } finally {
      setBusy(false);
    }
  }

  async function saveBundle(bundle: ExportBundle, kind: "json" | "html" | "txt") {
    const slug = slugFor(bundle);
    const body =
      kind === "json" ? buildJson(bundle) : kind === "html" ? buildHtml(bundle) : buildTxt(bundle);
    const mime =
      kind === "json" ? "application/json" : kind === "html" ? "text/html" : "text/plain";
    const file = new File([body], `${slug}.${kind}`, { type: `${mime};charset=utf-8` });
    const how = await shareOrDownload(file);
    setInfo(how === "shared" ? `Shared ${file.name}` : `Downloaded ${file.name}`);
  }

  if (booting) {
    return (
      <main className="app">
        <Header me="" onLogout={() => undefined} canLogout={false} />
        <p className="note">Restoring your saved Telegram session…</p>
        <div className="actions">
          <button className="primary" type="button" onClick={() => void handleResume()} disabled={busy}>
            {busy ? "Connecting…" : "Continue"}
          </button>
          <button className="secondary" type="button" onClick={handleClearAll}>
            Clear saved data
          </button>
        </div>
        {error ? <p className="banner error">{error}</p> : null}
      </main>
    );
  }

  return (
    <main className="app">
      <Header me={me} onLogout={() => void handleLogout()} canLogout={screen === "chats"} />
      <ol className="steps" aria-label="Progress">
        <li className={`step-pill ${screen === "credentials" ? "on" : ""}`}>1 · API</li>
        <li className={`step-pill ${screen === "login" ? "on" : ""}`}>2 · Login</li>
        <li className={`step-pill ${screen === "chats" ? "on" : ""}`}>3 · Export</li>
      </ol>

      {error ? <p className="banner error">{error}</p> : null}
      {info ? <p className="banner info">{info}</p> : null}

      {screen === "credentials" ? (
        <form className="card" onSubmit={(e) => void handleSaveCredentials(e)}>
          <p className="hint">
            Create an app at{" "}
            <a href="https://my.telegram.org" target="_blank" rel="noreferrer">
              my.telegram.org
            </a>{" "}
            and paste <strong>api_id</strong> + <strong>api_hash</strong>. They stay in this
            iPhone’s localStorage only — never committed or sent to our servers.
          </p>
          <label htmlFor="apiId">api_id</label>
          <input
            id="apiId"
            inputMode="numeric"
            autoComplete="off"
            value={apiId}
            onChange={(e) => setApiId(e.target.value)}
            placeholder="123456"
          />
          <label htmlFor="apiHash">api_hash</label>
          <input
            id="apiHash"
            autoComplete="off"
            spellCheck={false}
            value={apiHash}
            onChange={(e) => setApiHash(e.target.value)}
            placeholder="32-character hash"
          />
          <div className="actions">
            <button className="primary" type="submit">
              Save and continue
            </button>
            <button
              className="secondary"
              type="button"
              onClick={() => {
                clearCredentials();
                setApiId("");
                setApiHash("");
                setInfo("Cleared api_id / api_hash from localStorage.");
              }}
            >
              Clear saved API keys
            </button>
          </div>
          <IphoneHelp />
          <PrivacyNote />
        </form>
      ) : null}

      {screen === "login" ? (
        <form
          className="card"
          onSubmit={(e) => {
            if (loginPhase === "phone") void handleSendCode(e);
            else if (loginPhase === "code") void handleVerifyCode(e);
            else void handlePassword(e);
          }}
        >
          {loginPhase === "phone" ? (
            <>
              <label htmlFor="phone">Phone number</label>
              <input
                id="phone"
                type="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+15551234567"
              />
              <p className="hint">Use international format with country code.</p>
            </>
          ) : null}

          {loginPhase === "code" ? (
            <>
              <label htmlFor="code">{codeViaApp ? "Telegram app code" : "SMS code"}</label>
              <input
                id="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="12345"
              />
            </>
          ) : null}

          {loginPhase === "password" ? (
            <>
              <label htmlFor="password">Cloud password (2FA)</label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </>
          ) : null}

          <div className="actions">
            <button className="primary" type="submit" disabled={busy}>
              {busy
                ? "Working…"
                : loginPhase === "phone"
                  ? "Send login code"
                  : loginPhase === "code"
                    ? "Verify code"
                    : "Unlock with 2FA"}
            </button>
            <button
              className="secondary"
              type="button"
              onClick={() => {
                setLoginPhase("phone");
                setCode("");
                setPassword("");
                setScreen("credentials");
              }}
            >
              Back to API keys
            </button>
          </div>
          <PrivacyNote />
        </form>
      ) : null}

      {screen === "chats" ? (
        <section className="card">
          <input
            className="search"
            type="search"
            placeholder="Search chats"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <p className="selected">
            {selectedChats.length} selected · {visibleChats.length} shown
          </p>
          <ul className="chats">
            {visibleChats.map((chat) => (
              <li className="chat" key={chat.key}>
                <input
                  type="checkbox"
                  checked={Boolean(selected[chat.key])}
                  onChange={() => toggleChat(chat.key)}
                  aria-label={`Select ${chat.title}`}
                />
                <div>
                  <div className="chat-title">{chat.title}</div>
                  <div className="chat-sub">{chat.subtitle}</div>
                </div>
              </li>
            ))}
          </ul>
          <label htmlFor="limit">Message limit (0 = all)</label>
          <input
            id="limit"
            inputMode="numeric"
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
          />
          <div className="actions">
            <button className="primary" type="button" disabled={busy} onClick={() => void handleExport()}>
              {busy ? "Exporting…" : "Export selected"}
            </button>
            <button
              className="secondary"
              type="button"
              disabled={busy || chats.length === 0}
              onClick={() => void handleExportAll()}
            >
              {busy ? "Exporting…" : `Export all chats${chats.length ? ` (${chats.length})` : ""}`}
            </button>
          </div>
          <p className="hint">
            Export all chats runs one dialog at a time (fetch → download JSON/HTML/TXT → clear
            memory → short delay). FloodWait waits and retries; other per-chat errors are skipped.
          </p>
          {progress ? (
            <p className="progress">
              {progress.count} messages
              {progress.lastDate ? ` · last ${progress.lastDate}` : ""}
            </p>
          ) : null}
          {bundles.map((bundle) => (
            <div className="exports" key={`${bundle.chatTitle}-${bundle.exportedAt}`}>
              <strong>
                {bundle.chatTitle} · {bundle.messageCount}
              </strong>
              <div className="row">
                <button className="secondary" type="button" onClick={() => void saveBundle(bundle, "json")}>
                  JSON
                </button>
                <button className="secondary" type="button" onClick={() => void saveBundle(bundle, "html")}>
                  HTML
                </button>
              </div>
              <button className="secondary" type="button" onClick={() => void saveBundle(bundle, "txt")}>
                TXT
              </button>
            </div>
          ))}
          <PrivacyNote />
        </section>
      ) : null}
    </main>
  );
}

function Header({
  me,
  onLogout,
  canLogout,
}: {
  me: string;
  onLogout: () => void;
  canLogout: boolean;
}) {
  return (
    <header className="top">
      <div className="brand">
        <div className="logo" aria-hidden>
          TG
        </div>
        <div>
          <h1>Telegram Chat Exporter</h1>
          <p className="sub">{me || "Client-side · iPhone Safari"}</p>
        </div>
      </div>
      <button className="ghost" type="button" onClick={onLogout} disabled={!canLogout}>
        Log out
      </button>
    </header>
  );
}

function IphoneHelp() {
  return (
    <details className="iphone">
      <summary>iPhone Safari tips</summary>
      <ol>
        <li>
          Get keys on a computer if possible: my.telegram.org → API development tools. In Safari you
          may need <em>Request Desktop Website</em>.
        </li>
        <li>
          Add this page to the Home Screen (Share → Add to Home Screen) so it behaves like a small
          app and keeps localStorage more reliably.
        </li>
        <li>
          Login codes arrive in the official Telegram app or SMS. 2FA is your cloud password, not
          the phone code.
        </li>
        <li>
          To wipe data: tap Log out (session) or Clear saved API keys, or Settings → Safari →
          Advanced → Website Data → search “fransjemo” / “github.io” and remove it.
        </li>
        <li>
          Downloads: use JSON / HTML / TXT. If Safari offers Share, save to Files or AirDrop.
          <strong>Export all chats</strong> downloads each dialog’s three files immediately, then
          forgets that history before the next chat (avoids Chrome running out of memory).
        </li>
      </ol>
    </details>
  );
}

function PrivacyNote() {
  return (
    <p className="privacy">
      Privacy: this page talks to Telegram from your browser. History, session, and API keys never
      leave the device except to Telegram. Logging out deletes the StringSession from localStorage.
    </p>
  );
}
