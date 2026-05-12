# Accessing GitHub

How to read and write GitHub artifacts (PRs, comments, issues, branches) from the harness. Used by review, apply-fixes, and housekeeping stages.

## Tooling

Prefer **`gh` CLI** when installed (most environments). Fall back to the **GitHub MCP server** if one is configured but `gh` is not available.

Check availability:

```bash
command -v gh && gh auth status
```

If neither is available, ask the human to install `gh` (https://cli.github.com/) or wire up a GitHub MCP server before proceeding.

## Quick reference — `gh` CLI

| Need | Command |
|---|---|
| Read the current PR (auto-detects branch) | `gh pr view --json number,title,state,body,reviewDecision` |
| List all comments on the current PR | `gh pr view --json comments,reviews,reviewThreads` |
| Read a specific PR | `gh pr view <number>` |
| Post a comment on the current PR | `gh pr comment --body-file <path>` |
| Post a reply on a review thread | `gh api repos/{owner}/{repo}/pulls/{pr}/comments/{comment_id}/replies -f body=...` |
| List PRs by author | `gh pr list --author <user>` |
| Read a single comment | `gh api repos/{owner}/{repo}/issues/comments/<id>` |
| Create a PR | `gh pr create --title ... --body-file ...` |
| Branch + commit info | `gh api repos/{owner}/{repo}/branches/<name>` |

The repo and owner are inferred from the current git remote. Run inside the working tree.

## Quick reference — GitHub MCP server (alternative)

If a GitHub MCP server is wired up (look for one named `github` or similar in your runtime), use its tools:

- `pull_request_read` — read a PR.
- `list_pull_requests` — list PRs on a repo.
- `search_pull_requests` — search PRs (use this for "by author" queries).
- `create_pull_request` — open a PR.
- `list_issues` / `issue_read` / `search_issues` — issue operations.
- `list_branches` / `list_commits` / `get_commit` — branch/commit info.
- `search_code` — code search across the repo.

The MCP tools require `owner` and `repo` arguments explicitly — pass them on every call.

## Reading PR comments for apply-fixes (004)

The fixer agent (`harness/dev-workflow/004_apply_fixes.md`) needs the full comment thread tree, not just the top-level body. Use:

```bash
gh pr view --json comments,reviews,reviewThreads
```

This returns:

- `comments` — top-level issue comments on the PR.
- `reviews` — review summaries posted via `gh pr review`.
- `reviewThreads` — inline review threads with their nested comments, including `isResolved` state and the original file/line.

Each comment carries a `url` field — use that as the stable reference in the fix list (per `004_apply_fixes.md` Step 3).

## Done

You have the comment data needed for the calling stage. Return to the workflow that brought you here.
