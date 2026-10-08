// Общий код для всех страниц сайта: шапка с меню, загрузка данных, фильтры.

// Цвет метки для каждого статуса сохранности
const STATUS_COLORS = {
  "сохранился": "#2e7d32",
  "аварийный": "#e08a00",
  "утрачен": "#8a8a8a",
};

// Цвет меток музеев
const MUSEUM_COLOR = "#6b4226";

// Пункты меню. Чтобы добавить раздел, допишите сюда строку.
const NAV_ITEMS = [
  { href: "index.html", label: "Карта" },
  { href: "catalog.html", label: "Каталог" },
  { href: "museums.html", label: "Музеи" },
  { href: "about.html", label: "О сервисе" },
];

// ---------- Вспомогательные функции ----------

// Защита от случайных HTML-символов в данных
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

function museumBadge() {
  return `<span class="status" style="background:${MUSEUM_COLOR}">музейный комплекс</span>`;
}

// Адрес фото нужной ширины. Wikimedia Commons сам отдаёт уменьшенную копию.
function photoSrc(obj, width) {
  if (!obj.photo || !obj.photo.includes("Special:FilePath")) return obj.photo;
  return `${obj.photo.split("?")[0]}?width=${width}`;
}

// Подпись к фото. Лицензия CC BY-SA требует указывать автора и лицензию.
function photoCredit(obj) {
  if (!obj.photo_author) return "";
  const text = `Фото: ${obj.photo_author}, ${obj.photo_license || "лицензия не указана"}`;
  return obj.photo_source
    ? `<a class="credit" href="${escapeHtml(obj.photo_source)}" target="_blank" rel="noopener">${escapeHtml(text)}</a>`
    : `<span class="credit">${escapeHtml(text)}</span>`;
}

function objectUrl(obj) {
  return `object.html?id=${encodeURIComponent(obj.id)}`;
}

