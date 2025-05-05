const { body } = require('express-validator')

exports.sheetMusicValidation = [
	body('title')
		.trim()
		.notEmpty()
		.withMessage('Название обязательно')
		.isLength({ max: 100 })
		.withMessage('Название слишком длинное (макс. 100 символов)'),
	body('composer')
		.trim()
		.notEmpty()
		.withMessage('Имя композитора обязательно')
		.isLength({ max: 100 })
		.withMessage('Имя композитора слишком длинное (макс. 100 символов)'),
	body('description')
		.optional()
		.trim()
		.isLength({ max: 1000 })
		.withMessage('Описание слишком длинное (макс. 1000 символов)'),
	body('difficulty')
		.optional()
		.trim()
		.isIn(['beginner', 'intermediate', 'advanced'])
		.withMessage(
			'Допустимые значения сложности: beginner, intermediate, advanced'
		),
	body('tags')
		.optional()
		.isArray()
		.withMessage('Теги должны быть представлены в виде массива'),
	body('tags.*')
		.optional()
		.trim()
		.isLength({ min: 2, max: 20 })
		.withMessage('Каждый тег должен быть от 2 до 20 символов'),
]
