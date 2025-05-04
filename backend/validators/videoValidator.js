const { body } = require('express-validator')

const videoValidation = [
	// Заголовок
	body('title')
		.notEmpty()
		.withMessage('Заголовок не может быть пустым')
		.isLength({ min: 3, max: 100 })
		.withMessage('Заголовок должен содержать от 3 до 100 символов')
		.trim(),

	// Описание
	body('description')
		.notEmpty()
		.withMessage('Описание не может быть пустым')
		.isLength({ min: 10, max: 2000 })
		.withMessage('Описание должно содержать от 10 до 2000 символов')
		.trim(),

	// URL видео
	body('video_url')
		.notEmpty()
		.withMessage('URL видео не может быть пустым')
		.isURL()
		.withMessage('Укажите корректный URL видео'),

	// Длительность
	body('duration')
		.notEmpty()
		.withMessage('Длительность не может быть пустой')
		.isInt({ min: 1 })
		.withMessage('Длительность должна быть положительным числом (в секундах)'),
]

// Валидация для обновления прогресса
const progressValidation = [
	body('progress')
		.notEmpty()
		.withMessage('Прогресс не может быть пустым')
		.isInt({ min: 0, max: 100 })
		.withMessage('Прогресс должен быть числом от 0 до 100'),
]

module.exports = {
	videoValidation,
	progressValidation,
}
