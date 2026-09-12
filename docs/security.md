# Security

[Documentation](README.md) · [Project overview](../README.md)

## Credentials and deployment

Store Azure credentials only in `backend/.env` or the deployment environment.
The local file is gitignored and must not be committed. Browser code uses the
same-origin `/api/v1/chat` proxy; it never needs the Azure key.

This template does not implement user authentication or authorization. Before
exposing a deployment, add access control and review TLS termination, allowed
origins, rate limits, and network exposure. The default Compose configuration
publishes both frontend port 3000 and backend port 8000. CORS is not access
control. See [backend configuration](backend.md#configuration).

## Rendering and request boundaries

Assistant replies render Markdown without raw HTML. Trusted KaTeX commands are
disabled, fonts and styles are bundled locally, and ESLint blocks
`dangerouslySetInnerHTML`. Preserve these restrictions when changing rendering.

The backend validates message counts and text lengths before streaming and
applies a configurable rate limit (10 requests/minute by default). See the
[API contract](backend.md#api) for limits and error behavior.

The [nginx configuration](../frontend/frontend.nginx.conf) defines response
headers, caching, compression, and proxy behavior. HSTS depends on where TLS
terminates and remains a deployment decision.

## Supply chain

All downloaded third-party tools, scripts, and binaries must be pinned to
specific versions and validated using SHA256 checksums. Never download latest
or untagged versions. Keep image digests, installer checksums, lockfiles, and
documented versions synchronized when upgrading.

## Automated scans

Checkov scans the repository's Dockerfiles, Docker Compose/YAML files,
GitHub Actions workflows, and secrets surface. Local-only secrets in
`backend/.env` are excluded because that file is required for development
and must not be committed:

``` bash
make security-scan
```

The dedicated GitHub Actions security workflow runs Checkov, a full-history
Gitleaks secret scan, an online zizmor workflow audit, and production dependency
audits on pushes and pull requests to `main`. Gitleaks scans all fetched history,
including on PRs, using a digest-pinned scanner and uploads a redacted SARIF
artifact. Its `make secret-scan-ci` target also runs locally with Docker. The
workflow also runs weekly and supports manual dispatch so newly disclosed issues
surface even when the repository has not changed. Commitlint is enforced locally
through the `commit-msg` prek hook.

Trivy scans the built backend and frontend container images for known
vulnerabilities during CI.
