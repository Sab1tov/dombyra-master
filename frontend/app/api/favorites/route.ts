import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
	// Получаем токен из заголовка Authorization
	const authHeader = request.headers.get('Authorization')
	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		return NextResponse.json(
			{ error: 'Unauthorized: Missing or invalid token' },
			{ status: 401 }
		)
	}

	const token = authHeader.split(' ')[1]

	try {
		// Список возможных API-маршрутов для получения избранного
		const possibleBackendUrls = [
			'http://localhost:5000/api/favorites',
			'http://localhost:5000/api/auth/favorites',
			'http://localhost:5000/api/user/favorites',
		]

		let lastError = null
		let successResponse = null

		// Перебираем все возможные URLs для получения избранного
		for (const backendUrl of possibleBackendUrls) {
			try {
				console.log(`Attempting to fetch favorites from: ${backendUrl}`)

				const response = await fetch(backendUrl, {
					method: 'GET',
					headers: {
						Authorization: `Bearer ${token}`,
						'Content-Type': 'application/json',
					},
				})

				if (response.ok) {
					successResponse = await response.json()
					console.log(`Successfully fetched favorites from: ${backendUrl}`)
					break // Если получили успешный ответ, прекращаем попытки
				} else {
					const errorData = await response
						.json()
						.catch(() => ({ message: 'Unknown error' }))
					lastError = {
						status: response.status,
						message: errorData.message || response.statusText,
					}
					console.error(
						`Failed to fetch favorites from ${backendUrl}: ${response.status} ${lastError.message}`
					)
				}
			} catch (error) {
				console.error(`Error fetching favorites from ${backendUrl}:`, error)
				lastError = {
					status: 500,
					message: error instanceof Error ? error.message : 'Unknown error',
				}
			}
		}

		// Если смогли получить данные, возвращаем их
		if (successResponse) {
			return NextResponse.json(successResponse)
		}

		// Если прошли все URLs и не получили данных, возвращаем ошибку
		console.error('All favorite API endpoints failed')

		// В режиме разработки возвращаем тестовые данные
		if (process.env.NODE_ENV === 'development') {
			console.log('Returning mock favorites data for development')
			return NextResponse.json([
				{
					id: 1,
					title: 'Демо нота 1',
					owner: 'Композитор Тестовый',
					thumbnail_url: '/images/demo/sheet1.jpg',
					added_to_favorites: new Date().toISOString(),
				},
				{
					id: 2,
					title: 'Демо нота 2',
					owner: 'Другой Композитор',
					thumbnail_url: '/images/demo/sheet2.jpg',
					added_to_favorites: new Date().toISOString(),
				},
			])
		}

		return NextResponse.json(
			{ error: lastError?.message || 'Failed to fetch favorites' },
			{ status: lastError?.status || 500 }
		)
	} catch (error) {
		console.error('Error in favorites API route:', error)
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		)
	}
}

