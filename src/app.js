import { compareConfigs, parseConfig } from "./analyzer.js";

const elements = {
  before: document.querySelector("#before-config"),
  after: document.querySelector("#after-config"),
  beforeError: document.querySelector("#before-error"),
  afterError: document.querySelector("#after-error"),
  review: document.querySelector("#review-button"),
  example: document.querySelector("#example-button"),
  copy: document.querySelector("#copy-button"),
  results: document.querySelector("#results"),
  content: document.querySelector("#results-content")
};

const example = {
  before: {
    name: "release-helper",
    tools: ["read_file", "github_issues"],
    permissions: ["contents:read", "issues:read"],
    hosts: ["api.github.com"],
    paths: ["./src"]
  },
  after: {
    name: "release-helper",
    tools: ["read_file", "github_issues", "shell", "deploy"],
    permissions: ["contents:write", "issues:write", "deployments:write"],
    hosts: ["api.github.com", "*.vercel.app"],
    paths: ["./src", ".env"],
    environment: { VERCEL_TOKEN: "redacted" }
  }
};

let latestResult = null;

function escapeHtml(value) {
  return String(value).replace(/[&<>"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[character]);
}

function readInput(input, errorElement) {
  try {
    const parsed = parseConfig(input.value);
    input.removeAttribute("aria-invalid");
    errorElement.textContent = "";
    return parsed;
  } catch (error) {
    input.setAttribute("aria-invalid", "true");
    errorElement.textContent = error.message;
    return null;
  }
}

function signalCard(signal) {
  return `
    <li class="signal-card signal-card--${signal.severity}">
      <div class="signal-meta"><span>${escapeHtml(signal.severity)}</span><span>${escapeHtml(signal.category)}</span></div>
      <strong>${escapeHtml(signal.item)}</strong>
      <p>${escapeHtml(signal.reason)}</p>
    </li>`;
}

function categoryRow(category) {
  if (!category.added.length && !category.removed.length) return "";
  const chips = [
    ...category.added.map((item) => `<span class="change-chip change-chip--added">+ ${escapeHtml(item)}</span>`),
    ...category.removed.map((item) => `<span class="change-chip change-chip--removed">− ${escapeHtml(item)}</span>`)
  ].join("");
  return `<div class="category-row"><h3>${escapeHtml(category.name)}</h3><div class="change-chips">${chips}</div></div>`;
}

function render(result) {
  latestResult = result;
  const changes = result.categories.map(categoryRow).join("");
  const signals = result.signals.length
    ? `<ul class="signal-grid">${result.signals.map(signalCard).join("")}</ul>`
    : `<div class="clean-state"><span aria-hidden="true">✓</span><div><strong>No new permission surface found</strong><p>The recognized tools, scopes, hosts, commands, file paths, and secrets did not expand.</p></div></div>`;

  elements.content.innerHTML = `
    <div class="score-card">
      <div class="score-ring" style="--score: ${result.score}" aria-label="Expansion score ${result.score} out of 100">
        <span>${result.score}</span><small>/ 100</small>
      </div>
      <div><span class="score-kicker">Expansion score</span><h3>${escapeHtml(result.verdict)}</h3><p>${result.addedCount} added · ${result.removedCount} removed</p></div>
    </div>
    ${changes ? `<div class="change-list"><h3 class="section-label">Recognized changes</h3>${changes}</div>` : ""}
    <div class="risk-list"><h3 class="section-label">Review prompts</h3>${signals}</div>
    <div class="review-checklist">
      <h3>Before approving</h3>
      <label><input type="checkbox" /> Each added capability is required for the stated task.</label>
      <label><input type="checkbox" /> Wildcards have been replaced with the narrowest practical scope.</label>
      <label><input type="checkbox" /> Mutating actions still require explicit human confirmation.</label>
    </div>`;
  elements.results.hidden = false;
  elements.results.scrollIntoView({ behavior: "smooth", block: "start" });
}

elements.review.addEventListener("click", () => {
  const before = readInput(elements.before, elements.beforeError);
  const after = readInput(elements.after, elements.afterError);
  if (!before || !after) {
    (before ? elements.after : elements.before).focus();
    return;
  }
  render(compareConfigs(before, after));
});

elements.example.addEventListener("click", () => {
  elements.before.value = JSON.stringify(example.before, null, 2);
  elements.after.value = JSON.stringify(example.after, null, 2);
  elements.before.removeAttribute("aria-invalid");
  elements.after.removeAttribute("aria-invalid");
  elements.beforeError.textContent = "";
  elements.afterError.textContent = "";
  elements.before.focus();
});

elements.copy.addEventListener("click", async () => {
  if (!latestResult) return;
  const lines = [
    `QuietPatch: ${latestResult.verdict} (${latestResult.score}/100)`,
    `${latestResult.addedCount} added, ${latestResult.removedCount} removed`,
    ...latestResult.signals.map((signal) => `- [${signal.severity}] ${signal.category}: ${signal.item}`)
  ];
  try {
    await navigator.clipboard.writeText(lines.join("\n"));
    elements.copy.textContent = "Copied";
    setTimeout(() => { elements.copy.textContent = "Copy summary"; }, 1600);
  } catch {
    elements.copy.textContent = "Copy unavailable";
  }
});

