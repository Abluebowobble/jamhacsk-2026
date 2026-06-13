# Hestia backend (Fastify) container image.
FROM node:20-alpine

WORKDIR /app

# Install production deps first (better layer caching).
COPY package*.json ./
RUN npm ci --omit=dev

# App source. .env is NOT copied — it's provided at runtime via compose env_file.
COPY src ./src

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "src/server.js"]
