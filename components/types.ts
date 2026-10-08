export interface Watch {
  id: string;
  url: string;
  title?: string | null;
  selector?: string | null;
  ignoreRegex?: string | null;
  intervalMin: number;
  active: boolean;
  webhookUrl?: string | null;
  email?: string | null;
  tags?: string | null;
  valueRegex?: string | null;
  discordWebhookUrl?: string | null;
  slackWebhookUrl?: string | null;
  checkWindows?: string | null;
  pausedUntil?: string | null;
  nextCheckAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

/** Watch enrichi par les derniers logs (chargés côté client). */
export interface WatchSummary extends Watch {
  lastStatus?: string | null;
  lastCheckAt?: string | null;
  lastMessage?: string | null;
  snapshotCount?: number;
}

export interface Snapshot {
  id: string;
  hash: string;
  createdAt: string;
  content: string;
}

export interface SnapshotRef {
  id: string;
  hash: string;
  createdAt: string;
}

/**
 * Check diagnostics added by the backend V2 contract. Every field is optional
 * on purpose: an old log row simply hides the ones it does not carry.
 */
export interface CheckLog {
  id: string;
  status: string;
  message?: string | null;
  durationMs: number;
  createdAt: string;
  httpStatus?: number | null;
  backend?: string | null;
  fetchMs?: number | null;
  parseMs?: number | null;
  htmlBytes?: number | null;
  textBytes?: number | null;
  selectorMatches?: number | null;
  errorKind?: string | null;
  contentHash?: string | null;
}

/**
 * One captured extraction. Every field except `id`/`value` is optional so an
 * older row simply renders with less.
 */
export interface ValuePoint {
  id: string;
  label?: string | null;
  value: string;
  numeric?: number | null;
  createdAt: string;
}

export interface WatchDetail extends Watch {
  /** Present only when the backend returns tracked values — never assumed. */
  valuePoints?: ValuePoint[] | null;
  snapshots: SnapshotRef[];
  checkLogs: CheckLog[];
}
