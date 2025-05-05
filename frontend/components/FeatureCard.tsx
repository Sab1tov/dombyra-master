import Image from 'next/image'

interface FeatureCardProps {
	title: string
	description: string
	iconSrc: string
}

const FeatureCard: React.FC<FeatureCardProps> = ({
	title,
	description,
	iconSrc,
}) => {
	return (
		<div className='bg-white rounded-[20px] p-[30px] flex flex-col gap-[10px] shadow-md transition-transform duration-300 hover:scale-105 cursor-pointer'>
			<div className='mb-4'>
				<div className='w-[60px] h-[60px] bg-[#2A3F54] flex items-center justify-center rounded-[10px]'>
					<Image src={iconSrc} alt={title} width={30} height={30} />
				</div>
			</div>
			<h3 className='text-[20px] font-bold text-[#2A3F54]'>{title}</h3>
			<p className='text-[15px] text-[#2A3F54] leading-[1.33]'>{description}</p>
		</div>
	)
}

export default FeatureCard
