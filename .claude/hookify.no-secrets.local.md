---
name: warn-hardcoded-secrets
enabled: true
event: file
pattern: (api[_-]?key|apikey|secret[_-]?key|password|passwd|auth[_-]?token|access[_-]?token|private[_-]?key)\s*[:=]\s*['"`][A-Za-z0-9+/=_-]{16,}['"`]
action: warn
---

## Potential Hardcoded Secret Detected

You may be adding a hardcoded secret, API key, or password to the code.

**Why this is a security risk:**
- Secrets in code get committed to version control
- They persist in git history even after removal
- Anyone with repo access can see them
- Bots actively scan public repos for leaked keys

**Best practices:**
- Use environment variables: `process.env.API_KEY`
- Use a secrets manager (AWS Secrets Manager, HashiCorp Vault)
- Use `.env` files (excluded from git)
- Use placeholder values in committed code

**If this is a placeholder:**
- Use obvious fake values: `"your-api-key-here"`, `"REPLACE_ME"`
- Add a comment explaining it needs configuration

Double-check that you're not committing real credentials.
