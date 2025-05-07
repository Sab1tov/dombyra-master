const express = require('express')
const pool = require('../db')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { authenticateToken } = require('../middleware/authMiddleware')
const { validationResult } = require('express-validator')
const {
	registerValidation,
	loginValidation,
} = require('../validators/authValidator')
const nodemailer = require('nodemailer')
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')

require('dotenv').config()

const router = express.Router()

// Создаем директорию для аватаров, если она не существует
const avatarsDir = path.join(__dirname, '../uploads/avatars')
if (!fs.existsSync(avatarsDir)) {
	fs.mkdirSync(avatarsDir, { recursive: true })
	console.log('Создана директория для аватаров:', avatarsDir)
}

router.post('/register', registerValidation, async (req, res) => {
	const errors = validationResult(req)
	if (!errors.isEmpty()) {
		return res.status(400).json({ errors: errors.array() })
	}

	try {
		const { username, email, password } = req.body

		const userExists = await pool.query(
			'SELECT * FROM users WHERE email = $1 OR username = $2',
			[email, username]
		)
		if (userExists.rows.length > 0) {
			return res
				.status(400)
				.json({ error: 'Email или Username уже используются' })
		}

		const hashedPassword = await bcrypt.hash(password, 10)

		const newUser = await pool.query(
			'INSERT INTO users (username, email, password, created_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP) RETURNING id, username, email',
			[username, email, hashedPassword]
		)

		res.json({ message: 'Регистрация успешна!', user: newUser.rows[0] })
	} catch (error) {
		console.error(error)
		res.status(500).json({ error: 'Ошибка сервера' })
	}
})

// ✅ Вход в систему
router.post('/login', loginValidation, async (req, res) => {
	const errors = validationResult(req)
	if (!errors.isEmpty()) {
		console.log('Login validation errors:', errors.array())
		return res.status(400).json({ errors: errors.array() })
	}

	try {
		const { email, password } = req.body
		console.log(
			`[Backend Auth] Login attempt for email: ${email}, password provided: ${!!password}`
		)

		// Проверка существования пользователя
		const user = await pool.query('SELECT * FROM users WHERE email = $1', [
			email,
		])

		console.log(
			`[Backend Auth] User lookup result: found=${user.rows.length > 0}`
		)

		if (user.rows.length === 0) {
			console.log(`[Backend Auth] User not found: ${email}`)
			return res.status(401).json({ error: 'Неверный email или пароль' })
		}

		// Проверка пароля
		console.log(
			`[Backend Auth] Checking password for user: ${user.rows[0].username}`
		)
		const isMatch = await bcrypt.compare(password, user.rows[0].password)
		console.log(
			`[Backend Auth] Password check result: ${isMatch ? 'match' : 'no match'}`
		)

		if (!isMatch) {
			console.log(`[Backend Auth] Invalid password for user: ${email}`)
			return res.status(401).json({ error: 'Неверный email или пароль' })
		}

		// Создание токена
		const token = jwt.sign(
			{ id: user.rows[0].id, username: user.rows[0].username },
			process.env.JWT_SECRET,
			{ expiresIn: '1d' }
		)

		console.log(
			`[Backend Auth] Login successful for user: ${user.rows[0].username} (ID: ${user.rows[0].id})`
		)

		res.json({
			message: 'Вход успешен!',
			token,
			user: {
				id: user.rows[0].id,
				username: user.rows[0].username,
				email: user.rows[0].email,
			},
		})
	} catch (error) {
		console.error('[Backend Auth] Server error during login:', error)
		res.status(500).json({ error: 'Ошибка сервера' })
	}
})

// ✅ Получение профиля пользователя
router.get('/profile', authenticateToken, async (req, res) => {
	try {
		console.log(`🔍 Запрос профиля пользователя с ID: ${req.user.id}`)

		// Проверяем, что ID пользователя валидный
		if (!req.user.id) {
			console.error('❌ ID пользователя отсутствует в запросе')
			return res.status(400).json({ error: 'ID пользователя не найден' })
		}

		// Запрашиваем данные пользователя
		const user = await pool.query(
			'SELECT id, username, email, avatar, created_at FROM users WHERE id = $1',
			[req.user.id]
		)

		// Проверяем, найден ли пользователь
		if (user.rows.length === 0) {
			console.error(
				`❌ Пользователь с ID ${req.user.id} не найден в базе данных`
			)
			return res.status(404).json({ error: 'Пользователь не найден' })
		}

		// Логируем данные перед отправкой
		console.log(`✅ Данные пользователя получены:`, {
			id: user.rows[0].id,
			username: user.rows[0].username,
			avatar: user.rows[0].avatar ? 'Есть аватар' : 'Нет аватара',
			created_at: user.rows[0].created_at,
		})

		// Отправляем ответ
		res.json(user.rows[0])
	} catch (error) {
		console.error('❌ Ошибка получения профиля:', error.message)
		console.error(error.stack) // Выводим стек ошибки для отладки
		res.status(500).json({
			error: 'Ошибка сервера при получении профиля',
			details: error.message,
		})
	}
})

