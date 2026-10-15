// Страница «Поездки»: маршруты, волонтёрские экспедиции, экскурсии партнёров.
// Пока списки ведутся здесь, в коде. У карточки: title, meta (строка под названием),
// text, photo (ссылка на картинку), url (куда ведёт), status (метка поверх фото, например «Готовится»).

const TRIPS = {
  routes: [
    { title: "Онежское Поморье", meta: "Архангельская область · 3 дня", status: "Готовится" },
    { title: "Каргополье", meta: "Архангельская область · 2–3 дня", status: "Готовится" },
    { title: "Заонежье", meta: "Карелия · 2–3 дня", status: "Готовится" },
  ],
  expeditions: [
    { title: "Летняя экспедиция 2027", meta: "Маршрут выбираем вместе", status: "Готовится" },
  ],
  tours: [],
};

const EMPTY_TEXT = {
  routes: "Маршруты готовятся.",
  expeditions: "Экспедиции готовятся.",
  tours: `Пока партнёров нет. Проводите экскурсии по деревянному зодчеству? Напишите нам: <a class="contact-email" href="#">включите JavaScript, чтобы увидеть адрес</a>`,
};

function tripCardHtml(trip) {
  const tag = trip.url ? "a" : "div";
  const href = trip.url && safeUrl(trip.url) ? ` href="${escapeHtml(safeUrl(trip.url))}"` : "";
  return `
    <${tag} class="trip-card${trip.url ? "" : " is-soon"}"${href}>
      <div class="trip-photo">
        ${trip.photo ? `<img src="${escapeHtml(trip.photo)}" alt="" loading="lazy">` : ""}
        ${trip.status ? `<span class="trip-status">${escapeHtml(trip.status)}</span>` : ""}
      </div>
      <div class="trip-title">${escapeHtml(trip.title)}</div>
      ${trip.meta ? `<div class="trip-meta">${escapeHtml(trip.meta)}</div>` : ""}
      ${trip.text ? `<p class="trip-text">${escapeHtml(trip.text)}</p>` : ""}
    </${tag}>`;
}

for (const [id, trips] of Object.entries(TRIPS)) {
  document.getElementById(id).innerHTML = trips.length
    ? trips.map(tripCardHtml).join("")
    : `<p class="empty trip-empty">${EMPTY_TEXT[id]}</p>`;
}

// Почта в тексте «Пока партнёров нет» появилась после загрузки страницы
fillContactLinks();
