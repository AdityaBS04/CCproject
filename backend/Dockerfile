FROM node:16-alpine

WORKDIR /app

# Install system dependencies for Docker client
RUN apk add --no-cache docker-cli

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 5000

CMD ["npm", "start"]