// ✅ Обновление профиля пользователя
router.put('/profile', authenticateToken, async (req, res) => {
	try {
		const { username, email, oldPassword, newPassword, avatar } = req.body

		// Проверяем, не занят ли email или username другим пользователем
		const existingUser = await pool.query(
			'SELECT * FROM users WHERE (email = $1 OR username = $2) AND id != $3',
			[email, username, req.user.id]
		)
		if (existingUser.rows.length > 0) {
			return res
				.status(400)
				.json({ error: 'Email или Username уже используются' })
		}

		let updateQuery = 'UPDATE users SET username = $1, email = $2'
		let queryParams = [username, email]
		let paramCount = 3

		// Обработка аватара, если он был передан
		if (avatar) {
			console.log('Получен аватар для обновления профиля')

			// Проверка, является ли аватар base64 строкой
			if (avatar.startsWith('data:image')) {
				// Извлекаем формат файла из base64 строки
				const matches = avatar.match(/^data:image\/([a-zA-Z]+);base64,/)
				if (!matches || matches.length !== 2) {
					return res.status(400).json({ error: 'Неверный формат изображения' })
				}

				const fileExtension = matches[1]
				const base64Data = avatar.replace(/^data:image\/[a-zA-Z]+;base64,/, '')

				// Создаем уникальное имя файла
				const filename = `avatar_${req.user.id}_${Date.now()}.${fileExtension}`
				const filePath = path.join(avatarsDir, filename)

				// Сохраняем файл
				fs.writeFileSync(filePath, base64Data, 'base64')
				console.log(`Аватар сохранен в: ${filePath}`)

				// URL для доступа к аватару
				const avatarUrl = `/uploads/avatars/${filename}`

				// Добавляем аватар в запрос обновления
				updateQuery += `, avatar = $${paramCount}`
				queryParams.push(avatarUrl)
				paramCount++
			} else if (avatar.startsWith('/uploads/avatars/')) {
				// Если это путь к существующему аватару, оставляем его без изменений
				console.log('Использование существующего аватара:', avatar)
				updateQuery += `, avatar = $${paramCount}`
				queryParams.push(avatar)
				paramCount++
			} else {
				console.warn(
					'Некорректный формат аватара:',
					avatar.substring(0, 20) + '...'
				)
			}
		}

		// Если передан пароль, проверяем старый и обновляем на новый
		if (oldPassword && newPassword) {
			const user = await pool.query(
				'SELECT password FROM users WHERE id = $1',
				[req.user.id]
			)

			const isMatch = await bcrypt.compare(oldPassword, user.rows[0].password)
			if (!isMatch) {
				return res.status(400).json({ error: 'Неверный текущий пароль' })
			}

			const hashedNewPassword = await bcrypt.hash(newPassword, 10)
			updateQuery += ', password = $' + paramCount
			queryParams.push(hashedNewPassword)
			paramCount++
		}

		updateQuery +=
			' WHERE id = $' + paramCount + ' RETURNING id, username, email, avatar'
		queryParams.push(req.user.id)

		const updatedUser = await pool.query(updateQuery, queryParams)
		console.log('Профиль успешно обновлен:', updatedUser.rows[0])

		res.json({
			message: 'Профиль успешно обновлен',
			user: updatedUser.rows[0],
		})
	} catch (error) {
		console.error('Ошибка обновления профиля:', error)
		res.status(500).json({ error: 'Ошибка сервера' })
	}
})

// ✅ Удаление аватара пользователя
router.delete('/profile/avatar', authenticateToken, async (req, res) => {
	try {
		// Получаем текущего пользователя
		const user = await pool.query('SELECT avatar FROM users WHERE id = $1', [
			req.user.id,
		])

		const avatarPath = user.rows[0]?.avatar

		// Если аватар существует
		if (avatarPath) {
			// Если аватар это файл на сервере (начинается с /uploads/)
			if (avatarPath.startsWith('/uploads/avatars/')) {
				// Получаем полный путь к файлу
				const fullPath = path.join(__dirname, '..', avatarPath)

				// Проверяем существование файла и удаляем его
				if (fs.existsSync(fullPath)) {
					fs.unlinkSync(fullPath)
					console.log(`Аватар удален: ${fullPath}`)
				} else {
					console.log(`Файл аватара не найден: ${fullPath}`)
				}
			}

			// Обновляем запись в базе данных
			await pool.query('UPDATE users SET avatar = NULL WHERE id = $1', [
				req.user.id,
			])
		}

		res.json({
			message: 'Аватар успешно удален',
			user: {
				id: req.user.id,
				avatar: null,
			},
		})
	} catch (error) {
		console.error('Ошибка при удалении аватара:', error)
		res.status(500).json({ error: 'Ошибка сервера при удалении аватара' })
	}
})

