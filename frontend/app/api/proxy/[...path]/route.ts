/**
 * API-роут для проксирования запросов к статическим файлам бэкенда
 * Обрабатывает запросы вида /api/proxy/uploads/*
 */

import { NextRequest, NextResponse } from 'next/server'

export async function GET(
	req: NextRequest,
	{ params }: { params: { path: string[] } }
) {
	try {
		// Собираем полный путь из массива сегментов
		const fullPath = params.path.join('/')

		// Формируем URL к бэкенду
		const backendUrl = `${process.env.NEXT_PUBLIC_API_URL}/${fullPath}`

		console.log(`Проксирование запроса к: ${backendUrl}`)

		// Выполняем запрос к бэкенду
		const response = await fetch(backendUrl)

		if (!response.ok) {
			console.error(`Ошибка при проксировании: ${response.status}`)
			return new NextResponse(null, { status: response.status })
		}

		// Получаем бинарные данные
		const data = await response.arrayBuffer()

		// Создаем ответ с тем же Content-Type что и от бэкенда
		const contentType =
			response.headers.get('content-type') || 'application/octet-stream'

		return new NextResponse(data, {
			status: 200,
			headers: {
				'Content-Type': contentType,
				'Cache-Control': 'public, max-age=31536000, immutable', // кэшируем на 1 год
			},
		})
	} catch (error) {
		console.error('Ошибка при проксировании запроса:', error)
		return new NextResponse(null, { status: 500 })
	}
}
