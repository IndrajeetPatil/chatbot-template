FROM node:24-trixie-slim@sha256:8ec5d7557396cfe32d21c3f9c13072355ceab22b584578ca4bb28af31120cffe AS builder

# Activate the package manager declared in package.json.
RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm run build

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
