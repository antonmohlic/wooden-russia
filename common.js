// Общий код для всех страниц сайта: шапка с меню, загрузка данных, фильтры.

// Цвет метки для каждого статуса сохранности
const STATUS_COLORS = {
  "сохранился": "#2e7d32",
  "аварийный": "#b45f00",
  "утрачен": "#6b6b6b",
};

// Цвет меток музеев
// Музеи — зелёные квадраты: оттенок темнее и холоднее, чем у «сохранился», и форма другая
const MUSEUM_COLOR = "#00695c";

// Пункты меню. Чтобы добавить раздел, допишите сюда строку.
const NAV_ITEMS = [
  { href: "news.html", label: "Новости" },
  { href: "index.html", label: "Карта" },
  { href: "catalog.html", label: "Каталог" },
  { href: "museums.html", label: "Музеи" },
  { href: "trips.html", label: "Поездки" },
  { href: "glossary.html", label: "Справочник" },
  { href: "about.html", label: "О сервисе" },
];

// ---------- Вспомогательные функции ----------

// Защита от случайных HTML-символов в данных
// Внешняя ссылка из данных: только http(s), иначе пусто. Защита от «ссылок» вида javascript:…
function safeUrl(url) {
  const text = String(url ?? "").trim();
  return /^https?:\/\//i.test(text) ? text : "";
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text ?? "";
  return div.innerHTML;
}

