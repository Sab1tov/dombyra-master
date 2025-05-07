const express = require('express')
const pool = require('../db')
const { authenticateToken } = require('../middleware/authMiddleware')
require('dotenv').config()

const router = express.Router()

// ✅ Получить все комментарии к определённой ноте (с лайками)
router.get('/:sheetMusicId', authenticateToken, async (req, res) => {
	try {
		const { sheetMusicId } = req.params
		const userId = req.user ? req.user.id : null

		const comments = await pool.query(
			`SELECT c.id, c.content, c.created_at, u.username AS user_username,
			        COUNT(cl.id) AS likes_count,
			        CASE 
			            WHEN EXISTS (
			                SELECT 1 FROM comment_likes cl2 WHERE cl2.comment_id = c.id AND cl2.user_id = $2
			            ) THEN TRUE ELSE FALSE 
			        END AS user_liked
			 FROM comments c
			 JOIN users u ON c.user_id = u.id
			 LEFT JOIN comment_likes cl ON c.id = cl.comment_id
			 WHERE c.sheet_music_id = $1 
			 GROUP BY c.id, u.username
			 ORDER BY c.created_at ASC`,
			[sheetMusicId, userId]
		)

		res.json(comments.rows)
	} catch (error) {
		console.error('❌ Ошибка при получении комментариев:', error.message)
		res
			.status(500)
			.json({ error: 'Ошибка сервера. Не удалось получить комментарии.' })
	}
})

// ✅ Добавить комментарий
router.post('/:sheetMusicId', authenticateToken, async (req, res) => {
	try {
		const { sheetMusicId } = req.params
		const { content } = req.body
		const userId = req.user.id

		if (!content || content.trim().length === 0) {
			return res
				.status(400)
				.json({ error: 'Комментарий не может быть пустым.' })
		}
		if (content.length > 500) {
			return res
				.status(400)
				.json({ error: 'Комментарий слишком длинный (макс. 500 символов).' })
		}

		const note = await pool.query('SELECT id FROM sheet_music WHERE id = $1', [
			sheetMusicId,
		])
		if (note.rows.length === 0) {
			return res.status(404).json({ error: 'Нота не найдена' })
		}

		const newComment = await pool.query(
			'INSERT INTO comments (sheet_music_id, user_id, content) VALUES ($1, $2, $3) RETURNING *',
			[sheetMusicId, userId, content]
		)

		res
			.status(201)
			.json({ message: 'Комментарий добавлен!', comment: newComment.rows[0] })
	} catch (error) {
		console.error('❌ Ошибка при добавлении комментария:', error.message)
		res
			.status(500)
			.json({ error: 'Ошибка сервера. Не удалось добавить комментарий.' })
	}
})

// ✅ Редактировать комментарий (только владелец)
router.put('/:commentId', authenticateToken, async (req, res) => {
	try {
		const { commentId } = req.params
		const { content } = req.body
		const userId = req.user.id

		if (!content || content.trim().length === 0) {
			return res
				.status(400)
				.json({ error: 'Комментарий не может быть пустым.' })
		}
		if (content.length > 500) {
			return res
				.status(400)
				.json({ error: 'Комментарий слишком длинный (макс. 500 символов).' })
		}

		const comment = await pool.query('SELECT * FROM comments WHERE id = $1', [
			commentId,
		])
		if (comment.rows.length === 0) {
			return res.status(404).json({ error: 'Комментарий не найден' })
		}

		if (comment.rows[0].user_id !== userId) {
			return res.status(403).json({ error: 'Нет прав на редактирование' })
		}

		const updatedComment = await pool.query(
			'UPDATE comments SET content = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
			[content, commentId]
		)

		res.json({
			message: 'Комментарий обновлён!',
			comment: updatedComment.rows[0],
		})
	} catch (error) {
		console.error('❌ Ошибка при редактировании комментария:', error.message)
		res
			.status(500)
			.json({ error: 'Ошибка сервера. Не удалось обновить комментарий.' })
	}
})

// ✅ Удалить комментарий (свои или админ может любые)
router.delete('/:commentId', authenticateToken, async (req, res) => {
	try {
		const { commentId } = req.params
		const userId = req.user.id
		const userRole = req.user.role

		const comment = await pool.query('SELECT * FROM comments WHERE id = $1', [
			commentId,
		])
		if (comment.rows.length === 0) {
			return res.status(404).json({ error: 'Комментарий не найден' })
		}

		if (userRole !== 'admin' && comment.rows[0].user_id !== userId) {
			return res.status(403).json({ error: 'Нет прав на удаление' })
		}

		await pool.query(
			'INSERT INTO comment_deletes_log (comment_id, deleted_by, deleted_at) VALUES ($1, $2, NOW())',
			[commentId, userId]
		)

		await pool.query('DELETE FROM comments WHERE id = $1', [commentId])

		res.json({ message: 'Комментарий удалён!' })
	} catch (error) {
		console.error('❌ Ошибка при удалении комментария:', error.message)
		res
			.status(500)
			.json({ error: 'Ошибка сервера. Не удалось удалить комментарий.' })
	}
})

