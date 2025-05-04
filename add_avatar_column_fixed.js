const { Pool } = require('pg')
const path = require('path')
const fs = require('fs')
require('dotenv').config({
	path: path.resolve(__dirname, './backend/.env'),
})

async function addAvatarColumn() {
	try {
		console.log('Загрузка настроек подключения из .env файла...')
		console.log('DB_USER:', process.env.DB_USER)
		console.log('DB_NAME:', process.env.DB_NAME)
		console.log('DB_HOST:', process.env.DB_HOST)

		// Создаем новый пул подключения с явными настройками из .env
		const pool = new Pool({
			user: process.env.DB_USER || 'dombyra',
			host: process.env.DB_HOST || 'localhost',
			database: process.env.DB_NAME || 'dombyra_master',
			password: process.env.DB_PASSWORD || '2260971',
			port: process.env.DB_PORT || 5432,
		})

		console.log('Подключение к базе данных...')

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
			console.log(
				'❌ Что-то пошло не так. Колонка не найдена после добавления.'
			)
		}

		// Освобождаем клиент и закрываем пул
		client.release()
		await pool.end()
		console.log('Соединение с базой данных закрыто')
	} catch (error) {
		console.error('Ошибка при обработке запроса:', error)
	}
}

addAvatarColumn()
