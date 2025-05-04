const express = require('express')
const pool = require('../db')
const { authenticateToken } = require('../middleware/authMiddleware')

const router = express.Router()

// ✅ Получить список избранных нот пользователя (с владельцем ноты)
router.get('/', authenticateToken, async (req, res) => {
	try {
		const userId = req.user.id

		const favorites = await pool.query(
			`SELECT sm.*, f.created_at AS added_to_favorites, u.username AS owner
             FROM favorites f
             JOIN sheet_music sm ON f.sheet_music_id = sm.id
             JOIN users u ON sm.user_id = u.id
             WHERE f.user_id = $1
             ORDER BY f.created_at DESC`,
			[userId]
		)

		res.json(favorites.rows)
	} catch (error) {
		console.error('❌ Ошибка при получении избранных нот:', error.message)
		res
			.status(500)
			.json({ error: 'Ошибка сервера. Не удалось получить избранное.' })
	}
})

// ✅ Добавить ноту в избранное
router.post('/:id', authenticateToken, async (req, res) => {
	try {
		const { id } = req.params
		const userId = req.user.id

		console.log(
			`📌 Попытка добавить ноту ${id} в избранное пользователя ${userId}`
		)
		console.log(`📊 Тип ID: ${typeof id}, значение: ${id}`)
		console.log(`🔐 Данные авторизации: userId=${userId}`)

		// Преобразуем ID в число и проверяем его валидность
		const noteId = parseInt(id)
		if (!noteId || isNaN(noteId) || noteId <= 0) {
			console.error(`❌ Некорректный ID ноты после преобразования: ${noteId}`)
			return res.status(400).json({ error: 'Некорректный ID ноты' })
		}

		// 🔍 Проверяем, существует ли нота
		const noteExists = await pool.query(
			'SELECT id FROM sheet_music WHERE id = $1',
			[noteId]
		)
		if (noteExists.rows.length === 0) {
			console.error(`❌ Нота с ID ${noteId} не найдена`)
			return res.status(404).json({ error: 'Нота не найдена' })
		}

		// 💾 Используем UPSERT (INSERT .. ON CONFLICT DO NOTHING) вместо проверки существования
		console.log(
			`🔄 Выполнение UPSERT для добавления в избранное: userId=${userId}, noteId=${noteId}`
		)
		const result = await pool.query(
			`INSERT INTO favorites (user_id, sheet_music_id)
             VALUES ($1, $2)
             ON CONFLICT (user_id, sheet_music_id) DO NOTHING
             RETURNING *`,
			[userId, noteId]
		)

		// Проверка результата вставки
		console.log(`📊 Результат UPSERT:`, result.rows)

		if (result.rows.length > 0) {
			console.log(
				`✅ Нота ${noteId} успешно добавлена в избранное пользователя ${userId}`
			)
			res.status(201).json({
				message: 'Нота добавлена в избранное',
			})
		} else {
			// Если ничего не вставлено, значит запись уже существует
			console.log(`ℹ️ Нота ${noteId} уже в избранном пользователя ${userId}`)
			res.status(200).json({
				message: 'Нота уже в избранном',
			})
		}
	} catch (error) {
		console.error(
			'❌ Ошибка при добавлении в избранное:',
			error.message,
			error.stack
		)
		res
			.status(500)
			.json({ error: 'Ошибка сервера. Не удалось добавить в избранное.' })
	}
})

