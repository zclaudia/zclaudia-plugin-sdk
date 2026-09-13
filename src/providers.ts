import type { PermissionCallback } from './interactions.js';
import type {
  ContextWindowSource,
  ProviderUsage,
  RuntimeCapabilityMode,
  ThinkingLevel,
  ThinkingLevelMode,
  ModelConfigKind,
  ToolEffect,
  ToolSemantic,
} from './types.js';

// Kept on the providers entrypoint because adapters commonly import their
// callback contract alongside ExternalAgentAdapter.
export type { PermissionCallback, PermissionDecision, PermissionRequest } from './interactions.js';

export type PCPCapabilityId =
  | 'chat.generate'
  | 'chat.stream'
  | 'tool.call'
  | 'tool.inject'
  | 'interaction.form'
  | 'interaction.approval'
  | 'interaction.todo'
  | 'input.image'
  | 'input.text_file'
  | 'input.binary_file'
  | 'permission.mode'
  | 'session.abort'
  | 'session.steer'
  | 'session.background_task'
  // URIP (unified runtime invocation protocol) — additive capabilities.
  | 'invocation.catalog'
  | 'invocation.execute'
  | 'invocation.refresh'
  | 'invocation.structured-input'
  | 'skill.portable';

export type CapabilityMode = 'native' | 'bridged' | 'emulated';
export type ReliabilityTier = 'strict' | 'best_effort' | 'display_only';
export type DegradationPolicy =
  | 'reject'
  | 'fallback_to_text'
  | 'fallback_to_notice'
  | 'server_emulation';
export type PCPPermissionMode = 'supervised' | 'auto_edit' | 'autonomous' | 'plan_only';
export type ProviderRuntimeKind = 'cli' | 'sdk' | 'http' | 'bridge';

export interface PCPCapabilityDescriptor {
  id: PCPCapabilityId;
  supported: boolean;
  mode?: CapabilityMode;
  reliability?: ReliabilityTier;
  degradation?: DegradationPolicy;
  limits?: Record<string, string | number | boolean>;
  notes?: string;
}

export interface PCPProviderManifest {
  id: string;
  name: string;
  version: string;
  apiVersion: 'pcp/v1';
  providerType: string;
  runtime: ProviderRuntimeKind;
  capabilities: PCPCapabilityDescriptor[];
  permissionModeMap?: Partial<Record<PCPPermissionMode, string>>;
}

export interface ProviderAuthErrorHint {
  matchAny: Array<string | string[]>;
  message: string;
}

export interface ProviderPolicy {
  nativeInteractionTools?: string[];
  emptyResultFallback?: string;
  sessionCwdPolicy?: 'pinned' | 'requested';
  modeSwitchSessionPolicy?: 'reset' | 'preserve';
  authErrorHint?: ProviderAuthErrorHint;
  escalateAlwaysTools?: string[];
}

// ── Engine modes (dual-mode runtimes: CLI vs app-managed SDK engine) ─────────

/** Wire protocol a runtime SDK mode accepts for its model connection. */
export type RuntimeModelProtocol = 'anthropic-messages' | 'openai-responses';

/** How an engine mode obtains its model. */
export type EngineModeConnection =
  | { kind: 'external'; modelSelection: 'hidden' | 'optional' }
  | { kind: 'llm-profile'; acceptedModelProtocols: RuntimeModelProtocol[] };

/** Where the executable for an engine mode comes from. */
export type EngineModeExecutable = 'external-cli' | 'bundled-sdk' | 'bundled-engine';

/**
 * One supported engine mode of a runtime. `connection` and `executable` are the
 * canonical declarations; legacy UI fields (`model.kind`, `capabilities.providers`,
 * `hasCliPath`) are derived from them by the host and must not be repeated here.
 */
export interface EngineModeDescriptor {
  id: string;
  label: string;
  connection: EngineModeConnection;
  executable: EngineModeExecutable;
  /** Source-independent model options (everything except the derived `kind`). */
  modelOptions: {
    multimodalFallback: boolean;
    thinkingLevel: ThinkingLevelMode;
  };
  /** tools/skills capabilities; `providers` is derived from `connection`. */
  capabilities: {
    tools: RuntimeCapabilityMode;
    skills: RuntimeCapabilityMode;
  };
  authNote?: string;
}

/**
 * Per-run engine execution identity passed from host to adapter. `engineMode`
  * is the runtime's engine mode (e.g. 'cli' | 'sdk') — distinct from the
 * permission `mode` also present on the run context.
 */
export interface EngineExecutionContext {
  engineMode: string;
  executableSource: 'explicit' | 'system' | 'managed-cli' | 'bundled-sdk' | 'bundled-engine';
  /** Session-scoped configuration/state directory managed by the host (SDK modes). */
  configDirectory?: string;
}

