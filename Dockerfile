# TypeScript Build Stage
FROM node:20.11-alpine AS build

WORKDIR /usr/src/app

COPY . .

RUN npm ci
RUN npm run build

# Final Stage
FROM node:20.11-alpine AS final

WORKDIR /usr/src/app

COPY --from=build /usr/src/app/build .
COPY package*.json ./

RUN npm ci --omit=dev

EXPOSE 3000

CMD ["node", "./server.js"]
