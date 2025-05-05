import axios from './axiosInstance'

export const login = async (email: string, password: string) => {
	const response = await axios.post(
		'/auth/login',
		{ email, password },
		{ withCredentials: true }
	)
	return response.data
}

export const register = async (
	username: string,
	email: string,
	password: string
) => {
	const response = await axios.post(
		'/auth/register',
		{ username, email, password },
		{ withCredentials: true }
	)
	return response.data
}

export const refreshToken = async () => {
	const response = await axios.post(
		'/auth/refresh-token',
		{},
		{ withCredentials: true }
	)
	return response.data
}

export const logout = async (refreshToken: string) => {
	const response = await axios.post(
		'/auth/logout',
		{ refreshToken },
		{
			headers: { 'Content-Type': 'application/json' },
			withCredentials: true,
		}
	)
	return response.data
}

export const getProfile = async (token: string) => {
	const response = await axios.get('/auth/user', {
		headers: {
			Authorization: `Bearer ${token}`,
		},
		withCredentials: true,
	})
	return response.data
}
