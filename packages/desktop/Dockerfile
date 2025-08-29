# Multi-stage build for Billing App Desktop
FROM node:18-alpine AS base

# Install dependencies for native modules and Electron
RUN apk add --no-cache python3 make g++ \
    && apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Development stage
FROM base AS development

# Expose port
EXPOSE 3000

# Start development server
CMD ["npm", "run", "dev"]

# Production stage
FROM base AS production

# Build the application
RUN npm run build

# Expose port
EXPOSE 3000

# Start production server
CMD ["npm", "start"]
