const pool = require('./db')

async function checkSheetMusicTables() {
	try {
		console.log('Подключение к базе данных...')
		console.log('Проверка таблицы sheet_music...')

		// Проверка существования таблицы
		const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'sheet_music'
      );
    `)

		if (tableCheck.rows[0].exists) {
			console.log('✅ Таблица sheet_music существует')

			// Проверка структуры таблицы
			const columns = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'sheet_music'
        ORDER BY ordinal_position;
      `)

			console.log('\nСтруктура таблицы sheet_music:')
			columns.rows.forEach(col => {
				console.log(`${col.column_name} (${col.data_type})`)
			})

			// Проверка наличия записей
			const countResult = await pool.query('SELECT COUNT(*) FROM sheet_music;')
			const count = parseInt(countResult.rows[0].count)

			console.log(`\nКоличество записей в таблице: ${count}`)

			if (count > 0) {
				// Получение примера записей
				const records = await pool.query('SELECT * FROM sheet_music LIMIT 3;')
				console.log('\nПримеры записей:')
				console.log(JSON.stringify(records.rows, null, 2))
			} else {
				console.log('⚠️ Таблица sheet_music пуста')
			}
		} else {
			console.log('❌ Таблица sheet_music не существует')

			// Если таблицы нет, предложим её создать
			console.log('\nХотите создать таблицу sheet_music? Выполните:')
			console.log('node create-sheet-music-tables.js --create')
		}
	} catch (error) {
		console.error('❌ Ошибка при проверке таблиц sheet_music:', error)
	} finally {
		await pool.end()
	}
}

async function createSheetMusicTables() {
	try {
		console.log('Подключение к базе данных...')
		console.log('Создание таблиц для нотных материалов...')

		// Создаем директорию для загрузки файлов, если она не существует
		const fs = require('fs')
		const path = require('path')
		const uploadDir = path.join(__dirname, 'uploads', 'sheet_music')

		if (!fs.existsSync(uploadDir)) {
			fs.mkdirSync(uploadDir, { recursive: true })
			console.log(`✅ Создана директория для нот: ${uploadDir}`)
		}

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
		console.log('✅ Таблица sheet_music создана')

		// Создаем таблицу для тегов нот
		await pool.query(`
      CREATE TABLE IF NOT EXISTS sheet_music_tags (
        id SERIAL PRIMARY KEY,
        sheet_music_id INTEGER REFERENCES sheet_music(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        UNIQUE(sheet_music_id, name)
      );
    `)
		console.log('✅ Таблица sheet_music_tags создана')

		// Создаем таблицу для управления избранными нотами
		await pool.query(`
      CREATE TABLE IF NOT EXISTS favorites (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        sheet_music_id INTEGER REFERENCES sheet_music(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, sheet_music_id)
      );
    `)
		console.log('✅ Таблица favorites создана')

		// Создаем таблицу для комментариев к нотам
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
		console.log('✅ Таблица comments создана')

		console.log('\nТаблицы для нотных материалов успешно созданы!')
		console.log('Теперь можно загружать ноты через API: POST /api/sheet-music')
	} catch (error) {
		console.error('❌ Ошибка при создании таблиц:', error)
	} finally {
		await pool.end()
	}
}

// Проверяем аргументы командной строки
if (process.argv.includes('--create')) {
	createSheetMusicTables()
} else {
	checkSheetMusicTables()
}
