'use client'

import {
	createContext,
	ReactNode,
	useContext,
	useEffect,
	useState,
} from 'react'
import LoginModal from './auth/LoginModal'
import RegisterModal from './auth/RegisterModal'

// Тип модального окна
type ModalType = 'login' | 'register' | null

// Интерфейс контекста
interface ModalContextType {
	modalType: ModalType
	openModal: (type: ModalType) => void
	closeModal: () => void
}

// Создание контекста с дефолтными значениями
const ModalContext = createContext<ModalContextType>({
	modalType: null,
	openModal: () => {},
	closeModal: () => {},
})

// Хук для использования контекста в компонентах
export const useModal = () => useContext(ModalContext)

// Провайдер модальных окон
export const ModalProvider = ({ children }: { children: ReactNode }) => {
	const [modalType, setModalType] = useState<ModalType>(null)

	// Эффект для блокировки скролла
	useEffect(() => {
		if (modalType) {
			// Сохраняем текущую позицию скролла
			const scrollY = window.scrollY
			document.body.style.position = 'fixed'
			document.body.style.width = '100%'
			document.body.style.top = `-${scrollY}px`
		} else {
			// Восстанавливаем скролл
			const scrollY = document.body.style.top
			document.body.style.position = ''
			document.body.style.width = ''
			document.body.style.top = ''
			window.scrollTo(0, parseInt(scrollY || '0') * -1)
		}
	}, [modalType])

	const openModal = (type: ModalType) => {
		setModalType(type)
	}

	const closeModal = () => {
		setModalType(null)
	}

	return (
		<ModalContext.Provider value={{ modalType, openModal, closeModal }}>
			{children}
			{modalType === 'login' && <LoginModal onClose={closeModal} />}
			{modalType === 'register' && <RegisterModal onClose={closeModal} />}
		</ModalContext.Provider>
	)
}

// Компонент управления модальными окнами - удаляем его, так как он дублирует функциональность провайдера
export default ModalProvider
