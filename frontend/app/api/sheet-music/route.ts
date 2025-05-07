import { NextRequest, NextResponse } from 'next/server'

// Обработка GET запросов для получения списка нот
export async function GET(req: NextRequest) {
	try {
		// Получаем параметры запроса
		const url = new URL(req.url)
		const searchQuery = url.searchParams.get('search') || ''
		const page = url.searchParams.get('page') || '1'
		const limit = url.searchParams.get('limit') || '10'

		// Формируем URL к бэкенду с параметрами
		const backendUrl = `${
			process.env.NEXT_PUBLIC_API_URL
		}/api/sheet-music?search=${encodeURIComponent(
			searchQuery
		)}&page=${page}&limit=${limit}`

		console.log(`[Sheet Music API] Fetching from: ${backendUrl}`)

		// Получаем токен авторизации из заголовков запроса
		const authHeader = req.headers.get('Authorization')

		// Выполняем запрос к бэкенду
		const response = await fetch(backendUrl, {
			headers: authHeader ? { Authorization: authHeader } : {},
		})

		// Получаем данные ответа
		const data = await response.json()

		if (!response.ok) {
			console.error(`[Sheet Music API] Error ${response.status}:`, data)
			return NextResponse.json(data, { status: response.status })
		}

		return NextResponse.json(data, { status: 200 })
	} catch (error) {
		console.error('[Sheet Music API] Error:', error)
		return NextResponse.json(
			{ error: 'Ошибка сервера при получении списка нот' },
			{ status: 500 }
		)
	}
}

// Обработка POST запросов для загрузки новых нот
export async function POST(req: NextRequest) {
	try {
		console.log('Начало обработки запроса загрузки нот')

		// Получаем токен авторизации из заголовков
		const authHeader = req.headers.get('Authorization')

		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			console.error('Отсутствует или неверный формат токена авторизации')
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
		}

		// Проверяем, что запрос - это FormData
		const contentType = req.headers.get('content-type')
		if (!contentType || !contentType.includes('multipart/form-data')) {
			console.error('Ожидался multipart/form-data, получено:', contentType)
			return NextResponse.json(
				{ error: 'Ожидается multipart/form-data' },
				{ status: 400 }
			)
		}

		// Получаем данные из FormData
		const formData = await req.formData()
		console.log('FormData получен успешно')

		// Проверяем наличие файла
		const file = formData.get('file') as File
		if (!file) {
			console.error('Файл не найден в запросе')
			return NextResponse.json({ error: 'Файл не найден' }, { status: 400 })
		}

		// Проверяем тип файла
		if (file.type !== 'application/pdf') {
			console.error('Неверный тип файла:', file.type)
			return NextResponse.json(
				{ error: 'Поддерживаются только PDF файлы' },
				{ status: 400 }
			)
		}

		// Проверяем размер файла (макс. 10MB)
		const maxSize = 10 * 1024 * 1024 // 10MB
		if (file.size > maxSize) {
			console.error('Размер файла превышает максимально допустимый')
			return NextResponse.json(
				{ error: 'Файл слишком большой (максимум 10MB)' },
				{ status: 400 }
			)
		}

		// Создаем новый FormData с необходимыми полями
		const backendFormData = new FormData()
		backendFormData.append('title', formData.get('title') as string)
		backendFormData.append('composer', formData.get('composer') as string)
		backendFormData.append('file', file)

		// Добавляем пустые значения для обязательных полей на бэкенде
		backendFormData.append('description', '')
		backendFormData.append('difficulty', 'intermediate')
		backendFormData.append('tags[]', 'домбра')

		// Формируем URL к бэкенду
		const backendUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/sheet-music`

		console.log(`[Sheet Music API] Uploading sheet music to: ${backendUrl}`)

		// Выполняем запрос к бэкенду
		const response = await fetch(backendUrl, {
			method: 'POST',
			headers: {
				Authorization: authHeader,
			},
			body: backendFormData,
		})

		// Получаем данные ответа
		const data = await response.json()

		if (!response.ok) {
			console.error(`[Sheet Music API] Upload error ${response.status}:`, data)
			return NextResponse.json(data, { status: response.status })
		}

		return NextResponse.json(data, { status: 201 })
	} catch (error) {
		console.error('[Sheet Music API] Upload error:', error)
		return NextResponse.json(
			{ error: 'Ошибка сервера при загрузке нот' },
			{ status: 500 }
		)
	}
}
