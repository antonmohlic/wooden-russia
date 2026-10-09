/// <reference path="../pb_data/types.d.ts" />

// Серверная логика сайта (хуки PocketBase).
// Важно: каждый обработчик выполняется изолированно — переменные снаружи функций внутри недоступны.

// Один адрес сайта: со старого временного адреса и с www переадресуем на lemekh.ru с сохранением страницы.
// 308 — браузер повторит запрос тем же методом (важно для POST к API).
routerUse((e) => {
  const host = (e.request.host || "").toLowerCase().replace(/:\d+$/, "");
  if (host === "www.lemekh.ru" || host === "195-19-219-160.sslip.io") {
    return e.redirect(308, "https://lemekh.ru" + e.request.url.requestURI());
  }
  return e.next();
});

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

// Админу сайта показываем почту пользователей (например, авторов заявок), чтобы с ними можно было связаться.
// Остальным почта чужих пользователей по-прежнему скрыта. Менять чужие почту и пароль админ не может.
onRecordEnrich((e) => {
  const auth = e.requestInfo ? e.requestInfo.auth : null;
  if (auth && auth.collection().name === "users" && auth.getString("role") === "admin") {
    e.record.ignoreEmailVisibility(true);
  }
  return e.next();
}, "users");

// Имя автора наблюдения подставляет сервер (а не сайт), чтобы его нельзя было подделать.
// Хранится в самом наблюдении: так его видят все, не получая доступа к таблице пользователей.
onRecordCreateRequest((e) => {
  const name = e.auth ? (e.auth.getString("name") || "").trim() : "";
  e.record.set("author_name", name || "Участник");
  return e.next();
}, "observations");

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

// Страница объекта с готовыми метатегами для превью ссылок в Telegram, ВКонтакте и поисковиках.
// Они не выполняют JavaScript сайта, поэтому название, описание и фото подставляет сервер.
// Остальное на странице по-прежнему рисует object.js.
routerAdd("GET", "/object.html", (e) => {
  const esc = (text) =>
    String(text || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const siteName = "Лемех";
  const siteUrl = ($app.settings().meta.appURL || "").replace(/\/+$/, "");
  // Фото по умолчанию — Преображенская церковь в Кижах (Wikimedia Commons)
  const defaultImage = "https://commons.wikimedia.org/wiki/Special:FilePath/Kishi_church_2.jpg?width=1200";

  // Сайт лежит рядом с папкой хуков: на сервере в pb_public, при локальной разработке — в корне проекта
  let html = "";
  for (const dir of [__hooks + "/../pb_public", __hooks + "/../.."]) {
    try {
      html = toString($os.readFile(dir + "/object.html"));
      break;
    } catch (err) {}
  }
  if (!html) throw new NotFoundError();

  const slug = e.request.url.query().get("id");
  let record = null;
  try {
    if (slug) record = $app.findFirstRecordByData("objects", "slug", slug);
  } catch (err) {}
  if (!record) return e.html(200, html);

  const name = record.getString("name");
  const type = record.getString("type");
  let description = record.getString("description").replace(/\s+/g, " ").trim();
  if (!description) {
    const when = record.getString("year_text") || (record.getInt("year") ? String(record.getInt("year")) : "");
    description = [type, when, record.getString("region")].filter(Boolean).join(", ");
  }
  if (description.length > 200) description = description.slice(0, 197).replace(/\s+\S*$/, "") + "…";

  let image = record.getString("photo") || defaultImage;
  if (image.includes("Special:FilePath")) image = image.split("?")[0] + "?width=1200";

  const url = `${siteUrl}/object.html?id=${encodeURIComponent(slug)}`;
  const tags = [
    `<meta name="description" content="${esc(description)}">`,
    `<link rel="canonical" href="${esc(url)}">`,
    `<meta property="og:type" content="article">`,
    `<meta property="og:site_name" content="${esc(siteName)}">`,
    `<meta property="og:locale" content="ru_RU">`,
    `<meta property="og:title" content="${esc(name)}">`,
    `<meta property="og:description" content="${esc(description)}">`,
    `<meta property="og:url" content="${esc(url)}">`,
    `<meta property="og:image" content="${esc(image)}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
  ].join("\n  ");

  html = html
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(name)} — ${esc(siteName)}</title>`)
    .replace("</head>", `  ${tags}\n</head>`);
  return e.html(200, html);
});

// Карта сайта для Яндекса и Google: разделы и страницы всех объектов с датой последнего изменения
routerAdd("GET", "/sitemap.xml", (e) => {
  const siteUrl = ($app.settings().meta.appURL || "").replace(/\/+$/, "");
  const pages = ["index.html", "catalog.html", "museums.html", "news.html", "glossary.html", "bibliography.html", "about.html"];
  const entries = pages.map((page) => `  <url><loc>${siteUrl}/${page}</loc></url>`);
  const records = $app.findRecordsByFilter("objects", "", "slug", 0, 0);
  for (const record of records) {
    const loc = `${siteUrl}/object.html?id=${encodeURIComponent(record.getString("slug"))}`;
    const lastmod = record.getDateTime("updated").string().slice(0, 10);
    entries.push(`  <url><loc>${loc.replace(/&/g, "&amp;")}</loc><lastmod>${lastmod}</lastmod></url>`);
  }
  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    entries.join("\n") +
    "\n</urlset>\n";
  return e.blob(200, "application/xml; charset=utf-8", xml);
});

// Запоминаем, когда у объекта менялся статус (сохранился / аварийный / утрачен) — для подборки «Под угрозой».
// Срабатывает при любом сохранении: из модерации, из панели базы, из скриптов.
onRecordCreate((e) => {
  if (e.record.getString("status")) e.record.set("status_changed_at", new Date().toISOString().replace("T", " "));
  return e.next();
}, "objects");

onRecordUpdate((e) => {
  if (e.record.getString("status") !== e.record.original().getString("status")) {
    e.record.set("status_changed_at", new Date().toISOString().replace("T", " "));
  }
  return e.next();
}, "objects");

// Подборка «Под угрозой» за прошлый месяц — 1-го числа в 9:00 по Москве (6:00 UTC), черновиком в «Новости».
// Если за месяц ничего нового, выпуск пропускается.
cronAdd("threatsDigest", "0 6 1 * *", () => {
  const digest = require(`${__hooks}/digest.js`);
  const { year, month } = digest.previousMonth();
  try {
    const result = digest.createDigestDraft($app, year, month);
    $app.logger().info("Подборка «Под угрозой»", "month", `${year}-${month + 1}`, "result", result.skipped || "черновик создан");
  } catch (err) {
    $app.logger().error("Не удалось собрать подборку «Под угрозой»", "error", String(err));
  }
});

// Кнопка «Собрать выпуск сейчас» на странице «Новости» (только админ сайта).
// Тело запроса: { "month": "2026-09" }; без него — прошлый месяц.
routerAdd("POST", "/api/threats/digest", (e) => {
  if (e.auth?.getString("role") !== "admin") throw new ForbiddenError("Только для администратора сайта.");
  const digest = require(`${__hooks}/digest.js`);
  const body = e.requestInfo().body || {};
  let { year, month } = digest.previousMonth();
  const match = /^(\d{4})-(\d{2})$/.exec(String(body.month || ""));
  if (match) {
    year = Number(match[1]);
    month = Number(match[2]) - 1;
  }
  const result = digest.createDigestDraft($app, year, month);
  return e.json(200, { skipped: result.skipped || "", id: result.record ? result.record.id : "" });
}, $apis.requireAuth("users"));
