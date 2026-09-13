export type ChatItem = {
  key: string;
  title: string;
  subtitle: string;
  unread: number;
  entity: unknown;
};

export type ExportedMessage = {
  id: number;
  date: string;
  sender: string;
  text: string;
  replyTo: number | null;
  media: string | null;
};

export type ExportProgress = {
  count: number;
  lastId: number | null;
  lastDate: string | null;
};

export type ExportBundle = {
  chatTitle: string;
  exportedAt: string;
  messageCount: number;
  messages: ExportedMessage[];
};
