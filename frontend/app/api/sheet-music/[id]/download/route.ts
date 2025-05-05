import { NextRequest, NextResponse } from 'next/server'

// Обработка GET запросов для скачивания файла нот
export async function GET(
	request: NextRequest,
	{ params }: { params: { id: string } }
) {
	try {
		console.log(
			`[Sheet Music API] Starting download request for ID: ${params.id}`
		)

		// Проверяем валидность ID
		const id = parseInt(params.id)
		if (isNaN(id) || id <= 0) {
			console.error(`[Sheet Music API] Invalid ID: ${params.id}`)
			return NextResponse.json(
				{ error: 'Invalid sheet music ID' },
				{ status: 400 }
			)
		}

		// Получаем токен авторизации из заголовков
		const authHeader = request.headers.get('Authorization')
		if (!authHeader) {
			console.error('[Sheet Music API] No authorization header')
			return NextResponse.json(
				{ error: 'Authorization required' },
				{ status: 401 }
			)
		}

		// URL бэкенда для скачивания нот
		const backendUrl = `${
			process.env.BACKEND_URL || 'http://localhost:5000'
		}/api/sheet-music/${id}/download`
		console.log(`[Sheet Music API] Downloading from: ${backendUrl}`)

		// Отправляем запрос на бэкенд
		const backendResponse = await fetch(backendUrl, {
			headers: {
				Authorization: authHeader,
			},
		})

		// Проверяем статус ответа
		if (!backendResponse.ok) {
			console.error(`[Sheet Music API] Backend error ${backendResponse.status}`)
			// Если файл не найден
			if (backendResponse.status === 404) {
				return NextResponse.json(
					{ error: 'Sheet music file not found' },
					{ status: 404 }
				)
			}

			// Если ошибка авторизации
			if (backendResponse.status === 401 || backendResponse.status === 403) {
				return NextResponse.json(
					{ error: 'Not authorized to download this file' },
					{ status: backendResponse.status }
				)
			}

			// Другие ошибки
			return NextResponse.json(
				{ error: 'Error downloading sheet music' },
				{ status: backendResponse.status }
			)
		}

		// Получаем заголовки из ответа бэкенда
		const contentType = backendResponse.headers.get('content-type')
		const contentDisposition = backendResponse.headers.get(
			'content-disposition'
		)

		// Извлекаем имя файла из заголовка Content-Disposition
		let filename = 'sheet-music.pdf'
		if (contentDisposition) {
			const filenameMatch = contentDisposition.match(/filename="(.+?)"/)
			if (filenameMatch && filenameMatch[1]) {
				filename = filenameMatch[1]
			}
		}

		console.log(`[Sheet Music API] Downloading file: ${filename}`)

		// Получаем данные файла
		const fileData = await backendResponse.arrayBuffer()

		// Создаем и возвращаем ответ с файлом
		const response = new NextResponse(fileData, {
			status: 200,
			headers: {
				'Content-Type': contentType || 'application/pdf',
				'Content-Disposition': `attachment; filename="${filename}"`,
			},
		})

		return response
	} catch (error) {
		console.error('[Sheet Music API] Download error:', error)
		return NextResponse.json(
			{ error: 'Server error while downloading sheet music' },
			{ status: 500 }
		)
	}
}
