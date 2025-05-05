import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
	try {
		const body = await req.json()

		// Проверяем наличие необходимых полей
		if (!body.email || !body.password || !body.username) {
			return NextResponse.json(
				{ error: 'Email, пароль и имя пользователя обязательны' },
				{ status: 400 }
			)
		}

		// Формируем URL к бэкенду
		const backendUrl = 'http://localhost:5000/api/auth/register'

		// Логирование для отладки
		console.log('Данные отправляемые на бэкенд:', JSON.stringify(body, null, 2))

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

		if (!response.ok) {
			console.error(`Ошибка регистрации: ${response.status}`, data)

			// Дополнительное логирование для отладки
			if (response.status === 400) {
				console.error('Детали ошибки 400:', {
					data,
					originalBody: body,
				})

				// Проверка ошибки "Email или Username уже используются"
				if (
					data.error &&
					(data.error.includes('Email или Username уже используются') ||
						data.error.includes('уже используются'))
				) {
					data.error =
						'Этот email или имя пользователя уже заняты. Пожалуйста, выберите другие.'
					return NextResponse.json(data, { status: 400 })
				}

				// Проверяем, есть ли массив errors в ответе
				if (data.errors && Array.isArray(data.errors)) {
					const errorMessage = data.errors
						.map((err: { msg: string }) => err.msg)
						.join(', ')
					return NextResponse.json({ error: errorMessage }, { status: 400 })
				}
			}

			return NextResponse.json(data, { status: response.status })
		}

		return NextResponse.json(data, { status: 201 })
	} catch (error) {
		console.error('Ошибка при проксировании запроса регистрации:', error)
		return NextResponse.json(
			{ error: 'Ошибка сервера при обработке запроса регистрации' },
			{ status: 500 }
		)
	}
}
