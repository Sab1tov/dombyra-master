// ✅ Получить все видеоуроки (доступно всем, включая незарегистрированных)
router.get('/', async (req, res) => {
	try {
		const { search, page = 1, limit = 10, difficulty } = req.query
		const offset = (parseInt(page) - 1) * parseInt(limit)
		const searchTerm = search ? `%${search.toLowerCase()}%` : null

		// Проверяем наличие пользователя в запросе
		const userId = req.user ? req.user.id : null

		let query, params

		// Если пользователь авторизован, добавляем информацию о избранном и прогрессе
		if (userId) {
			query = `
				SELECT v.*, u.username AS author_name, u.id AS author_id,
					COALESCE(f.video_id IS NOT NULL, false) AS is_favorite,
					COALESCE(vv.progress >= 80, false) AS is_completed
				FROM video_lessons v
				LEFT JOIN users u ON v.author_id = u.id
				LEFT JOIN favorites f ON f.video_id = v.id AND f.user_id = $1
				LEFT JOIN video_views vv ON vv.video_id = v.id AND vv.user_id = $1
				WHERE 1=1
			`
			params = [userId]
			let paramIndex = 2

			if (searchTerm) {
				query += ` AND (LOWER(v.title) LIKE $${paramIndex} OR LOWER(v.description) LIKE $${paramIndex})`
				params.push(searchTerm)
				paramIndex++
			}

			if (difficulty && difficulty !== 'all') {
				query += ` AND v.difficulty = $${paramIndex}`
				params.push(difficulty)
				paramIndex++
			}

			query += ` ORDER BY v.created_at DESC LIMIT $${paramIndex} OFFSET $${
				paramIndex + 1
			}`
			params.push(parseInt(limit), offset)
		} else {
			// Для неавторизованных пользователей не показываем избранное и прогресс
			query = `
				SELECT v.*, u.username AS author_name, u.id AS author_id,
					false AS is_favorite,
					false AS is_completed
				FROM video_lessons v
				LEFT JOIN users u ON v.author_id = u.id
				WHERE 1=1
			`
			params = []
			let paramIndex = 1

			if (searchTerm) {
				query += ` AND (LOWER(v.title) LIKE $${paramIndex} OR LOWER(v.description) LIKE $${paramIndex})`
				params.push(searchTerm)
				paramIndex++
			}

			if (difficulty && difficulty !== 'all') {
				query += ` AND v.difficulty = $${paramIndex}`
				params.push(difficulty)
				paramIndex++
			}

			query += ` ORDER BY v.created_at DESC LIMIT $${paramIndex} OFFSET $${
				paramIndex + 1
			}`
			params.push(parseInt(limit), offset)
		}

		const videos = await pool.query(query, params)

		// Форматируем данные для фронтенда
		const formattedVideos = videos.rows.map(video => ({
			id: video.id,
			title: video.title,
			description: video.description,
			thumbnail: video.thumbnail_url || '',
			videoUrl: video.video_url,
			duration: video.duration,
			difficulty: video.difficulty,
			createdAt: video.created_at,
			views: video.views || 0,
			likes: video.likes || 0,
			authorName: video.author_name || 'Админ',
			authorId: video.author_id || 1,
			isCompleted: video.is_completed,
			isFavorite: video.is_favorite,
		}))

		res.json(formattedVideos)
	} catch (error) {
		console.error('Ошибка при получении видеоуроков:', error)
		res.status(500).json({ error: 'Ошибка сервера' })
	}
})

// ✅ Получить отдельный видеоурок по ID (доступно всем)
router.get('/:id', async (req, res) => {
	try {
		const { id } = req.params
		const userId = req.user ? req.user.id : null

		let query, params

		if (userId) {
			// Запрос для авторизованных с информацией о прогрессе и избранном
			query = `
				SELECT v.*, u.username AS author_name, u.id AS author_id,
					COALESCE(f.video_id IS NOT NULL, false) AS is_favorite,
					COALESCE(vv.progress, 0) AS progress,
					COALESCE(vv.progress >= 80, false) AS is_completed
				FROM video_lessons v
				LEFT JOIN users u ON v.author_id = u.id
				LEFT JOIN favorites f ON f.video_id = v.id AND f.user_id = $1
				LEFT JOIN video_views vv ON vv.video_id = v.id AND vv.user_id = $1
				WHERE v.id = $2
			`
			params = [userId, id]
		} else {
			// Запрос для неавторизованных без информации о прогрессе и избранном
			query = `
				SELECT v.*, u.username AS author_name, u.id AS author_id,
					false AS is_favorite,
					0 AS progress,
					false AS is_completed
				FROM video_lessons v
				LEFT JOIN users u ON v.author_id = u.id
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
			videoUrl: video.video_url,
			duration: video.duration,
			difficulty: video.difficulty,
			createdAt: video.created_at,
			views: video.views || 0,
			likes: video.likes || 0,
			authorName: video.author_name || 'Админ',
			authorId: video.author_id || 1,
			progress: video.progress,
			isCompleted: video.is_completed,
			isFavorite: video.is_favorite,
		}

		res.json(response)
	} catch (error) {
		console.error('Ошибка при получении видеоурока:', error)
		res.status(500).json({ error: 'Ошибка сервера' })
	}
})
