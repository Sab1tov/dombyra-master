const express = require('express')
const router = express.Router()
const pool = require('../db')
const auth = require('../middleware/auth')
const multer = require('multer')
const path = require('path')
const fs = require('fs')

// GET /api/video-lessons/:id/next - получение следующего видеоурока
router.get('/:id/next', auth, async (req, res) => {
	try {
		const videoId = req.params.id
		const userId = req.user.id

		// Проверяем, просмотрен ли текущий урок (достиг ли пользователь 80% просмотра)
		const progressResult = await pool.query(
			`SELECT progress FROM video_views 
       WHERE user_id = $1 AND video_id = $2`,
			[userId, videoId]
		)

		// Текущий урок должен быть просмотрен минимум на 80%
		const isCurrentCompleted =
			progressResult.rows.length > 0 && progressResult.rows[0].progress >= 80

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
			return res.json(null)
		}

		const nextVideo = nextVideoResult.rows[0]

		// Проверяем, разблокирован ли следующий урок
		// Разблокирован, если текущий урок просмотрен или если у пользователя уже есть прогресс по следующему
		const nextVideoProgressResult = await pool.query(
			`SELECT progress FROM video_views 
       WHERE user_id = $1 AND video_id = $2`,
			[userId, nextVideo.id]
		)

		const hasProgressInNext = nextVideoProgressResult.rows.length > 0

		// Если текущий урок просмотрен или у пользователя уже есть прогресс по следующему,
		// то следующий урок доступен
		const isNextUnlocked = isCurrentCompleted || hasProgressInNext

		if (isNextUnlocked) {
			return res.json(nextVideo)
		} else {
			// Если следующий урок заблокирован, отправляем информацию о нем с флагом isLocked
			return res.json({
				...nextVideo,
				isLocked: true,
			})
		}
	} catch (err) {
		console.error('Ошибка при получении следующего видеоурока:', err)
		res.status(500).json({ message: 'Ошибка сервера' })
	}
})

// PUT /api/video-lessons/:id/progress - обновление прогресса просмотра
router.put('/:id/progress', auth, async (req, res) => {
	try {
		const videoId = req.params.id
		const userId = req.user.id
		const { progress } = req.body

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
			await pool.query(
				'INSERT INTO video_views (user_id, video_id, progress) VALUES ($1, $2, $3)',
				[userId, videoId, progress]
			)
		} else {
			// Обновляем существующую запись
			await pool.query(
				'UPDATE video_views SET progress = $1 WHERE user_id = $2 AND video_id = $3',
				[progress, userId, videoId]
			)
		}

		// Если прогресс достиг 80%, проверяем следующий урок и разблокируем его
		if (progress >= 80) {
			// Получаем следующий урок по ID
			const nextVideoResult = await pool.query(
				`SELECT id FROM video_lessons WHERE id > $1 ORDER BY id ASC LIMIT 1`,
				[videoId]
			)

			if (nextVideoResult.rows.length > 0) {
				const nextVideoId = nextVideoResult.rows[0].id

				// Проверяем, существует ли запись о просмотре для следующего видео
				const nextViewCheckResult = await pool.query(
					'SELECT id FROM video_views WHERE user_id = $1 AND video_id = $2',
					[userId, nextVideoId]
				)

				if (nextViewCheckResult.rows.length === 0) {
					// Создаем запись о просмотре для следующего видео с нулевым прогрессом,
					// чтобы пометить его как доступное
					await pool.query(
						'INSERT INTO video_views (user_id, video_id, progress) VALUES ($1, $2, 0)',
						[userId, nextVideoId]
					)
				}
			}
		}

		res.json({ message: 'Прогресс обновлен успешно' })
	} catch (err) {
		console.error('Ошибка при обновлении прогресса просмотра:', err)
		res.status(500).json({ message: 'Ошибка сервера' })
	}
})

module.exports = router
