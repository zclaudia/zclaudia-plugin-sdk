import type { PermissionCallback } from './interactions.js';
import type {
  ExternalAgentRunContext,
  ExternalAgentAdapter,
  InvocationExecutionMode,
} from './providers.js';

/**
 * Unified Runtime Invocation Protocol (URIP) — public contracts
 * (design: docs/specs/2026-09-12-unified-runtime-invocation-protocol-design.md).
 *
 * The internal abstraction is the invocable, not the slash command. Canonical
 * IDs cross the client boundary; native locators and skill content stay inside
 * the host/plugin process; raw unqualified slash text belongs to the active
 * runtime; emulation is always labeled best-effort. The normative text lives in
 * the design doc — this file is the type-level source of truth.
 */

// ── Descriptor ───────────────────────────────────────────────────────────────

export type StandardInvocableKind =
  | 'host.action'
  | 'runtime.command'
  | 'runtime.skill'
  | 'prompt.template'
  | 'portable.skill';

/** Forward-compatible plugin-defined kinds use an x- namespace. */
export type InvocableKind = StandardInvocableKind | `x-${string}`;

export type InvocableScope = 'session' | 'project' | 'user' | 'system';
export type InvocableOwner = 'host' | 'runtime' | 'plugin' | 'user' | 'project';

/** Re-exported for adapter convenience; normative definition in providers.ts. */
export type { InvocationExecutionMode };

export type InvocationArgumentKind = 'raw' | 'structured';

export interface InvocationArgumentContract {
  /** Non-empty, unique values. The server rejects every other representation. */
  accepted: InvocationArgumentKind[];
  /** Must be one of `accepted`; used by generated composer UI only. */
  preferred: InvocationArgumentKind;
  /** Required when `structured` is accepted; JSON Schema draft 2020-12. */
  schema?: Record<string, unknown>;
  /** Server-owned policy with one key for each accepted representation. */
  transcript: {
    raw?: 'verbatim' | 'omit-arguments';
    structured?: 'schema-redacted' | 'omit-arguments';
  };
}

export interface InvocableDescriptor {
  /** Opaque to clients. Never derive execution behavior from this value. */
  id: string;
  kind: InvocableKind;
  /** Execution target for this session; `host` only for host actions. */
  runtimeType: string | 'host';
  name: string;
  label: string;
  description?: string;

  /** Composer-facing syntax. It is not a globally unique key. */
  displayTrigger: string;
  aliases?: string[];
  argumentHint?: string;

  origin: {
    owner: InvocableOwner;
    scope: InvocableScope;
    displayName?: string;
  };

  execution: {
    mode: InvocationExecutionMode;
    fidelity: 'exact' | 'best-effort';
    arguments: InvocationArgumentContract;
  };

  availability: { available: true } | { available: false; reason: string; code?: string };
}

// ── Adapter discovery results (server/plugin-private) ────────────────────────

export interface RuntimeInvocableRecord {
  /** Descriptor fields before the host assigns its canonical public ID. */
  descriptor: Omit<InvocableDescriptor, 'id'>;
  /** Stable within this adapter/runtime and opaque to the host. */
  providerLocalKey: string;
  /** Returned only to this adapter when the item is invoked. */
  nativeLocator: unknown;
  contentDigest?: string;
  trustedRoot?: string;
}

export interface InvocableDiagnostic {
  severity: 'info' | 'warning' | 'error';
  code: string;
  message: string;
  runtimeType?: string;
  invocableId?: string;
}

export interface RuntimeInvocableCatalog {
  items: RuntimeInvocableRecord[];
  diagnostics: InvocableDiagnostic[];
  phase: CatalogPhase;
  completeness: 'partial' | 'complete';
  runtimeRevision?: string;
  /** Changes whenever runtime initialization creates a new live catalog epoch. */
  runtimeSessionEpoch?: string;
}

export type CatalogPhase = 'bootstrap' | 'initializing' | 'live' | 'degraded';

