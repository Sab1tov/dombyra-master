'use client'

import api from '@/services/axiosInstance'
import { useAuthStore } from '@/store/authStore'
import Link from 'next/link'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

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

// Функция debounce для предотвращения частых обновлений
const debounce = (func: (showLoading?: boolean) => void, wait: number) => {
	let timeout: ReturnType<typeof setTimeout>
	return function executedFunction(...args: [boolean?]) {
		const later = () => {
			clearTimeout(timeout)
			func(...args)
		}
		clearTimeout(timeout)
		timeout = setTimeout(later, wait)
	}
}

interface VideoCardProps {
	lesson: VideoLessonType;
	index: number;
	updatedVideoIds: number[];
}

// Отдельный мемоизированный компонент для карточки видео
const VideoCard: React.FC<VideoCardProps> = React.memo(({ lesson, index, updatedVideoIds }) => {
	return (
		<div
			className={`rounded-[15px] shadow-md overflow-hidden transition-all ${
				updatedVideoIds.includes(lesson.id)
					? 'ring-4 ring-blue-400 transform scale-[1.02]'
					: ''
			} ${
				lesson.isCompleted
					? 'bg-green-50 border border-green-200'
					: lesson.progress === undefined || lesson.progress === 0
					? 'bg-white'
					: lesson.progress < 25
					? 'bg-blue-50 border border-blue-100'
					: lesson.progress < 50
					? 'bg-yellow-50 border border-yellow-100'
					: lesson.progress < 80
					? 'bg-orange-50 border border-orange-100'
					: 'bg-green-50 border border-green-200'
			}`}
		>
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
					<div className='relative mr-4'>
						{lesson.progress !== undefined && lesson.progress > 0 && (
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
											? 'stroke-green-500'
											: lesson.progress < 25
											? 'stroke-blue-500'
											: lesson.progress < 50
											? 'stroke-yellow-500'
											: lesson.progress < 80
											? 'stroke-orange-500'
											: 'stroke-green-500'
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
									? 'bg-green-500'
									: lesson.progress === undefined || lesson.progress === 0
									? 'bg-[#2A3F54]'
									: lesson.progress < 25
									? 'bg-blue-500'
									: lesson.progress < 50
									? 'bg-yellow-500'
									: lesson.progress < 80
									? 'bg-orange-500'
									: 'bg-green-500'
							}`}
						>
							{index + 1}
						</div>
					</div>

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
												? 'bg-blue-100 text-blue-600'
												: lesson.progress < 50
												? 'bg-yellow-100 text-yellow-600'
												: lesson.progress < 80
												? 'bg-orange-100 text-orange-600'
												: 'bg-green-100 text-green-600'
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
											lesson.isCompleted ? 'text-green-600' : 'text-blue-600'
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

					<div className='ml-4 flex items-center'>
						{lesson.progress !== undefined && lesson.progress > 0 && (
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
											? 'text-green-600'
											: lesson.progress < 25
											? 'text-blue-600'
											: lesson.progress < 50
											? 'text-yellow-600'
											: lesson.progress < 80
											? 'text-orange-600'
											: 'text-green-600'
									}`}
								>
									{lesson.isCompleted ? '✓' : Math.round(lesson.progress)}
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
									lesson.isCompleted ? 'bg-green-100' : 'bg-gray-100'
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
	)
})

// Установим displayName для компонента (полезно для инструментов разработчика)
VideoCard.displayName = 'VideoCard'

