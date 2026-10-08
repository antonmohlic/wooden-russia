/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_")

  // update collection data
  unmarshal({
    "resetPasswordTemplate": {
      "body": "<p>Здравствуйте!</p>\n<p>Кто-то (надеемся, вы) попросил сменить пароль на сайте «{APP_NAME}».</p>\n<p><a class=\"btn\" href=\"{APP_URL}/reset.html?token={TOKEN}\" target=\"_blank\" rel=\"noopener\">Задать новый пароль</a></p>\n<p>Ссылка действует 30 минут и сработает один раз.</p>\n<p><i>Если вы не просили сменить пароль, просто не обращайте внимания на это письмо — пароль останется прежним.</i></p>\n",
      "subject": "Смена пароля — {APP_NAME}"
    }
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_")

  // update collection data
  unmarshal({
    "resetPasswordTemplate": {
      "body": "<p>Hello,</p>\n<p>Click on the button below to reset your password.</p>\n<p>\n  <a class=\"btn\" href=\"{APP_URL}/_/#/auth/confirm-password-reset/{TOKEN}\" target=\"_blank\" rel=\"noopener\">Reset password</a>\n</p>\n<p><i>If you didn't ask to reset your password, please ignore this email.</i></p>\n<p>\n  Thanks,<br/>\n  {APP_NAME} team\n</p>",
      "subject": "Reset your {APP_NAME} password"
    }
  }, collection)

  return app.save(collection)
})
