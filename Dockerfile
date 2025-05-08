FROM node:24-slim AS build

WORKDIR /app

# Copy package files first for better caching
COPY package.json package-lock.json ./
RUN npm ci

# Copy the rest including .env file
COPY . .

# Create .env if it doesn't exist
RUN if [ ! -f .env ]; then echo "PUBLIC_API_URL=http://api:8080" > .env; fi

# Generate the environment module before building
RUN npx svelte-kit sync

# Build the application
RUN npm run build

# Runtime image
FROM node:24-slim AS runtime

WORKDIR /app

# Environment variables
ENV NODE_ENV=production
ENV PORT=3000
# For runtime environment variables
ENV PUBLIC_API_URL=http://api:8080

# Copy files from build stage
COPY --from=build /app/package*.json ./
COPY --from=build /app/build ./build

# Install production dependencies only
RUN npm ci --omit=dev

# Expose port
EXPOSE 3000

# Start command
CMD ["node", "build"]