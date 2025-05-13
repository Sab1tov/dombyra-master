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
						<div className='flex items-center bg-white bg-opacity-20 border border-white border-opacity-50 rounded-full overflow-hidden'>
							<div className='relative'>
								<input
									ref={searchInputRef}
									type='text'
									placeholder='Поиск...'
									className='w-full py-2 px-4 pl-10 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#E4B87C]'
									value={searchQuery}
									onChange={e => setSearchQuery(e.target.value)}
								/>
								<svg
									xmlns='http://www.w3.org/2000/svg'
									className='absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400'
									fill='none'
									viewBox='0 0 24 24'
									stroke='currentColor'
								>
									<path
										strokeLinecap='round'
										strokeLinejoin='round'
										strokeWidth={2}
										d='M21 21l-4.35-4.35M16.65 16.65A7.5 7.5 0 1116.65 2.5a7.5 7.5 0 010 14.15z'
									/>
								</svg>
							</div>
							<button
								type='submit'
								className='px-4 sm:px-6 py-3 sm:py-4'
								aria-label='Поиск'
								onClick={focusSearchInput}
							>
								<Image
									src='/images/banner/search-icon.svg'
									alt='Поиск'
									width={20}
									height={20}
									className='opacity-50'
								/>
							</button>
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
