-- Добавление колонки registeredAt в таблицу users 
ALTER TABLE users
ADD COLUMN registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP; 

-- Обновление существующих записей текущей датой
UPDATE users SET registered_at = CURRENT_TIMESTAMP WHERE registered_at IS NULL; 