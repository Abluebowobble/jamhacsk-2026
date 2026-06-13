# Hestia backend (Fastify) container image.
# Node 22 (not 20): @supabase/supabase-js needs a native global WebSocket,
# which only exists from Node 22 onward.
FROM node:22-alpine

WORKDIR /app

# Install production deps first (better layer caching).
COPY package*.json ./
RUN npm ci --omit=dev

# App source. .env is NOT copied — it's provided at runtime via compose env_file.
COPY src ./src

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "src/server.js"]
