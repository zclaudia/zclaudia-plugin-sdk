import type { PermissionCallback } from './interactions.js';
import type { Permission, PluginManifest } from './manifest.js';
import type {
  ExternalAgentAdapter,
  ProviderToolBridgeEntry,
  ProviderToolBridgeRequest,
} from './providers.js';

export type EventHandler = (data: unknown) => void | Promise<void>;

export interface EventAPI {
  on(event: string, handler: EventHandler): () => void;
  once(event: string, handler: EventHandler): void;
  off(event: string, handler: EventHandler): void;
  emit(event: string, data: unknown): Promise<void>;
}

export interface StorageAPI {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  keys(): Promise<string[]>;
  clear(): Promise<void>;
}

export interface LogAPI {
  info(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
  debug(...args: unknown[]): void;
}

export interface FileSystemAPI {
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  readdir(path: string): Promise<string[]>;
  mkdir(path: string): Promise<void>;
  unlink(path: string): Promise<void>;
}

export interface NetworkAPI {
  fetch(
    url: string,
    options?: Record<string, unknown>
  ): Promise<{
    ok: boolean;
    status: number;
    body: string;
  }>;
}

export interface NotificationAPI {
  show(title: string, body: string, options?: { notchTab?: string }): Promise<void>;
}

export interface ClipboardAPI {
  read(): Promise<string>;
  write(text: string): Promise<void>;
}

export interface ShellAPI {
  execute(
    command: string,
    args?: string[],
    options?: { cwd?: string }
  ): Promise<{ stdout: string; stderr: string; code: number }>;
}

export interface SessionAPI {
  getActive(): Promise<{ id: string; projectId: string } | null>;
  getById(id: string): Promise<unknown>;
  list(): Promise<unknown[]>;
}

export interface ProjectAPI {
  getActive(): Promise<{ id: string; name: string; path: string } | null>;
  getById(id: string): Promise<unknown>;
  list(): Promise<unknown[]>;
}

export interface UIComponents {
  Button: unknown;
  Input: unknown;
  Card: unknown;
  Badge: unknown;
}

export interface UIAPI {
  components: UIComponents;
  showPanel(panelId: string): void;
  showNotification(message: string): void;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ProviderInfo {
  id: string;
  name: string;
  type: string;
  models: string[];
  isDefault?: boolean;
}

export interface ProviderCallOptions {
  providerId: string;
  modelOverride?: string;
  messages: ChatMessage[];
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
}

export interface ProviderCallResult {
  content: string;
  model: string;
  providerId: string;
  usage?: { inputTokens: number; outputTokens: number };
  metadata?: Record<string, unknown>;
  isComplete?: boolean;
  suggestedNextSteps?: string[];
}

export interface ProviderStreamChunk {
  type: 'content' | 'usage' | 'done' | 'error';
  content?: string;
  delta?: string;
  usage?: { inputTokens: number; outputTokens: number };
  error?: string;
}

export interface ProviderAPI {
  list(): Promise<ProviderInfo[]>;
  get(providerId: string): Promise<ProviderInfo | undefined>;
  call(options: ProviderCallOptions): Promise<ProviderCallResult>;
  callStream(options: ProviderCallOptions): AsyncGenerator<ProviderStreamChunk>;
}

export interface McpServerInfo {
  name: string;
  enabled: boolean;
  description?: string;
}

export interface McpToolInfo {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

export interface McpAPI {
  listServers(): Promise<McpServerInfo[]>;
  listTools(serverName: string): Promise<McpToolInfo[]>;
  callTool<T = unknown>(
    serverName: string,
    tool: string,
    args: Record<string, unknown>
  ): Promise<T>;
}

export interface PluginSchedulerTask {
  id: string;
  name: string;
  intervalMs: number;
  immediate?: boolean;
}

export interface PluginSchedulerAPI {
  register(task: PluginSchedulerTask, handler: () => Promise<void> | void): () => void;
  unregister(taskId: string): void;
  trigger(taskId: string): Promise<void>;
}

export interface PermissionAPI {
  hasPermission(permission: Permission): boolean;
  hasAllPermissions(permissions: Permission[]): boolean;
  requestPermission(permission: Permission): Promise<boolean>;
  requestPermissions(permissions: Permission[]): Promise<boolean>;
  getGrantedPermissions(): Permission[];
}

export type WorkflowStepHandler = (
  config: Record<string, unknown>,
  context: {
    projectId?: string;
    projectRootPath?: string;
    providerId?: string;
    stepRunId: string;
    runId: string;
  }
) => Promise<{ status: 'completed' | 'failed'; output: Record<string, unknown>; error?: string }>;

export interface WorkflowStepsAPI {
  registerWorkflowStep(stepId: string, handler: WorkflowStepHandler): void;
  unregisterWorkflowStep(stepId: string): void;
}

export interface AgentRuntimesAPI {
  register(adapter: ExternalAgentAdapter): void;
  unregister(type: string): void;
  createToolBridge(request: ProviderToolBridgeRequest): Promise<ProviderToolBridgeEntry | null>;
}

export interface CapabilityNegotiationResult {
  satisfied: boolean;
  mcp: Record<
    string,
    {
      server: string;
      available: boolean;
      availableTools?: string[];
      missingTools?: string[];
      error?: string;
    }
  >;
  plugins: Record<string, { available: boolean }>;
  providers: { available: boolean };
  unsatisfiedReasons: string[];
}

export type CommandHandler = (
  args: string[],
  context?: Record<string, unknown>
) => Promise<unknown> | unknown;

export type ToolHandler = (
  args: Record<string, unknown>,
  context?: Record<string, unknown>
) => Promise<string> | string;

export interface ToolRegistration {
  id: string;
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  handler: ToolHandler;
  scope?: Array<'agent-assistant' | 'main-session' | 'command-palette'>;
  permissions?: Permission[];
}

export interface UIExtensionRegistration {
  id: string;
  location: 'sidebar' | 'panel' | 'toolbar' | 'context-menu' | 'status-bar';
  component: unknown;
  when?: (context: unknown) => boolean;
}

export interface PluginContext {
  pluginId: string;
  /** Installed manifest version. */
  version: string;
  /** Absolute path of the installed plugin. */
  extensionPath: string;
  events: EventAPI;
  commands: {
    registerCommand(command: string, handler: CommandHandler): void;
    unregisterCommand(command: string): void;
  };
  tools: {
    registerTool(meta: ToolRegistration): void;
    unregisterTool(toolId: string): void;
  };
  registerUIExtension(extension: UIExtensionRegistration): void;
  workflowSteps: WorkflowStepsAPI;
  permissions: PermissionAPI;
  storage: StorageAPI;
  fs?: FileSystemAPI;
  network?: NetworkAPI;
  notification?: NotificationAPI;
  clipboard?: ClipboardAPI;
  shell?: ShellAPI;
  scheduler?: PluginSchedulerAPI;
  session?: SessionAPI;
  project?: ProjectAPI;
  ui?: UIAPI;
  providers?: ProviderAPI;
  agentRuntimes?: AgentRuntimesAPI;
  mcp?: McpAPI;
  capabilities?: CapabilityNegotiationResult;
  exports<T>(api: T): void;
  getPluginAPI<T>(pluginId: string): T | undefined;
  log: LogAPI;
  env: {
    isDesktop: boolean;
    isServer: boolean;
    appVersion: string;
    platform: 'darwin' | 'win32' | 'linux';
  };
}

export interface PluginInstance {
  manifest: PluginManifest;
  path: string;
  isActive: boolean;
  module?: unknown;
  error?: string;
  pendingPermissions?: string[];
  capabilities?: CapabilityNegotiationResult;
}

export interface PluginModule {
  activate(context: PluginContext): Promise<void> | void;
  deactivate?(): Promise<void> | void;
}

/** Identity helper that preserves a plugin module's concrete type. */
export function definePlugin<const T extends PluginModule>(plugin: T): T {
  return plugin;
}

/** Convenience type for adapters that accept permission callbacks directly. */
export type RuntimePermissionCallback = PermissionCallback;
