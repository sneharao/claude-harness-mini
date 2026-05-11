# Write an ADR

## When to use this skill

Capture one load-bearing architectural decision. Invoke when:

- The human overrides the default architecture at design time (e.g. "start with onion, not vertical slices").
- Slice-consolidation smells emerge during planning (3+ slices sharing a piece of logic; growing shared kernel; cross-context coupling). The decision to extract layers / introduce ports / migrate the shape is the ADR.
- An existing project's audit reveals an architecture that diverges from the harness default — ADR records *why* the divergence is accepted (or, alternatively, plans the migration back).
- Any framework, persistence, auth, or boundary decision that future contributors will reasonably ask "why?" about.

Do **not** write an ADR for choices a comment would cover. ADRs are for decisions that constrain future work.

## What you produce

A new file in `harness/knowledge/architecture-decision-records/` named `NNNN-<short-kebab-title>.md` (zero-padded, four digits). The ABOUT.md index updated to list it.

## Steps

### Step 1 — Read the template

Read `harness/knowledge/architecture-decision-records/ABOUT.md` in full. It defines the template and the status lifecycle (proposed → accepted → superseded). Do not deviate from the template.

### Step 2 — Determine the next ADR number

```bash
ls harness/knowledge/architecture-decision-records/ | grep -E '^[0-9]{4}-' | sort | tail -n 1
```

The next number is the highest existing + 1, zero-padded to four digits. If none exist yet, the next is `0001`.

### Step 3 — Establish context

Ask the human:

- What forced this decision? What constraint, requirement, or pain point made the previous approach inadequate?
- What specifically does the decision change?

Do not write yet — write only after the answers are clear enough to be self-explanatory to a future reader who lacks the current conversation's context.

### Step 4 — Surface alternatives

Ask the human: what else did we consider, and why did we not pick it? Even if there was no formal alternatives review, name the obvious other options (do nothing, alternative library/pattern/shape). For each, one sentence on why not.

If the answer is "we didn't consider anything else," push back gently: "Then how do we know this is the right call?" The conversation usually surfaces 1–2 alternatives that were tacitly rejected.

### Step 5 — Spell out consequences

Ask: what changes as a result? What gets easier, what gets harder, what migration cost is implied, what are we now committed to that we can't easily walk back?

Be concrete. "Improves maintainability" is not a consequence. "Removes the `shared/utils.ts` bucket; introduces 3 new files under `application/`; requires moving 2 existing feature handlers" — that is.

### Step 6 — Write the ADR

Create the file at `harness/knowledge/architecture-decision-records/NNNN-<title>.md`. Use the exact template from `ABOUT.md` § Template. Fill in:

- **Title** — short, declarative. "Adopt onion architecture for backend." Not "Architecture changes."
- **Status** — `proposed` initially. Move to `accepted` only after the human explicitly confirms.
- **Date** — today's date in `YYYY-MM-DD`.
- **Deciders** — the human (and any teammates they name).
- **Context, Decision, Alternatives, Consequences** — from Steps 3–5.
- **Follow-ups** — concrete work items this ADR creates (files to move, conventions to add). Optional; if the migration is non-trivial, defer to a plan and link to it.

Keep it ≤ 2 pages. If it exceeds that, you are documenting an implementation. Split: ADR captures the decision; an exec-plan under `harness/exec-plans/` captures the migration.

### Step 7 — Update the index

Edit `harness/knowledge/architecture-decision-records/ABOUT.md`. Add a row to the Index table:

| <NNNN> | <Title> | <Status> | <Supersedes — usually empty> |

If the new ADR supersedes a previous one, also update the previous ADR's status to `superseded by ADR-NNNN` and add the link.

### Step 8 — Confirm acceptance

Show the human the written ADR. Ask: *Accept as written, or revise?*

- **Accept** → change the status from `proposed` to `accepted` in the file. Update the index status.
- **Revise** → iterate on Steps 3–6 until accepted.

Once accepted, the document is frozen. Future change happens via a *new* ADR that supersedes this one.

### Step 9 — Commit

Stage both the new ADR and the updated index:

```bash
git add harness/knowledge/architecture-decision-records/
git commit
```

If you are running inside another flow (000_design, 001_plan, init-harness), return control to the caller after the commit — that flow may have more steps.

## Done

The ADR file exists, the index references it, status is `accepted`, and the change is committed. The decision is now durable across sessions.
