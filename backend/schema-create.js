const pool = require('./db')

async function createTables() {
	try {
		console.log('Начинаем создание таблиц...')

		// Создаем таблицу video_lessons
		await pool.query(`
      CREATE TABLE IF NOT EXISTS video_lessons (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        video_url VARCHAR(255) NOT NULL,
        thumbnail_url VARCHAR(255),
        duration INTEGER NOT NULL, -- длительность в секундах
        author_id INTEGER REFERENCES users(id), 
        views INTEGER DEFAULT 0,
        likes INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `)
		console.log('✅ Таблица video_lessons создана')

		// Создаем таблицу video_views для отслеживания просмотров и прогресса
		await pool.query(`
      CREATE TABLE IF NOT EXISTS video_views (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        video_id INTEGER REFERENCES video_lessons(id) ON DELETE CASCADE,
        progress INTEGER DEFAULT 0, -- процент просмотра
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, video_id)
      );
    `)
		console.log('✅ Таблица video_views создана')

		// Обновляем таблицу favorites, чтобы она поддерживала видеоуроки
		await pool.query(`
      ALTER TABLE favorites
      ADD COLUMN IF NOT EXISTS video_id INTEGER REFERENCES video_lessons(id) ON DELETE CASCADE;
    `)
		console.log('✅ Таблица favorites обновлена для поддержки видеоуроков')

		// Обновляем таблицу comments, чтобы она поддерживала видеоуроки
		await pool.query(`
      ALTER TABLE comments
      ADD COLUMN IF NOT EXISTS video_id INTEGER REFERENCES video_lessons(id) ON DELETE CASCADE;
      
      -- Добавляем ограничение, чтобы комментарий был привязан только к одному типу контента
      ALTER TABLE comments
      ADD CONSTRAINT IF NOT EXISTS content_type_check
      CHECK ((video_id IS NULL AND sheet_music_id IS NOT NULL) OR 
             (video_id IS NOT NULL AND sheet_music_id IS NULL));
    `)
		console.log('✅ Таблица comments обновлена для поддержки видеоуроков')

		console.log('✅ Все таблицы успешно созданы или обновлены!')
	} catch (error) {
		console.error('❌ Ошибка при создании таблиц:', error)
	} finally {
		pool.end()
	}
}

createTables()
