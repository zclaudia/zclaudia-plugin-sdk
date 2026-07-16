/** Thinking effort understood by ZClaudia agent profiles. */
export type ThinkingLevel = 'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh';

/** Normalized side effect produced by a provider tool call. */
export interface FileChangeEffectFile {
  path: string;
  changeKind?: 'add' | 'modify' | 'delete' | 'rename' | 'unknown';
  summary?: string;
}

export type ToolEffect =
  | { kind: 'file_change'; files: FileChangeEffectFile[] }
  | { kind: 'shell'; command: string };

/** Provider-declared meaning of a tool call, independent of provider-specific names. */
export type ToolSemantic = 'plan_proposal' | 'plan_enter' | 'plan_exit';

export type ContextWindowSource =
  | 'profile_entry'
  | 'pi_ai_registry'
  | 'openai_compat_default'
  | 'fallback';

export interface ProviderUsageCost {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  total: number;
}

/** Provider-neutral token usage. This deliberately does not depend on a model SDK. */
export interface ProviderUsage {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  totalTokens: number;
  cost: ProviderUsageCost;
}

export type ModelConfigKind = 'llm-profile' | 'native' | 'none';
export type RuntimeCapabilityMode = 'profile' | 'external' | 'native-readonly' | 'unsupported';
export type ThinkingLevelMode = 'off' | 'auto' | 'selectable';

export type BuiltinToolSetId = 'read-only' | 'coding' | 'web' | 'full';
export type ToolSetRef =
  | { source: 'builtin'; id: BuiltinToolSetId }
  | { source: 'plugin'; pluginId: string; id: string };

export type ToolRef =
  | { source: 'builtin'; id: string }
  | { source: 'plugin'; pluginId: string; id: string }
  | { source: 'mcp'; serverId: string; id: string }
  | { source: 'mcp-resource'; serverId: string; id: string }
  | { source: 'mcp-prompt'; serverId: string; id: string }
  | { source: 'interaction'; id: string };

export type ExternalToolProviderRef =
  | { source: 'mcp'; serverId: string }
  | { source: 'plugin'; pluginId: string; providerId?: string };

export interface ToolSelection {
  sets: ToolSetRef[];
  providers?: ExternalToolProviderRef[];
  include: ToolRef[];
  exclude: ToolRef[];
}

export type SkillSource = 'workspace' | 'external' | 'plugin';
export interface SkillRef {
  source: SkillSource;
  id: string;
}

export type SkillSourceRef =
  | { source: 'workspace' }
  | { source: 'external' }
  | { source: 'plugin'; pluginId?: string };

export interface SkillSelection {
  providers?: SkillSourceRef[];
  include?: SkillRef[];
  exclude?: SkillRef[];
  pinned?: SkillRef[];
}

export type SkillExecutionMode = 'inline' | 'fork';
export type SkillForkToolPolicy = 'read-only' | 'web' | 'workspace-edit' | 'agent-default';

export interface SkillExecutionOverride {
  ref: SkillRef;
  allowedModes?: SkillExecutionMode[];
  defaultMode?: SkillExecutionMode;
  forkToolPolicy?: SkillForkToolPolicy;
}

export interface SkillExecutionSelection {
  overrides?: SkillExecutionOverride[];
}
