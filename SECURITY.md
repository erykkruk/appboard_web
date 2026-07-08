# Security Policy

## Supported Versions

AppBoard Web is under active development. Only the latest minor release is supported with security fixes.

| Version | Supported          |
| ------- | ------------------ |
| `0.5.x` | :white_check_mark: |
| `< 0.5` | :x:                |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues, discussions, or pull requests.**

Instead, report them privately via GitHub's [private vulnerability reporting](https://github.com/erykkruk/appboard-web/security/advisories/new) for this repository.

When reporting, please include as much of the following information as possible:

- Type of issue (e.g. XSS, authentication bypass, CSRF, SSRF, session handling, secret exposure, etc.)
- Full paths of source file(s) related to the manifestation of the issue
- The location of the affected source code (tag/branch/commit or direct URL)
- Any special configuration required to reproduce the issue
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue, including how an attacker might exploit it

This information will help us triage your report more quickly.

## Disclosure Process

1. You submit a private vulnerability report
2. We acknowledge receipt within **72 hours**
3. We investigate and confirm the vulnerability
4. We develop and test a fix
5. We release the fix and publish an advisory
6. We credit you in the advisory (unless you prefer to remain anonymous)

We aim to resolve confirmed vulnerabilities within **90 days** of the initial report.

## Security Best Practices for Self-Hosting

If you self-host AppBoard Web, please follow these guidelines:

- **Serve over HTTPS in production** — terminate TLS at a reverse proxy (nginx, Caddy, Traefik). Better Auth uses `__Secure-` prefixed session cookies over HTTPS.
- **Point `BACKEND_URL` at a trusted backend** — the `/api/*` proxy forwards requests (including session cookies) to this host. Only set it to a backend you control.
- **Keep the backend private where possible** — let the admin panel's server-side proxy be the only public entry point, rather than exposing the backend directly.
- **Restrict the backend's `ALLOWED_ORIGINS`** — only include the exact origin of this admin panel.
- **Keep dependencies up to date** — watch releases and apply updates promptly.
- **Never commit secrets** — `.env` is gitignored; only `.env.example` is tracked.

## Scope

This policy covers the code in this repository (the AppBoard admin panel). Issues in the backend should be reported to the [AppBoard Backend](https://github.com/erykkruk/appboard-backend) repository. Vulnerabilities in third-party dependencies should be reported to the respective upstream projects; however, if you believe AppBoard Web is using a dependency in an unsafe way, please still report it here.
