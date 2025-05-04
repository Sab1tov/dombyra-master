const pool = require('./backend/db')

async function addAvatarColumn() {
	try {
		console.log('Добавление колонки avatar в таблицу users...')

		// Добавление колонки avatar
		await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS avatar VARCHAR(255) DEFAULT NULL;
    `)

		console.log('✅ Колонка avatar успешно добавлена (или уже существует)')

		// Проверка, что колонка добавлена
		const result = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'users'
      AND column_name = 'avatar';
    `)

		if (result.rows.length > 0) {
			const column = result.rows[0]
			console.log('\nИнформация о колонке:')
			console.log(`Название: ${column.column_name}`)
			console.log(`Тип данных: ${column.data_type}`)
			console.log(`NULL разрешен: ${column.is_nullable}`)
		} else {
			console.log(
				'❌ Что-то пошло не так. Колонка не найдена после добавления.'
			)
		}
	} catch (error) {
		console.error('Ошибка при добавлении колонки avatar:', error)
	} finally {
		await pool.end()
		console.log('Соединение с базой данных закрыто')
	}
}

addAvatarColumn()
