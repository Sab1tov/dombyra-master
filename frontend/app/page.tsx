'use client'

import FeatureCard from '@/components/FeatureCard'
import HomeBanner from '@/components/HomeBanner'
import MusicCard from '@/components/MusicCard'
import { useEffect, useState } from 'react'

// Типы для данных с бэкенда
interface SheetMusic {
	id: number
	title: string
	author?: string
	composer?: string
}

export default function HomePage() {
	const [recentSheetMusic, setRecentSheetMusic] = useState<SheetMusic[]>([])
	const [loading, setLoading] = useState(true)

	// Загрузка данных для главной страницы
	useEffect(() => {
		const fetchContent = async () => {
			try {
				setLoading(true)

				// Получаем последние ноты с бэкенда
				const response = await fetch('/api/sheet-music?limit=3', {
					method: 'GET',
					headers: {
						'Content-Type': 'application/json',
					},
				})

				if (response.ok) {
					const data = await response.json()
					if (Array.isArray(data) && data.length > 0) {
						// Преобразуем данные в формат, подходящий для MusicCard
						const formattedData = data.map(item => ({
							id: item.id,
							title: item.title || 'Без названия',
							author: item.composer || item.owner_username || 'Неизвестный автор',
						}))
						setRecentSheetMusic(formattedData)
					} else {
						// Если данных нет, устанавливаем пустой массив
						setRecentSheetMusic([])
					}
				} else {
					console.error('Ошибка при загрузке нот:', response.status)
					setRecentSheetMusic([])
				}
			} catch (error) {
				console.error('Ошибка при загрузке контента:', error)
				setRecentSheetMusic([])
			} finally {
				setLoading(false)
			}
		}

		fetchContent()
	}, [])

	return (
		<main className='bg-[#FFFFFF]'>
			{/* Главный баннер */}
			<HomeBanner />

			{/* Секция "Наши возможности" */}
			<section className='bg-[#FBF7F4] py-16'>
				<div className='container mx-auto px-4'>
					<h2 className='text-[40px] font-bold text-[#2A3F54] mb-10'>
						Біздің мүмкіндіктер
					</h2>

					<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'>
						<FeatureCard
							title='Нота жинағы'
							description='Қазақтың дәстүрлі күйлері мен заманауи әндердің ноталары'
							iconSrc='/images/icons/home-page-icons/section-2/notes-icon.svg'
						/>
						<FeatureCard
							title='Тюнер'
							description='Домбыраны дұрыс күйге келтіруге арналған құрал'
							iconSrc='/images/icons/home-page-icons/section-2/tuner-icon.svg'
						/>

						<FeatureCard
							title='Прогресс жүйесі'
							description='Үйрену деңгейіңізді қадағалау және жетістіктер'
							iconSrc='/images/icons/home-page-icons/section-2/progress-icon.svg'
						/>

						<FeatureCard
							title='Нота жүктеу'
							description='Өз ноталарыңызды жүктеп, басқалармен бөлісу'
							iconSrc='/images/icons/home-page-icons/section-2/upload-icon.svg'
						/>
					</div>
				</div>
			</section>

			{/* Секция "Последние ноты" */}
			<section className='bg-white py-16'>
				<div className='container mx-auto px-4'>
					<h2 className='text-[40px] font-bold text-[#2A3F54] mb-10'>
						Соңғы қосылған ноталар
					</h2>

					{loading ? (
						<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
							{[1, 2, 3].map(i => (
								<div
									key={i}
									className='bg-white rounded-[20px] h-[400px] animate-pulse'
								></div>
							))}
						</div>
					) : recentSheetMusic.length > 0 ? (
						<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
							{recentSheetMusic.map(sheet => (
								<MusicCard
									key={sheet.id}
									id={sheet.id}
									title={sheet.title}
									author={sheet.author || ''}
								/>
							))}
						</div>
					) : (
						<p className='text-center text-gray-500 py-8'>
							Қазіргі уақытта ноталар жоқ
						</p>
					)}
				</div>
			</section>
		</main>
	)
}
