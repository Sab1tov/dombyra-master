import api, { ApiError } from '@/services/axiosInstance'
import Cookies from 'js-cookie'
import { jwtDecode } from 'jwt-decode'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface User {
	id: number
	username: string
	email: string
	avatar?: string | null
	role: 'user' | 'admin'
}

interface AuthState {
	user: User | null
	token: string | null
	isLoading: boolean
	error: string | null

	// Методы авторизации
	login: (user: User, token: string) => void
	register: (
		username: string,
		email: string,
		password: string
	) => Promise<{ success: boolean; error?: string }>
	logout: () => void
	refreshToken: () => Promise<boolean>

	// Методы для работы с профилем
	fetchProfile: () => Promise<void>
	updateProfile: (data: Partial<User>) => Promise<void>
	deleteAvatar: () => Promise<void>

	// Метод для установки состояния загрузки
	setLoading: (loading: boolean) => void
	// Метод для установки ошибки
	setError: (error: string | null) => void
}

// Глобальная переменная для хранения таймера обновления токена
let refreshTokenTimeout: NodeJS.Timeout | null = null

export const useAuthStore = create<AuthState>()(
	persist(
		(set, get) => ({
			user: null,
			token: null,
			isLoading: false,
			error: null,

			// Метод для входа
			login: (user, token) => {
				set({ user, token, error: null })
				// Сохраняем токен в куках и localStorage с правильным форматированием
				Cookies.set('token', token, {
					expires: 1, // 1 день
					path: '/',
					sameSite: 'strict',
				})
				localStorage.setItem('jwtToken', token)

				// Устанавливаем токен в заголовки axios
				if (typeof window !== 'undefined') {
					console.log(
						'🔑 Устанавливаем токен авторизации:',
						token.substring(0, 15) + '...'
					)
				}

				// Устанавливаем автоматическое обновление токена
				setupTokenRefresh(token)
			},

			// Метод для регистрации
			register: async (username: string, email: string, password: string) => {
				try {
					console.log('Регистрация пользователя с данными:', {
						email,
						username,
						passwordLength: password.length,
					})

					// Используем относительный URL вместо абсолютного
					const regResponse = await fetch('/api/auth/register', {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
						},
						body: JSON.stringify({ email, username, password }),
						credentials: 'include', // Включаем куки
					})

					// Проверяем статус до получения JSON
					if (!regResponse.ok) {
						const errorText = await regResponse.text()

						// Пытаемся разобрать JSON, если возможно
						let errorMessage: string
						try {
							const errorData = JSON.parse(errorText)

							// Обработка распространенных ошибок без вывода в консоль как ошибки
							if (
								errorData.error &&
								(errorData.error.includes(
									'Email или Username уже используются'
								) ||
									errorData.error.includes('уже заняты'))
							) {
								// Это ожидаемая ошибка валидации, не логируем её как критическую
								console.log('Ошибка валидации:', errorData.error)
								errorMessage = errorData.error
								// Для предсказуемых ошибок валидации возвращаем объект с флагом успеха
								return { success: false, error: errorMessage }
							} else {
								// Логируем непредвиденные ошибки
								console.error(
									'Registration failed with status:',
									regResponse.status
								)
								console.error('Error response:', errorText)
								errorMessage =
									errorData.error || `Ошибка регистрации: ${regResponse.status}`
							}
						} catch {
							// Если JSON не получился, используем текст ошибки
							console.error(
								'Registration failed with status:',
								regResponse.status
							)
							console.error('Error response:', errorText)
							errorMessage = `Ошибка регистрации (${
								regResponse.status
							}): ${errorText.substring(0, 100)}`
						}

						throw new Error(errorMessage)
					}

					// Получаем данные только если статус успешный
					let regData
					try {
						regData = await regResponse.json()
						console.log('Registration response:', regResponse.status, regData)
					} catch (parseError) {
						console.error('Error parsing registration response:', parseError)
						throw new Error('Некорректный ответ от сервера при регистрации')
					}

					console.log('Registration successful, now logging in...')

					// После успешной регистрации автоматически выполняем вход
					// с теми же учетными данными
					const loginResponse = await fetch('/api/auth/login', {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
						},
						body: JSON.stringify({ email, password }),
						credentials: 'include',
					})

					// Проверяем статус до получения JSON
					if (!loginResponse.ok) {
						const errorText = await loginResponse.text()
						console.error(
							'Auto-login after registration failed with status:',
							loginResponse.status
						)
						console.error('Error response:', errorText)
						throw new Error(
							'Регистрация успешна, но автоматический вход не удался'
						)
					}

					// Получаем данные только если статус успешный
					let loginData
					try {
						loginData = await loginResponse.json()
						console.log('Auto-login response:', loginResponse.status, loginData)
					} catch (parseError) {
						console.error('Error parsing auto-login response:', parseError)
						throw new Error(
							'Некорректный ответ от сервера при автоматическом входе'
						)
					}

					if (!loginData.token || !loginData.user) {
						console.error(
							'Auto-login response missing token or user:',
							loginData
						)
						throw new Error(
							'Некорректный ответ от сервера: отсутствует токен или данные пользователя'
						)
					}

					// Сохраняем токен и обновляем состояние
					localStorage.setItem('jwtToken', loginData.token)
					Cookies.set('token', loginData.token, {
						expires: 1,
						path: '/',
						sameSite: 'strict',
					})

					// Обновляем состояние с данными пользователя
					set({
						user: loginData.user,
						token: loginData.token,
						error: null,
					})

					// Устанавливаем автоматическое обновление токена
					setupTokenRefresh(loginData.token)

					return { success: true }
				} catch (error) {
					console.error('Registration process failed:', error)
					// Для непредвиденных ошибок выбрасываем исключение
					throw error
				}
			},

			// Метод для обновления токена
			refreshToken: async () => {
				try {
					const currentToken =
						get().token ||
						localStorage.getItem('jwtToken') ||
						Cookies.get('token')
					if (!currentToken) {
						console.log('No token to refresh')
						return false
					}

					console.log('Attempting to refresh token with payload', {
						token: currentToken.substring(0, 15) + '...',
					})

					// Теперь api автоматически добавит Authorization заголовок
					const response = await api.post('/auth/refresh-token', {
						token: currentToken,
					})

					if (response.data && response.data.token) {
						const { token, user } = response.data

						console.log(
							'Token refreshed successfully, new expiry:',
							new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
						)

						// Обновляем токен в хранилище состояния
						set({ token, user })

						// Обновляем токен в localStorage и cookies
						localStorage.setItem('jwtToken', token)
						Cookies.set('token', token, {
							expires: 1, // 1 день
							path: '/',
							sameSite: 'strict',
						})

						// Устанавливаем новый таймер для следующего обновления
						setupTokenRefresh(token)

						return true
					} else {
						console.error(
							'Invalid response from refresh token endpoint:',
							response.data
						)
						return false
					}
				} catch (error: unknown) {
					console.error('Error refreshing token:', error)

					// Если ошибка связана с истекшим токеном, выходим из аккаунта
					if (error && typeof error === 'object' && 'response' in error) {
						const apiError = error as ApiError
						if (
							apiError.response &&
							'status' in apiError.response &&
							(apiError.response.status === 401 ||
								apiError.response.status === 403)
						) {
							console.log(
								'Token refresh failed due to authorization error, logging out'
							)
							get().logout()
						}
					}

					return false
				}
			},

			// Метод для выхода
			logout: () => {
				set({ user: null, token: null })
				Cookies.remove('token', { path: '/' })
				localStorage.removeItem('jwtToken')

				// Очищаем таймер обновления токена
				if (refreshTokenTimeout) {
					clearTimeout(refreshTokenTimeout)
					refreshTokenTimeout = null
				}
			},

			// Метод для получения данных профиля
			fetchProfile: async () => {
				try {
					set({ isLoading: true, error: null })
					const token = Cookies.get('token') || localStorage.getItem('jwtToken')

					if (!token) {
						throw new Error('No authentication token found')
					}

					console.log(
						'⏳ Fetching profile with token:',
						token.substring(0, 15) + '...'
					)

					// Используем api.get с добавлением токена вручную для отладки
					const response = await api.get('/auth/profile', {
						headers: {
							Authorization: `Bearer ${token}`,
						},
					})

					console.log('✅ Profile fetched successfully:', response.data)
					set({ user: response.data })
					return response.data
				} catch (error: unknown) {
					const err = error as Error
					console.error('❌ Error fetching profile:', error)

					// Проверяем, является ли ошибка связанной с сетью или сервером
					if (error && typeof error === 'object' && 'response' in error) {
						const apiError = error as ApiError
						if (apiError.response) {
							console.error(
								'Server error details:',
								apiError.response.status,
								apiError.response.data
							)
						}
					}

					set({
						error: err.message || 'Ошибка получения профиля',
					})
					throw error
				} finally {
					set({ isLoading: false })
				}
			},

			// Метод для обновления профиля
			updateProfile: async data => {
				try {
					set({ isLoading: true, error: null })
					const token = Cookies.get('token') || localStorage.getItem('jwtToken')

					if (!token) {
						throw new Error('No authentication token found')
					}

					console.log('⏳ Updating profile with data:', data)

					// Используем api вместо fetch с явным указанием токена
					const response = await api.put('/auth/profile', data, {
						headers: {
							Authorization: `Bearer ${token}`,
						},
					})

					console.log('✅ Profile updated successfully:', response.data)
					set({ user: response.data.user })
					return response.data
				} catch (error: unknown) {
					const err = error as Error
					console.error('❌ Error updating profile:', error)

					// Логгируем детали ошибки сервера
					if (error && typeof error === 'object' && 'response' in error) {
						const apiError = error as ApiError
						if (apiError.response) {
							console.error(
								'Server error details:',
								apiError.response.status,
								apiError.response.data
							)
						}
					}

					set({
						error: err.message || 'Ошибка обновления профиля',
					})
					throw error
				} finally {
					set({ isLoading: false })
				}
			},

			// Метод для удаления аватара
			deleteAvatar: async () => {
				try {
					set({ isLoading: true, error: null })
					const token = Cookies.get('token') || localStorage.getItem('jwtToken')

					if (!token) {
						throw new Error('No authentication token found')
					}

					console.log('⏳ Deleting avatar - Token available:', !!token)

					// Отладочное логирование для проверки URL и заголовков
					console.log(
						'🔍 Attempting to delete avatar with URL: /auth/profile/avatar'
					)

					// Используем api вместо fetch с явным указанием токена
					// Убираем префикс /api, так как он уже добавляется в api.baseURL
					const response = await api.delete('/auth/profile/avatar', {
						headers: {
							Authorization: `Bearer ${token}`,
						},
					})

					console.log('✅ Avatar deleted successfully:', response.data)

					// Обновляем пользователя без аватара
					const currentUser = get().user
					if (currentUser) {
						set({
							user: {
								...currentUser,
								avatar: null,
							},
						})
					}

					return response.data
				} catch (error: unknown) {
					const err = error as Error
					console.error('❌ Error deleting avatar:', error)

					// Логгируем детали ошибки сервера
					if (error && typeof error === 'object' && 'response' in error) {
						const apiError = error as ApiError
						if (apiError.response) {
							console.error(
								'Server error details:',
								apiError.response.status,
								apiError.response.data
							)
						}
					}

					set({
						error: err.message || 'Ошибка удаления аватара',
					})
					throw error
				} finally {
					set({ isLoading: false })
				}
			},

			// Вспомогательные методы
			setLoading: loading => set({ isLoading: loading }),
			setError: error => set({ error }),
		}),
		{
			name: 'auth-storage',
			partialize: state => ({ user: state.user, token: state.token }),
		}
	)
)

