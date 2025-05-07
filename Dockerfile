FROM node:18-alpine

WORKDIR /app

# Копируем весь проект сразу
COPY . .

# Устанавливаем зависимости для backend
RUN cd backend && npm install --production

# Устанавливаем зависимости и собираем frontend
RUN cd frontend && npm install --production && npm run build

# Экспорт порта
EXPOSE 5000

# Запуск приложения
CMD ["node", "backend/server.js"] 