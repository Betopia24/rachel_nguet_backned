# ==========================================
# Stage 1: Build & Prepare
# ==========================================
FROM node:20-alpine AS builder

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

WORKDIR /app

# Install all dependencies (including devDependencies for build)
COPY package*.json ./
COPY prisma ./prisma/
RUN npm install

# Copy source code and config
COPY tsconfig.json ./
COPY src ./src/

# Generate Prisma Client & compile TypeScript
RUN npm run build

# Remove devDependencies to minimize image size
RUN npm prune --production

# ==========================================
# Stage 2: Production Runner
# ==========================================
FROM node:20-alpine AS runner

RUN apk add --no-cache openssl

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5289

# Copy built application and pruned production dependencies
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/assets ./dist/assets

# Expose port 5289
EXPOSE 5289

# Start production server
CMD ["node", "dist/server.js"]
