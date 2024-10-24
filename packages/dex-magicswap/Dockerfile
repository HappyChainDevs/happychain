# syntax = docker/dockerfile:1

FROM node:20-slim as base

LABEL fly_launch_runtime="Remix"

# Remix app lives here
WORKDIR /app

# Set production environment
ENV NODE_ENV="production"

# Throw-away build stage to reduce size of final image
FROM base as build

# Install packages needed to build node modules
# Install pnpm and curl for dependencies in @sushiswap/chains
RUN apt-get update -qq && \
  apt-get install -y build-essential pkg-config python-is-python3 curl
RUN npm install -g pnpm

# Copy application code
COPY --link . .

# Install dependencies
RUN npm install --include=dev

# Set environment variables
ARG MAGICSWAPV2_API_URL
ENV MAGICSWAPV2_API_URL=${MAGICSWAPV2_API_URL}

# Run code generation
RUN npm run generate

# Build application
RUN npm run build

# Remove development dependencies
# Disabled because GraphQL codegen has extra dependencies
# RUN npm prune --omit=dev

# Final stage for app image
FROM base

# Copy built application
COPY --from=build /app /app

# Install ca-certificates package to fix TLS verify
RUN apt-get -y update && apt-get -y install ca-certificates

# Start the server by default, this can be overwritten at runtime
EXPOSE 3000
CMD [ "npm", "run", "start" ]
