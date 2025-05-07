'use client'

import { useAuthStore } from '@/store/authStore'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'

export interface SheetMusicType {
	id: number
	title: string
	description: string
	thumbnailUrl: string
	fileUrl: string
	instrument: string
	difficulty: 'beginner' | 'intermediate' | 'advanced'
	createdAt: string
	downloads: number
	likes: number
	pages: number
	authorName?: string
	authorId?: number
	isFavorite?: boolean
	tags?: string[]
	composer?: string
	is_favorite?: boolean
}

interface SheetMusicCardProps {
	sheetMusic: SheetMusicType
	onFavoriteToggle?: (id: number, isFavorite: boolean) => void
	showAuthor?: boolean
	compact?: boolean
}

const SheetMusicCard = ({
	sheetMusic,
	onFavoriteToggle,
	showAuthor = false,
	compact = false,
}: SheetMusicCardProps) => {
	const { user } = useAuthStore()
	const [isFavorite, setIsFavorite] = useState(sheetMusic.isFavorite || false)

	useEffect(() => {
		setIsFavorite(sheetMusic.isFavorite || false)
	}, [sheetMusic.isFavorite])

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
			onFavoriteToggle(sheetMusic.id, !isFavorite)
		}
	}

	// Компактная версия карточки
	if (compact) {
		return (
			<div className='flex items-center space-x-4 p-3 rounded-lg border border-gray-200 hover:shadow-md transition-shadow'>
				<div className='relative flex-shrink-0 w-16 h-20'>
					<Image
						src={sheetMusic.thumbnailUrl || '/placeholder-sheet.jpg'}
						alt={sheetMusic.title}
						fill
						className='object-cover rounded'
					/>
				</div>
				<div className='flex-1 min-w-0'>
					<Link
						href={`/sheet-music/${sheetMusic.id}`}
						className='hover:text-indigo-600'
					>
						<h3 className='text-sm font-medium truncate'>{sheetMusic.title}</h3>
					</Link>
					<div className='flex items-center mt-1 text-xs text-gray-500'>
						<span
							className={`inline-block w-2 h-2 rounded-full ${getDifficultyColor(
								sheetMusic.difficulty
							)} mr-1`}
						></span>
						<span>{getDifficultyLabel(sheetMusic.difficulty)}</span>
					</div>
					<div className='text-xs text-gray-500 mt-1'>
						{sheetMusic.pages}{' '}
						{sheetMusic.pages === 1
							? 'страница'
							: sheetMusic.pages > 1 && sheetMusic.pages < 5
							? 'страницы'
							: 'страниц'}
					</div>
				</div>
			</div>
		)
	}

	// Стандартная карточка
	return (
		<div className='bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow'>
			<div className='relative'>
				<Link href={`/sheet-music/${sheetMusic.id}`}>
					<div className='aspect-[3/4] relative'>
						<Image
							src={sheetMusic.thumbnailUrl || '/placeholder-sheet.jpg'}
							alt={sheetMusic.title}
							fill
							className='object-cover'
						/>
					</div>
				</Link>
				{user && (
					<FavoriteButton
						onClick={handleFavoriteToggle}
						isFavorite={isFavorite}
					/>
				)}
			</div>

			<div className='p-4'>
				<div className='flex flex-wrap gap-1 mb-2'>
					{sheetMusic.tags?.map((tag, index) => (
						<span
							key={index}
							className='inline-block bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full'
						>
							{tag}
						</span>
					))}
				</div>

				<div className='flex items-center justify-between mb-2'>
					<div className='flex items-center'>
						<span
							className={`inline-block w-3 h-3 rounded-full ${getDifficultyColor(
								sheetMusic.difficulty
							)} mr-2`}
						></span>
						<span className='text-xs text-gray-600'>
							{getDifficultyLabel(sheetMusic.difficulty)}
						</span>
					</div>
					<div className='text-xs text-gray-500'>
						{sheetMusic.pages} {sheetMusic.pages === 1 ? 'стр.' : 'стр.'}
					</div>
				</div>

				<Link
					href={`/sheet-music/${sheetMusic.id}`}
					className='hover:text-indigo-600'
				>
					<h3 className='font-semibold text-lg mb-2 text-gray-900 leading-tight'>
						{sheetMusic.title}
					</h3>
				</Link>

				<p className='text-gray-600 text-sm mb-3 line-clamp-2'>
					{sheetMusic.description}
				</p>

				{showAuthor && sheetMusic.authorName && (
					<div className='flex items-center text-sm text-gray-500 mb-3'>
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
						<Link
							href={
								sheetMusic.authorId ? `/profile/${sheetMusic.authorId}` : '#'
							}
						>
							{sheetMusic.authorName}
						</Link>
					</div>
				)}

				<div className='mt-4 flex justify-between items-center'>
					<div className='flex items-center space-x-3'>
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
							{sheetMusic.likes}
						</div>
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
									d='M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4'
								/>
							</svg>
							{sheetMusic.downloads}
						</div>
					</div>

					<Link
						href={`/api/sheet-music/${sheetMusic.id}/download`}
						className='text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center'
					>
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
								d='M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4'
							/>
						</svg>
						Скачать
					</Link>
				</div>
			</div>
		</div>
	)
}

const FavoriteButton = ({
	onClick,
	isFavorite,
}: {
	onClick: () => void
	isFavorite: boolean
}) => {
	return (
		<button
			onClick={onClick}
			className={`absolute top-2 right-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 shadow-md hover:bg-white/90 ${
				isFavorite ? 'text-red-500' : 'text-gray-500'
			}`}
			title={isFavorite ? 'Удалить из избранного' : 'Добавить в избранное'}
		>
			{isFavorite ? <HeartFilledIcon /> : <HeartOutlineIcon />}
		</button>
	)
}

// Значки сердечка
const HeartOutlineIcon = () => (
	<svg
		xmlns='http://www.w3.org/2000/svg'
		fill='none'
		viewBox='0 0 24 24'
		strokeWidth={1.5}
		stroke='currentColor'
		className='h-5 w-5'
	>
		<path
			strokeLinecap='round'
			strokeLinejoin='round'
			d='M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z'
		/>
	</svg>
)

const HeartFilledIcon = () => (
	<svg
		xmlns='http://www.w3.org/2000/svg'
		viewBox='0 0 24 24'
		fill='currentColor'
		className='h-5 w-5'
	>
		<path d='M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z' />
	</svg>
)

export default SheetMusicCard
