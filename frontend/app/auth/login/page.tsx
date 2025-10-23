'use client'

import { useModal } from '@/components/ModalManager'
import { useEffect } from 'react'

export default function LoginPage() {
	const { openModal } = useModal()

	useEffect(() => {
		openModal('login')
	}, [openModal])

	// Эта страница не будет отображаться, так как происходит открытие модального окна
	return null
}