// Функция для установки таймера обновления токена
export const setupTokenRefresh = (token: string) => {
	// Очищаем предыдущий таймер, если он существует
	if (refreshTokenTimeout) {
		clearTimeout(refreshTokenTimeout)
		refreshTokenTimeout = null
	}

	if (!token) {
		console.log('No token provided for refresh setup')
		return
	}

	try {
		// Декодируем токен для получения времени истечения
		interface JwtPayload {
			exp?: number
			[key: string]: unknown
		}

		const decoded = jwtDecode<JwtPayload>(token)
		const expiryTime = decoded.exp ? decoded.exp * 1000 : 0 // переводим в миллисекунды

		if (!expiryTime) {
			console.error('Token does not contain expiry information')
			return
		}

		// Вычисляем время до истечения срока действия
		const currentTime = Date.now()
		const timeUntilExpiry = expiryTime - currentTime

		// Обновляем токен за 10 минут до истечения срока действия
		const refreshTime = timeUntilExpiry - 10 * 60 * 1000 // 10 минут в миллисекундах

		if (refreshTime <= 0) {
			// Если токен уже истек или истекает менее чем через 10 минут, обновляем его немедленно
			console.log('Token expired or expiring soon, refreshing immediately')
			useAuthStore.getState().refreshToken()
			return
		}

		console.log(
			`Setting up token refresh in ${Math.round(refreshTime / 60000)} minutes`
		)

		// Устанавливаем таймер для обновления токена
		refreshTokenTimeout = setTimeout(() => {
			console.log('Executing scheduled token refresh')
			useAuthStore.getState().refreshToken()
		}, refreshTime)
	} catch (error: unknown) {
		console.error(
			'Error setting up token refresh:',
			error instanceof Error ? error.message : 'Unknown error'
		)
	}
}

