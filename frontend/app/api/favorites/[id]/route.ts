import { NextRequest, NextResponse } from 'next/server'

// Обработка DELETE запросов для удаления из избранного
export async function DELETE(
	request: Request,
	{ params }: { params: { id: string } }
) {
	try {
		const id = params.id
		const req = request as NextRequest

		// Получаем токен авторизации из заголовков запроса
		const authHeader = req.headers.get('Authorization')

		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return NextResponse.json(
				{ error: 'Требуется авторизация' },
				{ status: 401 }
			)
		}

		// Формируем URL к бэкенду
		const backendUrl = `http://localhost:5000/api/favorites/${id}`

		// Выполняем запрос к бэкенду с передачей токена авторизации
		const response = await fetch(backendUrl, {
			method: 'DELETE',
			headers: {
				Authorization: authHeader,
				'Content-Type': 'application/json',
			},
		})

		// Если статус не 204 (No Content) и не 200 (OK), то получаем тело ответа
		let data
		try {
			if (response.status !== 204) {
				data = await response.json()
			}
		} catch {
			// Игнорируем ошибки парсинга, если тело отсутствует
		}

		if (!response.ok) {
			console.error(
				`Ошибка при удалении из избранного: ${response.status}`,
				data
			)
			return NextResponse.json(
				data || { error: 'Ошибка при удалении из избранного' },
				{ status: response.status }
			)
		}

		// Возвращаем успешный ответ
		return new NextResponse(null, { status: 204 })
	} catch (error) {
		console.error(
			'Ошибка при проксировании запроса удаления из избранного:',
			error
		)
		return NextResponse.json(
			{ error: 'Ошибка сервера при удалении из избранного' },
			{ status: 500 }
		)
	}
}