export type RuntimeCatalogDelta =
  | { type: 'invalidate'; reason: string }
  | { type: 'replace'; catalog: RuntimeInvocableCatalog };

// ── Client-facing snapshot ───────────────────────────────────────────────────

export interface InvocableCatalogSnapshot {
  protocolVersion: 1;
  revision: string;
  generatedAt: number;
  contextFingerprint: string;
  phase: CatalogPhase;
  completeness: 'partial' | 'complete';
  invocables: InvocableDescriptor[];
  diagnostics: InvocableDiagnostic[];
}

// ── Invocation request / arguments ───────────────────────────────────────────

export type InvocationArguments =
  | { type: 'raw'; value: string }
  | { type: 'structured'; value: Record<string, unknown> };

export interface InvocationRequest {
  invocableId: string;
  catalogRevision: string;
  contextFingerprint: string;
  /** Exactly one representation; validated against the descriptor contract. */
  arguments: InvocationArguments;
}

// ── Unified turn input ───────────────────────────────────────────────────────

/**
 * Host attachment contract. URIP deliberately reuses the existing host format
 * instead of defining a second one; hosts with richer attachments may narrow
 * this type.
 */
export interface RuntimeAttachment {
  name: string;
  mimeType: string;
  /** Size in bytes when known. */
  size?: number;
  [key: string]: unknown;
}

export interface PortableSkillResourceEntry {
  relativePath: string;
  size: number;
  contentDigest: string;
  mediaType?: string;
}

export type PortableSkillResourceAccess =
  | {
      type: 'host-read-handle';
      handleId: string;
      entries: PortableSkillResourceEntry[];
    }
  | {
      type: 'read-only-mount';
      rootPath: string;
      entries: PortableSkillResourceEntry[];
    };

export interface MaterializedPortableSkill {
  id: string;
  name: string;
  description: string;
  body: string;
  metadata: Record<string, unknown>;
  resources?: PortableSkillResourceAccess;
  contentDigest: string;
}

export type RuntimeTurnInput =
  | {
      type: 'message';
      text: string;
      attachments?: RuntimeAttachment[];
    }
  | {
      type: 'runtime-invocation';
      descriptor: InvocableDescriptor;
      nativeLocator: unknown;
      arguments: InvocationArguments;
      attachments?: RuntimeAttachment[];
    }
  | {
      type: 'portable-skill';
      skill: MaterializedPortableSkill;
      assessment: PortableSkillAssessment;
      arguments: InvocationArguments;
      attachments?: RuntimeAttachment[];
    };

// ── Adapter contract ─────────────────────────────────────────────────────────

export interface RuntimeDiscoveryContext {
  readonly runtimeType: string;
  readonly engineMode: string;
  readonly runtimeVersion?: string;
  readonly adapterVersion: string;
  readonly canonicalCwd: string;
  readonly canonicalRepositoryRoot?: string;
  readonly configurationRoots: readonly string[];
  readonly settingsSourcePolicy: readonly string[];
  readonly configurationRootFingerprint: string;
  readonly session?: {
    readonly id: string;
    readonly phase: CatalogPhase;
    readonly runtimeSessionEpoch?: string;
    /** Opaque, non-secret value that changes when catalog-relevant state changes. */
    readonly catalogStateToken?: string;
  };
  readonly cliPath?: string;
}

export interface RuntimeInvocationCapabilities {
  catalog: 'none' | 'static' | 'filesystem' | 'runtime' | 'hybrid';
  executionModes: InvocationExecutionMode[];
  refresh: 'manual' | 'watch' | 'runtime-events';
  discoveryScope: 'shared-context' | 'session';
  catalogLifecycle: 'bootstrap-only' | 'bootstrap-then-live' | 'live-only';
  unknownTextPassthrough: boolean;
  /** Runtime-wide maximum only; every portable skill is assessed separately. */
  portableSkills: 'native' | 'context' | 'emulated' | 'unsupported';
}

export interface PortableSkillCandidate {
  id: string;
  name: string;
  description: string;
  metadata: Record<string, unknown>;
  requirements?: Record<string, unknown>;
  resourceManifest: PortableSkillResourceEntry[];
  contentDigest: string;
}