function mapUrl(obj) {
  return `index.html?id=${encodeURIComponent(obj.id)}`;
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

// Знак проекта — шатровая церковь (тот же рисунок, что в logo.svg).
// Встроен прямо в страницу, чтобы цвет брался из текста шапки (currentColor).
const LOGO_SVG = `
  <svg class="brand-logo" viewBox="0 0 64 64" aria-hidden="true" fill="currentColor">
    <rect x="31" y="2" width="2" height="9"/><rect x="28.5" y="4.5" width="7" height="1.8"/>
    <path d="M32 9.5c-3 2.2-4.2 4.2-4.2 6.1 0 2 1.9 3.3 4.2 3.3s4.2-1.3 4.2-3.3c0-1.9-1.2-3.9-4.2-6.1z"/>
    <rect x="30.4" y="18.6" width="3.2" height="3"/><path d="M32 20.5 22.5 43h19z"/><path d="M19.5 43h25l-2 3.2h-21z"/>
    <rect x="22" y="46.8" width="20" height="2.6" rx="1.3"/><rect x="22" y="50.2" width="20" height="2.6" rx="1.3"/>
    <rect x="22" y="53.6" width="20" height="2.6" rx="1.3"/><rect x="22" y="57" width="20" height="2.6" rx="1.3"/>
    <path d="M10 50.5 16 46l6 4.5z"/><rect x="11" y="51.2" width="10" height="2.4" rx="1.2"/>
    <rect x="11" y="54.3" width="10" height="2.4" rx="1.2"/><rect x="11" y="57.4" width="10" height="2.4" rx="1.2"/>
    <path d="M42 50.5 48 46l6 4.5z"/><rect x="43" y="51.2" width="10" height="2.4" rx="1.2"/>
    <rect x="43" y="54.3" width="10" height="2.4" rx="1.2"/><rect x="43" y="57.4" width="10" height="2.4" rx="1.2"/>
    <rect x="6" y="60.6" width="52" height="1.6" rx="0.8"/>
  </svg>`;

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
  // Страница объекта относится к разделу «Каталог»
  const activePage = currentPage === "object.html" ? "catalog.html" : currentPage;

  const links = NAV_ITEMS.map((item) => {
    const active = item.href === activePage ? ' class="active" aria-current="page"' : "";
    return `<a href="${item.href}"${active}>${item.label}</a>`;
  }).join("");

  const header = document.createElement("header");
  header.className = "site-header";
  header.innerHTML = `
    <a class="brand" href="index.html" aria-label="Открытый каталог деревянного зодчества России — на главную">
      ${LOGO_SVG}
      <span class="brand-text">
        <span class="brand-title">Открытый каталог</span>
        <span class="brand-subtitle">деревянного зодчества России</span>
      </span>
    </a>
    <button class="menu-toggle" type="button" aria-label="Открыть меню" aria-expanded="false">☰</button>
    <nav class="site-nav">${links}<span class="account-link" hidden></span></nav>`;
  document.body.prepend(header);
  renderAccountLink(header.querySelector(".account-link"), activePage);

  // На телефоне меню открывается кнопкой ☰
  const toggle = header.querySelector(".menu-toggle");
  toggle.addEventListener("click", () => {
    const open = header.classList.toggle("menu-open");
    toggle.setAttribute("aria-expanded", open);
    toggle.textContent = open ? "✕" : "☰";
  });
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

const FILTER_KEYS = ["q", "region", "type", "century", "status", "museum"];

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

// Рисует поиск и фильтры в container. При каждом изменении вызывает onChange(состояние).
// Состояние хранится в адресе страницы, поэтому ссылкой с фильтрами можно поделиться.
function createFilters(container, objects, onChange) {
  const toOptions = (values) => values.map((v) => [v, v]);
  const centuries = [...new Set(objects.map(centuryOf).filter(Boolean))].sort((a, b) => a - b);
  const museums = objects.filter(isMuseum).sort((a, b) => a.name.localeCompare(b.name, "ru"));

  container.innerHTML = `
    <input type="search" name="q" placeholder="Поиск: название, село, район…" autocomplete="off">
    ${selectHtml("region", "Все регионы", toOptions(uniqueSorted(objects.map((o) => o.region))))}
    ${selectHtml("type", "Все типы", toOptions(uniqueSorted(objects.map((o) => o.type))))}
    ${selectHtml("century", "Любой век", centuries.map((c) => [c, centuryLabel(c)]))}
    ${selectHtml("status", "Любой статус", toOptions(Object.keys(STATUS_COLORS)))}
    ${selectHtml("museum", "Музеи и вне музеев", [
      ["none", "Только вне музеев"],
      ["any", "Только в музеях"],
      ...museums.map((m) => [m.id, m.name]),
    ])}
    <button type="button" class="filters-reset">Сбросить</button>`;

  const fields = Object.fromEntries(FILTER_KEYS.map((key) => [key, container.querySelector(`[name="${key}"]`)]));

  // Начальные значения берём из адреса страницы
  const params = new URLSearchParams(location.search);
  FILTER_KEYS.forEach((key) => {
    if (params.has(key)) fields[key].value = params.get(key);
  });

  const getState = () => Object.fromEntries(FILTER_KEYS.map((key) => [key, fields[key].value.trim()]));

  const update = () => {
    const state = getState();
    const url = new URLSearchParams(location.search);
    FILTER_KEYS.forEach((key) => (state[key] ? url.set(key, state[key]) : url.delete(key)));
    const query = url.toString();
    history.replaceState(null, "", query ? `?${query}` : location.pathname);
    onChange(state);
  };

  container.addEventListener("input", update);
  container.querySelector(".filters-reset").addEventListener("click", () => {
    FILTER_KEYS.forEach((key) => (fields[key].value = ""));
    update();
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
    if (state.region && obj.region !== state.region) return false;
    if (state.type && obj.type !== state.type) return false;
    if (state.century && String(centuryOf(obj)) !== state.century) return false;
    if (state.status && obj.status !== state.status) return false;
    if (!matchesMuseum(obj, state.museum)) return false;
    return true;
  });
}

renderHeader();