// ✅ Добавить ноту в избранное (альтернативный метод с телом запроса)
router.post('/', authenticateToken, async (req, res) => {
	try {
		const { sheet_music_id } = req.body
		const userId = req.user.id

		console.log(
			`📌 Попытка добавить ноту через body: ${JSON.stringify(req.body)}`
		)
		console.log(`🔐 Данные авторизации: userId=${userId}`)

		if (!sheet_music_id && sheet_music_id !== 0) {
			console.error(`❌ Не указан идентификатор ноты в теле запроса`)
			return res.status(400).json({ error: 'Не указан идентификатор ноты' })
		}

		// Преобразуем в число для безопасности
		const noteId = parseInt(sheet_music_id)
		if (isNaN(noteId) || noteId <= 0) {
			console.error(
				`❌ Некорректный ID ноты в теле запроса после преобразования: ${noteId}`
			)
			return res.status(400).json({ error: 'Некорректный ID ноты' })
		}

		// 🔍 Проверяем, существует ли нота
		const noteExists = await pool.query(
			'SELECT id FROM sheet_music WHERE id = $1',
			[noteId]
		)

		if (noteExists.rows.length === 0) {
			console.error(`❌ Нота с ID ${noteId} не найдена`)
			return res.status(404).json({ error: 'Нота не найдена' })
		}

		// 💾 Используем UPSERT (INSERT .. ON CONFLICT DO NOTHING) вместо проверки существования
		console.log(
			`🔄 Выполнение UPSERT для добавления в избранное через body: userId=${userId}, noteId=${noteId}`
		)
		const result = await pool.query(
			`INSERT INTO favorites (user_id, sheet_music_id)
             VALUES ($1, $2)
             ON CONFLICT (user_id, sheet_music_id) DO NOTHING
             RETURNING *`,
			[userId, noteId]
		)

		// Проверка результата вставки
		console.log(`📊 Результат UPSERT:`, result.rows)

		if (result.rows.length > 0) {
			console.log(
				`✅ Нота ${noteId} успешно добавлена в избранное пользователя ${userId}`
			)
			res.status(201).json({
				message: 'Нота добавлена в избранное',
			})
		} else {
			// Если ничего не вставлено, значит запись уже существует
			console.log(`ℹ️ Нота ${noteId} уже в избранном пользователя ${userId}`)
			res.status(200).json({
				message: 'Нота уже в избранном',
			})
		}
	} catch (error) {
		console.error(
			'❌ Ошибка при добавлении в избранное:',
			error.message,
			error.stack
		)
		res
			.status(500)
			.json({ error: 'Ошибка сервера. Не удалось добавить в избранное.' })
	}
})

// ✅ Удалить ноту из избранного
router.delete('/:id', authenticateToken, async (req, res) => {
	try {
		const { id } = req.params
		const userId = req.user.id

		console.log(
			`📌 Попытка удалить ноту ${id} из избранного пользователя ${userId}`
		)
		console.log(`📊 Тип ID: ${typeof id}, значение: ${id}`)

		// Преобразуем ID в число и проверяем его валидность
		const noteId = parseInt(id)
		if (!noteId || isNaN(noteId) || noteId <= 0) {
			console.error(`❌ Некорректный ID ноты при удалении: ${noteId}`)
			return res.status(400).json({ error: 'Некорректный ID ноты' })
		}

		// 🚀 Оптимизированное удаление с проверкой существования
		const result = await pool.query(
			`DELETE FROM favorites 
             WHERE user_id = $1 AND sheet_music_id = $2 
             RETURNING *`,
			[userId, noteId]
		)

		console.log(`📊 Результат удаления:`, result)

		if (result.rowCount === 0) {
			console.log(
				`ℹ️ Нота ${noteId} не найдена в избранном пользователя ${userId}`
			)
			return res.status(404).json({ error: 'Нота не найдена в избранном' })
		}

		console.log(
			`✅ Нота ${noteId} успешно удалена из избранного пользователя ${userId}`
		)

		// 📌 Возвращаем обновлённый список избранного
		const updatedFavorites = await pool.query(
			`SELECT sm.*, f.created_at AS added_to_favorites, u.username AS owner
             FROM favorites f
             JOIN sheet_music sm ON f.sheet_music_id = sm.id
             JOIN users u ON sm.user_id = u.id
             WHERE f.user_id = $1
             ORDER BY f.created_at DESC`,
			[userId]
		)

		res.json({
			message: 'Нота удалена из избранного',
			favorites: updatedFavorites.rows,
		})
	} catch (error) {
		console.error('❌ Ошибка при удалении из избранного:', error.message)
		res
			.status(500)
			.json({ error: 'Ошибка сервера. Не удалось удалить из избранного.' })
	}
})

module.exports = router
