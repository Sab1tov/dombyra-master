import { NextRequest, NextResponse } from 'next/server'

// Обработка DELETE запросов для удаления аватара
export async function DELETE(req: NextRequest) {
	try {
		// Получаем токен авторизации из заголовков запроса
		const authHeader = req.headers.get('Authorization')

		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return NextResponse.json(
				{ error: 'Требуется авторизация' },
				{ status: 401 }
			)
		}

		console.log(
			'📝 DELETE avatar request received with auth token:',
			authHeader.substring(0, 15) + '...'
		)

		// Формируем URL к бэкенду - исправляем на правильный путь
		const backendUrl = 'http://localhost:5000/api/auth/profile/avatar'
		console.log('🔗 Forwarding avatar delete request to backend:', backendUrl)

		// Выполняем запрос к бэкенду с передачей токена авторизации
		const response = await fetch(backendUrl, {
			method: 'DELETE',
			headers: {
				Authorization: authHeader,
				'Content-Type': 'application/json',
			},
		})

		// Логируем статус ответа
		console.log(`🔄 Backend response status: ${response.status}`)

		// Получаем данные ответа (если есть)
		let data
		const contentType = response.headers.get('content-type')
		const hasJsonContent =
			contentType && contentType.includes('application/json')

		try {
			if (hasJsonContent) {
				data = await response.json()
				console.log('📊 Response data:', data)
			} else {
				const text = await response.text()
				console.log(
					`📝 Response text: ${text.substring(0, 100)}${
						text.length > 100 ? '...' : ''
					}`
				)
			}
		} catch (parseError) {
			console.error('⚠️ Error parsing response:', parseError)
		}

		if (!response.ok) {
			console.error(`❌ Error deleting avatar: ${response.status}`, data)
			return NextResponse.json(
				data || { error: 'Ошибка при удалении аватара' },
				{ status: response.status }
			)
		}

		return NextResponse.json(data || { message: 'Аватар успешно удален' }, {
			status: 200,
		})
	} catch (error) {
		console.error('❌ Error proxying avatar delete request:', error)
		return NextResponse.json(
			{ error: 'Ошибка сервера при удалении аватара' },
			{ status: 500 }
		)
	}
}

// Обработка POST запросов для загрузки аватара
export async function POST(req: NextRequest) {
	try {
		// Получаем токен авторизации из заголовков запроса
		const authHeader = req.headers.get('Authorization')

		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return NextResponse.json(
				{ error: 'Требуется авторизация' },
				{ status: 401 }
			)
		}

		// Получаем данные формы из запроса
		const formData = await req.formData()

		// Формируем URL к бэкенду
		const backendUrl = 'http://localhost:5000/api/auth/avatar'

		// Выполняем запрос к бэкенду
		const response = await fetch(backendUrl, {
			method: 'POST',
			headers: {
				Authorization: authHeader,
				// Не указываем Content-Type, он будет автоматически установлен благодаря FormData
			},
			body: formData,
		})

		// Получаем данные ответа
		const data = await response.json()

		if (!response.ok) {
			console.error(`Ошибка при загрузке аватара: ${response.status}`, data)
			return NextResponse.json(data, { status: response.status })
		}

		return NextResponse.json(data, { status: 200 })
	} catch (error) {
		console.error('Ошибка при проксировании запроса загрузки аватара:', error)
		return NextResponse.json(
			{ error: 'Ошибка сервера при загрузке аватара' },
			{ status: 500 }
		)
	}
}
