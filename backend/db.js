const { Pool } = require('pg') // Импортируем клиент PostgreSQL
require('dotenv').config() // Загружаем переменные окружения

const pool = new Pool({
	user: process.env.DB_USER,
	host: process.env.DB_HOST,
	database: process.env.DB_NAME,
	password: process.env.DB_PASSWORD,
	port: process.env.DB_PORT,
})

pool
	.connect()
	.then(() => console.log('✅ Connected to PostgreSQL'))
	.catch(err => console.error('❌ PostgreSQL connection error:', err))

module.exports = pool // Экспортируем pool для использования в других файлах
