FROM node:18-alpine

WORKDIR /app

# Copy shared tracing config
COPY shared ./shared

# Copy package files
COPY services/payment-service/package*.json ./

RUN npm install --only=production

# Copy service code
COPY services/payment-service/src ./src

ENV NODE_ENV=production
ENV PORT=8082

EXPOSE 8082

USER node

CMD ["node", "src/index.js"]
