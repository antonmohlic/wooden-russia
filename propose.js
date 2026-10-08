// Предложение нового объекта (propose.html) или правки существующего (propose.html?edit=slug).
// Заявка уходит на модерацию; на сайте объект появится или изменится только после одобрения.

const root = document.getElementById("propose");
const editSlug = new URLSearchParams(location.search).get("edit");

const OBJECT_TYPES = ["церковь", "часовня", "колокольня", "изба", "амбар", "мельница", "музей", "другое"];

// Поля объекта, которые участник может предложить. Порядок = порядок в форме.
const NUMBER_FIELDS = ["lat", "lon", "year", "century", "founded"];
const ALL_FIELDS = [
  "wiki", "name", "type", "status", "museum", "origin", "region", "address", "lat", "lon",
  "year", "year_text", "century", "founded", "description", "photo", "photo_author",
  "photo_license", "photo_source", "website",
];

function optionsHtml(values, selected, placeholder) {
  const empty = placeholder !== undefined ? `<option value="">${escapeHtml(placeholder)}</option>` : "";
  return empty + values.map(([value, label]) => `<option value="${escapeHtml(value)}"${value === selected ? " selected" : ""}>${escapeHtml(label)}</option>`).join("");
}

function formHtml(obj, museums, regions) {
  const v = (key) => escapeHtml(obj[key] ?? "");
  const title = obj.id ? `Правка: ${escapeHtml(obj.name)}` : "Предложить новый объект";
  return `
    <p class="breadcrumbs"><a href="account.html">← Личный кабинет</a></p>
    <h1>${title}</h1>
    <p class="form-hint">
      Заявку проверит модератор. ${obj.id ? "Отправятся только изменённые поля." : "Обязательные поля отмечены звёздочкой."}
    </p>

    <form class="form" id="object-form" novalidate>
      <section class="panel">
        <h2>Википедия</h2>
        <p class="form-hint">Вставьте ссылку на статью — название, координаты, описание и фото заполнятся сами. Потом всё проверьте.</p>
        <div class="form--inline">
          <label>Ссылка на статью
            <input type="url" name="wiki" value="${v("wiki")}" placeholder="https://ru.wikipedia.org/wiki/…">
          </label>
          <button class="button button--secondary" type="button" id="wiki-fill">Заполнить</button>
        </div>
        <p class="form-error" id="wiki-error" hidden></p>
        <p class="form-success" id="wiki-success" hidden></p>
      </section>

      <section class="panel">
        <h2>Основное</h2>
        <label>Название *
          <input type="text" name="name" value="${v("name")}" maxlength="300" required>
        </label>
        <div class="form-row">
          <label>Тип *
            <select name="type" required>${optionsHtml(OBJECT_TYPES.map((t) => [t, t]), obj.type, "— выберите —")}</select>
          </label>
          <label data-hide-for-museum>Состояние
            <select name="status">${optionsHtml(Object.keys(STATUS_COLORS).map((s) => [s, s]), obj.status, "не знаю")}</select>
          </label>
        </div>
        <label data-hide-for-museum>Находится в музее
          <select name="museum">${optionsHtml(museums.map((m) => [m.id, m.name]), obj.museum, "нет, на своём месте")}</select>
        </label>
        <label data-only-in-museum>Откуда перевезён
          <input type="text" name="origin" value="${v("origin")}" maxlength="300" placeholder="например: с. Кушерека, Онежский р-н">
        </label>
      </section>

      <section class="panel">
        <h2>Где находится</h2>
        <div class="form-row">
          <label>Регион
            <input type="text" name="region" value="${v("region")}" maxlength="200" list="regions">
            <datalist id="regions">${regions.map((r) => `<option value="${escapeHtml(r)}">`).join("")}</datalist>
          </label>
        </div>
        <label>Адрес
          <input type="text" name="address" value="${v("address")}" maxlength="500" placeholder="область, район, населённый пункт">
        </label>
        <p class="form-hint">Щёлкните по карте, чтобы поставить точку, или перетащите метку.</p>
        <div class="picker-map" id="picker-map"></div>
        <div class="form-row">
          <label>Широта *
            <input type="number" name="lat" value="${v("lat")}" step="any" min="-90" max="90" required>
          </label>
          <label>Долгота *
            <input type="number" name="lon" value="${v("lon")}" step="any" min="-180" max="180" required>
          </label>
        </div>
      </section>

      <section class="panel">
        <h2>Даты</h2>
        <div class="form-row" data-hide-for-museum>
          <label>Год постройки
            <input type="number" name="year" value="${v("year")}" min="800" max="2100" step="1">
          </label>
          <label>Век (если год неизвестен)
            <input type="number" name="century" value="${v("century")}" min="8" max="21" step="1" placeholder="например: 17">
          </label>
        </div>
        <label data-hide-for-museum>Дата текстом (если неточная)
          <input type="text" name="year_text" value="${v("year_text")}" maxlength="50" placeholder="например: 1581–1584 или XIV–XVI вв.">
        </label>
        <label data-only-for-museum>Год основания музея
          <input type="number" name="founded" value="${v("founded")}" min="1800" max="2100" step="1">
        </label>
      </section>

      <section class="panel">
        <h2>Описание</h2>
        <label>Коротко об объекте
          <textarea name="description" rows="6" maxlength="5000">${v("description")}</textarea>
        </label>
        <p class="form-hint">Лучше своими словами: длинные куски из Википедии без изменений копировать нельзя по её лицензии.</p>
        <label data-only-for-museum>Официальный сайт
          <input type="url" name="website" value="${v("website")}" maxlength="500" placeholder="https://…">
        </label>
      </section>

      <section class="panel">
        <h2>Фото</h2>
        <p class="form-hint">Подходят только фото с <a href="https://commons.wikimedia.org/" target="_blank" rel="noopener">Wikimedia Commons</a>: вставьте ссылку на страницу файла, и автор с лицензией заполнятся сами.</p>
        <div class="form--inline">
          <label>Ссылка на фото
            <input type="url" name="photo" value="${v("photo")}" maxlength="1000" placeholder="https://commons.wikimedia.org/wiki/File:…">
          </label>
          <button class="button button--secondary" type="button" id="photo-fill">Проверить</button>
        </div>
        <p class="form-error" id="photo-error" hidden></p>
        <img class="photo-preview" id="photo-preview" alt="Предпросмотр фото" hidden>
        <div class="form-row">
          <label>Автор фото
            <input type="text" name="photo_author" value="${v("photo_author")}" maxlength="300">
          </label>
          <label>Лицензия
            <input type="text" name="photo_license" value="${v("photo_license")}" maxlength="100">
          </label>
        </div>
        <input type="hidden" name="photo_source" value="${v("photo_source")}">
      </section>

      <section class="panel">
        <h2>Для модератора</h2>
        <label>Комментарий и источники
          <textarea name="comment" rows="3" maxlength="2000" placeholder="Откуда сведения, что изменилось, ссылки на источники"></textarea>
        </label>
        <p class="form-error" id="submit-error" role="alert" hidden></p>
        <button class="button" type="submit">Отправить на модерацию</button>
      </section>
    </form>

    ${
      obj.id
        ? `<section class="panel panel--danger">
             <h2>Объект не должен быть на сайте?</h2>
             <p class="form-hint">Например, это дубликат или объекта никогда не существовало. Если здание разрушено, лучше предложить правку со статусом «утрачен».</p>
             <form class="form" id="delete-form">
               <label>Причина *
                 <textarea name="comment" rows="2" maxlength="2000" required></textarea>
               </label>
               <p class="form-error" role="alert" hidden></p>
               <button class="button button--secondary" type="submit">Предложить удалить</button>
             </form>
           </section>`
        : ""
    }`;
}

