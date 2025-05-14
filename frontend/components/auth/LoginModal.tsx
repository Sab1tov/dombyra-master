'use client'

import { useModal } from '@/components/ModalManager'
import { useAuthStore } from '@/store/authStore'
import Cookies from 'js-cookie'
import { useCallback, useState } from 'react'

const LoginModal = ({ onClose }: { onClose: () => void }) => {
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')

	const { openModal } = useModal()

	// Предотвращаем прокрутку на оверлее
	const preventScroll = useCallback((e: React.WheelEvent) => {
		e.stopPropagation()
	}, [])

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setLoading(true)
		setError('')

		try {
			console.log('Attempting login with:', { email, password: '***' })

			// Используем относительный URL вместо абсолютного
			const response = await fetch('/api/auth/login', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ email, password }),
				credentials: 'include', // Включаем куки
			})

			// Проверяем статус до получения JSON
			if (!response.ok) {
				const errorText = await response.text()
				console.error('Login failed with status:', response.status)
				console.error('Error response:', errorText)

				// Логируем больше информации для отладки
				console.log('Login attempt details:', {
					email,
					passwordProvided: !!password,
					passwordLength: password?.length,
					responseStatus: response.status,
				})

				try {
					// Пытаемся разобрать JSON, если возможно
					const errorData = JSON.parse(errorText)
					if (response.status === 401) {
						throw new Error(
							'Неверный email или пароль. Пожалуйста, проверьте данные и попробуйте снова.'
						)
					} else {
						throw new Error(
							errorData.error || `Ошибка входа: ${response.status}`
						)
					}
				} catch (parseError) {
					// Если JSON не получился, используем текст ошибки
					console.error('Error parsing error response:', parseError)
					if (response.status === 401) {
						throw new Error(
							'Неверный email или пароль. Пожалуйста, проверьте данные и попробуйте снова.'
						)
					} else {
						throw new Error(
							`Ошибка входа (${response.status}): ${errorText.substring(
								0,
								100
							)}`
						)
					}
				}
			}

			// Получаем данные только если статус успешный
			let data
			try {
				data = await response.json()
				console.log('Login response:', response.status, data)
			} catch (e) {
				console.error('Error parsing login response:', e)
				throw new Error('Некорректный ответ от сервера при входе')
			}

			if (!data.token || !data.user) {
				console.error('Login response missing token or user:', data)
				throw new Error(
					'Некорректный ответ от сервера: отсутствует токен или данные пользователя'
				)
			}

			// Сохраняем токен и пользовательские данные
			localStorage.setItem('jwtToken', data.token)
			Cookies.set('token', data.token, {
				expires: 1,
				path: '/',
				sameSite: 'strict',
			})

			// Используем метод login из store для обновления состояния
			useAuthStore.getState().login(data.user, data.token)

			// Закрываем модальное окно
			onClose()

			// Добавляем дополнительный вывод для отладки
			console.log('Login successful, redirecting to home page')

			// Явно проверяем текущий путь и избегаем нежелательных редиректов
			const currentPath = window.location.pathname
			console.log('Current path before redirect:', currentPath)

			// Принудительно направляем на главную страницу, игнорируя любые другие редиректы
			setTimeout(() => {
				window.location.href = '/'
			}, 50)
		} catch (error) {
			console.error('Login error:', error)
			setError(
				error instanceof Error ? error.message : 'Кіру кезінде қате орын алды'
			)
		} finally {
			setLoading(false)
		}
	}

	const handleRegisterClick = (e: React.MouseEvent) => {
		e.preventDefault()
		onClose() // Закрываем текущее модальное окно
		openModal('register') // Открываем модальное окно регистрации
	}

	const handleForgotPassword = (e: React.MouseEvent) => {
		e.preventDefault()
		// Закрываем модальное окно перед переходом
		onClose()
		// Используем setTimeout для более надежного перехода
		setTimeout(() => {
			window.location.href = '/auth/reset-password'
		}, 100)
	}

	return (
		<div
			className='fixed inset-0 bg-black/50 flex items-center justify-center z-50'
			onWheel={preventScroll}
		>
			<div className='bg-white rounded-[30px] p-8 max-w-md w-full relative'>
				{/* Кнопка закрытия */}
				<button
					onClick={onClose}
					className='absolute top-4 right-4 text-[#2A3F54]'
					aria-label='Жабу'
				>
					<svg
						xmlns='http://www.w3.org/2000/svg'
						width='24'
						height='24'
						viewBox='0 0 24 24'
						fill='none'
						stroke='currentColor'
						strokeWidth='2'
						strokeLinecap='round'
						strokeLinejoin='round'
					>
						<line x1='18' y1='6' x2='6' y2='18'></line>
						<line x1='6' y1='6' x2='18' y2='18'></line>
					</svg>
				</button>

				<h1 className='text-[40px] font-semibold text-[#2A3F54] mb-6'>Кіру</h1>

				{error && (
					<div className='mb-4 p-3 bg-red-100 text-red-700 rounded-lg'>
						{error}
					</div>
				)}

				<form onSubmit={handleSubmit}>
					<div className='mb-4'>
						<label
							htmlFor='email'
							className='block text-[20px] font-semibold text-[#2A3F54] mb-2'
						>
							Email
						</label>
						<input
							id='email'
							type='email'
							placeholder='your@email.com'
							className='w-full p-3 border border-[#2A3F54] rounded-[15px] text-[18px] text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#E4B87C] focus:border-transparent transition-colors'
							value={email}
							onChange={e => setEmail(e.target.value)}
							required
						/>
					</div>

					<div className='mb-2'>
						<label
							htmlFor='password'
							className='block text-[20px] font-semibold text-[#2A3F54] mb-2'
						>
							Құпия сөз
						</label>
						<input
							id='password'
							type='password'
							placeholder='••••••••'
							className='w-full p-3 border border-[#2A3F54] rounded-[15px] text-[18px] text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#E4B87C] focus:border-transparent transition-colors'
							value={password}
							onChange={e => setPassword(e.target.value)}
							required
						/>
					</div>

					<div className='mb-6 text-right'>
						<button
							onClick={handleForgotPassword}
							className='text-[#2A3F54] text-[16px] hover:underline'
						>
							Құпия сөзді ұмыттыңыз ба?
						</button>
					</div>

					<button
						type='submit'
						disabled={loading}
						className='w-full bg-[#E4B87C] text-[#2A3F54] rounded-[30px] py-3 font-semibold text-[30px] mb-4 hover:bg-[#d9a967] transition-colors'
					>
						{loading ? 'Жүктелуде...' : 'Кіру'}
					</button>
				</form>

				<p className='text-center text-[20px] text-[#2A3F54]'>
					Тіркелгенсіз бе?{' '}
					<button
						onClick={handleRegisterClick}
						className='font-medium hover:underline text-[#2A3F54]'
					>
						Тіркелу
					</button>
				</p>
			</div>
		</div>
	)
}

export default LoginModal
