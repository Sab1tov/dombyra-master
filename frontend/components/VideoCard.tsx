'use client'

import { useAuthStore } from '@/store/authStore'
import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'

export interface VideoLessonType {
	id: number
	title: string
	description: string
	thumbnail: string
	videoUrl: string
	duration: number // в секундах
	difficulty: 'beginner' | 'intermediate' | 'advanced'
	createdAt: string
	views: number
	likes: number
	authorName?: string
	authorId?: number
	isCompleted?: boolean
	isFavorite?: boolean
}

interface VideoCardProps {
	video: VideoLessonType
	onFavoriteToggle?: (id: number, isFavorite: boolean) => void
	showAuthor?: boolean
	compact?: boolean
}

const VideoCard = ({
	video,
	onFavoriteToggle,
	showAuthor = false,
	compact = false,
}: VideoCardProps) => {
	const { user } = useAuthStore()
	const [isFavorite, setIsFavorite] = useState(video.isFavorite || false)

	// Функция форматирования длительности видео
	const formatDuration = (seconds: number): string => {
		const minutes = Math.floor(seconds / 60)
		const remainingSeconds = seconds % 60
		return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
	}

	// Функция определения уровня сложности
	const getDifficultyLabel = (difficulty: string): string => {
		const labels = {
			beginner: 'Начальный',
			intermediate: 'Средний',
			advanced: 'Продвинутый',
		}
		return labels[difficulty as keyof typeof labels] || 'Не указан'
	}

	// Функция определения цвета индикатора сложности
	const getDifficultyColor = (difficulty: string): string => {
		const colors = {
			beginner: 'bg-green-500',
			intermediate: 'bg-yellow-500',
			advanced: 'bg-red-500',
		}
		return colors[difficulty as keyof typeof colors] || 'bg-gray-500'
	}

	// Функция переключения избранного
	const handleFavoriteToggle = async () => {
		if (!user) return // Только авторизованные пользователи могут добавлять в избранное

		// Оптимистичное обновление UI
		setIsFavorite(!isFavorite)

		// Callback для родительского компонента
		if (onFavoriteToggle) {
			onFavoriteToggle(video.id, !isFavorite)
		}
	}

	// Компактная версия карточки
	if (compact) {
		return (
			<div className='flex items-center space-x-4 p-3 rounded-lg border border-gray-200 hover:shadow-md transition-shadow'>
				<div className='relative flex-shrink-0 w-24 h-16'>
					<Image
						src={video.thumbnail || '/placeholder-video.jpg'}
						alt={video.title}
						fill
						className='object-cover rounded'
					/>
					<div className='absolute bottom-1 right-1 bg-black bg-opacity-70 text-white text-xs px-1 rounded'>
						{formatDuration(video.duration)}
					</div>
				</div>
				<div className='flex-1 min-w-0'>
					<Link href={`/videos/${video.id}`} className='hover:text-indigo-600'>
						<h3 className='text-sm font-medium truncate'>{video.title}</h3>
					</Link>
					<div className='flex items-center mt-1 text-xs text-gray-500'>
						<span
							className={`inline-block w-2 h-2 rounded-full ${getDifficultyColor(
								video.difficulty
							)} mr-1`}
						></span>
						<span>{getDifficultyLabel(video.difficulty)}</span>
					</div>
				</div>
			</div>
		)
	}

	// Стандартная карточка
	return (
		<div className='bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow'>
			<div className='relative'>
				<Link href={`/videos/${video.id}`}>
					<div className='aspect-video relative'>
						<Image
							src={video.thumbnail || '/placeholder-video.jpg'}
							alt={video.title}
							fill
							className='object-cover'
						/>
						<div className='absolute bottom-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded'>
							{formatDuration(video.duration)}
						</div>
						{video.isCompleted && (
							<div className='absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full'>
								Просмотрено
							</div>
						)}
					</div>
				</Link>
				{user && (
					<button
						onClick={handleFavoriteToggle}
						className='absolute top-2 right-2 bg-white rounded-full p-1 shadow-md'
						aria-label={
							isFavorite ? 'Удалить из избранного' : 'Добавить в избранное'
						}
					>
						<svg
							xmlns='http://www.w3.org/2000/svg'
							viewBox='0 0 24 24'
							fill={isFavorite ? 'currentColor' : 'none'}
							stroke='currentColor'
							className={`w-5 h-5 ${
								isFavorite ? 'text-red-500' : 'text-gray-600'
							}`}
							strokeWidth={isFavorite ? 0 : 1.5}
						>
							<path
								strokeLinecap='round'
								strokeLinejoin='round'
								d='M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z'
							/>
						</svg>
					</button>
				)}
			</div>

			<div className='p-4'>
				<div className='flex items-center justify-between mb-2'>
					<div className='flex items-center'>
						<span
							className={`inline-block w-3 h-3 rounded-full ${getDifficultyColor(
								video.difficulty
							)} mr-2`}
						></span>
						<span className='text-xs text-gray-600'>
							{getDifficultyLabel(video.difficulty)}
						</span>
					</div>
					<div className='text-xs text-gray-500 flex items-center'>
						<svg
							xmlns='http://www.w3.org/2000/svg'
							className='h-4 w-4 mr-1'
							fill='none'
							viewBox='0 0 24 24'
							stroke='currentColor'
						>
							<path
								strokeLinecap='round'
								strokeLinejoin='round'
								strokeWidth={2}
								d='M15 12a3 3 0 11-6 0 3 3 0 016 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'
							/>
							<path
								strokeLinecap='round'
								strokeLinejoin='round'
								strokeWidth={2}
								d='M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z'
							/>
						</svg>
						{video.views}
					</div>
				</div>

				<Link href={`/videos/${video.id}`} className='hover:text-indigo-600'>
					<h3 className='font-semibold text-lg mb-2 text-gray-900 leading-tight'>
						{video.title}
					</h3>
				</Link>

				<p className='text-gray-600 text-sm mb-3 line-clamp-2'>
					{video.description}
				</p>

				{showAuthor && video.authorName && (
					<div className='flex items-center text-sm text-gray-500'>
						<svg
							xmlns='http://www.w3.org/2000/svg'
							className='h-4 w-4 mr-1'
							fill='none'
							viewBox='0 0 24 24'
							stroke='currentColor'
						>
							<path
								strokeLinecap='round'
								strokeLinejoin='round'
								strokeWidth={2}
								d='M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'
							/>
						</svg>
						<Link href={video.authorId ? `/profile/${video.authorId}` : '#'}>
							{video.authorName}
						</Link>
					</div>
				)}

				<div className='mt-4 flex justify-between items-center'>
					<div className='flex items-center text-gray-500 text-sm'>
						<svg
							xmlns='http://www.w3.org/2000/svg'
							className='h-4 w-4 mr-1'
							fill='none'
							viewBox='0 0 24 24'
							stroke='currentColor'
						>
							<path
								strokeLinecap='round'
								strokeLinejoin='round'
								strokeWidth={2}
								d='M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z'
							/>
						</svg>
						{video.likes}
					</div>
					<div className='text-xs text-gray-500'>
						{new Date(video.createdAt).toLocaleDateString()}
					</div>
				</div>
			</div>
		</div>
	)
}

export default VideoCard
