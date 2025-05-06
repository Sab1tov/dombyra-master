# Dombyra - Платформа для обучения игре на домбре

## Запуск проекта в Docker

### Предварительные требования

- Docker и Docker Compose установлены на вашей системе
- Git для клонирования репозитория

### Шаги по запуску

1. **Клонировать репозиторий**

   ```bash
   git clone https://github.com/Sab1tov/dombyra-master.git
   cd dombyra-master
   ```

2. **Настроить переменные окружения**

   ```bash
   cp .env.example .env
   # Отредактируйте .env файл при необходимости
   ```

3. **Собрать и запустить контейнеры**

   ```bash
   docker-compose up -d
   ```

4. **Инициализировать базу данных**

   ```bash
   docker-compose exec backend node schema-create.js
   docker-compose exec backend node create-video-tables.js
   ```

5. **Проверить работу приложения**
   - Фронтенд доступен по адресу: http://localhost:3000
   - Бэкенд API доступен по адресу: http://localhost:5000/api

### Управление контейнерами

- **Остановить контейнеры**

  ```bash
  docker-compose stop
  ```

- **Перезапустить контейнеры**

  ```bash
  docker-compose restart
  ```

- **Удалить контейнеры (сохраняя данные)**

  ```bash
  docker-compose down
  ```

- **Удалить контейнеры и данные**

  ```bash
  docker-compose down -v
  ```

- **Просмотр логов**

  ```bash
  # Все логи
  docker-compose logs -f

  # Логи только бэкенда
  docker-compose logs -f backend

  # Логи только фронтенда
  docker-compose logs -f frontend
  ```

## Структура проекта

- `/frontend` - Next.js фронтенд приложение
- `/backend` - Express.js бэкенд API
- `/docker-compose.yml` - Конфигурация Docker Compose
- `/Dockerfile.frontend` - Dockerfile для фронтенда
- `/Dockerfile.backend` - Dockerfile для бэкенда
