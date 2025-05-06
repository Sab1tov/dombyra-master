const { Pool } = require('pg') // Импортируем клиент PostgreSQL
require('dotenv').config() // Загружаем переменные окружения

let pool

// Используем DATABASE_URL, если он доступен (для Railway)
if (process.env.DATABASE_URL) {
	console.log('Используем DATABASE_URL для подключения к PostgreSQL')
	pool = new Pool({
		connectionString: process.env.DATABASE_URL,
		ssl:
			process.env.NODE_ENV === 'production'
				? { rejectUnauthorized: false }
				: false,
	})
} else {
	// Иначе используем отдельные параметры (для локальной разработки)
	console.log('Используем локальные параметры для подключения к PostgreSQL')
	pool = new Pool({
		user: process.env.DB_USER,
		host: process.env.DB_HOST,
		database: process.env.DB_NAME,
		password: process.env.DB_PASSWORD,
		port: process.env.DB_PORT,
	})
}

pool
	.connect()
	.then(() => console.log('✅ Connected to PostgreSQL'))
	.catch(err => console.error('❌ PostgreSQL connection error:', err))

module.exports = pool // Экспортируем pool для использования в других файлах
