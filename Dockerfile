FROM node:18

# Установка необходимых зависимостей
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Копирование файлов package.json и установка зависимостей backend
COPY backend/package*.json ./backend/
RUN cd backend && npm install

# Копирование файлов package.json и установка зависимостей frontend
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install

# Копирование остальных файлов
COPY backend ./backend
COPY frontend ./frontend

# Сборка frontend
RUN cd frontend && npm run build

# Экспорт порта для backend
EXPOSE 5000

# Запуск приложения
CMD ["node", "backend/server.js"] 