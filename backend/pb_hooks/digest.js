// Ежемесячная подборка «Под угрозой» для ленты новостей.
// Подключается из main.pb.js через require: ежемесячное задание и кнопка «Собрать выпуск» у админа.
// Выпуск сохраняется черновиком — админ проверяет текст и публикует его на странице «Новости».

// Тревожное состояние по наблюдению посетителя
const ALARM_CONDITIONS = ["плохое", "аварийное", "руины"];
// Наблюдения старше этого срока не считаем: состояние могло измениться
const OBSERVATION_YEARS = 3;

const MONTHS = ["январь", "февраль", "март", "апрель", "май", "июнь", "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь"];
const MONTHS_GENITIVE = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];

function pad(n) {
  return String(n).padStart(2, "0");
}

// Дата в формате базы: «2026-09-01 00:00:00.000Z»
function dbDate(date) {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} 00:00:00.000Z`;
}

// «2026-09-14 00:00:00.000Z» → «14 сентября»
function dayLabel(value) {
  const [year, month, day] = String(value).slice(0, 10).split("-").map(Number);
  return day ? `${day} ${MONTHS_GENITIVE[month - 1]}` : "";
}

function link(record) {
  return `[${record.getString("name")}](object.html?id=${record.getString("slug")})`;
}

function excerpt(text, max) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  return clean.length > max ? clean.slice(0, max - 1).replace(/\s+\S*$/, "") + "…" : clean;
}

// Сколько объектов сейчас под угрозой: аварийные плюс те, чьё последнее свежее наблюдение тревожное
function countUnderThreat(app) {
  const ids = {};
  app.findRecordsByFilter("objects", 'status = "аварийный"', "", 0, 0).forEach((r) => (ids[r.id] = true));
  const since = new Date();
  since.setUTCFullYear(since.getUTCFullYear() - OBSERVATION_YEARS);
  const seen = {};
  const observations = app.findRecordsByFilter(
    "observations",
    'status = "approved" && visited_on >= {:since}',
    "-visited_on,-created",
    0,
    0,
    { since: dbDate(since) },
  );
  for (const obs of observations) {
    const objectId = obs.getString("object");
    if (seen[objectId]) continue;
    seen[objectId] = true;
    if (ALARM_CONDITIONS.includes(obs.getString("condition"))) ids[objectId] = true;
  }
  return Object.keys(ids).length;
}

// Собирает выпуск за месяц (month — 0…11). Возвращает null, если за месяц ничего нового.
function buildDigest(app, year, month) {
  const from = dbDate(new Date(Date.UTC(year, month, 1)));
  const to = dbDate(new Date(Date.UTC(year, month + 1, 1)));
  const params = { from: from, to: to };

  const changed = app.findRecordsByFilter(
    "objects",
    '(status = "аварийный" || status = "утрачен") && status_changed_at >= {:from} && status_changed_at < {:to}',
    "status,name",
    0,
    0,
    params,
  );
  const observations = app.findRecordsByFilter(
    "observations",
    'status = "approved" && reviewed_at >= {:from} && reviewed_at < {:to} && (condition = "плохое" || condition = "аварийное" || condition = "руины")',
    "-visited_on",
    0,
    0,
    params,
  );
  if (!changed.length && !observations.length) return null;

  const lines = [
    `Ежемесячная подборка памятников, которым нужна помощь: что изменилось за ${MONTHS[month]} ${year} года.`,
  ];
  let photoObject = null;

  const emergency = changed.filter((r) => r.getString("status") === "аварийный");
  const lost = changed.filter((r) => r.getString("status") === "утрачен");
  if (emergency.length) {
    lines.push(
      "Признаны аварийными:\n" +
        emergency.map((r) => `— ${link(r)}${r.getString("region") ? `, ${r.getString("region")}` : ""}`).join("\n"),
    );
    photoObject = photoObject || emergency.find((r) => r.getString("photo"));
  }
  if (lost.length) {
    lines.push(
      "Утрачены:\n" + lost.map((r) => `— ${link(r)}${r.getString("region") ? `, ${r.getString("region")}` : ""}`).join("\n"),
    );
  }

  if (observations.length) {
    const items = [];
    for (const obs of observations) {
      let object;
      try {
        object = app.findRecordById("objects", obs.getString("object"));
      } catch (err) {
        continue;
      }
      const quote = excerpt(obs.getString("text"), 160);
      items.push(
        `— ${link(object)}: ${obs.getString("condition")} состояние (${dayLabel(obs.getString("visited_on"))}, ${obs.getString("author_name") || "участник"})` +
          (quote ? `. «${quote}»` : ""),
      );
      photoObject = photoObject || (object.getString("photo") ? object : null);
    }
    if (items.length) lines.push("Тревожные наблюдения посетителей:\n" + items.join("\n"));
  }

  lines.push(
    `Всего под угрозой на сайте сейчас: ${countUnderThreat(app)}. Полный список — на странице [«Под угрозой»](threats.html).`,
    "Были у этих памятников недавно? Расскажите на их странице, в каком они состоянии, — это помогает вовремя заметить угрозу.",
  );

  return {
    title: `Под угрозой: ${MONTHS[month]} ${year}`,
    body: lines.join("\n\n"),
    photo: photoObject,
  };
}

// Сохраняет выпуск черновиком. Повторно за тот же месяц не создаёт.
// Возвращает { record } или { skipped: "причина" }.
function createDigestDraft(app, year, month) {
  const digest = buildDigest(app, year, month);
  if (!digest) return { skipped: "за месяц ничего нового" };
  const existing = app.findRecordsByFilter("news", "title = {:title}", "", 1, 0, { title: digest.title });
  if (existing.length) return { skipped: "выпуск за этот месяц уже есть", record: existing[0] };

  const record = new Record(app.findCollectionByNameOrId("news"));
  record.set("title", digest.title);
  record.set("body", digest.body);
  record.set("published_at", new Date().toISOString().replace("T", " "));
  record.set("draft", true);
  if (digest.photo) {
    for (const key of ["photo", "photo_author", "photo_license", "photo_source"]) {
      record.set(key, digest.photo.getString(key));
    }
  }
  app.save(record);
  return { record: record };
}

// Прошлый месяц относительно даты: для выпуска 1-го числа
function previousMonth(date) {
  const d = date || new Date();
  const month = d.getUTCMonth() === 0 ? 11 : d.getUTCMonth() - 1;
  const year = d.getUTCMonth() === 0 ? d.getUTCFullYear() - 1 : d.getUTCFullYear();
  return { year: year, month: month };
}

module.exports = { createDigestDraft, previousMonth, ALARM_CONDITIONS };