export default function VideosPage() {
	const { user } = useAuthStore()
	const [videos, setVideos] = useState<VideoLessonType[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
	const [updatedVideoIds, setUpdatedVideoIds] = useState<number[]>([])
	const isRefreshingRef = useRef(false)
	// Добавляем кэширование запросов
	const [lastFetchTime, setLastFetchTime] = useState(0)
	const fetchInProgressRef = useRef(false)

	// Создаем мемоизированную версию loadDemoData
	const loadDemoData = useCallback(() => {
		const demoVideos: VideoLessonType[] = [
			{
				id: 1,
				title: 'Домбыраны дұрыс ұстау',
				description:
					'Домбыраны қалай дұрыс ұстау керек. Отырыс, қол қалпы және негізгі ойын әдістері.',
				video_url: '/videos/demo/dombyra-basics.mp4',
				thumbnail_url: '/images/demo/video1.jpg',
				duration: 1320,
				difficulty: 'beginner',
				views: 1245,
				isCompleted: true,
				isLocked: false,
				order: 1,
				progress: 100,
				moduleId: 1,
			},
			// Другие демо-видео...
		]

		const processedVideos = demoVideos.map(video => {
			if (video.progress === undefined || video.progress === null) {
				video.progress = 0
			}

			video.progress = Math.round(video.progress)
			video.isLocked = false
			video.isCompleted = video.progress >= 80

			return video
		})

		setVideos(processedVideos)
		setLastUpdate(new Date())
	}, [])

	const fetchVideos = useCallback(
		async (showLoading = true) => {
			// Проверяем, не выполняется ли уже запрос
			if (fetchInProgressRef.current) {
				console.log('Запрос уже выполняется, пропускаем')
				return
			}

			// Проверяем, не прошло ли слишком мало времени с момента последнего запроса
			if (Date.now() - lastFetchTime < 2000) {
				console.log('Пропускаем запрос - слишком частое обновление')
				return
			}

			try {
				fetchInProgressRef.current = true

				if (showLoading) {
					setLoading(true)
				} else {
					isRefreshingRef.current = true
				}

				setError(null)
				const response = await api.get('/video-lessons')
				console.log(
					'📥 Данные с сервера обновлены:',
					new Date().toLocaleTimeString()
				)

				// Обновляем время последнего запроса
				setLastFetchTime(Date.now())

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

				const processedVideos = response.data.map((video: VideoLessonType) => {
					const processedVideo = { ...video }

					if (
						processedVideo.progress === undefined ||
						processedVideo.progress === null
					) {
						processedVideo.progress = 0
					}

					try {
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

								api
									.put(`/video-lessons/${processedVideo.id}/progress`, {
										progress: localProgress,
									})
									.catch(e =>
										console.warn('Ошибка при обновлении прогресса:', e)
									)
							}
						}
					} catch (e) {
						console.warn('Ошибка при проверке локального прогресса:', e)
					}

					processedVideo.progress = Math.round(processedVideo.progress)
					processedVideo.isCompleted = processedVideo.progress >= 80
					processedVideo.isLocked = false

					return processedVideo
				})

				console.log('✅ Обработано видео:', processedVideos.length)

				setVideos(processedVideos)
				setLastUpdate(new Date())

				if (updatedIds.length > 0) {
					setUpdatedVideoIds(updatedIds)
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
				loadDemoData()
			} finally {
				if (showLoading) {
					setLoading(false)
				} else {
					isRefreshingRef.current = false
				}
				fetchInProgressRef.current = false
			}
		},
		[videos, user, lastFetchTime, loadDemoData]
	)

	// Создаем дебаунсированную версию функции fetchVideos
	const debouncedFetchVideos = useCallback(
		debounce((showLoading?: boolean) => {
			fetchVideos(showLoading)
		}, 300),
		[fetchVideos]
	)

	useEffect(() => {
		// Используем обычную функцию для начальной загрузки
		fetchVideos()

		// Используем дебаунсированную функцию для регулярного обновления
		const refreshInterval = setInterval(() => {
			debouncedFetchVideos(false)
		}, 5 * 60 * 1000)

		const handleVisibilityChange = () => {
			if (document.visibilityState === 'visible') {
				debouncedFetchVideos(false)
			}
		}

		document.addEventListener('visibilitychange', handleVisibilityChange)

		return () => {
			clearInterval(refreshInterval)
			document.removeEventListener('visibilitychange', handleVisibilityChange)
		}
	}, [fetchVideos, debouncedFetchVideos])

	// Мемоизируем отсортированные видео для предотвращения лишних перерисовок
	const sortedVideos = useMemo(() => {
		return [...videos].sort((a, b) => a.id - b.id)
	}, [videos])

	if (loading) {
		return (
			<div className='flex justify-center items-center min-h-screen bg-[#FBF7F4]'>
				<div className='animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#2A3F54]'></div>
			</div>
		)
	}

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
					<div className='mb-16 text-center'>
						<h1 className='text-[80px] font-bold text-[#2A3F54] mb-4'>
							Оқыту бағдарламасы
						</h1>
						<p className='text-[30px] text-[#2A3F54] max-w-4xl mx-auto'>
							Домбыра ойнауды үйренудің толық курсы. Әр деңгей бойынша
							жаттығулар, видео сабақтар және интерактивті тапсырмалар.
						</p>
					</div>

					<div className='mb-12 flex items-center justify-end text-sm text-gray-500'>
						<div>Последнее обновление: {lastUpdate.toLocaleTimeString()}</div>
						<button
							onClick={() => debouncedFetchVideos(false)}
							className={`ml-4 px-3 py-1 rounded transition-colors flex items-center ${
								isRefreshingRef.current
									? 'bg-blue-100 text-blue-700'
									: 'bg-blue-50 text-blue-600 hover:bg-blue-100'
							}`}
							disabled={isRefreshingRef.current}
						>
							<svg
								className={`w-4 h-4 mr-1 ${
									isRefreshingRef.current ? 'animate-spin' : ''
								}`}
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
							{isRefreshingRef.current ? 'Обновляется...' : 'Обновить данные'}
						</button>
											</div>

					<div className='space-y-6'>
						<h2 className='text-[30px] font-bold text-[#2A3F54] mb-4'>
							Видеоуроки
						</h2>

						{/* Используем мемоизированный массив и мемоизированный компонент */}
						{sortedVideos.map((lesson, index) => (
							<VideoCard
								key={lesson.id}
								lesson={lesson}
								index={index}
								updatedVideoIds={updatedVideoIds}
							/>
						))}
					</div>
				</div>
			</div>
		</div>
	)
}
