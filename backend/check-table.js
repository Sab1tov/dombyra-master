const pool = require('./db')

async function checkSchema() {
	try {
		// Получаем список таблиц
		const tables = await pool.query(
			"SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
		)

		console.log('Таблицы в базе данных:')
		console.log(JSON.stringify(tables.rows, null, 2))

		// Проверка структуры таблицы video_lessons
		const videoLessonsSchema = await pool.query(
			"SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'video_lessons'"
		)

		console.log('\nСтруктура таблицы video_lessons:')
		console.log(JSON.stringify(videoLessonsSchema.rows, null, 2))

		// Проверка связей между таблицами
		const relations = await pool.query(`
      SELECT
        tc.table_schema, 
        tc.constraint_name, 
        tc.table_name, 
        kcu.column_name, 
        ccu.table_schema AS foreign_table_schema,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name 
      FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY';
    `)

		console.log('\nСвязи между таблицами (внешние ключи):')
		console.log(JSON.stringify(relations.rows, null, 2))

		// Тестовый запрос к video_lessons
		const videoLessons = await pool.query(
			'SELECT id, title, author_id FROM video_lessons LIMIT 5'
		)
		console.log('\nПримеры записей из video_lessons:')
		console.log(JSON.stringify(videoLessons.rows, null, 2))
	} catch (error) {
		console.error('Ошибка при проверке схемы:', error)
	} finally {
		pool.end()
	}
}

checkSchema()
