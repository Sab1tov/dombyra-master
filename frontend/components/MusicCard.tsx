import Image from 'next/image'
import Link from 'next/link'

interface MusicCardProps {
	id: number
	title: string
	author: string
}

const MusicCard: React.FC<MusicCardProps> = ({ id, title, author }) => {
	return (
		<div className='bg-[#FBF7F4] rounded-[20px] overflow-hidden transition-transform duration-300 hover:scale-105 cursor-pointer'>
			<div className='p-4'>
				<div className='flex mb-4'>
					<Image
						src='/images/icons/home-page-icons/section-3/dombra.svg'
						alt='Dombra icon'
						width={50}
						height={50}
					/>
					<div className='p-6'>
						<h3 className='text-[20px] font-bold text-[#2A3F54] mb-2'>
							{title}
						</h3>
						<p className='text-[17px] text-[#2A3F54] mb-4'>{author}</p>
					</div>
				</div>
				<div className='flex justify-end'>
					<Link href={`/sheet-music/${id}`}>
						<div className='bg-[#2A3F54] text-white rounded-[20px] py-[13px] px-[19px] inline-block'>
							<span className='text-[15px] font-medium'>Қарау</span>
						</div>
					</Link>
				</div>
			</div>
		</div>
	)
}

export default MusicCard
