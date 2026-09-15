import type { MediaSourceKind, PeerKind } from "./media-source";

export type { MediaSourceKind, PeerKind };

export type ChatItem = {
  key: string;
  /** Marked Telegram chat id (user id, `-chatId`, or `-100channelId`). */
  id: string;
  title: string;
  subtitle: string;
  unread: number;
  username: string | null;
  peerKind: PeerKind;
  entity: unknown;
};

export type ExportedMessage = {
  id: number;
  date: string;
  sender: string;
  text: string;
  replyTo: number | null;
  media: string | null;
  mediaType?: string | null;
  mediaSourceUrl?: string | null;
  mediaSourceKind?: MediaSourceKind | null;
  mediaFileName?: string | null;
  mediaMimeType?: string | null;
  mediaWidth?: number | null;
  mediaHeight?: number | null;
  mediaSizeBytes?: number | null;
};

export type ExportProgress = {
  count: number;
  lastId: number | null;
  lastDate: string | null;
};

export type ExportChatOptions = {
  includeMediaSources?: boolean;
  limit?: number;
};

export type ExportBundle = {
  chatTitle: string;
  chatId: string;
  exportedAt: string;
  messageCount: number;
  messages: ExportedMessage[];
  includeMediaSources?: boolean;
};

/** JSON chat export payload (alias used by the media-source flag). */
export type ChatExport = ExportBundle;
