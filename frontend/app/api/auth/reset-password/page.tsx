const response = await fetch(
	`${process.env.NEXT_PUBLIC_API_URL}/api/auth/reset-password`,
	{
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ email }),
	}
)
