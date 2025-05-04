const pool = require('./db')

async function checkVideoLessons() {
	try {
		console.log('Подключение к базе данных...')
		console.log('Проверка таблицы video_lessons...')

		// Проверка существования таблицы
		const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'video_lessons'
      );
    `)

		if (tableCheck.rows[0].exists) {
			console.log('✅ Таблица video_lessons существует')

			// Проверка структуры таблицы
			const columns = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'video_lessons'
        ORDER BY ordinal_position;
      `)

			console.log('\nСтруктура таблицы video_lessons:')
			columns.rows.forEach(col => {
				console.log(`${col.column_name} (${col.data_type})`)
			})

			// Проверка наличия записей
			const countResult = await pool.query(
				'SELECT COUNT(*) FROM video_lessons;'
			)
			const count = parseInt(countResult.rows[0].count)

			console.log(`\nКоличество записей в таблице: ${count}`)

			if (count > 0) {
				// Получение примера записей
				const records = await pool.query('SELECT * FROM video_lessons LIMIT 3;')
				console.log('\nПримеры записей:')
				console.log(JSON.stringify(records.rows, null, 2))
			} else {
				console.log('⚠️ Таблица video_lessons пуста')

				// Если таблицы нет, предложим её создать
				console.log('\nХотите создать таблицу video_lessons? Выполните:')
				console.log('node create-video-tables.js --create')
			}
		} else {
			console.log('❌ Таблица video_lessons не существует')

			// Если таблицы нет, предложим её создать
			console.log('\nХотите создать таблицу video_lessons? Выполните:')
			console.log('node create-video-tables.js --create')
		}
	} catch (error) {
		console.error('❌ Ошибка при проверке таблицы video_lessons:', error)
	} finally {
		await pool.end()
	}
}

async function createVideoLessons() {
	try {
		console.log('Подключение к базе данных...')
		console.log('Создание таблицы video_lessons...')

		// Создаем таблицу video_lessons
		await pool.query(`
      CREATE TABLE IF NOT EXISTS video_lessons (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        video_url VARCHAR(255) NOT NULL,
        thumbnail_url VARCHAR(255),
        duration INTEGER DEFAULT 0,
        difficulty VARCHAR(50) DEFAULT 'beginner',
        author_id INTEGER,
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
        user_id INTEGER,
        video_id INTEGER,
        progress INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, video_id)
      );
    `)
		console.log('✅ Таблица video_views создана')

		console.log('\nТаблицы для видеоуроков успешно созданы!')
		console.log(
			'Теперь можно загружать видеоуроки через API: POST /api/video-lessons/upload'
		)
	} catch (error) {
		console.error('❌ Ошибка при создании таблиц:', error)
	} finally {
		await pool.end()
	}
}

// Проверяем аргументы командной строки
if (process.argv.includes('--create')) {
	createVideoLessons()
} else {
	checkVideoLessons()
}
