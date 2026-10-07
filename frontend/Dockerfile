# Vite+ provisions Node from .node-version and pnpm from packageManager.
FROM ghcr.io/voidzero-dev/vite-plus:1.1.0@sha256:15dedad6ab1f100c096aaebac6b0fb40ccf1f3dd0dd0169141e2a56588489b60 AS builder

WORKDIR /app

COPY --chown=vp:vp package.json pnpm-lock.yaml pnpm-workspace.yaml .node-version ./
RUN vp install --frozen-lockfile

COPY --chown=vp:vp . .

RUN vp build

FROM debian:trixie-slim@sha256:a29215f6a35e51e22adffa17f89e9d2ef06214e64a2bad10d765c46aea49f11f

RUN apt-get update && apt-get install -y --no-install-recommends nginx-light \
    && rm -rf /var/lib/apt/lists/*

COPY frontend.nginx.conf /etc/nginx/nginx.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 3000

RUN mkdir -p /tmp/nginx/client-body /tmp/nginx/proxy /tmp/nginx/fastcgi /tmp/nginx/uwsgi /tmp/nginx/scgi \
    && chown -R www-data:www-data /tmp/nginx /var/log/nginx /var/lib/nginx /usr/share/nginx/html

USER www-data

CMD ["nginx", "-g", "daemon off;"]
