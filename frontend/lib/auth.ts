import jwt from 'jsonwebtoken'

// Интерфейс пользователя, извлекаемый из JWT токена
interface User {
	id: number
	username: string
	email: string
	role: string
	[key: string]: unknown // Для дополнительных полей с неизвестным типом
}

/**
 * Извлекает данные пользователя из JWT токена
 * @param token JWT токен
 * @returns Объект с данными пользователя или null, если токен невалидный
 */
export async function getUserFromToken(token: string): Promise<User | null> {
	try {
		// В режиме разработки мы можем использовать упрощенное декодирование без подписи
		// В production должен использоваться секретный ключ для верификации
		if (process.env.NODE_ENV === 'development') {
			// Простое декодирование base64 для режима разработки
			// Это небезопасно и предназначено только для тестирования
			const base64Url = token.split('.')[1]
			const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
			const payload = JSON.parse(
				Buffer.from(base64, 'base64').toString()
			) as Record<string, unknown>

			return {
				id: (payload.id as number) || (payload.userId as number) || 1, // Используем id из токена или по умолчанию 1
				username: (payload.username as string) || 'Пользователь',
				email: (payload.email as string) || 'user@example.com',
				role: (payload.role as string) || 'user',
				...payload, // Добавляем все остальные поля
			}
		}

		// В production используем верификацию JWT с секретным ключом
		// Это требует настройки окружения с правильным JWT_SECRET
		const secret = process.env.JWT_SECRET || 'development-secret'
		const decoded = jwt.verify(token, secret) as Record<string, unknown>

		return {
			id: (decoded.id as number) || (decoded.userId as number) || 1,
			username: (decoded.username as string) || 'Пользователь',
			email: (decoded.email as string) || 'user@example.com',
			role: (decoded.role as string) || 'user',
			...decoded,
		}
	} catch (error) {
		console.error('Ошибка при декодировании токена:', error)
		return null
	}
}
