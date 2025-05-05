'use client'

import { useModal } from '@/components/ModalManager'
import { useAuthStore } from '@/store/authStore'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function AuthGuard({ children }: { children: React.ReactNode }) {
	const token = useAuthStore(state => state.token)
	const router = useRouter()
	const { openModal } = useModal()

	useEffect(() => {
		if (!token) {
			openModal('login')
		}
	}, [token, router, openModal])

	if (!token) {
		return <p className='text-center mt-10'>Проверка авторизации...</p>
	}

	return <>{children}</>
}
