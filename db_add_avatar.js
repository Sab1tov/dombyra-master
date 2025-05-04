const { Pool } = require('pg')

// Явное указание параметров подключения к базе данных
const pool = new Pool({
	user: 'dombyra',
	password: '2260971',
	host: 'localhost',
	database: 'dombyra_master',
	port: 5432,
})

async function addAvatarColumn() {
	try {
		console.log(
			'Подключение к базе данных dombyra_master как пользователь dombyra...'
		)

		// Проверка подключения
		const client = await pool.connect()
		console.log('✅ Подключение к базе данных установлено')

		console.log('Добавление колонки avatar в таблицу users...')

		// Добавление колонки avatar
		await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS avatar VARCHAR(255) DEFAULT NULL;
    `)

		console.log('✅ Колонка avatar успешно добавлена (или уже существует)')

		// Проверка, что колонка добавлена
		const result = await client.query(`
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
			console.log('❌ Колонка не найдена после добавления.')
		}

		// Освобождаем клиент и закрываем пул
		client.release()
		await pool.end()
		console.log('Соединение с базой данных закрыто')
	} catch (error) {
		console.error('Ошибка при выполнении операций с базой данных:', error)
	}
}

addAvatarColumn()
