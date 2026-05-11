# Run App Locally

Start the dev server and interact with the running app via a browser.

This skill assumes a Vite-based stack (React, Vue, Svelte, etc.). If your project uses a different dev server, adapt Step 1 — the rest is framework-neutral.

---

## Step 1 — Start the Dev Server

Before starting, check existing terminals for a dev server already running on port 5173. If one exists and is healthy, skip to Step 2.

```bash
npm run dev
```

Background this immediately (`block_until_ms: 0`). Wait for the `Local:` log line before proceeding — this is what Vite prints when it's ready:

```
➜  Local:   http://localhost:5173/
```

Use the await pattern `Local:\s+http://localhost:\d+` to detect readiness.

**Port conflicts:** If port 5173 is already in use, Vite auto-increments (5174, 5175, …) and prints `Port 5173 is in use, trying another one...`. Always parse the actual port from the `Local:` line rather than assuming 5173. To avoid surprises, kill the stale process first:

```bash
lsof -ti:5173 | xargs kill -9 2>/dev/null
```

Environment variables are loaded from `.env` by Vite — do not source manually.

---

## Step 2 — Open a Browser

Use whichever browser MCP is available in the current session:

| MCP | Navigate tool |
|-----|---------------|
| **Playwright** (`user-playwright`) | `playwright_navigate` → `url: "http://localhost:5173"` |
| **Cursor Browser** (`cursor-ide-browser`) | `browser_navigate` → `url: "http://localhost:5173"` |
| **Chrome DevTools** (`chrome-devtools`) | `mcp__chrome-devtools__navigate_page` → `url: "http://localhost:5173"` |

Use the port from Step 1 if it differed from 5173.

---

## Step 3 — Log In (skip if your app has no auth)

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
| Port already in use | `lsof -ti:5173 \| xargs kill -9` |
| Vite picked a different port | Read the `Local:` log line for the actual port |
| Login fails | Verify `LOCAL_DEV_USER` / `LOCAL_DEV_PASSWORD` are set in `.env` |
| `echo $LOCAL_DEV_USER` is empty | Expected — `.env` is not shell-exported. Use `grep` |
| Browser cannot reach localhost | Ensure `npm run dev` has finished starting (look for `Local:`) |
