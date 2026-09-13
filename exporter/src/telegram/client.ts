import { Api, TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import { saveSession } from "../storage";
import type { ChatItem } from "./types";

export type ClientOptions = {
  apiId: number;
  apiHash: string;
  session: string;
};

function createClient({ apiId, apiHash, session }: ClientOptions): TelegramClient {
  lastApiHash = apiHash;
  return new TelegramClient(new StringSession(session), apiId, apiHash, {
    connectionRetries: 5,
    floodSleepThreshold: 120,
    useWSS: true,
    deviceModel: "Telegram Chat Exporter",
    systemVersion: navigator.userAgent.includes("iPhone") ? "iOS / Safari" : "Web",
    appVersion: "1.0.0",
  });
}

let client: TelegramClient | null = null;
let lastApiHash = "";

export function getClient(): TelegramClient {
  if (!client) throw new Error("Not connected to Telegram.");
  return client;
}

export async function connectWithSession(opts: ClientOptions): Promise<TelegramClient> {
  await disconnectClient();
  const next = createClient(opts);
  await next.connect();
  const authorized = await next.checkAuthorization();
  if (!authorized) {
    await next.disconnect();
    throw new Error("Saved session is no longer authorized. Log in again.");
  }
  persistSession(next);
  client = next;
  return next;
}

export async function connectFresh(opts: Omit<ClientOptions, "session">): Promise<TelegramClient> {
  await disconnectClient();
  const next = createClient({ ...opts, session: "" });
  await next.connect();
  client = next;
  return next;
}

export async function sendLoginCode(phone: string): Promise<{
  phoneCodeHash: string;
  viaApp: boolean;
}> {
  const c = getClient();
  const result = await c.sendCode({ apiId: c.apiId, apiHash: lastApiHash }, phone);
  return {
    phoneCodeHash: result.phoneCodeHash,
    viaApp: result.isCodeViaApp,
  };
}

export async function signInWithCode(
  phone: string,
  phoneCodeHash: string,
  phoneCode: string,
): Promise<"ok" | "password"> {
  const c = getClient();
  try {
    await c.invoke(
      new Api.auth.SignIn({
        phoneNumber: phone,
        phoneCodeHash,
        phoneCode: phoneCode.trim(),
      }),
    );
    persistSession(c);
    return "ok";
  } catch (err) {
    const e = err as { errorMessage?: string };
    if (e.errorMessage === "SESSION_PASSWORD_NEEDED") return "password";
    throw err;
  }
}

export async function signInWithPassword(password: string): Promise<void> {
  const c = getClient();
  await c.signInWithPassword(
    { apiId: c.apiId, apiHash: lastApiHash },
    {
      password: async () => password,
      onError: (err) => {
        throw err;
      },
    },
  );
  persistSession(c);
}

export function persistSession(c: TelegramClient = getClient()): void {
  const saved = c.session.save();
  if (typeof saved === "string") saveSession(saved);
}

export async function disconnectClient(): Promise<void> {
  if (!client) return;
  try {
    await client.disconnect();
  } catch {
    /* ignore */
  }
  try {
    await client.destroy();
  } catch {
    /* ignore */
  }
  client = null;
}

function entityKey(entity: unknown): string {
  const e = entity as { className?: string; id?: { toString(): string } };
  const id = e?.id?.toString?.() ?? "unknown";
  return `${e?.className ?? "peer"}:${id}`;
}

function displayName(entity: unknown): string {
  if (!entity || typeof entity !== "object") return "Unknown";
  const e = entity as {
    title?: string;
    firstName?: string;
    lastName?: string;
    username?: string;
  };
  if (e.title) return e.title;
  const name = [e.firstName, e.lastName].filter(Boolean).join(" ").trim();
  if (name) return name;
  if (e.username) return `@${e.username}`;
  return "Unknown";
}

function subtitleFor(entity: unknown, unread: number): string {
  const e = entity as {
    className?: string;
    username?: string;
    bot?: boolean;
    megagroup?: boolean;
    broadcast?: boolean;
  };
  const bits: string[] = [];
  if (e.className === "User") bits.push(e.bot ? "Bot" : "Direct");
  else if (e.broadcast) bits.push("Channel");
  else if (e.megagroup || e.className === "Chat") bits.push("Group");
  else bits.push("Chat");
  if (e.username) bits.push(`@${e.username}`);
  if (unread > 0) bits.push(`${unread} unread`);
  return bits.join(" · ");
}

export async function loadChats(): Promise<ChatItem[]> {
  const c = getClient();
  const dialogs = await c.getDialogs({ limit: 200 });
  return dialogs.map((dialog) => {
    const entity = dialog.entity ?? dialog.inputEntity;
    return {
      key: entityKey(entity),
      title: dialog.title || displayName(entity),
      subtitle: subtitleFor(entity, dialog.unreadCount ?? 0),
      unread: dialog.unreadCount ?? 0,
      entity,
    };
  });
}

export async function getMeLabel(): Promise<string> {
  const me = await getClient().getMe();
  return displayName(me);
}