// ✅ Лайкнуть комментарий
router.post('/:commentId/like', authenticateToken, async (req, res) => {
	try {
		const { commentId } = req.params
		const userId = req.user.id

		const existingLike = await pool.query(
			'SELECT * FROM comment_likes WHERE comment_id = $1 AND user_id = $2',
			[commentId, userId]
		)
		if (existingLike.rows.length > 0) {
			return res.status(400).json({ error: 'Вы уже лайкнули этот комментарий' })
		}

		await pool.query(
			'INSERT INTO comment_likes (comment_id, user_id) VALUES ($1, $2)',
			[commentId, userId]
		)

		await pool.query(
			'INSERT INTO comment_likes_log (comment_id, liked_by, action) VALUES ($1, $2, $3)',
			[commentId, userId, 'like']
		)

		res.json({ message: 'Комментарий лайкнут!' })
	} catch (error) {
		console.error('❌ Ошибка при лайке комментария:', error.message)
		res
			.status(500)
			.json({ error: 'Ошибка сервера. Не удалось поставить лайк.' })
	}
})

// ✅ Удалить лайк
router.delete('/:commentId/like', authenticateToken, async (req, res) => {
	try {
		const { commentId } = req.params
		const userId = req.user.id

		const result = await pool.query(
			'DELETE FROM comment_likes WHERE comment_id = $1 AND user_id = $2 RETURNING *',
			[commentId, userId]
		)

		if (result.rowCount === 0) {
			return res.status(404).json({ error: 'Лайк не найден' })
		}

		await pool.query(
			'INSERT INTO comment_likes_log (comment_id, liked_by, action) VALUES ($1, $2, $3)',
			[commentId, userId, 'unlike']
		)

		res.json({ message: 'Лайк удалён!' })
	} catch (error) {
		console.error('❌ Ошибка при удалении лайка:', error.message)
		res.status(500).json({ error: 'Ошибка сервера. Не удалось удалить лайк.' })
	}
})

// Получить комментарии для нотного материала
router.get('/sheet_music/:id', async (req, res) => {
	try {
		const { id } = req.params
		console.log('Запрос комментариев для sheet_music ID:', id)

		if (!id || isNaN(parseInt(id))) {
			return res.status(400).json({ error: 'Неверный ID нотного материала' })
		}

		// Проверяем, существует ли sheet_music с таким ID
		try {
			const sheetMusicCheck = await pool.query(
				'SELECT EXISTS(SELECT 1 FROM sheet_music WHERE id = $1)',
				[id]
			)

			if (!sheetMusicCheck.rows[0].exists) {
				return res.status(404).json({ error: 'Нотный материал не найден' })
			}
		} catch (checkErr) {
			console.error(
				'Ошибка при проверке существования нотного материала:',
				checkErr
			)
			// Продолжаем выполнение, даже если проверка не удалась
		}

		// Безопасный запрос комментариев с обработкой возможных ошибок
		try {
			// Теперь можем использовать avatar, так как поле добавлено в таблицу
			const comments = await pool.query(
				`SELECT c.*, u.username, u.avatar_url AS avatar
				FROM comments c
				JOIN users u ON c.user_id = u.id
				WHERE c.sheet_music_id = $1 AND c.parent_id IS NULL
				ORDER BY c.created_at DESC`,
				[id]
			)

			// Получаем ответы на комментарии
			const result = []
			for (let comment of comments.rows) {
				const formattedComment = {
					id: comment.id,
					content: comment.content,
					createdAt: comment.created_at,
					updatedAt: comment.updated_at,
					user: {
						id: comment.user_id,
						username: comment.username,
						avatar: comment.avatar || null,
					},
					likes: 0,
					isLiked: false,
				}

				try {
					const replies = await pool.query(
						`SELECT r.*, u.username, u.avatar_url AS avatar
						FROM comments r
						JOIN users u ON r.user_id = u.id
						WHERE r.parent_id = $1
						ORDER BY r.created_at`,
						[comment.id]
					)

					if (replies.rows.length > 0) {
						formattedComment.replies = replies.rows.map(reply => ({
							id: reply.id,
							content: reply.content,
							createdAt: reply.created_at,
							updatedAt: reply.updated_at,
							parentId: reply.parent_id,
							user: {
								id: reply.user_id,
								username: reply.username,
								avatar: reply.avatar || null,
							},
							likes: 0,
							isLiked: false,
						}))
					}
				} catch (repliesErr) {
					console.error(
						'Ошибка при загрузке ответов на комментарий:',
						repliesErr
					)
					// Продолжаем выполнение с пустым массивом ответов
					formattedComment.replies = []
				}

				result.push(formattedComment)
			}

			res.json(result)
		} catch (commentsErr) {
			console.error('Ошибка при загрузке комментариев:', commentsErr)
			// В случае ошибки возвращаем пустой массив
			res.json([])
		}
	} catch (error) {
		console.error('Ошибка при получении комментариев:', error)
		// В случае серьезной ошибки возвращаем статус 500 и информацию об ошибке
		res.status(500).json({
			error: 'Ошибка сервера при получении комментариев',
			details: error.message,
		})
	}
})

