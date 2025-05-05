'use client'

import api from '@/services/axiosInstance'
import { useAuthStore } from '@/store/authStore'
import Link from 'next/link'
import { useEffect, useState } from 'react'

interface VideoLessonType {
	id: number
	title: string
	description: string
	video_url: string
	thumbnail_url: string
	duration: number
	difficulty: 'beginner' | 'intermediate' | 'advanced'
	views: number
	isCompleted?: boolean
	isLocked?: boolean
	progress?: number
	order?: number
	moduleId?: number
}

export default function VideosPage() {
	const { user } = useAuthStore()
	const [videos, setVideos] = useState<VideoLessonType[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
	const [isRefreshing, setIsRefreshing] = useState(false)
	const [updatedVideoIds, setUpdatedVideoIds] = useState<number[]>([])

	// Вынесем функцию fetchVideos за пределы useEffect
	const fetchVideos = async (showLoading = true) => {
		try {
			if (showLoading) {
				setLoading(true)
			} else {
				setIsRefreshing(true) // Устанавливаем флаг обновления для анимации
			}

			setError(null)
			const response = await api.get('/video-lessons')
			console.log(
				'📥 Данные с сервера обновлены:',
				new Date().toLocaleTimeString()
			)

			// Находим видео с изменившимся прогрессом
			const updatedIds: number[] = []

			if (videos.length > 0) {
				response.data.forEach((newVideo: VideoLessonType) => {
					const oldVideo = videos.find(v => v.id === newVideo.id)
					if (oldVideo && oldVideo.progress !== newVideo.progress) {
						updatedIds.push(newVideo.id)
						console.log(
							`⬆️ Обновлен прогресс для видео #${newVideo.id}: ${
								oldVideo.progress || 0
							}% → ${newVideo.progress || 0}%`
						)
					}
				})
			}

			// Улучшенная обработка данных с сервера
			const processedVideos = response.data.map((video: VideoLessonType) => {
				// Копируем видео для модификации
				const processedVideo = { ...video }

				// Убедимся, что прогресс - это число
				if (
					processedVideo.progress === undefined ||
					processedVideo.progress === null
				) {
					processedVideo.progress = 0
				}

				// Проверяем, есть ли локальный прогресс, который больше серверного
				try {
					// Используем ID пользователя в ключе localStorage для изоляции прогресса
					const localProgressKey = user
						? `video-progress-${user.id}-${processedVideo.id}`
						: `video-progress-guest-${processedVideo.id}`
					const savedProgress = localStorage.getItem(localProgressKey)

					if (savedProgress) {
						const localProgress = parseInt(savedProgress)
						if (
							!isNaN(localProgress) &&
							localProgress > processedVideo.progress
						) {
							console.log(
								`🔄 Использование локального прогресса для видео #${processedVideo.id}: ${localProgress}% (сервер: ${processedVideo.progress}%)`
							)
							processedVideo.progress = localProgress

							// Можно также отправить обновление на сервер, чтобы синхронизировать данные
							api
								.put(`/video-lessons/${processedVideo.id}/progress`, {
									progress: localProgress,
								})
								.catch(e => console.warn('Ошибка при обновлении прогресса:', e))
						}
					}
				} catch (e) {
					console.warn('Ошибка при проверке локального прогресса:', e)
				}

				// Округляем прогресс до целого числа для более понятного отображения
				processedVideo.progress = Math.round(processedVideo.progress)

				// Проверяем, просмотрен ли урок (80% или больше)
				processedVideo.isCompleted = processedVideo.progress >= 80

				// Разблокируем все уроки для упрощения UX
				processedVideo.isLocked = false

				return processedVideo
			})

			console.log('✅ Обработано видео:', processedVideos.length)

			setVideos(processedVideos)
			setLastUpdate(new Date())

			// Устанавливаем список обновлённых ID видео
			if (updatedIds.length > 0) {
				setUpdatedVideoIds(updatedIds)
				// Через 3 секунды сбрасываем эффект подсветки
				setTimeout(() => {
					setUpdatedVideoIds([])
				}, 3000)
			}
		} catch (err) {
			console.error('❌ Ошибка при загрузке видеоуроков:', err)
			setError(
				err instanceof Error
					? err.message
					: 'Не удалось загрузить видеоуроки. Пожалуйста, попробуйте позже.'
			)
			loadDemoData() // Загружаем демо-данные при ошибке
		} finally {
			if (showLoading) {
				setLoading(false)
			} else {
				setIsRefreshing(false) // Сбрасываем флаг обновления
			}
		}
	}

	// Загрузка видеоуроков
	useEffect(() => {
		// Первоначальная загрузка с индикатором
		fetchVideos(true)

		// Настройка интервала обновления каждые 30 секунд без индикатора загрузки
		const refreshInterval = setInterval(() => {
			fetchVideos(false) // Обновляем данные без показа индикатора загрузки
		}, 30000) // 30 секунд

		// Обновление данных при возвращении на страницу
		const handleVisibilityChange = () => {
			if (document.visibilityState === 'visible') {
				console.log('Пользователь вернулся на страницу, обновляем данные')
				fetchVideos(false)
			}
		}

		document.addEventListener('visibilitychange', handleVisibilityChange)

		// Очистка интервала и слушателя событий при размонтировании
		return () => {
			clearInterval(refreshInterval)
			document.removeEventListener('visibilitychange', handleVisibilityChange)
		}
	}, [user])

	// Функция для загрузки демо-данных при недоступности API
	const loadDemoData = () => {
		const demoVideos: VideoLessonType[] = [
			{
				id: 1,
				title: 'Домбыраны дұрыс ұстау',
				description:
					'Домбыраны қалай дұрыс ұстау керек. Отырыс, қол қалпы және негізгі ойын әдістері.',
				video_url: '/videos/demo/dombyra-basics.mp4',
				thumbnail_url: '/images/demo/video1.jpg',
				duration: 1320, // 22 минуты
				difficulty: 'beginner',
				views: 1245,
				isCompleted: true, // Первый урок уже просмотрен
				isLocked: false,
				order: 1,
				progress: 100,
				moduleId: 1,
			},
			{
				id: 2,
				title: 'Негізгі аккордтар',
				description:
					'Домбыраға арналған негізгі аккордтар. Бұл сабақта біз барлық техникалық тәсілдер мен орындау ерекшеліктерін қарастырамыз.',
				video_url: '/videos/demo/adai-tutorial.mp4',
				thumbnail_url: '/images/demo/video2.jpg',
				duration: 2340, // 39 минут
				difficulty: 'beginner',
				views: 873,
				isCompleted: false,
				isLocked: false,
				order: 2,
				progress: 0,
				moduleId: 1,
			},
			{
				id: 3,
				title: 'Қарапайым күйлер',
				description:
					'Бастауышқа арналған қарапайым күйлер. Техникалық дағдыларды жетілдіру және репертуарды кеңейту үшін.',
				video_url: '/videos/demo/advanced-techniques.mp4',
				thumbnail_url: '/images/demo/video3.jpg',
				duration: 2820, // 47 минут
				difficulty: 'beginner',
				views: 621,
				isCompleted: false,
				isLocked: false,
				order: 3,
				progress: 0,
				moduleId: 1,
			},
			{
				id: 4,
				title: 'Ырғақ пен темп',
				description:
					'Домбыра ойынындағы ырғақ пен темп. Бірқалыпты ойын мен тез ойынды жетілдіру.',
				video_url: '/videos/demo/rythm-tempo.mp4',
				thumbnail_url: '/images/demo/video1.jpg',
				duration: 1840, // 30 минут
				difficulty: 'beginner',
				views: 542,
				isCompleted: false,
				isLocked: false,
				order: 4,
				progress: 0,
				moduleId: 1,
			},
			{
				id: 5,
				title: 'Орташа деңгейге арналған техникалар',
				description:
					'Орташа деңгейге арналған домбыра ойыны. Қолды орналастыру және тез ойнау әдістері.',
				video_url: '/videos/demo/intermediate-techniques.mp4',
				thumbnail_url: '/images/demo/video2.jpg',
				duration: 2520, // 42 минуты
				difficulty: 'intermediate',
				views: 412,
				isCompleted: false,
				isLocked: false,
				order: 5,
				progress: 0,
				moduleId: 2,
			},
			{
				id: 6,
				title: 'Күрделі күйлердің қатпарлары',
				description:
					'Күрделі күйлерді орындаудың ерекшеліктері. Жоғары шеберлікке арналған.',
				video_url: '/videos/demo/complex-kuy.mp4',
				thumbnail_url: '/images/demo/video3.jpg',
				duration: 3120, // 52 минуты
				difficulty: 'advanced',
				views: 310,
				isCompleted: false,
				isLocked: false,
				order: 6,
				progress: 0,
				moduleId: 3,
			},
		]

		// Обрабатываем демо-данные так же, как и реальные
		const processedVideos = demoVideos.map(video => {
			// Убедимся, что прогресс - это число
			if (video.progress === undefined || video.progress === null) {
				video.progress = 0
			}

			// Округляем прогресс до целого числа
			video.progress = Math.round(video.progress)

			// Разблокируем все видео
			video.isLocked = false

			// Проверяем, просмотрен ли урок
			video.isCompleted = video.progress >= 80

			return video
		})

		setVideos(processedVideos)
		setLastUpdate(new Date())
	}

	// Отображение загрузки
	if (loading) {
		return (
			<div className='flex justify-center items-center min-h-screen bg-[#FBF7F4]'>
				<div className='animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#2A3F54]'></div>
			</div>
		)
	}

	// Отображение ошибки
	if (error) {
		return (
			<div className='container mx-auto px-4 py-8 bg-[#FBF7F4]'>
				<div className='max-w-4xl mx-auto'>
					<div className='bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg'>
						{error}
					</div>
				</div>
			</div>
		)
	}

	return (
		<div className='bg-[#FBF7F4]'>
			<div className='container mx-auto px-4 py-8'>
				<div className='max-w-6xl mx-auto'>
					{/* Заголовок */}
					<div className='mb-16 text-center'>
						<h1 className='text-[80px] font-bold text-[#2A3F54] mb-4'>
							Оқыту бағдарламасы
						</h1>
						<p className='text-[30px] text-[#2A3F54] max-w-4xl mx-auto'>
							Домбыра ойнауды үйренудің толық курсы. Әр деңгей бойынша
							жаттығулар, видео сабақтар және интерактивті тапсырмалар.
						</p>
					</div>

					{/* Информация об обновлении данных */}
					<div className='mb-12 flex items-center justify-end text-sm text-gray-500'>
						<div>Последнее обновление: {lastUpdate.toLocaleTimeString()}</div>
						<button
							onClick={() => fetchVideos(false)}
							className={`ml-4 px-3 py-1 rounded transition-colors flex items-center ${
								isRefreshing
									? 'bg-blue-100 text-blue-700'
									: 'bg-blue-50 text-blue-600 hover:bg-blue-100'
							}`}
							disabled={isRefreshing}
						>
							<svg
								className={`w-4 h-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`}
								fill='none'
								stroke='currentColor'
								viewBox='0 0 24 24'
							>
								<path
									strokeLinecap='round'
									strokeLinejoin='round'
									strokeWidth='2'
									d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'
								/>
							</svg>
							{isRefreshing ? 'Обновляется...' : 'Обновить данные'}
						</button>
					</div>

					{/* Последовательные видеоуроки */}
					<div className='space-y-6'>
						<h2 className='text-[30px] font-bold text-[#2A3F54] mb-4'>
							Видеоуроки
						</h2>

						{/* Сортируем видео по ID в порядке возрастания */}
						{videos
							.sort((a, b) => a.id - b.id)
							.map((lesson, index) => (
								<div
									key={lesson.id}
									className={`rounded-[15px] shadow-md overflow-hidden transition-all ${
										// Подсветка обновленного видео
										updatedVideoIds.includes(lesson.id)
											? 'ring-4 ring-blue-400 transform scale-[1.02]'
											: ''
									} ${
										// Стили в зависимости от статуса просмотра
										lesson.isCompleted
											? 'bg-green-50 border border-green-200' // Қаралды
											: lesson.progress === undefined || lesson.progress === 0
											? 'bg-white' // Не начато
											: lesson.progress < 25
											? 'bg-blue-50 border border-blue-100' // Только начато
											: lesson.progress < 50
											? 'bg-yellow-50 border border-yellow-100' // В процессе
											: lesson.progress < 80
											? 'bg-orange-50 border border-orange-100' // Почти закончено
											: 'bg-green-50 border border-green-200' // Завершено
									}`}
								>
									{/* Более заметный индикатор прогресса на карточке */}
									<div className='relative'>
										{/* Прогресс-бар вверху карточки */}
										<div className='h-1 w-full bg-gray-200'>
											<div
												className={`h-full transition-all duration-300 ${
													lesson.isCompleted ? 'bg-green-500' : 'bg-blue-600'
												}`}
												style={{ width: `${lesson.progress || 0}%` }}
											></div>
										</div>
									</div>

									<Link
										href={`/videos/${lesson.id}`}
										className={`block relative transition-all ${
											lesson.isLocked
												? 'opacity-70 cursor-not-allowed'
												: lesson.isCompleted
												? 'hover:bg-green-100'
												: lesson.progress !== undefined && lesson.progress >= 50
												? 'hover:bg-orange-100'
												: lesson.progress !== undefined && lesson.progress >= 25
												? 'hover:bg-yellow-100'
												: lesson.progress !== undefined && lesson.progress > 0
												? 'hover:bg-blue-100'
												: 'hover:bg-[#f8f4f0]'
										}`}
										onClick={e => {
											if (lesson.isLocked) {
												e.preventDefault()
											}
										}}
									>
										<div className='flex items-center p-4'>
											{/* Номер урока с цветом в зависимости от прогресса */}
											<div className='relative mr-4'>
												{/* Круговой индикатор прогресса */}
												{lesson.progress !== undefined &&
													lesson.progress > 0 && (
														<svg
															className='absolute -top-1 -left-1 w-14 h-14'
															viewBox='0 0 36 36'
														>
															<circle
																cx='18'
																cy='18'
																r='16'
																fill='none'
																className={`stroke-2 ${
																	lesson.isCompleted
																		? 'stroke-green-500' // Просмотрено
																		: lesson.progress < 25
																		? 'stroke-blue-500' // Только начато
																		: lesson.progress < 50
																		? 'stroke-yellow-500' // В процессе
																		: lesson.progress < 80
																		? 'stroke-orange-500' // Почти закончено
																		: 'stroke-green-500' // Завершено
																}`}
																strokeDasharray='100'
																strokeDashoffset={100 - lesson.progress}
																transform='rotate(-90 18 18)'
															/>
														</svg>
													)}
												<div
													className={`w-12 h-12 flex-shrink-0 text-white rounded-full flex items-center justify-center text-xl font-bold ${
														lesson.isCompleted
															? 'bg-green-500' // Просмотрено
															: lesson.progress === undefined ||
															  lesson.progress === 0
															? 'bg-[#2A3F54]' // Не начато
															: lesson.progress < 25
															? 'bg-blue-500' // Только начато
															: lesson.progress < 50
															? 'bg-yellow-500' // В процессе
															: lesson.progress < 80
															? 'bg-orange-500' // Почти закончено
															: 'bg-green-500' // Завершено
													}`}
												>
													{index + 1}
												</div>
											</div>

											{/* Информация об уроке */}
											<div className='flex-grow'>
												<h3 className='text-[22px] font-semibold text-[#2A3F54] flex items-center flex-wrap'>
													{lesson.title}
													{lesson.isCompleted && (
														<span className='ml-2 bg-green-100 text-green-800 font-bold px-2 py-1 rounded-md text-sm flex items-center'>
															<svg
																className='w-4 h-4 mr-1'
																fill='none'
																stroke='currentColor'
																viewBox='0 0 24 24'
															>
																<path
																	strokeLinecap='round'
																	strokeLinejoin='round'
																	strokeWidth='2'
																	d='M5 13l4 4L19 7'
																></path>
															</svg>
															Қаралды
														</span>
													)}
													{lesson.progress !== undefined &&
														lesson.progress > 0 &&
														!lesson.isCompleted && (
															<span
																className={`ml-2 text-sm font-semibold px-3 py-1 rounded-full shadow-sm ${
																	lesson.progress < 25
																		? 'bg-blue-100 text-blue-600' // Только начато
																		: lesson.progress < 50
																		? 'bg-yellow-100 text-yellow-600' // В процессе
																		: lesson.progress < 80
																		? 'bg-orange-100 text-orange-600' // Почти закончено
																		: 'bg-green-100 text-green-600' // Завершено
																}`}
															>
																{lesson.progress < 25
																	? 'Басталды'
																	: lesson.progress < 50
																	? 'Үрдісте'
																	: lesson.progress < 80
																	? 'Аяқталып жатыр'
																	: 'Қаралды'}{' '}
																{Math.round(lesson.progress)}%
															</span>
														)}
												</h3>

												{/* Удаляем описание из карточек */}
												{/* <p className='text-[#5A6C7F] line-clamp-2'>
													{lesson.description}
												</p> */}

												{/* Метаданные урока */}
												<div className='flex items-center mt-2 text-sm text-[#5A6C7F]'>
													<span className='flex items-center mr-4'>
														<svg
															className='w-4 h-4 mr-1'
															fill='none'
															stroke='currentColor'
															viewBox='0 0 24 24'
														>
															<path
																strokeLinecap='round'
																strokeLinejoin='round'
																strokeWidth='2'
																d='M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
															></path>
														</svg>
														{Math.floor(lesson.duration / 60)} мин
													</span>

													{/* Индикатор прогресса в метаданных */}
													{(lesson.progress || 0) > 0 && (
														<span className='flex items-center'>
															<svg
																className='w-4 h-4 mr-1'
																fill='none'
																stroke='currentColor'
																viewBox='0 0 24 24'
															>
																<path
																	strokeLinecap='round'
																	strokeLinejoin='round'
																	strokeWidth='2'
																	d='M19 9l-7 7-7-7'
																></path>
															</svg>
															<span
																className={`font-medium ${
																	lesson.isCompleted
																		? 'text-green-600'
																		: 'text-blue-600'
																}`}
															>
																{lesson.isCompleted
																	? 'Қаралды'
																	: `${lesson.progress || 0}% қаралды`}
															</span>
														</span>
													)}
												</div>
											</div>

											{/* Индикатор прогресса справа */}
											<div className='ml-4 flex items-center'>
												{/* Текстовый индикатор прогресса */}
												{lesson.progress !== undefined &&
													lesson.progress > 0 && (
														<div
															className={`text-center mr-3 bg-gray-50 rounded-lg p-2 border transition-all ${
																updatedVideoIds.includes(lesson.id)
																	? 'animate-pulse border-blue-400'
																	: ''
															}`}
														>
															<div
																className={`text-3xl font-bold ${
																	lesson.isCompleted
																		? 'text-green-600' // Просмотрено
																		: lesson.progress < 25
																		? 'text-blue-600' // Только начато
																		: lesson.progress < 50
																		? 'text-yellow-600' // В процессе
																		: lesson.progress < 80
																		? 'text-orange-600' // Почти закончено
																		: 'text-green-600' // Завершено
																}`}
															>
																{lesson.isCompleted
																	? '✓'
																	: Math.round(lesson.progress)}
																{!lesson.isCompleted && '%'}
															</div>
															<div className='text-xs text-gray-500'>
																{lesson.isCompleted ? 'қаралды' : 'қаралды'}
															</div>
														</div>
													)}

												{lesson.isLocked && (
													<div className='p-3 bg-gray-100 rounded-full'>
														<svg
															className='w-6 h-6 text-gray-400'
															fill='none'
															stroke='currentColor'
															viewBox='0 0 24 24'
															xmlns='http://www.w3.org/2000/svg'
														>
															<path
																strokeLinecap='round'
																strokeLinejoin='round'
																strokeWidth={2}
																d='M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z'
															></path>
														</svg>
													</div>
												)}

												{!lesson.isLocked && (
													<div
														className={`p-3 rounded-full ${
															lesson.isCompleted
																? 'bg-green-100'
																: 'bg-gray-100'
														}`}
													>
														{lesson.isCompleted ? (
															<svg
																className='w-6 h-6 text-green-600'
																fill='none'
																stroke='currentColor'
																viewBox='0 0 24 24'
																xmlns='http://www.w3.org/2000/svg'
															>
																<path
																	strokeLinecap='round'
																	strokeLinejoin='round'
																	strokeWidth={2}
																	d='M5 13l4 4L19 7'
																></path>
															</svg>
														) : (
															<svg
																className='w-6 h-6 text-gray-400'
																fill='none'
																stroke='currentColor'
																viewBox='0 0 24 24'
																xmlns='http://www.w3.org/2000/svg'
															>
																<path
																	strokeLinecap='round'
																	strokeLinejoin='round'
																	strokeWidth={2}
																	d='M9 5l7 7-7 7'
																></path>
															</svg>
														)}
													</div>
												)}
											</div>
										</div>
									</Link>

									{/* Прогресс-бар внизу карточки */}
									<div className='relative'>
										<div className='h-1 w-full bg-gray-200'>
											<div
												className={`h-full transition-all duration-300 ${
													lesson.isCompleted ? 'bg-green-500' : 'bg-blue-600'
												}`}
												style={{ width: `${lesson.progress || 0}%` }}
											></div>
										</div>
									</div>
								</div>
							))}
					</div>
				</div>
			</div>
		</div>
	)
}
