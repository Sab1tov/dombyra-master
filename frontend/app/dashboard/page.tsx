'use client'

import { useAuthStore } from '@/store/authStore'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function DashboardPage() {
	const { user } = useAuthStore()
	const router = useRouter()
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		// Если пользователь не авторизован, перенаправляем на страницу входа
		if (!user) {
			router.push('/auth/login')
			return
		}

		setLoading(false)
	}, [user, router])

	if (loading) {
		return (
			<div className='flex justify-center items-center min-h-screen'>
				<div className='animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600'></div>
			</div>
		)
	}

	return (
		<div className='container mx-auto px-4 py-8'>
			<h1 className='text-3xl font-bold mb-6 text-gray-900'>
				Панель управления
			</h1>

			<div className='bg-white shadow-md rounded-lg p-6'>
				<h2 className='text-xl font-semibold mb-4'>
					Добро пожаловать, {user?.username || 'пользователь'}!
				</h2>

				<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8'>
					<Link
						href='/profile'
						className='flex flex-col items-center p-6 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors'
					>
						<div className='text-indigo-600 text-3xl mb-3'>👤</div>
						<h3 className='font-medium text-lg'>Мой профиль</h3>
						<p className='text-gray-600 text-center mt-2'>
							Управление личной информацией и настройками
						</p>
					</Link>

					<Link
						href='/sheet-music'
						className='flex flex-col items-center p-6 bg-green-50 rounded-lg hover:bg-green-100 transition-colors'
					>
						<div className='text-green-600 text-3xl mb-3'>🎵</div>
						<h3 className='font-medium text-lg'>Нотные материалы</h3>
						<p className='text-gray-600 text-center mt-2'>
							Просмотр и загрузка нотных материалов
						</p>
					</Link>

					<Link
						href='/videos'
						className='flex flex-col items-center p-6 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors'
					>
						<div className='text-yellow-600 text-3xl mb-3'>🎬</div>
						<h3 className='font-medium text-lg'>Видеоуроки</h3>
						<p className='text-gray-600 text-center mt-2'>
							Просмотр обучающих видеоуроков
						</p>
					</Link>
				</div>
			</div>
		</div>
	)
}
