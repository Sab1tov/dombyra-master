'use client'

import { useAuthStore } from '@/store/authStore'
import { useEffect, useState } from 'react'

// Простой провайдер для авторизации, который инициализирует состояние авторизации
export default function AuthProvider({
	children,
}: {
	children: React.ReactNode
}) {
	const [mounted, setMounted] = useState(false)
	const { token, fetchProfile } = useAuthStore()

	// Проверяем, что мы на клиенте и инициализируем состояние
	useEffect(() => {
		setMounted(true)

		// Если есть токен, пытаемся получить данные профиля
		if (token) {
			fetchProfile().catch(error => {
				console.error('Failed to fetch profile:', error)
				// Ошибки обрабатываются внутри fetchProfile
			})
		}
	}, [token, fetchProfile])

	// Не рендерим ничего на сервере, чтобы избежать несоответствий SSR и CSR
	if (!mounted) {
		return null
	}

	return <>{children}</>
}
