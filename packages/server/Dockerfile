FROM node:20-alpine

WORKDIR /usr/src/app

ENV NODE_TLS_REJECT_UNAUTHORIZED=0

RUN apk add --no-cache openssl

COPY package*.json ./

RUN npm install

COPY . .

RUN npx prisma generate

EXPOSE ${PORT}

CMD ["npm", "start"]