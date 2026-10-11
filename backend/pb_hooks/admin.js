// Кабинет администратора: статистика, пользователи (роль, блокировка) и журнал действий.
// Подключается из admin.pb.js через require. Права проверяет вызывающий маршрут.

const DAY = 24 * 60 * 60 * 1000;

// Дата в формате базы: «2026-10-11 08:30:00.000Z»
function dbDate(date) {
  return date.toISOString().replace("T", " ");
}

function count(app, collection, where, params) {
  return app.countRecords(collection, $dbx.exp(where || "1=1", params || {}));
}

// Строки произвольного запроса: shape — образец строки, например { name: "", n: 0 }
function rows(app, sql, params, shape) {
  const result = arrayOf(new DynamicModel(shape));
  app.db().newQuery(sql).bind(params || {}).all(result);
  return result.map((row) => Object.fromEntries(Object.keys(shape).map((key) => [key, row[key]])));
}

function userName(record) {
  return record ? record.getString("name") || record.email() || record.id : "";
}

// Запись в журнал. Ошибка журнала не должна мешать самому действию.
function log(app, actor, action, target, details) {
  try {
    const collection = app.findCollectionByNameOrId("admin_log");
    const record = new Record(collection);
    // Действие из панели базы (суперпользователь) — без ссылки на участника
    const isUser = actor && actor.collection().name === "users";
    record.set("actor", isUser ? actor.id : "");
    record.set("actor_name", isUser ? userName(actor) : "панель базы");
    record.set("action", action);
    record.set("target", String(target || "").slice(0, 300));
    record.set("details", String(details || "").slice(0, 2000));
    app.save(record);
  } catch (err) {
    app.logger().error("Не удалось записать в журнал", "action", action, "error", String(err));
  }
}

// Статистика для первой вкладки кабинета
function stats(app) {
  const now = Date.now();
  const week = dbDate(new Date(now - 7 * DAY));
  const month = dbDate(new Date(now - 30 * DAY));
  const staff = "role = 'admin' OR role = 'moderator'";

  return {
    users: {
      total: count(app, "users"),
      week: count(app, "users", "created >= {:d}", { d: week }),
      month: count(app, "users", "created >= {:d}", { d: month }),
      verified: count(app, "users", "verified = TRUE"),
      moderators: count(app, "users", "role = 'moderator'"),
      admins: count(app, "users", "role = 'admin'"),
      banned: count(app, "users", "banned = TRUE"),
    },
    objects: {
      total: count(app, "objects"),
      worth: count(app, "objects", "worth_visit = TRUE"),
      museums: count(app, "objects", "type = 'музей'"),
      byStatus: rows(app, "SELECT COALESCE(status, '') AS status, COUNT(*) AS n FROM objects WHERE type != 'музей' GROUP BY status ORDER BY n DESC", {}, { status: "", n: 0 }),
    },
    moderation: {
      submissionsPending: count(app, "submissions", "status = 'pending'"),
      observationsPending: count(app, "observations", "status = 'pending'"),
      // Сколько заявок и наблюдений разобрал каждый за неделю
      reviewedWeek: rows(
        app,
        `SELECT COALESCE(u.name, '') AS name, COALESCE(u.role, '') AS role, COUNT(*) AS n FROM (
           SELECT reviewed_by FROM submissions WHERE status != 'pending' AND reviewed_at >= {:d}
           UNION ALL
           SELECT reviewed_by FROM observations WHERE status != 'pending' AND reviewed_at >= {:d}
         ) r LEFT JOIN users u ON u.id = r.reviewed_by GROUP BY r.reviewed_by ORDER BY n DESC`,
        { d: week },
        { name: "", role: "", n: 0 }
      ),
      // Новые заявки за неделю от участников (кроме админов и модераторов; служебный бот считается участником)
      submittedWeek: count(app, "submissions", `created >= {:d} AND author IN (SELECT id FROM users WHERE NOT (${staff}))`, { d: week }),
    },
    activity: {
      want: count(app, "visits", "list = 'want'"),
      been: count(app, "visits", "list = 'been'"),
      observations: count(app, "observations", "status = 'approved'"),
      // Объекты, которые чаще всего добавляют в списки
      top: rows(
        app,
        `SELECT o.slug AS slug, o.name AS name, COUNT(*) AS n FROM visits v JOIN objects o ON o.id = v.object
         GROUP BY v.object ORDER BY n DESC, o.name LIMIT 10`,
        {},
        { slug: "", name: "", n: 0 }
      ),
    },
  };
}

