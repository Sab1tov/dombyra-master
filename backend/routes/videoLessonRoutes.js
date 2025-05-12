const express = require('express')
const pool = require('../db')
const { authenticateToken, isAdmin } = require('../middleware/authMiddleware')
const { progressValidation } = require('../validators/videoValidator')
const { validationResult } = require('express-validator')
const multer = require('multer')
const path = require('path')
const fs = require('fs').promises

const router = express.Router()

// ✅ Настройка multer для загрузки видеофайлов
const videoStorage = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, '/data/videos/')
	},
	filename: (req, file, cb) => {
		const ext = path.extname(file.originalname)
		const filename = `${Date.now()}-${Math.random()
			.toString(36)
			.substring(7)}${ext}`
		cb(null, filename)
	},
})

const uploadVideo = multer({
	storage: videoStorage,
	limits: { fileSize: 500 * 1024 * 1024 }, // до 500MB
})

// ✅ Получить все видеоуроки (доступно всем, включая незарегистрированных)
router.get('/', authenticateToken, async (req, res) => {
	try {
		const { search, page = 1, limit = 10 } = req.query
		const offset = (parseInt(page) - 1) * parseInt(limit)
		const searchTerm = search ? `%${search.toLowerCase()}%` : null

		// Проверяем наличие пользователя в запросе
		const userId = req.user ? req.user.id : null
		let videos, query, params

		if (userId) {
			// Для авторизованных пользователей - возвращаем с прогрессом
			console.log(
				`Получение видеоуроков для авторизованного пользователя userId=${userId}`
			)

			query = `
				SELECT v.*, 
					false AS is_favorite,
					COALESCE(vv.progress, 0) AS progress,
					CASE WHEN vv.progress >= 80 THEN true ELSE false END AS is_completed
				FROM video_lessons v
				LEFT JOIN video_views vv ON v.id = vv.video_id AND vv.user_id = $1
				WHERE 1=1
			`
			params = [userId]
			let paramIndex = 2

			if (searchTerm) {
				query += ` AND (LOWER(v.title) LIKE $${paramIndex} OR LOWER(v.description) LIKE $${paramIndex})`
				params.push(searchTerm)
				paramIndex++
			}

			query += ` ORDER BY v.id ASC LIMIT $${paramIndex} OFFSET $${
				paramIndex + 1
			}`
			params.push(parseInt(limit), offset)
		} else {
			// Для неавторизованных - без прогресса
			console.log('Получение видеоуроков для неавторизованного пользователя')

			// Используем более простой запрос без прогресса
			query = `
				SELECT v.*, 
					false AS is_favorite,
					0 AS progress,
					false AS is_completed
				FROM video_lessons v
				WHERE 1=1
			`
			params = []
			let paramIndex = 1

			if (searchTerm) {
				query += ` AND (LOWER(v.title) LIKE $${paramIndex} OR LOWER(v.description) LIKE $${paramIndex})`
				params.push(searchTerm)
				paramIndex++
			}

			query += ` ORDER BY v.id ASC LIMIT $${paramIndex} OFFSET $${
				paramIndex + 1
			}`
			params.push(parseInt(limit), offset)
		}

		videos = await pool.query(query, params)
		console.log(`Найдено ${videos.rows.length} видеоуроков`)

		// Форматируем данные для фронтенда
		const formattedVideos = videos.rows.map(video => ({
			id: video.id,
			title: video.title,
			description: video.description,
			thumbnail: video.thumbnail_url || '',
			videoUrl: video.video_url || '',
			duration: video.duration || 0,
			difficulty: video.difficulty || 'beginner',
			createdAt: video.created_at || new Date().toISOString(),
			views: video.views || 0,
			likes: video.likes || 0,
			authorName: 'Админ', // Статическое значение, так как у нас нет связи с таблицей users
			authorId: 1, // Статическое значение
			isCompleted: video.is_completed || false,
			isFavorite: video.is_favorite || false,
			progress: video.progress || 0,
		}))

		res.json(formattedVideos)
	} catch (error) {
		console.error('Ошибка при получении видеоуроков:', error)
		res.status(500).json({ error: 'Ошибка сервера' })
	}
})