export type PortableSkillAssessment =
  | {
      supported: true;
      mode: 'native' | 'context' | 'emulated';
      executionMode: Exclude<InvocationExecutionMode, 'host'>;
      fidelity: 'exact' | 'best-effort';
      resourceAccess: 'none' | 'host-read-handle' | 'read-only-mount';
    }
  | {
      supported: false;
      mode: 'unsupported';
      code: string;
      reason: string;
    };

export interface PortableSkillResourceReader {
  /** Validates handle ownership, manifest membership, traversal, size, expiry. */
  read(handleId: string, relativePath: string, signal: AbortSignal): Promise<Uint8Array>;
}

export interface RuntimeTurnContext extends ExternalAgentRunContext {
  services: {
    /** The only way to dereference a `host-read-handle`. */
    portableSkillResources: PortableSkillResourceReader;
  };
}

export interface RuntimeInvocationProvider {
  capabilities(context: RuntimeDiscoveryContext): Promise<RuntimeInvocationCapabilities>;

  discover(context: RuntimeDiscoveryContext, signal: AbortSignal): Promise<RuntimeInvocableCatalog>;

  watch?(context: RuntimeDiscoveryContext, signal: AbortSignal): AsyncIterable<RuntimeCatalogDelta>;

  /** Required whenever `portableSkills` is not `unsupported`. */
  assessPortableSkill?(
    skill: PortableSkillCandidate,
    context: RuntimeDiscoveryContext,
    signal: AbortSignal
  ): Promise<PortableSkillAssessment>;
}

/**
 * Long-term adapter interface. `startTurn` receives the complete typed turn
 * input; the existing cancellation/approval/persistence/terminal machinery is
 * shared unchanged.
 */
export interface ExternalAgentAdapterV2 extends Omit<ExternalAgentAdapter, 'run'> {
  readonly invocations?: RuntimeInvocationProvider;
  startTurn(
    input: RuntimeTurnInput,
    context: RuntimeTurnContext,
    onPermission: PermissionCallback
  ): AsyncGenerator<import('./providers.js').ProviderRuntimeEvent, void, void>;
}

// ── Error codes ──────────────────────────────────────────────────────────────

export const INVOCATION_ERROR_CODES = [
  'INVOCATION_NOT_FOUND',
  'INVOCATION_CATALOG_STALE',
  'INVOCATION_CONTEXT_CHANGED',
  'INVOCATION_UNAVAILABLE',
  'INVOCATION_UNSUPPORTED',
  'INVOCATION_ARGUMENTS_INVALID',
  'INVOCATION_PROTOCOL_MISMATCH',
  'INVOCATION_DISCOVERY_FAILED',
  'INVOCATION_PREPARE_FAILED',
  'INVOCATION_PROVIDER_REJECTED',
  'PORTABLE_SKILL_UNSUPPORTED',
  'PORTABLE_SKILL_RESOURCE_UNAVAILABLE',
  'PORTABLE_SKILL_CHANGED',
] as const;

export type InvocationErrorCode = (typeof INVOCATION_ERROR_CODES)[number];

/** Typed error carrying a stable invocation error code. */
export class InvocationError extends Error {
  readonly code: InvocationErrorCode;

  constructor(code: InvocationErrorCode, message: string) {
    super(message);
    this.name = 'InvocationError';
    this.code = code;
  }
}

// ── Registration validation ──────────────────────────────────────────────────

