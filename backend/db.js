const { Pool } = require('pg') // Импортируем клиент PostgreSQL
require('dotenv').config() // Загружаем переменные окружения

let pool

// Используем DATABASE_URL, если он доступен (для Railway)
if (process.env.DATABASE_URL) {
	// Логируем часть URL для отладки, скрывая пароль
	const dbUrlForLogging = process.env.DATABASE_URL.replace(
		/postgresql:\/\/([^:]+):([^@]+)@/,
		'postgresql://$1:***@'
	)
	console.log(
		`Используем DATABASE_URL для подключения к PostgreSQL: ${dbUrlForLogging}`
	)

	// Парсим DATABASE_URL вручную для лучшего контроля
	try {
		const regex = /postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/
		const match = process.env.DATABASE_URL.match(regex)

		if (match) {
			const [, user, password, host, port, database] = match
			console.log(
				`Параметры подключения: user=${user}, host=${host}, port=${port}, database=${database}`
			)

			pool = new Pool({
				user,
				password,
				host,
				port: parseInt(port, 10),
				database,
				ssl: { rejectUnauthorized: false },
			})
		} else {
			throw new Error('URL не соответствует ожидаемому формату')
		}
	} catch (error) {
		console.error('Ошибка при парсинге DATABASE_URL:', error)
		// Используем URL напрямую как запасной вариант
		pool = new Pool({
			connectionString: process.env.DATABASE_URL,
			ssl: { rejectUnauthorized: false },
		})
	}
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

// Делаем тестовое подключение при запуске
pool
	.connect()
	.then(client => {
		console.log('✅ Connected to PostgreSQL')
		client.release() // Важно освободить клиент после проверки
	})
	.catch(err => {
		console.error('❌ PostgreSQL connection error:', err)
		console.error(
			'Детали подключения: Хост:',
			process.env.DATABASE_URL ? 'из URL' : process.env.DB_HOST
		)
	})

module.exports = pool // Экспортируем pool для использования в других файлах
