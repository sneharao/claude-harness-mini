#!/usr/bin/env node
// Commit-history audit — user-initiated.
//
// Scans the last N commits against harness rules (commit-message format
// from harness/skills/development/commit-changes.md, filename conventions
// from harness/knowledge/code-standards/naming-conventions.md) and emits
// SUGGESTED entries for harness/housekeeping/agent-corrections.md.
//
// Never auto-appends. The human decides, per the drift rule, whether
// each finding is an agent mistake (log it) or a rule that needs updating
// (open an exec-plan via harness-improvement-review.md).

import { execSync } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
function flag(name, def) {
  const hit = args.find(a => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : def;
}
const COUNT = Number(flag("count", "10"));
const RANGE = flag("range", null);

const TYPE_TAGS = ["feat", "fix", "refactor", "chore", "docs", "test"];
const SUMMARY_MAX = 100;

const git = (cmd) => execSync(cmd, { encoding: "utf8" }).replace(/\n$/, "");

const logArgs = RANGE ? RANGE : `-n ${COUNT}`;
const raw = git(`git log ${logArgs} --pretty=format:%H%x09%P%x09%s`);
const commits = raw.split("\n").filter(Boolean).map(line => {
  const [hash, parents, subject] = line.split("\t");
  return { hash, parents: parents.split(" ").filter(Boolean), subject };
});

const findings = [];

for (const c of commits) {
  if (c.parents.length > 1) continue; // skip merges

  const body = git(`git log -1 --pretty=format:%B ${c.hash}`);
  const status = git(`git show --pretty=format: --name-status ${c.hash}`);
  const addedOrRenamed = status.split("\n").filter(Boolean).map(line => {
    const parts = line.split("\t");
    return { status: parts[0], path: parts[parts.length - 1] };
  }).filter(f => f.status.startsWith("A") || f.status.startsWith("R"));

  const lines = body.split("\n");
  const summary = lines[0] || "";

  if (summary.length > SUMMARY_MAX) {
    findings.push({
      type: "commit-message-summary-too-long",
      rule: "harness/skills/development/commit-changes.md — summary ≤ 100 chars",
      commit: c,
      detail: `Summary is ${summary.length} chars (max ${SUMMARY_MAX}): "${summary.slice(0, 60)}…"`,
    });
  }

  const typeMatch = body.match(/^Type:\s+(\S+)/m);
  if (!typeMatch) {
    findings.push({
      type: "commit-message-missing-type",
      rule: "harness/skills/development/commit-changes.md — Type tag required",
      commit: c,
      detail: "No `Type: <type>` line in commit body",
    });
  } else if (!TYPE_TAGS.includes(typeMatch[1])) {
    findings.push({
      type: "commit-message-invalid-type",
      rule: "harness/skills/development/commit-changes.md — allowed types",
      commit: c,
      detail: `Type tag "${typeMatch[1]}" not in [${TYPE_TAGS.join(", ")}]`,
    });
  }

  if (/Co-[Aa]uthored-[Bb]y:/.test(body) || /Authored by Cursor/i.test(body)) {
    findings.push({
      type: "commit-message-ai-attribution",
      rule: "harness/skills/development/commit-changes.md — no AI co-author trailers",
      commit: c,
      detail: "Body contains `Co-Authored-By` or `Authored by Cursor` trailer",
    });
  }

  for (const f of addedOrRenamed) {
    const base = basename(f.path);
    if (/\.spec\.[a-z0-9]+$/.test(base)) {
      findings.push({
        type: "filename-spec-extension",
        rule: "harness/knowledge/code-standards/naming-conventions.md — test files use `.test.<ext>`",
        commit: c,
        detail: `${f.path} uses \`.spec.\` extension; rule says \`<thing>.test.<ext>\``,
      });
    }
  }
}

const now = new Date();
const ts = now.toISOString().replace(/[:.]/g, "-");
mkdirSync(`${__dirname}/reports`, { recursive: true });
const reportPath = `${__dirname}/reports/commit-audit-${ts}.md`;

let md = `# Commit Audit\n\n`;
md += `- **Range:** ${RANGE || `last ${COUNT} commits`}\n`;
md += `- **Commits scanned:** ${commits.length} (merges excluded)\n`;
md += `- **Generated:** ${now.toISOString()}\n`;
md += `- **Findings:** ${findings.length}\n\n`;

md += `> **Drift rule reminder.** Suggested entries below are not auto-appended to \`harness/housekeeping/agent-corrections.md\`. For each finding, decide: is the code wrong (paste the correction entry) or is the rule wrong (open an exec-plan via \`harness/skills/housekeeping/harness-improvement-review.md\`)? Never assume the code is the new standard.\n\n`;

if (findings.length === 0) {
  md += `_No violations detected._\n`;
} else {
  md += `## Findings\n\n`;
  findings.forEach((f, i) => {
    md += `### ${i + 1}. \`${f.commit.hash.slice(0, 7)}\` — ${f.type}\n\n`;
    md += `- **Commit:** \`${f.commit.hash.slice(0, 7)}\` — ${f.commit.subject}\n`;
    md += `- **Rule:** ${f.rule}\n`;
    md += `- **Violation:** ${f.detail}\n\n`;
    md += `Paste-ready entry (only if you decide the code is in error):\n\n`;
    md += "```\n";
    md += `### ${now.toISOString().slice(0, 10)} — commit ${f.commit.hash.slice(0, 7)}\n\n`;
    md += `- **Agent output:** ${f.detail}\n`;
    md += `- **Human correction:** [what the correct behaviour should have been]\n`;
    md += `- **Suspected root cause:** unclear-rule | wrong-skill | missing-skill | other\n`;
    md += `- **Detail:** ${f.rule}\n`;
    md += `- **Status:** open\n`;
    md += "```\n\n";
  });
}

writeFileSync(reportPath, md);
console.log(`Wrote ${reportPath}`);
console.log(`Findings: ${findings.length}`);
