'use client'

import { useModal } from '@/components/ModalManager'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function LoginPage() {
	const { openModal } = useModal()
	const router = useRouter()

	useEffect(() => {
		// Проверяем, если нас перенаправили с какой-то другой страницы (с параметрами или без)
		setTimeout(() => {
			// Открываем модальное окно логина
			openModal('login')
			// Перенаправляем на главную страницу только после открытия модального окна
			setTimeout(() => {
				router.push('/')
			}, 100)
		}, 100)
	}, [openModal, router])

	// Эта страница не будет отображаться, так как происходит перенаправление
	return null
}
