const { body } = require('express-validator')

exports.roleChangeValidation = [
	body('role')
		.isIn(['user', 'admin'])
		.withMessage('Роль должна быть "user" или "admin"'),
]
