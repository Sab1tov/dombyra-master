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
						<div className='relative flex items-center bg-white bg-opacity-20 border border-white border-opacity-50 rounded-full overflow-hidden'>
							<input
								ref={searchInputRef}
								type='text'
								placeholder='Күй немесе әннің атауын іздеу...'
								className='flex-grow w-full bg-transparent text-black placeholder-white placeholder-opacity-50 px-4 py-3 sm:pl-6 sm:py-4 pr-12 focus:outline-none text-sm sm:text-base'
								value={searchQuery}
								onChange={e => setSearchQuery(e.target.value)}
							/>
							<button
								type='submit'
								className='absolute right-0 top-0 bottom-0 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-center'
								aria-label='Поиск'
								onClick={focusSearchInput}
							>
								<svg
									width='20'
									height='20'
									viewBox='0 0 24 24'
									fill='none'
									xmlns='http://www.w3.org/2000/svg'
									className='sm:w-6 sm:h-6 opacity-50'
								>
									<path
										d='M11 19C15.4183 19 19 15.4183 19 11C19 6.58172 15.4183 3 11 3C6.58172 3 3 6.58172 3 11C3 15.4183 6.58172 19 11 19Z'
										stroke='white'
										strokeWidth='2'
										strokeLinecap='round'
										strokeLinejoin='round'
									/>
									<path
										d='M21 21L16.65 16.65'
										stroke='white'
										strokeWidth='2'
										strokeLinecap='round'
										strokeLinejoin='round'
									/>
								</svg>
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
