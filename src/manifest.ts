import type { AgentRuntimeContribution } from './providers.js';
import type {
  SkillExecutionSelection,
  SkillSelection,
  ThinkingLevel,
  ToolSelection,
} from './types.js';

export type Permission =
  | 'session.read'
  | 'project.read'
  | 'storage'
  | 'fs.read'
  | 'network.fetch'
  | 'timer'
  | 'provider.call'
  | 'fs.write'
  | 'session.write'
  | 'notification'
  | 'clipboard.read'
  | 'clipboard.write'
  | 'shell.execute'
  | 'provider.register';

export interface CommandContribution {
  command: string;
  title: string;
  category?: string;
  icon?: string;
}

export interface ToolContribution {
  id: string;
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  scope?: Array<'agent-assistant' | 'main-session' | 'command-palette'>;
  permissions?: Permission[];
}

export interface SettingsContribution {
  id: string;
  label: string;
  icon?: string;
  schema?: Record<string, unknown>;
  defaults?: Record<string, unknown>;
}

export interface PanelContribution {
  id: string;
  label: string;
  location: 'bottom' | 'sidebar' | 'right';
  icon?: string;
  size?: number;
  frontend?: string;
  order?: number;
}

export interface HookContribution {
  event: string;
  handler: string;
  priority?: number;
}

export interface MenuContribution {
  id: string;
  location: 'context-menu' | 'toolbar' | 'status-bar';
  label: string;
  command?: string;
  icon?: string;
  when?: string;
}

export interface KeybindingContribution {
  command: string;
  key: string;
  when?: string;
}

export interface UIExtensionPoint {
  id: string;
  location: 'sidebar' | 'panel' | 'toolbar' | 'context-menu' | 'status-bar';
  component?: string;
  when?: string;
}

export interface WorkflowStepContribution {
  id: string;
  name: string;
  description: string;
  category?: string;
  icon?: string;
  configSchema?: Record<string, unknown>;
}

export interface TriggerSourceContribution {
  id: string;
  name: string;
  description: string;
  eventPattern: string;
  category?: string;
  icon?: string;
}

export interface NotchTabContribution {
  id: string;
  label: string;
  icon?: string;
  order?: number;
}

export interface SkillContribution {
  path: string;
}

export interface AgentProfileContribution {
  id: string;
  name: string;
  description?: string;
  systemPrompt?: string;
  model?: string;
  toolSelection?: ToolSelection;
  skillSelection?: SkillSelection;
  skillExecution?: SkillExecutionSelection;
  thinkingLevel?: ThinkingLevel;
  llmProfileStrategy?: 'default' | 'first-available';
  runtimeType?: string;
}

export interface PluginContributes {
  commands?: CommandContribution[];
  tools?: ToolContribution[];
  settings?: SettingsContribution;
  panels?: PanelContribution[];
  hooks?: HookContribution[];
  uiExtensions?: UIExtensionPoint[];
  menus?: MenuContribution[];
  keybindings?: KeybindingContribution[];
  workflowSteps?: WorkflowStepContribution[];
  triggerSources?: TriggerSourceContribution[];
  skills?: SkillContribution[];
  agentProfiles?: AgentProfileContribution[];
  notchTabs?: NotchTabContribution[];
  agentRuntimes?: AgentRuntimeContribution[];
}

export interface McpRequirement {
  server: string;
  tools?: string[];
  required?: boolean;
}

export interface PluginRequirements {
  mcp?: McpRequirement[];
  plugins?: Array<{ id: string; required?: boolean }>;
  providers?: { required?: boolean };
}

export interface PluginAuthor {
  name: string;
  email?: string;
  url?: string;
}

export interface PluginEngines {
  claudia: string;
}

export type ExecutionMode = 'main' | 'worker' | 'sandbox';
export type PluginPlatform = 'universal' | 'desktop';

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author?: PluginAuthor;
  icon?: string;
  main?: string;
  frontend?: string;
  permissions?: Permission[];
  contributes?: PluginContributes;
  platform?: PluginPlatform;
  executionMode?: ExecutionMode;
  activationEvents?: string[];
  engines?: PluginEngines;
  dependencies?: Record<string, string>;
  requires?: PluginRequirements;
}

