import axios from 'axios'
import Cookies from 'js-cookie'

// Интерфейс для типизации ошибок API
export interface ApiError {
	response?: {
		status: number
		data: unknown
		headers: Record<string, string>
	}
	request?: unknown
	message?: string
	code?: string
}

// Добавляем функцию для проверки статуса сетевого соединения
const checkNetworkStatus = () => {
	if (typeof navigator !== 'undefined' && 'onLine' in navigator) {
		return navigator.onLine
	}
	return true // Предполагаем, что онлайн, если API недоступно
}

const api = axios.create({
	baseURL: '/api', // Используем относительный путь для работы через прокси Next.js
	headers: {
		'Content-Type': 'application/json',
	},
	timeout: 15000, // Увеличиваем таймаут до 15 секунд
	withCredentials: true, // Important for cookies
})

// Добавляем отладочные логи для запросов
api.interceptors.request.use(
	config => {
		// Проверяем состояние сети
		if (!checkNetworkStatus()) {
			console.error('❌ Нет соединения с сетью. Запрос не может быть выполнен.')
			// Вместо прерывания запроса, позволим ему продолжиться и создать ошибку сети,
			// которую обработаем в интерцепторе ответа
		}

		// Проверяем наличие токена сначала в localStorage, затем в Cookies
		let token = localStorage.getItem('jwtToken')
		if (!token) {
			const cookieToken = Cookies.get('token')
			token = cookieToken || null
		}

		if (token) {
			config.headers.Authorization = `Bearer ${token}`
		}

		// Добавляем дополнительную информацию в заголовок для отладки
		config.headers['X-Client-Time'] = new Date().toISOString()

		// Отладочный лог для исходящих запросов
		console.log(`📡 Отправка ${config.method?.toUpperCase()} запроса:`, {
			url: `${config.baseURL}${config.url}`, // Полный URL
			data: config.data,
			params: config.params,
			headers: config.headers,
		})

		return config
	},
	error => {
		console.error('Request interceptor error:', error)
		return Promise.reject(error)
	}
)

// Дополняем интерцептор ответа подробной информацией об ошибках
api.interceptors.response.use(
	response => {
		console.log(
			`✅ Успешный ответ ${response.status} от ${response.config.url}:`,
			response.data
		)
		return response
	},
	error => {
		if (error.response) {
			// Сервер вернул ответ со статусом отличным от 2xx
			console.error(
				`❌ Ошибка ответа ${error.response.status} от ${error.config?.url}:`,
				error.response.data
			)

			// Если 401 Unauthorized, очищаем данные авторизации и автоматически выходим
			if (error.response.status === 401) {
				if (typeof window !== 'undefined') {
					console.log('🔒 Получен ответ 401, выполняем автоматический выход')

					// Очищаем локальное хранилище и куки
					localStorage.removeItem('jwtToken')
					Cookies.remove('token', { path: '/' })

					// Динамически импортируем authStore для выполнения logout
					import('@/store/authStore').then(module => {
						const { logout } = module.useAuthStore.getState()
						logout()

						// Проверяем, не находится ли пользователь уже на странице аутентификации
						const currentPath = window.location.pathname
						if (
							!currentPath.includes('/auth/') &&
							!currentPath.includes('/login') &&
							!currentPath.includes('/register')
						) {
							console.log('🔄 Перенаправление на страницу входа')

							// Используем setTimeout для предотвращения конфликтов с другими обработчиками
							setTimeout(() => {
								window.location.href = '/auth/login'
							}, 100)
						}
					})
				}
			}
		} else if (error.request) {
			// Запрос был сделан, но ответ не получен
			const networkStatus = checkNetworkStatus() ? 'ОНЛАЙН' : 'ОФЛАЙН'

			console.error(`❌ Нет ответа от сервера (Сеть: ${networkStatus}):`, {
				requestUrl: error.config?.url,
				method: error.config?.method,
				baseURL: error.config?.baseURL,
				timeout: error.config?.timeout,
				withCredentials: error.config?.withCredentials,
				headers: error.config?.headers,
				requestData: error.config?.data,
				requestTimestamp: new Date().toISOString(),
			})

			// Анализируем подробнее ошибку запроса
			if (error.code) {
				console.error('Код ошибки:', error.code)
			}

			// Проверяем, не истек ли таймаут
			if (error.code === 'ECONNABORTED') {
				console.error('Истек таймаут запроса')
			}
		} else {
			// Что-то пошло не так при настройке запроса
			console.error('❌ Ошибка при настройке запроса:', error.message)
		}

		return Promise.reject(error)
	}
)

export default api
