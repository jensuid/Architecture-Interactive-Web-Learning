That error means the old task’s conversation history contains an item the API can no longer parse — usually because the accumulated context became too large or contains a malformed/oversized entry. The cryptic `untagged enum ResponseInput` message is just the API failing to match your history against its expected message formats.

**What to do:**

1. **Don’t keep retrying the old task** — every retry sends the same oversized/invalid history and fails again.
2. **Start a fresh thread** for the project. The files stay on disk; only the conversation resets.
3. **Write a handoff manually** if the old task can’t respond:
   - Project goal
   - What was already done
   - Files changed
   - What remains
   - Commands/tests already run
4. **Fork the old task** if your app lets you fork before the message where it broke — that may preserve useful context.
5. **Prevent it next time:**
   - Don’t paste entire files or huge logs into chat — let Codex read them from disk
   - Split big jobs into smaller tasks/threads
   - Periodically ask for a progress summary so you can restart cleanly

**Tip:** If this happens even in a brand-new task with a simple message, it’s a client bug — update Codex or report it with the column number from the error.

The short version: the old thread is effectively “corrupted” by its size. Move to a new one with a clean handoff summary.
