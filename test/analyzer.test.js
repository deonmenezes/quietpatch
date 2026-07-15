import assert from "node:assert/strict";
import test from "node:test";
import { compareConfigs, extractCapabilities, parseConfig } from "../src/analyzer.js";

test("parses object JSON and rejects empty or array input", () => {
  assert.deepEqual(parseConfig('{"tools":["read"]}'), { tools: ["read"] });
  assert.throws(() => parseConfig(""), /Add a JSON/);
  assert.throws(() => parseConfig("[]"), /JSON object/);
  assert.throws(() => parseConfig('{"tools":}'), /Invalid JSON/);
});

test("extracts nested agent surfaces without exposing secret values", () => {
  const result = extractCapabilities({
    agent: {
      mcpServers: { github: { command: "npx" } },
      permissions: ["issues:read"],
      environment: { API_TOKEN: "do-not-render" }
    }
  });

  assert.ok(result["Tools & servers"].includes("github"));
  assert.ok(result.Commands.includes("npx"));
  assert.deepEqual(result["Secrets & environment"], ["API_TOKEN"]);
  assert.equal(JSON.stringify(result).includes("do-not-render"), false);
});

test("compares additions and removals case-insensitively", () => {
  const result = compareConfigs(
    { tools: ["Read_File", "legacy"], permissions: ["contents:read"] },
    { tools: ["read_file", "shell"], permissions: ["contents:write"] }
  );

  assert.equal(result.addedCount, 2);
  assert.equal(result.removedCount, 2);
  assert.ok(result.signals.some(({ item, severity }) => item === "shell" && severity === "high"));
  assert.equal(result.categories[0].unchanged[0], "read_file");
});

test("caps expansion scores and flags wildcard access", () => {
  const result = compareConfigs({}, { permissions: ["*", "admin", "delete"], commands: ["sudo", "shell"] });
  assert.equal(result.score, 100);
  assert.equal(result.verdict, "High expansion");
  assert.ok(result.signals.some(({ item, severity }) => item === "*" && severity === "critical"));
});

test("reports a clean state when recognized permissions do not expand", () => {
  const result = compareConfigs({ hosts: ["api.example.com"] }, { hosts: ["api.example.com"] });
  assert.equal(result.score, 0);
  assert.equal(result.verdict, "No expansion");
  assert.equal(result.signals.length, 0);
});
