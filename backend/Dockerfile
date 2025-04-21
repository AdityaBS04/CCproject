FROM node:16-alpine

WORKDIR /app

# Install system dependencies including Python
RUN apk add --no-cache docker-cli python3 py3-pip

COPY package*.json ./

RUN npm install

# Copy all files except node_modules
COPY . .

EXPOSE 5000

CMD ["npm", "start"]