// ✅ Получить отдельный видеоурок по ID (доступно всем)
router.get('/:id', authenticateToken, async (req, res) => {
	try {
		const { id } = req.params
		// Проверяем наличие пользователя в запросе
		const userId = req.user ? req.user.id : null
		let query, params

		if (userId) {
			// Для авторизованных пользователей получаем с прогрессом
			console.log(
				`Получение видеоурока id=${id} для пользователя userId=${userId}`
			)

			query = `
				SELECT v.*,
					false AS is_favorite,
					COALESCE(vv.progress, 0) AS progress,
					CASE WHEN vv.progress >= 80 THEN true ELSE false END AS is_completed
				FROM video_lessons v
				LEFT JOIN video_views vv ON v.id = vv.video_id AND vv.user_id = $1
				WHERE v.id = $2
			`
			params = [userId, id]
		} else {
			// Для неавторизованных без прогресса
			console.log(
				`Получение видеоурока id=${id} для неавторизованного пользователя`
			)

			query = `
				SELECT v.*,
					false AS is_favorite,
					0 AS progress,
					false AS is_completed
				FROM video_lessons v
				WHERE v.id = $1
			`
			params = [id]
		}

		const result = await pool.query(query, params)

		if (result.rows.length === 0) {
			return res.status(404).json({ error: 'Видеоурок не найден' })
		}

		const video = result.rows[0]

		// Форматируем данные для фронтенда
		const response = {
			id: video.id,
			title: video.title,
			description: video.description || '',
			thumbnail: video.thumbnail_url || '',
			videoUrl: video.video_url || '',
			duration: video.duration || 0,
			difficulty: video.difficulty || 'beginner',
			createdAt: video.created_at || new Date().toISOString(),
			views: video.views || 0,
			likes: video.likes || 0,
			authorName: video.author_name || 'Админ',
			authorId: video.author_id || 1,
			progress: video.progress || 0,
			isCompleted: video.is_completed || false,
			isFavorite: video.is_favorite || false,
		}

		res.json(response)
	} catch (error) {
		console.error('Ошибка при получении видеоурока:', error)
		res.status(500).json({ error: 'Ошибка сервера' })
	}
})

// ✅ Загрузка видеофайла и создание видеоурока (только для админов)
router.post(
	'/upload',
	authenticateToken,
	isAdmin,
	uploadVideo.single('video'),
	async (req, res) => {
		try {
			if (!req.file) {
				return res.status(400).json({ error: 'Файл не загружен' })
			}

			const videoPath = `uploads/videos/${req.file.filename}`
			const videoUrl = `${process.env.BASE_URL}/${videoPath}`

			// Получаем данные из формы
			const { title, description, thumbnail_url, duration } = req.body
			const userId = req.user.id

			// Проверка обязательных полей
			if (!title) {
				return res.status(400).json({ error: 'Название видео обязательно' })
			}

			// Создаем запись в базе данных
			const newVideo = await pool.query(
				`INSERT INTO video_lessons 
				(title, description, video_url, thumbnail_url, duration, author_id) 
				VALUES ($1, $2, $3, $4, $5, $6) 
				RETURNING *`,
				[
					title,
					description || '',
					videoUrl,
					thumbnail_url || '',
					duration ? parseInt(duration) : 0,
					userId,
				]
			)

			res.status(201).json({
				message: 'Видео успешно загружено и создан урок!',
				video_url: videoUrl,
				path: videoPath,
				video: newVideo.rows[0],
			})
		} catch (error) {
			console.error('Ошибка при загрузке видео:', error)
			res.status(500).json({ error: 'Ошибка сервера при загрузке видео' })
		}
	}
)

// ✅ Добавление видеокурса (только для админов)
router.post('/', authenticateToken, isAdmin, async (req, res) => {
	try {
		const { title, description, video_url, thumbnail_url, duration } = req.body
		const userId = req.user.id

		const newVideo = await pool.query(
			`INSERT INTO video_lessons 
			(title, description, video_url, thumbnail_url, duration, author_id) 
			VALUES ($1, $2, $3, $4, $5, $6) 
			RETURNING *`,
			[title, description, video_url, thumbnail_url, duration, userId]
		)

		res.status(201).json({
			message: 'Видеоурок успешно добавлен!',
			video: newVideo.rows[0],
		})
	} catch (error) {
		console.error('Ошибка при добавлении видеоурока:', error)
		res.status(500).json({ error: 'Ошибка сервера' })
	}
})

