// Наблюдения за состоянием памятников: «был там тогда-то, вот что увидел» + фото.
// Используется на странице объекта, в модерации и в личном кабинете.

const CONDITIONS = {
  "хорошее": { color: "#2e7d32", hint: "ухожен, видимых разрушений нет" },
  "удовлетворительное": { color: "#5b7a2e", hint: "мелкие повреждения" },
  "плохое": { color: "#b45f00", hint: "течёт кровля, гниют брёвна, перекос" },
  "аварийное": { color: "#a3341c", hint: "есть угроза обрушения" },
  "руины": { color: "#6b6b6b", hint: "разрушен или сгорел" },
};

const MAX_PHOTOS = 5;

function conditionBadge(condition) {
  const info = CONDITIONS[condition];
  return `<span class="status" style="background:${info ? info.color : "#555"}">${escapeHtml(condition)}</span>`;
}

// «2026-08-14 00:00:00.000Z» → «14 августа 2026»
function formatVisitDate(value) {
  if (!value) return "";
  return new Date(value.replace(" ", "T")).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
}

function observationPhotosHtml(obs) {
  if (!obs.photos || !obs.photos.length) return "";
  return `<div class="obs-photos">${obs.photos
    .map(
      (name) => `
      <a href="${escapeHtml(fileUrl("observations", obs.id, name))}" target="_blank" rel="noopener">
        <img src="${escapeHtml(fileUrl("observations", obs.id, name, "240x240"))}" alt="Фото от ${escapeHtml(obs.author_name)}" loading="lazy">
      </a>`
    )
    .join("")}</div>`;
}

// Одно наблюдение в ленте
function observationHtml(obs) {
  return `
    <article class="observation">
      <div class="observation-head">
        ${conditionBadge(obs.condition)}
        <strong>${escapeHtml(formatVisitDate(obs.visited_on))}</strong>
        <span class="submission-meta">· ${escapeHtml(obs.author_name || "Участник")}</span>
      </div>
      ${obs.text ? `<p class="observation-text">${escapeHtml(obs.text)}</p>` : ""}
      ${observationPhotosHtml(obs)}
      ${obs.photos && obs.photos.length ? `<p class="credit">Фото: ${escapeHtml(obs.author_name || "участник")}, CC BY-SA 4.0</p>` : ""}
    </article>`;
}

async function fetchObservations(filter) {
  const query = `filter=${encodeURIComponent(filter)}&sort=-visited_on,-created&perPage=200`;
  return (await api("GET", `/api/collections/observations/records?${query}`)).items;
}

// Раздел «Состояние» на странице объекта: последнее состояние, лента, форма добавления
async function renderObservationsSection(container, obj) {
  if (!obj.recordId || !(await checkServer())) {
    container.hidden = true;
    return;
  }
  const user = await refreshAuth();
  let items = [];
  try {
    items = await fetchObservations(`object = "${obj.recordId}" && status = "approved"`);
  } catch {
    container.innerHTML = `<h2>Состояние</h2><p class="form-error">Не удалось загрузить наблюдения.</p>`;
    return;
  }

  const latest = items[0];
  const addBlock = !user
    ? `<p class="form-hint"><a href="login.html?next=${encodeURIComponent("object.html?id=" + obj.id)}">Войдите</a>, чтобы рассказать, в каком состоянии объект сейчас.</p>`
    : !user.verified
    ? `<p class="form-hint">Добавлять наблюдения можно после подтверждения почты — <a href="account.html">в личном кабинете</a>.</p>`
    : `<button class="button button--secondary" type="button" id="obs-open">+ Я был здесь — добавить наблюдение</button>
       ${observationFormHtml()}`;

  container.innerHTML = `
    <h2>Состояние: наблюдения посетителей</h2>
    ${
      latest
        ? `<p class="obs-latest">Последнее наблюдение — ${escapeHtml(formatVisitDate(latest.visited_on))}: ${conditionBadge(latest.condition)}</p>`
        : `<p class="form-hint">Наблюдений пока нет. Если вы были здесь, расскажите, в каком состоянии объект, — это помогает вовремя заметить угрозу.</p>`
    }
    ${addBlock}
    <div class="obs-list">${items.map(observationHtml).join("")}</div>`;

  if (user && user.verified) setupObservationForm(container, obj, user);
}

