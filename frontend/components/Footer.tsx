import Image from 'next/image'

const Footer = () => {
	return (
		<footer className='bg-[#2A3F54] text-white py-6'>
			<div className='container mx-auto px-4'>
				<div className='flex flex-col md:flex-row justify-between items-center gap-6'>
					{/* Лого SHAMS */}
					<div className='flex items-center'>
						<Image
							src='/images/logo/shams-logo.svg'
							alt='SHAMS logo'
							width={64}
							height={64}
							className='ml-2'
						/>
					</div>

					{/* Copyright */}
					<div className='text-white text-sm order-3 md:order-2'>
						Copyright © {new Date().getFullYear()} SHAMS. All Right Reserved.
					</div>

					{/* Address and Social */}
					<div className='flex flex-col items-end order-2 md:order-3'>
						<div className='flex items-center justify-end gap-2 text-white text-sm text-right'>
							<Image
								src='/images/icons/map-point.svg'
								alt='Location'
								width={16}
								height={16}
							/>
							<div>
								SDU University, Kaskelen,
								<br />
								Qazaqstan
							</div>
						</div>
					</div>
				</div>
			</div>
		</footer>
	)
}

export default Footer
