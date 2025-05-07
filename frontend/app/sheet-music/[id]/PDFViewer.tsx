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

	// Проверяем, что компонент рендерится на клиенте
	useEffect(() => {
		setIsClient(true)
		// Определяем мобильное устройство
		if (typeof window !== 'undefined') {
			const userAgent = navigator.userAgent || navigator.vendor || window.opera
			setIsMobile(
				/android|iphone|ipad|ipod|opera mini|iemobile|mobile/i.test(userAgent)
			)
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
			<div className='flex justify-center items-center min-h-[800px]'>
				<div className='animate-spin rounded-full h-16 w-16 border-b-2 border-gray-900'></div>
			</div>
		)
	}

	// Создаем URL с параметрами для оптимального отображения
	const pdfUrlWithParams = `${pdfUrl}#view=FitH&toolbar=1&navpanes=0`

	return (
		<div className='relative flex flex-col items-center w-full mb-8'>
			{/* Кнопка для мобильных устройств */}
			{isMobile && (
				<a
					href={pdfUrl}
					target='_blank'
					rel='noopener noreferrer'
					className='mb-4 px-4 py-2 bg-blue-600 text-white rounded shadow font-semibold text-base hover:bg-blue-700 transition-colors'
					style={{ zIndex: 20 }}
				>
					Ашу басқа қолданбада
				</a>
			)}
			{loading && (
				<div className='absolute top-0 left-0 right-0 bottom-0 flex justify-center items-center bg-white bg-opacity-80 z-10 min-h-[800px]'>
					<div className='animate-spin rounded-full h-16 w-16 border-b-2 border-gray-900'></div>
				</div>
			)}
			<iframe
				src={pdfUrlWithParams}
				className='w-full border-0 shadow-lg rounded-md'
				style={{
					height: '800px',
					maxHeight: '80vh',
				}}
				onLoad={handleIframeLoad}
				title='PDF документ'
				frameBorder='0'
				scrolling='auto'
				allowFullScreen
			/>
		</div>
	)
}

export default PDFViewer
