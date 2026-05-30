FROM node:20

WORKDIR /app

RUN apt-get update && apt-get install -y docker.io && rm -rf /var/lib/apt/lists/*

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3001

CMD ["node", "server.js"]
