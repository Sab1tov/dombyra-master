import { NextRequest, NextResponse } from 'next/server'

// Обработка OPTIONS запросов для CORS
export async function OPTIONS() {
	return new NextResponse(null, {
		status: 200,
		headers: {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET',
			'Access-Control-Allow-Headers': 'Content-Type, Authorization',
		},
	})
}

// Обработка GET запросов для получения данных профиля
export async function GET(req: NextRequest) {
	// Настройка CORS заголовков
	const headers = {
		'Access-Control-Allow-Origin': '*',
		'Access-Control-Allow-Methods': 'GET',
		'Access-Control-Allow-Headers': 'Content-Type, Authorization',
	}

	try {
		// Получаем токен авторизации из заголовков запроса
		const authHeader = req.headers.get('Authorization')

		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return NextResponse.json(
				{ error: 'Требуется авторизация' },
				{ status: 401, headers }
			)
		}

		// Сначала пробуем получить демо-данные в режиме разработки (для быстрой загрузки)
		if (process.env.NODE_ENV === 'development') {
			console.log('[Profile API] Returning demo data for development')
			return NextResponse.json(getDemoProfile(), { status: 200, headers })
		}

		// Список возможных URL для бэкенда - попробуем разные варианты
		const backendUrls = [
			'http://localhost:5000/api/auth/me',
			'http://localhost:5000/api/auth/user',
			'http://localhost:5000/api/auth/profile',
			'http://localhost:5000/api/user',
			'http://localhost:5000/api/users/me',
		]

		let successResponse = null
		let lastError = null

		for (const backendUrl of backendUrls) {
			try {
				console.log(`[Profile API] Trying to fetch profile from: ${backendUrl}`)

				// Выполняем запрос к бэкенду с таймаутом
				const controller = new AbortController()
				const timeoutId = setTimeout(() => controller.abort(), 3000) // 3 секунды таймаут

				const response = await fetch(backendUrl, {
					method: 'GET',
					headers: {
						Authorization: authHeader,
						'Content-Type': 'application/json',
					},
					signal: controller.signal,
				}).catch(err => {
					console.error(
						`[Profile API] Fetch error for ${backendUrl}:`,
						err.message || err
					)
					return null
				})

				clearTimeout(timeoutId)

				// Если запрос не удался или вернул null
				if (!response) {
					continue
				}

				// Если ответ не в формате JSON, пропускаем
				const contentType = response.headers.get('content-type')
				if (!contentType || !contentType.includes('application/json')) {
					console.log(`[Profile API] Non-JSON response from ${backendUrl}`)
					continue
				}

				try {
					// Получаем данные ответа
					const data = await response.json()

					if (response.ok) {
						console.log(`[Profile API] Success from: ${backendUrl}`)
						// Проверяем, что ответ содержит ожидаемые поля пользователя
						if (data && (data.id || data.username || data.email)) {
							successResponse = {
								data: {
									id: data.id || 0,
									username: data.username || 'User',
									email: data.email || '',
									avatar: data.avatar || null,
									role: data.role || 'user',
									// Добавляем дополнительные поля, которые могут понадобиться
									registered_at:
										data.registered_at ||
										data.registeredAt ||
										new Date().toISOString(),
									...data,
								},
								backendUrl,
							}
							break
						} else {
							console.log(
								`[Profile API] Response from ${backendUrl} lacks user data:`,
								data
							)
						}
					} else {
						console.log(
							`[Profile API] Error ${response.status} from ${backendUrl}:`,
							data
						)
						lastError = { status: response.status, data, backendUrl }
					}
				} catch (parseError) {
					console.error(
						`[Profile API] JSON parse error from ${backendUrl}:`,
						parseError
					)
				}
			} catch (fetchError) {
				console.error(
					`[Profile API] Fetch error from ${backendUrl}:`,
					fetchError
				)
			}
		}

		if (successResponse) {
			// Возвращаем нормализованный ответ
			return NextResponse.json(successResponse.data, { status: 200, headers })
		}

		// Если ни один из запросов не успешен, пробуем создать минимальный профиль из данных токена
		try {
			// Извлекаем данные из токена (если это JWT)
			const token = authHeader.split(' ')[1]

			try {
				const tokenData = parseJwt(token)

				if (tokenData && (tokenData.id || tokenData.sub)) {
					console.log('[Profile API] Creating profile from token data')
					return NextResponse.json(
						{
							id: tokenData.id || tokenData.sub || 0,
							username: tokenData.username || tokenData.name || 'User',
							email: tokenData.email || '',
							role: tokenData.role || 'user',
							registered_at: new Date().toISOString(),
							_source: 'token_data',
						},
						{ status: 200, headers }
					)
				}
			} catch (tokenParseError) {
				console.error('[Profile API] Token parse error:', tokenParseError)
			}

			// Если мы в режиме разработки и все методы не сработали, возвращаем демо-данные
			if (
				process.env.NODE_ENV !== 'production' &&
				process.env.NODE_ENV !== 'test'
			) {
				console.log('[Profile API] Returning demo data')
				return NextResponse.json(getDemoProfile(), { status: 200, headers })
			}
		} catch (tokenError) {
			console.error('[Profile API] Failed to parse token:', tokenError)
		}

		// Если ничего не помогло, возвращаем ошибку
		console.error('[Profile API] All attempts failed, returning error 500')
		return NextResponse.json(
			{
				error: 'Не удалось получить данные профиля',
				message: lastError
					? lastError.data?.message || lastError.data?.error
					: 'Сервер недоступен',
				_debug: {
					triedUrls: backendUrls,
					lastError,
				},
			},
			{ status: 500, headers }
		)
	} catch (error) {
		console.error('[Profile API] Unhandled error:', error)

		// В режиме разработки всегда возвращать демо-данные в случае ошибки
		if (process.env.NODE_ENV === 'development') {
			console.log('[Profile API] Returning demo data after error')
			return NextResponse.json(getDemoProfile('error_fallback'), {
				status: 200,
				headers,
			})
		}

		return NextResponse.json(
			{
				error: 'Ошибка сервера при получении профиля',
				message: error instanceof Error ? error.message : 'Неизвестная ошибка',
			},
			{ status: 500, headers }
		)
	}
}

