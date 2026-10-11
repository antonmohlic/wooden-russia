/// <reference path="../pb_data/types.d.ts" />

// Кабинет администратора (admin.html): статистика, пользователи, журнал. Логика — в admin.js.
// Каждый обработчик выполняется изолированно, поэтому модуль подключается внутри.

routerAdd("GET", "/api/admin/stats", (e) => {
  if (e.auth?.getString("role") !== "admin") throw new ForbiddenError("Только для администратора сайта.");
  return e.json(200, require(`${__hooks}/admin.js`).stats($app));
}, $apis.requireAuth("users"));

// ?q=поиск&filter=staff|banned|unverified&page=1
routerAdd("GET", "/api/admin/users", (e) => {
  if (e.auth?.getString("role") !== "admin") throw new ForbiddenError("Только для администратора сайта.");
  const query = e.request.url.query();
  return e.json(200, require(`${__hooks}/admin.js`).listUsers($app, {
    q: (query.get("q") || "").trim(),
    filter: query.get("filter") || "",
    page: query.get("page") || "1",
  }));
}, $apis.requireAuth("users"));

// Тело: { "role": "user" | "moderator" }
routerAdd("POST", "/api/admin/users/{id}/role", (e) => {
  if (e.auth?.getString("role") !== "admin") throw new ForbiddenError("Только для администратора сайта.");
  const body = e.requestInfo().body || {};
  require(`${__hooks}/admin.js`).setRole($app, e.auth, e.request.pathValue("id"), String(body.role || ""));
  return e.json(200, { ok: true });
}, $apis.requireAuth("users"));

// Тело: { "banned": true, "reason": "…" } или { "banned": false }
routerAdd("POST", "/api/admin/users/{id}/ban", (e) => {
  if (e.auth?.getString("role") !== "admin") throw new ForbiddenError("Только для администратора сайта.");
  const body = e.requestInfo().body || {};
  require(`${__hooks}/admin.js`).setBanned($app, e.auth, e.request.pathValue("id"), body.banned === true, body.reason);
  return e.json(200, { ok: true });
}, $apis.requireAuth("users"));

// Журнал: кто принял или отклонил заявку и наблюдение
onRecordUpdateRequest((e) => {
  const before = e.record.original().getString("status");
  e.next();
  const after = e.record.getString("status");
  if (!e.auth || before !== "pending" || (after !== "approved" && after !== "rejected")) return;
  const admin = require(`${__hooks}/admin.js`);
  admin.log($app, e.auth, after === "approved" ? "approve" : "reject", admin.reviewTarget($app, e.record), e.record.getString("admin_comment"));
}, "submissions", "observations");

// Журнал: удаление объекта с сайта
onRecordDeleteRequest((e) => {
  const name = e.record.getString("name");
  const slug = e.record.getString("slug");
  e.next();
  if (e.auth) require(`${__hooks}/admin.js`).log($app, e.auth, "delete_object", `${name} (${slug})`, "");
}, "objects");
