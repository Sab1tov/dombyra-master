'use client'

import { initializeAuthStore } from '@/store/authStore'
import { useEffect } from 'react'

// Компонент для инициализации клиентских состояний
export default function ClientInitializer() {
	useEffect(() => {
		// Инициализируем хранилище авторизации только на клиенте
		if (typeof window !== 'undefined') {
			try {
				initializeAuthStore()
				console.log('Auth store initialized successfully')
			} catch (error) {
				console.error('Error initializing auth store:', error)
			}
		}
	}, [])

	return null
}