// Password reset request
router.post('/reset-password', async (req, res) => {
	try {
		const { email } = req.body

		// Check if user exists
		const userResult = await pool.query(
			'SELECT * FROM users WHERE email = $1',
			[email]
		)

		if (userResult.rows.length === 0) {
			return res.status(404).json({ error: 'Пайдаланушы табылмады' })
		}

		// Generate reset token
		const resetToken = crypto.randomBytes(32).toString('hex')
		const resetTokenExpiry = new Date(Date.now() + 3600000) // 1 hour from now

		// Save reset token in database
		await pool.query(
			'UPDATE users SET reset_token = $1, reset_token_expiry = $2 WHERE email = $3',
			[resetToken, resetTokenExpiry, email]
		)

		// Create email transporter
		const transporter = nodemailer.createTransport({
			host: process.env.SMTP_HOST,
			port: process.env.SMTP_PORT,
			auth: {
				user: process.env.SMTP_USER,
				pass: process.env.SMTP_PASS,
			},
		})

		// Send reset email
		const resetUrl = `${
			process.env.FRONTEND_URL || 'http://localhost:3000'
		}/auth/new-password?token=${resetToken}`
		const mailOptions = {
			from: process.env.EMAIL_USER,
			to: email,
			subject: 'Құпия сөзді қалпына келтіру',
			html: `
				<h1>Құпия сөзді қалпына келтіру сұрауы</h1>
				<p>Құпия сөзді қалпына келтіру үшін төмендегі сілтемені басыңыз:</p>
				<a href="${resetUrl}">Құпия сөзді қалпына келтіру</a>
				<p>Бұл сілтеме 1 сағат бойы жарамды.</p>
				<p>Егер сіз құпия сөзді қалпына келтіруді сұрамаған болсаңыз, бұл хатты елемеуіңізді сұраймыз.</p>
			`,
		}

		await transporter.sendMail(mailOptions)

		res.json({
			message:
				'Құпия сөзді қалпына келтіру нұсқаулары электрондық поштаға жіберілді',
		})
	} catch (error) {
		console.error('Password reset error:', error)
		res.status(500).json({ error: 'Сервер қатесі орын алды' })
	}
})

// Reset password with token
router.post('/new-password', async (req, res) => {
	try {
		const { token, newPassword } = req.body

		// Find user with valid reset token
		const userResult = await pool.query(
			'SELECT * FROM users WHERE reset_token = $1 AND reset_token_expiry > NOW()',
			[token]
		)

		if (userResult.rows.length === 0) {
			return res.status(400).json({
				error: 'Жарамсыз немесе мерзімі өткен қалпына келтіру сілтемесі',
			})
		}

		// Hash new password
		const hashedPassword = await bcrypt.hash(newPassword, 10)

		// Update password and clear reset token
		await pool.query(
			'UPDATE users SET password = $1, reset_token = NULL, reset_token_expiry = NULL WHERE reset_token = $2',
			[hashedPassword, token]
		)

		res.json({ message: 'Құпия сөз сәтті өзгертілді' })
	} catch (error) {
		console.error('New password error:', error)
		res.status(500).json({ error: 'Сервер қатесі орын алды' })
	}
})

// Обновление JWT токена
router.post('/refresh-token', async (req, res) => {
	try {
		const { token } = req.body

		if (!token) {
			return res.status(400).json({ error: 'Токен не предоставлен' })
		}

		// Проверяем токен, даже если он истек
		let decoded
		try {
			// Пытаемся верифицировать токен
			decoded = jwt.verify(token, process.env.JWT_SECRET)
		} catch (err) {
			// Если токен истек, все равно пытаемся его декодировать для получения информации о пользователе
			if (err.name === 'TokenExpiredError') {
				decoded = jwt.decode(token)
			} else {
				return res.status(403).json({ error: 'Неверный токен' })
			}
		}

		if (!decoded || !decoded.id) {
			return res.status(403).json({ error: 'Неверная структура токена' })
		}

		// Проверяем существование пользователя
		const userResult = await pool.query(
			'SELECT id, username, role FROM users WHERE id = $1',
			[decoded.id]
		)

		if (userResult.rows.length === 0) {
			return res.status(404).json({ error: 'Пользователь не найден' })
		}

		const user = userResult.rows[0]

		// Создаем новый токен
		const newToken = jwt.sign(
			{ id: user.id, username: user.username },
			process.env.JWT_SECRET,
			{ expiresIn: '1d' } // Увеличиваем срок действия до 1 дня
		)

		res.json({
			message: 'Токен успешно обновлен',
			token: newToken,
			user: {
				id: user.id,
				username: user.username,
				role: user.role,
			},
		})
	} catch (error) {
		console.error('Ошибка обновления токена:', error)
		res.status(500).json({ error: 'Ошибка сервера при обновлении токена' })
	}
})

module.exports = router
