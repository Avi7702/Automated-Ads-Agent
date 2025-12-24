---
name: warn-console-log
enabled: true
event: file
pattern: console\.(log|warn|error|info|debug)\(
action: warn
---

## Console Statement Detected

You're adding a `console.log` (or similar) statement to the code.

**Why this matters:**
- Debug logs shouldn't ship to production
- Console output can expose sensitive data
- Impacts browser/Node.js performance
- Clutters developer console

**Alternatives:**
- Use a proper logging library (winston, pino, etc.)
- Use conditional debug builds
- Remove before committing
- Use debugger breakpoints instead

If this is intentional debugging, remember to remove it before committing.
