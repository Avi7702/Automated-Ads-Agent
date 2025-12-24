---
name: warn-sensitive-files
enabled: true
event: file
conditions:
  - field: file_path
    operator: regex_match
    pattern: \.(env|pem|key|secrets?)$|credentials|\.env\.|config\.local
---

## Sensitive File Edit Detected

You're editing a file that may contain secrets or credentials.

**Security checklist:**
- [ ] Is this file in `.gitignore`?
- [ ] Are you adding real credentials (not placeholders)?
- [ ] Could this accidentally be committed?

**Best practices:**
- Never commit real API keys, passwords, or tokens
- Use `.env.example` with placeholder values for documentation
- Store secrets in environment variables or secret managers
- Add sensitive file patterns to `.gitignore`

Proceed carefully with this file.