// Функция для проверки срока действия токена
export const isTokenExpired = (token: string | null): boolean => {
	if (!token) return true

	try {
		const decoded = jwtDecode<{ exp?: number }>(token)
		if (!decoded.exp) return true

		// Проверяем, не истек ли срок действия токена
		const currentTime = Date.now() / 1000 // в секундах
		return decoded.exp < currentTime
	} catch (error) {
		console.error('❌ Ошибка при проверке токена:', error)
		return true // Если произошла ошибка, считаем токен недействительным
	}
}

// Функция для валидации текущего токена и автоматического выхода при необходимости
export const validateToken = () => {
	const { token, logout } = useAuthStore.getState()
	const tokenFromStorage =
		localStorage.getItem('jwtToken') || Cookies.get('token')
	const currentToken = token || tokenFromStorage

	if (!currentToken || isTokenExpired(currentToken)) {
		console.log(
			'🔒 Токен отсутствует или истек, выполняется автоматический выход'
		)
		logout()

		if (typeof window !== 'undefined') {
			// Перенаправляем на страницу входа, если мы не на странице аутентификации
			const currentPath = window.location.pathname
			if (
				!currentPath.includes('/auth/') &&
				!currentPath.includes('/login') &&
				!currentPath.includes('/register')
			) {
				window.location.href = '/auth/login'
			}
		}
		return false
	}

	return true
}

// Инициализация состояния авторизации
export const initializeAuthStore = () => {
	const { token } = useAuthStore.getState()
	if (token && typeof window !== 'undefined') {
		// Проверяем действительность токена
		if (isTokenExpired(token)) {
			console.log(
				'🔒 Сохраненный токен истек, выполняется автоматический выход'
			)
			useAuthStore.getState().logout()
			return
		}

		// Синхронизируем токен между localStorage и cookies
		localStorage.setItem('jwtToken', token)
		Cookies.set('token', token, {
			expires: 1,
			path: '/',
			sameSite: 'strict',
		})

		// Устанавливаем автоматическое обновление токена
		setupTokenRefresh(token)
	}
}
