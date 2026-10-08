// Страница «Каталог»

const SORTERS = {
  "name": (a, b) => a.name.localeCompare(b.name, "ru"),
  "year-asc": (a, b) => (a.year || 9999) - (b.year || 9999),
  "year-desc": (a, b) => (b.year || 0) - (a.year || 0),
};

function cardHtml(obj) {
  return `
    <article class="catalog-card">
      <a class="catalog-photo" href="${objectUrl(obj)}">
        ${obj.photo ? `<img src="${escapeHtml(photoSrc(obj, 500))}" alt="${escapeHtml(obj.name)}" loading="lazy">` : ""}
      </a>
      ${photoCredit(obj)}
      <div class="catalog-body">
        <h2><a href="${objectUrl(obj)}">${escapeHtml(obj.name)}</a></h2>
        <p>${escapeHtml(obj.address)}</p>
        <p>${escapeHtml(yearLine(obj))}</p>
        ${statusBadge(obj.status)}
        <div class="card-links">
          <a href="${objectUrl(obj)}">Подробнее</a>
          <a href="${mapUrl(obj)}">На карте</a>
          ${obj.wiki ? `<a href="${escapeHtml(obj.wiki)}" target="_blank" rel="noopener">Википедия</a>` : ""}
        </div>
      </div>
    </article>`;
}

const sortSelect = document.getElementById("sort");
const catalog = document.getElementById("catalog");
const count = document.getElementById("count");

loadObjects()
  .then((objects) => {
    let filterState = {};

    const render = () => {
      const visible = filterObjects(objects, filterState).sort(SORTERS[sortSelect.value]);
      count.textContent = `Найдено объектов: ${visible.length} из ${objects.length}`;
      catalog.innerHTML = visible.length
        ? visible.map(cardHtml).join("")
        : `<p class="empty">Ничего не найдено. Попробуйте изменить запрос или сбросить фильтры.</p>`;
    };

    sortSelect.addEventListener("change", render);
    createFilters(document.getElementById("filters"), objects, (state) => {
      filterState = state;
      render();
    });
  })
  .catch((error) => {
    count.textContent = "Не удалось загрузить данные";
    console.error(error);
  });