// Получить комментарии для видео
router.get('/video/:id', async (req, res) => {
	try {
		const { id } = req.params
		console.log('Запрос комментариев для video ID:', id)

		if (!id || isNaN(parseInt(id))) {
			return res.status(400).json({ error: 'Неверный ID видео' })
		}

		// Проверяем, существует ли видео с таким ID
		try {
			const videoCheck = await pool.query(
				'SELECT EXISTS(SELECT 1 FROM video_lessons WHERE id = $1)',
				[id]
			)

			if (!videoCheck.rows[0].exists) {
				return res.status(404).json({ error: 'Видео не найдено' })
			}
		} catch (checkErr) {
			console.error('Ошибка при проверке существования видео:', checkErr)
			// Продолжаем выполнение, даже если проверка не удалась
		}

		// Безопасный запрос комментариев с обработкой возможных ошибок
		try {
			// Теперь можем использовать avatar, так как поле добавлено в таблицу
			const comments = await pool.query(
				`SELECT c.*, u.username, u.avatar_url AS avatar
				FROM comments c
				JOIN users u ON c.user_id = u.id
				WHERE c.video_id = $1 AND c.parent_id IS NULL
				ORDER BY c.created_at DESC`,
				[id]
			)

			// Получаем ответы на комментарии
			const result = []
			for (let comment of comments.rows) {
				const formattedComment = {
					id: comment.id,
					content: comment.content,
					createdAt: comment.created_at,
					updatedAt: comment.updated_at,
					user: {
						id: comment.user_id,
						username: comment.username,
						avatar: comment.avatar || null,
					},
					likes: 0,
					isLiked: false,
				}

				try {
					const replies = await pool.query(
						`SELECT r.*, u.username, u.avatar_url AS avatar
						FROM comments r
						JOIN users u ON r.user_id = u.id
						WHERE r.parent_id = $1
						ORDER BY r.created_at`,
						[comment.id]
					)

					if (replies.rows.length > 0) {
						formattedComment.replies = replies.rows.map(reply => ({
							id: reply.id,
							content: reply.content,
							createdAt: reply.created_at,
							updatedAt: reply.updated_at,
							parentId: reply.parent_id,
							user: {
								id: reply.user_id,
								username: reply.username,
								avatar: reply.avatar || null,
							},
							likes: 0,
							isLiked: false,
						}))
					}
				} catch (repliesErr) {
					console.error(
						'Ошибка при загрузке ответов на комментарий:',
						repliesErr
					)
					// Продолжаем выполнение с пустым массивом ответов
					formattedComment.replies = []
				}

				result.push(formattedComment)
			}

			res.json(result)
		} catch (commentsErr) {
			console.error('Ошибка при загрузке комментариев к видео:', commentsErr)
			// В случае ошибки возвращаем пустой массив
			res.json([])
		}
	} catch (error) {
		console.error('Ошибка при получении комментариев к видео:', error)
		// В случае серьезной ошибки возвращаем статус 500 и информацию об ошибке
		res.status(500).json({
			error: 'Ошибка сервера при получении комментариев к видео',
			details: error.message,
		})
	}
})

