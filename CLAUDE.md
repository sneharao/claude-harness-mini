@AGENTS.md

> Claude Code reads `CLAUDE.md` at session start. `AGENTS.md` is the cross-tool entry point that other assistants (Cursor, Cline, Aider, etc.) also recognise. Keeping the real content in `AGENTS.md` and importing it here means there is exactly one source of truth — change `AGENTS.md`, every tool picks it up.
