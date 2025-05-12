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
	title: 'Dombra Master - Домбыраға арналған интерактивті платформа',
	description:
		'Домбыра үйренушілерге арналған интерактивті платформа - ноталар жинағы, тюнер, оқыту видеолар және басқа да материалдар.',
	keywords: [
		'домбыра',
		'ноталар',
		'күй',
		'қазақ музыкасы',
		'домбыра тюнер',
		'домбыра оқыту',
	],
	openGraph: {
		title: 'Dombra Master - Домбыраға арналған интерактивті платформа',
		description:
			'Домбыра үйренушілерге арналған интерактивті платформа - ноталар жинағы, тюнер, оқыту видеолар және басқа да материалдар.',
		url: 'https://dombyra-master.vercel.app',
		siteName: 'Dombra Master',
		images: [
			{
				url: '/images/banner/banner-bg.jpg',
				width: 1200,
				height: 630,
				alt: 'Dombra Master',
			},
		],
		locale: 'kk_KZ',
		type: 'website',
	},
	robots: {
		index: true,
		follow: true,
		googleBot: {
			index: true,
			follow: true,
			'max-video-preview': -1,
			'max-image-preview': 'large',
			'max-snippet': -1,
		},
	},
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
