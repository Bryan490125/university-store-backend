FROM node:22-alpine AS deps
WORKDIR /app
RUN apk add --no-cache openssl libc6-compat
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci && npx prisma generate

FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
RUN apk add --no-cache openssl libc6-compat
RUN addgroup -S app && adduser -S app -G app
RUN mkdir -p /home/app/.cache && chown -R app:app /home/app
COPY --chown=app:app --from=deps /app/node_modules ./node_modules
COPY --chown=app:app package*.json ./
COPY --chown=app:app prisma ./prisma
COPY --chown=app:app src ./src
USER app
EXPOSE 3000
CMD ["node", "src/server.js"]
