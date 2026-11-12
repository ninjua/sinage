FROM node:20-alpine
WORKDIR /app
COPY . .
ENV TZ=Europe/Athens
CMD ["node","server.js"]
