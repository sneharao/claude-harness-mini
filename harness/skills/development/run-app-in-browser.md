# Run App Locally

Start the dev server and interact with the running app via a browser.

This skill is stack-agnostic — it detects the dev-server profile from `package.json` and adjusts port and readiness signal accordingly. Profiles are currently provided for Next.js and Vite; extend the table in Step 1 for additional stacks.

---

## Step 1 — Detect the dev-server profile

Read `package.json`'s `scripts.dev` to determine which profile to use:

| `scripts.dev` contains | Profile | Default port | Ready regex |
|------------------------|---------|--------------|-------------|
| `next dev`             | Next.js | 3000         | `Local:\s+http://localhost:\d+` |
| `vite`                 | Vite    | 5173         | `Local:\s+http://localhost:\d+` |
| (anything else)        | Stop and ask the human which profile applies, then add a row to this table. | — | — |

Both Next.js and Vite print a `Local:` line when bound, so the readiness regex is shared. Always parse the **actual** port from the matched `Local:` line — both stacks may auto-increment on port conflict (Vite always; Next when the configured port is taken).

For the rest of this skill, `<PORT>` refers to the port parsed from the matched `Local:` line.

---

## Step 2 — Start the Dev Server

Before starting, check existing terminals for a dev server already running on the profile's default port. If one exists and is healthy, skip to Step 3.

```bash
npm run dev
```

Background this immediately (`block_until_ms: 0`). Wait for the profile's ready regex to match in the output before proceeding. Example ready lines:

- Next.js: `   - Local:        http://localhost:3000`
- Vite:    `  ➜  Local:   http://localhost:5173/`

**Port conflicts:** kill any stale process holding the profile's default port before starting:

```bash
lsof -ti:<default-port> | xargs kill -9 2>/dev/null
```

Environment variables are loaded by the framework — do not source `.env` manually.

---

## Step 3 — Open a Browser

Use whichever browser MCP is available in the current session. Substitute `<PORT>` with the port parsed in Step 2.

| MCP | Navigate tool |
|-----|---------------|
| **Playwright** (`user-playwright`) | `playwright_navigate` → `url: "http://localhost:<PORT>"` |
| **Cursor Browser** (`cursor-ide-browser`) | `browser_navigate` → `url: "http://localhost:<PORT>"` |
| **Chrome DevTools** (`chrome-devtools`) | `mcp__chrome-devtools__navigate_page` → `url: "http://localhost:<PORT>"` |

---

## Step 4 — Log In (skip if your app has no auth)

If the app gates pages behind login, dev credentials should be set in `.env`. The conventional names are:

| Field | Env var |
|-------|---------|
| Username / email | `LOCAL_DEV_USER` |
| Password | `LOCAL_DEV_PASSWORD` |

These vars are **not** exported to the shell. Parse them from `.env`:

```bash
grep '^LOCAL_DEV_USER=' .env | cut -d'=' -f2- | tr -d '"'
grep '^LOCAL_DEV_PASSWORD=' .env | cut -d'=' -f2- | tr -d '"'
```

Then fill the form with your browser MCP. After clicking submit, wait 2–3 seconds for the redirect and take a screenshot to confirm.

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Port already in use | `lsof -ti:<default-port> \| xargs kill -9` (use the profile's default port from Step 1) |
| Server picked a different port | Read the `Local:` log line for the actual port |
| Login fails | Verify `LOCAL_DEV_USER` / `LOCAL_DEV_PASSWORD` are set in `.env` |
| `echo $LOCAL_DEV_USER` is empty | Expected — `.env` is not shell-exported. Use `grep` |
| Browser cannot reach localhost | Ensure `npm run dev` has finished starting (look for `Local:`) |
| `scripts.dev` doesn't match any profile in Step 1 | Add a row to the table for your stack, or update the matching persona file |
