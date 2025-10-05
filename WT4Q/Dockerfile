# Build stage
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
# Use npm ci for reproducible installs based on lockfile
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app .
EXPOSE 3000

CMD ["npm", "run", "start"]

