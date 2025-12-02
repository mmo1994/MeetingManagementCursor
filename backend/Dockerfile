FROM node:20-alpine AS builder

WORKDIR /app

# Copy prisma schema first
COPY prisma/schema.prisma ./prisma/
COPY prisma/package.json ./prisma/

# Copy backend files
COPY backend/package*.json ./

# Install dependencies
RUN npm install

# Generate Prisma client
RUN npx prisma generate --schema=./prisma/schema.prisma

# Copy source code
COPY backend/src ./src
COPY backend/tsconfig.json ./

# Build
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY backend/package*.json ./

# Install production dependencies only
RUN npm install --production

# Copy prisma schema
COPY prisma/schema.prisma ./prisma/

# Generate Prisma client in production
RUN npx prisma generate --schema=./prisma/schema.prisma

# Copy built files
COPY --from=builder /app/dist ./dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

USER nodejs

EXPOSE 4000

# Run migrations and start server
CMD ["sh", "-c", "npx prisma migrate deploy --schema=./prisma/schema.prisma && node dist/index.js"]

