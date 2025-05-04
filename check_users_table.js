const pool = require('./backend/db')

async function checkUsersTable() {
	try {
		console.log(
			'Проверка структуры таблицы users в базе данных dombyra_master...\n'
		)

		// Проверка существования таблицы users
		const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
        AND table_catalog = 'dombyra_master'
      );
    `)

		if (!tableExists.rows[0].exists) {
			console.log(
				'❌ Таблица users не существует в базе данных dombyra_master!'
			)
			return
		}

		console.log('✅ Таблица users существует в базе данных dombyra_master')

		// Получение структуры таблицы
		const columns = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'users'
      AND table_catalog = 'dombyra_master'
      ORDER BY ordinal_position;
    `)

		console.log('\nСтруктура таблицы users:')
		columns.rows.forEach(col => {
			console.log(
				`${col.column_name} | ${col.data_type} | ${
					col.is_nullable === 'YES' ? 'NULL разрешён' : 'NOT NULL'
				} | Default: ${col.column_default || 'нет'}`
			)
		})

		// Проверка наличия колонки avatar
		const avatarColumn = columns.rows.find(col => col.column_name === 'avatar')

		if (avatarColumn) {
			console.log('\n✅ Колонка avatar существует с параметрами:')
			console.log(`Тип: ${avatarColumn.data_type}`)
			console.log(`Nullable: ${avatarColumn.is_nullable}`)
			console.log(`Default: ${avatarColumn.column_default || 'нет'}`)
		} else {
			console.log('\n❌ Колонка avatar отсутствует в таблице users')
			console.log('\nДля добавления колонки используйте SQL-запрос:')
			console.log(
				`ALTER TABLE users ADD COLUMN avatar VARCHAR(255) DEFAULT NULL;`
			)
		}
	} catch (error) {
		console.error('Ошибка при проверке таблицы users:', error)
	} finally {
		await pool.end()
	}
}

checkUsersTable()
