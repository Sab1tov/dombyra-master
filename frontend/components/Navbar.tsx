'use client'

import { useAuthStore } from '@/store/authStore'
import { Menu } from '@headlessui/react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useModal } from './ModalManager'

const Navbar = () => {
	const pathname = usePathname()
	const { user, logout } = useAuthStore()
	const [isMenuOpen, setIsMenuOpen] = useState(false)
	const [mounted, setMounted] = useState(false)
	const { openModal } = useModal()

	// Предотвращаем гидратацию из-за несоответствия SSR и клиента
	useEffect(() => {
		setMounted(true)
	}, [])

	// Чтобы избежать ошибок гидратации
	if (!mounted) return null

	const handleLogout = () => {
		logout()
		// Закрываем меню после выхода
		setIsMenuOpen(false)
	}

	const menuItems = [
		{ title: 'Басты бет', path: '/' },
		{ title: 'Ноталар', path: '/sheet-music' },
		{ title: 'Тюнер', path: '/tuner' },
		{ title: 'Оқыту', path: '/videos' },
	]

	const isActive = (path: string) => {
		if (path === '/') {
			return pathname === path && !user
		}
		if (path === '/profile') {
			return pathname?.startsWith(path)
		}
		return pathname?.startsWith(path) && !pathname?.startsWith('/profile')
	}

	return (
		<nav className='bg-[#2A3F54] text-white'>
			<div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
				<div className='flex justify-between h-16'>
					<div className='flex items-center'>
						<Link href='/' className='flex items-center gap-2 sm:gap-5'>
							<Image
								src='/images/logo/logo.svg'
								alt='Dombra Master Logo'
								width={30}
								height={30}
							/>
							<span className='text-xl sm:text-2xl md:text-3xl font-bold'>
								Dombra Master
							</span>
						</Link>
					</div>

					{/* Десктопное меню */}
					<div className='hidden md:flex items-center space-x-5'>
						{menuItems.map(item => (
							<Link
								key={item.path}
								href={item.path}
								className={`text-xl font-semibold ${
									isActive(item.path)
										? 'text-[#E4B87C]'
										: 'text-white hover:text-[#E4B87C]'
								}`}
							>
								{item.title}
							</Link>
						))}

						{/* Элементы для авторизованного/неавторизованного пользователя */}
						{user ? (
							<div className='flex items-center '>
								<Menu as='div' className='relative'>
									<Menu.Button className='flex items-center p-0 rounded-full border-2 border-[#E4B87C] hover:border-[#E4B87C]/80 transition-colors duration-150 bg-transparent'>
										{user && user.avatar ? (
											<img
												src={user.avatar}
												alt='Аватарка'
												className='w-12 h-12 rounded-full object-cover border-2 border-[#E4B87C] mr-2'
											/>
										) : (
											<div className='w-12 h-12 rounded-full bg-[#E4B87C] text-[#2A3F54] flex items-center justify-center font-bold text-xl border-2 border-[#E4B87C] mr-2'>
												{(user && user.username?.[0]?.toUpperCase()) || 'U'}
											</div>
										)}
									</Menu.Button>
									<Menu.Items className='absolute right-0 mt-2 w-56 origin-top-right bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50'>
										<div className='py-1'>
											<Menu.Item>
												{({ active }: { active: boolean }) => (
													<Link
														href='/profile'
														className={`flex items-center gap-3 px-4 py-3 text-lg text-[#2A3F54] font-semibold ${
															active ? 'bg-[#E4B87C]/20' : ''
														}`}
														style={{ minHeight: '56px' }}
													>
														{user && user.avatar ? (
															<img
																src={user.avatar}
																alt='Аватарка'
																className='w-10 h-10 rounded-full object-cover'
															/>
														) : (
															<div className='w-10 h-10 rounded-full bg-[#E4B87C] text-[#2A3F54] flex items-center justify-center font-bold text-lg border border-[#E4B87C]'>
																{(user && user.username?.[0]?.toUpperCase()) ||
																	'U'}
															</div>
														)}
														<span>Жеке кабинет</span>
													</Link>
												)}
											</Menu.Item>
											<Menu.Item>
												{({ active }: { active: boolean }) => (
													<button
														onClick={handleLogout}
														className={`flex items-center gap-3 w-full px-4 py-3 text-lg text-[#2A3F54] font-semibold ${
															active ? 'bg-[#E4B87C]/20' : ''
														}`}
														style={{ minHeight: '56px' }}
													>
														<span className='flex items-center justify-center w-10 h-10'>
															<svg
																xmlns='http://www.w3.org/2000/svg'
																width='40'
																height='40'
																viewBox='0 0 24 24'
																fill='none'
																stroke='currentColor'
																strokeWidth='2'
																strokeLinecap='round'
																strokeLinejoin='round'
																className='w-10 h-10'
															>
																<path d='M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4'></path>
																<polyline points='16 17 21 12 16 7'></polyline>
																<line x1='21' y1='12' x2='9' y2='12'></line>
															</svg>
														</span>
														<span>Шығу</span>
													</button>
												)}
											</Menu.Item>
										</div>
									</Menu.Items>
								</Menu>
							</div>
						) : (
							<div className='space-x-4'>
								<button
									onClick={() => openModal('login')}
									className='px-5 py-3 bg-[#E4B87C] text-[#2A3F54] rounded-3xl font-semibold'
								>
									Кіру
								</button>
							</div>
						)}
					</div>

					{/* Мобильное меню (бургер) */}
					<div className='flex items-center md:hidden'>
						<button
							onClick={() => setIsMenuOpen(!isMenuOpen)}
							className='inline-flex items-center justify-center p-2 rounded-md text-white hover:text-[#E4B87C]'
							aria-expanded={isMenuOpen}
						>
							<span className='sr-only'>Открыть меню</span>
							{/* Иконка меню/закрытия */}
							<svg
								className={`${isMenuOpen ? 'hidden' : 'block'} h-6 w-6`}
								xmlns='http://www.w3.org/2000/svg'
								fill='none'
								viewBox='0 0 24 24'
								stroke='currentColor'
								aria-hidden='true'
							>
								<path
									strokeLinecap='round'
									strokeLinejoin='round'
									strokeWidth='2'
									d='M4 6h16M4 12h16M4 18h16'
								/>
							</svg>
							<svg
								className={`${isMenuOpen ? 'block' : 'hidden'} h-6 w-6`}
								xmlns='http://www.w3.org/2000/svg'
								fill='none'
								viewBox='0 0 24 24'
								stroke='currentColor'
								aria-hidden='true'
							>
								<path
									strokeLinecap='round'
									strokeLinejoin='round'
									strokeWidth='2'
									d='M6 18L18 6M6 6l12 12'
								/>
							</svg>
						</button>
					</div>
				</div>
			</div>

			{/* Мобильное меню, открывается/закрывается */}
			<div
				className={`${
					isMenuOpen ? 'block' : 'hidden'
				} md:hidden bg-[#2A3F54] shadow-lg`}
			>
				<div className='px-2 pt-2 pb-3 space-y-1'>
					{menuItems.map(item => (
						<Link
							key={item.path}
							href={item.path}
							className={`block px-3 py-2 text-base font-semibold rounded-md ${
								isActive(item.path)
									? 'bg-[#2A3F54] text-[#E4B87C]'
									: 'text-white hover:bg-[#384C63] hover:text-[#E4B87C]'
							}`}
							onClick={() => setIsMenuOpen(false)}
						>
							{item.title}
						</Link>
					))}
				</div>

				{/* Профиль в мобильном меню */}
				<div className='pt-4 pb-3 border-t border-gray-700'>
					{user ? (
						<div>
							<div className='flex items-center px-4'>
								<div className='ml-3'>
									<div className='text-base font-medium text-white'>
										{user.username}
									</div>
									<div className='text-sm font-medium text-gray-300'>
										{user.email}
									</div>
								</div>
							</div>
							<div className='mt-3 space-y-1'>
								<Link
									href='/profile'
									className={`block px-4 py-2 text-base font-semibold rounded-md ${
										isActive('/profile')
											? 'bg-[#2A3F54] text-[#E4B87C]'
											: 'text-[#E4B87C] hover:bg-[#384C63]'
									}`}
									onClick={() => setIsMenuOpen(false)}
								>
									Жеке кабиет
								</Link>
								<button
									onClick={handleLogout}
									className='block w-full text-left px-4 py-2 text-base font-semibold text-white hover:bg-[#384C63] hover:text-[#E4B87C] rounded-md'
								>
									Шығу
								</button>
							</div>
						</div>
					) : (
						<div className='space-y-1 px-4 py-2'>
							<button
								onClick={() => {
									setIsMenuOpen(false)
									openModal('login')
								}}
								className='block w-full text-left px-4 py-2 text-base font-semibold text-white hover:bg-[#384C63] hover:text-[#E4B87C] rounded-md'
							>
								Кіру
							</button>
							<button
								onClick={() => {
									setIsMenuOpen(false)
									openModal('register')
								}}
								className='block w-full text-left px-4 py-2 text-base font-semibold text-white hover:bg-[#384C63] hover:text-[#E4B87C] rounded-md mt-2'
							>
								Тіркелу
							</button>
						</div>
					)}
				</div>
			</div>
		</nav>
	)
}

export default Navbar
