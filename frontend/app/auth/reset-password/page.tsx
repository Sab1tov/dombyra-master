'use client'

import { useAuthStore } from '@/store/authStore'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function ResetPasswordPage() {
	const [email, setEmail] = useState('')
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [success, setSuccess] = useState(false)
	const router = useRouter()
	const user = useAuthStore(state => state.user)

	// Если пользователь уже авторизован, перенаправляем на главную страницу
	useEffect(() => {
		// Проверяем наличие токена в localStorage или cookie
		const hasToken =
			localStorage.getItem('jwtToken') || document.cookie.includes('token=')

		if (user || hasToken) {
			console.log(
				'Пользователь уже авторизован, перенаправление на главную страницу'
			)
			router.push('/')
		}
	}, [user, router])

	// Проверяем URL параметры для предотвращения непреднамеренного перенаправления
	useEffect(() => {
		// Проверяем, был ли пользователь перенаправлен сюда по ошибке
		if (typeof window !== 'undefined') {
			const url = new URL(window.location.href)
			const redirect = url.searchParams.get('redirect')
			const error = url.searchParams.get('error')

			// Если нет специального параметра перенаправления или ошибки, и пользователь пришел с другой страницы
			if (
				!redirect &&
				!error &&
				document.referrer &&
				!document.referrer.includes('/auth/')
			) {
				console.log(
					'Обнаружено непреднамеренное перенаправление, возврат на предыдущую страницу'
				)
				window.history.back()
			}
		}
	}, [])

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setLoading(true)
		setError(null)

		try {
			const response = await fetch(
				`${process.env.NEXT_PUBLIC_API_URL}/api/auth/reset-password`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({ email }),
				}
			)

			const data = await response.json()

			if (!response.ok) {
				throw new Error(data.error || 'Қате орын алды')
			}

			setSuccess(true)
		} catch (error) {
			setError(error instanceof Error ? error.message : 'Қате орын алды')
		} finally {
			setLoading(false)
		}
	}

	if (success) {
		return (
			<div className='min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8'>
				<div className='max-w-md w-full space-y-8 bg-white p-8 rounded-[30px] shadow-lg'>
					<div className='text-center'>
						<h2 className='text-3xl font-bold text-[#2A3F54] mb-4'>
							Сәтті жіберілді!
						</h2>
						<p className='text-lg text-gray-600 mb-8'>
							Құпия сөзді қалпына келтіру нұсқаулары электрондық поштаңызға
							жіберілді.
						</p>
						<button
							onClick={() => router.push('/')}
							className='bg-[#E4B87C] text-[#2A3F54] px-6 py-3 rounded-[30px] font-semibold text-lg hover:bg-[#d9a967] transition-colors'
						>
							Басты бетке оралу
						</button>
					</div>
				</div>
			</div>
		)
	}

	return (
		<div className='min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8'>
			<div className='max-w-md w-full space-y-8 bg-white p-8 rounded-[30px] shadow-lg'>
				<div>
					<h2 className='text-3xl font-bold text-[#2A3F54] mb-4'>
						Құпия сөзді қалпына келтіру
					</h2>
					<p className='text-lg text-gray-600'>
						Құпия сөзді қалпына келтіру нұсқауларын алу үшін электрондық
						поштаңызды енгізіңіз.
					</p>
				</div>

				{error && (
					<div className='bg-red-100 text-red-700 p-3 rounded-lg'>{error}</div>
				)}

				<form onSubmit={handleSubmit} className='mt-8 space-y-6'>
					<div>
						<label
							htmlFor='email'
							className='block text-[20px] font-semibold text-[#2A3F54] mb-2'
						>
							Email
						</label>
						<input
							id='email'
							name='email'
							type='email'
							required
							className='w-full p-3 border border-[#2A3F54] rounded-[15px] text-[18px]'
							placeholder='your@email.com'
							value={email}
							onChange={e => setEmail(e.target.value)}
						/>
					</div>

					<div>
						<button
							type='submit'
							disabled={loading}
							className='w-full bg-[#E4B87C] text-[#2A3F54] rounded-[30px] py-3 font-semibold text-[30px] hover:bg-[#d9a967] transition-colors'
						>
							{loading ? 'Жүктелуде...' : 'Жіберу'}
						</button>
					</div>

					<div className='text-center'>
						<button
							type='button'
							onClick={() => router.push('/')}
							className='text-[#2A3F54] text-lg hover:underline'
						>
							Басты бетке оралу
						</button>
					</div>
				</form>
			</div>
		</div>
	)
}
