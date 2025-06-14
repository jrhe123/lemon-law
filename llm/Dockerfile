FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000
EXPOSE 3001

COPY ./src/lemon_rules.json ./dist/lemon_rules.json

CMD ["npm", "run", "dev"] 