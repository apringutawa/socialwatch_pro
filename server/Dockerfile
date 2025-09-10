
FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm ci
RUN apk add --no-cache bash postgresql-client
COPY . .
ENV PORT=4000
RUN npx prisma generate
EXPOSE 4000
CMD sh -c "npx prisma db push && psql \"$DATABASE_URL\" -v ON_ERROR_STOP=1 -c \"\\i prisma/seed.sql\" && node server.js"
