FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN apk add --no-cache python3 py3-pip ffmpeg git
RUN npm install

COPY . .

CMD ["npm", "run", "dev"]