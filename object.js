// Страница отдельного объекта: object.html?id=…

const container = document.getElementById("object");

const NEARBY_RADIUS_KM = 100;
const NEARBY_LIMIT = 8;

// Расстояние по поверхности Земли в километрах
function distanceKm(a, b) {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

function distanceLabel(km) {
  return km < 1 ? "меньше 1 км" : `${Math.round(km)} км`;
}

// Ближайшие объекты. Памятники музеев заменяем самим музеем, иначе рядом с Кижами весь список займут они.
// Свой музей и соседей по музею не показываем — до них ведёт ссылка наверху страницы.
function nearbyObjects(obj, objects) {
  const byId = new Map(objects.map((o) => [o.id, o]));
  const ownMuseum = isMuseum(obj) ? obj.id : obj.museum;
  const seen = new Set();
  const result = [];
  for (const other of objects) {
    const place = (other.museum && byId.get(other.museum)) || other;
    if (place.id === obj.id || place.id === ownMuseum || seen.has(place.id)) continue;
    seen.add(place.id);
    const km = distanceKm(obj, place);
    if (km <= NEARBY_RADIUS_KM) result.push({ obj: place, km });
  }
  return result.sort((a, b) => a.km - b.km).slice(0, NEARBY_LIMIT);
}

function factRow(label, value) {
  return value ? `<dt>${label}</dt><dd>${value}</dd>` : "";
}

function render(obj, objects) {
  document.title = `${obj.name} — Открытый каталог деревянного зодчества`;

  const museum = objects.find((item) => item.id === obj.museum);
  const items = isMuseum(obj) ? objects.filter((item) => item.museum === obj.id) : [];
  const nearby = nearbyObjects(obj, objects);
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
        <div class="visit-buttons" id="visit-buttons" hidden></div>
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
           <div class="mini-grid">${items.map((item) => miniCardHtml(item)).join("")}</div>`
        : ""
    }

    <section class="obs-section" id="observations"></section>

    <section class="nearby">
    <h2>Что рядом</h2>
    ${
      nearby.length
        ? `<p class="form-hint">Ближайшие объекты каталога в радиусе ${NEARBY_RADIUS_KM} км, по прямой.</p>
           <div class="mini-grid">${nearby
             .map(({ obj: place, km }) => miniCardHtml(place, `${distanceLabel(km)} · ${isMuseum(place) ? "музей" : place.type}`))
             .join("")}</div>`
        : `<p class="form-hint">В радиусе ${NEARBY_RADIUS_KM} км других объектов в каталоге пока нет.</p>`
    }
    </section>

    <h2>На карте</h2>
    <div class="object-map" id="object-map"></div>`;

  renderObservationsSection(document.getElementById("observations"), obj);
  renderVisitButtons(document.getElementById("visit-buttons"), obj);

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

  // Объекты из «Что рядом» — маленькими метками, видны, если отдалить карту
  nearby.forEach(({ obj: place, km }) =>
    L.circleMarker([place.lat, place.lon], {
      radius: 6,
      color: "#fff",
      weight: 1.5,
      fillColor: isMuseum(place) ? MUSEUM_COLOR : STATUS_COLORS[place.status] || "#555",
      fillOpacity: 0.85,
    })
      .bindTooltip(`${place.name} — ${distanceLabel(km)}`)
      .on("click", () => (location.href = objectUrl(place)))
      .addTo(miniMap)
  );

  if (points.length > 1) {
    miniMap.fitBounds(L.latLngBounds(points.map((p) => [p.lat, p.lon])), { padding: [40, 40], maxZoom: 16 });
  } else {
    miniMap.setView([obj.lat, obj.lon], obj.museum ? 15 : 11);
  }
}

// Кнопки «Хочу посетить» и «Я здесь был». Гостю они предлагают войти.
async function renderVisitButtons(container, obj) {
  if (!obj.recordId || !(await checkServer())) return;
  const user = await refreshAuth();
  const next = encodeURIComponent(`object.html?id=${obj.id}`);
  let visits = [];
  if (user) {
    try {
      visits = await fetchMyVisits(obj.recordId);
    } catch {
      return;
    }
  }

  const draw = () => {
    container.innerHTML = Object.entries(VISIT_LISTS)
      .map(([list, info]) => {
        const on = visits.some((v) => v.list === list);
        const text = `${on ? info.markOn : info.mark} ${info.label}`;
        return user
          ? `<button class="visit-button${on ? " is-on" : ""}" type="button" data-list="${list}" aria-pressed="${on}">${text}</button>`
          : `<a class="visit-button" href="login.html?next=${next}" title="Войдите, чтобы вести свои списки">${text}</a>`;
      })
      .join("");
    container.hidden = false;
  };
  draw();
  if (!user) return;

  container.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-list]");
    if (!button) return;
    const list = button.dataset.list;
    container.querySelectorAll("button").forEach((b) => (b.disabled = true));
    try {
      const existing = visits.find((v) => v.list === list);
      if (existing) {
        await removeVisit(existing.id);
        visits = visits.filter((v) => v !== existing);
      } else {
        visits.push(await addVisit(obj.recordId, list));
        // Побывал — значит, из «Хочу посетить» объект можно убрать
        const wanted = list === "been" && visits.find((v) => v.list === "want");
        if (wanted) {
          await removeVisit(wanted.id);
          visits = visits.filter((v) => v !== wanted);
        }
      }
    } catch (e) {
      alert(e.message);
    }
    draw();
  });
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
