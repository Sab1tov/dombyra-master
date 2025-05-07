const express = require('express')
const pool = require('../db')
const router = express.Router()

// Проверка подключения к БД и получение списка таблиц
router.get('/check-db', async (req, res) => {
	try {
		// Проверка секретного ключа для защиты эндпоинта
		const secretKey = req.query.key
		if (secretKey !== 'dombyra2024') {
			return res.status(403).json({ error: 'Доступ запрещен' })
		}

		// Проверяем соединение с БД
		const client = await pool.connect()
		console.log('✅ Соединение с БД установлено для диагностики')

		// Получаем список таблиц
		const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `)

		// Получаем количество записей в каждой таблице
		const tables = tablesResult.rows
		const tablesWithCounts = []

		for (const table of tables) {
			try {
				const countResult = await client.query(
					`SELECT COUNT(*) FROM ${table.table_name}`
				)
				tablesWithCounts.push({
					table: table.table_name,
					count: parseInt(countResult.rows[0].count, 10),
				})
			} catch (err) {
				console.error(
					`Ошибка при подсчете записей в таблице ${table.table_name}:`,
					err
				)
				tablesWithCounts.push({
					table: table.table_name,
					count: 'Ошибка подсчета',
					error: err.message,
				})
			}
		}

		// Получаем версию PostgreSQL для диагностики
		const versionResult = await client.query('SELECT version()')

		// Освобождаем соединение
		client.release()

		// Отправляем результат
		res.json({
			status: 'ok',
			message: 'Подключение к базе данных успешно',
			database_url: process.env.DATABASE_URL ? 'Настроен' : 'Не настроен',
			tables: tablesWithCounts,
			tables_count: tables.length,
			postgre_version: versionResult.rows[0].version,
			ssl_enabled: !!pool.options?.ssl,
		})
	} catch (err) {
		console.error('❌ Ошибка при проверке базы данных:', err)
		res.status(500).json({
			status: 'error',
			message: 'Ошибка при проверке базы данных',
			error: err.message,
			stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
		})
	}
})

// Маршрут для получения деталей о соединении с базой данных
router.get('/db-connection', async (req, res) => {
	try {
		// Проверка секретного ключа
		const secretKey = req.query.key
		if (secretKey !== 'dombyra2024') {
			return res.status(403).json({ error: 'Доступ запрещен' })
		}

		// Проверяем переменные окружения и параметры соединения
		// (не показываем пароль или полный URL)
		const connectionInfo = {
			database_url_set: !!process.env.DATABASE_URL,
			environment: process.env.NODE_ENV || 'development',
			ssl_config: pool.options?.ssl ? 'enabled' : 'disabled',
			connection_parameters: {
				host: process.env.DATABASE_URL ? 'из URL' : process.env.DB_HOST,
				port: process.env.DATABASE_URL ? 'из URL' : process.env.DB_PORT,
				database: process.env.DATABASE_URL ? 'из URL' : process.env.DB_NAME,
				user: process.env.DATABASE_URL ? 'из URL' : process.env.DB_USER,
			},
		}

		res.json({
			status: 'ok',
			connection_info: connectionInfo,
		})
	} catch (err) {
		console.error('❌ Ошибка при получении информации о соединении:', err)
		res.status(500).json({
			status: 'error',
			message: 'Ошибка при получении информации о соединении с БД',
			error: err.message,
		})
	}
})

// Тестовый маршрут для запуска простого запроса
router.get('/test-query', async (req, res) => {
	try {
		// Проверка секретного ключа
		const secretKey = req.query.key
		if (secretKey !== 'dombyra2024') {
			return res.status(403).json({ error: 'Доступ запрещен' })
		}

		// Выполняем простой запрос
		const result = await pool.query('SELECT NOW() as time')

		res.json({
			status: 'ok',
			message: 'Тестовый запрос выполнен успешно',
			result: result.rows[0],
		})
	} catch (err) {
		console.error('❌ Ошибка при выполнении тестового запроса:', err)
		res.status(500).json({
			status: 'error',
			message: 'Ошибка при выполнении тестового запроса',
			error: err.message,
		})
	}
})

module.exports = router