/**
 * Explicit model connection resolved by the host from a bound LLM profile.
 * The API key is for this run's in-memory use only; hosts must never persist
 * or log it, and adapters must not forward it into traces or tool inputs.
 */
export type RuntimeModelConnection =
  | {
      protocol: 'anthropic-messages';
      baseUrl: string;
      apiKey: string;
      requestHeaders?: Record<string, string>;
    }
  | {
      protocol: 'openai-responses';
      baseUrl: string;
      apiKey: string;
      requestHeaders?: Record<string, string>;
    };

/** Canonical runtime error codes shared between host and plugins. */
export const RUNTIME_ERROR_CODES = [
  'ENGINE_MODE_UNSUPPORTED',
  'LLM_PROFILE_REQUIRED',
  'LLM_PROFILE_NOT_FOUND',
  'LLM_PROTOCOL_UNSUPPORTED',
  'LLM_AUTH_UNSUPPORTED',
  'LLM_PROFILE_FIELD_UNSUPPORTED',
  'LLM_OPTION_UNSUPPORTED',
  'FIELD_NOT_APPLICABLE',
  'SDK_ENGINE_UNAVAILABLE',
  'BUNDLED_ENGINE_UNAVAILABLE',
  'RUNTIME_CONFIGURATION_CONFLICT',
  'RUNTIME_PROTOCOL_UNSUPPORTED',
  'RUNTIME_BINDING_KEY_UNAVAILABLE',
  'SESSION_CONNECTION_CHANGED',
  'SESSION_WORKSPACE_CHANGED',
  'SESSION_RESUME_UNAVAILABLE',
  'SESSION_RUNTIME_BUSY',
  'RUNTIME_START_TIMEOUT',
] as const;

export type RuntimeErrorCode = (typeof RUNTIME_ERROR_CODES)[number];

/** Structured error carrying one of the canonical runtime error codes. */
export class RuntimeContractError extends Error {
  readonly code: RuntimeErrorCode;
  readonly details?: Record<string, string>;

  constructor(code: RuntimeErrorCode, message: string, details?: Record<string, string>) {
    super(message);
    this.name = 'RuntimeContractError';
    this.code = code;
    this.details = details;
  }
}

const ENGINE_MODE_EXECUTABLES: EngineModeExecutable[] = [
  'external-cli',
  'bundled-sdk',
  'bundled-engine',
];
const ENGINE_MODE_MODEL_SELECTIONS = ['hidden', 'optional'] as const;
const RUNTIME_CAPABILITY_MODES = ['profile', 'external', 'native-readonly', 'unsupported'];
const THINKING_LEVEL_MODES = ['off', 'auto', 'selectable'];

/**
 * Structural validation for `engineModes` / `defaultEngineMode` declarations in
 * a runtime contribution. Returns human-readable error strings; an empty array
 * means the declaration is well-formed (or absent).
 */