// Показывает поля только для музеев или только для памятников
function toggleMuseumFields(form) {
  const isMuseumType = form.elements.type.value === "музей";
  const inMuseum = !isMuseumType && form.elements.museum.value !== "";
  form.querySelectorAll("[data-hide-for-museum]").forEach((el) => (el.hidden = isMuseumType));
  form.querySelectorAll("[data-only-for-museum]").forEach((el) => (el.hidden = !isMuseumType));
  form.querySelectorAll("[data-only-in-museum]").forEach((el) => (el.hidden = !inMuseum));
}

// Карта для выбора точки
function setupPicker(form, obj) {
  const latInput = form.elements.lat;
  const lonInput = form.elements.lon;
  const map = L.map("picker-map");
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);

  let marker = null;
  const place = (lat, lon, zoom) => {
    if (marker) marker.setLatLng([lat, lon]);
    else {
      marker = L.marker([lat, lon], { draggable: true }).addTo(map);
      marker.on("dragend", () => {
        const p = marker.getLatLng();
        latInput.value = p.lat.toFixed(6);
        lonInput.value = p.lng.toFixed(6);
      });
    }
    if (zoom) map.setView([lat, lon], zoom);
  };

  if (obj.lat && obj.lon) place(obj.lat, obj.lon, 13);
  else map.setView([62, 40], 5);

  map.on("click", (event) => {
    latInput.value = event.latlng.lat.toFixed(6);
    lonInput.value = event.latlng.lng.toFixed(6);
    place(event.latlng.lat, event.latlng.lng);
  });

  const fromInputs = () => {
    const lat = parseFloat(latInput.value);
    const lon = parseFloat(lonInput.value);
    if (Number.isFinite(lat) && Number.isFinite(lon)) place(lat, lon, Math.max(map.getZoom(), 12));
  };
  latInput.addEventListener("change", fromInputs);
  lonInput.addEventListener("change", fromInputs);
  return fromInputs;
}

