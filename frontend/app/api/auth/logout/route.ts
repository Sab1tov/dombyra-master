import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
	try {
		// Получаем refreshToken из cookies или из тела запроса
		const body = await req.json().catch(() => ({}))
		const refreshToken =
			req.cookies.get('refreshToken')?.value || body.refreshToken

		// Получаем токен из заголовка авторизации
		const authHeader = req.headers.get('Authorization')
		const token = authHeader?.startsWith('Bearer ')
			? authHeader.split(' ')[1]
			: null

		// Формируем URL к бэкенду
		const backendUrl = 'http://localhost:5000/api/auth/logout'

		// Выполняем запрос к бэкенду, передавая токены
		await fetch(backendUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				...(token && { Authorization: `Bearer ${token}` }),
			},
			body: JSON.stringify({ refreshToken }),
		})

		// Создаем ответ
		const nextResponse = NextResponse.json(
			{ message: 'Выход выполнен успешно' },
			{ status: 200 }
		)

		// Удаляем cookie refreshToken
		nextResponse.cookies.delete('refreshToken')

		return nextResponse
	} catch (error) {
		console.error('Ошибка при проксировании запроса выхода из системы:', error)
		return NextResponse.json(
			{ error: 'Ошибка сервера при выходе из системы' },
			{ status: 500 }
		)
	}
}