export function validateEngineModeDeclarations(descriptor: unknown): string[] {
  if (!isDescriptorRecord(descriptor)) return [];
  const { engineModes, defaultEngineMode } = descriptor;
  if (engineModes === undefined && defaultEngineMode === undefined) return [];
  const errors: string[] = [];
  if (!Array.isArray(engineModes) || engineModes.length === 0) {
    return ['engineModes must be a non-empty array when declared'];
  }
  const seen = new Set<string>();
  engineModes.forEach((mode, index) => {
    const label = `engineModes[${index}]`;
    if (!isRecord(mode)) {
      errors.push(`${label} must be an object`);
      return;
    }
    if (typeof mode.id !== 'string' || !mode.id.trim()) errors.push(`${label} missing "id"`);
    else {
      if (seen.has(mode.id)) errors.push(`${label} duplicates id "${mode.id}"`);
      seen.add(mode.id);
    }
    if (typeof mode.label !== 'string' || !mode.label.trim()) {
      errors.push(`${label} missing "label"`);
    }
    const connection = mode.connection as Record<string, unknown> | undefined;
    if (!isRecord(connection)) {
      errors.push(`${label} missing "connection"`);
    } else if (connection.kind === 'external') {
      if (!ENGINE_MODE_MODEL_SELECTIONS.includes(connection.modelSelection as never)) {
        errors.push(`${label}.connection.modelSelection must be "hidden" or "optional"`);
      }
    } else if (connection.kind === 'llm-profile') {
      if (
        !Array.isArray(connection.acceptedModelProtocols) ||
        connection.acceptedModelProtocols.length === 0 ||
        !connection.acceptedModelProtocols.every(
          protocol =>
            typeof protocol === 'string' &&
            ['anthropic-messages', 'openai-responses'].includes(protocol)
        )
      ) {
        errors.push(
          `${label}.connection.acceptedModelProtocols must be a non-empty array of supported protocols`
        );
      }
    } else {
      errors.push(`${label}.connection.kind must be "external" or "llm-profile"`);
    }
    if (!ENGINE_MODE_EXECUTABLES.includes(mode.executable as never)) {
      errors.push(`${label}.executable must be one of ${ENGINE_MODE_EXECUTABLES.join('|')}`);
    }
    const modelOptions = mode.modelOptions as Record<string, unknown> | undefined;
    if (
      !isRecord(modelOptions) ||
      typeof modelOptions.multimodalFallback !== 'boolean' ||
      !THINKING_LEVEL_MODES.includes(modelOptions.thinkingLevel as never)
    ) {
      errors.push(`${label}.modelOptions must declare multimodalFallback and thinkingLevel`);
    }
    const capabilities = mode.capabilities as Record<string, unknown> | undefined;
    if (
      !isRecord(capabilities) ||
      !RUNTIME_CAPABILITY_MODES.includes(capabilities.tools as never) ||
      !RUNTIME_CAPABILITY_MODES.includes(capabilities.skills as never)
    ) {
      errors.push(`${label}.capabilities must declare tools and skills capability modes`);
    }
    for (const banned of ['model', 'hasCliPath', 'type']) {
      if (banned in mode) {
        errors.push(
          `${label} must not declare "${banned}"; UI fields are derived from connection/executable`
        );
      }
    }
  });
  if (defaultEngineMode !== undefined) {
    if (typeof defaultEngineMode !== 'string' || !defaultEngineMode.trim()) {
      errors.push('defaultEngineMode must be a non-empty string when declared');
    } else if (!seen.has(defaultEngineMode)) {
      errors.push(`defaultEngineMode "${defaultEngineMode}" is not declared in engineModes`);
    }
  }
  return errors;
}

function isDescriptorRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return isDescriptorRecord(value);
}

/** Static, JSON-serializable runtime metadata declared in plugin.json. */
export interface AgentRuntimeDescriptor {
  type: string;
  label: string;
  model: {
    kind: ModelConfigKind;
    multimodalFallback: boolean;
    thinkingLevel: ThinkingLevelMode;
  };
  hasCliPath: boolean;
  capabilities: {
    tools: RuntimeCapabilityMode;
    providers: RuntimeCapabilityMode;
    skills: RuntimeCapabilityMode;
  };
  authNote?: string;
  /**
   * Engine modes declared by the runtime. When present, the default mode's
   * projection is the single source of truth for the legacy top-level fields
   * above; runtimes without `engineModes` keep using the top-level fields.
   */
  defaultEngineMode?: string;
  engineModes?: EngineModeDescriptor[];
  manifest: PCPProviderManifest;
  policy?: ProviderPolicy;
}

export type AgentRuntimeContribution = AgentRuntimeDescriptor;

export interface ModeTransition {
  mode: string;
  reason: 'enter' | 'exit';
  plan?: string;
  sourceToolUseId?: string;
}

export type ToolInteractionKind = 'todo_update';

export interface SystemInfo {
  model?: string;
  /**
   * Provider-native model identifier that produced `model`, when the provider
   * separates a parameterized wire id from a display name (e.g. Cursor ACP's
   * `claude-opus-5[thinking=true,...]` vs `claude-opus-5`). Diagnostics only;
   * UI should keep showing `model`.
   */
  modelId?: string;
  contextWindow?: number;
  contextWindowSource?: ContextWindowSource;
  contextWindowMatchedProvider?: string;
  claudeCodeVersion?: string;
  cwd?: string;
  tools?: string[];
  mcpServers?: { name: string; status: string }[];
  permissionMode?: string;
  apiKeySource?: string;
  slashCommands?: string[];
  agents?: string[];
}

export const PROVIDER_RUNTIME_EVENT_TYPES = [
  'init',
  'assistant_delta',
  'tool_started',
  'tool_finished',
  'provider_turn_finished',
  'provider_error',
  'task_notification',
  'tool_activity',
  'mode_transition',
  'thinking_delta',
  'retry_scheduled',
] as const;

export type ProviderRuntimeEventType = (typeof PROVIDER_RUNTIME_EVENT_TYPES)[number];
export type LegacyProviderRuntimeEventType =
  | 'assistant'
  | 'result'
  | 'tool_use'
  | 'tool_result'
  | 'error';

