'use client'

import { SheetMusicType } from '@/components/SheetMusicCard'
import api from '@/services/axiosInstance'
import { useAuthStore } from '@/store/authStore'
import Cookies from 'js-cookie'
import Link from 'next/link'
import { useEffect, useState } from 'react'

export default function SheetMusicPage() {
	const { user } = useAuthStore()
	const [sheetMusic, setSheetMusic] = useState<SheetMusicType[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [selectedDifficulty] = useState<string>('all')
	const [searchQuery, setSearchQuery] = useState<string>('')
	const [page, setPage] = useState(1)
	const [limit] = useState(12)

	// Загрузка нотных материалов
	useEffect(() => {
		const fetchSheetMusic = async () => {
			try {
				setLoading(true)
				setError(null)

				const params: Record<string, string | number> = {
					page,
					limit,
				}
				if (searchQuery) params.search = searchQuery
				if (selectedDifficulty !== 'all') params.difficulty = selectedDifficulty

				const response = await api.get('/sheet-music', { params })

				if (Array.isArray(response.data)) {
					setSheetMusic(response.data as SheetMusicType[])
				} else if (response.data.items && Array.isArray(response.data.items)) {
					setSheetMusic(response.data.items as SheetMusicType[])
				} else {
					setSheetMusic([])
				}
			} catch (err: unknown) {
				console.error(
					'Ошибка при загрузке нот:',
					err instanceof Error ? err.message : err
				)
				setError('Не удалось загрузить ноты. Пожалуйста, попробуйте позже.')
			} finally {
				setLoading(false)
			}
		}

		fetchSheetMusic()
	}, [searchQuery, selectedDifficulty, page, limit])

	// Обработчик добавления/удаления из избранного
	const handleFavoriteToggle = async (id: number, isFavorite: boolean) => {
		if (!user) {
			// Показываем модальное окно или сообщение для неавторизованных пользователей
			alert('Пожалуйста, войдите в систему, чтобы добавить ноты в избранное.')
			return
		}

		// Проверка на валидность ID
		if (!id || isNaN(Number(id)) || Number(id) <= 0) {
			console.error('Некорректный ID ноты:', id)
			alert('Ошибка: некорректный идентификатор ноты')
			return
		}

		try {
			console.log(
				'Переключение избранного, текущий статус:',
				isFavorite ? 'В избранном' : 'Не в избранном',
				'ID ноты:',
				id,
				'Тип ID:',
				typeof id
			)

			// На стороне клиента устанавливаем новое значение сразу (оптимистичное обновление)
			const newIsFavorite = !isFavorite

			// Обновляем состояние локально (оптимистичное обновление)
			setSheetMusic(
				sheetMusic.map(item =>
					item.id === id ? { ...item, isFavorite: newIsFavorite } : item
				)
			)

			// Фиксирование ID для запроса - преобразуем в число
			const sheetMusicId = Number(id)
			console.log(
				'Подготовлен ID для отправки:',
				sheetMusicId,
				'Тип:',
				typeof sheetMusicId
			)

			// Выполняем запрос к API
			if (newIsFavorite) {
				// Добавляем в избранное
				console.log(
					'Отправка POST запроса для добавления в избранное:',
					sheetMusicId
				)

				try {
					// Проверяем через fetch для отладки точных данных, которые отправляются
					const token = localStorage.getItem('jwtToken') || Cookies.get('token')
					const response = await fetch('/api/favorites', {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
							Authorization: `Bearer ${token}`,
						},
						body: JSON.stringify({
							id: sheetMusicId,
							sheet_music_id: sheetMusicId,
						}),
					})

					// Логируем подробную информацию о запросе для отладки
					const responseText = await response.text()
					console.log('Статус ответа:', response.status)
					console.log('Текст ответа:', responseText)

					if (response.ok) {
						console.log('Успешно добавлено в избранное')
					} else {
						throw new Error(`Ошибка HTTP: ${response.status}, ${responseText}`)
					}
				} catch (error: unknown) {
					console.error(
						'Ошибка при добавлении в избранное:',
						error instanceof Error ? error.message : error
					)

					// Отменяем оптимистичное обновление
					setSheetMusic(
						sheetMusic.map(item =>
							item.id === id ? { ...item, isFavorite } : item
						)
					)

					// Более дружелюбное сообщение об ошибке
					alert(
						'Не удалось добавить в избранное. Пожалуйста, попробуйте позже.'
					)
				}
			} else {
				// Удаляем из избранного - тоже используем fetch вместо api.delete
				console.log(
					'Отправка DELETE запроса для удаления из избранного:',
					sheetMusicId
				)
				try {
					const token = localStorage.getItem('jwtToken') || Cookies.get('token')
					const response = await fetch(`/api/favorites?id=${sheetMusicId}`, {
						method: 'DELETE',
						headers: {
							Authorization: `Bearer ${token}`,
						},
					})

					const responseText = await response.text()
					console.log('Статус ответа при удалении:', response.status)
					console.log('Текст ответа при удалении:', responseText)

					if (response.ok) {
						console.log('Успешно удалено из избранного')
					} else {
						throw new Error(`Ошибка HTTP: ${response.status}, ${responseText}`)
					}
				} catch (error: unknown) {
					console.error(
						'Ошибка при удалении из избранного:',
						error instanceof Error ? error.message : error
					)
					// Отменяем оптимистичное обновление
					setSheetMusic(
						sheetMusic.map(item =>
							item.id === id ? { ...item, isFavorite } : item
						)
					)

					// Более дружелюбное сообщение об ошибке
					alert(
						'Не удалось удалить из избранного. Пожалуйста, попробуйте позже.'
					)
				}
			}
		} catch (err: unknown) {
			console.error(
				'Общая ошибка при управлении избранным:',
				err instanceof Error ? err.message : err
			)
			// Отменяем оптимистичное обновление в случае ошибки
			setSheetMusic(
				sheetMusic.map(item =>
					item.id === id ? { ...item, isFavorite } : item
				)
			)
			alert(
				'Произошла ошибка при изменении статуса избранного. Пожалуйста, попробуйте еще раз.'
			)
		}
	}

	return (
		<div className='bg-gray-50 min-h-screen'>
			<div className='container mx-auto px-4 py-8'>
				<div className='max-w-6xl mx-auto'>
					{/* Поиск и фильтры */}
					<div className='flex flex-col md:flex-row gap-4 mb-8'>
						{/* Поисковая строка */}
						<div className='relative flex-1'>
							<input
								type='text'
								placeholder='Күй немесе әннің атауын іздеу...'
								value={searchQuery}
								onChange={e => {
									setSearchQuery(e.target.value)
									setPage(1)
								}}
								className='w-full px-5 py-3 bg-transparent border border-[#2A3F54]/50 rounded-[50px] text-[#2A3F54]/50 text-[20px] focus:outline-none'
							/>
							<button className='absolute right-4 top-1/2 transform -translate-y-1/2'>
								<svg
									width='24'
									height='24'
									viewBox='0 0 24 24'
									fill='none'
									xmlns='http://www.w3.org/2000/svg'
								>
									<path
										d='M11 19C15.4183 19 19 15.4183 19 11C19 6.58172 15.4183 3 11 3C6.58172 3 3 6.58172 3 11C3 15.4183 6.58172 19 11 19Z'
										stroke='#2A3F54'
										strokeOpacity='0.5'
										strokeWidth='2'
										strokeLinecap='round'
										strokeLinejoin='round'
									/>
									<path
										d='M21 21L16.65 16.65'
										stroke='#2A3F54'
										strokeOpacity='0.5'
										strokeWidth='2'
										strokeLinecap='round'
										strokeLinejoin='round'
									/>
								</svg>
							</button>
						</div>
						{user && (
							<Link
								href='/sheet-music/upload'
								className='inline-flex items-center justify-center bg-[#E4B87C]  text-[#2A3F54] font-medium py-2 px-8 rounded-[50px] transition duration-200 mb-4 md:mb-0'
							>
								<svg
									width='24'
									height='24'
									viewBox='0 0 24 24'
									fill='none'
									xmlns='http://www.w3.org/2000/svg'
									className='h-5 w-5 mr-2'
								>
									<path
										d='M9 16H15V10H19L12 3L5 10H9V16ZM5 18H19V20H5V18Z'
										fill='#2A3F54'
									/>
								</svg>
								Жүктеу
							</Link>
						)}
						{/* Фильтр по сложности */}

						{/* Кнопка скачивания */}
					</div>

					{/* Сообщение об ошибке */}
					{error && (
						<div className='bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6'>
							{error}
						</div>
					)}

					{/* Индикатор загрузки */}
					{loading && (
						<div className='flex justify-center py-12'>
							<div className='animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#2A3F54]'></div>
						</div>
					)}

					{/* Карточки с нотами */}
					{!loading && sheetMusic.length === 0 ? (
						<div className='bg-white shadow-md rounded-lg p-8 text-center'>
							<p className='text-lg text-gray-600'>
								Нет доступных нот по заданным критериям.
							</p>
						</div>
					) : (
						<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
							{sheetMusic.map(item => (
								<div
									key={item.id}
									className='bg-white rounded-[20px] shadow-md overflow-hidden p-6 flex flex-col'
								>
									<h3 className='text-[20px] font-bold text-[#2A3F54] mb-1'>
										{item.title}
									</h3>
									<p className='text-[17px] text-[#2A3F54] mb-4'>
										{item.composer || item.authorName}
									</p>

									{/* Действия */}
									<div className='mt-auto flex justify-between items-center'>
										<div className='flex gap-2'>
											<Link
												href={`/sheet-music/${item.id}`}
												className='px-4 py-2 bg-[#2A3F54] text-white text-[15px] font-medium rounded-[20px] flex items-center justify-center'
											>
												Қарау
											</Link>
										</div>

										<button
											onClick={() =>
												handleFavoriteToggle(item.id, Boolean(item.isFavorite))
											}
											className={`w-10 h-10 bg-[#2A3F54] rounded-[10px] flex items-center justify-center ${
												!user && 'opacity-50 cursor-not-allowed'
											}`}
											title={
												user
													? item.isFavorite
														? 'Удалить из избранного'
														: 'Добавить в избранное'
													: 'Войдите, чтобы добавить в избранное'
											}
											disabled={!user}
										>
											<svg
												width='24'
												height='24'
												viewBox='0 0 24 24'
												fill={
													(item.isFavorite || item.is_favorite) && user
														? 'white'
														: 'none'
												}
												stroke='white'
												strokeWidth='2'
												strokeLinecap='round'
												strokeLinejoin='round'
												xmlns='http://www.w3.org/2000/svg'
											>
												<path d='M20.84 4.61C20.3292 4.099 19.7228 3.69364 19.0554 3.41708C18.3879 3.14052 17.6725 2.99817 16.95 2.99817C16.2275 2.99817 15.5121 3.14052 14.8446 3.41708C14.1772 3.69364 13.5708 4.099 13.06 4.61L12 5.67L10.94 4.61C9.9083 3.57831 8.50903 2.99871 7.05 2.99871C5.59096 2.99871 4.19169 3.57831 3.16 4.61C2.1283 5.6417 1.54871 7.04097 1.54871 8.5C1.54871 9.95903 2.1283 11.3583 3.16 12.39L4.22 13.45L12 21.23L19.78 13.45L20.84 12.39C21.351 11.8792 21.7563 11.2728 22.0329 10.6054C22.3095 9.93789 22.4518 9.22248 22.4518 8.5C22.4518 7.77752 22.3095 7.0621 22.0329 6.39464C21.7563 5.72718 21.351 5.12075 20.84 4.61Z' />
											</svg>
										</button>
									</div>
								</div>
							))}
						</div>
					)}

					{/* Пагинация */}
					<div className='flex justify-center mt-8 gap-4'>
						<button
							disabled={page === 1}
							onClick={() => setPage(page - 1)}
							className='px-4 py-2 rounded bg-gray-200 text-gray-700 disabled:opacity-50'
						>
							Назад
						</button>
						<span className='px-4 py-2'>{page}</span>
						<button
							disabled={sheetMusic.length < limit}
							onClick={() => setPage(page + 1)}
							className='px-4 py-2 rounded bg-gray-200 text-gray-700 disabled:opacity-50'
						>
							Вперёд
						</button>
					</div>
				</div>
			</div>
		</div>
	)
}