function toRoman(number) {
  const digits = [[10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
  let result = "";
  for (const [value, letter] of digits) {
    while (number >= value) {
      result += letter;
      number -= value;
    }
  }
  return result;
}

function isMuseum(obj) {
  return obj.type === "музей";
}

// Век объекта: из поля century, если точный год неизвестен, иначе из года (1654 → 17)
function centuryOf(obj) {
  if (obj.century) return obj.century;
  return obj.year ? Math.ceil(obj.year / 100) : null;
}

// 17 → «XVII век»
function centuryLabel(century) {
  return `${toRoman(century)} век`;
}

// Дата постройки для показа: «1581–1584 (XVI век)», «1654 (XVII век)» или «XVII век»
function dateLabel(obj) {
  const century = centuryOf(obj);
  const text = obj.year_text || obj.year;
  if (text && century && !String(text).includes("в")) return `${text} (${centuryLabel(century)})`;
  if (text) return String(text);
  return century ? centuryLabel(century) : "";
}

// Год для сортировки: точный год или середина века
function sortYear(obj) {
  if (obj.year) return obj.year;
  const century = centuryOf(obj);
  return century ? century * 100 - 50 : null;
}

// «церковь · 1654 (XVII век)» или «музей · основан в 1966 г.»
function yearLine(obj) {
  if (isMuseum(obj)) return obj.founded ? `музей · основан в ${obj.founded} г.` : "музей";
  return [obj.type, dateLabel(obj)].filter(Boolean).join(" · ");
}

function statusBadge(status) {
  if (!status) return "";
  const color = STATUS_COLORS[status] || "#555";
  return `<span class="status" style="background:${color}">${escapeHtml(status)}</span>`;
}

// Значок «Стоит посетить» — объект, который стоит посетить, даже если ехать специально
function worthBadge(obj) {
  return obj.worth_visit ? `<span class="status status--worth">★ Стоит посетить</span>` : "";
}

function museumBadge() {
  return `<span class="status" style="background:${MUSEUM_COLOR}">музейный комплекс</span>`;
}

// Адрес фото нужной ширины. Wikimedia Commons сам отдаёт уменьшенную копию,
// для загруженного фото берём ближайшую уменьшенную копию PocketBase.
function photoSrc(obj, width) {
  if (obj.photo_file && obj.recordId) {
    const thumb = [400, 600, 1200].find((w) => w >= width) || 1200;
    return fileUrl("objects", obj.recordId, obj.photo_file, `${thumb}x0`);
  }
  if (!obj.photo || !obj.photo.includes("Special:FilePath")) return obj.photo;
  return `${obj.photo.split("?")[0]}?width=${width}`;
}

// Подпись к фото. Лицензия CC BY-SA требует указывать автора и лицензию.
function photoCredit(obj) {
  if (!obj.photo_author) return "";
  const text = `Фото: ${obj.photo_author}, ${obj.photo_license || "лицензия не указана"}`;
  return safeUrl(obj.photo_source)
    ? `<a class="credit" href="${escapeHtml(safeUrl(obj.photo_source))}" target="_blank" rel="noopener">${escapeHtml(text)}</a>`
    : `<span class="credit">${escapeHtml(text)}</span>`;
}

function objectUrl(obj) {
  return `object.html?id=${encodeURIComponent(obj.id)}`;
}

// Не index.html?id=…: сервер переадресует index.html на «/» и теряет параметры
function mapUrl(obj) {
  return `./?id=${encodeURIComponent(obj.id)}`;
}

// Маленькая карточка объекта: памятники музея, «Что рядом», личные списки.
// meta — строка под названием, по умолчанию дата постройки
function miniCardHtml(obj, meta) {
  return `
    <a class="mini-card" href="${objectUrl(obj)}">
      ${obj.photo ? `<img src="${escapeHtml(photoSrc(obj, 400))}" alt="${escapeHtml(obj.name)}" loading="lazy">` : ""}
      <span class="mini-card-title">${escapeHtml(obj.name)}</span>
      <span class="mini-card-meta">${escapeHtml(meta ?? dateLabel(obj))}</span>
    </a>`;
}

// Уменьшает фото до 2000 px по большей стороне и пересохраняет в JPEG.
// Заодно удаляются метаданные снимка (EXIF), в том числе GPS-координаты телефона.
async function prepareImage(file) {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
  const name = file.name.replace(/\.[^.]+$/, "") || "photo";
  return new File([blob], `${name}.jpg`, { type: "image/jpeg" });
}

// ---------- Данные ----------

let objectsPromise = null;

// Загружает объекты один раз на страницу: с сервера, а если он недоступен — из data/objects.json
function loadObjects() {
  if (!objectsPromise) {
    objectsPromise = checkServer().then((available) => {
      if (available) return fetchObjectsFromServer();
      return fetch("data/objects.json").then((response) => {
        if (!response.ok) throw new Error(`Не удалось загрузить данные: ${response.status}`);
        return response.json();
      });
    });
  }
  return objectsPromise;
}

// ---------- Шапка и меню ----------

// Знак проекта (северный тройник) берётся из logo.svg и встраивается прямо в страницу,
// чтобы цвет линий брался из текста шапки (currentColor). Рисунок хранится в одном месте — в logo.svg.
function loadLogo(slot) {
  fetch("logo.svg")
    .then((response) => (response.ok ? response.text() : ""))
    .then((svg) => {
      slot.innerHTML = svg;
      slot.querySelector("svg")?.setAttribute("aria-hidden", "true");
    })
    .catch(() => {});
}

// Иконка вкладки браузера — подключаем на всех страницах
function addFavicon() {
  if (document.querySelector('link[rel="icon"]')) return;
  const link = document.createElement("link");
  link.rel = "icon";
  link.type = "image/svg+xml";
  link.href = "favicon.svg";
  document.head.append(link);
}

function renderHeader() {
  addFavicon();
  const currentPage = location.pathname.split("/").pop() || "index.html";
  // Страница объекта относится к разделу «Каталог», литература — к «Справочнику»
  const SECTION_OF = { "object.html": "catalog.html", "bibliography.html": "glossary.html" };
  const activePage = SECTION_OF[currentPage] || currentPage;

  const links = NAV_ITEMS.map((item) => {
    const active = item.href === activePage ? ' class="active" aria-current="page"' : "";
    return `<a href="${item.href}"${active}>${item.label}</a>`;
  }).join("");

  const header = document.createElement("header");
  header.className = "site-header";
  header.innerHTML = `
    <a class="brand" href="news.html" aria-label="Лемех — открытый каталог деревянного зодчества России. На главную: новости">
      <span class="brand-logo"></span>
      <span class="brand-text">
        <span class="brand-name">Лемех <span class="beta-badge" title="Сайт в разработке: что-то может работать не так, данные пополняются">бета</span></span>
        <span class="brand-tagline">открытый каталог деревянного зодчества России</span>
      </span>
    </a>
    <button class="menu-toggle" type="button" aria-label="Открыть меню" aria-expanded="false">☰</button>
    <nav class="site-nav">${links}<span class="account-link" hidden></span></nav>`;
  document.body.prepend(header);
  loadLogo(header.querySelector(".brand-logo"));
  renderAccountLink(header.querySelector(".account-link"), activePage);
  setupWallpaperToggle(activePage);

  // На телефоне меню открывается кнопкой ☰
  const toggle = header.querySelector(".menu-toggle");
  toggle.addEventListener("click", () => {
    const open = header.classList.toggle("menu-open");
    toggle.setAttribute("aria-expanded", open);
    toggle.textContent = open ? "✕" : "☰";
  });
}

// Фон с узором лемеха: варианты для сравнения, выбор запоминается в браузере.
// Временно доступно всем посетителям — убрать, когда стиль будет выбран.
const WALLPAPER_KEY = "lemekh-wallpaper";
const WALLPAPERS = [
  ["", "Обои: как сейчас"],
  ["small", "Обои: мельче"],
  ["large", "Обои: крупнее"],
  ["real", "Обои: реалистичнее"],
  ["fade", "Обои: растворяются к центру"],
  ["off", "Обои: нет"],
];

function setupWallpaperToggle(activePage) {
  let current = "";
  try {
    current = localStorage.getItem(WALLPAPER_KEY) || "";
  } catch {}
  if (!WALLPAPERS.some(([key]) => key === current)) current = "";
  const apply = () => {
    WALLPAPERS.forEach(([key]) => key && document.documentElement.classList.toggle(`wp-${key}`, key === current));
  };
  apply();
  // На карте узора не видно — там переключатель только мешал бы легенде
  if (activePage === "index.html") return;

  const select = document.createElement("select");
  select.className = "wallpaper-toggle";
  select.setAttribute("aria-label", "Вариант фона");
  select.innerHTML = WALLPAPERS.map(([key, label]) => `<option value="${key}"${key === current ? " selected" : ""}>${label}</option>`).join("");
  select.addEventListener("change", () => {
    current = select.value;
    apply();
    try {
      localStorage.setItem(WALLPAPER_KEY, current);
    } catch {}
  });
  document.body.append(select);
}

// Кнопка «Войти» или имя пользователя в шапке. Если сервера нет — не показываем.
function renderAccountLink(slot, activePage) {
  const draw = () => {
    const user = currentUser();
    const page = user ? "account.html" : "login.html";
    const label = user ? `👤 ${user.name || user.email}` : "Войти";
    const active = page === activePage ? ' class="active" aria-current="page"' : "";
    slot.innerHTML = `<a href="${page}"${active}>${escapeHtml(label)}</a>`;
    slot.hidden = false;
  };
  // Сразу показываем сохранённое состояние, затем сверяем его с сервером
  checkServer().then((available) => {
    if (!available) return;
    draw();
    refreshAuth().then(draw);
  });
}

// ---------- Фильтры (общие для карты и каталога) ----------

const FILTER_KEYS = ["q", "worth", "region", "type", "century", "status", "museum"];

// Приводит текст к виду для поиска: без регистра, «ё» = «е»
function normalize(text) {
  return (text || "").toLowerCase().replace(/ё/g, "е");
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, "ru"));
}

