'use client'

import { SheetMusicType } from '@/components/SheetMusicCard'
import api from '@/services/axiosInstance'
import { useAuthStore } from '@/store/authStore'
import Cookies from 'js-cookie'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

export default function SheetMusicPage() {
	const { user } = useAuthStore()
	const [page, setPage] = useState(1)
	const limit = 12
	const [hasNextPage, setHasNextPage] = useState(false)
	const [sheetMusic, setSheetMusic] = useState<SheetMusicType[]>([])
	const [filteredSheetMusic, setFilteredSheetMusic] = useState<
		SheetMusicType[]
	>([])
	const [loading, setLoading] = useState(true)
	const [favoritesLoaded, setFavoritesLoaded] = useState(false)
	const [favoriteIds, setFavoriteIds] = useState<number[]>([])
	const [error, setError] = useState<string | null>(null)

	// Фильтры
	const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all')
	const [searchQuery, setSearchQuery] = useState<string>('')
	const [showDifficultyDropdown, setShowDifficultyDropdown] = useState(false)

	// Загрузка избранных элементов пользователя
	useEffect(() => {
		const fetchFavorites = async () => {
			if (!user) {
				setFavoritesLoaded(true)
				return
			}

			try {
				const favoritesResponse = await api.get('/favorites')

				if (favoritesResponse.status === 200) {
					// Извлекаем только идентификаторы из ответа API
					const ids = favoritesResponse.data
						.map((item: any) =>
							typeof item.id === 'number'
								? item.id
								: item.sheet_music_id
								? Number(item.sheet_music_id)
								: Number(item.id)
						)
						.filter((id: any) => !isNaN(id))

					console.log('Загружены ID избранных элементов:', ids)
					setFavoriteIds(ids)

					// Обновляем статус избранного в существующих нотах
					if (sheetMusic.length > 0) {
						updateFavoritesStatus(ids)
					}
				}
			} catch (err) {
				console.error('Ошибка при загрузке избранного:', err)
			} finally {
				setFavoritesLoaded(true)
			}
		}

		fetchFavorites()
	}, [user])

	// Функция для обновления статуса избранного в карточках нот
	const updateFavoritesStatus = (favoriteIds: number[]) => {
		setSheetMusic(prevSheetMusic =>
			prevSheetMusic.map(item => ({
				...item,
				isFavorite: favoriteIds.includes(item.id),
			}))
		)
	}

	// Функция для загрузки нотных материалов (вынесена как useCallback)
	const fetchSheetMusic = useCallback(async () => {
		try {
			setLoading(true)
			setError(null)

			// Передаем searchQuery как параметр для серверного поиска
			const response = await api.get('/sheet-music', {
				params: {
					limit,
					page,
					search: searchQuery, // Добавляем параметр поиска для серверной фильтрации
				},
			})

			const processedData = response.data.map((item: SheetMusicType) => ({
				...item,
				isFavorite: favoritesLoaded
					? favoriteIds.includes(item.id)
					: item.isFavorite || item.is_favorite || false,
			}))

			setSheetMusic(processedData)
			setFilteredSheetMusic(processedData)
			setHasNextPage(processedData.length === limit)
			setLoading(false)
		} catch (err) {
			console.error('Ошибка при загрузке нот:', err)
			setError('Не удалось загрузить ноты. Пожалуйста, попробуйте позже.')
			setLoading(false)
		}
	}, [favoritesLoaded, page, searchQuery, limit, favoriteIds]) // Добавлен searchQuery в зависимости

	// Загрузка нотных материалов при изменении страницы или поискового запроса
	useEffect(() => {
		fetchSheetMusic()
	}, [fetchSheetMusic])

	// Фильтрация нот по сложности (локально)
	useEffect(() => {
		if (sheetMusic.length === 0) return

		let result = [...sheetMusic]

		// Фильтрация по сложности происходит на клиенте
		if (selectedDifficulty !== 'all') {
			result = result.filter(item => item.difficulty === selectedDifficulty)
		}

		// Сортируем по новизне
		result.sort(
			(a, b) =>
				new Date(b.createdAt || Date.now()).getTime() -
				new Date(a.createdAt || Date.now()).getTime()
		)

		setFilteredSheetMusic(result)
	}, [sheetMusic, selectedDifficulty])

	// При изменении поискового запроса сбрасываем страницу на первую
	useEffect(() => {
		setPage(1)
	}, [searchQuery])

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

			// Обновляем список избранных ID
			if (newIsFavorite) {
				setFavoriteIds(prev => [...prev, id])
			} else {
				setFavoriteIds(prev => prev.filter(itemId => itemId !== id))
			}

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
				} catch (error: any) {
					console.error(
						'Ошибка при добавлении в избранное:',
						error?.message || error
					)

					// Отменяем оптимистичное обновление
					setSheetMusic(
						sheetMusic.map(item =>
							item.id === id ? { ...item, isFavorite } : item
						)
					)

					// Отменяем изменение в списке избранных ID
					if (isFavorite) {
						setFavoriteIds(prev => [...prev, id])
					} else {
						setFavoriteIds(prev => prev.filter(itemId => itemId !== id))
					}

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
				} catch (error: any) {
					console.error(
						'Ошибка при удалении из избранного:',
						error?.message || error
					)
					// Отменяем оптимистичное обновление
					setSheetMusic(
						sheetMusic.map(item =>
							item.id === id ? { ...item, isFavorite } : item
						)
					)

					// Отменяем изменение в списке избранных ID
					if (isFavorite) {
						setFavoriteIds(prev => [...prev, id])
					} else {
						setFavoriteIds(prev => prev.filter(itemId => itemId !== id))
					}

					// Более дружелюбное сообщение об ошибке
					alert(
						'Не удалось удалить из избранного. Пожалуйста, попробуйте позже.'
					)
				}
			}
		} catch (err: any) {
			console.error(
				'Общая ошибка при управлении избранным:',
				err?.message || err
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

	// Заглушка для демонстрационных данных, если API недоступен
	const loadDemoData = () => {
		const demoSheetMusic: SheetMusicType[] = [
			{
				id: 1,
				title: 'Адай',
				description:
					'Ноты для домбры легендарного кюя "Адай", одного из самых известных произведений.',
				thumbnailUrl: '/images/demo/sheet1.jpg',
				fileUrl: '/files/demo/adai-sheet.pdf',
				instrument: 'dombyra',
				difficulty: 'intermediate',
				createdAt: '2023-11-10T12:45:00Z',
				downloads: 842,
				likes: 156,
				pages: 3,
				authorName: 'Құрманғазы',
				authorId: 1,
				tags: ['кюй', 'традиционная', 'классическая'],
			},
			{
				id: 2,
				title: 'Сарыарқа',
				description:
					'Кюй "Сарыарқа" для домбристов с подробными пояснениями и аппликатурой.',
				thumbnailUrl: '/images/demo/sheet2.jpg',
				fileUrl: '/files/demo/saryarka-beginner.pdf',
				instrument: 'dombyra',
				difficulty: 'advanced',
				createdAt: '2023-09-05T08:30:00Z',
				downloads: 1245,
				likes: 98,
				pages: 2,
				authorName: 'Құрманғазы',
				authorId: 3,
				tags: ['кюй', 'сложная'],
			},
			{
				id: 3,
				title: 'Балбырауын',
				description:
					'Кюй "Балбырауын" с техническими элементами для опытных исполнителей.',
				thumbnailUrl: '/images/demo/sheet3.jpg',
				fileUrl: '/files/demo/balbyrauin-advanced.pdf',
				instrument: 'dombyra',
				difficulty: 'intermediate',
				createdAt: '2023-10-22T16:15:00Z',
				downloads: 567,
				likes: 83,
				pages: 5,
				authorName: 'Құрманғазы',
				authorId: 4,
				tags: ['кюй', 'техничная'],
			},
			{
				id: 4,
				title: 'Көроғлы',
				description: 'Кюй "Көроғлы" для домбры, одна из известных композиций.',
				thumbnailUrl: '/images/demo/sheet1.jpg',
				fileUrl: '/files/demo/korogluu.pdf',
				instrument: 'dombyra',
				difficulty: 'advanced',
				createdAt: '2023-08-15T11:20:00Z',
				downloads: 423,
				likes: 65,
				pages: 4,
				authorName: 'Дәулеткерей',
				authorId: 5,
				tags: ['кюй', 'домбра'],
			},
			{
				id: 5,
				title: 'Ерке сылқым',
				description:
					'Кюй "Ерке сылқым" для домбры, начальный уровень сложности.',
				thumbnailUrl: '/images/demo/sheet2.jpg',
				fileUrl: '/files/demo/erke-sylkym.pdf',
				instrument: 'dombyra',
				difficulty: 'beginner',
				createdAt: '2023-07-10T14:25:00Z',
				downloads: 689,
				likes: 112,
				pages: 2,
				authorName: 'Дәулеткерей',
				authorId: 5,
				tags: ['кюй', 'домбра', 'легкая'],
			},
			{
				id: 6,
				title: 'Қосалқа',
				description: 'Кюй "Қосалқа" для домбры, средний уровень сложности.',
				thumbnailUrl: '/images/demo/sheet3.jpg',
				fileUrl: '/files/demo/kosalka.pdf',
				instrument: 'dombyra',
				difficulty: 'intermediate',
				createdAt: '2023-06-05T09:30:00Z',
				downloads: 542,
				likes: 76,
				pages: 3,
				authorName: 'Дәулеткерей',
				authorId: 5,
				tags: ['кюй', 'домбра', 'средняя'],
			},
		]

		// Убеждаемся, что все элементы имеют валидный fileUrl
		const processedData = demoSheetMusic.map(item => ({
			...item,
			fileUrl: item.fileUrl || '/files/demo/default.pdf', // Запасной путь, если URL не указан
		}))

		setSheetMusic(processedData)
		setFilteredSheetMusic(processedData)
		setLoading(false)
	}

	// Если загрузка затягивается, загружаем демо-данные
	useEffect(() => {
		if (loading) {
			const timer = setTimeout(() => {
				if (loading && sheetMusic.length === 0) {
					loadDemoData()
				}
			}, 3000) // Через 3 секунды загружаем демо-данные если API недоступен

			return () => clearTimeout(timer)
		}
	}, [loading, sheetMusic])

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
								onChange={e => setSearchQuery(e.target.value)}
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
					{loading && sheetMusic.length === 0 && (
						<div className='flex justify-center py-12'>
							<div className='animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#2A3F54]'></div>
						</div>
					)}

					{/* Карточки с нотами */}
					{!loading && filteredSheetMusic.length === 0 ? (
						<div className='bg-white shadow-md rounded-lg p-8 text-center'>
							<p className='text-lg text-gray-600'>
								Нет доступных нот по заданным критериям.
							</p>
						</div>
					) : (
						<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
							{filteredSheetMusic.map(item => (
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

					{/* Кнопки пагинации под списком нот */}
					<div className='flex justify-center mt-8 gap-4'>
						<button
							onClick={() => setPage(page - 1)}
							disabled={page === 1}
							className='px-6 py-2 rounded-[20px] bg-[#E4B87C] text-[#2A3F54] font-medium disabled:opacity-50 disabled:cursor-not-allowed'
						>
							Артқа
						</button>
						<button
							onClick={() => setPage(page + 1)}
							disabled={!hasNextPage}
							className='px-6 py-2 rounded-[20px] bg-[#E4B87C] text-[#2A3F54] font-medium disabled:opacity-50 disabled:cursor-not-allowed'
						>
							Алға
						</button>
					</div>
				</div>
			</div>
		</div>
	)
}
