const jwt = require('jsonwebtoken')
const pool = require('../db') // Подключаем базу для получения данных пользователя
require('dotenv').config()

// ✅ Middleware для аутентификации пользователя
const authenticateToken = async (req, res, next) => {
	const authHeader = req.header('Authorization')

	// ✅ Проверяем, есть ли токен и начинается ли он с "Bearer "
	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		return res
			.status(401)
			.json({ error: 'Доступ запрещен. Токен отсутствует.' })
	}

	const token = authHeader.split(' ')[1] // Отделяем сам токен

	try {
		// ✅ Декодируем токен
		const decoded = jwt.verify(token, process.env.JWT_SECRET)

		// ✅ Получаем `role` и `username` из базы
		const user = await pool.query(
			'SELECT id, username, role FROM users WHERE id = $1',
			[decoded.id]
		)

		// Проверяем, существует ли пользователь
		if (user.rows.length === 0) {
			return res.status(401).json({ error: 'Пользователь не найден.' })
		}

		// ✅ Добавляем пользователя в `req.user`
		req.user = {
			id: user.rows[0].id,
			username: user.rows[0].username,
			role: user.rows[0].role,
		}

		next() // Переход к следующему middleware
	} catch (error) {
		console.error('Ошибка аутентификации:', error.message)

		// ✅ Обрабатываем ошибки токена
		if (error.name === 'TokenExpiredError') {
			return res
				.status(401)
				.json({ error: 'Токен истёк. Пожалуйста, войдите снова.' })
		} else if (error.name === 'JsonWebTokenError') {
			return res.status(403).json({ error: 'Неверный токен. Доступ запрещён.' })
		}

		res.status(403).json({ error: 'Ошибка аутентификации.' })
	}
}

// ✅ Middleware для проверки роли администратора
const isAdmin = (req, res, next) => {
	if (!req.user || req.user.role !== 'admin') {
		return res
			.status(403)
			.json({ error: 'Доступ запрещён. Требуется роль администратора.' })
	}
	next()
}

module.exports = { authenticateToken, isAdmin }