function selectHtml(name, placeholder, options) {
  const items = options.map(([value, label]) => `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`);
  return `<select name="${name}"><option value="">${placeholder}</option>${items.join("")}</select>`;
}

// Фильтры, в которых можно отметить несколько значений сразу (регионы, типы, века, статусы)
const MULTI_KEYS = ["region", "type", "century", "status"];

// Выпадающий список с галочками. title — как подписать выбор нескольких значений («Регионы: 3»)
function multiHtml(name, placeholder, title, options) {
  const items = options.map(([value, label]) =>
    `<label class="multi-option"><input type="checkbox" name="${name}" value="${escapeHtml(value)}"><span>${escapeHtml(label)}</span></label>`);
  return `
    <details class="multi" data-placeholder="${escapeHtml(placeholder)}" data-title="${escapeHtml(title)}">
      <summary>${escapeHtml(placeholder)}</summary>
      <div class="multi-options">${items.join("")}</div>
    </details>`;
}

// Надпись на закрытом списке: «Все регионы», название одного выбранного или «Регионы: 3»
function updateMultiSummary(details) {
  const checked = [...details.querySelectorAll("input:checked")];
  const summary = details.querySelector("summary");
  summary.textContent = checked.length === 0 ? details.dataset.placeholder
    : checked.length === 1 ? checked[0].nextElementSibling.textContent
    : `${details.dataset.title}: ${checked.length}`;
  details.classList.toggle("is-active", checked.length > 0);
}

// Включён ли фильтр: для списков с галочками — отмечено ли хоть что-то
function isFilterActive(value) {
  return Array.isArray(value) ? value.length > 0 : Boolean(value);
}

