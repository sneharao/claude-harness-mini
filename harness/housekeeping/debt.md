# Technical Debt

Known technical debt, prioritised by impact. Cross-references ADRs where relevant.

> **Note:** Specific counts (file counts, occurrence counts, lint error totals) are intentionally omitted — they go stale silently and create false precision. Each entry uses a qualitative tier instead. Re-survey when prioritising work.
>
> **Tiers:** `widespread` — affects the majority of files in the area; `scattered` — affects multiple files but not the majority; `isolated` — one or a handful of specific files.

## Entry format

```
### <Short title>

- **Tier:** <widespread | scattered | isolated>
- **Last surveyed:** YYYY-MM-DD
- **Description:** <What the debt is, and why it matters.>
- **Skills referencing this gap:** <Optional: harness skills that note this debt with a `(planned)` step.>
- **Action when ready:** <Concrete next step to resolve, in one or two sentences.>
```

Update `Last surveyed` whenever the housekeeping stage (`005_housekeeping.md`) touches an entry.

## High Priority

<!-- High-impact debt that materially affects new work. -->

## Medium Priority

<!-- Debt worth addressing but not blocking. -->

## Low Priority

<!-- Background debt — track so it does not disappear, but no near-term action expected. -->

## Resolved

<!-- Move entries here once `005_housekeeping.md` confirms a PR fully resolved them. Keep the entry for one or two release cycles, then prune. -->
