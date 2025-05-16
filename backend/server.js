const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const path = require('path')
const fs = require('fs')
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
console.log('---------------------------------------------------')
console.log('ЗАПУСК СЕРВЕРА В ОКРУЖЕНИИ:')
console.log('NODE_ENV:', process.env.NODE_ENV)
console.log('PORT:', PORT)
console.log(
	'DATABASE_URL:',
	process.env.DATABASE_URL ? 'УСТАНОВЛЕН' : 'НЕ УСТАНОВЛЕН'
)
console.log(
	'CORS_ORIGIN:',
	process.env.CORS_ORIGIN ||
		'не установлен (будет использован домен по умолчанию)'
)
console.log(
	'JWT_SECRET:',
	process.env.JWT_SECRET ? 'УСТАНОВЛЕН' : 'НЕ УСТАНОВЛЕН'
)
console.log(
	'BASE_URL:',
	process.env.BASE_URL ? process.env.BASE_URL : 'НЕ УСТАНОВЛЕН'
)
console.log('---------------------------------------------------')

// Настройка CORS с поддержкой доменов из переменной окружения
const corsOptions = {
	origin: function (origin, callback) {
		// Если CORS_ORIGIN не указан, используем домен по умолчанию
		const allowedOrigins = process.env.CORS_ORIGIN
			? process.env.CORS_ORIGIN.split(',')
			: ['https://dombyra-master.vercel.app']

		// Разрешаем запросы без origin (например, от Postman)
		if (!origin) {
			return callback(null, true)
		}

		if (allowedOrigins.indexOf(origin) !== -1) {
			callback(null, true)
		} else {
			console.log('Запрос заблокирован CORS политикой:', origin)
			callback(new Error('Не разрешено CORS политикой'))
		}
	},
	credentials: true,
	optionsSuccessStatus: 200,
}
console.log(
	'✅ CORS настроен для доменов:',
	process.env.CORS_ORIGIN || 'https://dombyra-master.vercel.app'
)

// Добавляем middleware
app.use(cors(corsOptions))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

// Проверяем и создаем директорию для загрузки файлов
// В Railway мы используем тома, поэтому проверяем оба варианта путей
const uploadsDir = path.join(__dirname, 'uploads')
const avatarsDir = path.join(uploadsDir, 'avatars')
const videosDir = path.join(uploadsDir, 'videos')
const sheetMusicDir = path.join(uploadsDir, 'sheet_music')

// Директории Railway Volume
const railwayDataDir = '/data'
const railwayAvatarsDir = path.join(railwayDataDir, 'avatars')
const railwayVideosDir = path.join(railwayDataDir, 'videos')
const railwaySheetMusicDir = path.join(railwayDataDir, 'sheet_music')

// Функция для безопасного создания директории если она не существует
const ensureDirectoryExists = dir => {
	if (!fs.existsSync(dir)) {
		try {
			fs.mkdirSync(dir, { recursive: true })
			console.log(`✅ Создана директория: ${dir}`)
		} catch (err) {
			console.error(`❌ Ошибка при создании директории ${dir}:`, err.message)
		}
	}
}

// Создаем локальные директории
ensureDirectoryExists(uploadsDir)
ensureDirectoryExists(avatarsDir)
ensureDirectoryExists(videosDir)
ensureDirectoryExists(sheetMusicDir)

// Пытаемся создать директории в Railway Volume если они существуют
if (process.env.NODE_ENV === 'production') {
	try {
		ensureDirectoryExists(railwayDataDir)
		ensureDirectoryExists(railwayAvatarsDir)
		ensureDirectoryExists(railwayVideosDir)
		ensureDirectoryExists(railwaySheetMusicDir)
		console.log('✅ Railway тома подготовлены')
	} catch (err) {
		console.error('❌ Ошибка при подготовке Railway томов:', err.message)
	}
}

// Добавляем маршруты - подключаем только существующие маршруты
app.use('/api/auth', authRoutes)
app.use('/api/video-lessons', videoLessonRoutes)
app.use('/api/sheet-music', sheetMusicRoutes)
app.use('/api/favorites', favoriteRoutes)
app.use('/api/comments', commentRoutes)
// Подключаем отладочные маршруты
app.use('/api/debug', debugRoutes)

// Переменная для отслеживания статуса подключения к БД
let dbConnected = false

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

			// Устанавливаем флаг успешного подключения
			dbConnected = true

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

			// Сбрасываем флаг, если была ошибка
			dbConnected = false

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

