/// <reference path="../pb_data/types.d.ts" />

// Серверная логика сайта (хуки PocketBase).
// Важно: каждый обработчик выполняется изолированно — переменные снаружи функций внутри недоступны.

// После регистрации сразу отправляем письмо со ссылкой для подтверждения почты.
// Пока почта не подтверждена, участник не может предлагать объекты (правило в таблице submissions).
onRecordAfterCreateSuccess((e) => {
  e.next();
  if (e.record.getBool("verified")) return;
  try {
    $mails.sendRecordVerification(e.app, e.record);
  } catch (err) {
    // Регистрация не должна ломаться из-за почты: письмо можно запросить повторно из личного кабинета
    e.app.logger().error("Не удалось отправить письмо подтверждения", "email", e.record.email(), "error", String(err));
  }
}, "users");

// Раз в час удаляем аккаунты, почту которых не подтвердили за сутки.
// Так нельзя надолго «занять» чужую почту: настоящий владелец через сутки сможет зарегистрироваться сам.
// Администраторов не трогаем никогда.
cronAdd("cleanupUnverifiedUsers", "15 * * * *", () => {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().replace("T", " ");
  const records = $app.findRecordsByFilter(
    "users",
    "verified = false && role != 'admin' && created < {:cutoff}",
    "",
    500,
    0,
    { cutoff: cutoff },
  );
  for (const record of records) {
    try {
      $app.delete(record);
    } catch (err) {
      $app.logger().error("Не удалось удалить неподтверждённый аккаунт", "id", record.id, "error", String(err));
    }
  }
  if (records.length) {
    $app.logger().info("Удалены неподтверждённые аккаунты старше суток", "count", records.length);
  }
});