// Рисует поиск и фильтры в container. При каждом изменении вызывает onChange(состояние).
// Состояние хранится в адресе страницы, поэтому ссылкой с фильтрами можно поделиться.
// Несколько значений одного фильтра пишутся в адрес повтором: ?region=A&region=B
function createFilters(container, objects, onChange) {
  const toOptions = (values) => values.map((v) => [v, v]);
  const centuries = [...new Set(objects.map(centuryOf).filter(Boolean))].sort((a, b) => a - b);
  const museums = objects.filter(isMuseum).sort((a, b) => a.name.localeCompare(b.name, "ru"));

  container.innerHTML = `
    <input type="search" name="q" placeholder="Поиск: название, село, район…" autocomplete="off">
    ${selectHtml("worth", "Все объекты", [["1", "★ Только «Стоит посетить»"]])}
    ${multiHtml("region", "Все регионы", "Регионы", toOptions(uniqueSorted(objects.map((o) => o.region))))}
    ${multiHtml("type", "Все типы", "Типы", toOptions(uniqueSorted(objects.map((o) => o.type))))}
    ${multiHtml("century", "Любой век", "Века", centuries.map((c) => [String(c), centuryLabel(c)]))}
    ${multiHtml("status", "Любой статус", "Статусы", toOptions(Object.keys(STATUS_COLORS)))}
    ${selectHtml("museum", "Музеи и вне музеев", [
      ["none", "Только вне музеев"],
      ["any", "Только в музеях"],
      ...museums.map((m) => [m.id, m.name]),
    ])}
    <button type="button" class="filters-reset">Сбросить</button>`;

  const isMulti = (key) => MULTI_KEYS.includes(key);
  const boxes = (key) => [...container.querySelectorAll(`input[type="checkbox"][name="${key}"]`)];
  const field = (key) => container.querySelector(`[name="${key}"]`);
  const allDetails = [...container.querySelectorAll(".multi")];

  // Начальные значения берём из адреса страницы
  const params = new URLSearchParams(location.search);
  FILTER_KEYS.forEach((key) => {
    if (isMulti(key)) {
      const wanted = params.getAll(key);
      boxes(key).forEach((box) => (box.checked = wanted.includes(box.value)));
    } else if (params.has(key)) {
      field(key).value = params.get(key);
    }
  });
  allDetails.forEach(updateMultiSummary);

  const getState = () => Object.fromEntries(FILTER_KEYS.map((key) => [key,
    isMulti(key) ? boxes(key).filter((box) => box.checked).map((box) => box.value) : field(key).value.trim()]));

  const update = () => {
    allDetails.forEach(updateMultiSummary);
    const state = getState();
    const url = new URLSearchParams(location.search);
    FILTER_KEYS.forEach((key) => {
      url.delete(key);
      if (isMulti(key)) state[key].forEach((value) => url.append(key, value));
      else if (state[key]) url.set(key, state[key]);
    });
    const query = url.toString();
    history.replaceState(null, "", query ? `?${query}` : location.pathname);
    onChange(state);
  };

  container.addEventListener("input", update);
  container.querySelector(".filters-reset").addEventListener("click", () => {
    FILTER_KEYS.forEach((key) => {
      if (isMulti(key)) boxes(key).forEach((box) => (box.checked = false));
      else field(key).value = "";
    });
    allDetails.forEach((details) => (details.open = false));
    update();
  });

  // Открыт только один список; щелчок мимо или Esc закрывает его
  allDetails.forEach((details) => details.addEventListener("toggle", () => {
    if (details.open) allDetails.forEach((other) => other !== details && (other.open = false));
  }));
  document.addEventListener("click", (event) => {
    allDetails.forEach((details) => !details.contains(event.target) && (details.open = false));
  });
  container.addEventListener("keydown", (event) => {
    const open = allDetails.find((details) => details.open);
    if (event.key === "Escape" && open) {
      event.stopPropagation();
      open.open = false;
      open.querySelector("summary").focus();
    }
  });

  onChange(getState());
}

// Подходит ли объект под фильтр «Музей»
function matchesMuseum(obj, value) {
  if (!value) return true;
  const museumId = isMuseum(obj) ? obj.id : obj.museum;
  if (value === "none") return !museumId;
  if (value === "any") return Boolean(museumId);
  return museumId === value;
}

function filterObjects(objects, state) {
  const query = normalize(state.q);
  return objects.filter((obj) => {
    if (query && !normalize(`${obj.name} ${obj.address} ${obj.region} ${obj.origin || ""}`).includes(query)) return false;
    if (state.worth && !obj.worth_visit) return false;
    // В списках с галочками объект подходит, если совпадает с любым из отмеченных значений
    if (state.region.length && !state.region.includes(obj.region)) return false;
    if (state.type.length && !state.type.includes(obj.type)) return false;
    if (state.century.length && !state.century.includes(String(centuryOf(obj)))) return false;
    if (state.status.length && !state.status.includes(obj.status)) return false;
    if (!matchesMuseum(obj, state.museum)) return false;
    return true;
  });
}

// Адрес для связи собирается из частей при открытии страницы, чтобы спам-боты не нашли его в коде.
// Подставляется во все ссылки с классом contact-email.
function fillContactLinks() {
  const email = ["anton.mohlic", "gmail.com"].join("@");
  document.querySelectorAll(".contact-email").forEach((link) => {
    link.href = `mailto:${email}`;
    link.textContent = email;
  });
}

// Подпись в углу карт: без флага, который Leaflet по умолчанию ставит перед своим названием.
// Название библиотеки и обязательное «© OpenStreetMap» остаются.
if (typeof L !== "undefined") {
  L.Control.Attribution.prototype.options.prefix =
    '<a href="https://leafletjs.com" target="_blank" rel="noopener">Leaflet</a>';
}

renderHeader();
fillContactLinks();
