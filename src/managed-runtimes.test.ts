import { describe, expect, it } from 'vitest';
import {
  MANAGED_RUNTIME_PLATFORM_KEYS,
  MANAGED_RUNTIME_POLICIES,
  type RuntimeCompatibilityDescriptor,
} from './managed-runtimes.js';

describe('managed runtime public contract', () => {
  it('keeps policy and platform literals stable', () => {
    expect(MANAGED_RUNTIME_POLICIES).toEqual(['system-only', 'managed-ask', 'managed-auto']);
    expect(MANAGED_RUNTIME_PLATFORM_KEYS).toContain('win32-x64');
  });

  it('allows legacy descriptors without managedInstall', () => {
    const descriptor: RuntimeCompatibilityDescriptor = {
      schemaVersion: 1,
      runtime: 'fixture',
      executable: { command: 'fixture', versionArgs: ['--version'] },
      probe: { kind: 'command', args: ['--help'] },
    };
    expect(descriptor.managedInstall).toBeUndefined();
  });
});
