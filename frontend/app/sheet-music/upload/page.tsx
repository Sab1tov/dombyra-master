'use client'

import { useAuthStore } from '@/store/authStore'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { FileRejection, useDropzone } from 'react-dropzone'

export default function UploadSheetMusicPage() {
	const { token } = useAuthStore()
	const router = useRouter()
	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [success, setSuccess] = useState(false)
	const [formData, setFormData] = useState({
		title: '',
		composer: '',
	})
	const [file, setFile] = useState<File | null>(null)
	const [formErrors, setFormErrors] = useState<Record<string, string>>({})

	// Проверка авторизации
	useEffect(() => {
		if (!token) {
			router.push('/auth/login?redirect=/sheet-music/upload')
		}
	}, [token, router])

	// Настройка dropzone для загрузки файлов
	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		accept: {
			'application/pdf': ['.pdf'],
		},
		maxFiles: 1,
		maxSize: 10 * 1024 * 1024, // 10MB
		onDrop: (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
			if (rejectedFiles.length > 0) {
				const error = rejectedFiles[0].errors[0]
				if (error.code === 'file-too-large') {
					setFormErrors({ file: 'Файл тым үлкен (максимум 10MB)' })
				} else if (error.code === 'file-invalid-type') {
					setFormErrors({ file: 'Тек PDF файлдар қолдау табады' })
				} else {
					setFormErrors({ file: 'Файлды жүктеу қатесі' })
				}
				return
			}

			if (acceptedFiles.length > 0) {
				setFile(acceptedFiles[0])
				setFormErrors(prev => ({ ...prev, file: '' }))
			}
		},
	})

	// Обработка изменения полей формы
	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const { name, value } = e.target
		setFormData(prev => ({ ...prev, [name]: value }))

		// Очищаем ошибку для этого поля
		if (formErrors[name]) {
			setFormErrors(prev => ({ ...prev, [name]: '' }))
		}
	}

	// Валидация формы
	const validateForm = () => {
		const errors: Record<string, string> = {}

		if (!formData.title.trim()) {
			errors.title = 'Атауы міндетті'
		}

		if (!formData.composer.trim()) {
			errors.composer = 'Композитор аты міндетті'
		}

		if (!file) {
			errors.file = 'PDF файлын жүктеңіз'
		}

		setFormErrors(errors)
		return Object.keys(errors).length === 0
	}

	// Отправка формы
	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()

		if (!validateForm()) {
			return
		}

		setIsLoading(true)
		setError(null)

		try {
			const formDataToSend = new FormData()
			formDataToSend.append('title', formData.title)
			formDataToSend.append('composer', formData.composer)

			if (file) {
				formDataToSend.append('file', file)
			}

			// Получаем токен из localStorage
			const token = localStorage.getItem('jwtToken')

			const response = await fetch('/api/sheet-music', {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${token}`,
				},
				body: formDataToSend,
			})

			const data = await response.json()

			if (!response.ok) {
				throw new Error(data.error || 'Ноталарды жүктеу кезінде қате')
			}

			setSuccess(true)
			// Очищаем форму после успешной загрузки
			setFormData({
				title: '',
				composer: '',
			})
			setFile(null)

			// Перенаправляем на страницу с нотами через 2 секунды
			setTimeout(() => {
				router.push('/sheet-music')
			}, 2000)
		} catch (err) {
			console.error('Ноталарды жүктеу кезінде қате:', err)
			setError(
				err instanceof Error
					? err.message
					: 'Ноталарды жүктеу кезінде белгісіз қате'
			)
		} finally {
			setIsLoading(false)
		}
	}

	if (!token) {
		return null // или отображать сообщение о необходимости входа
	}

	return (
		<div className='min-h-screen bg-gray-50 py-12'>
			<div className='container mx-auto px-4'>
				<div className='max-w-3xl mx-auto bg-white shadow-md rounded-xl p-8'>
					<h1 className='text-3xl font-bold text-gray-800 mb-6'>
						Ноталарды жүктеу
					</h1>

					{success ? (
						<div className='bg-green-100 text-green-700 p-4 rounded-lg mb-6'>
							Ноталар сәтті жүктелді! Бағыттау...
						</div>
					) : (
						<form onSubmit={handleSubmit}>
							{error && (
								<div className='bg-red-100 text-red-700 p-4 rounded-lg mb-6'>
									{error}
								</div>
							)}

							<div className='mb-4'>
								<label
									htmlFor='title'
									className='block text-gray-700 font-medium mb-1'
								>
									Атауы <span className='text-red-500'>*</span>
								</label>
								<input
									type='text'
									id='title'
									name='title'
									value={formData.title}
									onChange={handleChange}
									className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-900 ${
										formErrors.title ? 'border-red-500' : 'border-gray-300'
									}`}
									placeholder='Нота атауын енгізіңіз'
								/>
								{formErrors.title && (
									<p className='text-red-500 text-sm mt-1'>
										{formErrors.title}
									</p>
								)}
							</div>

							<div className='mb-4'>
								<label
									htmlFor='composer'
									className='block text-gray-700 font-medium mb-1'
								>
									Композитор <span className='text-red-500'>*</span>
								</label>
								<input
									type='text'
									id='composer'
									name='composer'
									value={formData.composer}
									onChange={handleChange}
									className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-900 ${
										formErrors.composer ? 'border-red-500' : 'border-gray-300'
									}`}
									placeholder='Композитор атын енгізіңіз'
								/>
								{formErrors.composer && (
									<p className='text-red-500 text-sm mt-1'>
										{formErrors.composer}
									</p>
								)}
							</div>

							<div className='mb-6'>
								<label className='block text-gray-700 font-medium mb-1'>
									PDF файл <span className='text-red-500'>*</span>
								</label>
								<div
									{...getRootProps()}
									className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
										isDragActive
											? 'border-blue-500 bg-blue-50'
											: 'border-gray-300 hover:border-blue-400'
									} ${formErrors.file ? 'border-red-500' : ''}`}
								>
									<input {...getInputProps()} />
									{file ? (
										<div className='flex flex-col items-center'>
											<svg
												className='h-8 w-8 text-green-500 mb-2'
												fill='none'
												stroke='currentColor'
												viewBox='0 0 24 24'
												xmlns='http://www.w3.org/2000/svg'
											>
												<path
													strokeLinecap='round'
													strokeLinejoin='round'
													strokeWidth='2'
													d='M5 13l4 4L19 7'
												></path>
											</svg>
											<p className='text-sm font-medium text-gray-900'>
												{file.name}
											</p>
											<p className='text-xs text-gray-500 mt-1'>
												{(file.size / 1024 / 1024).toFixed(2)} MB
											</p>
											<button
												type='button'
												onClick={e => {
													e.stopPropagation()
													setFile(null)
												}}
												className='mt-2 text-xs text-red-500 hover:text-red-700'
											>
												Жою
											</button>
										</div>
									) : (
										<div>
											<svg
												className='mx-auto h-12 w-12 text-gray-400'
												fill='none'
												stroke='currentColor'
												viewBox='0 0 24 24'
												xmlns='http://www.w3.org/2000/svg'
											>
												<path
													strokeLinecap='round'
													strokeLinejoin='round'
													strokeWidth='2'
													d='M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12'
												></path>
											</svg>
											<p className='mt-2 text-sm text-gray-500'>
												PDF файлды осында сүйреңіз немесе{' '}
												<span className='text-[#2A3F54] hover:text-[#1c2b3b]'>
													файлды таңдаңыз
												</span>
											</p>
											<p className='mt-1 text-xs text-gray-400'>
												Тек PDF, максимум 10MB
											</p>
										</div>
									)}
								</div>
								{formErrors.file && (
									<p className='text-red-500 text-sm mt-1'>{formErrors.file}</p>
								)}
							</div>

							<div className='flex justify-end'>
								<button
									type='button'
									onClick={() => router.push('/sheet-music')}
									className='px-6 py-2 mr-2 border border-[#2A3F54] rounded-lg text-[#2A3F54] hover:bg-[#2A3F54] hover:text-white'
									disabled={isLoading}
								>
									Бас тарту
								</button>
								<button
									type='submit'
									className='px-[19px] py-[13px] bg-[#E4B87C] rounded-[30px] text-[#2A3F54] hover:bg-[#d3a76b] disabled:bg-[#E4B87C] disabled:opacity-70 font-semibold text-[20px] flex items-center justify-center gap-[10px]'
									style={{ fontFamily: 'Montserrat, sans-serif' }}
									disabled={isLoading}
								>
									{isLoading ? (
										'Жүктелуде...'
									) : (
										<>
											<svg
												width='24'
												height='24'
												viewBox='0 0 24 24'
												fill='none'
												xmlns='http://www.w3.org/2000/svg'
												className='h-5 w-5'
											>
												<path
													d='M9 16H15V10H19L12 3L5 10H9V16ZM5 18H19V20H5V18Z'
													fill='#2A3F54'
												/>
											</svg>
											Жүктеу
										</>
									)}
								</button>
							</div>
						</form>
					)}
				</div>
			</div>
		</div>
	)
}
