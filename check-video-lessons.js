const pool = require('./db')

async function checkVideoLessons() {
	try {
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
			console.log(JSON.stringify(columns.rows, null, 2))

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
			}
		} else {
			console.log('❌ Таблица video_lessons не существует')
		}
	} catch (error) {
		console.error('❌ Ошибка при проверке таблицы video_lessons:', error)
	} finally {
		pool.end()
	}
}

checkVideoLessons()
