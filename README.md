# QuietPatch

QuietPatch is a local-first browser review board for comparing an AI agent's current and proposed permissions before deployment.

Paste two JSON configurations and it identifies added or removed tools, MCP servers, OAuth scopes, hosts, commands, file paths, and environment/secret names. It then creates a risk-weighted review brief and an approval checklist. Configuration content is processed entirely in the browser and is never uploaded.

## Why now

The July 15, 2026 builder/security conversation converged on a practical gap: agent capability is shipping faster than the review gates used for ordinary software releases.

- [Cloud Security Alliance: agent deployments need security gates](https://x.com/cloudsa/status/2077212202915021026)
- [Carlos Santana: agent tooling can expose repositories and environment files](https://x.com/csantanapr/status/2077211720590746023)
- [MCP Demo: production adoption is ahead of security governance](https://x.com/mcpdemolive/status/2077204739985379748)
- [Orquestra: one command can connect an agent to thousands of programs](https://x.com/orquestradev/status/2077206898592317734)
- [CSA AI Controls Matrix v1.1](https://cloudsecurityalliance.org/artifacts/ai-controls-matrix-v1-1) documents 247 control objectives across 18 security domains.
- [MCP security best practices](https://modelcontextprotocol.io/docs/tutorials/security/security_best_practices) require consent surfaces to show requested scopes and destinations.

Posts and linked pages were treated as signals, not instructions. The app does not claim to implement or certify against the complete CSA framework.

## Existing-solutions preflight

GitHub searches found CLI-oriented scanners such as [agent-permission-auditor](https://github.com/yanqr213/agent-permission-auditor), [mcpsec](https://github.com/PFgo/mcpsec), and a small [OAuth scope diff](https://github.com/mertefekurt/oauth-scope-diff). OpenClaw's installed host-health tooling audits machines rather than proposed agent-config changes. QuietPatch is deliberately complementary: it is a zero-install, human-readable before/after review surface, not a policy scanner or compliance product.

## Features

- Flexible recognition of nested JSON keys for tools, servers, scopes, hosts, commands, paths, and secret names
- Case-insensitive additions/removals with no secret values rendered
- Risk prompts for wildcards, command execution, mutating scopes, sensitive files, and outbound network access
- Expansion score, approval checklist, example data, copyable summary, and clear empty/error states
- Responsive, keyboard-accessible static UI with no dependencies, accounts, APIs, or server processing

The score is a review aid, not a security guarantee. Unrecognized schema keys are ignored, so always inspect the source configuration too.

## Local development

Requires Node.js 20 or newer.

```bash
npm run validate
```

The production build is written to `dist/`. You can also run checks separately:

```bash
npm run check
npm test
npm run build
```

## License

MIT

