import { NextRequest, NextResponse } from 'next/server'

// Обработка GET запросов для получения одной ноты по ID
export async function GET(
	req: NextRequest,
	{ params }: { params: { id: string } }
) {
	try {
		const id = params.id

		// Формируем URL к бэкенду
		const backendUrl = `http://localhost:5000/api/sheet-music/${id}`

		console.log(
			`[Sheet Music API] Fetching sheet music ID ${id} from: ${backendUrl}`
		)

		// Получаем токен авторизации из заголовков запроса
		const authHeader = req.headers.get('Authorization')

		// Выполняем запрос к бэкенду
		const response = await fetch(backendUrl, {
			headers: authHeader ? { Authorization: authHeader } : {},
		})

		// Проверяем статус ответа
		if (!response.ok) {
			const errorData = await response
				.json()
				.catch(() => ({ error: 'Неизвестная ошибка' }))
			console.error(`[Sheet Music API] Error ${response.status}:`, errorData)
			return NextResponse.json(errorData, { status: response.status })
		}

		// Получаем данные ответа
		const data = await response.json()
		return NextResponse.json(data, { status: 200 })
	} catch (error) {
		console.error('[Sheet Music API] Error:', error)
		return NextResponse.json(
			{ error: 'Ошибка сервера при получении нот' },
			{ status: 500 }
		)
	}
}

// Обработка PUT запросов для обновления информации о нотах
export async function PUT(
	req: NextRequest,
	{ params }: { params: { id: string } }
) {
	try {
		const id = params.id

		// Получаем токен авторизации из заголовков запроса
		const authHeader = req.headers.get('Authorization')

		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return NextResponse.json(
				{ error: 'Требуется авторизация' },
				{ status: 401 }
			)
		}

		// Если запрос содержит FormData (файл), маршрутизируем на /file
		const contentType = req.headers.get('content-type') || ''
		if (contentType.includes('multipart/form-data')) {
			const formData = await req.formData()
			const backendUrl = `http://localhost:5000/api/sheet-music/${id}/file`

			console.log(
				`[Sheet Music API] Updating sheet music file ID ${id} to: ${backendUrl}`
			)

			const response = await fetch(backendUrl, {
				method: 'PUT',
				headers: {
					Authorization: authHeader,
				},
				body: formData,
			})

			// Получаем данные ответа
			const data = await response.json()

			if (!response.ok) {
				console.error(
					`[Sheet Music API] File update error ${response.status}:`,
					data
				)
				return NextResponse.json(data, { status: response.status })
			}

			return NextResponse.json(data, { status: 200 })
		}
		// Если обычный JSON запрос, обновляем информацию
		else {
			const body = await req.json()
			const backendUrl = `http://localhost:5000/api/sheet-music/${id}`

			console.log(
				`[Sheet Music API] Updating sheet music info ID ${id} to: ${backendUrl}`
			)

			const response = await fetch(backendUrl, {
				method: 'PUT',
				headers: {
					Authorization: authHeader,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(body),
			})

			// Получаем данные ответа
			const data = await response.json()

			if (!response.ok) {
				console.error(
					`[Sheet Music API] Info update error ${response.status}:`,
					data
				)
				return NextResponse.json(data, { status: response.status })
			}

			return NextResponse.json(data, { status: 200 })
		}
	} catch (error) {
		console.error('[Sheet Music API] Update error:', error)
		return NextResponse.json(
			{ error: 'Ошибка сервера при обновлении нот' },
			{ status: 500 }
		)
	}
}

// Обработка DELETE запросов для удаления нот
export async function DELETE(
	req: NextRequest,
	{ params }: { params: { id: string } }
) {
	try {
		const id = params.id

		// Получаем токен авторизации из заголовков запроса
		const authHeader = req.headers.get('Authorization')

		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return NextResponse.json(
				{ error: 'Требуется авторизация' },
				{ status: 401 }
			)
		}

		// Формируем URL к бэкенду
		const backendUrl = `http://localhost:5000/api/sheet-music/${id}`

		console.log(
			`[Sheet Music API] Deleting sheet music ID ${id} from: ${backendUrl}`
		)

		// Выполняем запрос к бэкенду
		const response = await fetch(backendUrl, {
			method: 'DELETE',
			headers: {
				Authorization: authHeader,
			},
		})

		// Проверяем статус ответа
		if (!response.ok) {
			const errorData = await response
				.json()
				.catch(() => ({ error: 'Неизвестная ошибка' }))
			console.error(
				`[Sheet Music API] Delete error ${response.status}:`,
				errorData
			)
			return NextResponse.json(errorData, { status: response.status })
		}

		// Получаем данные ответа
		const data = await response.json()
		return NextResponse.json(data, { status: 200 })
	} catch (error) {
		console.error('[Sheet Music API] Delete error:', error)
		return NextResponse.json(
			{ error: 'Ошибка сервера при удалении нот' },
			{ status: 500 }
		)
	}
}
