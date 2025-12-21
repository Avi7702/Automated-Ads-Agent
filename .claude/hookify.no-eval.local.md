---
name: warn-eval
enabled: true
event: file
pattern: \beval\s*\(|new\s+Function\s*\(|setTimeout\s*\(\s*['"`]|setInterval\s*\(\s*['"`]
action: warn
---

## Security Risk: Dynamic Code Execution

You're adding code that executes strings as code (`eval`, `new Function`, etc.).

**Why this is dangerous:**
- **Code injection vulnerability** - attackers can execute arbitrary code
- Makes code harder to analyze and debug
- Prevents JavaScript engine optimizations
- Often flagged by security scanners

**Common vulnerable patterns:**
- `eval(userInput)` - Never do this!
- `new Function('return ' + data)` - Same risk
- `setTimeout("code", 100)` - Use function instead

**Safer alternatives:**
- `JSON.parse()` for parsing JSON data
- Object property access: `obj[key]` instead of `eval('obj.' + key)`
- Use a proper parser for expressions
- Refactor to avoid dynamic code execution

If this is absolutely necessary, ensure input is strictly validated and sanitized.
