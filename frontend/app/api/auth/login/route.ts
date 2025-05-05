import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
	try {
		const body = await req.json()

		// Логирование входящего запроса
		console.log(
			'[Login API] Received login request with email:',
			body.email,
			'password provided:',
			!!body.password
		)

		// Проверяем наличие необходимых полей
		if (!body.email || !body.password) {
			console.log('[Login API] Missing required fields:', {
				emailProvided: !!body.email,
				passwordProvided: !!body.password,
			})
			return NextResponse.json(
				{ error: 'Email и пароль обязательны' },
				{ status: 400 }
			)
		}

		// Формируем URL к бэкенду
		const backendUrl = 'http://localhost:5000/api/auth/login'
		console.log(`[Login API] Sending request to backend: ${backendUrl}`)

		// Выполняем запрос к бэкенду
		const response = await fetch(backendUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(body),
		})

		// Получаем данные ответа
		const data = await response.json()
		console.log(
			`[Login API] Backend response status: ${response.status}`,
			response.statusText
		)

		if (!response.ok) {
			console.error(`[Login API] Login error: ${response.status}`, data)
			return NextResponse.json(data, { status: response.status })
		}

		// Логируем успешную аутентификацию (без конфиденциальных данных)
		console.log(`[Login API] Login successful for user:`, {
			id: data.user?.id,
			username: data.user?.username,
			tokenProvided: !!data.token,
		})

		// Создаем ответ с полученными данными
		const nextResponse = NextResponse.json(data, { status: 200 })

		// Если в ответе есть refreshToken, устанавливаем cookie
		if (data.refreshToken) {
			console.log('[Login API] Setting refresh token cookie')
			nextResponse.cookies.set({
				name: 'refreshToken',
				value: data.refreshToken,
				httpOnly: true,
				secure: process.env.NODE_ENV === 'production',
				maxAge: 30 * 24 * 60 * 60, // 30 дней
				sameSite: 'strict',
				path: '/',
			})
		}

		return nextResponse
	} catch (error) {
		console.error('[Login API] Error handling login request:', error)
		return NextResponse.json(
			{ error: 'Ошибка сервера при обработке запроса авторизации' },
			{ status: 500 }
		)
	}
}
