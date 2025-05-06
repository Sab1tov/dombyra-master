const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const path = require('path')
const pool = require('./db')
require('dotenv').config()

// Routes - исправляем пути к модулям
const authRoutes = require('./routes/authRoutes')
const videoLessonRoutes = require('./routes/videoLessonRoutes')
const sheetMusicRoutes = require('./routes/sheetMusicRoutes')
const favoriteRoutes = require('./routes/favoriteRoutes')
const commentRoutes = require('./routes/commentRoutes')

// Создаем экземпляр Express
const app = express()

// Настраиваем порт
const PORT = process.env.PORT || 5000

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

// Проверка подключения к БД при запуске
const checkDbConnection = async () => {
	try {
		const client = await pool.connect()
		console.log('✅ Успешное подключение к PostgreSQL')
		client.release()
	} catch (err) {
		console.error('❌ Ошибка подключения к PostgreSQL:', err)
	}
}

// Добавление статической директории для загруженных файлов
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

// Для проверки работы API
app.get('/api/health', (req, res) => {
	res.json({ status: 'ok', message: 'API работает' })
})

// Запускаем сервер
app.listen(PORT, () => {
	console.log(`Сервер запущен на порту ${PORT}`)
	checkDbConnection()
})
