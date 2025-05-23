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

// ✅ Настраиваем `multer` для загрузки нот (ограничиваем размер до 10MB)
const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, '/data/sheet_music/')
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
	limits: { fileSize: 10 * 1024 * 1024 }, // до 10MB для PDF файлов
	fileFilter: (req, file, cb) => {
		// Проверка типа файла (разрешаем только PDF)
		if (file.mimetype === 'application/pdf') {
			cb(null, true)
		} else {
			cb(new Error('Разрешены только PDF файлы'), false)
		}
	},
})

// ✅ Получить все ноты (доступно всем, включая незарегистрированных)
router.get('/', async (req, res) => {
	try {
		const { search, page = 1, limit = 10 } = req.query
		const offset = (parseInt(page) - 1) * parseInt(limit)
		const searchTerm = search ? `%${search.toLowerCase()}%` : null

		const userId = req.user ? req.user.id : null

		let query, params

		console.log('Запрос нот:', {
			search,
			page,
			limit,
			offset,
			searchTerm,
			userId,
		})

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
				params.push(searchTerm, parseInt(limit), offset)
			} else {
				query += `ORDER BY sm.created_at DESC LIMIT $2 OFFSET $3`
				params.push(parseInt(limit), offset)
			}
		} else {
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
				params = [searchTerm, parseInt(limit), offset]
			} else {
				query += `ORDER BY sm.created_at DESC LIMIT $1 OFFSET $2`
				params = [parseInt(limit), offset]
			}
		}

		console.log('SQL-запрос нот:', { query, params })

		const notes = await pool.query(query, params)

		// Фильтруем записи: если file_path есть, но файла нет на сервере — не включаем в выдачу
		const updatedNotes = await Promise.all(
			notes.rows.map(async note => {
				if (!note.file_path) return note
				const fullPath = require('path').join(
					'/data/sheet_music/',
					note.file_path.split('/').pop()
				)
				try {
					await fs.access(fullPath)
					return note
				} catch {
					return null
				}
			})
		)

		res.json(
			updatedNotes.filter(Boolean).map(note => ({
				...note,
				file_path: note.file_path
					? `${process.env.BASE_URL}/${note.file_path}`
					: null,
			}))
		)
	} catch (error) {
		console.error('Ошибка при получении нот с пагинацией:', error, error.stack)
		res.status(500).json({ error: 'Ошибка сервера' })
	}
})

