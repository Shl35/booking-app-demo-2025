FROM node:20-slim

WORKDIR /app

# Install openssl for security libs
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

COPY package*.json ./

RUN npm ci --only=production

COPY . .

# Expose port (Cloud providers like Railway/Render usually use PORT env)
EXPOSE 3001

CMD ["node", "server.js"]