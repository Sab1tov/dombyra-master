'use client'

import api from '@/services/axiosInstance'
import { useAuthStore } from '@/store/authStore'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

interface UserProfile {
	id: number
	username: string
	email: string
	avatar: string | null
	registeredAt: string
	lastLoginAt: string
	role: 'user' | 'admin'
}

interface Achievement {
	id: number
	title: string
	description: string
	icon: string
	unlockedAt: string
}

interface UserStats {
	videosCompleted: number
	totalVideos: number
	favoriteSheetMusic: number
	favoriteVideos: number
	totalComments: number
	totalTimeSpent: number
	uploadedSheetMusic: number
}

interface FavoriteItem {
	id: number
	title: string
	type: 'sheet_music' | 'video'
	thumbnailUrl: string
	addedAt: string
	composer: string
	progress: number
	userId: number
}

// Функция для расчета количества часов с момента регистрации
const calculateHoursSinceRegistration = (registeredAt: string): number => {
	if (!registeredAt) return 0

	try {
		const registrationDate = new Date(registeredAt)
		const now = new Date()

		// Проверка на валидность даты
		if (isNaN(registrationDate.getTime())) {
			console.error('❌ Невалидная дата регистрации:', registeredAt)
			return 0
		}

		const diffMs = now.getTime() - registrationDate.getTime()
		const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
		return diffHours > 0 ? diffHours : 0
	} catch (error) {
		console.error(
			'❌ Ошибка при вычислении времени с момента регистрации:',
			error
		)
		return 0
	}
}

