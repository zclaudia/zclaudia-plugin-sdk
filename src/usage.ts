/** Version of the usage snapshot contract. Bump on any breaking field change. */
export const RUNTIME_USAGE_SNAPSHOT_SCHEMA_VERSION = 1;

/** Optional, versioned usage capability id declared in runtime PCP manifests. */
export const USAGE_TRACKING_CAPABILITY_ID = 'usage.tracking' as const;

/**
 * Token classification. All values are non-negative safe integers; `null`
 * means "unknown". 0 must always come from an observed zero, never as a
 * placeholder for missing data.
 *
 * A complete classification satisfies
 * `total = inputUncached + cacheRead + cacheWrite + output`.
 * `reasoningOutput` is an output SUBSET — display detail only, never added
 * back into totals.
 */
export interface UsageTokenBreakdown {
  inputUncached: number | null;
  cacheRead: number | null;
  cacheWrite: number | null;
  output: number | null;
  reasoningOutput: number | null;
  /** Source-reported cumulative total, or derived from a complete disjoint classification. */
  total: number | null;
}

export type RuntimeUsageDataStatus = 'complete' | 'partial' | 'missing';

/** Per-model allocation inside one invocation. Allocations are mutually exclusive. */
export interface UsageModelAllocation {
  /** Runtime-reported actual model id; null = Unknown model bucket. */
  modelId: string | null;
  tokens: UsageTokenBreakdown;
}

export interface RuntimeUsageSnapshotSource {
  /** Provenance label, e.g. `claude_result` / `codex_thread_delta` / `pi_agent_end`. */
  kind: string;
  /** Accounting scope of the reported numbers. */
  scope: 'invocation';
  includesSubagents: 'yes' | 'no' | 'unknown';
  /** Version of the metering rules that produced this snapshot. */
  ruleVersion: number;
}

/**
 * One cumulative usage snapshot for an invocation. The adapter emits the
 * CURRENT accumulated state (not per-request deltas); the host REPLACES the
 * stored snapshot rather than summing successive notifications.
 */
export interface RuntimeUsageSnapshot {
  schemaVersion: typeof RUNTIME_USAGE_SNAPSHOT_SCHEMA_VERSION;
  /** Strictly increasing within one invocation; used for idempotent replaces. */
  revision: number;
  /** True once the usage snapshot is settled — does NOT imply task success. */
  final: boolean;
  status: RuntimeUsageDataStatus;
  /** Machine-readable downgrade cause, e.g. `missing_baseline` / `interrupted`. */
  reason?: string;
  tokens: UsageTokenBreakdown;
  models: UsageModelAllocation[];
  source: RuntimeUsageSnapshotSource;
  /**
   * Audit summary when the source total and the classification disagree, or
   * when model allocations cannot be reconciled with the invocation total.
   * Never silently force the gap into a bucket.
   */
  discrepancy?: string;
  /**
   * Restricted checkpoint for resumable cumulative counters (Codex thread
   * totals). Counters, native ids and time ONLY — never prompts, replies,
   * tool input or secrets. Host-side storage; never forwarded to clients.
   */
  checkpoint?: UsageSourceCheckpoint;
}

/** Persisted counter state used to baseline the next resumed invocation. */
export interface UsageSourceCheckpoint {
  schemaVersion: 1;
  /** Native thread/session id the counters belong to. */
  nativeThreadId?: string;
  /** Counter epoch when the source resets its accumulators (/clear etc.). */
  counterEpoch?: number;
  /** Cumulative native counters at checkpoint time. */
  cumulative?: CodexTokenUsageCounters | null;
  capturedAt: number;
}

/**
 * Native Codex app-server counters (`thread/tokenUsage/updated` total).
 * OpenAI convention: `cachedInputTokens` ⊆ `inputTokens`.
 */
export interface CodexTokenUsageCounters {
  totalTokens: number;
  inputTokens: number;
  cachedInputTokens: number;
  cacheWriteInputTokens: number;
  outputTokens: number;
  reasoningOutputTokens: number;
}

/** Plugin → host cumulative usage event. */
export interface ProviderUsageUpdatedEvent {
  type: 'provider_usage_updated';
  snapshot: RuntimeUsageSnapshot;
}
