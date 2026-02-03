FROM node:18-alpine

WORKDIR /app

# Copy shared tracing config
COPY shared ./shared

# Copy package files
COPY services/frontend-api/package*.json ./

RUN npm install --only=production

# Copy service code
COPY services/frontend-api/src ./src

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

USER node

CMD ["node", "src/index.js"]
