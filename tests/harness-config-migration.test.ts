import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { setPluginConfig } from "../src/config";
import { resolveAgentLaunchRequest } from "../src/tools/agent-launch-resolution";

function resolve(harness: string, model?: string) {
  return resolveAgentLaunchRequest(
    { prompt: "Check migrated model policy", harness, model },
    { workspaceDir: "/tmp", oneShotCliRun: true },
    {},
  );
}

describe("harness configuration migration", () => {
  afterEach(() => setPluginConfig({}));

  it("keeps explicit harness restrictions ahead of conflicting legacy model settings", () => {
    setPluginConfig({
      defaultHarness: "claude-code",
      defaultModel: "haiku",
      model: "gpt-5.5",
      allowedModels: ["haiku", "gpt-5.5"],
      harnesses: {
        codex: { defaultModel: "openai/gpt-6-astra", allowedModels: ["gpt-6-astra"] },
        "claude-code": { defaultModel: "sonnet", allowedModels: ["sonnet", "opus"] },
      },
    });

    const codex = resolve("codex");
    assert.equal(codex.kind, "resolved");
    if (codex.kind === "resolved") assert.equal(codex.resolvedModel, "gpt-6-astra");
    assert.equal(resolve("claude-code").kind, "resolved");
    assert.equal(resolve("claude-code", "opus").kind, "resolved");
    assert.equal(resolve("codex", "gpt-5.5").kind, "error");
    assert.equal(resolve("claude-code", "haiku").kind, "error");
  });

  it("distinguishes omitted restrictions from an explicit empty list during migration", () => {
    setPluginConfig({});
    assert.equal(resolve("codex", "gpt-5.5").kind, "error");
    assert.equal(resolve("claude-code", "haiku").kind, "error");

    setPluginConfig({
      allowedModels: ["sonnet"],
      harnesses: { codex: { allowedModels: [] }, "claude-code": { allowedModels: [] } },
    });
    assert.equal(resolve("codex", "openai/gpt-5.5").kind, "resolved");
    assert.equal(resolve("claude-code", "haiku").kind, "resolved");
    // Removing model restrictions does not enable unsupported provider syntax.
    assert.equal(resolve("codex", "openai-codex/gpt-5.5").kind, "error");
    assert.equal(resolve("codex", "codex/gpt-5.5").kind, "error");
  });
});
