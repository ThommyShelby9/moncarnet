FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS dependances
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS construction
COPY --from=dependances /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_APP_NAME=Gbè
ENV NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

FROM node:22-alpine AS execution
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup -S sante && adduser -S sante -G sante
COPY --from=construction /app/public ./public
COPY --from=construction --chown=sante:sante /app/.next/standalone ./
COPY --from=construction --chown=sante:sante /app/.next/static ./.next/static
COPY --from=construction /app/drizzle ./drizzle
USER sante
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s CMD wget -qO- http://127.0.0.1:3000/api/sante || exit 1
CMD ["node", "server.js"]
