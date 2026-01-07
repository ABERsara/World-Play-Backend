FROM node:20-alpine
WORKDIR /usr/src/app

RUN apk add --no-cache openssl

COPY package.json ./
COPY packages/server/package*.json ./packages/server/
COPY packages/shared/package*.json ./packages/shared/

ENV NODE_TLS_REJECT_UNAUTHORIZED=0
RUN npm install

COPY packages/shared/ ./packages/shared/
COPY packages/server/ ./packages/server/

RUN npx prisma generate --schema=./packages/server/prisma/schema.prisma

WORKDIR /usr/src/app/packages/server

# שינוי לפורט 8080
EXPOSE 8080

CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]