// ✅ Обновление видеокурса (только для админов)
router.put('/:id', authenticateToken, isAdmin, async (req, res) => {
	try {
		const { id } = req.params
		const { title, description, video_url, thumbnail_url, duration } = req.body

		// Проверяем существование видеоурока
		const existingVideo = await pool.query(
			'SELECT * FROM video_lessons WHERE id = $1',
			[id]
		)

		if (existingVideo.rows.length === 0) {
			return res.status(404).json({ error: 'Видеоурок не найден' })
		}

		// Формируем запрос на обновление
		let query = 'UPDATE video_lessons SET updated_at = NOW()'
		const params = []
		let paramIndex = 1

		if (title) {
			query += `, title = $${paramIndex}`
			params.push(title)
			paramIndex++
		}

		if (description) {
			query += `, description = $${paramIndex}`
			params.push(description)
			paramIndex++
		}

		if (video_url) {
			query += `, video_url = $${paramIndex}`
			params.push(video_url)
			paramIndex++
		}

		if (thumbnail_url) {
			query += `, thumbnail_url = $${paramIndex}`
			params.push(thumbnail_url)
			paramIndex++
		}

		if (duration) {
			query += `, duration = $${paramIndex}`
			params.push(duration)
			paramIndex++
		}

		query += ` WHERE id = $${paramIndex} RETURNING *`
		params.push(id)

		const updatedVideo = await pool.query(query, params)

		res.json({
			message: 'Видеоурок успешно обновлен!',
			video: updatedVideo.rows[0],
		})
	} catch (error) {
		console.error('Ошибка при обновлении видеоурока:', error)
		res.status(500).json({ error: 'Ошибка сервера' })
	}
})

// ✅ Удаление видеокурса (только для админов)
router.delete('/:id', authenticateToken, isAdmin, async (req, res) => {
	try {
		const { id } = req.params

		// Проверяем существование видеоурока
		const existingVideo = await pool.query(
			'SELECT * FROM video_lessons WHERE id = $1',
			[id]
		)

		if (existingVideo.rows.length === 0) {
			return res.status(404).json({ error: 'Видеоурок не найден' })
		}

		// Удаляем связанные записи
		await pool.query('DELETE FROM video_views WHERE video_id = $1', [id])

		// Проверяем существование колонки video_id в таблице favorites
		const columnExists = await pool.query(`
			SELECT column_name FROM information_schema.columns 
			WHERE table_name = 'favorites' AND column_name = 'video_id'
		`)

		if (columnExists.rows.length > 0) {
			await pool.query('DELETE FROM favorites WHERE video_id = $1', [id])
		}

		// Проверяем существование колонки video_id в таблице comments
		const commentsColumnExists = await pool.query(`
			SELECT column_name FROM information_schema.columns 
			WHERE table_name = 'comments' AND column_name = 'video_id'
		`)

		if (commentsColumnExists.rows.length > 0) {
			await pool.query('DELETE FROM comments WHERE video_id = $1', [id])
		}

		// Удаляем видеоурок
		await pool.query('DELETE FROM video_lessons WHERE id = $1', [id])

		res.json({ message: 'Видеоурок успешно удален!' })
	} catch (error) {
		console.error('Ошибка при удалении видеоурока:', error)
		res.status(500).json({ error: 'Ошибка сервера' })
	}
})

