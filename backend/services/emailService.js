const sgMail = require('@sendgrid/mail')
require('dotenv').config()

// Устанавливаем API ключ SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY)

/**
 * Отправляет письмо для восстановления пароля
 * @param {string} email - Email получателя
 * @param {string} resetToken - Токен сброса пароля
 * @param {string} language - Язык письма ('kz' или 'ru', по умолчанию 'kz')
 * @returns {Promise<boolean>} - Результат отправки
 */
async function sendPasswordResetEmail(email, resetToken, language = 'kz') {
	try {
		const resetUrl = `${
			process.env.FRONTEND_URL || 'http://localhost:3000'
		}/auth/new-password?token=${resetToken}`

		let subject, htmlContent

		if (language === 'ru') {
			subject = 'Восстановление пароля - Домбыра'
			htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e4b87c; border-radius: 5px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #2A3F54;">Восстановление пароля</h1>
          </div>
          <p>Здравствуйте!</p>
          <p>Вы запросили восстановление пароля на сайте Домбыра. Для создания нового пароля, пожалуйста, перейдите по ссылке ниже:</p>
          <p style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #e4b87c; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Восстановить пароль</a>
          </p>
          <p>Или скопируйте эту ссылку в браузер: <br>
          <a href="${resetUrl}">${resetUrl}</a></p>
          <p>Ссылка действительна в течение 1 часа.</p>
          <p>Если вы не запрашивали восстановление пароля, просто проигнорируйте это письмо.</p>
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #777; font-size: 12px;">
            <p>С уважением, команда Домбыра</p>
          </div>
        </div>
      `
		} else {
			// Казахский язык по умолчанию
			subject = 'Құпия сөзді қалпына келтіру - Домбыра'
			htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e4b87c; border-radius: 5px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #2A3F54;">Құпия сөзді қалпына келтіру</h1>
          </div>
          <p>Сәлеметсіз бе!</p>
          <p>Сіз Домбыра сайтында құпия сөзді қалпына келтіруді сұрадыңыз. Жаңа құпия сөз жасау үшін төмендегі сілтемені басыңыз:</p>
          <p style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #e4b87c; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Құпия сөзді қалпына келтіру</a>
          </p>
          <p>Немесе бұл сілтемені браузерге көшіріңіз: <br>
          <a href="${resetUrl}">${resetUrl}</a></p>
          <p>Сілтеме 1 сағат бойы жарамды.</p>
          <p>Егер сіз құпия сөзді қалпына келтіруді сұрамаған болсаңыз, бұл хатты елемеңіз.</p>
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #777; font-size: 12px;">
            <p>Құрметпен, Домбыра командасы</p>
          </div>
        </div>
      `
		}

		const msg = {
			to: email,
			from: process.env.SENDGRID_FROM_EMAIL || 'noreply@dombra-master.kz', // Верифицированный отправитель
			subject: subject,
			html: htmlContent,
		}

		await sgMail.send(msg)
		console.log(`Email для восстановления пароля успешно отправлен на ${email}`)
		return true
	} catch (error) {
		console.error('Ошибка при отправке email для восстановления пароля:', error)
		if (error.response) {
			console.error(error.response.body)
		}
		return false
	}
}

/**
 * Отправляет приветственное письмо новому пользователю
 * @param {string} email - Email получателя
 * @param {string} name - Имя пользователя
 * @param {string} language - Язык письма ('kz' или 'ru', по умолчанию 'kz')
 * @returns {Promise<boolean>} - Результат отправки
 */
async function sendWelcomeEmail(email, name, language = 'kz') {
	try {
		let subject, htmlContent

		if (language === 'ru') {
			subject = 'Добро пожаловать в Домбыра!'
			htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e4b87c; border-radius: 5px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #2A3F54;">Добро пожаловать в Домбыра!</h1>
          </div>
          <p>Здравствуйте, ${name}!</p>
          <p>Спасибо за регистрацию на нашем сайте. Мы рады приветствовать вас в нашем сообществе!</p>
          <p>На нашем сайте вы можете найти множество композиций для домбры, учебные материалы и общаться с другими музыкантами.</p>
          <p style="text-align: center; margin: 30px 0;">
            <a href="${
							process.env.FRONTEND_URL || 'http://localhost:3000'
						}" style="background-color: #e4b87c; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Перейти на сайт</a>
          </p>
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #777; font-size: 12px;">
            <p>С уважением, команда Домбыра</p>
          </div>
        </div>
      `
		} else {
			// Казахский язык по умолчанию
			subject = 'Домбыраға қош келдіңіз!'
			htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e4b87c; border-radius: 5px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #2A3F54;">Домбыраға қош келдіңіз!</h1>
          </div>
          <p>Сәлеметсіз бе, ${name}!</p>
          <p>Біздің сайтқа тіркелгеніңіз үшін рахмет. Біз сізді қауымдастығымызда қарсы алуға қуаныштымыз!</p>
          <p>Біздің сайтта сіз домбыраға арналған көптеген композицияларды, оқу материалдарын таба аласыз және басқа музыканттармен қарым-қатынас жасай аласыз.</p>
          <p style="text-align: center; margin: 30px 0;">
            <a href="${
							process.env.FRONTEND_URL || 'http://localhost:3000'
						}" style="background-color: #e4b87c; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Сайтқа өту</a>
          </p>
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #777; font-size: 12px;">
            <p>Құрметпен, Домбыра командасы</p>
          </div>
        </div>
      `
		}

		const msg = {
			to: email,
			from: process.env.SENDGRID_FROM_EMAIL || 'noreply@dombra-master.kz',
			subject: subject,
			html: htmlContent,
		}

		await sgMail.send(msg)
		console.log(`Приветственный email успешно отправлен на ${email}`)
		return true
	} catch (error) {
		console.error('Ошибка при отправке приветственного email:', error)
		if (error.response) {
			console.error(error.response.body)
		}
		return false
	}
}

module.exports = {
	sendPasswordResetEmail,
	sendWelcomeEmail,
}