// Функция для получения демо-данных профиля
function getDemoProfile(source: string = 'demo_data') {
	return {
		id: 1,
		username: 'Demo User',
		email: 'demo@example.com',
		avatar: null,
		role: 'user',
		registered_at: new Date(
			Date.now() - 30 * 24 * 60 * 60 * 1000
		).toISOString(), // 30 дней назад
		last_login_at: new Date().toISOString(),
		stats: {
			videosCompleted: 5,
			totalVideos: 20,
			favoriteSheetMusic: 8,
			favoriteVideos: 3,
			totalComments: 12,
			totalTimeSpent: 45,
		},
		achievements: [
			{
				id: 1,
				title: 'Первый шаг',
				description: 'Выучил первую мелодию',
				icon: '🎵',
				unlockedAt: new Date(
					Date.now() - 20 * 24 * 60 * 60 * 1000
				).toISOString(),
			},
			{
				id: 2,
				title: 'Регулярные занятия',
				description: '7 дней подряд занятий',
				icon: '🔥',
				unlockedAt: new Date(
					Date.now() - 10 * 24 * 60 * 60 * 1000
				).toISOString(),
			},
		],
		_source: source,
	}
}

// Интерфейс для данных JWT токена
interface JwtPayload {
	id?: number
	sub?: string | number
	username?: string
	name?: string
	email?: string
	role?: string
	exp?: number
	iat?: number
	[key: string]: string | number | boolean | object | undefined | null // Для других возможных полей
}

// Функция для декодирования JWT токена
function parseJwt(token: string): JwtPayload | null {
	try {
		// Для JWT токена: разделяем на части и декодируем payload
		const base64Url = token.split('.')[1]
		if (!base64Url) return null

		const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')

		// Используем более безопасный способ декодирования
		let jsonPayload
		try {
			jsonPayload = atob(base64)
		} catch (e) {
			console.error('Invalid base64 in token:', e)
			return null
		}

		try {
			return JSON.parse(jsonPayload)
		} catch (e) {
			console.error('Invalid JSON in token payload:', e)
			return null
		}
	} catch (e) {
		console.error('Error parsing JWT:', e)
		return null
	}
}
