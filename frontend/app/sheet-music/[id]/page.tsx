'use client'

import Comment, { CommentType } from '@/components/Comment'
import api from '@/services/axiosInstance'
import { useAuthStore } from '@/store/authStore'
import dynamic from 'next/dynamic'
import { useParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

// Динамически импортируем PDF компоненты с отключенным SSR
const PDFViewer = dynamic(
	() => import('./PDFViewer').then(mod => mod.PDFViewer),
	{ ssr: false }
)

interface SheetMusicDetails {
	id: number
	title: string
	description: string
	fileUrl: string
	thumbnailUrl: string
	authorName: string
	authorId: number
	difficulty: string
	createdAt: string
	downloads: number
	likes: number
	isFavorite: boolean
	tags?: string[]
}

// Промежуточный интерфейс для преобразования данных из API
interface ApiComment {
	id: number
	content: string
	user_id?: number
	username?: string
	user_username?: string
	avatar?: string
	created_at: string
	createdAt?: string
	user?: {
		id?: number
		username?: string
		avatar?: string
	}
	replies?: ApiComment[]
}

const SheetMusicPage = () => {
	const { id } = useParams<{ id: string }>()
	const { user } = useAuthStore()
	const [sheetMusic, setSheetMusic] = useState<SheetMusicDetails | null>(null)
	const [loading, setLoading] = useState(true)
	const [comments, setComments] = useState<CommentType[]>([])
	const [newComment, setNewComment] = useState('')
	const [isFavorite, setIsFavorite] = useState(false)
	const [loadingComments, setLoadingComments] = useState(true)
	const commentsSectionRef = useRef<HTMLDivElement>(null)

	// Получение данных о нотах
	useEffect(() => {
		const fetchSheetMusic = async () => {
			try {
				setLoading(true)

				// Сначала проверяем, является ли элемент избранным
				let isFavoriteStatus = false

				if (user) {
					try {
						// Проверяем избранное для текущего пользователя
						const favoritesResponse = await api.get('/favorites')
						if (favoritesResponse.status === 200) {
							// Ищем ID текущего материала в списке избранных
							const favoriteIds = favoritesResponse.data
								.map(
									(item: {
										id: number | string
										sheet_music_id: number | string
									}) =>
										typeof item.id === 'number'
											? item.id
											: item.sheet_music_id
											? Number(item.sheet_music_id)
											: Number(item.id)
								)
								.filter((id: number | string) => !isNaN(Number(id)))

							isFavoriteStatus = favoriteIds.includes(Number(id))
							console.log(`Статус избранного из API: ${isFavoriteStatus}`)
						}
					} catch (favError) {
						console.error('Ошибка при проверке избранного:', favError)
					}
				}

				// Получаем данные о ноте
				const response = await api.get(`/sheet-music/${id}`)

				console.log('Данные о ноте с сервера:', response.data)

				// Сохраняем данные о ноте
				setSheetMusic(response.data)

				// Проверяем оба варианта поля и наш предварительно полученный статус
				const finalFavoriteStatus =
					isFavoriteStatus ||
					response.data.isFavorite ||
					response.data.is_favorite ||
					false

				console.log('Итоговый статус избранного:', finalFavoriteStatus)

				setIsFavorite(finalFavoriteStatus)
			} catch (error) {
				console.error('Ошибка при загрузке нот:', error)
			} finally {
				setLoading(false)
			}
		}

		fetchSheetMusic()
	}, [id, user])

	// Получение комментариев
	useEffect(() => {
		const fetchComments = async () => {
			try {
				setLoadingComments(true)
				console.log(`Загрузка комментариев для sheet_music ID: ${id}`)

				// Используем правильный URL для комментариев с ответами
				const response = await api.get(`/comments/sheet_music/${id}`)
				console.log('Полученные данные о комментариях:', response.data)

				// Преобразуем формат данных для соответствия компоненту Comment
				const formattedComments = response.data.map((c: ApiComment) => {
					const comment = {
						id: c.id,
						content: c.content,
						createdAt: c.createdAt || c.created_at,
						user: {
							id: c.user_id || c.user?.id || 0,
							username: c.user_username || c.username || c.user?.username,
							avatar: c.avatar || c.user?.avatar || undefined,
						},
						replies: c.replies
							? c.replies.map((r: ApiComment) => ({
									id: r.id,
									content: r.content,
									createdAt: r.createdAt || r.created_at,
									user: {
										id: r.user_id || r.user?.id || 0,
										username: r.user_username || r.username || r.user?.username,
										avatar: r.avatar || r.user?.avatar || undefined,
									},
									parentId: c.id,
							  }))
							: [],
					}
					console.log(
						`Комментарий #${comment.id} обработан, количество ответов: ${
							comment.replies?.length || 0
						}`,
						comment.user
					)
					return comment
				})
				console.log(
					'Отформатированные комментарии для отображения:',
					formattedComments
				)
				setComments(formattedComments)
			} catch (error) {
				console.error('Ошибка при загрузке комментариев:', error)
			} finally {
				setLoadingComments(false)
			}
		}

		if (id) {
			fetchComments()
		}
	}, [id])

	// Обработчик для PDF
	const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
		// numPages больше не используется, но сохраняем функцию для совместимости
		console.log(`PDF загружен, страниц: ${numPages}`)
	}

	// Обработчик добавления в избранное
	const toggleFavorite = async () => {
		if (!user) {
			alert('Пожалуйста, войдите в систему для добавления в избранное')
			return
		}

		// Проверяем наличие ID ноты
		if (!sheetMusic?.id || isNaN(Number(sheetMusic.id))) {
			console.error('Некорректный ID ноты для добавления в избранное')
			return
		}

		try {
			// Оптимистичное обновление UI
			const newIsFavorite = !isFavorite
			setIsFavorite(newIsFavorite)

			const sheetMusicId = Number(sheetMusic.id)

			if (newIsFavorite) {
				// Добавляем в избранное
				try {
					const response = await api.post('/favorites', {
						sheet_music_id: sheetMusicId,
					})

					if (response.status === 200 || response.status === 201) {
						console.log('Успешно добавлено в избранное')
					} else {
						throw new Error(`Неожиданный код ответа: ${response.status}`)
					}
				} catch (error: unknown) {
					console.error('Ошибка при добавлении в избранное:', error)
					// Отменяем оптимистичное обновление
					setIsFavorite(!newIsFavorite)
					alert('Ошибка при добавлении в избранное. Попробуйте позже.')
				}
			} else {
				// Удаляем из избранного
				try {
					await api.delete(`/favorites/${sheetMusicId}`)
					console.log('Успешно удалено из избранного')
				} catch (error: unknown) {
					console.error('Ошибка при удалении из избранного:', error)
					// Отменяем оптимистичное обновление
					setIsFavorite(!newIsFavorite)
					alert('Ошибка при удалении из избранного. Попробуйте позже.')
				}
			}
		} catch (error: unknown) {
			console.error('Общая ошибка при обработке избранного:', error)
			alert('Ошибка при изменении статуса избранного. Попробуйте еще раз.')
		}
	}

	// Добавление комментария
	const addComment = async () => {
		if (!user || !newComment.trim()) return

		try {
			const response = await api.post(`/comments/${id}`, {
				content: newComment,
			})

			// Добавляем новый комментарий в список с правильной структурой
			setComments([
				{
					id: response.data.comment.id,
					content: newComment,
					createdAt: new Date().toISOString(),
					user: {
						id: user.id,
						username: user.username,
						avatar: user.avatar || undefined,
					},
					replies: [],
				},
				...comments,
			])

			setNewComment('')

			// Прокрутка к секции комментариев
			if (commentsSectionRef.current) {
				commentsSectionRef.current.scrollIntoView({ behavior: 'smooth' })
			}
		} catch (error) {
			console.error('Ошибка при добавлении комментария:', error)
		}
	}

	// Функция для форматирования сложности
	const formatDifficulty = (difficulty: string) => {
		const map: Record<string, string> = {
			beginner: 'Бастапқы',
			intermediate: 'Орташа',
			advanced: 'Жоғары',
		}
		return map[difficulty] || difficulty
	}

	// Получение цвета для сложности
	const getDifficultyColor = (difficulty: string): string => {
		const colors: Record<string, string> = {
			beginner: 'bg-green-500',
			intermediate: 'bg-yellow-500',
			advanced: 'bg-red-500',
		}
		return colors[difficulty] || 'bg-gray-500'
	}

	// Функции для работы с комментариями
	const handleCommentReply = async (commentId: number, content: string) => {
		if (!user) return

		try {
			console.log('Отправка ответа на комментарий:', { commentId, content })

			const response = await api.post('/comments', {
				content,
				contentType: 'sheet_music',
				contentId: id,
				parentId: commentId,
			})

			console.log('Ответ от сервера:', response.data)

			// Создаем новый объект ответа
			const newReply = {
				id: response.data.comment.id,
				content,
				createdAt: response.data.comment.createdAt,
				user: {
					id: user.id,
					username: user.username,
					avatar: user.avatar || undefined,
				},
				likes: 0,
				isLiked: false,
				parentId: commentId,
				replies: [], // Поддержка для будущих ответов на этот ответ
			}

			// Улучшенная рекурсивная функция для добавления ответа в нужный комментарий на любом уровне вложенности
			const addReplyToComment = (
				comments: CommentType[],
				parentId: number,
				reply: CommentType
			): CommentType[] => {
				return comments.map(comment => {
					// Если это тот комментарий, к которому нужно добавить ответ
					if (comment.id === parentId) {
						return {
							...comment,
							replies: [...(comment.replies || []), reply],
						}
					}

					// Если у комментария есть ответы, проверяем их рекурсивно
					if (comment.replies && comment.replies.length > 0) {
						const updatedReplies = addReplyToComment(
							comment.replies,
							parentId,
							reply
						)

						// Проверяем, изменились ли ответы
						if (updatedReplies !== comment.replies) {
							return {
								...comment,
								replies: updatedReplies,
							}
						}
					}

					// Если это не тот комментарий, возвращаем его без изменений
					return comment
				})
			}

			// Применяем рекурсивную функцию для добавления ответа
			const updatedComments = addReplyToComment(comments, commentId, newReply)

			// Обновляем состояние комментариев
			setComments(updatedComments)

			// Отладочный вывод для проверки структуры комментариев
			console.log(
				'Обновленные комментарии:',
				JSON.stringify(updatedComments, null, 2)
			)
		} catch (error) {
			console.error('Ошибка при добавлении ответа на комментарий:', error)
		}
	}

	const handleCommentEdit = (commentId: number, content: string) => {
		// Здесь будет вызов API для редактирования
		console.log('Редактирование комментария:', commentId, content)
	}

	const handleCommentDelete = (commentId: number) => {
		// Здесь будет вызов API для удаления
		console.log('Удаление комментария:', commentId)
		setComments(comments.filter(c => c.id !== commentId))
	}

	if (loading) {
		return (
			<div className='container mx-auto p-8 flex justify-center items-center min-h-screen'>
				<div className='animate-pulse'>
					<div className='h-10 bg-gray-200 rounded w-60 mb-6'></div>
					<div className='h-[400px] bg-gray-200 rounded w-full mb-6'></div>
					<div className='h-4 bg-gray-200 rounded w-full mb-2.5'></div>
					<div className='h-4 bg-gray-200 rounded w-3/4 mb-2.5'></div>
				</div>
			</div>
		)
	}

	if (!sheetMusic) {
		return (
			<div className='container mx-auto p-8 text-center'>
				<h1 className='text-3xl font-bold mb-6'>Ноты не найдены</h1>
				<p>Запрашиваемые ноты не существуют или были удалены.</p>
			</div>
		)
	}

	return (
		<div className='min-h-screen bg-white'>
			{loading ? (
				<div className='flex justify-center items-center min-h-screen'>
					<div className='animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900'></div>
				</div>
			) : (
				<>
					{sheetMusic ? (
						<>
							<div className='container mx-auto px-4 py-6'>
								<div className='bg-white rounded-lg shadow-md p-6 mb-4'>
									<h1 className='text-3xl font-bold mb-2 text-gray-800'>
										{sheetMusic.title}
									</h1>
									<div className='flex flex-wrap items-center gap-2 mb-4'>
										<span className='text-gray-600'>
											{sheetMusic.authorName}
										</span>
										<span className='mx-2'>•</span>
										<span
											className={`px-3 py-1 rounded-full text-white text-sm ${getDifficultyColor(
												sheetMusic.difficulty
											)}`}
										>
											{formatDifficulty(sheetMusic.difficulty)}
										</span>
									</div>
									<p className='text-gray-700 mb-6'>{sheetMusic.description}</p>
									<div className='flex flex-wrap gap-3 mb-6'>
										{sheetMusic.id && (
											<a
												href={`/api/sheet-music/${sheetMusic.id}/download`}
												target='_blank'
												rel='noopener noreferrer'
												className='bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center'
											>
												<svg
													xmlns='http://www.w3.org/2000/svg'
													className='h-5 w-5 mr-2'
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
												Жүктеу
											</a>
										)}
										{user && (
											<button
												onClick={toggleFavorite}
												className={`px-4 py-2 rounded-md flex items-center ${
													isFavorite
														? 'bg-[#2A3F54] text-white'
														: 'bg-[#2A3F54] text-white'
												}`}
											>
												<svg
													xmlns='http://www.w3.org/2000/svg'
													className='h-5 w-5 mr-2'
													fill={isFavorite ? 'white' : 'none'}
													viewBox='0 0 24 24'
													stroke='white'
													strokeWidth='2'
													strokeLinecap='round'
													strokeLinejoin='round'
												>
													<path d='M20.84 4.61C20.3292 4.099 19.7228 3.69364 19.0554 3.41708C18.3879 3.14052 17.6725 2.99817 16.95 2.99817C16.2275 2.99817 15.5121 3.14052 14.8446 3.41708C14.1772 3.69364 13.5708 4.099 13.06 4.61L12 5.67L10.94 4.61C9.9083 3.57831 8.50903 2.99871 7.05 2.99871C5.59096 2.99871 4.19169 3.57831 3.16 4.61C2.1283 5.6417 1.54871 7.04097 1.54871 8.5C1.54871 9.95903 2.1283 11.3583 3.16 12.39L4.22 13.45L12 21.23L19.78 13.45L20.84 12.39C21.351 11.8792 21.7563 11.2728 22.0329 10.6054C22.3095 9.93789 22.4518 9.22248 22.4518 8.5C22.4518 7.77752 22.3095 7.0621 22.0329 6.39464C21.7563 5.72718 21.351 5.12075 20.84 4.61Z' />
												</svg>
												{isFavorite ? 'Таңдаулыдан жою' : 'Таңдаулыға қосу'}
											</button>
										)}
									</div>
								</div>
							</div>

							{/* PDF просмотрщик */}
							<div className='bg-gray-100 mb-8 px-[50px]'>
								<div className='h-[calc(100vh-130px)]'>
									<PDFViewer
										pdfUrl={sheetMusic.fileUrl}
										pageNumber={1}
										scale={1.0}
										onLoadSuccess={onDocumentLoadSuccess}
									/>
								</div>
							</div>

							{/* Секция комментариев */}
							<div
								ref={commentsSectionRef}
								className='mb-10 px-[50px] bg-slate-50'
							>
								<h2 className='text-2xl font-bold mb-6 text-[#2A3F54] pt-6'>
									Пікірлер
								</h2>

								{user ? (
									<div className='mb-6'>
										<textarea
											value={newComment}
											onChange={e => setNewComment(e.target.value)}
											placeholder='Пікіріңізді жазыңыз...'
											className='w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2A3F54] focus:border-transparent min-h-[100px] bg-white shadow-sm text-black placeholder:text-slate-500'
										></textarea>
										<div className='flex justify-end mt-2'>
											<button
												onClick={addComment}
												disabled={!newComment.trim()}
												className={`px-5 py-2 rounded-lg text-white ${
													!newComment.trim()
														? 'bg-[#2A3F54] opacity-50 cursor-not-allowed'
														: 'bg-[#2A3F54] hover:bg-[#1e2e3d] transition-colors'
												}`}
											>
												Жариялау
											</button>
										</div>
									</div>
								) : (
									<div className='bg-white p-4 rounded-lg mb-6 text-center shadow-sm border border-slate-200'>
										<p className='text-slate-700'>
											Пікір қалдыру үшін{' '}
											<a
												href='/auth/login'
												className='text-[#2A3F54] hover:underline font-medium'
											>
												кіру
											</a>{' '}
											керек
										</p>
									</div>
								)}

								{loadingComments ? (
									<div className='animate-pulse space-y-4'>
										{[1, 2, 3].map(i => (
											<div
												key={i}
												className='bg-white p-4 rounded-lg shadow-sm border border-slate-200'
											>
												<div className='flex items-center space-x-3 mb-3'>
													<div className='rounded-full bg-slate-200 h-10 w-10'></div>
													<div className='h-4 bg-slate-200 rounded w-1/4'></div>
												</div>
												<div className='space-y-2'>
													<div className='h-4 bg-slate-200 rounded w-full'></div>
													<div className='h-4 bg-slate-200 rounded w-5/6'></div>
												</div>
											</div>
										))}
									</div>
								) : comments.length > 0 ? (
									<div className='space-y-4 pb-8'>
										{comments.map(comment => (
											<Comment
												key={comment.id}
												comment={comment}
												onReply={handleCommentReply}
												onDelete={handleCommentDelete}
												onEdit={handleCommentEdit}
											/>
										))}
									</div>
								) : (
									<div className='text-center py-8 text-slate-600 bg-white rounded-lg shadow-sm border border-slate-200 mb-8'>
										<p>Пікірлер жоқ. Бірінші болып пікір қалдырыңыз!</p>
									</div>
								)}
							</div>
						</>
					) : (
						<div className='container mx-auto p-8 text-center'>
							<h1 className='text-3xl font-bold mb-6'>Ноты не найдены</h1>
							<p>Запрашиваемые ноты не существуют или были удалены.</p>
						</div>
					)}
				</>
			)}
		</div>
	)
}

export default SheetMusicPage
