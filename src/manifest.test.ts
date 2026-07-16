import { describe, expect, it } from 'vitest';
import { definePluginManifest, resolvePluginPlatform, validatePluginManifest } from './manifest.js';

describe('plugin manifests', () => {
  it('accepts a minimal manifest and preserves literal types', () => {
    const manifest = definePluginManifest({
      id: 'com.example.runtime',
      name: 'Example Runtime',
      version: '1.0.0',
      description: 'Example',
      platform: 'universal',
    });

    expect(manifest.platform).toBe('universal');
    expect(validatePluginManifest(manifest)).toEqual({ valid: true, errors: [], warnings: [] });
  });

  it('reports invalid contribution shapes', () => {
    const result = validatePluginManifest({
      id: 'bad id',
      name: 'Bad',
      version: 'next',
      description: 'Bad manifest',
      contributes: { agentRuntimes: [{ label: 'Missing type' }] },
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      'Invalid id format (use reverse domain notation, e.g., com.example.plugin)'
    );
    expect(result.errors).toContain('AgentRuntime contribution missing "type" field');
    expect(result.warnings).toContain('Version should follow semver format (e.g., 1.0.0)');
  });

  it('infers desktop only for UI-bearing plugins', () => {
    const base = {
      id: 'com.example.plugin',
      name: 'Example',
      version: '1.0.0',
      description: 'Example',
    };
    expect(resolvePluginPlatform(base)).toBe('universal');
    expect(
      resolvePluginPlatform({
        ...base,
        contributes: { panels: [{ id: 'x', label: 'X', location: 'right' }] },
      })
    ).toBe('desktop');
  });
});
