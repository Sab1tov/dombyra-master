const pool = require('./db')
const fs = require('fs').promises
const path = require('path')

async function runSqlFile() {
	try {
		console.log('Чтение SQL файла...')
		const sqlFilePath = path.join(__dirname, 'fix-video-lessons.sql')
		const sqlCommands = await fs.readFile(sqlFilePath, 'utf8')

		console.log('Выполнение SQL команд...')
		await pool.query(sqlCommands)

		console.log(
			'✅ SQL-скрипт успешно выполнен! Структура базы данных обновлена.'
		)
	} catch (error) {
		console.error('❌ Ошибка при выполнении SQL-скрипта:', error)
	} finally {
		pool.end()
	}
}

runSqlFile()
