FROM node:18-alpine

WORKDIR /app

# Copy shared tracing config
COPY shared ./shared

# Copy package files
COPY services/product-service/package*.json ./

RUN npm install --only=production

# Copy service code
COPY services/product-service/src ./src

ENV NODE_ENV=production
ENV PORT=8081

EXPOSE 8081

USER node

CMD ["node", "src/index.js"]