export interface PluginValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function requireString(
  value: Record<string, unknown>,
  field: string,
  label: string,
  errors: string[]
): void {
  if (typeof value[field] !== 'string' || value[field].length === 0) {
    errors.push(`${label} missing "${field}" field`);
  }
}

/** Validate the portable parts of a plugin manifest before host installation. */
export function validatePluginManifest(manifest: unknown): PluginValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!isRecord(manifest)) {
    return { valid: false, errors: ['Manifest must be an object'], warnings };
  }

  if (typeof manifest.id !== 'string' || !manifest.id) {
    errors.push('Missing required field: id');
  } else if (!/^[a-zA-Z0-9_-]+(\.[a-zA-Z0-9_-]+)*$/.test(manifest.id)) {
    errors.push('Invalid id format (use reverse domain notation, e.g., com.example.plugin)');
  }
  if (typeof manifest.name !== 'string' || !manifest.name) {
    errors.push('Missing required field: name');
  }
  if (typeof manifest.version !== 'string' || !manifest.version) {
    errors.push('Missing required field: version');
  } else if (!/^\d+\.\d+\.\d+(-[\w.]+)?$/.test(manifest.version)) {
    warnings.push('Version should follow semver format (e.g., 1.0.0)');
  }
  if (typeof manifest.description !== 'string' || !manifest.description) {
    errors.push('Missing required field: description');
  }

  if (
    manifest.platform !== undefined &&
    !['universal', 'desktop'].includes(String(manifest.platform))
  ) {
    errors.push('Invalid platform (expected "universal" or "desktop")');
  }
  if (
    manifest.executionMode !== undefined &&
    !['main', 'worker', 'sandbox'].includes(String(manifest.executionMode))
  ) {
    errors.push('Invalid executionMode (expected "main", "worker", or "sandbox")');
  }
  if (manifest.engines !== undefined) {
    if (!isRecord(manifest.engines) || typeof manifest.engines.claudia !== 'string') {
      warnings.push('engines.claudia should specify a semver range');
    }
  }

  if (manifest.contributes !== undefined && !isRecord(manifest.contributes)) {
    errors.push('contributes must be an object');
  } else if (isRecord(manifest.contributes)) {
    const contributionChecks: Array<[string, string, string[]]> = [
      ['commands', 'Command contribution', ['command', 'title']],
      ['tools', 'Tool contribution', ['id', 'name', 'description']],
      ['notchTabs', 'NotchTab contribution', ['id', 'label']],
      ['workflowSteps', 'WorkflowStep contribution', ['id', 'name', 'description']],
      ['agentProfiles', 'AgentProfile contribution', ['id', 'name']],
      ['agentRuntimes', 'AgentRuntime contribution', ['type', 'label']],
    ];
    for (const [key, label, fields] of contributionChecks) {
      const entries = manifest.contributes[key];
      if (entries === undefined) continue;
      if (!Array.isArray(entries)) {
        errors.push(`contributes.${key} must be an array`);
        continue;
      }
      for (const entry of entries) {
        if (!isRecord(entry)) {
          errors.push(`${label} must be an object`);
          continue;
        }
        for (const field of fields) requireString(entry, field, label, errors);
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function resolvePluginPlatform(manifest: PluginManifest): PluginPlatform {
  if (manifest.platform) return manifest.platform;
  if (manifest.frontend) return 'desktop';
  const c = manifest.contributes;
  const hasUI =
    !!c?.panels?.length ||
    !!c?.uiExtensions?.length ||
    !!c?.menus?.length ||
    !!c?.keybindings?.length ||
    !!c?.notchTabs?.length;
  return hasUI ? 'desktop' : 'universal';
}

/** Identity helper that preserves literal types while checking the manifest contract. */
export function definePluginManifest<const T extends PluginManifest>(manifest: T): T {
  return manifest;
}
