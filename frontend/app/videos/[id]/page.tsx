'use client'

import api from '@/services/axiosInstance'
import { useAuthStore } from '@/store/authStore'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'react-hot-toast'

interface VideoDetailType {
	id: number
	title: string
	description: string
	thumbnail: string
	videoUrl: string
	duration: number
	difficulty: 'beginner' | 'intermediate' | 'advanced'
	createdAt: string
	likes: number
	views?: number
	authorName?: string
	authorId?: number
	isCompleted?: boolean
	isFavorite?: boolean
}

interface NextVideoType {
	id: number
	title: string
	isLocked?: boolean
}

export default function VideoDetailPage() {
	const router = useRouter()
	const { id } = useParams()
	const { user } = useAuthStore()
	const videoRef = useRef<HTMLVideoElement>(null)
	const progressBarRef = useRef<HTMLDivElement>(null)
	const [video, setVideo] = useState<VideoDetailType | null>(null)
	const [loading, setLoading] = useState(true)
	const [progressLoading, setProgressLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [progress, setProgress] = useState(0)
	const [debug, setDebug] = useState({
		duration: 0,
		currentTime: 0,
		progress: 0,
		loaded: false,
	})
	const [nextVideo, setNextVideo] = useState<NextVideoType | null>(null)
	const [showNextModal, setShowNextModal] = useState(false)
	const [countdown, setCountdown] = useState(5)
	const countdownRef = useRef<NodeJS.Timeout | null>(null)
	const [isCompleted, setIsCompleted] = useState(false)
	const [displayTime, setDisplayTime] = useState('0:00 / 0:00')
	const lastSavedProgressRef = useRef(0)
	const lastUpdateTimeRef = useRef(0)
	const animationFrameId = useRef<number | null>(null)
	const maxProgressRef = useRef(0)
	const [authError, setAuthError] = useState(false)

	const formatTime = useCallback((seconds: number): string => {
		if (isNaN(seconds)) return '0:00'
		const minutes = Math.floor(seconds / 60)
		const secs = Math.floor(seconds % 60)
		return `${minutes}:${secs < 10 ? '0' : ''}${secs}`
	}, [])

	const checkNextLesson = useCallback(async () => {
		try {
			console.log('Проверяем доступность следующего урока')
			const response = await api.get(`/video-lessons/${id}/next`)
			console.log('Данные о следующем уроке:', response.data)

			const isNextLocked = response.data?.isLocked || response.data?.locked

			if (response.data && !isNextLocked) {
				setNextVideo({
					...response.data,
					isLocked: false,
				})
				toast.success('Следующий урок разблокирован!')
				return true
			} else if (response.data) {
				console.log('Следующий урок заблокирован, пробуем разблокировать')
				try {
					await api.put(`/video-lessons/${id}/progress`, { progress: 100 })

					const retryResponse = await api.get(`/video-lessons/${id}/next`)

					if (!retryResponse.data?.isLocked && !retryResponse.data?.locked) {
						setNextVideo({
							...retryResponse.data,
							isLocked: false,
						})
						toast.success('Следующий урок успешно разблокирован!')
						return true
					} else {
						console.warn(
							'Не удалось разблокировать следующий урок даже с прогрессом 100%',
							retryResponse.data
						)
						return false
					}
				} catch (unlockError) {
					console.error(
						'Ошибка при попытке разблокировать следующий урок:',
						unlockError
					)
					return false
				}
			}
			return false
		} catch (error) {
			console.error('Ошибка при проверке следующего урока:', error)
			return false
		}
	}, [id, setNextVideo])

	const startNextVideoCountdown = useCallback(() => {
		setCountdown(5)
		setShowNextModal(true)

		if (countdownRef.current) {
			clearInterval(countdownRef.current)
		}

		countdownRef.current = setInterval(() => {
			setCountdown(prev => {
				if (prev <= 1) {
					if (countdownRef.current) {
						clearInterval(countdownRef.current)
					}
					return 0
				}
				return prev - 1
			})
		}, 1000)
	}, [setCountdown, setShowNextModal])

	const saveProg = useCallback(
		async (force100 = false) => {
			let progressToSave = maxProgressRef.current
			if (!force100 && progressToSave >= 100) {
				progressToSave = 99
			}
			const significantChange =
				progressToSave - lastSavedProgressRef.current > 1
			const importantMilestone = [25, 50, 75, 80, 99, 100].some(
				milestone =>
					progressToSave >= milestone &&
					lastSavedProgressRef.current < milestone
			)
			const timePassedSinceLastSave =
				Date.now() - lastUpdateTimeRef.current > 5000
			const shouldSave =
				(significantChange && timePassedSinceLastSave) || importantMilestone
			const firstSave = lastSavedProgressRef.current === 0 && progressToSave > 0
			if (!shouldSave && !firstSave) {
				console.log(
					`Пропуск сохранения прогресса: ${progressToSave}%, ` +
						`последний: ${lastSavedProgressRef.current}%, ` +
						`значительное изменение: ${significantChange}, ` +
						`важная отметка: ${importantMilestone}, ` +
						`прошло времени: ${Date.now() - lastUpdateTimeRef.current}мс`
				)
				return false
			}
			try {
				console.log(
					`СОХРАНЕНИЕ ПРОГРЕССА: ${progressToSave}% для видео ${id} (предыдущий: ${lastSavedProgressRef.current}%)`
				)
				const token = localStorage.getItem('jwtToken')
				if (!token) {
					console.error('Ошибка авторизации: токен отсутствует!')
					toast.error('Для сохранения прогресса необходимо авторизоваться')
					return false
				}
				try {
					const currentProgressResponse = await authenticatedFetch(
						`/api/video-lessons/${id}/progress`,
						{ method: 'GET' }
					)
					if (currentProgressResponse.ok && currentProgressResponse.data) {
						const serverProgress = currentProgressResponse.data.progress || 0
						if (serverProgress > maxProgressRef.current) {
							maxProgressRef.current = serverProgress
							console.log(
								`Обновлен max прогресс из сервера: ${maxProgressRef.current}%`
							)
						}
					}
				} catch (progressError) {
					console.error(
						'Ошибка при получении текущего прогресса:',
						progressError
					)
				}
				const result = await authenticatedFetch(
					`/api/video-lessons/${id}/progress`,
					{
						method: 'PUT',
						body: JSON.stringify({
							progress: progressToSave,
						}),
					}
				)
				if (result.ok) {
					console.log('✅ Прогресс успешно сохранен:', result.data)
					lastSavedProgressRef.current = progressToSave
					lastUpdateTimeRef.current = Date.now()
					setProgress(progressToSave)
					setIsCompleted(progressToSave >= 80)
					setDebug(prev => ({
						...prev,
						progressSaved: progressToSave,
						maxProgress: progressToSave,
					}))
					if (importantMilestone || firstSave) {
						toast.success(`Прогресс сохранен: ${progressToSave}%`, {
							id: 'progress-saved',
							duration: 2000,
						})
					}
					return true
				} else {
					console.error(
						'❌ Ошибка сохранения прогресса:',
						result.error || result.data
					)
					if (result.status === 401) {
						console.error('Ошибка авторизации при сохранении прогресса')
					}
					return false
				}
			} catch (error) {
				console.error('Ошибка при сохранении прогресса:', error)
				return false
			}
		},
		[id, user, setProgress, setIsCompleted, setDebug]
	)

	const handleEnded = useCallback(() => {
		saveProg(true)

		checkNextLesson().then(unlocked => {
			console.log(
				`Статус разблокировки следующего урока: ${
					unlocked ? 'Разблокирован' : 'Заблокирован'
				}`
			)

			if (nextVideo) {
				if (!nextVideo.isLocked) {
					startNextVideoCountdown()
				} else {
					console.log('Следующий урок заблокирован. Автопереход отключен.')
				}
			} else {
				console.log('Нет информации о следующем уроке.')
			}
		})
	}, [saveProg, checkNextLesson, nextVideo, startNextVideoCountdown])

	useEffect(() => {
		if (
			countdown === 0 &&
			showNextModal &&
			nextVideo &&
			nextVideo.id &&
			!nextVideo.isLocked
		) {
			router.push(`/videos/${nextVideo.id}`)
		}
	}, [countdown, showNextModal, nextVideo, router])

	const cancelAutoplay = () => {
		if (countdownRef.current) {
			clearInterval(countdownRef.current)
		}
		setShowNextModal(false)
	}

	const goToNextVideo = () => {
		if (nextVideo && nextVideo.id && !nextVideo.isLocked) {
			router.push(`/videos/${nextVideo.id}`)
		} else if (nextVideo && nextVideo.isLocked) {
			toast.error(
				'Этот урок пока недоступен. Полностью просмотрите текущий урок.'
			)
		}
	}

	const handleLoadedMetadata = () => {
		const video = videoRef.current
		if (!video) return

		console.log('Видео метаданные загружены:', {
			duration: video.duration,
			videoWidth: video.videoWidth,
			videoHeight: video.videoHeight,
		})

		setProgress(0)
		setDisplayTime(`0:00 / ${formatTime(video.duration)}`)
	}

	const updateProgressBarDirect = (percent: number) => {
		if (progressBarRef.current) {
			progressBarRef.current.style.width = `${percent}%`
			if (percent >= 80) {
				progressBarRef.current.style.backgroundColor = '#10B981'
			} else {
				progressBarRef.current.style.backgroundColor = '#4F46E5'
			}
		}
	}

	const updateVideoProgress = () => {
		const video = videoRef.current
		if (!video || isNaN(video.duration) || video.duration === 0) return

		const currentTime = video.currentTime
		const duration = video.duration
		const percent = (currentTime / duration) * 100
		const roundedPercent = Math.floor(percent)

		maxProgressRef.current = Math.max(maxProgressRef.current, roundedPercent)

		updateProgressBarDirect(maxProgressRef.current)

		const now = Date.now()
		if (now - lastUpdateTimeRef.current > 250) {
			lastUpdateTimeRef.current = now

			setProgress(maxProgressRef.current)

			setDebug({
				duration: duration,
				currentTime: currentTime,
				progress: maxProgressRef.current,
				loaded: true,
			})

			if (maxProgressRef.current >= 80 && !isCompleted) {
				setIsCompleted(true)
			}
		}

		const timeElement = document.getElementById('video-time-display')
		if (timeElement) {
			timeElement.textContent = `${formatTime(currentTime)} / ${formatTime(
				duration
			)}`
		}

		animationFrameId.current = requestAnimationFrame(updateVideoProgress)
	}

	const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
		try {
			const token =
				typeof window !== 'undefined' ? localStorage.getItem('jwtToken') : null

			if (!token) {
				console.error('Отсутствует токен авторизации')
				setAuthError(true)
				return {
					error: 'Требуется авторизация. Токен не найден.',
					status: 401,
				}
			}

			const headers = {
				'Content-Type': 'application/json',
				...(token && { Authorization: `Bearer ${token}` }),
				...options.headers,
			}

			const response = await fetch(url, {
				...options,
				headers,
				credentials: 'include',
			})

			console.log(`Fetch response: ${response.status} ${response.statusText}`)

			if (response.status === 401) {
				console.error('Ошибка авторизации. Необходима авторизация.')

				if (typeof window !== 'undefined') {
					localStorage.removeItem('jwtToken')
				}

				setAuthError(true)
				return { error: 'Требуется авторизация', status: 401, response }
			}

			const contentType = response.headers.get('content-type')
			let data

			if (contentType && contentType.includes('application/json')) {
				try {
					data = await response.json()
				} catch (e) {
					console.error('Ошибка при парсинге JSON:', e)
					data = { error: 'Ошибка парсинга ответа' }
				}
			} else {
				try {
					const text = await response.text()
					console.log('Non-JSON response:', text)
					data = { message: text }
				} catch (e) {
					console.error('Ошибка при чтении текста ответа:', e)
					data = { error: 'Ошибка чтения ответа' }
				}
			}

			return {
				data,
				status: response.status,
				ok: response.ok,
				response,
			}
		} catch (error) {
			console.error('Network error during fetch:', error)
			return {
				error: 'Ошибка сети при выполнении запроса',
				networkError: error,
			}
		}
	}

	const fetchVideoData = async () => {
		try {
			setLoading(true)
			console.log(`Загрузка данных видеоурока ID: ${id}`)

			const result = await authenticatedFetch(`/api/video-lessons/${id}`, {
				method: 'GET',
			})

			if (result.ok && result.data) {
				console.log('Данные видео получены:', result.data)

				const videoData = result.data

				console.log('Данные о прогрессе:', {
					progress: videoData.progress,
					isCompleted: videoData.isCompleted,
				})

				if (videoData.progress === undefined || videoData.progress === null) {
					console.warn('Прогресс отсутствует в ответе API!')
				}

				setVideo(videoData)

				const initialProgress =
					typeof videoData.progress === 'number' ? videoData.progress : 0
				console.log(`Установка начального прогресса: ${initialProgress}%`)

				maxProgressRef.current = initialProgress

				setProgress(initialProgress)
				setIsCompleted(initialProgress >= 80)

				if (videoRef.current && videoData.duration && initialProgress > 0) {
					const seekPosition = (initialProgress / 100) * videoData.duration
					console.log(`Установка позиции воспроизведения: ${seekPosition}с`)
					videoRef.current.currentTime = seekPosition
				}

				setDebug(prev => ({
					...prev,
					progress: initialProgress,
					maxProgress: initialProgress,
					loaded: true,
				}))

				const nextResult = await authenticatedFetch(
					`/api/video-lessons/${id}/next`,
					{
						method: 'GET',
					}
				)

				if (nextResult.ok && nextResult.data) {
					console.log('Данные о следующем видео:', nextResult.data)
					setNextVideo(nextResult.data)
				} else {
					console.warn(
						'Не удалось загрузить данные о следующем видео:',
						nextResult.error || 'Неизвестная ошибка'
					)
				}

				const viewResult = await authenticatedFetch(
					`/api/video-lessons/${id}/view`,
					{
						method: 'PUT',
					}
				)
				console.log(
					'Отметка о просмотре:',
					viewResult.ok ? 'успешно' : 'ошибка'
				)

				setError(null)

				return videoData
			} else {
				console.error('Ошибка загрузки видео:', result.error || result.data)
				setError('Не удалось загрузить видео. Пожалуйста, попробуйте позже.')

				if (result.status === 401) {
					console.error(
						'Ошибка авторизации. Токен:',
						localStorage.getItem('jwtToken')
					)
					setError('Требуется авторизация. Пожалуйста, войдите в систему.')
					setAuthError(true)
				}

				return null
			}
		} catch (error) {
			console.error('Ошибка загрузки данных видео:', error)
			setError('Ошибка при загрузке видео. Пожалуйста, попробуйте позже.')
			return null
		} finally {
			setLoading(false)
		}
	}

	const loadProgress = async () => {
		setProgressLoading(true)
		console.log('🔄 Загрузка прогресса для видео:', id)

		let serverProgress = 0
		try {
			const progressResponse = await authenticatedFetch(
				`/api/video-lessons/${id}/progress`,
				{ method: 'GET' }
			)
			if (progressResponse.ok && progressResponse.data) {
				serverProgress = progressResponse.data.progress || 0
				console.log(`🌐 Загружен прогресс с сервера: ${serverProgress}%`)
				setProgress(serverProgress)
				maxProgressRef.current = serverProgress
				lastSavedProgressRef.current = serverProgress
				if (progressBarRef.current) {
					progressBarRef.current.style.width = `${serverProgress}%`
					if (serverProgress >= 80) {
						progressBarRef.current.style.backgroundColor = '#10B981'
					} else {
						progressBarRef.current.style.backgroundColor = '#4F46E5'
					}
				}
				setIsCompleted(serverProgress >= 80)
			} else {
				console.warn(
					'Не удалось загрузить прогресс с сервера:',
					progressResponse.error
				)
			}
		} catch (error) {
			console.error('Ошибка при загрузке прогресса:', error)
		} finally {
			setProgressLoading(false)
		}
		return maxProgressRef.current
	}

	const initializeVideo = async () => {
		try {
			// 1. Загружаем прогресс из localStorage и сервера
			const progressFromLoad = await loadProgress()
			console.log(`📊 Прогресс после loadProgress: ${progressFromLoad}%`)

			// 2. Загружаем данные видео (и прогресс из объекта видео)
			const videoData = await fetchVideoData()
			const progressFromVideo =
				videoData && typeof videoData.progress === 'number'
					? videoData.progress
					: 0
			console.log(`📊 Прогресс из videoData: ${progressFromVideo}%`)

			// 3. Используем максимальный прогресс
			const maxProgress = Math.max(progressFromLoad, progressFromVideo)
			console.log(`✅ Итоговый прогресс для применения: ${maxProgress}%`)

			setProgress(maxProgress)
			maxProgressRef.current = maxProgress
			lastSavedProgressRef.current = maxProgress
			setIsCompleted(maxProgress >= 80)

			if (
				videoRef.current &&
				videoData &&
				videoData.duration &&
				maxProgress > 0
			) {
				const seekPosition = (maxProgress / 100) * videoData.duration
				videoRef.current.currentTime = seekPosition
			}

			await checkNextLesson()
		} catch (error) {
			console.error('Ошибка инициализации видео:', error)
			setError('Не удалось загрузить видеоурок. Пожалуйста, попробуйте позже.')
		} finally {
			setLoading(false)
		}
	}

	useEffect(() => {
		if (id) {
			initializeVideo()
		}

		const handleVisibilityChange = () => {
			if (document.visibilityState === 'visible') {
				console.log('👁️ Страница стала видимой, обновляем прогресс')
				loadProgress()
			}
		}

		document.addEventListener('visibilitychange', handleVisibilityChange)

		return () => {
			document.removeEventListener('visibilitychange', handleVisibilityChange)
			if (countdownRef.current) {
				clearInterval(countdownRef.current)
			}
		}
	}, [id])

	useEffect(() => {
		const video = videoRef.current
		if (!video) return

		let saveInterval: NodeJS.Timeout

		const startProgressAnimation = () => {
			if (animationFrameId.current) {
				cancelAnimationFrame(animationFrameId.current)
			}
			animationFrameId.current = requestAnimationFrame(updateVideoProgress)
		}

		const stopProgressAnimation = () => {
			if (animationFrameId.current) {
				cancelAnimationFrame(animationFrameId.current)
				animationFrameId.current = null
			}
		}

		const handleTimeUpdate = () => {
			if (!video || isNaN(video.duration) || video.duration === 0) return

			const currentTime = video.currentTime
			const duration = video.duration
			const currentProgress = Math.floor((currentTime / duration) * 100)

			setProgress(currentProgress)
		}

		const saveProgress = () => {
			if (!video || isNaN(video.duration) || video.duration === 0) return

			const currentTime = video.currentTime
			const duration = video.duration
			const currentProgress = Math.floor((currentTime / duration) * 100)

			if (currentProgress > maxProgressRef.current) {
				maxProgressRef.current = currentProgress
				console.log(`⬆️ Новый макс. прогресс: ${maxProgressRef.current}%`)
			}

			if (lastSavedProgressRef.current > maxProgressRef.current) {
				maxProgressRef.current = lastSavedProgressRef.current
				console.log(
					`⚠️ Использован сохраненный прогресс: ${maxProgressRef.current}%`
				)
			}

			saveProg()
		}

		const startSaveInterval = () => {
			saveProgress()

			saveInterval = setInterval(saveProgress, 30000)
		}

		const stopSaveInterval = () => {
			clearInterval(saveInterval)
		}

		const onEnded = () => {
			stopSaveInterval()
			stopProgressAnimation()
			saveProg(true)
			handleEnded()
		}

		const onLoadedMetadata = () => {
			handleLoadedMetadata()
			updateVideoProgress()
		}

		const onPlay = () => {
			startSaveInterval()
			startProgressAnimation()
		}

		const onPause = () => {
			stopSaveInterval()
			stopProgressAnimation()
			saveProgress()
		}

		video.addEventListener('timeupdate', handleTimeUpdate)
		video.addEventListener('ended', onEnded)
		video.addEventListener('loadedmetadata', onLoadedMetadata)
		video.addEventListener('play', onPlay)
		video.addEventListener('pause', onPause)

		if (video.readyState >= 2) {
			onLoadedMetadata()
		}

		return () => {
			stopSaveInterval()
			stopProgressAnimation()

			video.removeEventListener('timeupdate', handleTimeUpdate)
			video.removeEventListener('ended', onEnded)
			video.removeEventListener('loadedmetadata', onLoadedMetadata)
			video.removeEventListener('play', onPlay)
			video.removeEventListener('pause', onPause)

			if (video.currentTime > 0 && video.duration > 0) {
				saveProg()
			}
		}
	}, [
		id,
		videoRef,
		isCompleted,
		formatTime,
		saveProg,
		handleEnded,
		handleLoadedMetadata,
		updateVideoProgress,
	])

	useEffect(() => {
		if (authError) {
			toast.error('Для просмотра видеоурока необходимо авторизоваться', {
				duration: 5000,
				position: 'top-center',
			})

			const redirectToLogin = () => {
				console.log(
					'Перенаправление на страницу входа из-за ошибки авторизации'
				)

				if (typeof window !== 'undefined') {
					sessionStorage.setItem('redirectAfterLogin', `/videos/${id}`)
				}

				router.push('/auth/login')
			}

			const timer = setTimeout(redirectToLogin, 3000)

			return () => clearTimeout(timer)
		}
	}, [authError, router, id])

	useEffect(() => {
		const forceSaveInterval = setInterval(() => {
			if (maxProgressRef.current > 0) {
				console.log(
					`⏰ Запланированное сохранение прогресса: ${maxProgressRef.current}%`
				)
				saveProg()
			}
		}, 10000)
		const handleBeforeUnload = () => {
			if (maxProgressRef.current > 0) {
				saveProg()
			}
		}
		window.addEventListener('beforeunload', handleBeforeUnload)
		return () => {
			clearInterval(forceSaveInterval)
			window.removeEventListener('beforeunload', handleBeforeUnload)
			if (maxProgressRef.current > 0) {
				saveProg()
			}
		}
	}, [id])

	if (loading) {
		return (
			<div className='container mx-auto px-4 py-8'>
				<div className='flex flex-col justify-center items-center min-h-[50vh]'>
					<div className='w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4'></div>
					<div className='text-lg font-medium text-gray-700'>
						Бейнесабақты жүктеп отырмыз...
					</div>
					<p className='text-gray-500 mt-2 text-center'>
						Сабыр танытыңыз. Бейнесабағыңызды жүктеп отырмыз...
					</p>
				</div>
			</div>
		)
	}

	if (error) {
		return (
			<div className='container mx-auto px-4 py-8'>
				<div className='bg-red-100 p-4 rounded-lg'>
					<h2 className='text-red-800 font-bold text-lg'>Ошибка</h2>
					<p>{error}</p>
					<button
						onClick={() => router.push('/videos')}
						className='mt-4 bg-indigo-600 text-white px-4 py-2 rounded-lg'
					>
						Бейнесабақтар тізіміне қайту
					</button>
				</div>
			</div>
		)
	}

	if (!video) {
		return (
			<div className='container mx-auto px-4 py-8 text-center'>
				<p>Бейнесабақ табылмады</p>
				<button
					onClick={() => router.back()}
					className='mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700'
				>
					Вернуться назад
				</button>
			</div>
		)
	}

	if (authError) {
		return (
			<div className='container mx-auto px-4 py-8'>
				<div className='bg-orange-100 p-6 rounded-lg text-center'>
					<h2 className='text-orange-800 font-bold text-xl mb-3'>
						Тіркелу қажет
					</h2>
					<p className='mb-4'>Бейнесабақтарды қарау үшін тіркелу қажет.</p>
					<p className='mb-6 text-gray-600'>
						Бірнеше секундтан кейін кіру парақшасына ауысасыз...
					</p>
					<button
						onClick={() => router.push('/auth/login')}
						className='bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 transition-colors'
					>
						Қазір кіру
					</button>
				</div>
			</div>
		)
	}

	return (
		<div className='min-h-screen bg-[#FBF7F4]'>
			<div className='container mx-auto px-4 py-8'>
				{/* Кнопка возврата - только стрелка */}
				<div className='mb-4'>
					<Link
						href='/videos'
						className='inline-flex items-center justify-center w-10 h-10 text-[#2A3F54] bg-white hover:bg-gray-100 rounded-full shadow-sm transition-all'
						aria-label='Вернуться к списку уроков'
					>
						<svg
							width='24'
							height='24'
							viewBox='0 0 24 24'
							fill='none'
							xmlns='http://www.w3.org/2000/svg'
						>
							<path
								d='M15 19L8 12L15 5'
								stroke='currentColor'
								strokeWidth='2'
								strokeLinecap='round'
								strokeLinejoin='round'
							/>
						</svg>
					</Link>
				</div>

				<div className='bg-black rounded-lg overflow-hidden mb-8 relative'>
					{video.isCompleted && (
						<div className='absolute top-4 left-4 z-10 bg-green-500 text-white px-3 py-1 rounded-full text-sm'>
							Қаралды
						</div>
					)}

					<div className='aspect-video relative'>
						<video
							ref={videoRef}
							src={video.videoUrl}
							poster={video.thumbnail}
							className='w-full h-full'
							playsInline
							preload='auto'
							controls
						/>

						{showNextModal && nextVideo && !nextVideo.isLocked && (
							<div className='absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 p-4 text-white'>
								<div className='flex justify-between items-center'>
									<div>
										<p className='text-lg font-medium mb-1'>Келесі сабақ:</p>
										<p>{nextVideo.title}</p>
										<p className='text-sm text-gray-300'>
											Автоматтық ауысуға {countdown} секунд қалды.
										</p>
									</div>
									<div className='flex space-x-2'>
										<button
											onClick={cancelAutoplay}
											className='px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded'
										>
											Бас тарту
										</button>
										<button
											onClick={goToNextVideo}
											className='px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded'
										>
											Қазір ауысу
										</button>
									</div>
								</div>
							</div>
						)}
					</div>
				</div>

				<div className='bg-white rounded-lg shadow-md p-6 mb-8'>
					<div className='sm:flex sm:items-start sm:justify-between mb-6'>
						<div>
							<h1 className='text-3xl font-bold mb-2 text-gray-900'>
								{video.title}
							</h1>

							<div className='flex items-center space-x-4 text-sm text-gray-600'>
								<div>{displayTime}</div>
								<div>
									{new Date(video.createdAt).toLocaleDateString('ru-RU')}
								</div>
							</div>
						</div>
					</div>

					<div className='mb-6'>
						<div className='flex justify-between items-center mb-2'>
							<div className='text-sm text-gray-600'>
								{progressLoading ? (
									<span className='inline-flex items-center'>
										<svg
											className='animate-spin -ml-1 mr-2 h-4 w-4 text-indigo-600'
											xmlns='http://www.w3.org/2000/svg'
											fill='none'
											viewBox='0 0 24 24'
										>
											<circle
												className='opacity-25'
												cx='12'
												cy='12'
												r='10'
												stroke='currentColor'
												strokeWidth='4'
											/>
											<path
												className='opacity-75'
												fill='currentColor'
												d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
											/>
										</svg>
										Прогресті жүктеу...
									</span>
								) : (
									<>Көру барысы: {Math.round(debug.progress)}%</>
								)}
							</div>
							{isCompleted && (
								<div className='text-sm text-green-600 transition-opacity duration-300'>
									✓ Сабақ көрілді
								</div>
							)}
						</div>
						<div className='w-full bg-gray-200 rounded-full h-2.5 overflow-hidden'>
							<div
								ref={progressBarRef}
								className={`h-full ${
									progress >= 80 ? 'bg-green-500' : 'bg-indigo-600'
								} rounded-l-full transition-all duration-300`}
								style={{ width: `${progress}%` }}
							></div>
						</div>
						<div
							id='video-time-display'
							className='text-sm text-gray-500 mt-1 text-right'
						>
							{displayTime}
						</div>
					</div>

					{video.authorName && (
						<div className='mb-6 flex items-center'>
							<div className='flex-shrink-0 w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 mr-3'>
								{video.authorName.charAt(0).toUpperCase()}
							</div>
							<div>
								<div className='font-medium text-gray-900'>
									{video.authorName}
								</div>
								<div className='text-sm text-gray-500'>Оқытушы</div>
							</div>
						</div>
					)}

					<div className='mb-4'>
						<h3 className='text-lg font-semibold mb-2 text-gray-700'>
							Сипаттама:
						</h3>
						<p className='text-gray-700 whitespace-pre-wrap'>
							{video.description}
						</p>
					</div>
				</div>
			</div>
		</div>
	)
}
