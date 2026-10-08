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

export interface CheckLog {
  id: string;
  status: string;
  message?: string | null;
  durationMs: number;
  createdAt: string;
}

export interface WatchDetail extends Watch {
  snapshots: SnapshotRef[];
  checkLogs: CheckLog[];
}
