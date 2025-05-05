'use client'

import { useModal } from '@/components/ModalManager'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function LoginPage() {
	const { openModal } = useModal()
	const router = useRouter()

	useEffect(() => {
		// Открываем модальное окно входа и перенаправляем на главную
		openModal('login')
		router.push('/')
	}, [openModal, router])

	// Эта страница не будет отображаться, так как происходит перенаправление
	return null
}
