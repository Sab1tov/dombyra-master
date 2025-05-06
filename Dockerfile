FROM node:18-alpine

# Установка необходимых зависимостей
RUN apk add --no-cache python3 make g++ build-base

WORKDIR /app

# Настройка npm для обхода проблем с кешированием
ENV NPM_CONFIG_CACHE=/tmp/npm-cache
ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN npm config set cache /tmp/npm-cache --global

# Копирование файлов package.json и установка зависимостей backend
COPY backend/package*.json ./backend/
RUN cd backend && npm install --no-cache

# Копирование файлов package.json и установка зависимостей frontend
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install --no-cache

# Копирование остальных файлов
COPY backend ./backend
COPY frontend ./frontend

# Сборка frontend
RUN cd frontend && npm run build

# Экспорт порта для backend
EXPOSE 5000

# Запуск приложения
CMD ["node", "backend/server.js"] 