import assert from "node:assert/strict";
import test from "node:test";
import { capabilityForTool, mergeToolPublishState, toolMap } from "../lib/tools";

test("browser-local core tools are marked ready", () => {
  assert.equal(capabilityForTool(toolMap.get("merge-pdf")!), "ready");
  assert.equal(capabilityForTool(toolMap.get("edit-pdf")!), "ready");
});

test("server-backed tools are marked beta", () => {
  assert.equal(capabilityForTool(toolMap.get("webpage-to-pdf")!), "beta");
  assert.equal(capabilityForTool(toolMap.get("lock-pdf")!), "beta");
});

test("unfinished operations are not presented as ready", () => {
  assert.equal(capabilityForTool(toolMap.get("ocr-pdf")!), "worker-required");
  assert.equal(capabilityForTool(toolMap.get("compare-pdf")!), "coming-soon");
});

test("publish state and capability state are merged independently", () => {
  const tools = mergeToolPublishState({ "merge-pdf": { published: false } });
  const merge = tools.find((tool) => tool.slug === "merge-pdf");
  assert.equal(merge?.published, false);
  assert.equal(merge?.capability, "ready");
});
