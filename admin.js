// Кабинет администратора: статистика, пользователи (роль, блокировка), журнал действий.
// Данные отдают маршруты /api/admin/* (backend/pb_hooks/admin.pb.js); права проверяет сервер.

const root = document.getElementById("admin");

const TABS = [
  ["stats", "Статистика"],
  ["users", "Пользователи"],
  ["log", "Журнал"],
];
const USER_FILTERS = [
  ["", "Все"],
  ["staff", "Админы и модераторы"],
  ["banned", "Заблокированные"],
  ["unverified", "Почта не подтверждена"],
];
const LOG_ACTIONS = {
  role: "роль",
  ban: "блокировка",
  unban: "снятие блокировки",
  approve: "принято",
  reject: "отклонено",
  delete_object: "удалён объект",
};

let currentTab = "stats";
const userQuery = { q: "", filter: "", page: 1 };

function formatDate(value, withTime) {
  if (!value) return "";
  const options = { day: "numeric", month: "short", year: "numeric" };
  if (withTime) Object.assign(options, { hour: "2-digit", minute: "2-digit" });
  return new Date(value.replace(" ", "T")).toLocaleString("ru-RU", options);
}

function number(value) {
  return Number(value || 0).toLocaleString("ru-RU");
}

// ---------- Статистика ----------

function statHtml(value, label, hint) {
  return `<div class="stat"><strong>${number(value)}</strong><span>${escapeHtml(label)}</span>${hint ? `<small>${escapeHtml(hint)}</small>` : ""}</div>`;
}

async function renderStats(box) {
  const s = await api("GET", "/api/admin/stats");
  const statuses = s.objects.byStatus.map((r) => `${r.status || "не указано"}: ${number(r.n)}`).join(" · ");
  const reviewers = s.moderation.reviewedWeek.length
    ? `<ul class="plain-list">${s.moderation.reviewedWeek
        .map((r) => `<li>${escapeHtml(r.name || "панель базы")} <span class="form-hint">(${escapeHtml(ROLE_LABELS[r.role] || "")})</span> — ${number(r.n)}</li>`)
        .join("")}</ul>`
    : `<p class="form-hint">За неделю ничего не разобрано.</p>`;
  const top = s.activity.top.length
    ? `<ol class="plain-list">${s.activity.top.map((r) => `<li><a href="object.html?id=${encodeURIComponent(r.slug)}">${escapeHtml(r.name)}</a> — ${number(r.n)}</li>`).join("")}</ol>`
    : `<p class="form-hint">Пока никто не добавлял объекты в списки.</p>`;

  box.innerHTML = `
    <section class="panel">
      <h2>Пользователи</h2>
      <div class="stat-grid">
        ${statHtml(s.users.total, "всего")}
        ${statHtml(s.users.week, "новых за 7 дней")}
        ${statHtml(s.users.month, "новых за 30 дней")}
        ${statHtml(s.users.verified, "подтвердили почту")}
        ${statHtml(s.users.moderators, "модераторов")}
        ${statHtml(s.users.banned, "заблокировано")}
      </div>
    </section>
    <section class="panel">
      <h2>Каталог</h2>
      <div class="stat-grid">
        ${statHtml(s.objects.total, "объектов", `из них музеев: ${number(s.objects.museums)}`)}
        ${statHtml(s.objects.worth, "«Стоит посетить»")}
      </div>
      <p class="form-hint">Состояние памятников: ${escapeHtml(statuses)}</p>
    </section>
    <section class="panel">
      <h2>Модерация</h2>
      <div class="stat-grid">
        ${statHtml(s.moderation.submissionsPending, "заявок ждут разбора")}
        ${statHtml(s.moderation.observationsPending, "наблюдений ждут разбора")}
        ${statHtml(s.moderation.submittedWeek, "заявок от участников за 7 дней")}
      </div>
      <h3>Разобрано за 7 дней</h3>
      ${reviewers}
      <p><a href="moderate.html">Открыть очередь модерации →</a></p>
    </section>
    <section class="panel">
      <h2>Активность</h2>
      <div class="stat-grid">
        ${statHtml(s.activity.want, "отметок «Хочу посетить»")}
        ${statHtml(s.activity.been, "отметок «Я здесь был»")}
        ${statHtml(s.activity.observations, "опубликованных наблюдений")}
      </div>
      <h3>Чаще всего добавляют в списки</h3>
      ${top}
    </section>`;
}

// ---------- Пользователи ----------

