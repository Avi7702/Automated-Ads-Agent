---
name: block-force-push
enabled: true
event: bash
pattern: git\s+push\s+.*(-f|--force)
action: warn
---

## Force Push Detected

You're about to force push to a remote repository.

**Why this is dangerous:**
- Overwrites remote history
- Can destroy teammates' work
- May break CI/CD pipelines
- Difficult to recover from

**Before proceeding:**
- Is this a shared branch? (main, master, develop)
- Have you communicated with your team?
- Consider `--force-with-lease` as a safer alternative

**Safer alternatives:**
```bash
git push --force-with-lease  # Only force if no new commits
git push origin +feature-branch  # Force only specific branch
```

If this is your personal feature branch and you understand the risks, proceed carefully.