// Добавление статической директории для загруженных файлов из Volume Railway
// Проверяем существование директорий перед монтированием
if (process.env.NODE_ENV === 'production') {
	try {
		// Проверяем существование директорий Railway перед настройкой
		if (fs.existsSync(railwayAvatarsDir)) {
			app.use('/uploads/avatars', express.static(railwayAvatarsDir))
			console.log(
				`✅ Статические файлы из ${railwayAvatarsDir} доступны по /uploads/avatars`
			)
		} else {
			console.log(
				`⚠️ Директория ${railwayAvatarsDir} не существует, используем локальную`
			)
			app.use('/uploads/avatars', express.static(avatarsDir))
		}

		if (fs.existsSync(railwayVideosDir)) {
			app.use('/uploads/videos', express.static(railwayVideosDir))
			console.log(
				`✅ Статические файлы из ${railwayVideosDir} доступны по /uploads/videos`
			)
		} else {
			console.log(
				`⚠️ Директория ${railwayVideosDir} не существует, используем локальную`
			)
			app.use('/uploads/videos', express.static(videosDir))
		}

		if (fs.existsSync(railwaySheetMusicDir)) {
			app.use('/uploads/sheet_music', express.static(railwaySheetMusicDir))
			console.log(
				`✅ Статические файлы из ${railwaySheetMusicDir} доступны по /uploads/sheet_music`
			)
		} else {
			console.log(
				`⚠️ Директория ${railwaySheetMusicDir} не существует, используем локальную`
			)
			app.use('/uploads/sheet_music', express.static(sheetMusicDir))
		}
	} catch (err) {
		console.error('❌ Ошибка при настройке Railway томов:', err.message)
		// Резервный вариант - использовать локальные директории
		app.use('/uploads/avatars', express.static(avatarsDir))
		app.use('/uploads/videos', express.static(videosDir))
		app.use('/uploads/sheet_music', express.static(sheetMusicDir))
	}
} else {
	// Для режима разработки используем локальные директории
	app.use('/uploads/avatars', express.static(avatarsDir))
	app.use('/uploads/videos', express.static(videosDir))
	app.use('/uploads/sheet_music', express.static(sheetMusicDir))
}

// Для проверки работы API
app.get('/api/health', (req, res) => {
	res.json({
		status: 'ok',
		message: 'API работает',
		database: dbConnected ? 'connected' : 'not connected',
		env: process.env.NODE_ENV,
		database_url_format: process.env.DATABASE_URL
			? process.env.DATABASE_URL.replace(
					/postgresql:\/\/([^:]+):([^@]+)@/,
					'postgresql://$1:***@'
			  )
			: 'not set',
		current_time: new Date().toISOString(),
	})
})

// Маршрут для проверки переменных окружения (только для отладки)
app.get('/api/debug/env', (req, res) => {
	// Проверяем секретный ключ для доступа к отладочной информации
	const secretKey = req.query.key
	if (secretKey !== 'dombyra2024') {
		return res.status(403).json({ error: 'Доступ запрещен' })
	}

	// Возвращаем основные переменные окружения (без чувствительных данных)
	res.json({
		node_env: process.env.NODE_ENV,
		port: process.env.PORT,
		database_url_set: !!process.env.DATABASE_URL,
		database_url_parsed: process.env.DATABASE_URL
			? new URL(process.env.DATABASE_URL).host
			: null,
		cors_origin: process.env.CORS_ORIGIN,
		jwt_secret_set: !!process.env.JWT_SECRET,
		db_connected: dbConnected,
		server_time: new Date().toISOString(),
		server_dir: __dirname,
	})
})

// === [Автоматическое добавление колонки parent_id в comments] ===
async function ensureParentIdColumn() {
	try {
		const check = await pool.query(`
			SELECT column_name
			FROM information_schema.columns
			WHERE table_name='comments' AND column_name='parent_id'
		`)
		if (check.rows.length === 0) {
			await pool.query(`
				ALTER TABLE comments
				ADD COLUMN parent_id INTEGER REFERENCES comments(id) ON DELETE CASCADE
			`)
			console.log('✅ Колонка parent_id успешно добавлена в таблицу comments')
		} else {
			console.log('ℹ️ Колонка parent_id уже существует в таблице comments')
		}
	} catch (err) {
		console.error('❌ Ошибка при добавлении колонки parent_id:', err.message)
	}
}

ensureParentIdColumn()
// === [Конец блока автоматического добавления колонки parent_id] ===

// Запускаем сервер
app.listen(PORT, () => {
	console.log(`Сервер запущен на порту ${PORT}`)
	checkDbConnection()
})
