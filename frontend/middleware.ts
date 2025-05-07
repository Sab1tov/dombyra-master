import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

// Маршруты, которые требуют авторизации
const protectedRoutes = ['/profile', '/dashboard', '/videos']

// Маршруты, доступные только неавторизованным пользователям
const publicOnlyRoutes = ['/auth/login', '/auth/register']

export function middleware(request: NextRequest) {
	const token = request.cookies.get('token')?.value
	const isAuthenticated = !!token
	const path = request.nextUrl.pathname

	// Проверка защищенных маршрутов (только для авторизованных)
	if (
		protectedRoutes.some(route => path.startsWith(route)) &&
		!isAuthenticated
	) {
		return NextResponse.redirect(new URL('/auth/login', request.url))
	}

	// Проверка публичных маршрутов (только для неавторизованных)
	if (
		publicOnlyRoutes.some(route => path.startsWith(route)) &&
		isAuthenticated
	) {
		return NextResponse.redirect(new URL('/', request.url))
	}

	return NextResponse.next()
}

// Конфигурация - определяет на каких маршрутах будет работать middleware
export const config = {
	matcher: [
		/*
		 * Match all request paths except:
		 * 1. /api routes
		 * 2. /_next (Next.js internals)
		 * 3. /fonts, /icons (static files)
		 * 4. /favicon.ico, /sitemap.xml (static files)
		 */
		'/((?!api|_next|fonts|icons|favicon.svg|sitemap.xml).*)',
	],
}
