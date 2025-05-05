'use client'

import { useAuthStore } from '@/store/authStore'
import Link from 'next/link'
import { useEffect, useState } from 'react'

interface ProgressStats {
	completedVideos: number
	totalVideos: number
	completedPercent: number
	nextVideo?: {
		id: number
		title: string
		thumbnail: string
	}
	achievements: {
		id: number
		title: string
		description: string
		icon: string
		unlockedAt: string
	}[]
}

export default function UserProgress() {
	const { user } = useAuthStore()
	const [stats, setStats] = useState<ProgressStats | null>(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		const fetchStats = async () => {
			if (!user) {
				setLoading(false)
				return
			}

			try {
				setLoading(true)
				setError(null)

				// В реальном API это был бы единый запрос к эндпоинту статистики
				// Но для демо-версии мы создадим данные на клиенте

				// Имитация задержки запроса
				await new Promise(resolve => setTimeout(resolve, 500))

				// Демо-данные
				const demoStats: ProgressStats = {
					completedVideos: 2,
					totalVideos: 6,
					completedPercent: 33,
					nextVideo: {
						id: 3,
						title: 'Техника перебора для домбры',
						thumbnail: '/images/demo/video4.jpg',
					},
					achievements: [
						{
							id: 1,
							title: 'Первый шаг',
							description: 'Завершен первый видеоурок',
							icon: '🏆',
							unlockedAt: '2023-11-15T14:30:00Z',
						},
						{
							id: 2,
							title: 'Начинающий домбрист',
							description: 'Завершено 2 видеоурока',
							icon: '🎵',
							unlockedAt: '2023-11-18T16:45:00Z',
						},
					],
				}

				setStats(demoStats)
			} catch (err) {
				console.error('Ошибка при загрузке статистики:', err)
				setError('Не удалось загрузить статистику прогресса')
			} finally {
				setLoading(false)
			}
		}

		fetchStats()
	}, [user])

	if (!user) {
		return (
			<div className='bg-white rounded-lg shadow-md p-6'>
				<h2 className='text-xl font-semibold text-gray-900 mb-4'>
					Отслеживайте свой прогресс
				</h2>
				<p className='text-gray-600 mb-4'>
					Авторизуйтесь, чтобы отслеживать прогресс обучения, получать
					достижения и открывать новые уроки.
				</p>
				<div className='flex space-x-4'>
					<Link
						href='/auth/login'
						className='px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700'
					>
						Войти
					</Link>
					<Link
						href='/auth/register'
						className='px-4 py-2 border border-indigo-600 text-indigo-600 rounded-md hover:bg-indigo-50'
					>
						Регистрация
					</Link>
				</div>
			</div>
		)
	}

	if (loading) {
		return (
			<div className='bg-white rounded-lg shadow-md p-6 animate-pulse'>
				<div className='h-7 bg-gray-200 rounded mb-4 w-3/4'></div>
				<div className='h-4 bg-gray-200 rounded mb-3 w-full'></div>
				<div className='h-4 bg-gray-200 rounded mb-3 w-5/6'></div>
				<div className='h-24 bg-gray-200 rounded mb-4'></div>
				<div className='h-10 bg-gray-200 rounded w-1/3'></div>
			</div>
		)
	}

	if (error || !stats) {
		return (
			<div className='bg-white rounded-lg shadow-md p-6'>
				<h2 className='text-xl font-semibold text-gray-900 mb-2'>
					Ошибка загрузки
				</h2>
				<p className='text-red-500 mb-2'>
					{error || 'Не удалось загрузить данные о прогрессе'}
				</p>
				<button
					onClick={() => window.location.reload()}
					className='px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700'
				>
					Обновить
				</button>
			</div>
		)
	}

	return (
		<div className='bg-white rounded-lg shadow-md p-6'>
			<h2 className='text-xl font-semibold text-gray-900 mb-2'>
				Ваш прогресс обучения
			</h2>

			{/* Прогресс-бар */}
			<div className='mb-6'>
				<div className='flex justify-between items-center mb-2'>
					<span className='text-gray-600'>
						Завершено уроков: {stats.completedVideos} из {stats.totalVideos}
					</span>
					<span className='text-indigo-600 font-semibold'>
						{stats.completedPercent}%
					</span>
				</div>
				<div className='h-2 bg-gray-200 rounded-full'>
					<div
						className='h-full bg-indigo-600 rounded-full'
						style={{ width: `${stats.completedPercent}%` }}
					></div>
				</div>
			</div>

			{/* Следующий урок */}
			{stats.nextVideo && (
				<div className='mb-6'>
					<h3 className='text-lg font-medium text-gray-900 mb-3'>
						Следующий урок
					</h3>
					<Link
						href={`/videos/${stats.nextVideo.id}`}
						className='block bg-gray-50 rounded-md p-4 hover:bg-gray-100 transition-colors'
					>
						<div className='flex items-center'>
							<div className='w-12 h-12 bg-indigo-100 rounded flex-shrink-0 mr-4 overflow-hidden relative'>
								{stats.nextVideo.thumbnail && (
									<img
										src={stats.nextVideo.thumbnail}
										alt={stats.nextVideo.title}
										className='object-cover w-full h-full'
									/>
								)}
							</div>
							<div>
								<h4 className='font-medium text-gray-900'>
									{stats.nextVideo.title}
								</h4>
								<span className='text-indigo-600 text-sm'>
									Продолжить обучение →
								</span>
							</div>
						</div>
					</Link>
				</div>
			)}

			{/* Достижения */}
			{stats.achievements.length > 0 && (
				<div>
					<h3 className='text-lg font-medium text-gray-900 mb-3'>
						Ваши достижения
					</h3>
					<div className='space-y-3'>
						{stats.achievements.map(achievement => (
							<div
								key={achievement.id}
								className='flex items-center bg-gray-50 rounded-md p-3'
							>
								<div className='w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center mr-3 text-2xl'>
									{achievement.icon}
								</div>
								<div>
									<h4 className='font-medium text-gray-900'>
										{achievement.title}
									</h4>
									<p className='text-gray-600 text-sm'>
										{achievement.description}
									</p>
									<p className='text-gray-400 text-xs mt-1'>
										Получено{' '}
										{new Date(achievement.unlockedAt).toLocaleDateString()}
									</p>
								</div>
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	)
}
