const { Pool } = require('pg')
require('dotenv').config()

console.log('=== ТЕСТ ПРЯМОГО ПОДКЛЮЧЕНИЯ К БАЗЕ ДАННЫХ ===')
console.log('DATABASE_URL установлен:', !!process.env.DATABASE_URL)

async function testConnection() {
	try {
		if (!process.env.DATABASE_URL) {
			throw new Error('Переменная DATABASE_URL не установлена')
		}

		// Маскируем пароль для логов
		const safeUrl = process.env.DATABASE_URL.replace(
			/postgresql:\/\/([^:]+):([^@]+)@/,
			'postgresql://$1:***@'
		)
		console.log('Попытка подключения к:', safeUrl)

		// Парсим URL для использования в логах
		const dbUrl = new URL(process.env.DATABASE_URL)
		console.log(
			`Параметры соединения: host=${dbUrl.hostname}, port=${
				dbUrl.port || 5432
			}, database=${dbUrl.pathname.substring(1)}, user=${dbUrl.username}`
		)

		// Создаем пул с минимальными настройками
		const pool = new Pool({
			connectionString: process.env.DATABASE_URL,
			ssl: { rejectUnauthorized: false },
			max: 1, // только одно соединение для теста
			idleTimeoutMillis: 5000, // быстрее освобождаем ресурсы
			connectionTimeoutMillis: 5000, // меньше времени на подключение
		})

		// Выполняем тестовый запрос
		console.log('Выполняем запрос...')
		const result = await pool.query('SELECT NOW() as current_time')
		console.log(
			'✅ Подключение успешно! Текущее время на сервере:',
			result.rows[0].current_time
		)

		// Получаем информацию о PostgreSQL
		const versionResult = await pool.query('SELECT version()')
		console.log('Версия PostgreSQL:', versionResult.rows[0].version)

		// Получаем список таблиц
		const tablesResult = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        `)

		console.log(`Найдено таблиц: ${tablesResult.rows.length}`)
		console.log('Список таблиц:')
		tablesResult.rows.forEach((row, index) => {
			console.log(`  ${index + 1}. ${row.table_name}`)
		})

		// Закрываем пул
		await pool.end()
		console.log('Соединение закрыто')

		return true
	} catch (error) {
		console.error('❌ Ошибка подключения:', error)
		return false
	}
}

// Запускаем тест
testConnection().then(success => {
	console.log('=== РЕЗУЛЬТАТ ТЕСТА ===')
	console.log(
		success
			? 'Подключение к базе данных работает нормально'
			: 'Не удалось подключиться к базе данных'
	)
	process.exit(success ? 0 : 1)
})
