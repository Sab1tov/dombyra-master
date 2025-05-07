import { NextRequest, NextResponse } from 'next/server'

// Обработка GET запросов для получения данных пользователя
export async function GET(req: NextRequest) {
	try {
		// Получаем токен авторизации из заголовков запроса
		const authHeader = req.headers.get('Authorization')

		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return NextResponse.json(
				{ error: 'Требуется авторизация' },
				{ status: 401 }
			)
		}

		// Список возможных URL для бэкенда - попробуем разные варианты
		const backendUrls = [
			`${process.env.NEXT_PUBLIC_API_URL}/api/auth/me`,
			`${process.env.NEXT_PUBLIC_API_URL}/api/auth/user`,
			`${process.env.NEXT_PUBLIC_API_URL}/api/user`,
			`${process.env.NEXT_PUBLIC_API_URL}/api/users/me`,
			`${process.env.NEXT_PUBLIC_API_URL}/api/auth/profile`,
		]

		// Последовательно пробуем каждый URL до первого успешного ответа
		let successResponse = null
		let lastError = null

		for (const backendUrl of backendUrls) {
			try {
				console.log(`Trying to fetch user profile from: ${backendUrl}`)

				// Выполняем запрос к бэкенду с передачей токена авторизации
				const response = await fetch(backendUrl, {
					method: 'GET',
					headers: {
						Authorization: authHeader,
						'Content-Type': 'application/json',
					},
				})

				// Получаем данные ответа
				const data = await response.json()

				if (response.ok) {
					console.log(`Successfully fetched profile from: ${backendUrl}`)
					successResponse = { data, backendUrl }
					break // Выходим из цикла при первом успешном ответе
				} else {
					console.log(
						`Failed to fetch from ${backendUrl}: ${response.status}`,
						data
					)
					lastError = { status: response.status, data, backendUrl }
				}
			} catch (error) {
				console.error(`Error fetching from ${backendUrl}:`, error)
			}
		}

		if (successResponse) {
			return NextResponse.json(
				{
					...successResponse.data,
					_debug: { source: successResponse.backendUrl },
				},
				{ status: 200 }
			)
		}

		// Если ни один из запросов не успешен, возвращаем последнюю ошибку
		if (lastError) {
			return NextResponse.json(
				{
					error: 'Не удалось получить данные пользователя',
					details: lastError.data,
					_debug: { triedUrls: backendUrls, lastError },
				},
				{ status: lastError.status }
			)
		}

		return NextResponse.json(
			{
				error: 'Не удалось получить данные пользователя ни по одному из URL',
				_debug: { triedUrls: backendUrls },
			},
			{ status: 500 }
		)
	} catch (error) {
		console.error(
			'Ошибка при проксировании запроса данных пользователя:',
			error
		)
		return NextResponse.json(
			{ error: 'Ошибка сервера при получении данных пользователя' },
			{ status: 500 }
		)
	}
}
