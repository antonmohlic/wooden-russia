/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_")

  // update collection data
  unmarshal({
    "verificationTemplate": {
      "body": "<p>Здравствуйте!</p>\n<p>Спасибо за регистрацию на сайте «{APP_NAME}». Осталось подтвердить, что это ваша почта:</p>\n<p><a class=\"btn\" href=\"{APP_URL}/verify.html?token={TOKEN}\" target=\"_blank\" rel=\"noopener\">Подтвердить почту</a></p>\n<p>Ссылка действует сутки. Неподтверждённые аккаунты через сутки удаляются автоматически.</p>\n<p><i>Если вы не регистрировались на нашем сайте, просто не обращайте внимания на это письмо — аккаунт с вашей почтой будет удалён сам.</i></p>\n",
      "subject": "Подтвердите почту — {APP_NAME}"
    }
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_")

  // update collection data
  unmarshal({
    "verificationTemplate": {
      "body": "<p>Hello,</p>\n<p>Thank you for joining us at {APP_NAME}.</p>\n<p>Click on the button below to verify your email address.</p>\n<p>\n  <a class=\"btn\" href=\"{APP_URL}/_/#/auth/confirm-verification/{TOKEN}\" target=\"_blank\" rel=\"noopener\">Verify</a>\n</p>\n<p><i>If you didn't recently register, please ignore this email.</i></p>\n<p>\n  Thanks,<br/>\n  {APP_NAME} team\n</p>",
      "subject": "Verify your {APP_NAME} email"
    }
  }, collection)

  return app.save(collection)
})