function showMessage(el, text) {
  el.textContent = text;
  el.hidden = !text;
}

// Значения формы → объект с правильными типами; пустые поля пропускаются
function readForm(form) {
  const data = {};
  for (const key of ALL_FIELDS) {
    const field = form.elements[key];
    if (!field || field.closest("[hidden]")) continue;
    const raw = field.value.trim();
    if (raw === "") continue;
    data[key] = NUMBER_FIELDS.includes(key) ? Number(raw) : raw;
  }
  return data;
}

function validate(data) {
  if (!data.name) return "Укажите название.";
  if (!data.type) return "Выберите тип объекта.";
  if (!Number.isFinite(data.lat) || !Number.isFinite(data.lon)) return "Поставьте точку на карте или укажите координаты.";
  if (Math.abs(data.lat) > 90 || Math.abs(data.lon) > 180) return "Координаты вне допустимого диапазона.";
  if (data.year && (data.year < 800 || data.year > 2100 || !Number.isInteger(data.year))) return "Год постройки — целое число от 800 до 2100.";
  if (data.century && (data.century < 8 || data.century > 21 || !Number.isInteger(data.century))) return "Век — целое число от 8 до 21.";
  return "";
}

// Для правки: только то, что отличается от текущего объекта (пустое значение = «очистить поле»)
function changedFields(original, data) {
  const changes = {};
  for (const key of ALL_FIELDS) {
    const before = original[key] ?? "";
    const after = data[key] ?? "";
    if (String(before) !== String(after)) changes[key] = after === "" ? null : after;
  }
  return changes;
}

async function submit(kind, data, comment, targetName = "") {
  await api("POST", "/api/collections/submissions/records", {
    author: currentUser().id,
    kind,
    target: editSlug || "",
    target_name: targetName,
    data,
    comment,
    status: "pending",
  });
  location.href = "account.html?sent=1#submissions";
}

