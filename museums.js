// Страница «Музеи»

const list = document.getElementById("museums");

function museumCardHtml(museum, items) {
  const itemsHtml = items.length
    ? `<h3>Памятники на сайте</h3>
       <ul class="museum-items">
         ${items.map((o) => `<li><a href="${objectUrl(o)}">${escapeHtml(o.name)}</a> <span>${escapeHtml(dateLabel(o))}</span></li>`).join("")}
       </ul>`
    : `<p class="empty">Памятники этого музея ещё не добавлены в каталог.</p>`;

  return `
    <article class="museum-card">
      <a class="museum-photo" href="${objectUrl(museum)}">
        ${museum.photo ? `<img src="${escapeHtml(photoSrc(museum, 700))}" alt="${escapeHtml(museum.name)}" loading="lazy">` : ""}
      </a>
      <div class="museum-body">
        <h2><a href="${objectUrl(museum)}">${escapeHtml(museum.name)}</a></h2>
        <p class="museum-meta">${escapeHtml(museum.region)}${museum.founded ? ` · основан в ${museum.founded} г.` : ""}</p>
        <p>${escapeHtml(museum.description)}</p>
        ${itemsHtml}
        <div class="card-links">
          <a href="${objectUrl(museum)}">Подробнее о музее</a>
          <a href="${mapUrl(museum)}">На карте</a>
          ${museum.website ? `<a href="${escapeHtml(museum.website)}" target="_blank" rel="noopener">Официальный сайт</a>` : ""}
        </div>
        ${photoCredit(museum)}
      </div>
    </article>`;
}

loadObjects()
  .then((objects) => {
    const museums = objects.filter(isMuseum);
    const itemsOf = (id) => objects.filter((o) => o.museum === id).sort((a, b) => (sortYear(a) || 0) - (sortYear(b) || 0));
    // Сначала музеи, где больше памятников на сайте
    museums.sort((a, b) => itemsOf(b.id).length - itemsOf(a.id).length || a.name.localeCompare(b.name, "ru"));
    list.innerHTML = museums.map((m) => museumCardHtml(m, itemsOf(m.id))).join("");
  })
  .catch((error) => {
    list.innerHTML = `<p>Не удалось загрузить данные.</p>`;
    console.error(error);
  });
