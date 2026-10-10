// Кабинет админа: очередь заявок участников, принятие, правка перед принятием, отклонение.
// Сервер всё равно проверяет права: менять объекты и заявки может только пользователь с ролью admin.

const root = document.getElementById("moderate");

const OBJECT_TYPES = ["церковь", "часовня", "колокольня", "изба", "амбар", "мельница", "музей", "другое"];

// Поля, которые можно перенести из заявки в объект. Всё остальное из заявки игнорируется.
const FIELDS = [
  ["name", "Название"],
  ["type", "Тип"],
  ["status", "Состояние"],
  ["museum", "В музее"],
  ["origin", "Откуда перевезён"],
  ["heritage_category", "Охранный статус"],
  ["heritage_number", "Номер в реестре"],
  ["region", "Регион"],
  ["address", "Адрес"],
  ["lat", "Широта"],
  ["lon", "Долгота"],
  ["year", "Год постройки"],
  ["year_text", "Дата текстом"],
  ["century", "Век"],
  ["founded", "Год основания"],
  ["description", "Описание"],
  ["wiki", "Википедия"],
  ["website", "Сайт"],
  ["photo", "Фото"],
  ["photo_author", "Автор фото"],
  ["photo_license", "Лицензия фото"],
  ["photo_source", "Источник фото"],
];
const FIELD_LABELS = Object.fromEntries(FIELDS);
const NUMBER_FIELDS = ["lat", "lon", "year", "century", "founded"];

const KIND_LABELS = { create: "Новый объект", update: "Правка", delete: "Удаление" };
const STATUS_TABS = [
  ["pending", "На модерации"],
  ["approved", "Принятые"],
  ["rejected", "Отклонённые"],
];

let objects = [];
let objectsBySlug = new Map();
let currentTab = "pending";

// ---------- Вспомогательное ----------

const TRANSLIT = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "y", к: "k",
  л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "kh", ц: "ts",
  ч: "ch", ш: "sh", щ: "shch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
};

