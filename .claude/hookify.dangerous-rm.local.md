---
name: warn-dangerous-rm
enabled: true
event: bash
pattern: rm\s+(-[a-zA-Z]*r[a-zA-Z]*\s+-[a-zA-Z]*f|rm\s+-[a-zA-Z]*f[a-zA-Z]*\s+-[a-zA-Z]*r|-rf|-fr)\s
action: warn
---

## Dangerous rm Command Detected

You're about to run a recursive force delete command (`rm -rf`).

**Why this is risky:**
- Deletes files permanently (no trash/recycle bin)
- Recursive deletion can wipe entire directories
- No confirmation prompt
- Typos can be catastrophic

**Before proceeding:**
- Double-check the target path
- Consider using `trash` or moving to a temp directory first
- Make sure you have backups if needed

Are you sure this is the correct path?
