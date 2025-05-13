import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'

const HomeBanner = () => {
	const router = useRouter()
	const [searchQuery, setSearchQuery] = useState('')
	const searchInputRef = useRef<HTMLInputElement>(null)

	const handleSearch = (e: React.FormEvent) => {
		e.preventDefault()
		if (searchQuery.trim()) {
			router.push(`/sheet-music?search=${encodeURIComponent(searchQuery)}`)
		}
	}

	const focusSearchInput = () => {
		if (searchInputRef.current) {
			searchInputRef.current.focus()
		}
	}

	return (
		<section className='relative min-h-[400px] sm:min-h-[500px] md:h-[600px] w-full overflow-hidden'>
			{/* Фоновое изображение с наложением */}
			<div className='absolute inset-0'>
				<Image
					src='/images/banner/banner-bg.jpg'
					alt='Домбыра'
					fill
					priority
					className='object-cover'
				/>
				<div className='absolute inset-0 bg-[#2A3F54] opacity-50'></div>
			</div>

			{/* Контент баннера */}
			<div className='relative z-10 container mx-auto px-4 sm:px-8 md:px-16 lg:px-24 h-full flex flex-col justify-center'>
				<div className='max-w-2xl'>
					<h1 className='text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight'>
						Домбыраға арналған нота
						<br className='hidden sm:block' />
						жинағы
					</h1>
					<p className='text-base sm:text-lg md:text-xl lg:text-2xl text-white text-opacity-80 mb-6 sm:mb-8'>
						Домбыра үйренушілерге арналған интерактивті платформа
					</p>

					{/* Поиск */}
					<form
						onSubmit={handleSearch}
						className='relative max-w-xl opacity-50 outline-white outline-2 outline-offset-1 rounded-full'
						onClick={focusSearchInput}
					>
						<div className='relative bg-white bg-opacity-20 border border-white border-opacity-50 rounded-full overflow-hidden'>
							<input
								ref={searchInputRef}
								type='text'
								placeholder='Күй немесе әннің атауын іздеу...'
								className='w-full bg-transparent text-black placeholder-white placeholder-opacity-50 px-4 py-3 sm:pl-6 sm:py-4 pr-14 focus:outline-none text-sm sm:text-base'
								value={searchQuery}
								onChange={e => setSearchQuery(e.target.value)}
							/>

							{/* Иконка поиска как встроенный SVG */}
							<div className='absolute right-3 top-1/2 transform -translate-y-1/2 z-10'>
								<svg
									width='20'
									height='20'
									viewBox='0 0 20 20'
									fill='none'
									xmlns='http://www.w3.org/2000/svg'
								>
									<path
										d='M9 17C13.4183 17 17 13.4183 17 9C17 4.58172 13.4183 1 9 1C4.58172 1 1 4.58172 1 9C1 13.4183 4.58172 17 9 17Z'
										stroke='#000000'
										strokeWidth='2'
										strokeLinecap='round'
										strokeLinejoin='round'
									/>
									<path
										d='M19 19L14.65 14.65'
										stroke='#000000'
										strokeWidth='2'
										strokeLinecap='round'
										strokeLinejoin='round'
									/>
								</svg>
							</div>
						</div>
					</form>
				</div>

				{/* Изображение домбры справа */}
				<div className='absolute right-0 bottom-0 hidden lg:block'>
					<Image
						src='/images/banner/dombra-image.svg'
						alt='Домбыра'
						width={200}
						height={350}
						className='m-16 xl:m-32 xl:w-[300px] xl:h-[500px]'
					/>
				</div>
			</div>
		</section>
	)
}

export default HomeBanner
