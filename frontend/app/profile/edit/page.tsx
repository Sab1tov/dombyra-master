'use client'

import { useAuthStore } from '@/store/authStore'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

interface UserProfileData {
	username: string
	email: string
	avatar: string | null
	oldPassword?: string
	newPassword?: string
	confirmPassword?: string
}

// Функция для получения полного URL аватара
const getAvatarUrl = (avatarPath: string | null): string => {
	if (!avatarPath) return '/images/default-avatar.png'

	// Если путь начинается с http или https, или data: (Base64), это уже полный URL
	if (avatarPath.startsWith('http') || avatarPath.startsWith('data:')) {
		return avatarPath
	}

	// Иначе это относительный путь, добавляем базовый URL API
	return `${process.env.NEXT_PUBLIC_API_URL}${avatarPath}`
}

export default function EditProfilePage() {
	const { user, updateProfile, fetchProfile, deleteAvatar } = useAuthStore()
	const router = useRouter()
	const [loading, setLoading] = useState(true)
	const [saving, setSaving] = useState(false)
	const [deletingAvatar, setDeletingAvatar] = useState(false)
	const [profileData, setProfileData] = useState<UserProfileData>({
		username: '',
		email: '',
		avatar: null,
		oldPassword: '',
		newPassword: '',
		confirmPassword: '',
	})
	const [changePassword, setChangePassword] = useState(false)
	const [errors, setErrors] = useState<Record<string, string>>({})
	const [successMessage, setSuccessMessage] = useState<string | null>(null)

	const fileInputRef = useRef<HTMLInputElement>(null)
	const [previewUrl, setPreviewUrl] = useState<string | null>(null)
	const [isInitialized, setIsInitialized] = useState(false)

	// Загрузка данных профиля один раз при монтировании
	useEffect(() => {
		const initializeProfile = async () => {
			try {
				setLoading(true)
				// Всегда загружаем свежие данные с сервера
				await fetchProfile()
				setIsInitialized(true)
			} catch (error) {
				console.error('Ошибка при загрузке профиля:', error)
				router.push('/auth/login')
			} finally {
				setLoading(false)
			}
		}

		initializeProfile()
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []) // Загружаем один раз при монтировании

	// Обновление данных формы при изменении user
	useEffect(() => {
		if (user && !profileData.username && isInitialized) {
			console.log('Инициализация данных формы из профиля пользователя:', user)
			// Прямое обновление состояния для гарантированного обновления
			setProfileData({
				username: user.username || '',
				email: user.email || '',
				avatar: user.avatar || null,
				oldPassword: '',
				newPassword: '',
				confirmPassword: '',
			})

			if (user.avatar) {
				setPreviewUrl(user.avatar)
				console.log('Установлен аватар пользователя:', user.avatar)
			}
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [user, isInitialized]) // Удалили profileData.username из зависимостей

	// Вывод текущего состояния для отладки
	useEffect(() => {
		console.log('Текущее состояние profileData:', {
			username: profileData.username,
			email: profileData.email,
			avatar: profileData.avatar ? 'имеется' : 'отсутствует',
		})
	}, [profileData])

	// Обработчик изменения полей формы
	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const { name, value } = e.target
		setProfileData(prev => ({ ...prev, [name]: value }))

		// Сброс ошибки при изменении поля
		if (errors[name]) {
			setErrors(prev => {
				const newErrors = { ...prev }
				delete newErrors[name]
				return newErrors
			})
		}
	}

	// Обработчик выбора файла аватара
	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0]

		if (file) {
			// Проверка размера файла (максимум 5MB)
			if (file.size > 5 * 1024 * 1024) {
				setErrors(prev => ({
					...prev,
					avatar: 'Размер файла не должен превышать 5MB',
				}))
				return
			}

			// Проверка типа файла
			if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
				setErrors(prev => ({
					...prev,
					avatar: 'Разрешены только изображения в форматах JPEG, PNG и WebP',
				}))
				return
			}

			// Создание превью
			const reader = new FileReader()
			reader.onloadend = () => {
				const result = reader.result as string
				setPreviewUrl(result)
				// Обновляем также profileData.avatar
				setProfileData(prev => ({
					...prev,
					avatar: result,
				}))
				console.log(
					'Превью изображения установлено:',
					result.substring(0, 50) + '...'
				)
			}
			reader.readAsDataURL(file)

			// Сброс ошибки
			if (errors.avatar) {
				setErrors(prev => {
					const newErrors = { ...prev }
					delete newErrors.avatar
					return newErrors
				})
			}
		} else {
			setPreviewUrl(null)
		}
	}

	// Обработчик клика на аватар для выбора файла
	const handleAvatarClick = () => {
		fileInputRef.current?.click()
	}

	// Обработчик удаления аватара
	const handleDeleteAvatar = async (e: React.MouseEvent<HTMLDivElement>) => {
		e.stopPropagation() // Предотвращаем открытие окна выбора файла

		if (confirm('Сіз аватарды жоюға сенімдісіз бе?')) {
			try {
				setDeletingAvatar(true)
				setSuccessMessage(null)

				await deleteAvatar()

				// Очищаем локальное состояние аватара
				setPreviewUrl(null)
				setProfileData(prev => ({
					...prev,
					avatar: null,
				}))

				setSuccessMessage('Аватар сәтті жойылды')

				// Через 3 секунды скрыть сообщение
				setTimeout(() => {
					setSuccessMessage(null)
				}, 3000)
			} catch (error) {
				console.error('Аватарды жою кезінде қате:', error)
				setErrors(prev => ({
					...prev,
					avatar: 'Аватарды жою кезінде қате орын алды',
				}))
			} finally {
				setDeletingAvatar(false)
			}
		}
	}

	// Валидация данных перед отправкой
	const validateForm = (): boolean => {
		const newErrors: Record<string, string> = {}

		if (!profileData.username) {
			newErrors.username = 'Имя пользователя обязательно'
		} else if (profileData.username.length < 3) {
			newErrors.username = 'Имя пользователя должно содержать минимум 3 символа'
		}

		if (!profileData.email) {
			newErrors.email = 'Email обязателен'
		} else if (!/^\S+@\S+\.\S+$/.test(profileData.email)) {
			newErrors.email = 'Некорректный формат email'
		}

		if (changePassword) {
			if (!profileData.oldPassword) {
				newErrors.oldPassword = 'Необходимо ввести текущий пароль'
			}

			if (!profileData.newPassword) {
				newErrors.newPassword = 'Новый пароль обязателен'
			} else if (profileData.newPassword.length < 6) {
				newErrors.newPassword = 'Пароль должен содержать минимум 6 символов'
			}

			if (!profileData.confirmPassword) {
				newErrors.confirmPassword = 'Подтверждение пароля обязательно'
			} else if (profileData.newPassword !== profileData.confirmPassword) {
				newErrors.confirmPassword = 'Пароли не совпадают'
			}
		}

		setErrors(newErrors)
		return Object.keys(newErrors).length === 0
	}

	// Отправка формы
	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()

		if (!validateForm()) {
			return
		}

		try {
			setSaving(true)
			setSuccessMessage(null)

			// Копия данных перед отправкой
			const currentData = { ...profileData }

			// Проверка наличия аватара
			const avatarToSend = previewUrl || profileData.avatar
			console.log(
				'Аватар для отправки:',
				avatarToSend ? 'присутствует' : 'отсутствует'
			)

			if (previewUrl) {
				console.log('Используется новый загруженный аватар')
			} else if (profileData.avatar) {
				console.log('Используется существующий аватар профиля')
			}

			const updateData: {
				username: string
				email: string
				avatar?: string | null
				oldPassword?: string
				newPassword?: string
			} = {
				username: profileData.username,
				email: profileData.email,
				avatar: avatarToSend, // Используем previewUrl, если он есть, иначе текущий аватар
			}

			if (changePassword) {
				updateData.oldPassword = profileData.oldPassword
				updateData.newPassword = profileData.newPassword
			}

			console.log('Отправка данных для обновления профиля:', {
				username: updateData.username,
				email: updateData.email,
				avatar: updateData.avatar ? 'Данные изображения присутствуют' : null,
				oldPassword: updateData.oldPassword ? '********' : undefined,
				newPassword: updateData.newPassword ? '********' : undefined,
			})

			// Отправка данных на сервер
			await updateProfile(updateData)
			console.log('Профиль успешно обновлен')

			// Проверяем аватар после обновления профиля
			await fetchProfile() // Обновляем данные пользователя
			if (user && user.avatar) {
				console.log(
					'Аватар в обновленном профиле:',
					user.avatar.substring(0, 30) + '...'
				)
			} else {
				console.warn('Аватар не найден в обновленном профиле')
			}

			// После успешного обновления восстанавливаем те же значения username и email
			// но сбрасываем поля пароля, если они были заполнены
			setProfileData({
				...currentData,
				oldPassword: '',
				newPassword: '',
				confirmPassword: '',
			})

			setSuccessMessage('Профиль успешно обновлен')

			// Сброс формы смены пароля
			if (changePassword) {
				setChangePassword(false)
			}

			// Через 3 секунды скрыть сообщение
			setTimeout(() => {
				setSuccessMessage(null)
			}, 3000)
		} catch (error) {
			console.error('Ошибка при обновлении профиля:', error)
			setErrors(prev => ({
				...prev,
				form: 'Произошла ошибка при обновлении профиля',
			}))
		} finally {
			setSaving(false)
		}
	}

	// Отображение компонента
	if (loading) {
		return (
			<div className='flex justify-center items-center min-h-screen'>
				<div className='animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#2A3F54]'></div>
			</div>
		)
	}

	console.log('Текущие данные формы:', {
		...profileData,
		avatar: profileData.avatar
			? `${profileData.avatar.substring(0, 30)}...`
			: null,
		previewUrl: previewUrl ? `${previewUrl.substring(0, 30)}...` : null,
	})

	return (
		<div className='container mx-auto px-4 py-8'>
			<div className='max-w-[600px] mx-auto bg-white rounded-[10px] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)]'>
				<div className='bg-[#2A3F54] text-white px-6 py-4 rounded-t-[10px]'>
					<h1 className='text-2xl font-bold'>Редактирование профиля</h1>
				</div>

				<form onSubmit={handleSubmit} className='p-8'>
					{/* Аватар */}
					<div className='flex flex-col items-center mb-8'>
						<div
							className='w-32 h-32 bg-[#2A3F54] rounded-full flex items-center justify-center text-4xl text-white cursor-pointer overflow-hidden relative mb-2'
							onClick={handleAvatarClick}
						>
							{deletingAvatar ? (
								<div className='absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center'>
									<div className='animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white'></div>
								</div>
							) : null}

							{previewUrl ? (
								<Image
									src={previewUrl}
									alt={profileData.username}
									fill
									className='object-cover'
									onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
										console.error('Ошибка загрузки превью аватара')
										e.currentTarget.style.display = 'none'
									}}
								/>
							) : profileData.avatar ? (
								<Image
									src={getAvatarUrl(profileData.avatar)}
									alt={profileData.username}
									fill
									className='object-cover'
									onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
										console.error(
											'Ошибка загрузки аватара пользователя:',
											profileData.avatar
										)
										e.currentTarget.style.display = 'none'

										// Показываем первую букву имени пользователя при ошибке
										const container = e.currentTarget.parentElement
										if (
											container &&
											!container.querySelector('.fallback-avatar')
										) {
											const fallback = document.createElement('div')
											fallback.className =
												'fallback-avatar flex items-center justify-center w-full h-full'
											fallback.textContent = profileData.username
												? profileData.username.charAt(0).toUpperCase()
												: '?'
											container.appendChild(fallback)
										}
									}}
								/>
							) : profileData.username ? (
								profileData.username.charAt(0).toUpperCase()
							) : (
								'?'
							)}

							<div className='absolute inset-0 bg-black bg-opacity-40 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity'>
								{previewUrl || profileData.avatar ? (
									<div onClick={handleDeleteAvatar}>
										<svg
											width='24'
											height='24'
											viewBox='0 0 24 24'
											fill='none'
											xmlns='http://www.w3.org/2000/svg'
										>
											<path
												d='M3 6H5H21'
												stroke='white'
												strokeWidth='2'
												strokeLinecap='round'
												strokeLinejoin='round'
											/>
											<path
												d='M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z'
												stroke='white'
												strokeWidth='2'
												strokeLinecap='round'
												strokeLinejoin='round'
											/>
											<path
												d='M10 11V17'
												stroke='white'
												strokeWidth='2'
												strokeLinecap='round'
												strokeLinejoin='round'
											/>
											<path
												d='M14 11V17'
												stroke='white'
												strokeWidth='2'
												strokeLinecap='round'
												strokeLinejoin='round'
											/>
										</svg>
									</div>
								) : (
									<svg
										width='24'
										height='24'
										viewBox='0 0 24 24'
										fill='none'
										xmlns='http://www.w3.org/2000/svg'
									>
										<path
											d='M12 20H21'
											stroke='white'
											strokeWidth='2'
											strokeLinecap='round'
											strokeLinejoin='round'
										/>
										<path
											d='M16.5 3.5C16.8978 3.10217 17.4374 2.87868 18 2.87868C18.2786 2.87868 18.5544 2.93355 18.8118 3.04015C19.0692 3.14676 19.303 3.30301 19.5 3.5C19.697 3.69698 19.8532 3.93083 19.9598 4.18821C20.0665 4.44558 20.1213 4.72142 20.1213 5C20.1213 5.27857 20.0665 5.55441 19.9598 5.81179C19.8532 6.06916 19.697 6.30301 19.5 6.5L7 19L3 20L4 16L16.5 3.5Z'
											stroke='white'
											strokeWidth='2'
											strokeLinecap='round'
											strokeLinejoin='round'
										/>
									</svg>
								)}
							</div>

							<input
								type='file'
								ref={fileInputRef}
								className='hidden'
								accept='image/jpeg,image/png,image/webp'
								onChange={handleFileChange}
							/>
						</div>
						<p className='text-sm text-gray-500'>
							{previewUrl || profileData.avatar
								? 'Нажмите на аватар для изменения или удаления'
								: 'Нажмите на аватар для загрузки изображения'}
						</p>
						{errors.avatar && (
							<p className='text-red-500 text-sm mt-1'>{errors.avatar}</p>
						)}
					</div>

					{/* Имя пользователя */}
					<div className='mb-6'>
						<label
							htmlFor='username'
							className='block text-sm font-medium text-[#2A3F54] mb-1'
						>
							Қолданушының аты
						</label>
						<div className='bg-[#FBF7F4] rounded-[10px] p-[6px]'>
							<input
								type='text'
								id='username'
								name='username'
								value={profileData.username}
								onChange={handleInputChange}
								className='w-full bg-transparent text-[#2A3F54] focus:outline-none'
								placeholder='Қолданушының аты'
							/>
						</div>
						{errors.username && (
							<p className='text-red-500 text-sm mt-1'>{errors.username}</p>
						)}
					</div>

					{/* Email */}
					<div className='mb-6'>
						<label
							htmlFor='email'
							className='block text-sm font-medium text-[#2A3F54] mb-1'
						>
							Email
						</label>
						<div className='bg-[#FBF7F4] rounded-[10px] p-[6px]'>
							<input
								type='email'
								id='email'
								name='email'
								value={profileData.email}
								onChange={handleInputChange}
								className='w-full bg-transparent text-[#2A3F54] focus:outline-none'
								placeholder='Email'
							/>
						</div>
						{errors.email && (
							<p className='text-red-500 text-sm mt-1'>{errors.email}</p>
						)}
					</div>

					{/* Смена пароля */}
					<div className='mb-6'>
						<div className='flex items-center mb-2'>
							<input
								type='checkbox'
								id='changePassword'
								checked={changePassword}
								onChange={() => setChangePassword(!changePassword)}
								className='h-4 w-4 text-[#2A3F54] focus:ring-[#2A3F54] border-gray-300 rounded'
							/>
							<label
								htmlFor='changePassword'
								className='ml-2 text-sm font-medium text-[#2A3F54]'
							>
								Құпия сөзді өзгерту
							</label>
						</div>

						{changePassword && (
							<div className='space-y-4 mt-4 p-4 bg-[#FBF7F4] rounded-[10px]'>
								{/* Текущий пароль */}
								<div>
									<label
										htmlFor='oldPassword'
										className='block text-sm font-medium text-[#2A3F54] mb-1'
									>
										Қазіргі құпия сөз
									</label>
									<input
										type='password'
										id='oldPassword'
										name='oldPassword'
										value={profileData.oldPassword || ''}
										onChange={handleInputChange}
										className='w-full bg-white text-[#2A3F54] rounded-[10px] p-[6px] focus:outline-none focus:ring-2 focus:ring-[#2A3F54]'
									/>
									{errors.oldPassword && (
										<p className='text-red-500 text-sm mt-1'>
											{errors.oldPassword}
										</p>
									)}
								</div>

								{/* Новый пароль */}
								<div>
									<label
										htmlFor='newPassword'
										className='block text-sm font-medium text-[#2A3F54] mb-1'
									>
										Жаңа құпия сөз
									</label>
									<input
										type='password'
										id='newPassword'
										name='newPassword'
										value={profileData.newPassword || ''}
										onChange={handleInputChange}
										className='w-full bg-white text-[#2A3F54] rounded-[10px] p-[6px] focus:outline-none focus:ring-2 focus:ring-[#2A3F54]'
									/>
									{errors.newPassword && (
										<p className='text-red-500 text-sm mt-1'>
											{errors.newPassword}
										</p>
									)}
								</div>

								{/* Подтверждение пароля */}
								<div>
									<label
										htmlFor='confirmPassword'
										className='block text-sm font-medium text-[#2A3F54] mb-1'
									>
										Құпия сөзді растау
									</label>
									<input
										type='password'
										id='confirmPassword'
										name='confirmPassword'
										value={profileData.confirmPassword || ''}
										onChange={handleInputChange}
										className='w-full bg-white text-[#2A3F54] rounded-[10px] p-[6px] focus:outline-none focus:ring-2 focus:ring-[#2A3F54]'
									/>
									{errors.confirmPassword && (
										<p className='text-red-500 text-sm mt-1'>
											{errors.confirmPassword}
										</p>
									)}
								</div>
							</div>
						)}
					</div>

					{/* Общая ошибка формы */}
					{errors.form && (
						<div className='mb-6 p-3 bg-red-50 text-red-500 rounded-md'>
							{errors.form}
						</div>
					)}

					{/* Сообщение об успешном сохранении */}
					{successMessage && (
						<div className='mb-6 p-3 bg-green-50 text-green-600 rounded-md'>
							{successMessage}
						</div>
					)}

					{/* Кнопки */}
					<div className='flex justify-center gap-4 mt-8'>
						<button
							type='button'
							onClick={() => router.push('/profile')}
							className='px-4 py-2 rounded-[30px] border border-[#2A3F54] text-[#2A3F54] hover:bg-gray-50 flex items-center gap-2'
						>
							<svg
								width='24'
								height='24'
								viewBox='0 0 24 24'
								fill='none'
								xmlns='http://www.w3.org/2000/svg'
							>
								<path
									d='M19 12H5'
									stroke='#2A3F54'
									strokeWidth='2'
									strokeLinecap='round'
									strokeLinejoin='round'
								/>
								<path
									d='M12 19L5 12L12 5'
									stroke='#2A3F54'
									strokeWidth='2'
									strokeLinecap='round'
									strokeLinejoin='round'
								/>
							</svg>
							<span className='text-[10px] font-semibold'>Болдырмау</span>
						</button>

						<button
							type='submit'
							disabled={saving}
							className='px-4 py-2 bg-[#2A3F54] text-white rounded-[30px] hover:bg-opacity-90 flex items-center gap-2'
						>
							<svg
								width='24'
								height='24'
								viewBox='0 0 24 24'
								fill='none'
								xmlns='http://www.w3.org/2000/svg'
							>
								<path
									d='M20 6L9 17L4 12'
									stroke='white'
									strokeWidth='2'
									strokeLinecap='round'
									strokeLinejoin='round'
								/>
							</svg>
							<span className='text-[10px] font-semibold'>
								{saving ? 'Сақталуда...' : 'Сақтау'}
							</span>
						</button>
					</div>
				</form>
			</div>
		</div>
	)
}
