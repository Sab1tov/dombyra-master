import { getUserFromToken } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

// Обработка GET запросов для получения нот, загруженных текущим пользователем
export async function GET(req: NextRequest) {
	try {
		// Получаем токен авторизации из заголовков запроса
		const authHeader = req.headers.get('Authorization')

		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			console.error('Отсутствует или неверный формат токена авторизации')
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
		}

		// Извлекаем данные пользователя из токена
		const token = authHeader.replace('Bearer ', '')
		const currentUser = await getUserFromToken(token)

		if (!currentUser || !currentUser.id) {
			console.error('Не удалось получить данные пользователя из токена')
			return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
		}

		console.log(
			`[User Sheet Music API] Обрабатываем запрос для пользователя ID=${currentUser.id}`
		)

		// Попытка получения данных от бэкенда
		try {
			const backendUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/sheet-music`

			console.log(`[User Sheet Music API] Fetching from: ${backendUrl}`)

			const response = await fetch(backendUrl, {
				headers: {
					Authorization: authHeader,
				},
			})

			if (response.ok) {
				const data = await response.json()
				console.log(
					'[User Sheet Music API] Successfully retrieved data from backend'
				)

				// Фильтруем ноты, чтобы возвращать только принадлежащие текущему пользователю
				if (Array.isArray(data)) {
					const filteredData = data.filter(item => {
						// Проверяем user_id или authorId (в зависимости от структуры данных)
						const itemUserId = item.user_id || item.authorId
						return itemUserId === currentUser.id
					})
					console.log(
						`[User Sheet Music API] Filtered sheet music count: ${filteredData.length}`
					)
					return NextResponse.json(filteredData, { status: 200 })
				}

				return NextResponse.json([], { status: 200 })
			}

			// Если бэкенд недоступен или вернул ошибку, возвращаем пустой массив
			console.log(
				'[User Sheet Music API] Backend unavailable, returning empty array'
			)
			return NextResponse.json([], { status: 200 })
		} catch (error) {
			console.error(
				'[User Sheet Music API] Error fetching from backend:',
				error
			)
			// В случае ошибки возвращаем пустой массив
			return NextResponse.json([], { status: 200 })
		}
	} catch (error) {
		console.error('[User Sheet Music API] Unexpected error:', error)
		return NextResponse.json(
			{
				error:
					'Непредвиденная ошибка сервера при получении списка загруженных нот',
				message: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 }
		)
	}
}
