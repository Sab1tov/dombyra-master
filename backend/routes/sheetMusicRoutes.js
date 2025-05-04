const express = require('express')
const pool = require('../db')
const { authenticateToken } = require('../middleware/authMiddleware')
const { sheetMusicValidation } = require('../validators/sheetMusicValidator')
const { validationResult } = require('express-validator')

const multer = require('multer')
const path = require('path')
const fs = require('fs').promises
require('dotenv').config()

const router = express.Router()

// ✅ Настраиваем `multer` (ограничиваем размер до 5MB)
const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, 'uploads/')
	},
	filename: (req, file, cb) => {
		const ext = path.extname(file.originalname)
		const filename = `${Date.now()}-${Math.random()
			.toString(36)
			.substring(7)}${ext}`
		cb(null, filename)
	},
})

const upload = multer({
	storage,
	limits: { fileSize: 5 * 1024 * 1024 },
})

// ✅ Получить все ноты (доступно всем, включая незарегистрированных)
router.get('/', async (req, res) => {
	try {
		const { search, page = 1, limit = 10 } = req.query
		const offset = (parseInt(page) - 1) * parseInt(limit)
		const searchTerm = search ? `%${search.toLowerCase()}%` : null

		// Проверяем наличие пользователя в запросе
		const userId = req.user ? req.user.id : null

		let query, params

		// Если пользователь авторизован, добавляем информацию о его избранном
		if (userId) {
			query = `
				SELECT sm.*, u.username AS owner_username,
					COALESCE(f.sheet_music_id IS NOT NULL, false) AS is_favorite
				FROM sheet_music sm
				JOIN users u ON sm.user_id = u.id
				LEFT JOIN favorites f ON f.sheet_music_id = sm.id AND f.user_id = $1
			`
			params = [userId]

			if (searchTerm) {
				query += `
					WHERE LOWER(sm.title) LIKE $2 OR LOWER(sm.composer) LIKE $2
					ORDER BY sm.created_at DESC
					LIMIT $3 OFFSET $4
				`
				params.push(searchTerm, limit, offset)
			} else {
				query += `ORDER BY sm.created_at DESC LIMIT $2 OFFSET $3`
				params.push(limit, offset)
			}
		} else {
			// Для неавторизованных пользователей не показываем избранное
			query = `
				SELECT sm.*, u.username AS owner_username, 
					false AS is_favorite
				FROM sheet_music sm
				JOIN users u ON sm.user_id = u.id
			`

			if (searchTerm) {
				query += `
					WHERE LOWER(sm.title) LIKE $1 OR LOWER(sm.composer) LIKE $1
					ORDER BY sm.created_at DESC
					LIMIT $2 OFFSET $3
				`
				params = [searchTerm, limit, offset]
			} else {
				query += `ORDER BY sm.created_at DESC LIMIT $1 OFFSET $2`
				params = [limit, offset]
			}
		}

		const notes = await pool.query(query, params)

		const updatedNotes = notes.rows.map(note => ({
			...note,
			file_path: note.file_path
				? `http://localhost:5000/${note.file_path}`
				: null,
		}))

		res.json(updatedNotes)
	} catch (error) {
		console.error('Ошибка при получении нот с пагинацией:', error)
		res.status(500).json({ error: 'Ошибка сервера' })
	}
})

