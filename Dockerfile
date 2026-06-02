FROM node:22

WORKDIR /app/server
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev

WORKDIR /app
COPY . .

WORKDIR /app/server
RUN mkdir -p public/uploads/dogodkov

ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "server.js"]
