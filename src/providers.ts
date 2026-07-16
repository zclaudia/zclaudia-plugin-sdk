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
  | 'session.background_task';

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
}

export interface ExternalAgentRunState {
  providerSessionId?: string;
  providerCwd: string;
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
