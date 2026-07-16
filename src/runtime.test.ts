import { describe, expect, it } from 'vitest';
import { definePlugin, type PluginContext } from './runtime.js';

describe('definePlugin', () => {
  it('returns the plugin module unchanged', async () => {
    const seen: string[] = [];
    const plugin = definePlugin({
      activate(context: PluginContext) {
        seen.push(context.pluginId);
      },
    });
    const context = { pluginId: 'com.example.plugin' } as PluginContext;

    await plugin.activate(context);
    expect(seen).toEqual(['com.example.plugin']);
  });
});