const INVOCATION_EXECUTION_MODES: InvocationExecutionMode[] = [
  'host',
  'native-text',
  'native-structured',
  'bridged',
  'emulated',
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Validate the relationship between a provider's declared invocation
 * capabilities and its implemented methods (design doc §9). Returns
 * human-readable error strings; an empty array means the declaration is
 * consistent.
 */
export function validateInvocationRegistration(provider: unknown): string[] {
  if (!isRecord(provider)) return ['invocations must be an object when declared'];
  const errors: string[] = [];
  if (typeof provider.capabilities !== 'function') {
    errors.push('invocations.capabilities must be a function');
  }
  if (typeof provider.discover !== 'function') {
    errors.push('invocations.discover must be a function');
  }
  if (provider.watch !== undefined && typeof provider.watch !== 'function') {
    errors.push('invocations.watch must be a function when declared');
  }
  return errors;
}

/**
 * Validate per-skill assessment consistency with the runtime-wide maximum and
 * the mode invariants (§9: native → native-*; context → bridged; emulated →
 * emulated/best-effort).
 */
export function validatePortableSkillAssessment(
  assessment: PortableSkillAssessment,
  runtimeMaximum: RuntimeInvocationCapabilities['portableSkills']
): string[] {
  if (!assessment.supported) {
    return runtimeMaximum === 'unsupported'
      ? []
      : [];
  }
  const errors: string[] = [];
  if (runtimeMaximum === 'unsupported') {
    errors.push('assessment claims support while the runtime declares portableSkills unsupported');
    return errors;
  }
  if (runtimeMaximum === 'emulated' && assessment.mode === 'native') {
    errors.push('assessment claims native above the runtime-wide emulated maximum');
  }
  if (assessment.mode === 'native' && assessment.executionMode !== 'native-text' && assessment.executionMode !== 'native-structured') {
    errors.push('native assessment requires native-text or native-structured execution mode');
  }
  if (assessment.mode === 'context' && assessment.executionMode !== 'bridged') {
    errors.push('context assessment requires bridged execution mode');
  }
  if (assessment.mode === 'emulated' && (assessment.executionMode !== 'emulated' || assessment.fidelity !== 'best-effort')) {
    errors.push('emulated assessment requires emulated execution mode and best-effort fidelity');
  }
  return errors;
}

/** Argument-contract invariants enforced at descriptor creation (§8.1). */
export function validateInvocationArgumentContract(contract: unknown): string[] {
  if (!isRecord(contract)) return ['argument contract must be an object'];
  const errors: string[] = [];
  const accepted = contract.accepted;
  if (
    !Array.isArray(accepted) ||
    accepted.length === 0 ||
    !accepted.every(kind => kind === 'raw' || kind === 'structured') ||
    new Set(accepted).size !== accepted.length
  ) {
    errors.push('accepted must be a non-empty array of unique raw/structured kinds');
    return errors;
  }
  const preferred = contract.preferred;
  if (preferred !== 'raw' && preferred !== 'structured') {
    errors.push('preferred must be raw or structured');
  } else if (!accepted.includes(preferred)) {
    errors.push('preferred must be a member of accepted');
  }
  const transcript = contract.transcript;
  if (!isRecord(transcript)) {
    errors.push('transcript policy must be an object');
  } else {
    const keys = Object.keys(transcript).sort();
    const expected = [...accepted].sort();
    if (keys.join(',') !== expected.join(',')) {
      errors.push('transcript policy must contain exactly the accepted representation keys');
    }
    for (const key of accepted) {
      const value = transcript[key as keyof typeof transcript];
      if (key === 'raw' && value !== undefined && value !== 'verbatim' && value !== 'omit-arguments') {
        errors.push('transcript.raw must be verbatim or omit-arguments');
      }
      if (key === 'structured' && value !== undefined && value !== 'schema-redacted' && value !== 'omit-arguments') {
        errors.push('transcript.structured must be schema-redacted or omit-arguments');
      }
    }
  }
  const schema = contract.schema;
  if (accepted.includes('structured')) {
    if (!isRecord(schema)) errors.push('schema is required when structured arguments are accepted');
  } else if (schema !== undefined) {
    errors.push('schema is only allowed when structured arguments are accepted');
  }
  return errors;
}

/** Valid execution modes for each adapter-facing mode value. */
export function isInvocationExecutionMode(value: unknown): value is InvocationExecutionMode {
  return INVOCATION_EXECUTION_MODES.includes(value as InvocationExecutionMode);
}
