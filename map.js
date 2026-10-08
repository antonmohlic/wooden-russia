// Страница «Карта объектов»

const map = L.map("map").setView([63.5, 41], 6);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 18,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}).addTo(map);

// Слой, в котором лежат видимые сейчас метки
const markersLayer = L.layerGroup().addTo(map);

// HTML карточки, которая открывается по клику на метку
function popupHtml(obj) {
  return `
    <div class="popup-card">
      ${obj.photo ? `<img src="${escapeHtml(photoSrc(obj, 500))}" alt="${escapeHtml(obj.name)}" loading="lazy">` : ""}
      ${photoCredit(obj)}
      <h3>${escapeHtml(obj.name)}</h3>
      <p>${escapeHtml(obj.address)}</p>
      <p>${escapeHtml(yearLine(obj))}</p>
      ${statusBadge(obj.status)}
      <div class="popup-links">
        <a href="${objectUrl(obj)}">Подробнее →</a>
        ${obj.wiki ? `<a href="${escapeHtml(obj.wiki)}" target="_blank" rel="noopener">Википедия</a>` : ""}
      </div>
    </div>`;
}

function fitTo(objects) {
  if (!objects.length) return;
  const bounds = L.latLngBounds(objects.map((obj) => [obj.lat, obj.lon]));
  map.fitBounds(bounds, { padding: [40, 40], maxZoom: 11 });
}

// Кнопка «Фильтры» на телефоне
const panel = document.getElementById("map-panel");
const panelToggle = document.getElementById("panel-toggle");
panelToggle.addEventListener("click", () => {
  const open = panel.classList.toggle("open");
  panelToggle.setAttribute("aria-expanded", open);
  panelToggle.textContent = open ? "Показать карту" : "Фильтры";
});

loadObjects()
  .then((objects) => {
    // Одна метка на каждый объект; фильтры только прячут и показывают их
    const markers = new Map(
      objects.map((obj) => [
        obj.id,
        L.circleMarker([obj.lat, obj.lon], {
          radius: 9,
          color: "#fff",
          weight: 2,
          fillColor: STATUS_COLORS[obj.status] || "#555",
          fillOpacity: 1,
        })
          .bindTooltip(obj.name)
          .bindPopup(popupHtml(obj), { maxWidth: 280 }),
      ])
    );

    // Ссылка вида index.html?id=… открывает конкретный объект
    const focusId = new URLSearchParams(location.search).get("id");
    const focusObj = objects.find((obj) => obj.id === focusId);
    let firstRender = true;

    createFilters(document.getElementById("filters"), objects, (state) => {
      const visible = filterObjects(objects, state);
      markersLayer.clearLayers();
      visible.forEach((obj) => markersLayer.addLayer(markers.get(obj.id)));

      document.getElementById("count").textContent = `Показано объектов: ${visible.length} из ${objects.length}`;

      if (firstRender && focusObj) {
        markersLayer.addLayer(markers.get(focusObj.id));
        // Без анимации, чтобы карточка открылась уже на приближенной карте и поместилась целиком
        map.setView([focusObj.lat, focusObj.lon], 10, { animate: false });
        markers.get(focusObj.id).openPopup();
      } else {
        fitTo(visible);
      }
      firstRender = false;
    });
  })
  .catch((error) => {
    document.getElementById("count").textContent = "Не удалось загрузить данные";
    console.error(error);
  });
