'use client'

import { useAuthStore } from '@/store/authStore'
import Link from 'next/link'
import { useEffect, useState } from 'react'

export interface CommentType {
	id: number
	content: string
	createdAt: string
	updatedAt?: string
	user: {
		id: number
		username: string
		avatar?: string
	}
	replies?: CommentType[]
	parentId?: number
}

interface CommentProps {
	comment: CommentType
	onReply: (id: number, content: string) => void
	onEdit: (id: number, content: string) => void
	onDelete: (id: number) => void
	level?: number
	maxLevel?: number
}

// Функция для получения полного URL аватара (прямая версия без оптимизаций)
const getAvatarUrl = (avatarPath: string | null): string => {
	if (!avatarPath) return '/images/default-avatar.png'

	// Если путь начинается с http или https, это уже полный URL
	if (avatarPath.startsWith('http')) {
		return avatarPath
	}

	// Прямая ссылка на бэкенд
	return `${process.env.NEXT_PUBLIC_API_URL}${avatarPath}`
}

const Comment = ({
	comment,
	onReply,
	onEdit,
	onDelete,
	level = 0,
	maxLevel = 5,
}: CommentProps) => {
	const { user } = useAuthStore()
	const [isReplying, setIsReplying] = useState(false)
	const [isEditing, setIsEditing] = useState(false)
	const [replyContent, setReplyContent] = useState('')
	const [editContent, setEditContent] = useState(comment.content)
	const [showAllReplies, setShowAllReplies] = useState(false)

	// Отладка: выводим информацию об аватаре и уровне вложенности
	useEffect(() => {
		console.log(`Комментарий #${comment.id} от ${comment.user.username}:`)
		console.log(` - Уровень вложенности: ${level}`)
		console.log(
			` - Родительский комментарий: ${comment.parentId || 'нет (корневой)'}`
		)
		console.log(' - Исходный путь аватара:', comment.user.avatar)
		console.log(
			' - Полный URL аватара:',
			comment.user.avatar ? getAvatarUrl(comment.user.avatar) : null
		)
	}, [
		comment.id,
		comment.user.avatar,
		comment.user.username,
		level,
		comment.parentId,
	])

	// Форматирование даты
	const formatDate = (dateString: string) => {
		const date = new Date(dateString)
		return date.toLocaleDateString('ru-RU', {
			day: 'numeric',
			month: 'long',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		})
	}

	// Определение времени "назад"
	const getTimeAgo = (dateString: string) => {
		const date = new Date(dateString)
		const now = new Date()
		const diffMs = now.getTime() - date.getTime()

		const seconds = Math.floor(diffMs / 1000)
		const minutes = Math.floor(seconds / 60)
		const hours = Math.floor(minutes / 60)
		const days = Math.floor(hours / 24)

		if (days > 0) {
			return `${days} ${days === 1 ? 'день' : days < 5 ? 'дня' : 'дней'} назад`
		}

		if (hours > 0) {
			return `${hours} ${
				hours === 1 ? 'час' : hours < 5 ? 'часа' : 'часов'
			} назад`
		}

		if (minutes > 0) {
			return `${minutes} ${
				minutes === 1 ? 'минуту' : minutes < 5 ? 'минуты' : 'минут'
			} назад`
		}

		return 'только что'
	}

	// Обработчик отправки ответа
	const handleReplySubmit = (e: React.FormEvent) => {
		e.preventDefault()
		if (!replyContent.trim()) return

		console.log(
			`Отправка ответа: уровень ${level}, id комментария ${comment.id}`
		)
		onReply(comment.id, replyContent)
		setReplyContent('')
		setIsReplying(false)
	}

	// Обработчик отправки редактирования
	const handleEditSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		if (!editContent.trim()) return

		onEdit(comment.id, editContent)
		setIsEditing(false)
	}

	// Определение, имеет ли текущий пользователь право редактировать/удалять
	const canModify = user && user.id === comment.user.id

	// Определяем, сколько ответов показывать изначально
	const initialRepliesCount = 2
	const hasMoreReplies =
		comment.replies && comment.replies.length > initialRepliesCount
	const visibleReplies = showAllReplies
		? comment.replies
		: comment.replies?.slice(0, initialRepliesCount)

	return (
		<div className={`mb-4 ${level > 0 ? 'ml-6' : ''}`}>
			<div className='bg-white p-4 rounded-lg shadow-sm border border-gray-100'>
				{/* Шапка комментария */}
				<div className='flex justify-between items-start mb-3'>
					<div className='flex items-center'>
						<div className='w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold mr-2 relative overflow-hidden'>
							{comment.user.avatar ? (
								<img
									src={
										comment.user.avatar.startsWith('/uploads')
											? comment.user.avatar // Используем путь напрямую, Next.js rewrites перенаправит
											: getAvatarUrl(comment.user.avatar)
									}
									alt={comment.user.username}
									className='w-full h-full object-cover'
									onError={e => {
										console.error(
											`Ошибка загрузки аватара для ${comment.user.username}`
										)
										console.error('Путь аватара:', comment.user.avatar)
										e.currentTarget.style.display = 'none'
									}}
								/>
							) : (
								comment.user.username.charAt(0).toUpperCase()
							)}
						</div>
						<div>
							<Link
								href={`/profile/${comment.user.id}`}
								className='font-medium text-gray-900 text-sm hover:text-indigo-600'
							>
								{comment.user.username}
							</Link>
							<div className='text-xs text-gray-500'>
								{getTimeAgo(comment.createdAt)}
								{comment.updatedAt &&
									comment.updatedAt !== comment.createdAt && (
										<span> (изменено)</span>
									)}
							</div>
						</div>
					</div>

					{/* Меню для редактирования/удаления (только для автора) */}
					{canModify && (
						<div className='relative text-sm text-gray-500 flex'>
							<button
								onClick={() => setIsEditing(true)}
								className='mr-2 hover:text-indigo-600'
								aria-label='Редактировать комментарий'
							>
								<svg
									xmlns='http://www.w3.org/2000/svg'
									className='h-4 w-4'
									fill='none'
									viewBox='0 0 24 24'
									stroke='currentColor'
								>
									<path
										strokeLinecap='round'
										strokeLinejoin='round'
										strokeWidth={2}
										d='M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z'
									/>
								</svg>
							</button>
							<button
								onClick={() => onDelete(comment.id)}
								className='hover:text-red-600'
								aria-label='Удалить комментарий'
							>
								<svg
									xmlns='http://www.w3.org/2000/svg'
									className='h-4 w-4'
									fill='none'
									viewBox='0 0 24 24'
									stroke='currentColor'
								>
									<path
										strokeLinecap='round'
										strokeLinejoin='round'
										strokeWidth={2}
										d='M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16'
									/>
								</svg>
							</button>
						</div>
					)}
				</div>

				{/* Содержимое комментария */}
				{isEditing ? (
					<form onSubmit={handleEditSubmit} className='mb-3'>
						<textarea
							value={editContent}
							onChange={e => setEditContent(e.target.value)}
							className='w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent'
							rows={3}
							placeholder='Редактировать комментарий...'
						/>
						<div className='flex justify-end mt-2 space-x-2'>
							<button
								type='button'
								onClick={() => setIsEditing(false)}
								className='px-3 py-1.5 text-xs border border-gray-300 rounded-md hover:bg-gray-100'
							>
								Отмена
							</button>
							<button
								type='submit'
								className='px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-md hover:bg-indigo-700'
							>
								Сохранить
							</button>
						</div>
					</form>
				) : (
					<div className='text-gray-700 text-sm mb-3 whitespace-pre-wrap'>
						{comment.content}
					</div>
				)}

				{/* Действия с комментарием */}
				<div className='flex items-center text-xs text-gray-500 space-x-4'>
					{/* Показываем кнопку "Ответить" только для комментариев верхнего уровня */}
					{user && level === 0 && (
						<button
							onClick={() => setIsReplying(!isReplying)}
							className='flex items-center hover:text-gray-700'
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
									d='M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6'
								/>
							</svg>
							Жауап беру
						</button>
					)}

					<span className='text-gray-400' title={formatDate(comment.createdAt)}>
						{formatDate(comment.createdAt)}
					</span>
				</div>
			</div>

			{/* Форма для ответа */}
			{isReplying && (
				<div className='mt-3 ml-6'>
					<form
						onSubmit={handleReplySubmit}
						className='bg-white p-4 rounded-lg'
					>
						<textarea
							value={replyContent}
							onChange={e => setReplyContent(e.target.value)}
							className='w-full p-2 bg-white border border-gray-300 text-gray-800 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2A3F54] focus:border-transparent placeholder-gray-500'
							rows={2}
							placeholder='Написать ответ...'
						/>
						<div className='flex justify-end mt-2 space-x-2'>
							<button
								type='button'
								onClick={() => setIsReplying(false)}
								className='px-3 py-1.5 text-xs border border-gray-300 rounded-md hover:bg-gray-100 text-gray-700'
							>
								Бас тарту
							</button>
							<button
								type='submit'
								className='px-3 py-1.5 text-xs bg-[#2A3F54] text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed'
								disabled={!replyContent.trim()}
							>
								Жариялау
							</button>
						</div>
					</form>
				</div>
			)}

			{/* Ответы на комментарий */}
			{visibleReplies && visibleReplies.length > 0 && (
				<div className='mt-2 ml-6'>
					{visibleReplies.map(reply => (
						<Comment
							key={reply.id}
							comment={reply}
							onReply={onReply}
							onEdit={onEdit}
							onDelete={onDelete}
							level={level + 1}
							maxLevel={maxLevel}
						/>
					))}

					{hasMoreReplies && (
						<button
							onClick={() => setShowAllReplies(!showAllReplies)}
							className='text-indigo-600 text-sm hover:text-indigo-800 mt-2'
						>
							{showAllReplies
								? 'Скрыть ответы'
								: `Показать все ответы (${comment.replies!.length})`}
						</button>
					)}
				</div>
			)}
		</div>
	)
}

export default Comment
