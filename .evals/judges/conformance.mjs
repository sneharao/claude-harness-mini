#!/usr/bin/env node
// Harness conformance judge. Reads .observability/traces/logs.jsonl, groups
// events by session.id, scores six parameters that map to documented harness
// rules, and writes .evals/reports/conformance-<session-id>.md.
//
// Six parameters (weights documented below — edit to re-balance):
//
//   1. Skill-Read-Before-Action coverage — requires the log-tool-input.sh hook
//      to be installed (Claude Code's built-in tool events redact arguments).
//      Reports N/A on sessions captured before the hook was wired up.
//   2. Stage trajectory — was a /harness:* slash command invoked?
//   3. Correction rate — non-slash user_prompts vs total prompts (inverted).
//   4. Harness-topic correction rate — corrections whose text matches keywords
//      for harness-covered topics (TDD, test, run, verify, browser, lint,
//      commit, review). Most direct signal of "harness instructed, agent
//      skipped".
//   5. Tool error rate — failed tool_results + internal_errors (inverted).
//   6. Hook engagement — did harness hooks fire at all? Sanity check.
//
// Usage:
//   node .evals/judges/conformance.mjs                   # latest session
//   node .evals/judges/conformance.mjs --session=<id>    # specific session
//   node .evals/judges/conformance.mjs --all             # every session
//   node .evals/judges/conformance.mjs --logs=<path>     # custom log file
//
// No dependencies — plain Node ESM, runs on any node >= 18.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const DEFAULT_LOGS = '.observability/traces/logs.jsonl';
const REPORTS_DIR = '.evals/reports';

// --- weights (sum to 1.0; re-normalised if skillReadBeforeAction is N/A) ---
const WEIGHTS = {
  skillReadBeforeAction: 0.30,
  harnessTopicCorrection: 0.25,
  stageTrajectory: 0.15,
  correctionRate: 0.15,
  toolErrorRate: 0.10,
  hookEngagement: 0.05,
};

// --- skill-read-before-action rules (used only when harness_tool_input events exist) ---
const SKILL_TRIGGERS = [
  {
    name: 'commit → commit-changes',
    isTrigger: (e) => e.tool === 'Bash' && /\bgit\s+commit\b/.test(e.command || ''),
    requiredFile: 'harness/skills/development/commit-changes.md',
  },
  {
    name: 'checks → run-code-checks',
    isTrigger: (e) =>
      e.tool === 'Bash' && /\bnpm\s+(run\s+)?(test|build|typecheck|lint)\b/.test(e.command || ''),
    requiredFile: 'harness/skills/testing/run-code-checks.md',
  },
  {
    name: 'test-file write → tdd-based-development',
    isTrigger: (e) => (e.tool === 'Write' || e.tool === 'Edit') && isTestFile(e.filePath),
    requiredFile: 'harness/skills/development/tdd-based-development.md',
  },
  {
    name: 'ui component write → add-ui-component',
    isTrigger: (e) => (e.tool === 'Write' || e.tool === 'Edit') && isUiComponent(e.filePath),
    requiredFile: 'harness/skills/development/add-ui-component.md',
  },
];

// --- harness-topic keyword bank (case-insensitive, word-boundary) for metric #4 ---
const HARNESS_TOPIC_REGEX = new RegExp(
  [
    '\\btdd\\b',
    '\\btests?\\b',
    '\\bunit\\s+tests?\\b',
    '\\bintegration\\s+tests?\\b',
    '\\bhow\\s+to\\s+run\\b',
    '\\bbrowser\\b',
    '\\bverify\\b',
    '\\blint\\b',
    '\\btypecheck\\b',
    '\\bbuild\\b',
    '\\bcommit\\b',
    '\\breview\\b',
    '\\brefactor\\b',
    '\\bplan\\b',
    'did\\s+you\\s+(follow|not|do|check|use|run|test)',
    "didn'?t\\s+you\\s+(follow|do|check|run)",
    'why\\s+(did|didn\'?t)\\s+you',
  ].join('|'),
  'i',
);

// ---------------------------------------------------------------- main

const argv = process.argv.slice(2);
const sessionFlag = argv.find((a) => a.startsWith('--session='));
const logsFlag = argv.find((a) => a.startsWith('--logs='));
const sessionArg = sessionFlag ? sessionFlag.slice('--session='.length) : null;
const logsPath = logsFlag ? logsFlag.slice('--logs='.length) : DEFAULT_LOGS;
const allFlag = argv.includes('--all');

