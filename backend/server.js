const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const path = require('path')
const pool = require('./db')
require('dotenv').config()

// Добавляем импорт функции createTables из schema-create.js
const { createTables } = require('./schema-create')

// Routes - исправляем пути к модулям
const authRoutes = require('./routes/authRoutes')
const videoLessonRoutes = require('./routes/videoLessonRoutes')
const sheetMusicRoutes = require('./routes/sheetMusicRoutes')
const favoriteRoutes = require('./routes/favoriteRoutes')
const commentRoutes = require('./routes/commentRoutes')
// Импортируем отладочные маршруты
const debugRoutes = require('./routes/debugRoutes')

// Создаем экземпляр Express
const app = express()

// Настраиваем порт
const PORT = process.env.PORT || 5000

// Вывод информации о среде и переменных для диагностики
console.log('NODE_ENV:', process.env.NODE_ENV)
console.log('DATABASE_URL настроен:', !!process.env.DATABASE_URL)
console.log('PORT:', PORT)

// Настройка CORS с поддержкой доменов из переменной окружения
const corsOptions = {
	origin: process.env.CORS_ORIGIN || 'https://dombyra-master.vercel.app',
	credentials: true,
	optionsSuccessStatus: 200,
}
console.log('✅ CORS настроен для домена:', corsOptions.origin)

// Добавляем middleware
app.use(cors(corsOptions))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

// Добавляем маршруты - подключаем только существующие маршруты
app.use('/api/auth', authRoutes)
app.use('/api/video-lessons', videoLessonRoutes)
app.use('/api/sheet-music', sheetMusicRoutes)
app.use('/api/favorites', favoriteRoutes)
app.use('/api/comments', commentRoutes)
// Подключаем отладочные маршруты
app.use('/api/debug', debugRoutes)

// Улучшенная проверка подключения к БД с повторными попытками
const checkDbConnection = async (retries = 5) => {
	for (let attempt = 1; attempt <= retries; attempt++) {
		try {
			console.log(`Попытка подключения к БД (${attempt}/${retries})...`)
			const client = await pool.connect()
			console.log('✅ Успешное подключение к PostgreSQL')

			// Проверяем возможность выполнения запроса
			const result = await client.query('SELECT NOW()')
			console.log('✅ Тестовый запрос выполнен успешно:', result.rows[0])

			// В production среде автоматически создаем таблицы при запуске
			if (process.env.NODE_ENV === 'production') {
				console.log('Production среда, запускаем создание таблиц...')
				await createTables()
			}

			client.release()
			return true
		} catch (err) {
			console.error(
				`❌ Ошибка подключения к PostgreSQL (попытка ${attempt}/${retries}):`,
				err
			)

			if (attempt < retries) {
				const waitTime = attempt * 1500 // Увеличиваем время ожидания с каждой попыткой
				console.log(`Ожидаем ${waitTime}ms перед следующей попыткой...`)
				await new Promise(resolve => setTimeout(resolve, waitTime))
			} else {
				console.error(
					'❌ Не удалось подключиться к базе данных после нескольких попыток'
				)
				// Продолжаем работу сервера даже при ошибке БД, чтобы можно было пользоваться отладочными маршрутами
			}
		}
	}
	return false
}

// Добавление статической директории для загруженных файлов
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

// Для проверки работы API
app.get('/api/health', (req, res) => {
	res.json({
		status: 'ok',
		message: 'API работает',
		database: pool._connected ? 'connected' : 'not connected',
		env: process.env.NODE_ENV,
	})
})

// Запускаем сервер
app.listen(PORT, () => {
	console.log(`Сервер запущен на порту ${PORT}`)
	checkDbConnection()
})
