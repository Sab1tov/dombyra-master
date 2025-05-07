import { NextRequest, NextResponse } from 'next/server'

// Обработка GET запросов для получения профиля пользователя
export async function GET(req: NextRequest) {
	try {
		// Получаем токен авторизации из заголовков запроса
		const authHeader = req.headers.get('Authorization')

		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			console.error(
				'❌ Отсутствует или неверный формат заголовка Authorization'
			)
			return NextResponse.json(
				{ error: 'Требуется авторизация' },
				{ status: 401 }
			)
		}

		// Формируем URL к бэкенду
		const backendUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/auth/profile`

		console.log('🔄 Отправка запроса к бэкенду:', backendUrl)
		console.log(
			'🔑 Заголовок Authorization:',
			authHeader.substring(0, 20) + '...'
		)

		// Выполняем запрос к бэкенду с передачей токена авторизации
		const response = await fetch(backendUrl, {
			method: 'GET',
			headers: {
				Authorization: authHeader,
				'Content-Type': 'application/json',
			},
			cache: 'no-store', // Не кешировать ответ
		})

		console.log('📊 Получен ответ от бэкенду, статус:', response.status)

		// Проверяем тип содержимого ответа
		const contentType = response.headers.get('content-type')
		console.log('📄 Тип содержимого ответа:', contentType)

		// Если ответ неуспешен, возвращаем ошибку с тем же статус-кодом
		if (!response.ok) {
			console.error(`❌ Ошибка бэкенда: ${response.status}`)

			// Если это ошибка 401, прокидываем её прямо клиенту
			if (response.status === 401) {
				return NextResponse.json(
					{ error: 'Токен авторизации недействителен или истек' },
					{ status: 401 }
				)
			}

			// Для других ошибок пытаемся получить детали
			try {
				const errorData = await response.json()
				return NextResponse.json(errorData, { status: response.status })
			} catch {
				// Если не удалось получить JSON с ошибкой
				return NextResponse.json(
					{ error: `Ошибка сервера: ${response.statusText}` },
					{ status: response.status }
				)
			}
		}

		// Если тип содержимого не JSON, возвращаем ошибку или текст
		if (contentType && !contentType.includes('application/json')) {
			// Получаем текст ответа для отладки
			const textResponse = await response.text()
			console.error(
				'❌ Получен ответ не в формате JSON:',
				textResponse.substring(0, 100)
			)

			return NextResponse.json(
				{
					error: 'Некорректный ответ от сервера',
					details: 'Сервер вернул не JSON-данные',
					status: response.status,
				},
				{ status: 500 }
			)
		}

		// Получаем данные ответа как JSON
		let data
		try {
			data = await response.json()
		} catch (jsonError) {
			console.error('❌ Ошибка при парсинге JSON:', jsonError)
			return NextResponse.json(
				{ error: 'Ошибка при обработке ответа сервера' },
				{ status: 500 }
			)
		}

		console.log('✅ Данные профиля получены успешно:', data)
		return NextResponse.json(data, { status: 200 })
	} catch (error) {
		console.error('❌ Ошибка при проксировании запроса профиля:', error)
		return NextResponse.json(
			{ error: 'Ошибка сервера при получении профиля' },
			{ status: 500 }
		)
	}
}

// Обработка PUT запросов для обновления профиля пользователя
export async function PUT(req: NextRequest) {
	try {
		// Получаем данные из тела запроса
		const body = await req.json()

		// Получаем токен авторизации из заголовков запроса
		const authHeader = req.headers.get('Authorization')

		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return NextResponse.json(
				{ error: 'Требуется авторизация' },
				{ status: 401 }
			)
		}

		// Формируем URL к бэкенду
		const backendUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/auth/profile`

		console.log('🔄 Отправка запроса на обновление профиля')

		// Выполняем запрос к бэкенду
		const response = await fetch(backendUrl, {
			method: 'PUT',
			headers: {
				Authorization: authHeader,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(body),
		})

		console.log('✅ Получен ответ от бэкенда, статус:', response.status)

		// Проверяем тип содержимого ответа
		const contentType = response.headers.get('content-type')

		// Если тип содержимого не JSON, возвращаем ошибку или текст
		if (contentType && !contentType.includes('application/json')) {
			const textResponse = await response.text()
			console.error(
				'❌ Получен ответ не в формате JSON:',
				textResponse.substring(0, 100)
			)

			return NextResponse.json(
				{
					error: 'Некорректный ответ от сервера',
					details: 'Сервер вернул не JSON-данные',
				},
				{ status: 500 }
			)
		}

		// Получаем данные ответа как JSON
		let data
		try {
			data = await response.json()
		} catch (jsonError) {
			console.error('❌ Ошибка при парсинге JSON:', jsonError)
			return NextResponse.json(
				{ error: 'Ошибка при обработке ответа сервера' },
				{ status: 500 }
			)
		}

		if (!response.ok) {
			console.error(
				`❌ Ошибка при обновлении профиля: ${response.status}`,
				data
			)
			return NextResponse.json(data, { status: response.status })
		}

		return NextResponse.json(data, { status: 200 })
	} catch (error) {
		console.error(
			'❌ Ошибка при проксировании запроса обновления профиля:',
			error
		)
		return NextResponse.json(
			{ error: 'Ошибка сервера при обновлении профиля' },
			{ status: 500 }
		)
	}
}
