/// <reference path="../pb_data/types.d.ts" />

// Серверная логика сайта (хуки PocketBase).
// Важно: каждый обработчик выполняется изолированно — переменные снаружи функций внутри недоступны.

// Дополнительные заголовки безопасности для всех ответов сервера
routerUse((e) => {
  const headers = e.response.header();
  // Открывать сайт только по HTTPS полгода. Без includeSubDomains: соседние поддомены не наши.
  if (e.request.tls) headers.set("Strict-Transport-Security", "max-age=15552000");
  // Чужим сайтам по ссылкам передаём только адрес сайта, без страницы и параметров
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  // Сайту не нужны камера, микрофон и геолокация — запрещаем их заранее
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");

  // Кэширование файлов сайта (запросы к API не трогаем):
  // HTML и данные браузер перепроверяет при каждом открытии — обновления видны сразу;
  // скрипты и стили с номером версии (?v=…) не меняются никогда — их можно хранить год.
  const path = e.request.url.path;
  if (!path.startsWith("/api/") && !path.startsWith("/_/")) {
    if (e.request.url.query().get("v")) {
      headers.set("Cache-Control", "public, max-age=31536000, immutable");
    } else if (path.startsWith("/vendor/")) {
      headers.set("Cache-Control", "public, max-age=2592000");
    } else {
      headers.set("Cache-Control", "no-cache");
    }
  }
  return e.next();
});

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
