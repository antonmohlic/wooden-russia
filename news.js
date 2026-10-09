// Страница «Новости»: лента записей. Публикует, правит и удаляет записи только админ — прямо на этой странице.

const list = document.getElementById("news-list");
const adminBox = document.getElementById("news-admin");
let posts = [];

function formatNewsDate(value) {
  return value ? new Date(value.replace(" ", "T")).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" }) : "";
}

// Фото записи: загруженный файл или фото с Wikimedia Commons
function newsPhotoUrl(post) {
  if (post.photo_file) return fileUrl("news", post.id, post.photo_file, "1200x0");
  return post.photo ? photoSrc(post, 1200) : "";
}

// Текст записи: абзацы через пустую строку, ссылки — [текст](адрес).
// Адрес — страница нашего сайта (object.html?id=…) или полный адрес https://…
function newsBodyHtml(text) {
  return escapeHtml(text).replace(
    /\[([^\]\n]+)\]\(((?:https?:\/\/|[a-z-]+\.html)[^\s()"<>]*)\)/g,
    (match, label, url) => {
      const external = /^https?:/.test(url) && !url.startsWith(location.origin);
      return `<a href="${url}"${external ? ' target="_blank" rel="noopener"' : ""}>${label}</a>`;
    }
  );
}

function postHtml(post, isAdmin, index) {
  const photo = newsPhotoUrl(post);
  return `
    <article class="news-post" id="post-${escapeHtml(post.id)}">
      ${photo ? `<img class="news-photo" src="${escapeHtml(photo)}" alt=""${index > 0 ? ' loading="lazy"' : ""}>` : ""}
      ${photo ? photoCredit(post) : ""}
      <p class="news-date">${post.draft ? `<span class="status" style="background:#b45f00">черновик — видите только вы</span> ` : ""}${escapeHtml(formatNewsDate(post.published_at))}</p>
      <h2>${escapeHtml(post.title)}</h2>
      ${post.body ? `<div class="news-body">${newsBodyHtml(post.body)}</div>` : ""}
      ${
        isAdmin
          ? `<div class="card-links">
               ${post.draft ? `<button class="button" type="button" data-publish="${escapeHtml(post.id)}">Опубликовать</button>` : ""}
               <button class="link-button" type="button" data-edit="${escapeHtml(post.id)}">Изменить</button>
               <button class="link-button" type="button" data-delete="${escapeHtml(post.id)}">Удалить</button>
             </div>`
          : ""
      }
    </article>`;
}

// ---------- Форма записи (только для админа) ----------

function postFormHtml(post) {
  const v = (key) => escapeHtml(post?.[key] ?? "");
  const date = (post?.published_at || new Date().toISOString()).slice(0, 10);
  return `
    <form class="form panel" id="news-form">
      <h2>${post ? "Изменить запись" : "Новая запись"}</h2>
      <label>Заголовок *
        <input type="text" name="title" value="${v("title")}" maxlength="300" required>
      </label>
      <label>Дата
        <input type="date" name="published_at" value="${date}" required>
      </label>
      <label>Текст (пустая строка — новый абзац; ссылка — [текст](адрес), например [Кижи](object.html?id=kizhi))
        <textarea name="body" rows="8" maxlength="20000">${v("body")}</textarea>
      </label>
      <fieldset class="news-photo-fields">
        <legend>Фото — загрузите своё или вставьте ссылку на Wikimedia Commons</legend>
        <label>Своё фото
          <input type="file" name="photo_file" accept="image/jpeg,image/png,image/webp">
        </label>
        <div class="form--inline">
          <label>Ссылка на Commons
            <input type="url" name="photo" value="${v("photo")}" placeholder="https://commons.wikimedia.org/wiki/File:…">
          </label>
          <button class="button button--secondary" type="button" id="news-commons">Проверить</button>
        </div>
        <div class="form-row">
          <label>Автор фото
            <input type="text" name="photo_author" value="${v("photo_author")}" maxlength="300">
          </label>
          <label>Лицензия
            <input type="text" name="photo_license" value="${v("photo_license")}" maxlength="100" placeholder="например: CC BY-SA 4.0">
          </label>
        </div>
        <input type="hidden" name="photo_source" value="${v("photo_source")}">
        ${post?.photo_file ? `<label class="checkbox"><input type="checkbox" name="remove_file"><span>Убрать загруженное фото</span></label>` : ""}
      </fieldset>
      <p class="form-error" role="alert" hidden></p>
      <div class="moderation-actions">
        <button class="button" type="submit">${post ? (post.draft ? "Сохранить черновик" : "Сохранить") : "Опубликовать"}</button>
        ${post ? `<button class="button button--secondary" type="button" id="news-cancel">Отмена</button>` : ""}
      </div>
    </form>`;
}

function showForm(post) {
  adminBox.innerHTML = post ? postFormHtml(post) : `
    <div class="news-admin-actions">
      <button class="button" type="button" id="news-new">+ Новая запись</button>
      <button class="button button--secondary" type="button" id="news-digest" title="Подборка «Под угрозой» за прошлый месяц сохранится черновиком">Собрать выпуск «Под угрозой»</button>
    </div>
    <p class="form-hint" id="news-digest-result" hidden></p>`;

  document.getElementById("news-digest")?.addEventListener("click", collectDigest);

  const newButton = document.getElementById("news-new");
  if (newButton) {
    newButton.addEventListener("click", () => {
      adminBox.innerHTML = postFormHtml(null);
      setupForm(null);
    });
    return;
  }
  setupForm(post);
}

function setupForm(post) {
  const form = document.getElementById("news-form");
  const error = form.querySelector(".form-error");
  const fail = (text) => {
    error.textContent = text;
    error.hidden = false;
  };

  document.getElementById("news-cancel")?.addEventListener("click", () => showForm(null));
  form.scrollIntoView({ behavior: "smooth", block: "start" });

  // Автор и лицензия по ссылке на Commons
  document.getElementById("news-commons").addEventListener("click", async () => {
    error.hidden = true;
    const fileName = commonsFileName(form.elements.photo.value);
    if (!fileName) return fail("Нужна ссылка на файл с Wikimedia Commons (commons.wikimedia.org/wiki/File:…).");
    try {
      const info = await fetchPhotoInfo(fileName);
      Object.entries(info).forEach(([key, value]) => (form.elements[key].value = value || ""));
    } catch (e) {
      fail(e.message);
    }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    error.hidden = true;
    const title = form.elements.title.value.trim();
    if (!title) return fail("Напишите заголовок.");

    const button = form.querySelector("button[type=submit]");
    button.disabled = true;
    try {
      const data = new FormData();
      data.append("title", title);
      data.append("published_at", `${form.elements.published_at.value} 12:00:00.000Z`);
      data.append("body", form.elements.body.value.trim());
      for (const key of ["photo", "photo_author", "photo_license", "photo_source"]) {
        data.append(key, form.elements[key].value.trim());
      }
      const file = form.elements.photo_file.files[0];
      if (file) data.append("photo_file", await prepareImage(file));
      else if (form.elements.remove_file?.checked) data.append("photo_file", "");

      if (post) await api("PATCH", `/api/collections/news/records/${post.id}`, data);
      else await api("POST", "/api/collections/news/records", data);
      showForm(null);
      await loadPosts(true);
    } catch (e) {
      fail(e.message);
      button.disabled = false;
    }
  });
}

// Подборка «Под угрозой» за прошлый месяц. Сама приходит 1-го числа; кнопка — чтобы собрать сразу.
async function collectDigest() {
  const button = document.getElementById("news-digest");
  const result = document.getElementById("news-digest-result");
  button.disabled = true;
  try {
    const answer = await api("POST", "/api/threats/digest", {});
    result.textContent = answer.id && !answer.skipped
      ? "Черновик выпуска готов — он первым в ленте. Проверьте текст и нажмите «Опубликовать»."
      : `Выпуск не создан: ${answer.skipped}.`;
    await loadPosts(true);
  } catch (e) {
    result.textContent = e.message;
  }
  result.hidden = false;
  button.disabled = false;
}

// ---------- Лента ----------

async function loadPosts(isAdmin) {
  const result = await api("GET", "/api/collections/news/records?sort=-published_at,-created&perPage=100");
  posts = result.items;
  list.innerHTML = posts.length
    ? posts.map((p, i) => postHtml(p, isAdmin, i)).join("")
    : `<p class="form-hint">Новостей пока нет.</p>`;

  if (!isAdmin) return;
  list.querySelectorAll("[data-edit]").forEach((button) =>
    button.addEventListener("click", () => showForm(posts.find((p) => p.id === button.dataset.edit)))
  );
  list.querySelectorAll("[data-publish]").forEach((button) =>
    button.addEventListener("click", async () => {
      const post = posts.find((p) => p.id === button.dataset.publish);
      if (!confirm(`Опубликовать «${post.title}»? Запись увидят все, дата станет сегодняшней.`)) return;
      try {
        await api("PATCH", `/api/collections/news/records/${post.id}`, {
          draft: false,
          published_at: new Date().toISOString().replace("T", " "),
        });
        await loadPosts(true);
      } catch (e) {
        alert(e.message);
      }
    })
  );
  list.querySelectorAll("[data-delete]").forEach((button) =>
    button.addEventListener("click", async () => {
      const post = posts.find((p) => p.id === button.dataset.delete);
      if (!confirm(`Удалить запись «${post.title}»? Это нельзя отменить.`)) return;
      try {
        await api("DELETE", `/api/collections/news/records/${post.id}`);
        await loadPosts(true);
      } catch (e) {
        alert(e.message);
      }
    })
  );
}

(async () => {
  if (!(await checkServer())) {
    list.innerHTML = `<p>Сейчас нет связи с сервером. Попробуйте позже.</p>`;
    return;
  }
  const user = await refreshAuth();
  const isAdmin = user?.role === "admin";
  if (isAdmin) showForm(null);
  try {
    await loadPosts(isAdmin);
  } catch (e) {
    list.innerHTML = `<p class="form-error">${escapeHtml(e.message)}</p>`;
  }
})();