// Новый API: Добавить комментарий (для разных типов контента)
router.post('/', authenticateToken, async (req, res) => {
	try {
		const { content, contentType, contentId, parentId } = req.body
		const userId = req.user.id

		console.log('Получен запрос на добавление комментария:', {
			content,
			contentType,
			contentId,
			parentId,
		})

		// Валидация входных данных
		if (!content || content.trim().length === 0) {
			return res.status(400).json({ error: 'Комментарий не может быть пустым' })
		}

		if (content.length > 1000) {
			return res
				.status(400)
				.json({ error: 'Комментарий слишком длинный (макс. 1000 символов)' })
		}

		if (!contentType || !['sheet_music', 'video'].includes(contentType)) {
			return res.status(400).json({ error: 'Неверный тип контента' })
		}

		if (!contentId || isNaN(parseInt(contentId))) {
			return res.status(400).json({ error: 'Неверный ID контента' })
		}

		// Проверка существования контента
		try {
			let contentCheck
			if (contentType === 'sheet_music') {
				contentCheck = await pool.query(
					'SELECT EXISTS(SELECT 1 FROM sheet_music WHERE id = $1)',
					[contentId]
				)
				if (!contentCheck.rows[0].exists) {
					return res.status(404).json({ error: 'Нотный материал не найден' })
				}
			} else if (contentType === 'video') {
				contentCheck = await pool.query(
					'SELECT EXISTS(SELECT 1 FROM video_lessons WHERE id = $1)',
					[contentId]
				)
				if (!contentCheck.rows[0].exists) {
					return res.status(404).json({ error: 'Видео не найдено' })
				}
			}
		} catch (checkErr) {
			console.error('Ошибка при проверке существования контента:', checkErr)
			return res.status(500).json({
				error: 'Ошибка при проверке существования контента',
				details: checkErr.message,
			})
		}

		// Если это ответ на комментарий, проверяем существование родительского комментария
		if (parentId) {
			try {
				const parentCheck = await pool.query(
					'SELECT EXISTS(SELECT 1 FROM comments WHERE id = $1)',
					[parentId]
				)
				if (!parentCheck.rows[0].exists) {
					return res
						.status(404)
						.json({ error: 'Родительский комментарий не найден' })
				}
			} catch (parentCheckErr) {
				console.error(
					'Ошибка при проверке существования родительского комментария:',
					parentCheckErr
				)
				return res.status(500).json({
					error: 'Ошибка при проверке существования родительского комментария',
					details: parentCheckErr.message,
				})
			}
		}

		// Антифлуд проверка
		try {
			const recentCommentsCheck = await pool.query(
				`SELECT created_at FROM comments 
				WHERE user_id = $1 
				ORDER BY created_at DESC 
				LIMIT 1`,
				[userId]
			)

			if (recentCommentsCheck.rows.length > 0) {
				const lastComment = new Date(recentCommentsCheck.rows[0].created_at)
				const now = new Date()
				const timeDiffSeconds = (now - lastComment) / 1000

				if (timeDiffSeconds < 5) {
					return res.status(429).json({
						error:
							'Слишком много комментариев. Пожалуйста, подождите несколько секунд',
					})
				}
			}
		} catch (floodCheckErr) {
			console.error('Ошибка при проверке антифлуда:', floodCheckErr)
			// Продолжаем выполнение даже в случае ошибки проверки
		}

		// Добавляем комментарий в БД
		let query, values
		if (contentType === 'sheet_music') {
			if (parentId) {
				query = `
					INSERT INTO comments 
					(content, user_id, sheet_music_id, parent_id, created_at, updated_at) 
					VALUES ($1, $2, $3, $4, NOW(), NOW()) 
					RETURNING id, content, created_at, updated_at, parent_id
				`
				values = [content, userId, contentId, parentId]
			} else {
				query = `
					INSERT INTO comments 
					(content, user_id, sheet_music_id, created_at, updated_at) 
					VALUES ($1, $2, $3, NOW(), NOW()) 
					RETURNING id, content, created_at, updated_at
				`
				values = [content, userId, contentId]
			}
		} else if (contentType === 'video') {
			if (parentId) {
				query = `
					INSERT INTO comments 
					(content, user_id, video_id, parent_id, created_at, updated_at) 
					VALUES ($1, $2, $3, $4, NOW(), NOW()) 
					RETURNING id, content, created_at, updated_at, parent_id
				`
				values = [content, userId, contentId, parentId]
			} else {
				query = `
					INSERT INTO comments 
					(content, user_id, video_id, created_at, updated_at) 
					VALUES ($1, $2, $3, NOW(), NOW()) 
					RETURNING id, content, created_at, updated_at
				`
				values = [content, userId, contentId]
			}
		}

		const result = await pool.query(query, values)
		const newComment = result.rows[0]

		// Получаем информацию о пользователе для возврата вместе с комментарием
		const userInfo = await pool.query(
			'SELECT username, avatar_url AS avatar FROM users WHERE id = $1',
			[userId]
		)

		// Формируем ответ
		const responseData = {
			id: newComment.id,
			content: newComment.content,
			createdAt: newComment.created_at,
			updatedAt: newComment.updated_at,
			user: {
				id: userId,
				username: userInfo.rows[0].username,
				avatar: userInfo.rows[0].avatar || null,
			},
			likes: 0,
			isLiked: false,
		}

		if (parentId) {
			responseData.parentId = newComment.parent_id
		}

		res.status(201).json({
			message: 'Комментарий успешно добавлен',
			comment: responseData,
		})
	} catch (error) {
		console.error('Ошибка при добавлении комментария:', error)
		res.status(500).json({
			error: 'Ошибка сервера при добавлении комментария',
			details: error.message,
		})
	}
})

module.exports = router
