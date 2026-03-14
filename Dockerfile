FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy source
COPY . .

# Expose port
EXPOSE 3001

# Start
CMD ["node", "index.js"]
