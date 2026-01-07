FROM node:20-bookworm

RUN apt-get update && apt-get install -y \
    python3 \
    build-essential \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

# 1. העתקת קבצי הגדרות
COPY package.json ./
COPY packages/media-server/package*.json ./packages/media-server/
COPY packages/server/prisma ./packages/server/prisma

# 2. התקנה
ENV NODE_TLS_REJECT_UNAUTHORIZED=0
RUN npm install

# 3. יצירת פריזמה בשרת המדיה (זה מה שהיה חסר!)
RUN npx prisma generate --schema=./packages/server/prisma/schema.prisma

# 4. העתקת שאר הקוד
COPY packages/media-server/ ./packages/media-server/

WORKDIR /usr/src/app/packages/media-server

EXPOSE 8000
CMD ["npm", "start"]