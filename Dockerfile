FROM node:20-alpine

WORKDIR /app

COPY frontend/package*.json ./frontend/
RUN npm --prefix frontend ci --include=dev

COPY backend/package*.json ./backend/
RUN npm --prefix backend ci

COPY frontend/ ./frontend/
RUN npm --prefix frontend run build

COPY backend/ ./backend/
RUN npm --prefix backend run build

ENV NODE_ENV=production
EXPOSE 3001

CMD ["node", "backend/dist/index.js"]
