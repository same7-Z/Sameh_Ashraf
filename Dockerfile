# Base Node.js image with Linux tools
FROM node:20-bullseye-slim

# Install ffmpeg and python/curl for yt-dlp
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    curl \
    python3 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Download latest yt-dlp binary for Linux
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install --production

# Copy application files
COPY . .

# Ensure downloads directory exists
RUN mkdir -p downloads public

ENV PORT=3000
EXPOSE 3000

CMD ["node", "server.js"]
