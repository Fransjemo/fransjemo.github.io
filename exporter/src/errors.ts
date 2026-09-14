export function floodWaitSeconds(err: unknown): number | null {
  const e = err as {
    seconds?: number;
    errorMessage?: string;
    message?: string;
  };
  if (typeof e.seconds === "number" && Number.isFinite(e.seconds) && e.seconds > 0) {
    return Math.ceil(e.seconds);
  }
  const raw = [e.errorMessage, e.message, err instanceof Error ? err.message : ""]
    .filter(Boolean)
    .join(" ");
  const match = raw.match(/FLOOD_WAIT[_ ]?(\d+)/i) || raw.match(/A wait of (\d+) seconds/i);
  if (!match) return null;
  const seconds = Number(match[1]);
  return Number.isFinite(seconds) && seconds > 0 ? seconds : null;
}

export function sleepMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sleepSeconds(seconds: number): Promise<void> {
  const end = Date.now() + seconds * 1000;
  while (Date.now() < end) {
    await sleepMs(Math.min(1000, end - Date.now()));
  }
}

export async function withFloodWaitRetry<T>(
  fn: () => Promise<T>,
  onWait?: (seconds: number) => void,
  maxRetries = 8,
): Promise<T> {
  let attempt = 0;
  for (;;) {
    try {
      return await fn();
    } catch (err) {
      const seconds = floodWaitSeconds(err);
      if (seconds == null || attempt >= maxRetries) throw err;
      attempt += 1;
      onWait?.(seconds);
      await sleepSeconds(seconds + 1);
    }
  }
}

export function formatTelegramError(err: unknown): string {
  const e = err as {
    errorMessage?: string;
    message?: string;
    seconds?: number;
    code?: number;
  };
  const code = e?.errorMessage || "";
  const seconds = typeof e?.seconds === "number" ? e.seconds : undefined;
  const raw = code || e?.message || (err instanceof Error ? err.message : String(err));

  if (seconds && /FLOOD|wait/i.test(raw)) {
    return `Telegram rate limit (FloodWait): wait ${seconds} seconds, then try again.`;
  }
  if (/FLOOD_WAIT_(\d+)/i.test(raw)) {
    const n = raw.match(/FLOOD_WAIT_(\d+)/i)?.[1];
    return `Telegram rate limit (FloodWait): wait ${n} seconds, then try again.`;
  }

  const friendly: Record<string, string> = {
    PHONE_NUMBER_INVALID:
      "That phone number looks invalid. Use international format, e.g. +15551234567.",
    PHONE_NUMBER_BANNED: "This phone number is banned from Telegram.",
    PHONE_NUMBER_FLOOD: "Too many login attempts for this number. Wait and try later.",
    PHONE_CODE_INVALID: "That login code is incorrect. Check Telegram and try again.",
    PHONE_CODE_EXPIRED: "The login code expired. Request a new one.",
    PHONE_CODE_EMPTY: "Enter the login code Telegram sent you.",
    PASSWORD_HASH_INVALID: "The 2FA cloud password is incorrect.",
    SESSION_PASSWORD_NEEDED: "Two-step verification is on. Enter your Telegram cloud password.",
    API_ID_INVALID: "api_id is invalid. Copy it again from my.telegram.org.",
    API_ID_PUBLISHED_FLOOD: "This api_id is temporarily rate-limited. Wait and retry.",
    AUTH_KEY_UNREGISTERED: "Saved session is no longer valid. Log in again.",
    AUTH_KEY_DUPLICATED: "This session is already used elsewhere. Log in again.",
    SESSION_REVOKED: "Telegram revoked this session. Log in again.",
    USER_DEACTIVATED: "This Telegram account is deactivated.",
    USER_DEACTIVATED_BAN: "This Telegram account is banned.",
    AUTH_RESTART: "Telegram asked to restart login. Request a new code.",
  };

  if (code && friendly[code]) return friendly[code];
  if (raw && friendly[raw]) return friendly[raw];

  if (/Bytes or str expected/i.test(raw)) {
    return "Login hit a browser crypto encoding bug. Reload the page and try again with a fresh code.";
  }

  return raw || "Something went wrong. Try again.";
}
