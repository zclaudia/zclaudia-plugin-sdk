# @zclaudia/plugin-sdk

Public contracts and lightweight development helpers for building ZClaudia plugins.

The SDK defines the host/plugin boundary: manifests, lifecycle APIs, permissions, and external
agent runtime adapters. It intentionally has no dependency on the ZClaudia application monorepo
or on a provider/model SDK.

## Install

```bash
pnpm add -D @zclaudia/plugin-sdk
```

Use it as a development dependency when all imports are type-only. Keep it as a runtime dependency
if your compiled plugin calls helpers such as `definePlugin` or `validatePluginManifest`.

## Runtime plugin example

```ts
import { definePlugin } from '@zclaudia/plugin-sdk/runtime';
import type {
  ExternalAgentAdapter,
  ExternalAgentRunContext,
  ProviderRuntimeEvent,
} from '@zclaudia/plugin-sdk/providers';

class ExampleAdapter implements ExternalAgentAdapter {
  readonly type = 'example';

  async *run(
    input: string,
    context: ExternalAgentRunContext
  ): AsyncGenerator<ProviderRuntimeEvent, void, void> {
    yield { type: 'init', sessionId: context.sessionId };
    yield { type: 'assistant_delta', content: input };
    yield { type: 'provider_turn_finished', isComplete: true };
  }
}

export default definePlugin({
  activate(context) {
    context.agentRuntimes?.register(new ExampleAdapter());
  },
  deactivate() {},
});
```

The corresponding `plugin.json` must declare the same runtime type under
`contributes.agentRuntimes` and request `provider.register`.

## Package boundaries

- `@zclaudia/protocol` owns JSON-serializable transport contracts.
- `@zclaudia/plugin-sdk` owns plugin lifecycle and host capability contracts.
- Provider-specific packages own their CLI/SDK integrations.

The SDK may reuse protocol DTOs in the future, but the protocol package must never depend on the
plugin SDK.

## Compatibility

The package follows semantic versioning. Additive fields are minor changes. Removing or changing a
public field, callback, manifest contribution, or adapter method is a major change.

## Releasing

Publishing uses npm Trusted Publishing from `.github/workflows/publish.yml`; the repository does
not need an `NPM_TOKEN`. To release a version:

1. Update `package.json` and `pnpm-lock.yaml` to the same version and merge the change to `main`.
2. Create a `v<version>` tag, such as `v0.1.1`, on that commit.
3. Publish a GitHub Release for the tag.

The release workflow verifies that the tag matches `package.json`, runs all checks, and publishes
the public package through GitHub OIDC. Re-running a release for an already-published npm version
will fail because npm package versions are immutable.
