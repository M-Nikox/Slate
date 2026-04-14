# Security Policy

## Supported Versions

Security fixes are applied to the latest released version of Slate.

| Version | Supported |
|---|---|
| Latest release | ✅ |
| Older releases | ❌ |

## Reporting a Vulnerability

If you believe you found a real vulnerability, please report it privately first (GitHub Security Advisory preferred).

For non-sensitive security improvements (hardening, dependency bumps, policy/docs updates), you may open a normal issue or PR and use the `security` label.
Please include:

- A clear description of the issue
- Steps to reproduce
- Potential impact
- Suggested mitigation (if known)

## What to Expect

After a report is received:

1. Initial acknowledgment target: **within 72 hours**
2. Triage and impact assessment
3. Fix development and validation
4. Coordinated disclosure in a release note/changelog entry

## Scope

Please report issues involving:

- Arbitrary file write/rename outside intended folder scope
- Path traversal or unsafe path handling
- Privilege boundary or IPC abuse
- Dependency vulnerabilities with practical impact

## Disclosure Policy

Please do **not** publicly disclose vulnerabilities before a fix is available and users have had a reasonable opportunity to update.