export default function ProfilePage() {
	const { user, logout } = useAuthStore()
	const router = useRouter()
	const [profile, setProfile] = useState<UserProfile | null>(null)
	const [stats, setStats] = useState<UserStats | null>(null)
	const [achievements, setAchievements] = useState<Achievement[]>([])
	const [recentSheetMusic, setRecentSheetMusic] = useState<FavoriteItem[]>([])
	const [favoriteSheetMusic, setFavoriteSheetMusic] = useState<FavoriteItem[]>(
		[]
	)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	const fetchUserProfile = useCallback(async () => {
		setLoading(true)
		try {
			// Получаем данные профиля через API
			try {
				console.log('🔄 Запрашиваем данные профиля')
				const response = await api.get('/auth/profile')
				console.log('📊 Статус ответа профиля:', response.status)

				// Если данные есть, заполняем профиль
				if (response.data) {
					const profileData: UserProfile = {
						id: response.data.id || user?.id || 0,
						username:
							response.data.username || user?.username || 'Пользователь',
						email: response.data.email || user?.email || 'email@example.com',
						avatar: response.data.avatar,
						registeredAt:
							response.data.registered_at || new Date().toISOString(),
						lastLoginAt: new Date().toISOString(),
						role: response.data.role || user?.role || 'user',
					}

					setProfile(profileData)

					// Запрашиваем количество загруженных нот
					let uploadedSheetMusicCount = 0
					try {
						console.log('🔄 Запрашиваем данные о загруженных нотах')
						const userSheetMusicResponse = await api.get('/sheet-music/user')
						console.log(
							'📊 Статус ответа о загруженных нотах:',
							userSheetMusicResponse.status
						)

						if (
							userSheetMusicResponse.status === 200 &&
							userSheetMusicResponse.data
						) {
							if (Array.isArray(userSheetMusicResponse.data)) {
								// Получаем все ноты из ответа API
								const allSheetMusic = userSheetMusicResponse.data

								// Фильтруем только ноты пользователя, используя его ID из профиля или из authStore
								const userSheetMusic: FavoriteItem[] = allSheetMusic
									.filter(item => {
										// Проверяем, принадлежит ли нота текущему пользователю
										const itemUserId =
											typeof item.user_id === 'number' ? item.user_id : 0
										const currentUserId = user?.id || 0
										return itemUserId === currentUserId
									})
									.map((item: Record<string, unknown>) => ({
										id: typeof item.id === 'number' ? item.id : 0,
										title:
											typeof item.title === 'string'
												? item.title
												: 'Без названия',
										composer:
											typeof item.owner === 'string'
												? item.owner
												: typeof item.composer === 'string'
												? item.composer
												: 'Неизвестный автор',
										type: 'sheet_music' as const,
										thumbnailUrl:
											typeof item.thumbnail_url === 'string'
												? item.thumbnail_url
												: '/images/demo/sheet1.jpg',
										addedAt:
											typeof item.created_at === 'string'
												? item.created_at
												: new Date().toISOString(),
										progress: 100, // Для загруженных нот прогресс всегда 100%
										userId: typeof item.user_id === 'number' ? item.user_id : 0,
									}))

								// Обновляем счетчик только загруженными пользователем нотами
								uploadedSheetMusicCount = userSheetMusic.length
								console.log(
									`📊 Количество загруженных нот пользователя ID=${user?.id}: ${uploadedSheetMusicCount}`
								)
								setRecentSheetMusic(userSheetMusic)
							} else if (
								typeof userSheetMusicResponse.data === 'object' &&
								userSheetMusicResponse.data !== null
							) {
								uploadedSheetMusicCount = userSheetMusicResponse.data.count || 0
								console.log(
									`📊 Количество загруженных нот (из объекта): ${uploadedSheetMusicCount}`
								)
							} else {
								console.log(
									'⚠️ Данные о загруженных нотах имеют неожиданный формат:',
									typeof userSheetMusicResponse.data
								)
							}
						} else {
							console.warn(
								'⚠️ Нет данных о загруженных нотах или неверный статус ответа'
							)
						}
					} catch (sheetMusicError: unknown) {
						console.error(
							'❌ Ошибка при запросе загруженных нот:',
							sheetMusicError
						)
						console.log(
							'⚠️ Используем значение по умолчанию для количества загруженных нот: 0'
						)

						// Устанавливаем пустой массив вместо демо-данных
						uploadedSheetMusicCount = 0
						setRecentSheetMusic([])
					}

					// Создаем статистику с использованием даты регистрации
					const registeredHours = profileData.registeredAt
						? calculateHoursSinceRegistration(profileData.registeredAt)
						: 0

					const statsData: UserStats = {
						videosCompleted: 2,
						totalVideos: 6,
						favoriteSheetMusic: 3,
						favoriteVideos: 2,
						totalComments: 5,
						totalTimeSpent: registeredHours,
						uploadedSheetMusic: uploadedSheetMusicCount,
					}

					setStats(statsData)
					setAchievements([])
				}
			} catch (profileError: unknown) {
				console.error('❌ Ошибка при запросе профиля:', profileError)

				// Проверяем на ошибку авторизации (401) и автоматически выходим
				if (
					typeof profileError === 'object' &&
					profileError !== null &&
					'response' in profileError &&
					profileError.response &&
					typeof profileError.response === 'object' &&
					'status' in profileError.response &&
					profileError.response.status === 401
				) {
					console.error(
						'❌ Ошибка аутентификации (401). Выполняем выход из системы.'
					)
					logout()
					router.push('/auth/login')
					return
				}

				// В случае других ошибок используем резервные данные
				if (user) {
					console.log('🔄 Используем резервные данные профиля')
					setProfile({
						id: user.id || 0,
						username: user.username || 'Пользователь',
						email: user.email || 'email@example.com',
						avatar: user.avatar || null,
						registeredAt: new Date().toISOString(),
						lastLoginAt: new Date().toISOString(),
						role: user.role || 'user',
					})

					setStats({
						videosCompleted: 0,
						totalVideos: 0,
						favoriteSheetMusic: 0,
						favoriteVideos: 0,
						totalComments: 0,
						totalTimeSpent: 0,
						uploadedSheetMusic: 0,
					})
				}
			}

			// Загружаем избранные ноты
			try {
				console.log('🔄 Начинаем загрузку избранного')
				const favoritesResponse = await api.get('/favorites')
				console.log('📊 Полученные данные избранного:', favoritesResponse.data)

				if (
					favoritesResponse.status === 200 &&
					Array.isArray(favoritesResponse.data)
				) {
					// Преобразуем данные в формат FavoriteItem
					const favorites: FavoriteItem[] = favoritesResponse.data.map(
						(item: Record<string, unknown>) => ({
							id: typeof item.id === 'number' ? item.id : 0,
							title:
								typeof item.title === 'string' ? item.title : 'Без названия',
							composer:
								typeof item.owner === 'string'
									? item.owner
									: 'Неизвестный автор',
							type: 'sheet_music' as const, // явно указываем литеральный тип
							thumbnailUrl:
								typeof item.thumbnail_url === 'string'
									? item.thumbnail_url
									: '/images/demo/sheet1.jpg',
							addedAt:
								typeof item.added_to_favorites === 'string'
									? item.added_to_favorites
									: typeof item.created_at === 'string'
									? item.created_at
									: new Date().toISOString(),
							progress: 100, // Для нот прогресс всегда 100%
							userId: typeof item.user_id === 'number' ? item.user_id : 0,
						})
					)
					setFavoriteSheetMusic(favorites)
				} else {
					console.log('⚠️ Загружаем демо данные для избранного')
					setFavoriteSheetMusic([])
				}
			} catch (favErr) {
				console.error('❌ Ошибка при загрузке избранного:', favErr)
				setFavoriteSheetMusic([])
			}
		} catch (err) {
			console.error('❌ Ошибка при загрузке профиля:', err)
			setError('Не удалось загрузить данные профиля. Попробуйте позже.')

			// Если в режиме разработки, загружаем демо данные
			/* Закомментируем эту часть, чтобы не загружать демо-данные
				if (process.env.NODE_ENV === 'development') {
				console.log('🧪 Загружаем демо данные в режиме разработки')
					loadDemoData()
				}
			*/
		} finally {
			setLoading(false)
		}
	}, [user, logout, router])

	useEffect(() => {
		// Импортируем функцию валидации токена
		import('@/store/authStore').then(module => {
			// Проверяем токен и автоматически выходим при необходимости
			const isValid = module.validateToken()

			// Если токен недействительный, функция validateToken уже позаботится о выходе
			if (!isValid) return

			// Если пользователь не авторизован и токен невалидный
			if (!user) {
				router.push('/auth/login')
				return
			}

			// Если все в порядке, загружаем профиль
			fetchUserProfile()
		})
	}, [user, router, fetchUserProfile])

	const handleLogout = () => {
		logout()
		router.push('/')
	}

	// Функция для удаления ноты из избранных
	const removeFromFavorites = async (id: number) => {
		try {
			// Оптимистичное обновление UI
			setFavoriteSheetMusic(prevFavorites =>
				prevFavorites.filter(item => item.id !== id)
			)

			// Отправка запроса на удаление
			await api.delete(`/favorites/${id}`)
			console.log('Успешно удалено из избранного:', id)
		} catch (error: unknown) {
			console.error('Ошибка при удалении из избранного:', error)

			// Восстанавливаем состояние в случае ошибки
			// Загружаем заново данные профиля и избранное
			const fetchFavorites = async () => {
				try {
					const favoritesResponse = await api.get('/favorites')
					if (favoritesResponse.status === 200) {
						const favorites = favoritesResponse.data.map(
							(item: Record<string, unknown>) => ({
								id: typeof item.id === 'number' ? item.id : 0,
								title:
									typeof item.title === 'string' ? item.title : 'Без названия',
								composer:
									typeof item.owner === 'string'
										? item.owner
										: 'Неизвестный автор',
								type: 'sheet_music',
								thumbnailUrl:
									typeof item.thumbnail_url === 'string'
										? item.thumbnail_url
										: '/images/demo/sheet1.jpg',
								addedAt:
									typeof item.added_to_favorites === 'string'
										? item.added_to_favorites
										: typeof item.created_at === 'string'
										? item.created_at
										: new Date().toISOString(),
								progress: 100, // Для нот прогресс всегда 100%
								userId: typeof item.user_id === 'number' ? item.user_id : 0,
							})
						)
						setFavoriteSheetMusic(favorites)
					}
				} catch (fetchError) {
					console.error('Ошибка при загрузке избранного:', fetchError)
				}
			}

			fetchFavorites()
			alert('Не удалось удалить из избранного. Пожалуйста, попробуйте позже.')
		}
	}

	// Функция для получения полного URL аватара
	const getAvatarUrl = (avatarPath: string | null): string => {
		if (!avatarPath) return '/images/default-avatar.png'

		// Если путь начинается с http или https, это уже полный URL
		if (avatarPath.startsWith('http')) {
			return avatarPath
		}

		// Если аватар начинается с /uploads/, это относительный путь к файлу
		if (avatarPath.startsWith('/uploads/')) {
			// Используем прямой путь, который будет обрабатываться через rewrites в Next.js
			return avatarPath // Rewrites в next.config.js перенаправит на http://localhost:5000/uploads/...
		}

		// Иначе это относительный путь, используем как есть
		return avatarPath
	}

	if (loading) {
		return (
			<div className='flex justify-center items-center min-h-screen'>
				<div className='animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#2A3F54]'></div>
			</div>
		)
	}

	// Show error message if there was an error loading the profile
	if (error) {
		return (
			<div className='container mx-auto px-4 py-8'>
				<div
					className='bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative'
					role='alert'
				>
					<strong className='font-bold'>Қате!</strong>
					<span className='block sm:inline'> {error}</span>
				</div>
			</div>
		)
	}

	return (
		<div className='container max-w-7xl mx-auto px-4 py-8'>
			<div className='max-w-4xl mx-auto flex flex-col gap-6'>
				{/* Профиль пользователя */}
				<div className='bg-white rounded-[20px] shadow-md overflow-hidden'>
					<div className='p-8 flex flex-col md:flex-row items-center gap-6 relative'>
						{/* Аватар */}
						<div className='relative w-24 h-24 rounded-full overflow-hidden bg-[#2A3F54] flex items-center justify-center text-3xl text-white'>
							{profile?.avatar ? (
								<>
									<Image
										src={getAvatarUrl(profile.avatar)}
										alt={profile?.username || 'Пользователь'}
										fill
										className='object-cover'
										onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
											console.error('Ошибка загрузки аватара:', profile.avatar)
											// Заменяем на первую букву имени пользователя при ошибке
											e.currentTarget.style.display = 'none'
											// Показываем запасной вариант
											const fallbackEl = document.getElementById(
												`avatar-fallback-${profile.id}`
											)
											if (fallbackEl) fallbackEl.style.display = 'flex'
										}}
									/>
									<div
										id={`avatar-fallback-${profile.id}`}
										style={{ display: 'none' }}
										className='w-full h-full flex items-center justify-center text-3xl text-white'
									>
										{profile?.username?.charAt(0).toUpperCase() || '?'}
									</div>
								</>
							) : (
								profile?.username?.charAt(0).toUpperCase() || '?'
							)}
						</div>

						{/* Информация о пользователе */}
						<div className='flex flex-col'>
							<h1 className='text-[#2A3F54] text-[32px] font-bold'>
								{profile?.username}
							</h1>
							<p className='text-[#2A3F54] text-[16px] opacity-70'>
								{profile?.email}
							</p>
						</div>

						{/* Кнопка редактирования (на мобильных внизу, на десктопе справа сверху) */}
						<div className='absolute top-8 right-8 hidden md:block'>
							<div className='flex space-x-4'>
								<button
									className='text-[#2A3F54]'
									onClick={() => router.push('/profile/edit')}
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
										<path d='M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7'></path>
										<path d='M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z'></path>
									</svg>
								</button>
								<button
									className='text-[#E35F5F]'
									onClick={handleLogout}
									title='Шығу'
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
										<path d='M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4'></path>
										<polyline points='16 17 21 12 16 7'></polyline>
										<line x1='21' y1='12' x2='9' y2='12'></line>
									</svg>
								</button>
							</div>
						</div>

						<div className='md:hidden mt-4 flex space-x-3'>
							<button
								className='px-4 py-2 bg-[#2A3F54] text-white rounded hover:bg-opacity-90 transition text-sm'
								onClick={() => router.push('/profile/edit')}
							>
								Профилді өзгерту
							</button>
							<button
								className='px-4 py-2 bg-[#E35F5F] text-white rounded hover:bg-opacity-90 transition text-sm'
								onClick={handleLogout}
							>
								Шығу
							</button>
						</div>
					</div>
				</div>

				{/* Статистика */}
				<div className='bg-white rounded-[20px] shadow-md overflow-hidden'>
					<div className='p-8'>
						<h3 className='text-[22px] font-bold text-[#2A3F54] mb-4'>
							Статистика
						</h3>

						<div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
							<div className='bg-[#F7F8FA] p-5 rounded-[16px] flex items-center'>
								<div className='mr-4'>
									<svg
										width='40'
										height='40'
										viewBox='0 0 24 24'
										fill='none'
										xmlns='http://www.w3.org/2000/svg'
									>
										<path
											d='M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z'
											stroke='#2A3F54'
											strokeWidth='2'
											strokeLinecap='round'
											strokeLinejoin='round'
										/>
										<path
											d='M12 6V12L16 14'
											stroke='#2A3F54'
											strokeWidth='2'
											strokeLinecap='round'
											strokeLinejoin='round'
										/>
									</svg>
								</div>
								<div>
									<p className='text-[15px] text-[#627282]'>Жалпы уақыт</p>
									<p className='text-[25px] font-bold text-[#2A3F54]'>
										{profile?.registeredAt
											? calculateHoursSinceRegistration(profile.registeredAt)
											: 0}{' '}
										сағат
									</p>
								</div>
							</div>

							<div className='bg-[#F7F8FA] p-5 rounded-[16px] flex items-center'>
								<div className='mr-4'>
									<svg
										width='40'
										height='40'
										viewBox='0 0 24 24'
										fill='none'
										xmlns='http://www.w3.org/2000/svg'
									>
										<path
											d='M9 17H15M9 17V11L19 7V13L15 15M9 17L5 19V7L9 5M15 15V11M15 15L19 17'
											stroke='#2A3F54'
											strokeWidth='2'
											strokeLinecap='round'
											strokeLinejoin='round'
										/>
									</svg>
								</div>
								<div>
									<p className='text-[15px] text-[#627282]'>Күйлер саны</p>
									<p className='text-[25px] font-bold text-[#2A3F54]'>
										{stats?.uploadedSheetMusic || 0} күй
									</p>
								</div>
							</div>

							<div className='bg-[#F7F8FA] p-5 rounded-[16px] flex items-center'>
								<div className='mr-4'>
									<svg
										width='40'
										height='40'
										viewBox='0 0 24 24'
										fill='none'
										xmlns='http://www.w3.org/2000/svg'
									>
										<path
											d='M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z'
											stroke='#2A3F54'
											strokeWidth='2'
											strokeLinecap='round'
											strokeLinejoin='round'
										/>
										<path
											d='M19.4 15C19.2669 15.3016 19.2272 15.6362 19.286 15.9606C19.3448 16.285 19.4995 16.5843 19.73 16.82L19.79 16.88C19.976 17.0657 20.1235 17.2863 20.2241 17.5291C20.3248 17.7719 20.3766 18.0322 20.3766 18.295C20.3766 18.5578 20.3248 18.8181 20.2241 19.0609C20.1235 19.3037 19.976 19.5243 19.79 19.71C19.6043 19.896 19.3837 20.0435 19.1409 20.1441C18.8981 20.2448 18.6378 20.2966 18.375 20.2966C18.1122 20.2966 17.8519 20.2448 17.6091 20.1441C17.3663 20.0435 17.1457 19.896 16.96 19.71L16.9 19.65C16.6643 19.4195 16.365 19.2648 16.0406 19.206C15.7162 19.1472 15.3816 19.1869 15.08 19.32C14.7842 19.4468 14.532 19.6572 14.3543 19.9255C14.1766 20.1938 14.0813 20.5082 14.08 20.83V21C14.08 21.5304 13.8693 22.0391 13.4942 22.4142C13.1191 22.7893 12.6104 23 12.08 23C11.5496 23 11.0409 22.7893 10.6658 22.4142C10.2907 22.0391 10.08 21.5304 10.08 21V20.91C10.0723 20.579 9.96512 20.258 9.77251 19.9887C9.5799 19.7194 9.31074 19.5143 9 19.4C8.69838 19.2669 8.36381 19.2272 8.03941 19.286C7.71502 19.3448 7.41568 19.4995 7.18 19.73L7.12 19.79C6.93425 19.976 6.71368 20.1235 6.47088 20.2241C6.22808 20.3248 5.96783 20.3766 5.705 20.3766C5.44217 20.3766 5.18192 20.3248 4.93912 20.2241C4.69632 20.1235 4.47575 19.976 4.29 19.79C4.10405 19.6043 3.95653 19.3837 3.85588 19.1409C3.75523 18.8981 3.70343 18.6378 3.70343 18.375C3.70343 18.1122 3.75523 17.8519 3.85588 17.6091C3.95653 17.3663 4.10405 17.1457 4.29 16.96L4.35 16.9C4.58054 16.6643 4.73519 16.365 4.794 16.0406C4.85282 15.7162 4.81312 15.3816 4.68 15.08C4.55324 14.7842 4.34276 14.532 4.07447 14.3543C3.80618 14.1766 3.49179 14.0813 3.17 14.08H3C2.46957 14.08 1.96086 13.8693 1.58579 13.4942C1.21071 13.1191 1 12.6104 1 12.08C1 11.5496 1.21071 11.0409 1.58579 10.6658C1.96086 10.2907 2.46957 10.08 3 10.08H3.09C3.42099 10.0723 3.742 9.96512 4.0113 9.77251C4.28059 9.5799 4.48572 9.31074 4.6 9C4.73312 8.69838 4.77282 8.36381 4.714 8.03941C4.65519 7.71502 4.50054 7.41568 4.27 7.18L4.21 7.12C4.02405 6.93425 3.87653 6.71368 3.77588 6.47088C3.67523 6.22808 3.62343 5.96783 3.62343 5.705C3.62343 5.44217 3.67523 5.18192 3.77588 4.93912C3.87653 4.69632 4.02405 4.47575 4.21 4.29C4.39575 4.10405 4.61632 3.95653 4.85912 3.85588C5.10192 3.75523 5.36217 3.70343 5.625 3.70343C5.88783 3.70343 6.14808 3.75523 6.39088 3.85588C6.63368 3.95653 6.85425 4.10405 7.04 4.29L7.1 4.35C7.33568 4.58054 7.63502 4.73519 7.95941 4.794C8.28381 4.85282 8.61838 4.81312 8.92 4.68H9C9.29577 4.55324 9.54802 4.34276 9.72569 4.07447C9.90337 3.80618 9.99872 3.49179 10 3.17V3C10 2.46957 10.2107 1.96086 10.5858 1.58579C10.9609 1.21071 11.4696 1 12 1C12.5304 1 13.0391 1.21071 13.4142 1.58579C13.7893 1.96086 14 2.46957 14 3V3.09C14.0013 3.41179 14.0966 3.72618 14.2743 3.99447C14.452 4.26276 14.7042 4.47324 15 4.6C15.3016 4.73312 15.6362 4.77282 15.9606 4.714C16.285 4.65519 16.5843 4.50054 16.82 4.27L16.88 4.21C17.0657 4.02405 17.2863 3.87653 17.5291 3.77588C17.7719 3.67523 18.0322 3.62343 18.295 3.62343C18.5578 3.62343 18.8181 3.67523 19.0609 3.77588C19.3037 3.87653 19.5243 4.02405 19.71 4.21C19.896 4.39575 20.0435 4.61632 20.1441 4.85912C20.2448 5.10192 20.2966 5.36217 20.2966 5.625C20.2966 5.88783 20.2448 6.14808 20.1441 6.39088C20.0435 6.63368 19.896 6.85425 19.71 7.04L19.65 7.1C19.4195 7.33568 19.2648 7.63502 19.206 7.95941C19.1472 8.28381 19.1869 8.61838 19.32 8.92V9C19.4468 9.29577 19.6572 9.54802 19.9255 9.72569C20.1938 9.90337 20.5082 9.99872 20.83 10H21C21.5304 10 22.0391 10.2107 22.4142 10.5858C22.7893 10.9609 23 11.4696 23 12C23 12.5304 22.7893 13.0391 22.4142 13.4142C22.0391 13.7893 21.5304 14 21 14H20.91C20.5882 14.0013 20.2738 14.0966 20.0055 14.2743C19.7372 14.452 19.5268 14.7042 19.4 15Z'
											stroke='#2A3F54'
											strokeWidth='2'
											strokeLinecap='round'
											strokeLinejoin='round'
										/>
									</svg>
								</div>
								<div>
									<p className='text-[15px] text-[#627282]'>Жетістіктер</p>
									<p className='text-[25px] font-bold text-[#2A3F54]'>
										{achievements?.length || 0}
									</p>
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* Жетістіктер */}
				<div className='bg-white rounded-[20px] shadow-md overflow-hidden'>
					<div className='p-8'>
						<h3 className='text-[22px] font-bold text-[#2A3F54] mb-6'>
							Жетістіктер
						</h3>

						<div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
							{achievements && achievements.length > 0 ? (
								achievements.slice(0, 3).map(achievement => (
									<div key={achievement.id} className='flex flex-col'>
										<div className='bg-[#F7F8FA] h-[60px] w-[60px] rounded-[16px] flex items-center justify-center mb-3'>
											<span className='text-3xl'>{achievement.icon}</span>
										</div>
										<h4 className='text-[17px] font-semibold text-[#2A3F54] mb-1'>
											{achievement.title}
										</h4>
										<p className='text-[14px] text-[#627282]'>
											{achievement.description}
										</p>
									</div>
								))
							) : (
								<p className='col-span-3 text-[#627282]'>Жетістіктер әлі жоқ</p>
							)}
						</div>
					</div>
				</div>

				{/* Соңғы күйлер */}
				<div className='bg-white rounded-[20px] shadow-md overflow-hidden'>
					<div className='p-8'>
						<h3 className='text-[22px] font-bold text-[#2A3F54] mb-6'>
							Соңғы күйлер
						</h3>

						<div className='space-y-6 max-h-[370px] overflow-y-auto pr-2'>
							{recentSheetMusic && recentSheetMusic.length > 0 ? (
								recentSheetMusic.map(item => (
									<div key={item.id} className='space-y-3'>
										<div className='flex items-center justify-between'>
											<div className='flex items-center'>
												<div className='bg-[#E4B87C] h-[50px] w-[50px] rounded-[16px] flex items-center justify-center text-white mr-4'>
													<svg
														width='24'
														height='24'
														viewBox='0 0 24 24'
														fill='none'
														xmlns='http://www.w3.org/2000/svg'
													>
														<path
															d='M9 17H15M9 17V11L19 7V13L15 15M9 17L5 19V7L9 5M15 15V11M15 15L19 17'
															stroke='white'
															strokeWidth='2'
															strokeLinecap='round'
															strokeLinejoin='round'
														/>
													</svg>
												</div>
												<div>
													<h4 className='text-[17px] font-semibold text-[#2A3F54]'>
														{item.title}
													</h4>
													<p className='text-[14px] text-[#627282]'>
														{item.composer}
													</p>
												</div>
											</div>
											<div className='flex items-center space-x-2'>
												<Link
													href={`/sheet-music/${item.id}`}
													className='px-4 py-2 bg-[#E4B87C] text-white text-[15px] font-medium rounded-[20px] flex items-center justify-center'
												>
													Қарау
												</Link>
											</div>
										</div>
									</div>
								))
							) : (
								<p className='text-[#627282]'>Жүктелген ноталар әлі жоқ</p>
							)}
						</div>
					</div>
				</div>

				{/* Избранные ноты */}
				<div className='bg-white rounded-[20px] shadow-md overflow-hidden'>
					<div className='p-8'>
						<h3 className='text-[22px] font-bold text-[#2A3F54] mb-6'>
							Таңдаулы ноталар
						</h3>

						<div className='space-y-6 max-h-[370px] overflow-y-auto pr-2'>
							{favoriteSheetMusic && favoriteSheetMusic.length > 0 ? (
								favoriteSheetMusic.map(item => (
									<div key={item.id} className='space-y-3'>
										<div className='flex items-center justify-between'>
											<div className='flex items-center'>
												<div className='bg-[#2A3F54] h-[50px] w-[50px] rounded-[16px] flex items-center justify-center text-white mr-4'>
													<svg
														width='24'
														height='24'
														viewBox='0 0 24 24'
														fill='none'
														xmlns='http://www.w3.org/2000/svg'
													>
														<path
															d='M9 17H15M9 17V11L19 7V13L15 15M9 17L5 19V7L9 5M15 15V11M15 15L19 17'
															stroke='white'
															strokeWidth='2'
															strokeLinecap='round'
															strokeLinejoin='round'
														/>
													</svg>
												</div>
												<div>
													<h4 className='text-[17px] font-semibold text-[#2A3F54]'>
														{item.title}
													</h4>
													<p className='text-[14px] text-[#627282]'>
														{item.composer}
													</p>
												</div>
											</div>
											<div className='flex items-center space-x-2'>
												<button
													onClick={() => removeFromFavorites(item.id)}
													className='w-8 h-8 bg-[#E35F5F] text-white rounded-full flex items-center justify-center hover:bg-[#D14747] transition-colors'
													title='Таңдаулыдан алып тастау'
												>
													<svg
														width='16'
														height='16'
														viewBox='0 0 24 24'
														fill='none'
														xmlns='http://www.w3.org/2000/svg'
													>
														<path
															d='M18 6L6 18M6 6L18 18'
															stroke='white'
															strokeWidth='2'
															strokeLinecap='round'
															strokeLinejoin='round'
														/>
													</svg>
												</button>
												<Link
													href={`/sheet-music/${item.id}`}
													className='px-4 py-2 bg-[#2A3F54] text-white text-[15px] font-medium rounded-[20px] flex items-center justify-center'
												>
													Қарау
												</Link>
											</div>
										</div>
									</div>
								))
							) : (
								<p className='text-[#627282]'>Таңдаулы ноталар әлі жоқ</p>
							)}
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}
