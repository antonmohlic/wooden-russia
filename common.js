// Общий код для всех страниц сайта: шапка с меню, загрузка данных, фильтры.

// Цвет метки для каждого статуса сохранности
const STATUS_COLORS = {
  "сохранился": "#2e7d32",
  "аварийный": "#e08a00",
  "утрачен": "#8a8a8a",
};

// Пункты меню. Чтобы добавить раздел, допишите сюда строку.
const NAV_ITEMS = [
  { href: "index.html", label: "Карта" },
  { href: "catalog.html", label: "Каталог" },
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

// 1654 → 17
function centuryOf(year) {
  return year ? Math.ceil(year / 100) : null;
}

// 17 → «XVII век»
function centuryLabel(century) {
  return `${toRoman(century)} век`;
}

// «церковь · 1654 г. (XVII век)»
function yearLine(obj) {
  const parts = [obj.type];
  if (obj.year) parts.push(`${obj.year} г. (${centuryLabel(centuryOf(obj.year))})`);
  return parts.filter(Boolean).join(" · ");
}

function statusBadge(status) {
  const color = STATUS_COLORS[status] || "#555";
  return `<span class="status" style="background:${color}">${escapeHtml(status)}</span>`;
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

// Загружает data/objects.json один раз на страницу
function loadObjects() {
  if (!objectsPromise) {
    objectsPromise = fetch("data/objects.json").then((response) => {
      if (!response.ok) throw new Error(`Не удалось загрузить данные: ${response.status}`);
      return response.json();
    });
  }
  return objectsPromise;
}

// ---------- Шапка и меню ----------

function renderHeader() {
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
    <a class="brand" href="index.html">Деревянное зодчество России</a>
    <button class="menu-toggle" type="button" aria-label="Открыть меню" aria-expanded="false">☰</button>
    <nav class="site-nav">${links}</nav>`;
  document.body.prepend(header);

  // На телефоне меню открывается кнопкой ☰
  const toggle = header.querySelector(".menu-toggle");
  toggle.addEventListener("click", () => {
    const open = header.classList.toggle("menu-open");
    toggle.setAttribute("aria-expanded", open);
    toggle.textContent = open ? "✕" : "☰";
  });
}

// ---------- Фильтры (общие для карты и каталога) ----------

const FILTER_KEYS = ["q", "region", "type", "century", "status"];

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
  const centuries = [...new Set(objects.map((o) => centuryOf(o.year)).filter(Boolean))].sort((a, b) => a - b);

  container.innerHTML = `
    <input type="search" name="q" placeholder="Поиск: название, село, район…" autocomplete="off">
    ${selectHtml("region", "Все регионы", toOptions(uniqueSorted(objects.map((o) => o.region))))}
    ${selectHtml("type", "Все типы", toOptions(uniqueSorted(objects.map((o) => o.type))))}
    ${selectHtml("century", "Любой век", centuries.map((c) => [c, centuryLabel(c)]))}
    ${selectHtml("status", "Любой статус", toOptions(Object.keys(STATUS_COLORS)))}
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

function filterObjects(objects, state) {
  const query = normalize(state.q);
  return objects.filter((obj) => {
    if (query && !normalize(`${obj.name} ${obj.address} ${obj.region}`).includes(query)) return false;
    if (state.region && obj.region !== state.region) return false;
    if (state.type && obj.type !== state.type) return false;
    if (state.century && String(centuryOf(obj.year)) !== state.century) return false;
    if (state.status && obj.status !== state.status) return false;
    return true;
  });
}

renderHeader();
