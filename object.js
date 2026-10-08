// Страница отдельного объекта: object.html?id=…

const container = document.getElementById("object");

function factRow(label, value) {
  return value ? `<dt>${label}</dt><dd>${value}</dd>` : "";
}

// Маленькая карточка памятника для списка на странице музея
function itemCardHtml(obj) {
  return `
    <a class="mini-card" href="${objectUrl(obj)}">
      ${obj.photo ? `<img src="${escapeHtml(photoSrc(obj, 400))}" alt="${escapeHtml(obj.name)}" loading="lazy">` : ""}
      <span class="mini-card-title">${escapeHtml(obj.name)}</span>
      <span class="mini-card-meta">${escapeHtml(dateLabel(obj))}</span>
    </a>`;
}

function render(obj, objects) {
  document.title = `${obj.name} — Деревянное зодчество России`;

  const museum = objects.find((item) => item.id === obj.museum);
  const items = isMuseum(obj) ? objects.filter((item) => item.museum === obj.id) : [];
  const museumLink = museum ? `<a href="${objectUrl(museum)}">${escapeHtml(museum.name)}</a>` : "";

  const facts = isMuseum(obj)
    ? [
        factRow("Тип", "музей деревянного зодчества"),
        factRow("Основан", obj.founded ? `${obj.founded} г.` : ""),
        factRow("Регион", escapeHtml(obj.region)),
        factRow("Адрес", escapeHtml(obj.address)),
        factRow("Координаты", `${obj.lat}, ${obj.lon}`),
      ]
    : [
        factRow("Тип", escapeHtml(obj.type)),
        factRow("Год постройки", escapeHtml(dateLabel(obj))),
        factRow("Музей", museumLink),
        factRow("Перевезена из", escapeHtml(obj.origin)),
        factRow("Регион", escapeHtml(obj.region)),
        factRow("Адрес", escapeHtml(obj.address)),
        factRow("Координаты", `${obj.lat}, ${obj.lon}`),
      ];

  container.innerHTML = `
    <p class="breadcrumbs">${
      isMuseum(obj) ? `<a href="museums.html">← Музеи</a>` : museum ? `<a href="${objectUrl(museum)}">← ${escapeHtml(museum.name)}</a>` : `<a href="catalog.html">← Каталог</a>`
    }</p>
    <h1>${escapeHtml(obj.name)}</h1>

    <div class="object-layout">
      <figure class="object-photo">
        ${obj.photo ? `<img src="${escapeHtml(photoSrc(obj, 1200))}" alt="${escapeHtml(obj.name)}">` : ""}
        <figcaption>${photoCredit(obj)}</figcaption>
      </figure>

      <div class="object-info">
        ${isMuseum(obj) ? museumBadge() : statusBadge(obj.status)}
        <dl class="facts">${facts.join("")}</dl>
        ${obj.description ? `<p class="description">${escapeHtml(obj.description)}</p>` : ""}
        <div class="card-links">
          <a href="${mapUrl(obj)}">Показать на большой карте</a>
          ${obj.wiki ? `<a href="${escapeHtml(obj.wiki)}" target="_blank" rel="noopener">Статья в Википедии</a>` : ""}
          ${obj.website ? `<a href="${escapeHtml(obj.website)}" target="_blank" rel="noopener">Официальный сайт</a>` : ""}
          <a href="propose.html?edit=${encodeURIComponent(obj.id)}" id="suggest-edit" hidden>✎ Предложить правку</a>
        </div>
      </div>
    </div>

    ${
      items.length
        ? `<h2>Памятники музея на сайте</h2>
           <div class="mini-grid">${items.map(itemCardHtml).join("")}</div>`
        : ""
    }

    <h2>На карте</h2>
    <div class="object-map" id="object-map"></div>`;

  // Предложить правку можно, только когда сервер доступен
  checkServer().then((available) => (document.getElementById("suggest-edit").hidden = !available));

  const miniMap = L.map("object-map", { scrollWheelZoom: false });
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(miniMap);

  // На странице музея показываем его памятники, иначе — сам объект
  const points = items.length ? items : [obj];
  points.forEach((point) =>
    L.circleMarker([point.lat, point.lon], {
      radius: 10,
      color: "#fff",
      weight: 2,
      fillColor: isMuseum(point) ? MUSEUM_COLOR : STATUS_COLORS[point.status] || "#555",
      fillOpacity: 1,
    })
      .bindTooltip(point.name)
      .addTo(miniMap)
  );

  if (points.length > 1) {
    miniMap.fitBounds(L.latLngBounds(points.map((p) => [p.lat, p.lon])), { padding: [40, 40], maxZoom: 16 });
  } else {
    miniMap.setView([obj.lat, obj.lon], obj.museum ? 15 : 11);
  }
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
    obj ? render(obj, objects) : renderNotFound();
  })
  .catch((error) => {
    container.innerHTML = `<p>Не удалось загрузить данные.</p>`;
    console.error(error);
  });