export async function POST(request: NextRequest) {
	// Получаем токен из заголовка Authorization
	const authHeader = request.headers.get('Authorization')
	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		console.log('❌ Отсутствует токен авторизации в запросе')
		return NextResponse.json(
			{ error: 'Unauthorized: Missing or invalid token' },
			{ status: 401 }
		)
	}

	const token = authHeader.split(' ')[1]
	console.log(
		'🔑 Получен токен авторизации:',
		authHeader.substring(0, 15) + '...'
	)

	try {
		// Получаем данные из тела запроса
		const body = await request.json()
		console.log(
			'🔍 Получен POST запрос к /favorites с данными:',
			JSON.stringify(body, null, 2)
		)

		// Поддерживаем оба варианта параметров: id и sheet_music_id
		const itemId = body.id || body.sheet_music_id
		const itemType = body.type || 'sheet_music'

		if (!itemId) {
			console.error('❌ Отсутствует параметр ID в теле запроса:', body)
			return NextResponse.json(
				{ error: 'Missing required parameter: id or sheet_music_id' },
				{ status: 400 }
			)
		}

		console.log(`🔄 Добавление в избранное: ID=${itemId}, Type=${itemType}`)

		// Url для добавления в избранное
		const backendUrl = 'http://localhost:5000/api/favorites'
		console.log(`🔗 Отправка запроса на бэкенд: ${backendUrl}`)

		// Подготавливаем данные в формате, который ожидает бэкенд
		// Отправляем оба параметра для максимальной совместимости
		const requestBody = {
			id: Number(itemId),
			sheet_music_id: Number(itemId),
			type: itemType,
		}

		console.log('📦 Данные запроса:', JSON.stringify(requestBody, null, 2))

		const response = await fetch(backendUrl, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${token}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(requestBody),
		})

		console.log(`🔄 Статус ответа бэкенда: ${response.status}`)

		// Пытаемся получить ответ как JSON или как текст
		let responseData
		const contentType = response.headers.get('content-type')
		if (contentType && contentType.includes('application/json')) {
			responseData = await response.json()
			console.log('📊 Данные ответа:', JSON.stringify(responseData, null, 2))
		} else {
			const text = await response.text()
			console.log(
				`📝 Текст ответа: ${text.substring(0, 100)}${
					text.length > 100 ? '...' : ''
				}`
			)
			// Пытаемся преобразовать текст в JSON
			try {
				responseData = JSON.parse(text)
			} catch {
				responseData = { message: text || 'No response data' }
			}
		}

		if (!response.ok) {
			console.error(`❌ Ошибка от бэкенда: ${response.status}`, responseData)
			return NextResponse.json(
				{
					error: responseData.message || response.statusText || 'Unknown error',
				},
				{ status: response.status }
			)
		}

		return NextResponse.json(responseData || { success: true })
	} catch (error) {
		console.error('❌ Ошибка при добавлении в избранное:', error)
		return NextResponse.json(
			{
				error: error instanceof Error ? error.message : 'Internal server error',
			},
			{ status: 500 }
		)
	}
}

export async function DELETE(request: NextRequest) {
	// Получаем токен из заголовка Authorization
	const authHeader = request.headers.get('Authorization')
	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		return NextResponse.json(
			{ error: 'Unauthorized: Missing or invalid token' },
			{ status: 401 }
		)
	}

	const token = authHeader.split(' ')[1]

	try {
		// Получаем параметры из URL
		const url = new URL(request.url)
		const id = url.searchParams.get('id')
		const type = url.searchParams.get('type') || 'sheet_music'

		console.log('🔍 DELETE request to /favorites with params:', { id, type })

		if (!id) {
			console.error('❌ Missing ID parameter in DELETE request')
			return NextResponse.json(
				{ error: 'Missing required parameter: id' },
				{ status: 400 }
			)
		}

		// Преобразуем ID в число
		const numericId = Number(id)
		console.log(
			`🔄 Removing item from favorites: ID=${numericId}, Type=${type}`
		)

		// Url для удаления из избранного
		const backendUrl = `http://localhost:5000/api/favorites/${numericId}?type=${type}`
		console.log(`🔗 Sending request to backend: ${backendUrl}`)

		const response = await fetch(backendUrl, {
			method: 'DELETE',
			headers: {
				Authorization: `Bearer ${token}`,
				'Content-Type': 'application/json',
			},
		})

		console.log(`🔄 Backend response status: ${response.status}`)

		// Пытаемся получить ответ как JSON или как текст
		let responseData
		const contentType = response.headers.get('content-type')
		if (contentType && contentType.includes('application/json')) {
			responseData = await response.json()
			console.log('📊 Response data:', responseData)
		} else {
			const text = await response.text()
			console.log(
				`📝 Response text: ${text.substring(0, 100)}${
					text.length > 100 ? '...' : ''
				}`
			)
			// Пытаемся преобразовать текст в JSON
			try {
				responseData = JSON.parse(text)
			} catch {
				responseData = { message: text || 'No response data' }
			}
		}

		if (!response.ok) {
			console.error(`❌ Error from backend: ${response.status}`, responseData)
			return NextResponse.json(
				{
					error: responseData.message || response.statusText || 'Unknown error',
				},
				{ status: response.status }
			)
		}

		return NextResponse.json(responseData || { success: true })
	} catch (error) {
		console.error('❌ Error removing from favorites:', error)
		return NextResponse.json(
			{
				error: error instanceof Error ? error.message : 'Internal server error',
			},
			{ status: 500 }
		)
	}
}