function observationFormHtml() {
  const today = new Date().toISOString().slice(0, 10);
  const options = Object.entries(CONDITIONS)
    .map(([value, info]) => `<option value="${value}">${value} — ${info.hint}</option>`)
    .join("");
  return `
    <form class="form panel obs-form" id="obs-form" hidden>
      <div class="form-row">
        <label>Когда вы там были *
          <input type="date" name="visited_on" max="${today}" value="${today}" required>
        </label>
        <label>Состояние *
          <select name="condition" required><option value="">— выберите —</option>${options}</select>
        </label>
      </div>
      <label>Что вы увидели
        <textarea name="text" rows="4" maxlength="3000" placeholder="Например: кровля шатра провалилась с северной стороны, крыльцо разобрано, внутри сухо"></textarea>
      </label>
      <label>Фото (до ${MAX_PHOTOS})
        <input type="file" name="photos" accept="image/jpeg,image/png,image/webp" multiple>
      </label>
      <div class="obs-photos" id="obs-preview"></div>
      <label class="checkbox">
        <input type="checkbox" name="consent">
        <span>Фото сделаны мной, и я разрешаю публиковать их под лицензией CC BY-SA 4.0 с указанием моего имени</span>
      </label>
      <p class="form-hint">Перед отправкой фото уменьшаются, а из них удаляются данные о месте съёмки и телефоне. Наблюдение появится после проверки модератором.</p>
      <p class="form-error" role="alert" hidden></p>
      <p class="form-success" hidden>Спасибо! Наблюдение отправлено на модерацию. Статус — в личном кабинете.</p>
      <div class="moderation-actions">
        <button class="button" type="submit">Отправить</button>
        <button class="button button--secondary" type="button" id="obs-cancel">Отмена</button>
      </div>
    </form>`;
}

function setupObservationForm(container, obj, user) {
  const form = container.querySelector("#obs-form");
  const open = container.querySelector("#obs-open");
  const error = form.querySelector(".form-error");
  const success = form.querySelector(".form-success");
  const preview = form.querySelector("#obs-preview");

  open.addEventListener("click", () => {
    form.hidden = false;
    open.hidden = true;
  });
  form.querySelector("#obs-cancel").addEventListener("click", () => {
    form.hidden = true;
    open.hidden = false;
  });

  // Превью выбранных фото
  form.elements.photos.addEventListener("change", () => {
    const files = [...form.elements.photos.files];
    preview.innerHTML = files
      .slice(0, MAX_PHOTOS)
      .map((f) => `<img src="${URL.createObjectURL(f)}" alt="">`)
      .join("");
    error.hidden = files.length <= MAX_PHOTOS;
    if (files.length > MAX_PHOTOS) error.textContent = `Можно не больше ${MAX_PHOTOS} фото — отправятся первые ${MAX_PHOTOS}.`;
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    error.hidden = success.hidden = true;
    const files = [...form.elements.photos.files].slice(0, MAX_PHOTOS);
    const fail = (text) => {
      error.textContent = text;
      error.hidden = false;
    };
    if (!form.elements.condition.value) return fail("Выберите состояние объекта.");
    if (!form.elements.visited_on.value) return fail("Укажите дату посещения.");
    if (form.elements.visited_on.value > new Date().toISOString().slice(0, 10)) return fail("Дата посещения не может быть в будущем.");
    if (files.length && !form.elements.consent.checked) return fail("Подтвердите, что фото ваши и их можно опубликовать.");
    if (!files.length && !form.elements.text.value.trim()) return fail("Добавьте описание или хотя бы одно фото.");

    const button = form.querySelector("button[type=submit]");
    button.disabled = true;
    button.textContent = files.length ? "Готовлю фото…" : "Отправляю…";
    try {
      const data = new FormData();
      data.append("object", obj.recordId);
      data.append("author", user.id);
      data.append("status", "pending");
      data.append("visited_on", `${form.elements.visited_on.value} 12:00:00.000Z`);
      data.append("condition", form.elements.condition.value);
      data.append("text", form.elements.text.value.trim());
      for (const file of files) data.append("photos", await prepareImage(file));
      button.textContent = "Отправляю…";
      await api("POST", "/api/collections/observations/records", data);
      form.reset();
      preview.innerHTML = "";
      success.hidden = false;
    } catch (e) {
      fail(e.message);
    }
    button.disabled = false;
    button.textContent = "Отправить";
  });
}
