// Страница «Карта объектов»

// С какого приближения музей «раскрывается» в отдельные памятники
const MUSEUM_EXPAND_ZOOM = 13;

// Кнопки масштаба справа, чтобы слева не мешали кнопке и панели фильтров
const map = L.map("map", { zoomControl: false }).setView([63.5, 41], 6);
L.control.zoom({ position: "topright" }).addTo(map);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 18,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}).addTo(map);

// Слой с видимыми метками. Близкие метки объединяются в кружок с числом (Leaflet.markercluster),
// с 12-го приближения все метки показываются по отдельности.
const markersLayer = L.markerClusterGroup({
  maxClusterRadius: 45,
  disableClusteringAtZoom: 12,
  showCoverageOnHover: false,
  spiderfyOnMaxZoom: true,
  iconCreateFunction: (cluster) => {
    const count = cluster.getChildCount();
    const size = count < 10 ? 34 : count < 100 ? 40 : 46;
    return L.divIcon({
      className: "",
      html: `<div class="cluster-marker" style="width:${size}px;height:${size}px">${count}</div>`,
      iconSize: [size, size],
    });
  },
}).addTo(map);

// Метка памятника: кружок цвета статуса
function objectIcon(obj) {
  const color = STATUS_COLORS[obj.status] || "#555";
  return L.divIcon({
    className: "",
    html: `<div class="object-marker" style="background:${color}"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -10],
  });
}

function photoHtml(obj) {
  return obj.photo ? `<img src="${escapeHtml(photoSrc(obj, 500))}" alt="${escapeHtml(obj.name)}" loading="lazy">` : "";
}

// Карточка памятника
function popupHtml(obj, museum) {
  return `
    <div class="popup-card">
      ${photoHtml(obj)}
      ${photoCredit(obj)}
      <h3>${escapeHtml(obj.name)}</h3>
      ${museum ? `<p>В музее: <a href="${objectUrl(museum)}">${escapeHtml(museum.name)}</a></p>` : ""}
      <p>${escapeHtml(obj.address)}</p>
      <p>${escapeHtml(yearLine(obj))}</p>
      ${statusBadge(obj.status)}
      <div class="popup-links">
        <a href="${objectUrl(obj)}">Подробнее →</a>
        ${obj.wiki ? `<a href="${escapeHtml(obj.wiki)}" target="_blank" rel="noopener">Википедия</a>` : ""}
      </div>
    </div>`;
}

// Карточка музея со списком его памятников
function museumPopupHtml(museum, items) {
  const list = items.length
    ? `<ul class="popup-list">${items.map((o) => `<li><a href="${objectUrl(o)}">${escapeHtml(o.name)}</a></li>`).join("")}</ul>`
    : "";
  return `
    <div class="popup-card">
      ${photoHtml(museum)}
      ${photoCredit(museum)}
      <h3>${escapeHtml(museum.name)}</h3>
      <p>${escapeHtml(yearLine(museum))}</p>
      ${museumBadge()}
      ${list}
      <div class="popup-links">
        <a href="${objectUrl(museum)}">О музее →</a>
        ${items.length ? `<a href="#" data-zoom="${escapeHtml(museum.id)}">Приблизить</a>` : ""}
      </div>
    </div>`;
}

function museumIcon(count) {
  return L.divIcon({
    className: "",
    html: `<div class="museum-marker" title="Музей">${count || "М"}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
}

function fitTo(objects) {
  if (!objects.length) return;
  const bounds = L.latLngBounds(objects.map((obj) => [obj.lat, obj.lon]));
  // Отступы: сверху — под кнопкой «Фильтры», снизу — под легендой, чтобы метки не прятались за ними
  map.fitBounds(bounds, { paddingTopLeft: [40, 100], paddingBottomRight: [40, 140], maxZoom: 11 });
}

// ---------- Панель фильтров поверх карты ----------
// Открывается кнопкой «Фильтры», закрывается кнопкой «Показать на карте», крестиком, Esc или кликом по карте.
const panel = document.getElementById("map-panel");
const panelToggle = document.getElementById("panel-toggle");

function setPanelOpen(open) {
  panel.hidden = !open;
  panelToggle.hidden = open;
  panelToggle.setAttribute("aria-expanded", open);
  if (open) panel.querySelector("input, select")?.focus();
  else panelToggle.focus({ preventScroll: true });
}

panelToggle.addEventListener("click", () => setPanelOpen(true));
document.getElementById("panel-close").addEventListener("click", () => setPanelOpen(false));
document.getElementById("panel-done").addEventListener("click", () => setPanelOpen(false));
map.on("click", () => {
  if (!panel.hidden) setPanelOpen(false);
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !panel.hidden) setPanelOpen(false);
});

// Сколько фильтров включено — показываем на закрытой кнопке
function updateFilterBadge(state) {
  const active = Object.values(state).filter(Boolean).length;
  const badge = document.getElementById("filters-badge");
  badge.textContent = active;
  badge.hidden = active === 0;
}

loadObjects()
  .then((objects) => {
    const byId = new Map(objects.map((obj) => [obj.id, obj]));
    const itemsOf = (museumId) => objects.filter((obj) => obj.museum === museumId);

    // Одна метка на каждый объект; фильтры и масштаб только прячут и показывают их
    const markers = new Map(
      objects.map((obj) => {
        const marker = isMuseum(obj)
          ? L.marker([obj.lat, obj.lon], { icon: museumIcon(itemsOf(obj.id).length), zIndexOffset: -100 })
              .bindPopup(museumPopupHtml(obj, itemsOf(obj.id)), { maxWidth: 280 })
          : L.marker([obj.lat, obj.lon], { icon: objectIcon(obj) })
              .bindPopup(popupHtml(obj, byId.get(obj.museum)), { maxWidth: 280 });
        return [obj.id, marker.bindTooltip(obj.name)];
      })
    );

    // Кнопка «Приблизить» в карточке музея
    map.on("popupopen", (event) => {
      const link = event.popup.getElement().querySelector("[data-zoom]");
      if (!link) return;
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const items = itemsOf(link.dataset.zoom);
        map.closePopup();
        map.fitBounds(L.latLngBounds(items.map((o) => [o.lat, o.lon])), { padding: [60, 60], maxZoom: 16 });
      });
    });

    let visible = [];

    // Когда карта отдалена, памятники музея спрятаны внутрь его метки; при приближении — наоборот
    const drawMarkers = () => {
      const expanded = map.getZoom() >= MUSEUM_EXPAND_ZOOM;
      const shownMuseums = new Set(visible.filter(isMuseum).map((m) => m.id));
      const shown = visible.filter((obj) => {
        if (isMuseum(obj) && expanded && itemsOf(obj.id).length) return false;
        if (obj.museum && shownMuseums.has(obj.museum) && !expanded) return false;
        return true;
      });
      markersLayer.clearLayers();
      markersLayer.addLayers(shown.map((obj) => markers.get(obj.id)));
    };

    map.on("zoomend", drawMarkers);

    // Ссылка вида index.html?id=… открывает конкретный объект
    const focusId = new URLSearchParams(location.search).get("id");
    const focusObj = byId.get(focusId);
    let firstRender = true;

    createFilters(document.getElementById("filters"), objects, (state) => {
      visible = filterObjects(objects, state);
      document.getElementById("count").textContent = `Показано: ${visible.length} из ${objects.length}`;
      const doneButton = document.getElementById("panel-done");
      doneButton.textContent = visible.length ? `Показать на карте (${visible.length})` : "Ничего не найдено";
      doneButton.disabled = visible.length === 0;
      updateFilterBadge(state);

      if (firstRender && focusObj) {
        if (!visible.includes(focusObj)) visible.push(focusObj);
        // Памятник музея открываем на приближенной карте, чтобы он был виден отдельно
        const zoom = focusObj.museum ? 15 : 10;
        // Без анимации, чтобы карточка открылась уже на приближенной карте и поместилась целиком
        map.setView([focusObj.lat, focusObj.lon], zoom, { animate: false });
        drawMarkers();
        // Если метка внутри группы — приближаем, пока она не станет видна, и открываем карточку
        const focusMarker = markers.get(focusObj.id);
        markersLayer.zoomToShowLayer(focusMarker, () => focusMarker.openPopup());
      } else {
        drawMarkers();
        fitTo(visible);
      }
      firstRender = false;
    });
  })
  .catch((error) => {
    document.getElementById("count").textContent = "Не удалось загрузить данные";
    console.error(error);
  });
