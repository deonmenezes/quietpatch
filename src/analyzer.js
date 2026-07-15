const GROUPS = [
  { name: "Tools & servers", keys: /^(tools?|mcpservers?|servers?|capabilities|actions?)$/i },
  { name: "Scopes & permissions", keys: /^(permissions?|scopes?|oauthscopes?|grants?|roles?)$/i },
  { name: "Network access", keys: /^(hosts?|domains?|origins?|urls?|endpoints?|network|allowedorigins?)$/i },
  { name: "Commands", keys: /^(commands?|allowedcommands?|executables?|shell)$/i },
  { name: "File access", keys: /^(paths?|directories|directory|files?|workspace|roots?)$/i },
  { name: "Secrets & environment", keys: /^(env|environment|secrets?|credentials?|tokens?|apikeys?)$/i, private: true }
];

const severityWeight = { critical: 30, high: 18, medium: 8, low: 3 };

function asItems(value, privateGroup = false) {
  if (Array.isArray(value)) return value.flatMap((item) => asItems(item, privateGroup));
  if (value && typeof value === "object") return Object.keys(value);
  if (value === null || value === undefined || value === "") return [];
  return privateGroup ? ["configured value"] : [String(value)];
}

export function extractCapabilities(config) {
  const result = new Map(GROUPS.map(({ name }) => [name, new Set()]));

  function visit(value) {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (!value || typeof value !== "object") return;

    for (const [key, child] of Object.entries(value)) {
      const group = GROUPS.find(({ keys }) => keys.test(key));
      if (group) {
        asItems(child, group.private).forEach((item) => result.get(group.name).add(item));
        if (!group.private && child && typeof child === "object") visit(child);
      } else {
        visit(child);
      }
    }
  }

  visit(config);
  return Object.fromEntries([...result].map(([name, values]) => [name, [...values].sort()]));
}

function indexByCanonical(items) {
  return new Map(items.map((item) => [item.trim().toLowerCase(), item]));
}

function assess(category, item) {
  const value = item.toLowerCase();

  if (/^(\*|all|any|everything)$/.test(value) || value.includes("**")) {
    return { severity: "critical", reason: "Wildcard access can silently include future resources." };
  }
  if (category === "Secrets & environment") {
    return { severity: "high", reason: "New secret or environment access can expose credentials." };
  }
  if (category === "Commands" && /(sudo|shell|bash|powershell|cmd|exec|delete|remove|drop|reset|force)/.test(value)) {
    return { severity: "critical", reason: "This command surface can execute or destroy local resources." };
  }
  if (category === "File access" && /(^\/$|~|root|\.env|write|delete)/.test(value)) {
    return { severity: "high", reason: "Broad or sensitive file access increases the local blast radius." };
  }
  if (category === "Scopes & permissions" && /(admin|write|delete|manage|full|owner|send)/.test(value)) {
    return { severity: "high", reason: "This scope can mutate data or administer an account." };
  }
  if (category === "Tools & servers" && /(shell|terminal|browser|email|message|post|write|delete|deploy)/.test(value)) {
    return { severity: "high", reason: "This capability can act outside a read-only workflow." };
  }
  if (category === "Network access") {
    return { severity: "medium", reason: "A new destination expands where agent data can travel." };
  }
  return { severity: "low", reason: "Confirm this capability is needed for the intended task." };
}

export function compareConfigs(before, after) {
  const oldCapabilities = extractCapabilities(before);
  const newCapabilities = extractCapabilities(after);

  const categories = GROUPS.map(({ name }) => {
    const oldIndex = indexByCanonical(oldCapabilities[name]);
    const newIndex = indexByCanonical(newCapabilities[name]);
    const added = [...newIndex].filter(([key]) => !oldIndex.has(key)).map(([, value]) => value);
    const removed = [...oldIndex].filter(([key]) => !newIndex.has(key)).map(([, value]) => value);
    const unchanged = [...newIndex].filter(([key]) => oldIndex.has(key)).map(([, value]) => value);
    return { name, added, removed, unchanged };
  });

  const signals = categories.flatMap(({ name, added }) =>
    added.map((item) => ({ category: name, item, ...assess(name, item) }))
  );
  const score = Math.min(100, signals.reduce((sum, signal) => sum + severityWeight[signal.severity], 0));
  const addedCount = categories.reduce((sum, category) => sum + category.added.length, 0);
  const removedCount = categories.reduce((sum, category) => sum + category.removed.length, 0);
  const verdict = score === 0 ? "No expansion" : score <= 15 ? "Low expansion" : score <= 40 ? "Review carefully" : "High expansion";

  return { categories, signals, score, addedCount, removedCount, verdict };
}

export function parseConfig(source) {
  if (!source.trim()) throw new Error("Add a JSON configuration to compare.");
  let parsed;
  try {
    parsed = JSON.parse(source);
  } catch (error) {
    const position = error.message.match(/position (\d+)/)?.[1];
    throw new Error(position ? `Invalid JSON near character ${position}.` : "Invalid JSON. Check commas and quotes.");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("The configuration must be a JSON object.");
  }
  return parsed;
}