// Список пользователей для второй вкладки: поиск, фильтр, страницы по 50
function listUsers(app, query) {
  const perPage = 50;
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const where = [];
  const params = {};
  if (query.q) {
    where.push("(name LIKE {:q} OR email LIKE {:q})");
    params.q = `%${query.q}%`;
  }
  if (query.filter === "staff") where.push("(role = 'admin' OR role = 'moderator')");
  if (query.filter === "banned") where.push("banned = TRUE");
  if (query.filter === "unverified") where.push("verified = FALSE");
  const sql = where.join(" AND ") || "1=1";

  const total = count(app, "users", sql, params);
  const records = rows(
    app,
    `SELECT id FROM users WHERE ${sql} ORDER BY created DESC LIMIT ${perPage} OFFSET ${(page - 1) * perPage}`,
    params,
    { id: "" }
  );
  const items = records.map(({ id }) => {
    const user = app.findRecordById("users", id);
    return {
      id,
      name: user.getString("name"),
      email: user.email(),
      verified: user.verified(),
      role: user.getString("role") || "user",
      banned: user.getBool("banned"),
      ban_reason: user.getString("ban_reason"),
      banned_at: user.getString("banned_at"),
      created: user.getString("created"),
      submissions: count(app, "submissions", "author = {:id}", { id }),
      approved: count(app, "submissions", "author = {:id} AND status = 'approved'", { id }),
      observations: count(app, "observations", "author = {:id}", { id }),
    };
  });
  return { page, perPage, total, totalPages: Math.max(1, Math.ceil(total / perPage)), items };
}

// Чужой аккаунт, которым админ может управлять: не свой и не другого админа
function manageableUser(app, actor, id) {
  let user;
  try {
    user = app.findRecordById("users", id);
  } catch (err) {
    throw new NotFoundError("Пользователь не найден.");
  }
  if (user.id === actor.id) throw new BadRequestError("Свою роль и блокировку изменить нельзя.");
  if (user.getString("role") === "admin") throw new BadRequestError("Администратором можно управлять только из панели базы.");
  return user;
}

const ROLE_LABELS = { user: "участник", moderator: "модератор" };

function setRole(app, actor, id, role) {
  if (!ROLE_LABELS[role]) throw new BadRequestError("Можно назначить только участника или модератора.");
  const user = manageableUser(app, actor, id);
  const before = user.getString("role") || "user";
  if (before === role) return user;
  if (role === "moderator" && user.getBool("banned")) throw new BadRequestError("Сначала снимите блокировку.");
  user.set("role", role);
  app.save(user);
  log(app, actor, "role", `${userName(user)} (${user.email()})`, `${ROLE_LABELS[before] || before} → ${ROLE_LABELS[role]}`);
  return user;
}

// Блокировка: запрет отправлять что-либо на сайт. Заодно снимаются роль модератора и всё, что ждёт разбора.
function setBanned(app, actor, id, banned, reason) {
  const user = manageableUser(app, actor, id);
  reason = String(reason || "").trim().slice(0, 500);
  if (banned && !reason) throw new BadRequestError("Укажите причину блокировки — её увидит пользователь.");

  let withdrawn = 0;
  app.runInTransaction((txApp) => {
    user.set("banned", banned);
    user.set("ban_reason", banned ? reason : "");
    user.set("banned_at", banned ? dbDate(new Date()) : "");
    if (banned && user.getString("role") === "moderator") user.set("role", "user");
    txApp.save(user);

    if (banned) {
      for (const collection of ["submissions", "observations"]) {
        const pending = txApp.findRecordsByFilter(collection, "author = {:id} && status = 'pending'", "", 0, 0, { id: user.id });
        for (const record of pending) {
          record.set("status", "rejected");
          record.set("admin_comment", "Автор заблокирован.");
          record.set("reviewed_by", actor.id);
          record.set("reviewed_at", dbDate(new Date()));
          txApp.save(record);
          withdrawn++;
        }
      }
    }
  });

  log(
    app,
    actor,
    banned ? "ban" : "unban",
    `${userName(user)} (${user.email()})`,
    banned ? `${reason}${withdrawn ? `. Отклонено ждавших разбора: ${withdrawn}` : ""}` : ""
  );
  return user;
}

// Название того, что разобрали: объект из заявки или объект наблюдения
function reviewTarget(app, record) {
  if (record.collection().name === "observations") {
    try {
      return "наблюдение: " + app.findRecordById("objects", record.getString("object")).getString("name");
    } catch (err) {
      return "наблюдение";
    }
  }
  let data = {};
  try {
    data = JSON.parse(record.getString("data") || "{}");
  } catch (err) {}
  const kinds = { create: "новый объект", update: "правка", delete: "удаление" };
  return `${kinds[record.getString("kind")] || "заявка"}: ${data.name || record.getString("target_name") || record.getString("target")}`;
}

module.exports = { stats, listUsers, setRole, setBanned, log, reviewTarget };
