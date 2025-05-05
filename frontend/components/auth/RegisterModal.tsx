'use client'

import { useModal } from '@/components/ModalManager'
import { useAuthStore } from '@/store/authStore'
import React, { useCallback, useEffect, useState } from 'react'

interface RegisterModalProps {
	onClose: () => void
}

const RegisterModal = ({ onClose }: RegisterModalProps) => {
	const { register } = useAuthStore()
	const [email, setEmail] = useState('')
	const [fullName, setFullName] = useState('')
	const [password, setPassword] = useState('')
	const [confirmPassword, setConfirmPassword] = useState('')
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')
	const [passwordsMatch, setPasswordsMatch] = useState<boolean | null>(null)
	const [showPassword, setShowPassword] = useState(false)
	const [showConfirmPassword, setShowConfirmPassword] = useState(false)

	const { openModal } = useModal()

	// Проверка совпадения паролей при изменении
	useEffect(() => {
		// Удаляем пробелы с обоих концов
		const trimmedPass = password.trim()
		const trimmedConfirmPass = confirmPassword.trim()

		if (trimmedPass && trimmedConfirmPass) {
			const matches = trimmedPass === trimmedConfirmPass
			setPasswordsMatch(matches)
			console.log(
				`Passwords match check: ${matches} (${trimmedPass.length}/${trimmedConfirmPass.length})`
			)
		} else {
			setPasswordsMatch(null)
		}
	}, [password, confirmPassword])

	// Предотвращаем прокрутку на оверлее
	const preventScroll = useCallback((e: React.WheelEvent) => {
		e.stopPropagation()
	}, [])

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setLoading(true)
		setError('')

		try {
			// Удаляем пробелы с обоих концов
			const trimmedPass = password.trim()
			const trimmedConfirmPass = confirmPassword.trim()
			const trimmedFullName = fullName.trim()

			console.log('Attempting registration with:', {
				email,
				fullName: trimmedFullName,
				passwordLength: trimmedPass.length,
				confirmPasswordLength: trimmedConfirmPass.length,
				passwordsMatch: trimmedPass === trimmedConfirmPass,
			})

			// Проверка совпадения паролей
			if (trimmedPass !== trimmedConfirmPass) {
				throw new Error('Құпия сөздер сәйкес келмейді')
			}

			// Минимальная длина пароля
			if (trimmedPass.length < 6) {
				throw new Error('Құпия сөз кем дегенде 6 таңбадан тұруы керек')
			}

			// Проверяем минимальную длину имени пользователя
			if (trimmedFullName.length < 3) {
				throw new Error('Имя пользователя должно содержать минимум 3 символа')
			}

			// Используем метод register из store
			console.log(
				'Calling register method from authStore with username:',
				trimmedFullName
			)

			const result = await register(trimmedFullName, email, trimmedPass)

			// Проверяем результат регистрации
			if (!result.success) {
				// Если есть ошибка, отображаем её
				if (result.error) {
					setError(result.error)
				} else {
					setError('Произошла ошибка при регистрации')
				}
				return // Прерываем выполнение, чтобы не закрывать модальное окно
			}

			console.log('Registration successful, closing modal')
			onClose()

			// Добавляем отладочный вывод
			console.log('Registration completed, redirecting to home page')

			// Перенаправляем на главную страницу
			setTimeout(() => {
				window.location.href = '/'
			}, 100)
		} catch (error) {
			console.error('Registration error:', error)
			setError(
				error instanceof Error
					? error.message
					: 'Тіркелу кезінде қате орын алды'
			)
		} finally {
			setLoading(false)
		}
	}

	const handleLoginClick = (e: React.MouseEvent) => {
		e.preventDefault()
		onClose() // Закрываем текущее модальное окно
		openModal('login') // Открываем модальное окно входа
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

				<h1 className='text-[40px] font-semibold text-[#2A3F54] mb-6'>
					Тіркелу
				</h1>

				{error && (
					<div className='mb-4 p-3 bg-red-100 text-red-700 rounded-lg'>
						{error}
						{(error.includes('email или имя пользователя уже заняты') ||
							error.includes('уже заняты') ||
							error.includes('уже используются')) && (
							<div className='mt-2'>
								<p className='font-medium'>Вы можете:</p>
								<ul className='list-disc ml-5 mt-1'>
									<li>Попробовать другой email или имя пользователя</li>
									<li>
										<button
											className='text-blue-600 hover:underline'
											onClick={handleLoginClick}
										>
											Войти в существующий аккаунт
										</button>
									</li>
								</ul>
							</div>
						)}
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

					<div className='mb-4'>
						<label
							htmlFor='fullName'
							className='block text-[20px] font-semibold text-[#2A3F54] mb-2'
						>
							Аты - жөніңіз
						</label>
						<input
							id='fullName'
							type='text'
							placeholder='Аты-жөніңіз'
							className='w-full p-3 border border-[#2A3F54] rounded-[15px] text-[18px] text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#E4B87C] focus:border-transparent transition-colors'
							value={fullName}
							onChange={e => setFullName(e.target.value)}
							required
						/>
					</div>

					<div className='mb-6 relative'>
						<label
							htmlFor='password'
							className='block text-[20px] font-semibold text-[#2A3F54] mb-2'
						>
							Құпия сөз
						</label>
						<input
							id='password'
							type={showPassword ? 'text' : 'password'}
							placeholder='••••••••'
							className='w-full p-3 border border-[#2A3F54] rounded-[15px] text-[18px] text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#E4B87C] focus:border-transparent transition-colors'
							value={password}
							onChange={e => setPassword(e.target.value)}
							required
							minLength={6}
						/>
						<button
							type='button'
							className='absolute top-13 right-3 text-gray-500'
							onClick={() => setShowPassword(!showPassword)}
						>
							{showPassword ? (
								<svg
									xmlns='http://www.w3.org/2000/svg'
									viewBox='0 0 24 24'
									fill='currentColor'
									className='w-6 h-6'
								>
									<path d='M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z' />
									<path
										fillRule='evenodd'
										d='M1.323 11.447C2.811 6.976 7.028 3.75 12.001 3.75c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113-1.487 4.471-5.705 7.697-10.677 7.697-4.97 0-9.186-3.223-10.675-7.69a1.762 1.762 0 0 1 0-1.113ZM17.25 12a5.25 5.25 0 1 1-10.5 0 5.25 5.25 0 0 1 10.5 0Z'
										clipRule='evenodd'
									/>
								</svg>
							) : (
								<svg
									xmlns='http://www.w3.org/2000/svg'
									viewBox='0 0 24 24'
									fill='currentColor'
									className='w-6 h-6'
								>
									<path d='M3.53 2.47a.75.75 0 0 0-1.06 1.06l18 18a.75.75 0 1 0 1.06-1.06l-18-18ZM22.676 12.553a11.249 11.249 0 0 1-2.631 4.31l-3.099-3.099a5.25 5.25 0 0 0-6.71-6.71L7.759 4.577a11.217 11.217 0 0 1 4.242-.827c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113Z' />
									<path d='M15.75 12c0 .18-.013.357-.037.53l-4.244-4.243A3.75 3.75 0 0 1 15.75 12ZM12.53 15.713l-4.243-4.244a3.75 3.75 0 0 0 4.244 4.243Z' />
									<path d='M6.75 12c0-.619.107-1.213.304-1.764l-3.1-3.1a11.25 11.25 0 0 0-2.63 4.31c-.12.362-.12.752 0 1.114 1.489 4.467 5.704 7.69 10.675 7.69 1.5 0 2.933-.294 4.242-.827l-2.477-2.477A5.25 5.25 0 0 1 6.75 12Z' />
								</svg>
							)}
						</button>
					</div>

					<div className='mb-6 relative'>
						<label
							htmlFor='confirmPassword'
							className='block text-[20px] font-semibold text-[#2A3F54] mb-2'
						>
							Құпия сөзді қайталау
						</label>
						<input
							id='confirmPassword'
							type={showConfirmPassword ? 'text' : 'password'}
							placeholder='••••••••'
							className={`w-full p-3 border rounded-[15px] text-[18px] text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#E4B87C] ${
								passwordsMatch === false
									? 'border-red-500'
									: passwordsMatch === true
									? 'border-green-500'
									: 'border-[#2A3F54]'
							} transition-colors`}
							value={confirmPassword}
							onChange={e => setConfirmPassword(e.target.value)}
							required
							minLength={6}
						/>
						<button
							type='button'
							className='absolute top-13 right-3 text-gray-500'
							onClick={() => setShowConfirmPassword(!showConfirmPassword)}
						>
							{showConfirmPassword ? (
								<svg
									xmlns='http://www.w3.org/2000/svg'
									viewBox='0 0 24 24'
									fill='currentColor'
									className='w-6 h-6'
								>
									<path d='M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z' />
									<path
										fillRule='evenodd'
										d='M1.323 11.447C2.811 6.976 7.028 3.75 12.001 3.75c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113-1.487 4.471-5.705 7.697-10.677 7.697-4.97 0-9.186-3.223-10.675-7.69a1.762 1.762 0 0 1 0-1.113ZM17.25 12a5.25 5.25 0 1 1-10.5 0 5.25 5.25 0 0 1 10.5 0Z'
										clipRule='evenodd'
									/>
								</svg>
							) : (
								<svg
									xmlns='http://www.w3.org/2000/svg'
									viewBox='0 0 24 24'
									fill='currentColor'
									className='w-6 h-6'
								>
									<path d='M3.53 2.47a.75.75 0 0 0-1.06 1.06l18 18a.75.75 0 1 0 1.06-1.06l-18-18ZM22.676 12.553a11.249 11.249 0 0 1-2.631 4.31l-3.099-3.099a5.25 5.25 0 0 0-6.71-6.71L7.759 4.577a11.217 11.217 0 0 1 4.242-.827c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113Z' />
									<path d='M15.75 12c0 .18-.013.357-.037.53l-4.244-4.243A3.75 3.75 0 0 1 15.75 12ZM12.53 15.713l-4.243-4.244a3.75 3.75 0 0 0 4.244 4.243Z' />
									<path d='M6.75 12c0-.619.107-1.213.304-1.764l-3.1-3.1a11.25 11.25 0 0 0-2.63 4.31c-.12.362-.12.752 0 1.114 1.489 4.467 5.704 7.69 10.675 7.69 1.5 0 2.933-.294 4.242-.827l-2.477-2.477A5.25 5.25 0 0 1 6.75 12Z' />
								</svg>
							)}
						</button>
						{passwordsMatch === false && (
							<p className='mt-1 text-red-500 text-sm'>
								Құпия сөздер сәйкес келмейді
							</p>
						)}
						{passwordsMatch === true && (
							<p className='mt-1 text-green-500 text-sm'>Құпия сөздер сәйкес</p>
						)}
					</div>

					<button
						type='submit'
						disabled={loading || passwordsMatch === false}
						className={`w-full ${
							passwordsMatch === false
								? 'bg-gray-400 cursor-not-allowed'
								: 'bg-[#E4B87C] hover:bg-[#d9a967]'
						} text-[#2A3F54] rounded-[30px] py-3 font-semibold text-[30px] mb-4 transition-colors`}
					>
						{loading ? 'Жүктелуде...' : 'Тіркелу'}
					</button>
				</form>

				<p className='text-center text-[20px] text-[#2A3F54]'>
					Тіркелгенсіз ба?{' '}
					<button
						onClick={handleLoginClick}
						className='font-medium hover:underline text-[#2A3F54]'
					>
						Кіру
					</button>
				</p>
			</div>
		</div>
	)
}

export default RegisterModal
