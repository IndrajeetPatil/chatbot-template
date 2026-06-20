FROM node:24-trixie-slim@sha256:287c662bed62f3c7b68ea68544814eaff9d7ed2254d2fc9627f2df5957bb7401 AS builder

# Activate the package manager declared in package.json.
RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm run build

FROM debian:trixie-slim@sha256:4e401d95de7083948053197a9c3913343cd06b706bf15eb6a0c3ccd26f436a0e

RUN apt-get update && apt-get install -y --no-install-recommends nginx-light \
    && rm -rf /var/lib/apt/lists/*

COPY frontend.nginx.conf /etc/nginx/nginx.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 3000

RUN mkdir -p /tmp/nginx/client-body /tmp/nginx/proxy /tmp/nginx/fastcgi /tmp/nginx/uwsgi /tmp/nginx/scgi \
    && chown -R www-data:www-data /tmp/nginx /var/log/nginx /var/lib/nginx /usr/share/nginx/html

USER www-data

CMD ["nginx", "-g", "daemon off;"]