// Получить все ноты, загруженные текущим пользователем
router.get('/user', authenticateToken, async (req, res) => {
	try {
		const userId = req.user.id
		const notes = await pool.query(
			'SELECT * FROM sheet_music WHERE user_id = $1 ORDER BY created_at DESC',
			[userId]
		)
		res.json(notes.rows)
	} catch (error) {
		console.error('Ошибка при получении нот пользователя:', error)
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
			fileUrl = `${process.env.BASE_URL}/${sheetMusic.file_path}`
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
			downloads: sheetMusic.views || 0, // Используем views как downloads, если downloads отсутствует
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

// Новый эндпоинт скачивания нот
router.get('/:id/download', async (req, res) => {
	try {
		const { id } = req.params
		// Получаем информацию о нотах
		const sheet = await pool.query('SELECT * FROM sheet_music WHERE id = $1', [
			id,
		])
		if (sheet.rows.length === 0) {
			return res.status(404).json({ error: 'Ноты не найдены' })
		}
		const filePath = sheet.rows[0].file_path
		if (!filePath) {
			return res.status(404).json({ error: 'Файл нот не найден' })
		}
		// Формируем абсолютный путь к файлу
		const fullPath = path.join('/data/sheet_music/', path.basename(filePath))
		try {
			await fs.access(fullPath)
		} catch {
			return res.status(404).json({ error: 'Файл не найден на сервере' })
		}
		// Увеличиваем счетчик скачиваний
		await pool.query(
			'UPDATE sheet_music SET downloads = downloads + 1 WHERE id = $1',
			[id]
		)
		// Отправляем файл с корректным именем
		res.download(fullPath, `${sheet.rows[0].title || 'sheet'}.pdf`)
	} catch (error) {
		console.error('Ошибка при скачивании нот:', error)
		res.status(500).json({ error: 'Ошибка сервера при скачивании нот' })
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
			const { title, composer, description, difficulty, tags } = req.body
			const file_path = req.file
				? `uploads/sheet_music/${req.file.filename}`
				: null
			const userId = req.user.id

			if (!file_path) {
				return res.status(400).json({ error: 'Файл с нотами обязателен' })
			}

			// Проверяем, что файл действительно существует
			if (file_path) {
				const fullPath = require('path').join(
					'/data/sheet_music/',
					req.file.filename
				)
				try {
					await fs.access(fullPath)
				} catch {
					return res
						.status(500)
						.json({ error: 'Файл не был сохранён на сервере' })
				}
			}

			// Начинаем транзакцию
			const client = await pool.connect()
			try {
				await client.query('BEGIN')

				// Создаем запись о нотах
				const newSheet = await client.query(
					`INSERT INTO sheet_music 
					(title, composer, description, file_path, difficulty, user_id) 
					VALUES ($1, $2, $3, $4, $5, $6) 
					RETURNING *`,
					[
						title,
						composer,
						description || '',
						file_path,
						difficulty || 'intermediate',
						userId,
					]
				)

				const sheetId = newSheet.rows[0].id

				// Если переданы теги, добавляем их
				if (tags && Array.isArray(tags) && tags.length > 0) {
					for (const tag of tags) {
						await client.query(
							`INSERT INTO sheet_music_tags (sheet_music_id, name) 
							VALUES ($1, $2) 
							ON CONFLICT (sheet_music_id, name) DO NOTHING`,
							[sheetId, tag.trim()]
						)
					}
				}

				await client.query('COMMIT')

				res.status(201).json({
					message: 'Ноты успешно добавлены!',
					sheet: newSheet.rows[0],
					file_url: `${process.env.BASE_URL}/${file_path}`,
				})
			} catch (error) {
				await client.query('ROLLBACK')
				throw error
			} finally {
				client.release()
			}
		} catch (error) {
			console.error('Ошибка при добавлении нот:', error)
			// Если ошибка связана с типом файла, возвращаем конкретную ошибку
			if (error.message === 'Разрешены только PDF файлы') {
				return res.status(400).json({ error: error.message })
			}
			res.status(500).json({ error: 'Ошибка сервера при добавлении нот' })
		}
	}
)

// ✅ Обновить информацию о нотах (без файла)
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
			const { title, composer, description, difficulty, tags } = req.body
			const userId = req.user.id

			// Проверяем, существуют ли ноты и принадлежат ли они пользователю
			const sheetCheck = await pool.query(
				'SELECT * FROM sheet_music WHERE id = $1',
				[id]
			)

			if (sheetCheck.rows.length === 0) {
				return res.status(404).json({ error: 'Ноты не найдены' })
			}

			if (sheetCheck.rows[0].user_id !== userId) {
				return res
					.status(403)
					.json({ error: 'У вас нет прав для редактирования этих нот' })
			}

			// Начинаем транзакцию
			const client = await pool.connect()
			try {
				await client.query('BEGIN')

				// Обновляем информацию о нотах
				const updatedSheet = await client.query(
					`UPDATE sheet_music 
					SET title = $1, composer = $2, description = $3, difficulty = $4, updated_at = CURRENT_TIMESTAMP
					WHERE id = $5 
					RETURNING *`,
					[title, composer, description || '', difficulty || 'intermediate', id]
				)

				// Если переданы теги, обновляем их
				if (tags && Array.isArray(tags)) {
					// Удаляем существующие теги
					await client.query(
						'DELETE FROM sheet_music_tags WHERE sheet_music_id = $1',
						[id]
					)

					// Добавляем новые теги
					for (const tag of tags) {
						if (tag.trim()) {
							await client.query(
								`INSERT INTO sheet_music_tags (sheet_music_id, name) 
								VALUES ($1, $2)`,
								[id, tag.trim()]
							)
						}
					}
				}

				await client.query('COMMIT')

				res.json({
					message: 'Информация о нотах успешно обновлена',
					sheet: updatedSheet.rows[0],
				})
			} catch (error) {
				await client.query('ROLLBACK')
				throw error
			} finally {
				client.release()
			}
		} catch (error) {
			console.error('Ошибка при обновлении нот:', error)
			res.status(500).json({ error: 'Ошибка сервера при обновлении нот' })
		}
	}
)