function render(obj, objects) {
  const museums = objects.filter(isMuseum).sort((a, b) => a.name.localeCompare(b.name, "ru"));
  const regions = uniqueSorted(objects.map((o) => o.region));
  root.innerHTML = formHtml(obj, museums, regions);

  const form = document.getElementById("object-form");
  const updateMap = setupPicker(form, obj);
  toggleMuseumFields(form);
  form.elements.type.addEventListener("change", () => toggleMuseumFields(form));
  form.elements.museum.addEventListener("change", () => toggleMuseumFields(form));

  // Подставляет найденное в поля формы. В новой заявке — всё, в правке — только в пустые поля.
  const fill = (found) => {
    let count = 0;
    for (const [key, value] of Object.entries(found)) {
      const field = form.elements[key];
      if (!field || value === undefined || value === "") continue;
      if (obj.id && field.value.trim() !== "") continue;
      field.value = value;
      count++;
    }
    updateMap();
    return count;
  };

  // Кнопка «Заполнить» по ссылке на Википедию
  const wikiButton = document.getElementById("wiki-fill");
  wikiButton.addEventListener("click", async () => {
    const error = document.getElementById("wiki-error");
    const success = document.getElementById("wiki-success");
    showMessage(error, "");
    showMessage(success, "");
    wikiButton.disabled = true;
    try {
      const found = await fetchFromWikipedia(form.elements.wiki.value);
      const count = fill(found);
      showPhotoPreview();
      const missing = found.lat ? "" : " Координат в статье нет — поставьте точку на карте.";
      showMessage(success, `Заполнено полей: ${count}.${missing}`);
    } catch (e) {
      showMessage(error, e.message);
    } finally {
      wikiButton.disabled = false;
    }
  });

  // Кнопка «Проверить» для фото
  const preview = document.getElementById("photo-preview");
  const showPhotoPreview = () => {
    const url = form.elements.photo.value.trim();
    preview.hidden = !url;
    if (url) preview.src = photoSrc({ photo: url }, 600);
  };
  showPhotoPreview();
  document.getElementById("photo-fill").addEventListener("click", async () => {
    const error = document.getElementById("photo-error");
    showMessage(error, "");
    const fileName = commonsFileName(form.elements.photo.value);
    if (!fileName) {
      showMessage(error, "Нужна ссылка на файл с Wikimedia Commons (commons.wikimedia.org/wiki/File:…).");
      return;
    }
    try {
      const info = await fetchPhotoInfo(fileName);
      Object.entries(info).forEach(([key, value]) => (form.elements[key].value = value || ""));
      showPhotoPreview();
    } catch (e) {
      showMessage(error, e.message);
    }
  });

  // Отправка заявки
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const error = document.getElementById("submit-error");
    const button = form.querySelector("button[type=submit]");
    const data = readForm(form);
    const problem = validate(data);
    if (problem) return showMessage(error, problem);

    let payload = data;
    if (obj.id) {
      payload = changedFields(obj, data);
      if (!Object.keys(payload).length) return showMessage(error, "Вы ничего не изменили.");
    }
    showMessage(error, "");
    button.disabled = true;
    try {
      await submit(obj.id ? "update" : "create", payload, form.elements.comment.value.trim(), obj.name || "");
    } catch (e) {
      showMessage(error, e.message);
      button.disabled = false;
    }
  });

  // Предложение удалить
  const deleteForm = document.getElementById("delete-form");
  if (deleteForm) {
    deleteForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const error = deleteForm.querySelector(".form-error");
      const reason = deleteForm.elements.comment.value.trim();
      if (!reason) return showMessage(error, "Напишите причину.");
      try {
        await submit("delete", {}, reason, obj.name);
      } catch (e) {
        showMessage(error, e.message);
      }
    });
  }
}

(async () => {
  if (!(await checkServer())) {
    root.innerHTML = `<h1>Предложить объект</h1><p>Сейчас нет связи с сервером. Попробуйте позже.</p>`;
    return;
  }
  if (!(await refreshAuth())) {
    location.replace(`login.html?next=${encodeURIComponent(location.pathname.split("/").pop() + location.search)}`);
    return;
  }
  const objects = await loadObjects();
  if (editSlug) {
    const obj = objects.find((o) => o.id === editSlug);
    if (!obj) {
      root.innerHTML = `<h1>Объект не найден</h1><p><a href="catalog.html">Перейти в каталог</a></p>`;
      return;
    }
    render(obj, objects);
  } else {
    render({}, objects);
  }
})();