if (!existsSync(logsPath)) {
  console.error(`No log file at ${logsPath}.`);
  console.error(`Start the collector: cd .observability && docker compose up -d`);
  process.exit(1);
}

const raw = readFileSync(logsPath, 'utf8').trim();
if (!raw) {
  console.error(`${logsPath} is empty — no events recorded yet.`);
  process.exit(1);
}

const records = parseLogRecords(raw);
if (records.length === 0) {
  console.error('Parsed zero log records. Is the collector wired up correctly?');
  process.exit(1);
}

const bySession = groupBy(records, (r) => r.sessionId);
const targetIds = sessionArg
  ? [sessionArg]
  : allFlag
    ? [...bySession.keys()]
    : [latestSessionId(bySession)];

mkdirSync(REPORTS_DIR, { recursive: true });

for (const sid of targetIds) {
  const events = bySession.get(sid);
  if (!events) {
    console.error(`Session ${sid} not found in ${logsPath}.`);
    continue;
  }
  events.sort((a, b) => a.time - b.time);
  const scored = scoreSession(events);
  const md = renderReport(sid, events, scored);
  const out = join(REPORTS_DIR, `conformance-${sid}.md`);
  writeFileSync(out, md);
  console.log(`Wrote ${out}  —  Harness Control: ${formatPct(scored.composite)}`);
}

// ---------------------------------------------------------------- scoring

function scoreSession(events) {
  // --- inventory ---
  const userPrompts = events.filter((e) => e.eventName === 'user_prompt');
  const toolResults = events.filter((e) => e.eventName === 'tool_result');
  const toolDecisions = events.filter((e) => e.eventName === 'tool_decision');
  const internalErrors = events.filter((e) => e.eventName === 'internal_error');
  const hookStarts = events.filter((e) => e.eventName === 'hook_execution_start');
  const harnessToolInputs = events.filter((e) => e.eventName === 'harness_tool_input');

  // --- 2. Stage trajectory ---
  const harnessSlashes = [];
  for (const p of userPrompts) {
    const prompt = p.attrs['prompt'] || '';
    const m = prompt.match(/^\/harness[:\/]([\w-]+)/);
    if (m) harnessSlashes.push({ stage: m[1], t: p.time, prompt });
  }
  const stageTrajectory = harnessSlashes.length > 0 ? 1 : 0;

  // --- 3. Correction rate (inverted) ---
  // Auto-prompts that aren't real user steering — exclude.
  const autoPromptRe = /^(\/compact|\/usage|\/help|\/clear)\b/;
  const realPrompts = userPrompts.filter((p) => !autoPromptRe.test(p.attrs['prompt'] || ''));
  const slashPrompts = realPrompts.filter((p) => (p.attrs['prompt'] || '').startsWith('/'));
  const corrections = realPrompts.filter((p) => !(p.attrs['prompt'] || '').startsWith('/'));
  const totalSteer = realPrompts.length;
  const correctionRate =
    totalSteer === 0 ? null : 1 - corrections.length / totalSteer;

  // --- 4. Harness-topic correction rate ---
  const topicCorrections = corrections.filter((c) =>
    HARNESS_TOPIC_REGEX.test(c.attrs['prompt'] || ''),
  );
  const harnessTopicCorrection =
    corrections.length === 0 ? null : 1 - topicCorrections.length / corrections.length;

  // --- 6. Tool error rate (inverted) ---
  const failedResults = toolResults.filter((r) => {
    const s = r.attrs['success'];
    return s === false || s === 'false' || s === 0 || s === '0';
  });
  const totalToolEvents = toolResults.length + internalErrors.length;
  const errCount = failedResults.length + internalErrors.length;
  const errRate = totalToolEvents === 0 ? 0 : errCount / totalToolEvents;
  // 0% errors → 1.0; 10% errors → 0.0 (clamped floor)
  const toolErrorRate = clamp(1 - errRate / 0.10, 0, 1);

  // --- 7. Hook engagement ---
  const hookEngagement = hookStarts.length > 0 ? 1 : 0;

  // --- 1. Skill-Read-Before-Action (requires harness_tool_input events) ---
  let skillReadBeforeAction = null;
  let triggers = [];
  if (harnessToolInputs.length > 0) {
    const toolActions = harnessToolInputs
      .map((e) => ({
        t: e.time,
        tool: e.attrs['tool_name'] || '',
        filePath: e.attrs['file_path'] || '',
        command: e.attrs['command'] || '',
      }))
      .sort((a, b) => a.t - b.t);

    const reads = toolActions
      .filter((a) => a.tool === 'Read' && a.filePath)
      .map((a) => ({ path: a.filePath, t: a.t }));

    for (const a of toolActions) {
      for (const rule of SKILL_TRIGGERS) {
        if (rule.isTrigger(a)) {
          const ok = reads.some(
            (r) => r.t <= a.t && r.path.endsWith(rule.requiredFile.split('/').pop()),
          );
          triggers.push({ rule: rule.name, file: rule.requiredFile, t: a.t, ok });
          break;
        }
      }
    }
    if (triggers.length > 0) {
      skillReadBeforeAction = triggers.filter((t) => t.ok).length / triggers.length;
    }
  }

  const scores = {
    skillReadBeforeAction,
    harnessTopicCorrection,
    stageTrajectory,
    correctionRate,
    toolErrorRate,
    hookEngagement,
  };

  // --- composite (skip nulls, renormalise weights) ---
  let num = 0;
  let den = 0;
  for (const [k, v] of Object.entries(scores)) {
    if (v == null) continue;
    num += v * WEIGHTS[k];
    den += WEIGHTS[k];
  }
  const composite = den === 0 ? null : num / den;

  return {
    scores,
    composite,
    evidence: {
      stages: harnessSlashes,
      totalSteer,
      slashCount: slashPrompts.length,
      correctionCount: corrections.length,
      topicCorrectionCount: topicCorrections.length,
      topicCorrections,
      toolResultCount: toolResults.length,
      toolDecisionCount: toolDecisions.length,
      failedToolCount: failedResults.length,
      internalErrorCount: internalErrors.length,
      hookStartCount: hookStarts.length,
      harnessToolInputCount: harnessToolInputs.length,
      triggers,
    },
  };
}

