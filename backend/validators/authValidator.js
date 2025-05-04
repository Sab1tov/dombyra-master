const { body } = require('express-validator')

exports.registerValidation = [
	body('username').isLength({ min: 3 }).withMessage('Минимум 3 символа'),
	body('email').isEmail().withMessage('Введите корректный email'),
	body('password')
		.isLength({ min: 6 })
		.withMessage('Пароль минимум 6 символов'),
]

exports.loginValidation = [
	body('email').isEmail().withMessage('Введите корректный email'),
	body('password').notEmpty().withMessage('Введите пароль'),
]
