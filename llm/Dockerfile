FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build

COPY src/full_game_catalog.docx dist/full_game_catalog.docx

EXPOSE 3002

CMD ["node", "dist/index.js"] 