FROM node:24-alpine AS base

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS dependencies

COPY package.json package-lock.json ./
RUN npm ci

FROM dependencies AS development

COPY . ./

EXPOSE 3000
CMD ["npm", "run", "dev"]

FROM dependencies AS builder

ARG NEXT_PUBLIC_WORDPRESS_URL=https://api.kadochi.com
ARG NEXT_PUBLIC_GA_ID

ENV NODE_ENV=production
ENV NEXT_PUBLIC_WORDPRESS_URL=${NEXT_PUBLIC_WORDPRESS_URL}
ENV NEXT_PUBLIC_GA_ID=${NEXT_PUBLIC_GA_ID}

COPY . ./
RUN npm run build

FROM node:24-alpine AS production

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static

USER node

EXPOSE 3000
CMD ["node", "server.js"]
