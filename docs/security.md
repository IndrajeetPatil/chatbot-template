# Security

[Documentation](README.md) · [Project overview](../README.md)

## Credentials and deployment

| Boundary          | Requirement                                                                              |
| ----------------- | ---------------------------------------------------------------------------------------- |
| Azure credentials | Backend environment only; never commit `backend/.env`                                    |
| Browser requests  | Same-origin `/api/v1/chat` proxy; no Azure key in browser code                           |
| Access control    | Authentication and authorization are not implemented; add them before exposure           |
| Network           | Compose publishes ports 3000 and 8000; review exposure, allowed origins, and rate limits |
| CORS              | Origin policy, not authentication or access control                                      |
| TLS / HSTS        | Configure where TLS terminates                                                           |

See [backend configuration](backend.md#configuration) and the
[nginx configuration](../frontend/frontend.nginx.conf) for the relevant controls.

## Rendering and request boundaries

| Surface    | Enforced behavior                                               |
| ---------- | --------------------------------------------------------------- |
| Markdown   | Raw HTML disabled; ESLint blocks `dangerouslySetInnerHTML`      |
| KaTeX      | Trusted commands disabled; fonts/styles bundled locally         |
| Requests   | Message count and text length validated before streaming        |
| Rate limit | Configurable; defaults to 10 requests/minute per client address |
| nginx      | Response headers, caching, compression, proxying                |

Preserve these restrictions when changing rendering or transport. See the
[API contract](backend.md#api) for limits and errors.

## Supply chain

- Pin every downloaded third-party tool, script, and binary to a specific version.
- Validate SHA256 checksums; never download latest or untagged tools.
- Keep image digests, installer checksums, lockfiles, and documentation aligned.

## Automated scans

| Check                        | Scope                                                         | Local command / location       |
| ---------------------------- | ------------------------------------------------------------- | ------------------------------ |
| Checkov                      | Dockerfiles, Compose/YAML, Actions, secrets surface           | `make security-scan`           |
| Gitleaks                     | All fetched Git history, including PR history; redacted SARIF | `make secret-scan-ci` (Docker) |
| zizmor                       | Online GitHub Actions audit                                   | Security Scan workflow         |
| Production dependency audits | Frontend and backend dependencies                             | Security Scan workflow         |
| Trivy                        | Built frontend/backend images                                 | Container build workflow       |
| Commitlint                   | Conventional commit messages                                  | Local `commit-msg` hook        |

- Security Scan runs on pushes and PRs to `main`, weekly, and on manual dispatch.
- Gitleaks uses a digest-pinned scanner and uploads redacted SARIF artifacts.
- Checkov excludes `backend/.env`: it is required locally and must stay uncommitted.