function userRowHtml(u) {
  const me = u.id === currentUser().id;
  const locked = me || u.role === "admin";
  const status = [
    u.verified ? "" : `<span class="tag">почта не подтверждена</span>`,
    u.banned ? `<span class="tag tag--danger" title="${escapeHtml(u.ban_reason)}">заблокирован ${escapeHtml(formatDate(u.banned_at))}</span>` : "",
  ].join(" ");
  const roleCell = locked
    ? escapeHtml(ROLE_LABELS[u.role] || u.role) + (me ? " (вы)" : "")
    : `<select data-role="${escapeHtml(u.id)}" aria-label="Роль">${["user", "moderator"]
        .map((r) => `<option value="${r}"${r === u.role ? " selected" : ""}>${ROLE_LABELS[r]}</option>`)
        .join("")}</select>`;
  const banCell = locked
    ? ""
    : u.banned
    ? `<button class="button button--secondary button--small" type="button" data-unban="${escapeHtml(u.id)}">Разблокировать</button>`
    : `<button class="button button--danger button--small" type="button" data-ban="${escapeHtml(u.id)}">Заблокировать</button>`;
  return `
    <tr>
      <td><strong>${escapeHtml(u.name || "без имени")}</strong><br><span class="form-hint">${escapeHtml(u.email)}</span>
        ${u.banned && u.ban_reason ? `<br><span class="form-hint">Причина: ${escapeHtml(u.ban_reason)}</span>` : ""}</td>
      <td>${escapeHtml(formatDate(u.created))}<br>${status}</td>
      <td>${number(u.submissions)} / ${number(u.approved)}<br><span class="form-hint">наблюдений: ${number(u.observations)}</span></td>
      <td>${roleCell}</td>
      <td>${banCell}</td>
    </tr>`;
}

async function renderUsers(box) {
  box.innerHTML = `
    <section class="panel">
      <form class="form form--inline" id="user-search">
        <label>Поиск по имени или почте
          <input type="search" name="q" value="${escapeHtml(userQuery.q)}" autocomplete="off">
        </label>
        <button class="button" type="submit">Найти</button>
      </form>
      <div class="chips user-filters">
        ${USER_FILTERS.map(([key, label]) => `<button class="chip${key === userQuery.filter ? " active" : ""}" type="button" data-filter="${key}">${label}</button>`).join("")}
      </div>
      <p class="form-error" id="users-error" role="alert" hidden></p>
      <div id="users-table"><p class="form-hint">Загрузка…</p></div>
    </section>`;

  box.querySelector("#user-search").addEventListener("submit", (e) => {
    e.preventDefault();
    userQuery.q = e.target.elements.q.value.trim();
    userQuery.page = 1;
    loadUsers();
  });
  box.querySelectorAll("[data-filter]").forEach((chip) =>
    chip.addEventListener("click", () => {
      userQuery.filter = chip.dataset.filter;
      userQuery.page = 1;
      box.querySelectorAll("[data-filter]").forEach((c) => c.classList.toggle("active", c === chip));
      loadUsers();
    })
  );
  await loadUsers();
}

async function loadUsers() {
  const table = document.getElementById("users-table");
  const params = new URLSearchParams({ q: userQuery.q, filter: userQuery.filter, page: userQuery.page });
  const result = await api("GET", `/api/admin/users?${params}`);
  table.innerHTML = `
    <p class="form-hint">Найдено: ${number(result.total)}</p>
    ${
      result.items.length
        ? `<div class="table-scroll"><table class="admin-table">
             <thead><tr><th>Пользователь</th><th>Регистрация</th><th>Заявок / принято</th><th>Роль</th><th></th></tr></thead>
             <tbody>${result.items.map(userRowHtml).join("")}</tbody>
           </table></div>`
        : ""
    }
    ${
      result.totalPages > 1
        ? `<div class="pager">
             <button class="button button--secondary button--small" type="button" data-page="${result.page - 1}"${result.page <= 1 ? " disabled" : ""}>← Назад</button>
             <span>Страница ${result.page} из ${result.totalPages}</span>
             <button class="button button--secondary button--small" type="button" data-page="${result.page + 1}"${result.page >= result.totalPages ? " disabled" : ""}>Вперёд →</button>
           </div>`
        : ""
    }`;

  table.querySelectorAll("[data-page]").forEach((b) =>
    b.addEventListener("click", () => {
      userQuery.page = Number(b.dataset.page);
      loadUsers().catch(showUsersError);
    })
  );
  table.querySelectorAll("[data-role]").forEach((select) =>
    select.addEventListener("change", () => {
      const user = result.items.find((u) => u.id === select.dataset.role);
      const label = ROLE_LABELS[select.value];
      if (!confirm(`Назначить «${user.name || user.email}» ролью «${label}»?`)) {
        select.value = user.role;
        return;
      }
      userAction(`/api/admin/users/${user.id}/role`, { role: select.value });
    })
  );
  table.querySelectorAll("[data-ban]").forEach((b) =>
    b.addEventListener("click", () => {
      const user = result.items.find((u) => u.id === b.dataset.ban);
      const reason = prompt(
        `Заблокировать «${user.name || user.email}»?\n\nОн не сможет отправлять заявки и наблюдения и менять профиль. ` +
          "Его заявки и наблюдения, ждущие разбора, будут отклонены.\n\nПричина (её увидит пользователь):"
      );
      if (reason === null) return;
      if (!reason.trim()) {
        alert("Нужно указать причину.");
        return;
      }
      userAction(`/api/admin/users/${user.id}/ban`, { banned: true, reason: reason.trim() });
    })
  );
  table.querySelectorAll("[data-unban]").forEach((b) =>
    b.addEventListener("click", () => {
      const user = result.items.find((u) => u.id === b.dataset.unban);
      if (confirm(`Снять блокировку с «${user.name || user.email}»?`)) userAction(`/api/admin/users/${user.id}/ban`, { banned: false });
    })
  );
}

