'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function NewPasswordPage() {
	const [password, setPassword] = useState('')
	const [confirmPassword, setConfirmPassword] = useState('')
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [success, setSuccess] = useState(false)
	const router = useRouter()
	const searchParams = useSearchParams()
	const token = searchParams.get('token')

	useEffect(() => {
		if (!token) {
			router.push('/')
		}
	}, [token, router])

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setLoading(true)
		setError(null)

		if (password !== confirmPassword) {
			setError('Құпия сөздер сәйкес келмейді')
			setLoading(false)
			return
		}

		try {
			const response = await fetch(
				`${process.env.NEXT_PUBLIC_API_URL}/api/auth/new-password`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						token,
						newPassword: password,
					}),
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

	if (!token) {
		return null
	}

	if (success) {
		return (
			<div className='min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8'>
				<div className='max-w-md w-full space-y-8 bg-white p-8 rounded-[30px] shadow-lg'>
					<div className='text-center'>
						<h2 className='text-3xl font-bold text-[#2A3F54] mb-4'>
							Құпия сөз сәтті өзгертілді!
						</h2>
						<p className='text-lg text-gray-600 mb-8'>
							Енді жаңа құпия сөзіңізбен жүйеге кіре аласыз.
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
						Жаңа құпия сөзді енгізу
					</h2>
					<p className='text-lg text-gray-600'>
						Жаңа құпия сөзіңізді енгізіңіз.
					</p>
				</div>

				{error && (
					<div className='bg-red-100 text-red-700 p-3 rounded-lg'>{error}</div>
				)}

				<form onSubmit={handleSubmit} className='mt-8 space-y-6'>
					<div>
						<label
							htmlFor='password'
							className='block text-[20px] font-semibold text-[#2A3F54] mb-2'
						>
							Жаңа құпия сөз
						</label>
						<input
							id='password'
							name='password'
							type='password'
							required
							className='w-full p-3 border border-[#2A3F54] rounded-[15px] text-[18px]'
							value={password}
							onChange={e => setPassword(e.target.value)}
						/>
					</div>

					<div>
						<label
							htmlFor='confirmPassword'
							className='block text-[20px] font-semibold text-[#2A3F54] mb-2'
						>
							Құпия сөзді растау
						</label>
						<input
							id='confirmPassword'
							name='confirmPassword'
							type='password'
							required
							className='w-full p-3 border border-[#2A3F54] rounded-[15px] text-[18px]'
							value={confirmPassword}
							onChange={e => setConfirmPassword(e.target.value)}
						/>
					</div>

					<div>
						<button
							type='submit'
							disabled={loading}
							className='w-full bg-[#E4B87C] text-[#2A3F54] rounded-[30px] py-3 font-semibold text-[30px] hover:bg-[#d9a967] transition-colors'
						>
							{loading ? 'Жүктелуде...' : 'Сақтау'}
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
