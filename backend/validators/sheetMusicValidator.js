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
]
