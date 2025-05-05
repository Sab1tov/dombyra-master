'use client'

import { useModal } from '@/components/ModalManager'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function RegisterPage() {
	const { openModal } = useModal()
	const router = useRouter()

	useEffect(() => {
		// Открываем модальное окно регистрации и перенаправляем на главную
		openModal('register')
		router.push('/')
	}, [openModal, router])

	// Эта страница не будет отображаться, так как происходит перенаправление
	return null
}