export interface ProviderRuntimeEvent {
  type: ProviderRuntimeEventType | LegacyProviderRuntimeEventType;
  retryInfo?: { attempt: number; maxAttempts: number; delayMs: number; status?: number };
  sessionId?: string;
  /**
   * Transport a provider session is bound to (e.g. `cursor-acp-v1` vs
   * `cursor-stream-json-v1`). Emitted on `init` before the first prompt so the
   * host can persist it atomically with the provider session id; resumes must
   * honor the persisted binding instead of guessing.
   */
  providerTransport?: string;
  content?: string;
  systemInfo?: SystemInfo;
  toolUseId?: string;
  toolName?: string;
  toolInput?: unknown;
  toolEffect?: ToolEffect;
  toolInteractionKind?: ToolInteractionKind;
  toolSemantic?: ToolSemantic;
  toolResult?: unknown;
  isToolError?: boolean;
  error?: string;
  errorCode?: string;
  usage?: ProviderUsage;
  isComplete?: boolean;
  taskId?: string;
  taskStatus?: string;
  taskMessage?: string;
  taskToolUseId?: string;
  modeTransition?: ModeTransition;
  thinkingContent?: string;
  thinkingSignature?: string;
  thinkingRedacted?: boolean;
}

export interface ProviderAssistantDeltaEvent extends ProviderRuntimeEvent {
  type: 'assistant_delta' | 'assistant';
  content: string;
}

export interface ProviderToolStartedEvent extends ProviderRuntimeEvent {
  type: 'tool_started' | 'tool_use';
}

export interface ProviderTurnFinishedEvent extends ProviderRuntimeEvent {
  type: 'provider_turn_finished' | 'result';
}

export interface ProviderToolBridgeEntry {
  name: string;
  /** Config shape is owned by the external agent SDK. */
  config: unknown;
}

export interface ProviderToolBridgeRequest {
  serverPort?: number;
  sessionId?: string;
}

export interface ExternalAgentRunContext {
  cwd: string;
  sessionId?: string;
  /**
   * Persisted transport of the provider session being resumed (see
   * `ProviderRuntimeEvent.providerTransport`). Null/undefined for new sessions
   * or runtimes without transport binding. Resumes must honor it; the choice
   * for unbound sessions belongs to the adapter's release policy.
   */
  providerTransport?: string | null;
  env?: Record<string, string>;
  mode?: string;
  systemPrompt?: string;
  sessionTitle?: string;
  serverPort?: number;
  claudiaSessionId?: string;
  thinkingLevel?: ThinkingLevel;
  model?: string;
  cliPath?: string;
  abortController?: AbortController;
  /** Engine-mode execution identity (absent on legacy hosts; SDK modes must fail without it). */
  engineExecution?: EngineExecutionContext;
  /** Explicit model connection for the selected engine mode's SDK mode. */
  modelConnection?: RuntimeModelConnection;
}

export interface ExternalAgentRunState {
  providerSessionId?: string;
  providerCwd: string;
}

/**
 * How an invocation executes. `host` is reserved for host actions; adapters use
 * the remaining four (URIP design doc §8.1).
 */
export type InvocationExecutionMode =
  | 'host'
  | 'native-text'
  | 'native-structured'
  | 'bridged'
  | 'emulated';

/**
 * Compatibility adapter surface during the URIP migration (design doc §9.2):
 * `run(string)` keeps existing adapters working, `startTurn` opts into typed
 * turn input, and `invocations` publishes a runtime catalog. Hosts require at
 * least one of `run`/`startTurn`.
 */
export interface ExternalAgentAdapterCompat extends Omit<ExternalAgentAdapter, 'run'> {
  run?(
    input: string,
    context: ExternalAgentRunContext,
    onPermission: PermissionCallback
  ): AsyncGenerator<ProviderRuntimeEvent, void, void>;
  startTurn?(
    input: unknown,
    context: ExternalAgentRunContext,
    onPermission: PermissionCallback
  ): AsyncGenerator<ProviderRuntimeEvent, void, void>;
  invocations?: unknown;
}

/** True when an adapter object implements the minimum runnable surface. */
export function adapterIsRunnable(adapter: unknown): boolean {
  return (
    typeof adapter === 'object' &&
    adapter !== null &&
    (('run' in adapter && typeof (adapter as { run?: unknown }).run === 'function') ||
      ('startTurn' in adapter && typeof (adapter as { startTurn?: unknown }).startTurn === 'function'))
  );
}

export interface ExternalAgentAdapter {
  readonly type: string;
  run(
    input: string,
    context: ExternalAgentRunContext,
    onPermission: PermissionCallback
  ): AsyncGenerator<ProviderRuntimeEvent, void, void>;
  abort?(sessionId: string, cwd: string): Promise<void>;
  getRunState?(context: ExternalAgentRunContext): ExternalAgentRunState;
  setSessionMode?(sessionId: string, mode: string): void;
}
