FROM node:24-alpine AS builder
WORKDIR /app
# Build tools needed for better-sqlite3 native compilation
RUN apk add --no-cache python3 make g++
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:24-alpine AS runner
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
RUN mkdir -p /data

ENV NODE_ENV=production
EXPOSE 4000
CMD ["node", "dist/index.js"]
