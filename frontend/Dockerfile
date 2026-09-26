# Vite+ provisions Node from .node-version and pnpm from packageManager.
FROM ghcr.io/voidzero-dev/vite-plus:1.0.0-rc.1@sha256:6e65aa316696591c8eb52eb23ba48003805836bcd77aa84a08a2f26da30a5b42 AS builder

WORKDIR /app

COPY --chown=vp:vp package.json pnpm-lock.yaml pnpm-workspace.yaml .node-version ./
RUN vp install --frozen-lockfile

COPY --chown=vp:vp . .

RUN vp build

FROM debian:trixie-slim@sha256:a99cfc517144bc59b1978475ec53b46ecabec7e43635402ee5b77cc54cd1b20a

# Upgrade perl-base until the pinned base includes Debian's Perl security fixes.
RUN apt-get update && apt-get install -y --no-install-recommends nginx-light perl-base \
    && rm -rf /var/lib/apt/lists/*

COPY frontend.nginx.conf /etc/nginx/nginx.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 3000

RUN mkdir -p /tmp/nginx/client-body /tmp/nginx/proxy /tmp/nginx/fastcgi /tmp/nginx/uwsgi /tmp/nginx/scgi \
    && chown -R www-data:www-data /tmp/nginx /var/log/nginx /var/lib/nginx /usr/share/nginx/html

USER www-data

CMD ["nginx", "-g", "daemon off;"]