// «Церковь Петра и Павла (Вирма)» → «tserkov-petra-i-pavla-virma»
function makeSlug(text) {
  return [...(text || "").toLowerCase()]
    .map((ch) => TRANSLIT[ch] ?? ch)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

// Адрес страницы нового объекта: предложенный в заявке (например, чтобы к музею сразу привязались его памятники),
// если он свободен, иначе — из названия
function suggestedSlug(data) {
  const wanted = data?.slug;
  return wanted && /^[a-z0-9-]+$/.test(wanted) && !objectsBySlug.has(wanted) ? wanted : uniqueSlug(makeSlug(data?.name));
}

function uniqueSlug(base) {
  let slug = base || "object";
  for (let i = 2; objectsBySlug.has(slug); i++) slug = `${base}-${i}`;
  return slug;
}

function formatDateTime(value) {
  if (!value) return "";
  return new Date(value.replace(" ", "T")).toLocaleString("ru-RU", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
}

function display(value) {
  if (value === null || value === undefined || value === "") return `<span class="empty-value">—</span>`;
  const text = String(value);
  if (/^https?:\/\//.test(text)) return `<a href="${escapeHtml(text)}" target="_blank" rel="noopener">${escapeHtml(text.length > 60 ? text.slice(0, 60) + "…" : text)}</a>`;
  return escapeHtml(text);
}

// Поле ввода для значения «стало» — админ может поправить его перед принятием
function inputHtml(key, value) {
  const v = escapeHtml(value ?? "");
  if (key === "type") {
    return `<select name="${key}">${OBJECT_TYPES.map((t) => `<option${t === value ? " selected" : ""}>${t}</option>`).join("")}</select>`;
  }
  if (key === "status") {
    const options = ["", ...Object.keys(STATUS_COLORS)];
    return `<select name="${key}">${options.map((s) => `<option value="${s}"${s === (value || "") ? " selected" : ""}>${s || "не указано"}</option>`).join("")}</select>`;
  }
  if (key === "museum") {
    const museums = objects.filter(isMuseum);
    return `<select name="${key}"><option value="">нет</option>${museums
      .map((m) => `<option value="${escapeHtml(m.id)}"${m.id === value ? " selected" : ""}>${escapeHtml(m.name)}</option>`)
      .join("")}</select>`;
  }
  if (key === "description") return `<textarea name="${key}" rows="5">${v}</textarea>`;
  if (NUMBER_FIELDS.includes(key)) return `<input type="number" step="any" name="${key}" value="${v}">`;
  return `<input type="text" name="${key}" value="${v}">`;
}

// Значения из полей «стало» → данные для объекта
function readValues(form, keys) {
  const values = {};
  for (const key of keys) {
    const field = form.elements[key];
    if (!field) continue;
    const raw = field.value.trim();
    if (NUMBER_FIELDS.includes(key)) values[key] = raw === "" ? null : Number(raw);
    else values[key] = raw;
  }
  return values;
}

// Автор заявки. Почту PocketBase показывает, только если пользователь сам открыл её,
// поэтому её отсутствие — не признак удалённого аккаунта; удалён — если записи автора нет совсем.
function authorLabel(author) {
  if (!author) return "пользователь удалён";
  const name = escapeHtml(author.name || "без имени");
  return author.email ? `${name} (${escapeHtml(author.email)})` : name;
}

// ---------- Карточка заявки ----------

function changesTableHtml(sub, editable) {
  const target = objectsBySlug.get(sub.target);
  const data = sub.data || {};
  // Для нового объекта показываем все поля, для правки — только изменённые
  const keys = sub.kind === "create" ? FIELDS.map(([k]) => k).filter((k) => k in data || ["name", "type", "lat", "lon"].includes(k)) : Object.keys(data).filter((k) => k in FIELD_LABELS);
  const rows = keys.map((key) => {
    const before = sub.kind === "update" ? `<td class="diff-before">${display(target ? target[key] : "")}</td>` : "";
    const after = editable ? inputHtml(key, data[key]) : display(data[key]);
    return `<tr><th>${FIELD_LABELS[key]}</th>${before}<td class="diff-after">${after}</td></tr>`;
  });
  const head = sub.kind === "update" ? "<tr><th></th><th>Было</th><th>Стало</th></tr>" : "";
  return `<table class="diff-table">${head}${rows.join("")}</table>`;
}

function submissionCardHtml(sub) {
  const author = sub.expand?.author;
  const target = objectsBySlug.get(sub.target);
  const pending = sub.status === "pending";
  const name = sub.data?.name || target?.name || sub.target_name || sub.target;
  const missingTarget = sub.kind !== "create" && !target;

  let body = "";
  if (sub.kind === "delete") {
    body = target
      ? `<p>Удалить объект <a href="${objectUrl(target)}" target="_blank">${escapeHtml(target.name)}</a> (${escapeHtml(yearLine(target))}).</p>
         ${isMuseum(target) && objects.some((o) => o.museum === target.id) ? `<p class="form-error">Это музей, и у него есть памятники на сайте. После удаления у них пропадёт ссылка на музей.</p>` : ""}`
      : "";
  } else {
    body = changesTableHtml(sub, pending && !missingTarget);
  }

  const photo = sub.kind === "create" && sub.data?.photo ? `<img class="photo-preview" src="${escapeHtml(photoSrc(sub.data, 500))}" alt="">` : "";

  return `
    <article class="panel moderation-card" data-id="${escapeHtml(sub.id)}">
      <div class="submission-head">
        <strong>${KIND_LABELS[sub.kind] || sub.kind}:</strong>
        ${target ? `<a href="${objectUrl(target)}" target="_blank">${escapeHtml(name)}</a>` : escapeHtml(name || "без названия")}
      </div>
      <p class="submission-meta">
        от ${authorLabel(author)} · ${escapeHtml(formatDateTime(sub.created))}
      </p>
      ${sub.comment ? `<p class="submission-text">Комментарий автора: ${escapeHtml(sub.comment)}</p>` : ""}
      ${missingTarget ? `<p class="form-error">Объекта «${escapeHtml(sub.target)}» больше нет на сайте — заявку можно только отклонить.</p>` : ""}

      <form class="form">
        ${photo}
        ${body}
        ${
          pending
            ? `${sub.kind === "create" ? `<label>Адрес страницы объекта (латиницей)<input type="text" name="slug" value="${escapeHtml(suggestedSlug(sub.data))}" pattern="[a-z0-9-]+"></label>` : ""}
               <label>Комментарий автору (обязателен при отклонении)
                 <textarea name="admin_comment" rows="2" maxlength="2000"></textarea>
               </label>
               <p class="form-error" role="alert" hidden></p>
               <div class="moderation-actions">
                 ${missingTarget ? "" : `<button class="button" type="button" data-action="approve">${sub.kind === "delete" ? "Удалить объект" : "Принять"}</button>`}
                 <button class="button button--secondary" type="button" data-action="reject">Отклонить</button>
               </div>`
            : `<p class="submission-meta">
                 ${sub.status === "approved" ? "Принята" : "Отклонена"} ${escapeHtml(formatDateTime(sub.reviewed_at))}
                 ${sub.expand?.reviewed_by ? `· ${escapeHtml(sub.expand.reviewed_by.name || sub.expand.reviewed_by.email)}` : ""}
               </p>
               ${sub.admin_comment ? `<p class="submission-text submission-text--admin">Ответ: ${escapeHtml(sub.admin_comment)}</p>` : ""}`
        }
      </form>
    </article>`;
}

// ---------- Действия ----------

async function markReviewed(sub, status, comment, extra = {}) {
  await api("PATCH", `/api/collections/submissions/records/${sub.id}`, {
    status,
    admin_comment: comment,
    reviewed_by: currentUser().id,
    reviewed_at: new Date().toISOString().replace("T", " "),
    ...extra,
  });
}

async function approve(sub, form) {
  const comment = form.elements.admin_comment.value.trim();

  if (sub.kind === "create") {
    const keys = FIELDS.map(([k]) => k).filter((k) => form.elements[k]);
    const values = readValues(form, keys);
    // Скрытые в таблице поля (их не было в заявке) берём из заявки как есть
    for (const [key] of FIELDS) if (!(key in values) && key in (sub.data || {})) values[key] = sub.data[key];
    const slug = form.elements.slug.value.trim();
    if (!/^[a-z0-9-]+$/.test(slug)) throw new Error("Адрес страницы: только латинские буквы, цифры и дефис.");
    if (objectsBySlug.has(slug)) throw new Error("Объект с таким адресом страницы уже есть — измените его.");
    await api("POST", "/api/collections/objects/records", { ...values, slug });
    // Запоминаем, какой объект получился, — в истории и у автора будет ссылка на него
    await markReviewed(sub, "approved", comment, { target: slug });
    return true;
  } else if (sub.kind === "update") {
    const target = objectsBySlug.get(sub.target);
    const values = readValues(form, Object.keys(sub.data || {}).filter((k) => k in FIELD_LABELS));
    await api("PATCH", `/api/collections/objects/records/${target.recordId}`, values);
  } else if (sub.kind === "delete") {
    const target = objectsBySlug.get(sub.target);
    if (!confirm(`Удалить «${target.name}» с сайта? Это нельзя отменить.`)) return false;
    await api("DELETE", `/api/collections/objects/records/${target.recordId}`);
  }

  await markReviewed(sub, "approved", comment);
  return true;
}

async function reject(sub, form) {
  const comment = form.elements.admin_comment.value.trim();
  if (!comment) throw new Error("Напишите автору, почему заявка отклонена.");
  await markReviewed(sub, "rejected", comment);
  return true;
}

// ---------- Страница ----------

async function reloadObjects() {
  objects = await fetchObjectsFromServer();
  objectsBySlug = new Map(objects.map((o) => [o.id, o]));
}

// Что сейчас проверяем: заявки на объекты или наблюдения за состоянием
let currentType = "submissions";

async function countPending(collection) {
  const filter = encodeURIComponent('status = "pending"');
  return (await api("GET", `/api/collections/${collection}/records?filter=${filter}&perPage=1&fields=id`)).totalItems;
}

async function updatePendingCounts() {
  const [subs, obs] = await Promise.all([countPending("submissions"), countPending("observations")]);
  document.getElementById("count-submissions").textContent = subs;
  document.getElementById("count-observations").textContent = obs;
  document.getElementById("pending-count").textContent = currentType === "submissions" ? subs : obs;
}

async function renderList() {
  const list = document.getElementById("moderation-list");
  list.innerHTML = `<p class="form-hint">Загрузка…</p>`;
  updatePendingCounts().catch(() => {});
  if (currentType === "observations") return renderObservationList(list);

  const filter = encodeURIComponent(`status = "${currentTab}"`);
  const sort = currentTab === "pending" ? "created" : "-reviewed_at";
  const result = await api("GET", `/api/collections/submissions/records?filter=${filter}&sort=${sort}&perPage=500&expand=author,reviewed_by`);

  list.innerHTML = result.items.length
    ? result.items.map(submissionCardHtml).join("")
    : `<p class="form-hint">${currentTab === "pending" ? "Новых заявок нет." : "Здесь пока пусто."}</p>`;

  const byId = new Map(result.items.map((s) => [s.id, s]));
  list.querySelectorAll("[data-action]").forEach((button) =>
    button.addEventListener("click", async () => {
      const card = button.closest(".moderation-card");
      const form = card.querySelector("form");
      const error = form.querySelector(".form-error");
      const sub = byId.get(card.dataset.id);
      error.hidden = true;
      card.querySelectorAll("button").forEach((b) => (b.disabled = true));
      try {
        const done = button.dataset.action === "approve" ? await approve(sub, form) : await reject(sub, form);
        if (done) {
          await reloadObjects();
          await renderList();
          return;
        }
      } catch (e) {
        error.textContent = e.message;
        error.hidden = false;
      }
      card.querySelectorAll("button").forEach((b) => (b.disabled = false));
    })
  );
}

// ---------- Наблюдения за состоянием ----------

function observationCardHtml(obs) {
  const object = obs.expand?.object;
  const pending = obs.status === "pending";
  return `
    <article class="panel moderation-card" data-id="${escapeHtml(obs.id)}">
      <div class="submission-head">
        <strong>Наблюдение:</strong>
        ${object ? `<a href="object.html?id=${encodeURIComponent(object.slug)}" target="_blank">${escapeHtml(object.name)}</a>` : "объект удалён"}
      </div>
      <p class="submission-meta">от ${authorLabel(obs.expand?.author)} · отправлено ${escapeHtml(formatDateTime(obs.created))}</p>
      ${observationHtml(obs)}
      ${object ? `<p class="submission-meta">Текущий статус объекта на сайте: ${statusBadge(object.status) || "не указан"}</p>` : ""}
      <form class="form">
        ${
          pending
            ? `${object ? `<label>Изменить статус объекта при принятии
                 <select name="object_status">
                   <option value="">не менять</option>
                   ${Object.keys(STATUS_COLORS).map((s) => `<option value="${s}">${s}</option>`).join("")}
                 </select>
               </label>` : ""}
               <label>Комментарий автору (обязателен при отклонении)
                 <textarea name="admin_comment" rows="2" maxlength="2000"></textarea>
               </label>
               <p class="form-error" role="alert" hidden></p>
               <div class="moderation-actions">
                 <button class="button" type="button" data-action="approve">Опубликовать</button>
                 <button class="button button--secondary" type="button" data-action="reject">Отклонить</button>
               </div>`
            : `<p class="submission-meta">${obs.status === "approved" ? "Опубликовано" : "Отклонено"} ${escapeHtml(formatDateTime(obs.reviewed_at))}</p>
               ${obs.admin_comment ? `<p class="submission-text submission-text--admin">Ответ: ${escapeHtml(obs.admin_comment)}</p>` : ""}`
        }
      </form>
    </article>`;
}

async function reviewObservation(obs, form, status) {
  const comment = form.elements.admin_comment.value.trim();
  if (status === "rejected" && !comment) throw new Error("Напишите автору, почему наблюдение отклонено.");
  const newObjectStatus = form.elements.object_status?.value;
  if (status === "approved" && newObjectStatus && obs.expand?.object) {
    await api("PATCH", `/api/collections/objects/records/${obs.expand.object.id}`, { status: newObjectStatus });
  }
  await api("PATCH", `/api/collections/observations/records/${obs.id}`, {
    status,
    admin_comment: comment,
    reviewed_by: currentUser().id,
    reviewed_at: new Date().toISOString().replace("T", " "),
  });
}

async function renderObservationList(list) {
  const filter = encodeURIComponent(`status = "${currentTab}"`);
  const sort = currentTab === "pending" ? "created" : "-reviewed_at";
  const result = await api("GET", `/api/collections/observations/records?filter=${filter}&sort=${sort}&perPage=100&expand=author,object`);

  list.innerHTML = result.items.length
    ? result.items.map(observationCardHtml).join("")
    : `<p class="form-hint">${currentTab === "pending" ? "Новых наблюдений нет." : "Здесь пока пусто."}</p>`;

  const byId = new Map(result.items.map((o) => [o.id, o]));
  list.querySelectorAll("[data-action]").forEach((button) =>
    button.addEventListener("click", async () => {
      const card = button.closest(".moderation-card");
      const form = card.querySelector("form");
      const error = form.querySelector(".form-error");
      error.hidden = true;
      card.querySelectorAll("button").forEach((b) => (b.disabled = true));
      try {
        await reviewObservation(byId.get(card.dataset.id), form, button.dataset.action === "approve" ? "approved" : "rejected");
        await renderList();
        return;
      } catch (e) {
        error.textContent = e.message;
        error.hidden = false;
      }
      card.querySelectorAll("button").forEach((b) => (b.disabled = false));
    })
  );
}

function renderPage() {
  root.innerHTML = `
    <p class="breadcrumbs"><a href="account.html">← Личный кабинет</a></p>
    <h1>Модерация</h1>
    <div class="type-switch" role="group" aria-label="Что проверяем">
      <button class="type-button${currentType === "submissions" ? " active" : ""}" type="button" data-type="submissions">
        Заявки на объекты (<span id="count-submissions">…</span>)
      </button>
      <button class="type-button${currentType === "observations" ? " active" : ""}" type="button" data-type="observations">
        Наблюдения за состоянием (<span id="count-observations">…</span>)
      </button>
    </div>
    <div class="tabs" role="tablist">
      ${STATUS_TABS.map(
        ([key, label]) =>
          `<button class="tab${key === currentTab ? " active" : ""}" type="button" role="tab" data-tab="${key}" aria-selected="${key === currentTab}">
             ${label}${key === "pending" ? ` (<span id="pending-count">…</span>)` : ""}
           </button>`
      ).join("")}
    </div>
    <div id="moderation-list"></div>`;

  root.querySelectorAll(".type-button").forEach((button) =>
    button.addEventListener("click", () => {
      currentType = button.dataset.type;
      root.querySelectorAll(".type-button").forEach((b) => b.classList.toggle("active", b === button));
      renderList().catch(showLoadError);
    })
  );

  root.querySelectorAll(".tab").forEach((tab) =>
    tab.addEventListener("click", () => {
      currentTab = tab.dataset.tab;
      root.querySelectorAll(".tab").forEach((t) => {
        t.classList.toggle("active", t === tab);
        t.setAttribute("aria-selected", t === tab);
      });
      renderList().catch(showLoadError);
    })
  );
  renderList().catch(showLoadError);
}

function showLoadError(e) {
  document.getElementById("moderation-list").innerHTML = `<p class="form-error">${escapeHtml(e.message)}</p>`;
}

(async () => {
  if (!(await checkServer())) {
    root.innerHTML = `<h1>Модерация</h1><p>Сейчас нет связи с сервером. Попробуйте позже.</p>`;
    return;
  }
  const user = await refreshAuth();
  if (!user) {
    location.replace("login.html?next=moderate.html");
    return;
  }
  if (user.role !== "admin") {
    root.innerHTML = `<h1>Модерация</h1><p>Этот раздел доступен только администраторам.</p>`;
    return;
  }
  await reloadObjects();
  renderPage();
})();
