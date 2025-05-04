const { body } = require('express-validator')

const commentValidation = [
	// Контент комментария
	body('content')
		.notEmpty()
		.withMessage('Комментарий не может быть пустым')
		.isLength({ min: 1, max: 1000 })
		.withMessage('Комментарий должен содержать от 1 до 1000 символов')
		.trim(),

	// Для создания комментария
	body('contentType')
		.optional()
		.isIn(['video', 'sheet_music'])
		.withMessage('Неверный тип контента'),

	body('contentId')
		.optional()
		.isInt({ min: 1 })
		.withMessage('ID контента должен быть положительным числом'),

	// Для ответа на комментарий
	body('parentId')
		.optional()
		.isInt({ min: 1 })
		.withMessage(
			'ID родительского комментария должен быть положительным числом'
		),
]

module.exports = {
	commentValidation,
}
