-- Добавление колонки avatar в таблицу users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS avatar VARCHAR(255) DEFAULT NULL;

-- Проверка, что колонка добавлена
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'users'
AND column_name = 'avatar'; 