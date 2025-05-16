'use client'

import { useEffect, useRef, useState } from 'react'

export default function TunerPage() {
	const [isLoading, setIsLoading] = useState(true)
	const [aspectRatio, setAspectRatio] = useState(0) // Соотношение сторон экрана
	const [screenSize, setScreenSize] = useState({ width: 0, height: 0 })
	const iframeRef = useRef<HTMLIFrameElement>(null)
	const containerRef = useRef<HTMLDivElement>(null)

	// Определяем размеры экрана и соотношение сторон
	useEffect(() => {
		const updateScreenDimensions = () => {
			const width = window.innerWidth
			const height = window.innerHeight
			const ratio = width / height

			setScreenSize({ width, height })
			setAspectRatio(ratio)

			console.log(
				`Размеры экрана: ${width}x${height}, соотношение сторон: ${ratio.toFixed(
					2
				)}`
			)
		}

		// Проверяем при загрузке страницы
		updateScreenDimensions()

		// Проверяем при изменении размера окна
		window.addEventListener('resize', updateScreenDimensions)
		window.addEventListener('orientationchange', updateScreenDimensions)

		return () => {
			window.removeEventListener('resize', updateScreenDimensions)
			window.removeEventListener('orientationchange', updateScreenDimensions)
		}
	}, [])

	// Получаем настройки отображения на основе размеров экрана
	const getViewportSettings = () => {
		const { width, height } = screenSize
		const isMobile = width < 768
		const isSmallPhone = width <= 375
		const isLargePhone = width >= 428 && width < 768
		const isTablet = width >= 768 && width < 1024
		const isLandscape = aspectRatio > 1

		// Базовые пропорциональные настройки
		const settings = {
			containerHeight: Math.min(height * 0.7, 700), // 70% высоты экрана, но не более 700px
			minHeight: Math.max(350, height * 0.5), // Минимум 350px или 50% высоты экрана
			topOffset: -50, // Базовое смещение сверху
			sideOffset: Math.round(width * 0.05), // 5% ширины экрана на смещение по бокам
			widthBoost: Math.round(width * 0.1), // 10% дополнительной ширины
			scale: 1,
		}

		// Корректировки для разных типов устройств
		if (isSmallPhone) {
			// Для маленьких телефонов (iPhone SE и подобные)
			settings.topOffset = Math.round(-height * 0.1) // Смещение сверху 10% высоты экрана
			settings.scale = Math.min(1.05, 1 + (375 - width) / 1000) // Больше масштаб для маленьких экранов
			settings.containerHeight = Math.min(height * 0.65, 450)
		} else if (isMobile && !isLandscape) {
			// Для телефонов в портретной ориентации
			settings.topOffset = Math.round(-height * 0.12) // Смещение сверху 12% высоты экрана
			settings.scale = 1.02
			settings.widthBoost = Math.round(width * 0.15) // 15% дополнительной ширины
		} else if (isMobile && isLandscape) {
			// Для телефонов в альбомной ориентации
			settings.topOffset = Math.round(-height * 0.15) // Большее смещение в альбомном режиме
			settings.containerHeight = Math.min(height * 0.8, 500)
		} else if (isTablet && !isLandscape) {
			// Для планшетов в портретной ориентации
			settings.topOffset = Math.round(-height * 0.09)
			settings.scale = 1.08
			settings.containerHeight = Math.min(height * 0.6, 600)
		} else if (isTablet && isLandscape) {
			// Для планшетов в альбомной ориентации
			settings.topOffset = Math.round(-height * 0.12)
			settings.scale = 1.05
			settings.containerHeight = Math.min(height * 0.7, 550)
		} else if (isLargePhone) {
			// Для больших телефонов (iPhone Pro Max и подобные)
			settings.topOffset = Math.round(-height * 0.13) // Смещение сверху 13% высоты экрана
			settings.scale = 1.04
			settings.containerHeight = Math.min(height * 0.65, 550)
		} else {
			// Для настольных компьютеров
			settings.topOffset = -50
			settings.sideOffset = 50
			settings.widthBoost = 100
			settings.scale = 1
			settings.containerHeight = Math.min(height * 0.7, 700)
		}

		// Возвращаем итоговые настройки с форматированием для CSS
		return {
			height: `${Math.round(settings.containerHeight)}px`,
			minHeight: `${Math.round(settings.minHeight)}px`,
			width: 'calc(100% + ' + settings.widthBoost + 'px)',
			top: `${settings.topOffset}px`,
			left: `${Math.round(-settings.sideOffset / 2)}px`, // Половина смещения влево для центрирования
			scale: settings.scale,
		}
	}

	// Получаем настройки для текущего размера экрана
	const viewportSettings = getViewportSettings()

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
							.v-dialog, .v-overlay, .v-dialog__content, .v-dialog__scrim,
							.v-overlay__content, .v-card, .v-card-title, .v-card-text,
							.v-card-actions, .v-btn:contains("OK"), button:contains("OK") { 
								display: none !important; 
								opacity: 0 !important;
								pointer-events: none !important;
								visibility: hidden !important;
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
								const buttons = iframeDoc.querySelectorAll('button')
								const okButton = Array.from(buttons).find(
									btn =>
										btn.textContent?.includes('OK') ||
										btn.innerHTML?.includes('OK')
								)

								if (okButton) {
									okButton.click()
									console.log(
										'Автоматически закрыто диалоговое окно приветствия'
									)
								} else {
									// Альтернативный метод: создаем обработку диалогов напрямую

									// Найти диалоговое окно
									const dialogs = iframeDoc.querySelectorAll(
										'.v-dialog, .v-overlay, [role="dialog"]'
									)
									dialogs.forEach(dialog => {
										if (dialog instanceof HTMLElement) {
											dialog.style.display = 'none'
											dialog.style.visibility = 'hidden'
										}
									})
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
								height: viewportSettings.height,
								minHeight: viewportSettings.minHeight,
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
									width: viewportSettings.width,
									left: viewportSettings.left,
									top: viewportSettings.top,
									pointerEvents: 'auto',
									overflow: 'hidden',
									transform: `scale(${viewportSettings.scale})`,
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
