import { describe, expect, it } from 'vitest';
import {
  RuntimeContractError,
  validateEngineModeDeclarations,
} from './providers.js';

const validMode = {
  id: 'sdk',
  label: 'SDK',
  connection: { kind: 'llm-profile', acceptedModelProtocols: ['anthropic-messages'] },
  executable: 'bundled-sdk',
  modelOptions: { multimodalFallback: false, thinkingLevel: 'auto' },
  capabilities: { tools: 'native-readonly', skills: 'external' },
};

describe('validateEngineModeDeclarations', () => {
  it('accepts a well-formed declaration', () => {
    expect(
      validateEngineModeDeclarations({
        defaultEngineMode: 'sdk',
        engineModes: [validMode, { ...validMode, id: 'cli', connection: { kind: 'external', modelSelection: 'optional' }, executable: 'external-cli' }],
      })
    ).toEqual([]);
  });

  it('accepts descriptors without engine modes', () => {
    expect(validateEngineModeDeclarations({ type: 'claude' })).toEqual([]);
  });

  it('rejects duplicate ids and unknown default mode', () => {
    const errors = validateEngineModeDeclarations({
      defaultEngineMode: 'missing',
      engineModes: [validMode, validMode],
    });
    expect(errors.join('\n')).toMatch(/duplicates id "sdk"/);
    expect(errors.join('\n')).toMatch(/not declared/);
  });

  it('rejects derived UI fields repeated inside a mode', () => {
    const errors = validateEngineModeDeclarations({
      engineModes: [{ ...validMode, hasCliPath: true }],
    });
    expect(errors.join('\n')).toMatch(/must not declare "hasCliPath"/);
  });

  it('rejects invalid connection and executable values', () => {
    const errors = validateEngineModeDeclarations({
      engineModes: [
        {
          ...validMode,
          connection: { kind: 'llm-profile', acceptedModelProtocols: [] },
          executable: 'teleport',
        },
      ],
    });
    expect(errors.join('\n')).toMatch(/acceptedModelProtocols/);
    expect(errors.join('\n')).toMatch(/executable/);
  });
});

describe('RuntimeContractError', () => {
  it('carries code and details', () => {
    const err = new RuntimeContractError('SESSION_CONNECTION_CHANGED', 'connection changed', {
      profileId: 'p1',
    });
    expect(err.code).toBe('SESSION_CONNECTION_CHANGED');
    expect(err.details?.profileId).toBe('p1');
    expect(err.name).toBe('RuntimeContractError');
  });
});
