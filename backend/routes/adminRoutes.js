const express = require('express')
const pool = require('../db')
const { authenticateToken, isAdmin } = require('../middleware/authMiddleware')
const { roleChangeValidation } = require('../validators/adminValidator')
const { validationResult } = require('express-validator')

const fs = require('fs').promises
const path = require('path')

const router = express.Router()

// ✅ Получение списка пользователей (только для админа)
router.get('/users', authenticateToken, isAdmin, async (req, res) => {
	try {
		const users = await pool.query(
			'SELECT id, username, email, role FROM users ORDER BY id ASC'
		)
		res.json(users.rows)
	} catch (error) {
		console.error('Ошибка при получении пользователей:', error)
		res.status(500).json({ error: 'Ошибка сервера' })
	}
})

// ✅ Получение информации о конкретном пользователе (только для админов)
router.get('/users/:id', authenticateToken, isAdmin, async (req, res) => {
	try {
		const { id } = req.params

		const result = await pool.query(
			'SELECT id, username, email, role FROM users WHERE id = $1',
			[id]
		)

		if (result.rows.length === 0) {
			return res.status(404).json({ error: 'Пользователь не найден' })
		}

		res.json(result.rows[0])
	} catch (error) {
		console.error('Ошибка при получении пользователя по ID:', error.message)
		res.status(500).json({ error: 'Ошибка сервера' })
	}
})

// ✅ Изменение роли пользователя (только для админа)
router.put(
	'/users/:id/role',
	authenticateToken,
	isAdmin,
	roleChangeValidation,
	async (req, res) => {
		const errors = validationResult(req)
		if (!errors.isEmpty()) {
			return res.status(400).json({ errors: errors.array() })
		}

		try {
			const { id } = req.params
			const { role } = req.body

			await pool.query('UPDATE users SET role = $1 WHERE id = $2', [role, id])
			res.json({ message: 'Роль пользователя обновлена' })
		} catch (error) {
			console.error('Ошибка при изменении роли пользователя:', error)
			res.status(500).json({ error: 'Ошибка сервера' })
		}
	}
)

// ✅ Удаление пользователя (только для админов)
router.delete('/users/:id', authenticateToken, isAdmin, async (req, res) => {
	try {
		const { id } = req.params

		const userExists = await pool.query('SELECT * FROM users WHERE id = $1', [
			id,
		])
		if (userExists.rows.length === 0) {
			return res.status(404).json({ error: 'Пользователь не найден' })
		}

		await pool.query('DELETE FROM users WHERE id = $1', [id])
		res.json({ message: 'Пользователь удалён' })
	} catch (error) {
		console.error('Ошибка при удалении пользователя:', error.message)
		res.status(500).json({ error: 'Ошибка сервера' })
	}
})

// ✅ Удаление ноты (только для админов)
router.delete(
	'/sheet-music/:id',
	authenticateToken,
	isAdmin,
	async (req, res) => {
		try {
			const { id } = req.params

			const note = await pool.query('SELECT * FROM sheet_music WHERE id = $1', [
				id,
			])
			if (note.rows.length === 0) {
				return res.status(404).json({ error: 'Нота не найдена' })
			}

			if (note.rows[0].file_path) {
				const filePath = path.join(__dirname, '..', note.rows[0].file_path)
				try {
					await fs.unlink(filePath)
					console.log(`✅ Файл удалён: ${filePath}`)
				} catch (err) {
					console.warn(`⚠️ Файл не найден: ${filePath}`)
				}
			}

			await pool.query('DELETE FROM sheet_music WHERE id = $1', [id])
			res.json({ message: 'Нота удалена администратором' })
		} catch (error) {
			console.error('Ошибка при удалении ноты админом:', error.message)
			res.status(500).json({ error: 'Ошибка сервера' })
		}
	}
)

// ✅ Удаление комментария (только для админов)
router.delete('/comments/:id', authenticateToken, isAdmin, async (req, res) => {
	try {
		const { id } = req.params
		const adminId = req.user.id

		const comment = await pool.query('SELECT * FROM comments WHERE id = $1', [
			id,
		])
		if (comment.rows.length === 0) {
			return res.status(404).json({ error: 'Комментарий не найден' })
		}

		await pool.query(
			'INSERT INTO comment_deletes_log (comment_id, deleted_by, deleted_at) VALUES ($1, $2, NOW())',
			[id, adminId]
		)

		await pool.query('DELETE FROM comments WHERE id = $1', [id])
		res.json({ message: 'Комментарий удалён администратором' })
	} catch (error) {
		console.error('Ошибка при удалении комментария админом:', error.message)
		res.status(500).json({ error: 'Ошибка сервера' })
	}
})

module.exports = router
