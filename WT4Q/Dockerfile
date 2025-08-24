# syntax=docker/dockerfile:1.7
# --- builder ---
FROM node:20-alpine AS build
WORKDIR /app
ENV NODE_ENV=development
ENV NEXT_TELEMETRY_DISABLED=1

# Install deps (reproducible)
COPY package*.json ./
RUN npm ci

# Build
COPY . .
RUN npm run build

# Prune devDependencies to shrink node_modules for runtime
RUN npm prune --omit=dev

# --- runner ---
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

# Copy only what runtime needs
COPY --chown=node:node package*.json ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/.next ./.next
COPY --from=build --chown=node:node /app/public ./public

USER node
EXPOSE 3000
CMD ["npm", "run", "start"]
