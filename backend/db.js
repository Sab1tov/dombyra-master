const { Pool } = require('pg')
require('dotenv').config()

// Перед созданием пула вывести информацию об окружении для отладки
console.log('DATABASE_URL установлен:', !!process.env.DATABASE_URL)
if (process.env.DATABASE_URL) {
	// Маскируем пароль для логов
	const safeUrl = process.env.DATABASE_URL.replace(
		/postgresql:\/\/([^:]+):([^@]+)@/,
		'postgresql://$1:***@'
	)
	console.log('DATABASE_URL формат:', safeUrl)
}

// Создаем объект конфигурации
const poolConfig = {}

// Подход 1: Используем прямые параметры подключения
if (process.env.DATABASE_URL) {
	try {
		// Парсим URL для прямого использования компонентов
		const dbUrl = new URL(process.env.DATABASE_URL)

		poolConfig.user = dbUrl.username
		poolConfig.password = dbUrl.password
		poolConfig.host = dbUrl.hostname
		poolConfig.port = dbUrl.port || 5432
		poolConfig.database = dbUrl.pathname.substring(1) // Убираем начальный "/"
		poolConfig.ssl = { rejectUnauthorized: false }

		console.log(
			`Использую параметры: host=${poolConfig.host}, port=${poolConfig.port}, database=${poolConfig.database}, user=${poolConfig.user}`
		)
	} catch (err) {
		console.error('Ошибка при парсинге DATABASE_URL:', err)

		// Запасной вариант - используем URL напрямую
		poolConfig.connectionString = process.env.DATABASE_URL
		poolConfig.ssl = { rejectUnauthorized: false }
		console.log('Использую DATABASE_URL напрямую')
	}
} else {
	// Используем локальную конфигурацию
	poolConfig.user = process.env.DB_USER || 'postgres'
	poolConfig.password = process.env.DB_PASSWORD
	poolConfig.host = process.env.DB_HOST || 'localhost'
	poolConfig.port = process.env.DB_PORT || 5432
	poolConfig.database = process.env.DB_NAME || 'dombyra'
	console.log(
		`Использую локальное подключение: ${poolConfig.host}:${poolConfig.port}`
	)
}

// Создаем пул соединений
const pool = new Pool(poolConfig)

// Отслеживаем ошибки на пуле
pool.on('error', err => {
	console.error('Непредвиденная ошибка пула PostgreSQL:', err)
})

// Выполняем тестовое подключение для проверки
pool
	.query('SELECT NOW()')
	.then(res => {
		console.log(
			'✅ PostgreSQL подключен успешно, время сервера:',
			res.rows[0].now
		)
	})
	.catch(err => {
		console.error('❌ Не удалось подключиться к PostgreSQL:', err)
	})

module.exports = pool