// ✅ Получить отдельный нотный материал по ID (доступно всем)
router.get('/:id', async (req, res) => {
	try {
		const { id } = req.params
		const userId = req.user ? req.user.id : null

		// Сначала проверим существование записи с данным ID
		const checkResult = await pool.query(
			'SELECT * FROM sheet_music WHERE id = $1',
			[id]
		)

		if (checkResult.rows.length === 0) {
			return res.status(404).json({ error: 'Нотный материал не найден' })
		}

		// Безопасный запрос с проверкой существования необходимых полей и связей
		let sheetMusic = checkResult.rows[0]
		let user = { username: 'Неизвестный автор', id: null }
		let isFavorite = false

		// Попытка получить информацию о пользователе-авторе, если поле user_id существует
		if (sheetMusic.user_id) {
			try {
				const userResult = await pool.query(
					'SELECT username, id FROM users WHERE id = $1',
					[sheetMusic.user_id]
				)
				if (userResult.rows.length > 0) {
					user = userResult.rows[0]
				}
			} catch (userErr) {
				console.error('Ошибка при получении данных о пользователе:', userErr)
				// Продолжаем с данными по умолчанию
			}
		}

		// Проверка избранного только для авторизованных пользователей
		if (userId) {
			try {
				const favoriteResult = await pool.query(
					'SELECT * FROM favorites WHERE user_id = $1 AND sheet_music_id = $2',
					[userId, id]
				)
				isFavorite = favoriteResult.rows.length > 0
			} catch (favErr) {
				console.error('Ошибка при проверке избранного:', favErr)
				// Продолжаем выполнение, считая что не в избранном
			}
		}

		// Преобразуем пути к файлам в полные URL
		let fileUrl = ''
		if (sheetMusic.file_path) {
			fileUrl = `http://localhost:5000/${sheetMusic.file_path}`
		}

		// Получаем информацию о тегах (если они есть в отдельной таблице)
		let tags = []
		try {
			// Попытка получить теги, если такая таблица существует
			const tagsResult = await pool.query(
				`SELECT name FROM sheet_music_tags WHERE sheet_music_id = $1`,
				[id]
			)
			tags = tagsResult.rows.map(tag => tag.name)
		} catch (err) {
			// Продолжаем выполнение без тегов
		}

		// Форматируем данные для фронтенда с учетом существующей структуры базы данных
		const response = {
			id: sheetMusic.id,
			title: sheetMusic.title || 'Без названия',
			description: sheetMusic.composer || '', // Используем composer как описание, если description отсутствует
			fileUrl: fileUrl,
			thumbnailUrl: sheetMusic.thumbnail_url || '/images/placeholder-sheet.jpg', // Значение по умолчанию
			instrument: 'dombyra', // Домбыра по умолчанию
			difficulty: 'intermediate', // Средняя сложность по умолчанию
			createdAt: sheetMusic.created_at || new Date().toISOString(),
			downloads: sheetMusic.downloads || 0,
			likes: sheetMusic.views || 0, // Используем views как likes, если likes отсутствует
			pages: 1, // Значение по умолчанию
			authorName: user.username,
			authorId: user.id,
			isFavorite: isFavorite,
			tags: tags,
		}

		console.log('API response for sheet-music:', response)

		res.json(response)
	} catch (error) {
		console.error('Ошибка при получении нотного материала:', error)
		res.status(500).json({
			error: 'Ошибка сервера',
			details: error.message,
		})
	}
})

// Скачать файл (доступно всем пользователям)
router.get('/download/:id', async (req, res) => {
	try {
		const { id } = req.params

		const note = await pool.query(
			'SELECT file_path FROM sheet_music WHERE id = $1',
			[id]
		)

		if (note.rows.length === 0) {
			return res.status(404).json({ error: 'Файл не найден в базе данных' })
		}

		const filePath = note.rows[0].file_path
		if (!filePath) {
			return res.status(404).json({ error: 'Файл отсутствует' })
		}

		const fullPath = path.join(__dirname, '..', filePath)

		try {
			await fs.access(fullPath)
		} catch {
			return res.status(404).json({ error: 'Файл не найден на сервере' })
		}

		// Увеличиваем счетчик скачиваний только если пользователь авторизован
		if (req.user) {
			await pool.query(
				'UPDATE sheet_music SET downloads = downloads + 1 WHERE id = $1',
				[id]
			)
		}

		res.download(fullPath)
	} catch (error) {
		console.error('Ошибка при скачивании файла:', error)
		res.status(500).json({ error: 'Ошибка сервера' })
	}
})

// ✅ Добавить ноту (с валидацией)
router.post(
	'/',
	authenticateToken,
	upload.single('file'),
	sheetMusicValidation,
	async (req, res) => {
		const errors = validationResult(req)
		if (!errors.isEmpty()) {
			return res.status(400).json({ errors: errors.array() })
		}

		try {
			const { title, composer } = req.body
			const file_path = req.file ? `uploads/${req.file.filename}` : null
			const userId = req.user.id

			const newNote = await pool.query(
				`INSERT INTO sheet_music (title, composer, file_path, user_id) 
			 VALUES ($1, $2, $3, $4) RETURNING *`,
				[title, composer, file_path, userId]
			)

			res
				.status(201)
				.json({ message: 'Нота добавлена!', note: newNote.rows[0] })
		} catch (error) {
			console.error('Ошибка при добавлении ноты:', error)
			res.status(500).json({ error: 'Ошибка сервера' })
		}
	}
)

