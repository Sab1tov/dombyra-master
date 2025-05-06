const pool = require('./db')

async function createTables() {
	try {
		console.log('Начинаем создание таблиц...')

		// Сначала создаем таблицу users, если она не существует
		await pool.query(`
			CREATE TABLE IF NOT EXISTS users (
				id SERIAL PRIMARY KEY,
				username VARCHAR(255) UNIQUE NOT NULL,
				email VARCHAR(255) UNIQUE NOT NULL,
				password VARCHAR(255) NOT NULL,
				full_name VARCHAR(255),
				avatar_url VARCHAR(255),
				role VARCHAR(50) DEFAULT 'user',
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
			);
		`)
		console.log('✅ Таблица users создана или уже существует')

		// Создаем таблицу sheet_music
		await pool.query(`
			CREATE TABLE IF NOT EXISTS sheet_music (
				id SERIAL PRIMARY KEY,
				title VARCHAR(255) NOT NULL,
				composer VARCHAR(255) NOT NULL,
				description TEXT,
				file_path VARCHAR(255),
				thumbnail_url VARCHAR(255),
				difficulty VARCHAR(50) DEFAULT 'intermediate',
				downloads INTEGER DEFAULT 0,
				views INTEGER DEFAULT 0,
				pages INTEGER DEFAULT 1,
				user_id INTEGER REFERENCES users(id),
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
			);
		`)
		console.log('✅ Таблица sheet_music создана или уже существует')

		// Создаем таблицу для тегов нот
		await pool.query(`
			CREATE TABLE IF NOT EXISTS sheet_music_tags (
				id SERIAL PRIMARY KEY,
				sheet_music_id INTEGER REFERENCES sheet_music(id) ON DELETE CASCADE,
				name VARCHAR(100) NOT NULL,
				UNIQUE(sheet_music_id, name)
			);
		`)
		console.log('✅ Таблица sheet_music_tags создана или уже существует')

		// Создаем таблицу favorites для избранных нот
		await pool.query(`
			CREATE TABLE IF NOT EXISTS favorites (
				id SERIAL PRIMARY KEY,
				user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
				sheet_music_id INTEGER REFERENCES sheet_music(id) ON DELETE CASCADE,
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				UNIQUE(user_id, sheet_music_id)
			);
		`)
		console.log('✅ Таблица favorites создана или уже существует')

		// Создаем таблицу comments для комментариев к нотам
		await pool.query(`
			CREATE TABLE IF NOT EXISTS comments (
				id SERIAL PRIMARY KEY,
				user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
				sheet_music_id INTEGER REFERENCES sheet_music(id) ON DELETE CASCADE,
				content TEXT NOT NULL,
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
			);
		`)
		console.log('✅ Таблица comments создана или уже существует')

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
		console.log('✅ Таблица video_lessons создана или уже существует')

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
		console.log('✅ Таблица video_views создана или уже существует')

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
		`)
		console.log('✅ Таблица comments обновлена для поддержки видеоуроков')

		// Добавляем ограничение, исправив синтаксическую ошибку
		try {
			await pool.query(`
				ALTER TABLE comments
				DROP CONSTRAINT IF EXISTS content_type_check;
			`)

			await pool.query(`
				ALTER TABLE comments
				ADD CONSTRAINT content_type_check 
				CHECK ((video_id IS NULL AND sheet_music_id IS NOT NULL) OR 
							(video_id IS NOT NULL AND sheet_music_id IS NULL));
			`)
			console.log('✅ Добавлено ограничение для таблицы comments')
		} catch (constraintError) {
			console.error(
				'⚠️ Предупреждение при добавлении ограничения:',
				constraintError.message
			)
		}

		console.log('✅ Все таблицы успешно созданы или обновлены!')
	} catch (error) {
		console.error('❌ Ошибка при создании таблиц:', error)
	} finally {
		// В продакшен среде не закрываем соединение,
		// чтобы оно могло использоваться в приложении
		if (process.env.NODE_ENV !== 'production') {
			await pool.end()
		}
	}
}

// Если скрипт запущен напрямую (не импортирован в другой модуль)
if (require.main === module) {
	createTables()
}

// Экспортируем функцию для возможности импорта в другие модули
module.exports = { createTables }
