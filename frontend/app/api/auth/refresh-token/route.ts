import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
	try {
		// Получаем refreshToken из cookies или из тела запроса
		const body = await req.json().catch(() => ({}))
		const refreshToken =
			req.cookies.get('refreshToken')?.value || body.refreshToken

		if (!refreshToken) {
			return NextResponse.json(
				{ error: 'Refresh токен не предоставлен' },
				{ status: 401 }
			)
		}

		// Формируем URL к бэкенду
		const backendUrl = 'http://localhost:5000/api/auth/refresh-token'

		// Выполняем запрос к бэкенду
		const response = await fetch(backendUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ refreshToken }),
		})

		// Получаем данные ответа
		const data = await response.json()

		if (!response.ok) {
			console.error(`Ошибка обновления токена: ${response.status}`, data)
			return NextResponse.json(data, { status: response.status })
		}

		return NextResponse.json(data, { status: 200 })
	} catch (error) {
		console.error('Ошибка при проксировании запроса обновления токена:', error)
		return NextResponse.json(
			{ error: 'Ошибка сервера при обработке запроса обновления токена' },
			{ status: 500 }
		)
	}
}