async function userAction(path, body) {
  document.getElementById("users-error").hidden = true;
  try {
    await api("POST", path, body);
  } catch (e) {
    showUsersError(e);
  }
  await loadUsers().catch(showUsersError);
}

function showUsersError(e) {
  const error = document.getElementById("users-error");
  error.textContent = e.message;
  error.hidden = false;
}

// ---------- Журнал ----------

async function renderLog(box) {
  const result = await api("GET", "/api/collections/admin_log/records?sort=-created&perPage=200");
  box.innerHTML = `
    <section class="panel">
      <p class="form-hint">Последние ${number(result.items.length)} из ${number(result.totalItems)} действий админов и модераторов.</p>
      ${
        result.items.length
          ? `<div class="table-scroll"><table class="admin-table">
               <thead><tr><th>Когда</th><th>Кто</th><th>Действие</th><th>Над чем</th><th>Подробности</th></tr></thead>
               <tbody>${result.items
                 .map(
                   (l) => `<tr>
                     <td>${escapeHtml(formatDate(l.created, true))}</td>
                     <td>${escapeHtml(l.actor_name)}</td>
                     <td>${escapeHtml(LOG_ACTIONS[l.action] || l.action)}</td>
                     <td>${escapeHtml(l.target)}</td>
                     <td>${escapeHtml(l.details)}</td>
                   </tr>`
                 )
                 .join("")}</tbody>
             </table></div>`
          : `<p>Журнал пока пуст.</p>`
      }
    </section>`;
}

// ---------- Страница ----------

function renderTab() {
  const box = document.getElementById("admin-content");
  box.innerHTML = `<p class="form-hint">Загрузка…</p>`;
  const render = { stats: renderStats, users: renderUsers, log: renderLog }[currentTab];
  render(box).catch((e) => (box.innerHTML = `<p class="form-error">${escapeHtml(e.message)}</p>`));
}

function renderPage() {
  root.innerHTML = `
    <p class="breadcrumbs"><a href="account.html">← Личный кабинет</a></p>
    <h1>Кабинет администратора</h1>
    <div class="tabs" role="tablist">
      ${TABS.map(
        ([key, label]) =>
          `<button class="tab${key === currentTab ? " active" : ""}" type="button" role="tab" data-tab="${key}" aria-selected="${key === currentTab}">${label}</button>`
      ).join("")}
    </div>
    <div id="admin-content"></div>`;

  root.querySelectorAll(".tab").forEach((tab) =>
    tab.addEventListener("click", () => {
      currentTab = tab.dataset.tab;
      root.querySelectorAll(".tab").forEach((t) => {
        t.classList.toggle("active", t === tab);
        t.setAttribute("aria-selected", t === tab);
      });
      renderTab();
    })
  );
  renderTab();
}

(async () => {
  if (!(await checkServer())) {
    root.innerHTML = `<h1>Кабинет администратора</h1><p>Сейчас нет связи с сервером. Попробуйте позже.</p>`;
    return;
  }
  const user = await refreshAuth();
  if (!user) {
    location.replace("login.html?next=admin.html");
    return;
  }
  if (!isSiteAdmin()) {
    root.innerHTML = `<h1>Кабинет администратора</h1><p>Этот раздел доступен только администратору сайта.</p>`;
    return;
  }
  renderPage();
})();
