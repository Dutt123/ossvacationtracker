FROM node:18-alpine

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./
COPY server/package*.json ./server/
COPY client/package*.json ./client/

# Install dependencies
RUN npm install --prefix server --production
RUN npm install --prefix client

# Copy source code
COPY server/ ./server/
COPY client/ ./client/

# Build the client
RUN cd client && npm run build

# Remove client source and node_modules but keep dist folder
RUN rm -rf client/src client/node_modules client/package*.json client/index.html client/vite.config.js

# Set environment
ENV NODE_ENV=production

# Expose port 3000
EXPOSE 3000

# Start the server
CMD ["node", "server/index.js"]