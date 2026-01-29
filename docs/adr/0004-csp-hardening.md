# 4. Conditional Content Security Policy Per Environment

Date: 2026-01-29
Status: Accepted

## Context

The Content Security Policy (CSP) header in `server/app.ts` (lines 35-50) included `unsafe-inline` and `unsafe-eval` in the `scriptSrc` directive for all environments, including production. These directives were required during development for Vite's Hot Module Replacement (HMR), which injects inline scripts and uses `eval()` for fast module updates.

However, Vite production builds emit static JavaScript bundles with no inline scripts or eval. The `unsafe-*` directives were a development requirement that leaked into the production CSP, weakening XSS protection for all users.

## Decision

Apply conditional CSP based on `NODE_ENV`:

- **Production** (`NODE_ENV=production`): CSP strips `unsafe-inline` and `unsafe-eval` from `scriptSrc`. Only `'self'` and explicitly whitelisted CDN origins are allowed.
- **Development** (`NODE_ENV !== production`): CSP retains `unsafe-inline` and `unsafe-eval` for Vite HMR compatibility.

The change is localized to `server/app.ts` in the Helmet CSP configuration block. No frontend changes required -- Vite production builds already comply with the stricter policy.

## Consequences

**Positive:**

- Production is hardened against reflected and stored XSS attacks -- inline script injection is blocked by CSP
- Development workflow is unchanged -- Vite HMR continues to work
- No frontend code changes needed (Vite production output is CSP-compliant)
- Verifiable via: `curl -sI https://automated-ads-agent-production.up.railway.app | grep content-security-policy`

**Negative:**

- Any future production feature that requires inline scripts (e.g., third-party analytics snippets) must either use `nonce`-based CSP or be loaded from a whitelisted origin
- Developers must test CSP compliance when adding new script sources

**Mitigations:**

- CSP violation reports can be configured via `report-uri` directive for visibility into blocked resources
- The production CSP can be iteratively tightened (e.g., adding `strict-dynamic`, removing broad CDN wildcards) as the frontend stabilizes