// ---------------------------------------------------------------- helpers

function isTestFile(p) {
  if (!p) return false;
  return /(^|\/)tests?\//.test(p) || /\.test\.[tj]sx?$/.test(p) || /\.spec\.[tj]sx?$/.test(p);
}

function isUiComponent(p) {
  if (!p) return false;
  return /\bsrc\/features\/[^/]+\/components\//.test(p) || /\bsrc\/shared\/ui\//.test(p);
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function formatPct(v) {
  if (v == null) return 'N/A';
  return `${(v * 100).toFixed(1)}%`;
}

function truncate(s, n) {
  if (!s) return '';
  return s.length > n ? s.slice(0, n) + '…' : s;
}

// ---------------------------------------------------------------- render

function renderReport(id, evts, scored) {
  const start = evts[0].time;
  const end = evts[evts.length - 1].time;
  const durationMin = ((end - start) / 60).toFixed(1);
  const { scores, composite, evidence } = scored;

  const rows = [
    [
      'Skill-Read-Before-Action coverage',
      scores.skillReadBeforeAction,
      WEIGHTS.skillReadBeforeAction,
      evidence.harnessToolInputCount === 0
        ? '_no `harness_tool_input` events — hook not installed on this session_'
        : `${evidence.triggers.filter((t) => t.ok).length} / ${evidence.triggers.length} triggers preceded by the required skill Read`,
    ],
    [
      'Harness-topic correction rate (inverted)',
      scores.harnessTopicCorrection,
      WEIGHTS.harnessTopicCorrection,
      evidence.correctionCount === 0
        ? 'no corrections issued — agent ran without steering'
        : `${evidence.topicCorrectionCount} of ${evidence.correctionCount} corrections matched harness-covered keywords`,
    ],
    [
      'Stage trajectory',
      scores.stageTrajectory,
      WEIGHTS.stageTrajectory,
      evidence.stages.length === 0
        ? 'no `/harness:*` slash command invoked'
        : `invoked: ${evidence.stages.map((s) => `\`/harness:${s.stage}\``).join(', ')}`,
    ],
    [
      'Correction rate (inverted)',
      scores.correctionRate,
      WEIGHTS.correctionRate,
      evidence.totalSteer === 0
        ? 'no user prompts'
        : `${evidence.correctionCount} corrections / ${evidence.totalSteer} prompts (${evidence.slashCount} slash, ${evidence.correctionCount} steer)`,
    ],
    [
      'Tool error rate (inverted)',
      scores.toolErrorRate,
      WEIGHTS.toolErrorRate,
      `${evidence.failedToolCount} failed tool_results + ${evidence.internalErrorCount} internal_errors / ${evidence.toolResultCount + evidence.internalErrorCount} total`,
    ],
    [
      'Hook engagement',
      scores.hookEngagement,
      WEIGHTS.hookEngagement,
      `${evidence.hookStartCount} hook_execution_start events`,
    ],
  ];

  const triggerLines = evidence.triggers.length === 0
    ? evidence.harnessToolInputCount === 0
      ? ['_no enriched tool events — install `.claude/hooks/log-tool-input.sh` and re-run a session_']
      : ['_no harness-governed triggers fired (no commits / no checks / no test or UI component writes)_']
    : evidence.triggers.map(
        (t) => `- ${t.ok ? '✓' : '✗'} ${t.rule} @ ${iso(t.t)} — needed \`${t.file}\``,
      );

  const topicCorrectionLines = evidence.topicCorrections.length === 0
    ? ['_none_']
    : evidence.topicCorrections.map(
        (c) => `- "${truncate(c.attrs['prompt'] || '', 100)}"`,
      );

  const stageLines = evidence.stages.length === 0
    ? ['_none_']
    : evidence.stages.map((s, i) => `${i + 1}. \`/harness:${s.stage}\` @ ${iso(s.t)}`);

  const lines = [
    `# Harness Conformance Report — ${id}`,
    ``,
    `- **Window:** ${iso(start)} → ${iso(end)}`,
    `- **Duration:** ${durationMin} min`,
    `- **Composite Harness Control:** **${formatPct(composite)}**`,
    ``,
    `## Parameters`,
    ``,
    `| # | Parameter | Score | Weight | Evidence |`,
    `|---|---|---|---|---|`,
    ...rows.map(
      ([name, s, w, ev], i) =>
        `| ${i + 1} | ${name} | ${formatPct(s)} | ${(w * 100).toFixed(0)}% | ${ev} |`,
    ),
    ``,
    `## Stage trajectory`,
    ``,
    ...stageLines,
    ``,
    `## Harness-topic corrections (the key signal)`,
    ``,
    `User corrections whose text matched harness-covered keywords. Each one is a place where the harness instructed something and the agent didn't deliver:`,
    ``,
    ...topicCorrectionLines,
    ``,
    `## Skill-Read-Before-Action trace`,
    ``,
    ...triggerLines,
    ``,
    `## Notes`,
    ``,
    `- \`N/A\` means the trigger for that parameter never fired in this session (e.g. no corrections → no harness-topic-correction score).`,
    `- The composite re-normalises weights over only the parameters that produced a score.`,
    `- **Skill-Read-Before-Action requires \`.claude/hooks/log-tool-input.sh\`** to be installed; Claude Code's built-in tool events redact arguments. Without the hook, that metric is permanently N/A.`,
    ``,
    `---`,
    `Generated by \`.evals/judges/conformance.mjs\``,
  ];
  return lines.join('\n') + '\n';
}

