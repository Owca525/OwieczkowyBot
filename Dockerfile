FROM node:current-alpine AS builder

WORKDIR /app

RUN apk add --no-cache \
    python3 \
    py3-pip \
    ffmpeg \
    git \
    make \
    g++

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build


FROM node:current-alpine

WORKDIR /app

RUN apk add --no-cache ffmpeg python3 deno

COPY --from=builder /app/dist ./

CMD ["node", "index.js"]