'use client'

import { useEffect, useState } from 'react'

// Тип свойств для компонента
interface PDFViewerProps {
	pdfUrl: string
	pageNumber: number // Не используется в iframe, но сохраняем для совместимости
	scale: number // Не используется в iframe, но сохраняем для совместимости
	onLoadSuccess: ({ numPages }: { numPages: number }) => void
}

export const PDFViewer: React.FC<PDFViewerProps> = ({
	pdfUrl,
	onLoadSuccess,
}) => {
	const [isClient, setIsClient] = useState(false)
	const [loading, setLoading] = useState(true)
	const [isMobile, setIsMobile] = useState(false)
	const [screenHeight, setScreenHeight] = useState(800)

	// Проверяем, что компонент рендерится на клиенте и устанавливаем высоту экрана
	useEffect(() => {
		setIsClient(true)

		// Определяем мобильное устройство и устанавливаем размеры
		if (typeof window !== 'undefined') {
			const userAgent = navigator.userAgent || navigator.vendor
			const mobile =
				/android|iphone|ipad|ipod|opera mini|iemobile|mobile/i.test(userAgent)
			setIsMobile(mobile)

			// Устанавливаем высоту с учетом типа устройства
			setScreenHeight(window.innerHeight)

			// Добавляем слушатель для изменения размера окна
			const handleResize = () => {
				setScreenHeight(window.innerHeight)
			}

			window.addEventListener('resize', handleResize)
			return () => window.removeEventListener('resize', handleResize)
		}

		// Имитируем обратный вызов с одной страницей для совместимости
		if (onLoadSuccess) {
			onLoadSuccess({ numPages: 1 })
		}
	}, [onLoadSuccess])

	// Обработчик завершения загрузки iframe
	const handleIframeLoad = () => {
		setLoading(false)
	}

	// Не рендерим ничего на сервере
	if (!isClient) {
		return (
			<div className='flex justify-center items-center min-h-[300px] sm:min-h-[500px] md:min-h-[600px]'>
				<div className='animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900'></div>
			</div>
		)
	}

	// Создаем URL с параметрами для оптимального отображения
	const pdfUrlWithParams = `${pdfUrl}#view=FitH&toolbar=1&navpanes=0`

	// Вычисляем оптимальную высоту для iframe в зависимости от устройства
	const iframeHeight = isMobile
		? Math.min(screenHeight - 200, 500)
		: Math.min(screenHeight - 150, 800)

	return (
		<div className='relative flex flex-col items-center w-full mb-4 sm:mb-8'>
			{loading && (
				<div className='absolute top-0 left-0 right-0 bottom-0 flex justify-center items-center bg-white bg-opacity-80 z-10 min-h-[300px] sm:min-h-[500px]'>
					<div className='animate-spin rounded-full h-10 w-10 sm:h-16 sm:w-16 border-b-2 border-gray-900'></div>
				</div>
			)}
			<iframe
				src={pdfUrlWithParams}
				className='w-full border-0 shadow-lg rounded-md'
				style={{
					height: `${iframeHeight}px`,
					maxHeight: '80vh',
				}}
				onLoad={handleIframeLoad}
				title='PDF документ'
				frameBorder='0'
				scrolling='auto'
				allowFullScreen
			/>
			{/* Кнопка для мобильных устройств под iframe */}
			{isMobile && (
				<div className='flex justify-center w-full mt-4'>
					<a
						href={pdfUrl}
						target='_blank'
						rel='noopener noreferrer'
						className='px-4 py-2 bg-[#2A3F54] text-white rounded-[20px] shadow font-semibold text-sm sm:text-base hover:bg-opacity-90 transition-colors flex items-center'
						style={{ zIndex: 20 }}
					>
						<svg
							xmlns='http://www.w3.org/2000/svg'
							viewBox='0 0 24 24'
							fill='none'
							stroke='currentColor'
							strokeWidth='2'
							strokeLinecap='round'
							strokeLinejoin='round'
							className='w-4 h-4 mr-2'
						>
							<path d='M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6'></path>
							<polyline points='15 3 21 3 21 9'></polyline>
							<line x1='10' y1='14' x2='21' y2='3'></line>
						</svg>
						Басқа қолданбада ашу
					</a>
				</div>
			)}
		</div>
	)
}

export default PDFViewer
