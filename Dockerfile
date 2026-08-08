FROM node:20-slim

# Install Python 3 + pip
RUN apt-get update && \
    apt-get install -y python3 python3-pip --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY tools/requirements.txt ./tools/
RUN pip3 install -r tools/requirements.txt --break-system-packages

# Install Node dependencies
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

EXPOSE 8080

CMD ["npm", "run", "start"]
