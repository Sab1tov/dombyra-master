import Footer from '@/components/Footer'
import { ModalProvider } from '@/components/ModalManager'
import Navbar from '@/components/Navbar'
import AuthProvider from '@/providers/AuthProvider'
import { Montserrat } from 'next/font/google'
import ClientInitializer from './ClientInitializer'
import './globals.css'

const montserrat = Montserrat({
	subsets: ['latin', 'cyrillic'],
})

export const metadata = {
	title: 'Dombyra Master',
	description: 'Қазақтың ұлттық аспабы - домбыраны үйренуге арналған платформа',
	icons: {
		icon: '/favicon.ico',
	},
}

export default function RootLayout({
	children,
}: {
	children: React.ReactNode
}) {
	return (
		<html lang='kk'>
			<body className={`${montserrat.className} flex flex-col min-h-screen`}>
				<AuthProvider>
					<ModalProvider>
						<ClientInitializer />
						<Navbar />
						<main className='flex-1 '>{children}</main>
						<Footer />
					</ModalProvider>
				</AuthProvider>
			</body>
		</html>
	)
}