// Отметить видео как просмотренное (обновить прогресс) - основной обработчик
router.put('/:id/progress', authenticateToken, async (req, res) => {
	try {
		const videoId = req.params.id
		const userId = req.user.id
		const { progress } = req.body

		console.log(
			`Попытка сохранения прогресса: userId=${userId}, videoId=${videoId}, progress=${progress}%`
		)

		// Проверяем допустимость прогресса
		if (progress < 0 || progress > 100) {
			return res
				.status(400)
				.json({ message: 'Недопустимое значение прогресса' })
		}

		// Проверяем, существует ли запись о просмотре
		const viewCheckResult = await pool.query(
			'SELECT id FROM video_views WHERE user_id = $1 AND video_id = $2',
			[userId, videoId]
		)

		if (viewCheckResult.rows.length === 0) {
			// Создаем новую запись, если не существует
			console.log(
				`Создание новой записи о просмотре для userId=${userId}, videoId=${videoId}`
			)
			try {
				await pool.query(
					'INSERT INTO video_views (user_id, video_id, progress) VALUES ($1, $2, $3)',
					[userId, videoId, progress]
				)
			} catch (insertErr) {
				console.error('Ошибка при создании записи о просмотре:', insertErr)
				// Проверяем наличие колонки updated_at
				if (insertErr.message && insertErr.message.includes('updated_at')) {
					// Пробуем создать запись без обновления updated_at
					await pool.query(
						'INSERT INTO video_views (user_id, video_id, progress, created_at) VALUES ($1, $2, $3, NOW())',
						[userId, videoId, progress]
					)
				} else {
					throw insertErr // Пробрасываем другие ошибки
				}
			}
		} else {
			// Обновляем существующую запись
			console.log(
				`Обновление существующей записи о просмотре для userId=${userId}, videoId=${videoId}`
			)
			try {
				await pool.query(
					'UPDATE video_views SET progress = GREATEST(progress, $1) WHERE user_id = $2 AND video_id = $3',
					[progress, userId, videoId]
				)
			} catch (updateErr) {
				console.error('Ошибка при обновлении записи о просмотре:', updateErr)
				// Проверяем наличие колонки updated_at
				if (updateErr.message && updateErr.message.includes('updated_at')) {
					// Пробуем обновить запись без обновления updated_at
					await pool.query(
						'UPDATE video_views SET progress = GREATEST(progress, $1) WHERE user_id = $2 AND video_id = $3',
						[progress, userId, videoId]
					)
				} else {
					throw updateErr // Пробрасываем другие ошибки
				}
			}
		}

		// Если прогресс достиг 80%, проверяем следующий урок и разблокируем его
		if (progress >= 80) {
			console.log(
				`Прогресс достиг ${progress}% - проверяем следующий урок для разблокировки`
			)
			// Получаем следующий урок по ID
			const nextVideoResult = await pool.query(
				`SELECT id FROM video_lessons WHERE id > $1 ORDER BY id ASC LIMIT 1`,
				[videoId]
			)

			if (nextVideoResult.rows.length > 0) {
				const nextVideoId = nextVideoResult.rows[0].id
				console.log(
					`Следующий урок id=${nextVideoId} найден, проверяем доступ к нему`
				)

				// Проверяем, существует ли запись о просмотре для следующего видео
				const nextViewCheckResult = await pool.query(
					'SELECT id FROM video_views WHERE user_id = $1 AND video_id = $2',
					[userId, nextVideoId]
				)

				if (nextViewCheckResult.rows.length === 0) {
					// Создаем запись о просмотре для следующего видео с нулевым прогрессом,
					// чтобы пометить его как доступное
					console.log(`Разблокировка следующего урока id=${nextVideoId}`)
					try {
						await pool.query(
							'INSERT INTO video_views (user_id, video_id, progress) VALUES ($1, $2, 0)',
							[userId, nextVideoId]
						)
					} catch (insertNextErr) {
						console.error(
							'Ошибка при разблокировке следующего урока:',
							insertNextErr
						)
						// Проверяем наличие колонки updated_at
						if (
							insertNextErr.message &&
							insertNextErr.message.includes('updated_at')
						) {
							// Пробуем создать запись без обновления updated_at
							await pool.query(
								'INSERT INTO video_views (user_id, video_id, progress, created_at) VALUES ($1, $2, 0, NOW())',
								[userId, nextVideoId]
							)
						} else {
							throw insertNextErr // Пробрасываем другие ошибки
						}
					}
				} else {
					console.log(
						`Следующий урок id=${nextVideoId} уже имеет запись о просмотре`
					)
				}
			}
		}

		res.json({
			message: 'Прогресс обновлен успешно',
			progress: progress,
			isCompleted: progress >= 80,
		})
	} catch (err) {
		console.error('Ошибка при обновлении прогресса просмотра:', err)
		res.status(500).json({ message: 'Ошибка сервера: ' + err.message })
	}
})

