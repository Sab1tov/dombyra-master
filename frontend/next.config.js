/** @type {import('next').NextConfig} */
const nextConfig = {
	webpack: config => {
		config.resolve.alias.canvas = false
		config.resolve.alias.encoding = false
		return config
	},
	// Настройки для правильной обработки изображений
	images: {
		// Разрешаем домены для изображений
		domains: ['localhost', '127.0.0.1'],
		// Разрешить неоптимизированные изображения для локальных файлов
		unoptimized: true,
		// Увеличиваем размеры по умолчанию для аватаров
		deviceSizes: [
			96, 128, 256, 384, 512, 640, 750, 828, 1080, 1200, 1920, 2048,
		],
		imageSizes: [24, 48, 64, 96, 128, 256, 384],
	},
	// Проксирование запросов через rewrites
	async rewrites() {
		return [
			{
				source: '/api/:path*',
				destination: 'http://localhost:5000/api/:path*',
			},
			{
				source: '/uploads/:path*',
				destination: 'http://localhost:5000/uploads/:path*',
			},
		]
	},
}

module.exports = nextConfig