// ---------------------------------------------------------------- parse (mirrors run-report.mjs)

function parseLogRecords(text) {
  const out = [];
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    let payload;
    try {
      payload = JSON.parse(line);
    } catch {
      continue;
    }
    for (const rl of payload.resourceLogs || []) {
      const resourceAttrs = flattenAttrs(rl.resource?.attributes);
      for (const sl of rl.scopeLogs || []) {
        for (const lr of sl.logRecords || []) {
          const attrs = { ...resourceAttrs, ...flattenAttrs(lr.attributes) };
          out.push({
            time: Number(lr.timeUnixNano || lr.observedTimeUnixNano || 0) / 1e9,
            eventName:
              attrs['event.name'] ||
              attrs['log.name'] ||
              lr.body?.stringValue ||
              '(unnamed)',
            sessionId:
              attrs['session.id'] ||
              attrs['claude.session.id'] ||
              attrs['service.instance.id'] ||
              'unknown',
            attrs,
          });
        }
      }
    }
  }
  return out;
}

function flattenAttrs(attrs) {
  const out = {};
  for (const a of attrs || []) {
    const v = a.value || {};
    out[a.key] =
      v.stringValue ??
      v.intValue ??
      v.boolValue ??
      v.doubleValue ??
      (v.arrayValue ? JSON.stringify(v.arrayValue) : undefined);
  }
  return out;
}

function groupBy(items, keyFn) {
  const map = new Map();
  for (const it of items) {
    const k = keyFn(it);
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(it);
  }
  return map;
}

function latestSessionId(map) {
  let bestId = null;
  let bestT = -Infinity;
  for (const [id, evts] of map) {
    const lastT = evts.reduce((acc, e) => Math.max(acc, e.time), -Infinity);
    if (lastT > bestT) {
      bestT = lastT;
      bestId = id;
    }
  }
  return bestId;
}

function iso(epochSeconds) {
  return new Date(epochSeconds * 1000).toISOString();
}
