-- Добавляем недостающие колонки в таблицу video_lessons
ALTER TABLE video_lessons 
ADD COLUMN IF NOT EXISTS video_url VARCHAR(255),
ADD COLUMN IF NOT EXISTS thumbnail_url VARCHAR(255),
ADD COLUMN IF NOT EXISTS duration INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS difficulty VARCHAR(50) DEFAULT 'beginner',
ADD COLUMN IF NOT EXISTS author_id INTEGER,
ADD COLUMN IF NOT EXISTS views INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS likes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Добавляем внешний ключ для author_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage 
    WHERE table_name = 'video_lessons' AND column_name = 'author_id'
  ) THEN
    ALTER TABLE video_lessons 
    ADD CONSTRAINT video_lessons_author_id_fkey 
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Создаем таблицу video_views, если она не существует
CREATE TABLE IF NOT EXISTS video_views (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  video_id INTEGER REFERENCES video_lessons(id) ON DELETE CASCADE,
  progress INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, video_id)
);

-- Проверяем, есть ли колонка video_id в таблице favorites
ALTER TABLE favorites
ADD COLUMN IF NOT EXISTS video_id INTEGER REFERENCES video_lessons(id) ON DELETE CASCADE;

-- Проверяем, есть ли колонка video_id в таблице comments
ALTER TABLE comments
ADD COLUMN IF NOT EXISTS video_id INTEGER REFERENCES video_lessons(id) ON DELETE CASCADE; 