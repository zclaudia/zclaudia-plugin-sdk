import { describe, expect, it } from 'vitest';
import {
  PROVIDER_RUNTIME_EVENT_TYPES,
  type ExternalAgentRunContext,
  type ProviderRuntimeEvent,
} from './providers.js';
import {
  RUNTIME_USAGE_SNAPSHOT_SCHEMA_VERSION,
  type ProviderUsageUpdatedEvent,
  type RuntimeUsageBaseline,
} from './usage.js';

describe('usage event contract', () => {
  it('fits the provider channel without a cast and preserves unknown versus observed zero', () => {
    const usage = {
      type: 'provider_usage_updated',
      snapshot: {
        schemaVersion: RUNTIME_USAGE_SNAPSHOT_SCHEMA_VERSION,
        revision: 1,
        final: true,
        status: 'partial',
        tokens: {
          inputUncached: 0,
          cacheRead: null,
          cacheWrite: null,
          output: 3,
          reasoningOutput: null,
          total: null,
        },
        models: [],
        source: {
          kind: 'native_result',
          scope: 'invocation',
          includesSubagents: 'unknown',
          ruleVersion: 1,
        },
      },
    } satisfies ProviderUsageUpdatedEvent;
    const event: ProviderRuntimeEvent = usage;
    expect(PROVIDER_RUNTIME_EVENT_TYPES).toContain(event.type);
    expect(event.snapshot?.tokens.inputUncached).toBe(0);
    expect(event.snapshot?.tokens.total).toBeNull();
  });

  it('carries a resumed-thread usage baseline on the run context, with null as "none found"', () => {
    const baseline = {
      cumulative: {
        totalTokens: 120,
        inputTokens: 100,
        cachedInputTokens: 40,
        cacheWriteInputTokens: 0,
        outputTokens: 20,
        reasoningOutputTokens: 5,
      },
      nativeThreadId: 'thread_1',
    } satisfies RuntimeUsageBaseline;
    const resumed: ExternalAgentRunContext = { cwd: '/repo', usageBaseline: baseline };
    const noneFound: ExternalAgentRunContext = { cwd: '/repo', usageBaseline: null };
    expect(resumed.usageBaseline?.nativeThreadId).toBe('thread_1');
    expect(noneFound.usageBaseline).toBeNull();
  });
});