// ✅ Удалить ноту
router.delete('/:id', authenticateToken, async (req, res) => {
	try {
		const { id } = req.params
		const userId = req.user.id
		const userRole = req.user.role

		const note = await pool.query('SELECT * FROM sheet_music WHERE id = $1', [
			id,
		])
		if (note.rows.length === 0) {
			return res.status(404).json({ error: 'Нота не найдена' })
		}

		if (note.rows[0].user_id !== userId && userRole !== 'admin') {
			return res.status(403).json({ error: 'Нет прав на удаление' })
		}

		if (note.rows[0].file_path) {
			const filePath = path.join(__dirname, '..', note.rows[0].file_path)
			try {
				await fs.access(filePath)
				await fs.unlink(filePath)
				console.log(`✅ Файл удалён: ${filePath}`)
			} catch {
				console.warn(`⚠️ Файл не найден: ${filePath}`)
			}
		}

		await pool.query('DELETE FROM sheet_music WHERE id = $1', [id])
		res.json({ message: 'Нота и файл удалены!' })
	} catch (error) {
		console.error('Ошибка при удалении ноты:', error)
		res.status(500).json({ error: 'Ошибка сервера' })
	}
})

// ✅ Редактировать ноту (только владелец или админ)
router.put(
	'/:id',
	authenticateToken,
	sheetMusicValidation,
	async (req, res) => {
		const errors = validationResult(req)
		if (!errors.isEmpty()) {
			return res.status(400).json({ errors: errors.array() })
		}

		try {
			const { id } = req.params
			const { title, composer } = req.body
			const userId = req.user.id
			const userRole = req.user.role

			const note = await pool.query('SELECT * FROM sheet_music WHERE id = $1', [
				id,
			])
			if (note.rows.length === 0) {
				return res.status(404).json({ error: 'Нота не найдена' })
			}

			// Только автор или админ
			if (note.rows[0].user_id !== userId && userRole !== 'admin') {
				return res.status(403).json({ error: 'Нет прав на редактирование' })
			}

			const updated = await pool.query(
				'UPDATE sheet_music SET title = $1, composer = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
				[title, composer, id]
			)

			res.json({ message: 'Нота обновлена!', note: updated.rows[0] })
		} catch (error) {
			console.error('Ошибка при редактировании ноты:', error)
			res.status(500).json({ error: 'Ошибка сервера' })
		}
	}
)

// ✅ Засчитать просмотр (только авторизованные)
router.put('/:id/view', authenticateToken, async (req, res) => {
	try {
		const { id } = req.params

		const note = await pool.query('SELECT id FROM sheet_music WHERE id = $1', [
			id,
		])
		if (note.rows.length === 0) {
			return res.status(404).json({ error: 'Нота не найдена' })
		}

		await pool.query('UPDATE sheet_music SET views = views + 1 WHERE id = $1', [
			id,
		])
		res.json({ message: 'Просмотр засчитан' })
	} catch (error) {
		console.error('Ошибка при увеличении просмотров:', error)
		res.status(500).json({ error: 'Ошибка сервера' })
	}
})

// ✅ Инкрементировать счетчик загрузок (только для авторизованных)
router.post('/:id/download', authenticateToken, async (req, res) => {
	try {
		const { id } = req.params
		const userId = req.user.id

		// Проверяем существование ноты
		const noteExists = await pool.query(
			'SELECT id FROM sheet_music WHERE id = $1',
			[id]
		)

		if (noteExists.rows.length === 0) {
			return res.status(404).json({ error: 'Нота не найдена' })
		}

		// Увеличиваем счетчик загрузок
		await pool.query(
			'UPDATE sheet_music SET downloads = downloads + 1 WHERE id = $1',
			[id]
		)

		res.json({ message: 'Счетчик загрузок увеличен' })
	} catch (error) {
		console.error('Ошибка при обновлении счетчика загрузок:', error)
		res.status(500).json({ error: 'Ошибка сервера' })
	}
})

module.exports = router