// ✅ Обновить файл нот
router.put(
	'/:id/file',
	authenticateToken,
	upload.single('file'),
	async (req, res) => {
		try {
			const { id } = req.params
			const userId = req.user.id

			if (!req.file) {
				return res.status(400).json({ error: 'Файл с нотами обязателен' })
			}

			// Проверяем, существуют ли ноты и принадлежат ли они пользователю
			const sheetCheck = await pool.query(
				'SELECT * FROM sheet_music WHERE id = $1',
				[id]
			)

			if (sheetCheck.rows.length === 0) {
				return res.status(404).json({ error: 'Ноты не найдены' })
			}

			if (sheetCheck.rows[0].user_id !== userId) {
				return res
					.status(403)
					.json({ error: 'У вас нет прав для редактирования этих нот' })
			}

			const oldFilePath = sheetCheck.rows[0].file_path
			const newFilePath = `uploads/sheet_music/${req.file.filename}`

			// Обновляем запись в базе данных
			const updatedSheet = await pool.query(
				`UPDATE sheet_music 
				SET file_path = $1, updated_at = CURRENT_TIMESTAMP
				WHERE id = $2 
				RETURNING *`,
				[newFilePath, id]
			)

			// Удаляем старый файл, если он существует
			if (oldFilePath) {
				const fullPath = path.join(__dirname, '..', oldFilePath)
				try {
					await fs.unlink(fullPath)
					console.log(`Старый файл удален: ${fullPath}`)
				} catch (error) {
					console.error(`Ошибка при удалении старого файла ${fullPath}:`, error)
					// Продолжаем выполнение, даже если не удалось удалить старый файл
				}
			}

			res.json({
				message: 'Файл нот успешно обновлен',
				sheet: updatedSheet.rows[0],
				file_url: `${process.env.BASE_URL}/${newFilePath}`,
			})
		} catch (error) {
			console.error('Ошибка при обновлении файла нот:', error)
			res.status(500).json({ error: 'Ошибка сервера при обновлении файла нот' })
		}
	}
)

// ✅ Удалить ноты
router.delete('/:id', authenticateToken, async (req, res) => {
	try {
		const { id } = req.params
		const userId = req.user.id

		// Проверяем, существуют ли ноты и принадлежат ли они пользователю
		const sheetCheck = await pool.query(
			'SELECT * FROM sheet_music WHERE id = $1',
			[id]
		)

		if (sheetCheck.rows.length === 0) {
			return res.status(404).json({ error: 'Ноты не найдены' })
		}

		if (sheetCheck.rows[0].user_id !== userId) {
			return res
				.status(403)
				.json({ error: 'У вас нет прав для удаления этих нот' })
		}

		const filePath = sheetCheck.rows[0].file_path

		// Удаляем запись из базы данных
		await pool.query('DELETE FROM sheet_music WHERE id = $1', [id])

		// Удаляем файл, если он существует
		if (filePath) {
			const fullPath = path.join(__dirname, '..', filePath)
			try {
				await fs.unlink(fullPath)
				console.log(`Файл удален: ${fullPath}`)
			} catch (error) {
				console.error(`Ошибка при удалении файла ${fullPath}:`, error)
				// Продолжаем выполнение, даже если не удалось удалить файл
			}
		}

		res.json({ message: 'Ноты успешно удалены' })
	} catch (error) {
		console.error('Ошибка при удалении нот:', error)
		res.status(500).json({ error: 'Ошибка сервера при удалении нот' })
	}
})

module.exports = router
