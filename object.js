// Страница отдельного объекта: object.html?id=…

const container = document.getElementById("object");

function factRow(label, value) {
  return value ? `<dt>${label}</dt><dd>${value}</dd>` : "";
}

function render(obj) {
  document.title = `${obj.name} — Деревянное зодчество России`;

  container.innerHTML = `
    <p class="breadcrumbs"><a href="catalog.html">← Каталог</a></p>
    <h1>${escapeHtml(obj.name)}</h1>

    <div class="object-layout">
      <figure class="object-photo">
        ${obj.photo ? `<img src="${escapeHtml(photoSrc(obj, 1200))}" alt="${escapeHtml(obj.name)}">` : ""}
        <figcaption>${photoCredit(obj)}</figcaption>
      </figure>

      <div class="object-info">
        ${statusBadge(obj.status)}
        <dl class="facts">
          ${factRow("Тип", escapeHtml(obj.type))}
          ${factRow("Год постройки", obj.year ? `${obj.year} (${centuryLabel(centuryOf(obj.year))})` : "")}
          ${factRow("Регион", escapeHtml(obj.region))}
          ${factRow("Адрес", escapeHtml(obj.address))}
          ${factRow("Координаты", `${obj.lat}, ${obj.lon}`)}
        </dl>
        ${obj.description ? `<p class="description">${escapeHtml(obj.description)}</p>` : ""}
        <div class="card-links">
          <a href="${mapUrl(obj)}">Показать на большой карте</a>
          ${obj.wiki ? `<a href="${escapeHtml(obj.wiki)}" target="_blank" rel="noopener">Статья в Википедии</a>` : ""}
        </div>
      </div>
    </div>

    <h2>На карте</h2>
    <div class="object-map" id="object-map"></div>`;

  const miniMap = L.map("object-map", { scrollWheelZoom: false }).setView([obj.lat, obj.lon], 11);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(miniMap);
  L.circleMarker([obj.lat, obj.lon], {
    radius: 10,
    color: "#fff",
    weight: 2,
    fillColor: STATUS_COLORS[obj.status] || "#555",
    fillOpacity: 1,
  }).addTo(miniMap);
}

function renderNotFound() {
  container.innerHTML = `
    <h1>Объект не найден</h1>
    <p>Возможно, ссылка устарела. <a href="catalog.html">Перейти в каталог</a></p>`;
}

const id = new URLSearchParams(location.search).get("id");

loadObjects()
  .then((objects) => {
    const obj = objects.find((item) => item.id === id);
    obj ? render(obj) : renderNotFound();
  })
  .catch((error) => {
    container.innerHTML = `<p>Не удалось загрузить данные.</p>`;
    console.error(error);
  });
