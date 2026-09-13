const KEYS = {
  apiId: "tce_api_id",
  apiHash: "tce_api_hash",
  session: "tce_string_session",
} as const;

export type StoredCredentials = {
  apiId: number;
  apiHash: string;
};

export function loadCredentials(): StoredCredentials | null {
  const apiIdRaw = localStorage.getItem(KEYS.apiId);
  const apiHash = localStorage.getItem(KEYS.apiHash);
  if (!apiIdRaw || !apiHash) return null;
  const apiId = Number(apiIdRaw);
  if (!Number.isInteger(apiId) || apiId <= 0) return null;
  return { apiId, apiHash };
}

export function saveCredentials(apiId: number, apiHash: string): void {
  localStorage.setItem(KEYS.apiId, String(apiId));
  localStorage.setItem(KEYS.apiHash, apiHash.trim());
}

export function clearCredentials(): void {
  localStorage.removeItem(KEYS.apiId);
  localStorage.removeItem(KEYS.apiHash);
}

export function loadSession(): string {
  return localStorage.getItem(KEYS.session) ?? "";
}

export function saveSession(session: string): void {
  if (session) localStorage.setItem(KEYS.session, session);
  else localStorage.removeItem(KEYS.session);
}

export function clearSession(): void {
  localStorage.removeItem(KEYS.session);
}

export function clearAllAppData(): void {
  clearCredentials();
  clearSession();
}
