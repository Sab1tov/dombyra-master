'use client'

import { useEffect, useRef, useState } from 'react'

export default function TunerPage() {
	const [isLoading, setIsLoading] = useState(true)
	const [isMobile, setIsMobile] = useState(false)
	const iframeRef = useRef<HTMLIFrameElement>(null)
	const containerRef = useRef<HTMLDivElement>(null)

	// Определяем, является ли устройство мобильным
	useEffect(() => {
		const checkIsMobile = () => {
			setIsMobile(window.innerWidth < 768)
		}

		// Проверяем при загрузке страницы
		checkIsMobile()

		// Проверяем при изменении размера окна
		window.addEventListener('resize', checkIsMobile)

		return () => {
			window.removeEventListener('resize', checkIsMobile)
		}
	}, [])

	// Отслеживаем загрузку iframe
	const handleIframeLoad = () => {
		setIsLoading(false)

		// Применяем скрипт для скрытия верхней части сайта после загрузки iframe
		setTimeout(() => {
			if (iframeRef.current) {
				try {
					// Попытка получить доступ к содержимому iframe если это возможно
					const iframeDoc =
						iframeRef.current.contentDocument ||
						iframeRef.current.contentWindow?.document

					if (iframeDoc) {
						// Если успешно получили доступ, можем скрыть элементы прямо в iframe
						const style = iframeDoc.createElement('style')
						style.textContent = `
							/* Глобальное отключение прокрутки */
							html, body { 
								overflow: hidden !important;
								height: 100% !important;
								max-height: 100% !important;
								position: fixed !important;
								width: 100% !important;
								padding-top: 0 !important;
								margin: 0 !important;
							}
							
							/* Скрываем все элементы управления навигацией */
							header, nav, .header, .navbar, .top-bar, 
							.navigation, .menu, .footer, .sidebar { 
								display: none !important; 
							}
							
							/* Скрываем приветственное сообщение */
							.v-dialog, .v-overlay, .v-dialog__content, .v-dialog__scrim { 
								display: none !important; 
								opacity: 0 !important;
								pointer-events: none !important;
							}
							
							/* Отключаем скролл во всех контейнерах */
							div, section, article, main, aside {
								overflow: hidden !important;
								max-height: none !important;
							}
							
							/* Отключаем полосы прокрутки */
							::-webkit-scrollbar {
								display: none !important;
								width: 0 !important;
								height: 0 !important;
							}
							
							* {
								-ms-overflow-style: none !important;
								scrollbar-width: none !important;
							}
						`
						iframeDoc.head.appendChild(style)

						// Отключаем возможность прокрутки через JavaScript
						iframeDoc.body.style.overflow = 'hidden'
						iframeDoc.documentElement.style.overflow = 'hidden'
						iframeDoc.body.style.position = 'fixed'
						iframeDoc.documentElement.style.position = 'fixed'

						// Дополнительный код: пытаемся автоматически закрыть приветственное диалоговое окно
						setTimeout(() => {
							try {
								// Поиск и клик по кнопке OK
								const okButton =
									iframeDoc.querySelector('button:contains("OK")') ||
									iframeDoc.querySelector('.v-btn:contains("OK")') ||
									iframeDoc.querySelector('.v-dialog button') ||
									iframeDoc.getElementById('ok-button')

								if (okButton && okButton instanceof HTMLElement) {
									okButton.click()
									console.log(
										'Автоматически закрыто диалоговое окно приветствия'
									)
								}
							} catch (e) {
								console.log(
									'Не удалось закрыть диалоговое окно автоматически',
									e
								)
							}
						}, 500)

						// Отключаем инерционную прокрутку на мобильных устройствах
						// @ts-expect-error - Используется нестандартное свойство webkit для мобильных устройств
						iframeDoc.body.style.webkitOverflowScrolling = 'auto'

						// Устанавливаем фиксированные размеры для основного контейнера контента
						const mainContentElements = iframeDoc.querySelectorAll(
							'main, #content, #main, .main-content'
						)
						mainContentElements.forEach(el => {
							if (el instanceof HTMLElement) {
								el.style.overflow = 'hidden'
								el.style.maxHeight = '100%'
								el.style.position = 'relative'
							}
						})
					}
				} catch {
					// При ошибке доступа к iframe из-за same-origin policy
					console.log(
						'Невозможно напрямую манипулировать содержимым iframe из-за ограничений безопасности'
					)
				}
			}
		}, 1000)
	}

	return (
		<div className='bg-[#FBF7F4] min-h-screen py-12'>
			<div className='container mx-auto px-4 max-w-5xl'>
				<h1 className='text-3xl sm:text-5xl md:text-6xl lg:text-[80px] font-bold text-center text-[#2A3F54] mb-8'>
					Домбыра тюнері
				</h1>

				<div className='bg-white rounded-[30px] shadow-md p-4 sm:p-6 md:p-8 mb-8'>
					<div className='text-center mb-8'>
						<p className='text-base sm:text-lg md:text-xl lg:text-[25px] text-[#2A3F54] mb-6'>
							Домбыраңызды дұрыс күйге келтіру үшін микрофонды қосыңыз және
							келесі қадамдарды орындаңыз.
						</p>
					</div>

					{/* Лоадер пока iframe загружается */}
					{isLoading && (
						<div className='flex justify-center items-center py-20'>
							<div className='animate-spin rounded-full h-16 w-16 border-t-4 border-[#E4B87C] border-solid'></div>
							<span className='ml-4 text-lg text-[#2A3F54]'>Жүктеу...</span>
						</div>
					)}

					{/* iframe с внешним тюнером, обрезаем верхнюю часть */}
					<div
						className={`relative ${
							isLoading ? 'h-0 overflow-hidden' : 'h-auto'
						}`}
					>
						<div
							ref={containerRef}
							className='iframe-container overflow-hidden rounded-[20px] relative'
							style={{
								height: isMobile ? '450px' : 'min(85vh, 700px)',
								minHeight: isMobile ? '400px' : '350px',
								overflow: 'hidden',
								width: '100%',
							}}
						>
							<iframe
								ref={iframeRef}
								src='https://qiuxiang.github.io/tuner/app/'
								className='w-full absolute border-0'
								style={{
									height: '100vh',
									width: isMobile ? 'calc(100% + 50px)' : 'calc(100% + 100px)',
									left: isMobile ? '-25px' : '-50px',
									top: isMobile ? '-95px' : '-55px',
									pointerEvents: 'auto',
									overflow: 'hidden',
									transform: isMobile ? 'scale(1.02)' : 'scale(1)',
									transformOrigin: 'center center',
								}}
								scrolling='no'
								onLoad={handleIframeLoad}
								title='Онлайн тюнер для домбры'
								allow='microphone'
							></iframe>
						</div>
					</div>

					<div className='mt-8 p-4 bg-[#f7f2ed] rounded-lg overflow-y-auto text-sm'>
						<p className='font-semibold mb-1 text-[#2A3F54]'>Ескерту:</p>
						<p className='text-[#2A3F54]'>
							Тюнер жұмыс істеу үшін микрофонға рұқсат беруіңіз керек. Браузер
							сұрағанда &ldquo;Рұқсат ету&rdquo; түймесін басыңыз.
						</p>
					</div>
				</div>

				<div className='bg-white rounded-[30px] shadow-md p-8'>
					<h2 className='text-3xl font-bold text-[#2A3F54] mb-4'>
						Домбыраны күйлеу туралы нұсқаулар
					</h2>

					<div className='space-y-4 text-lg text-[#2A3F54]'>
						<p>
							<strong>1. Дұрыс ноталар:</strong> Домбыраның екі ішегін G3 және
							D3 нотасына күйлеу қажет (Яғни, 196.00 Гц және 146.83 Гц).
						</p>
						<p>
							<strong>2. Бірінші ішек (D3):</strong> Домбыраның жоғарғы ішегі
							сол малой октавасы (D3) нотасына күйленеді.
						</p>
						<p>
							<strong>3. Екінші ішек (G3):</strong> Домбыраның төменгі ішегі ре
							малой октавасы (G3) нотасына күйленеді.
						</p>
						<p>
							<strong>4. Күйлеу:</strong> Егер ішек тым төмен дыбысталса, кілтті
							сәл бұрап ішекті тартыңыз. Егер тым жоғары дыбысталса, ішекті
							босатыңыз.
						</p>
						<p>
							<strong>5. Кезекпен күйлеу:</strong> Домбыраның ішектерін
							бір-бірлеп, әр ішекті жеке күйлеңіз.
						</p>
					</div>
				</div>
			</div>
		</div>
	)
}
