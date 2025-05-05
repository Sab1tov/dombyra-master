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
		<section className='relative h-[600px] w-full overflow-hidden'>
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
			<div className='relative z-10 container mx-auto px-24 h-full flex flex-col justify-center'>
				<div className='max-w-2xl'>
					<h1 className='text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight'>
						Домбыраға арналған нота
						<br />
						жинағы
					</h1>
					<p className='text-lg md:text-xl lg:text-2xl text-white text-opacity-80 mb-8'>
						Домбыра үйренушілерге арналған интерактивті платформа
					</p>

					{/* Поиск */}
					<form
						onSubmit={handleSearch}
						className='relative max-w-xl opacity-50 outline-white outline-2 outline-offset-1 rounded-full'
						onClick={focusSearchInput}
					>
						<div className='flex items-center bg-white bg-opacity-20 border border-white border-opacity-50 rounded-full overflow-hidden'>
							<input
								ref={searchInputRef}
								type='text'
								placeholder='Күй немесе әннің атауын іздеу...'
								className='flex-grow bg-transparent text-black placeholder-white placeholder-opacity-50 pl-6 py-4 focus:outline-none'
								value={searchQuery}
								onChange={e => setSearchQuery(e.target.value)}
							/>
							<button
								type='submit'
								className='px-6 py-4'
								aria-label='Поиск'
								onClick={focusSearchInput}
							>
								<Image
									src='/images/banner/search-icon.svg'
									alt='Поиск'
									width={24}
									height={24}
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
						width={300}
						height={500}
						className='m-32'
					/>
				</div>
			</div>
		</section>
	)
}

export default HomeBanner