// GET /api/video-lessons/:id/next - получение следующего видеоурока
router.get('/:id/next', authenticateToken, async (req, res) => {
	try {
		const videoId = req.params.id
		const userId = req.user.id

		console.log(
			`Запрос следующего урока: текущий урок id=${videoId}, user=${userId}`
		)

		// Проверяем, просмотрен ли текущий урок (достиг ли пользователь 80% просмотра)
		const progressResult = await pool.query(
			`SELECT progress FROM video_views 
       WHERE user_id = $1 AND video_id = $2`,
			[userId, videoId]
		)

		// Текущий урок должен быть просмотрен минимум на 80%
		const currentProgress =
			progressResult.rows.length > 0 ? progressResult.rows[0].progress : 0
		const isCurrentCompleted = currentProgress >= 80

		console.log(
			`Прогресс текущего урока id=${videoId}: ${currentProgress}%, считается завершенным: ${isCurrentCompleted}`
		)

		// Получаем следующий урок, следующий по ID
		const nextVideoResult = await pool.query(
			`SELECT id, title FROM video_lessons 
       WHERE id > $1 
       ORDER BY id ASC 
       LIMIT 1`,
			[videoId]
		)

		if (nextVideoResult.rows.length === 0) {
			// Следующего урока нет
			console.log(`Следующего урока после id=${videoId} не найдено`)
			return res.json(null)
		}

		const nextVideo = nextVideoResult.rows[0]
		console.log(`Найден следующий урок id=${nextVideo.id}: ${nextVideo.title}`)

		// Автоматически создаем запись для следующего урока, если текущий просмотрен на 80%+
		if (isCurrentCompleted) {
			console.log(
				`Текущий урок завершен, проверяем доступ к следующему id=${nextVideo.id}`
			)

			// Проверяем, разблокирован ли следующий урок
			const nextVideoProgressResult = await pool.query(
				`SELECT progress FROM video_views 
         WHERE user_id = $1 AND video_id = $2`,
				[userId, nextVideo.id]
			)

			const hasProgressInNext = nextVideoProgressResult.rows.length > 0

			if (!hasProgressInNext) {
				// Автоматически разблокируем следующий урок
				console.log(
					`Автоматически разблокируем следующий урок id=${nextVideo.id}`
				)
				try {
					await pool.query(
						'INSERT INTO video_views (user_id, video_id, progress) VALUES ($1, $2, 0)',
						[userId, nextVideo.id]
					)
				} catch (insertErr) {
					console.error(
						`Ошибка при разблокировке урока id=${nextVideo.id}:`,
						insertErr
					)
					if (insertErr.message && insertErr.message.includes('updated_at')) {
						await pool.query(
							'INSERT INTO video_views (user_id, video_id, progress, created_at) VALUES ($1, $2, 0, NOW())',
							[userId, nextVideo.id]
						)
					}
				}

				console.log(`Следующий урок id=${nextVideo.id} успешно разблокирован`)
				return res.json(nextVideo)
			} else {
				console.log(
					`Следующий урок id=${nextVideo.id} уже был разблокирован ранее`
				)
				return res.json(nextVideo)
			}
		} else {
			// Если следующий урок заблокирован, отправляем информацию о нем с флагом isLocked
			console.log(
				`Текущий урок не завершен, следующий урок id=${nextVideo.id} остается заблокированным`
			)
			return res.json({
				...nextVideo,
				isLocked: true,
			})
		}
	} catch (err) {
		console.error('Ошибка при получении следующего видеоурока:', err)
		res.status(500).json({ message: 'Ошибка сервера', error: err.message })
	}
})

// Увеличение счетчика просмотров - основной обработчик
router.put('/:id/view', async (req, res) => {
	try {
		const { id } = req.params

		await pool.query(
			'UPDATE video_lessons SET views = views + 1 WHERE id = $1',
			[id]
		)

		res.json({ message: 'Просмотр засчитан' })
	} catch (error) {
		console.error('Ошибка при учете просмотра:', error)
		res.status(500).json({ error: 'Ошибка сервера' })
	}
})

module.exports = router
