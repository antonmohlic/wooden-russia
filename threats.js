// Страница «Под угрозой»: аварийные объекты и объекты, о плохом состоянии которых недавно сообщили посетители.
// Те же правила использует ежемесячная подборка в «Новостях» (backend/pb_hooks/digest.js).

const threatsList = document.getElementById("threats");
const observationsBox = document.getElementById("threat-observations");
const lostBox = document.getElementById("threat-lost");

// Тревожное состояние по наблюдению посетителя
const ALARM_CONDITIONS = ["плохое", "аварийное", "руины"];
// Наблюдения старше этого срока не считаем: состояние могло измениться
const OBSERVATION_YEARS = 3;
// Сколько последних тревожных наблюдений показывать лентой
const LATEST_OBSERVATIONS = 10;

function yearsAgo(years) {
  const date = new Date();
  date.setFullYear(date.getFullYear() - years);
  return date.toISOString().replace("T", " ");
}

// Насколько серьёзна угроза: 0 — аварийный или руины, 1 — плохое состояние
function severity(item) {
  if (item.obj.status === "аварийный") return 0;
  return item.observation && item.observation.condition !== "плохое" ? 0 : 1;
}

function threatCardHtml({ obj, observation }) {
  const meta = [obj.region, yearLine(obj)].filter(Boolean).join(" · ");
  const reasons = [];
  if (obj.status === "аварийный") reasons.push(`<p>${statusBadge(obj.status)} Статус объекта в каталоге.</p>`);
  if (observation) {
    const text = observation.text ? ` «${escapeHtml(observation.text.length > 300 ? observation.text.slice(0, 299) + "…" : observation.text)}»` : "";
    reasons.push(`
      <p>${conditionBadge(observation.condition)} Последнее наблюдение — ${escapeHtml(formatVisitDate(observation.visited_on))},
         ${escapeHtml(observation.author_name || "участник")}.${text}</p>`);
  }
  return `
    <article class="museum-card">
      <a class="museum-photo" href="${objectUrl(obj)}">
        ${obj.photo ? `<img src="${escapeHtml(photoSrc(obj, 700))}" alt="${escapeHtml(obj.name)}" loading="lazy">` : ""}
      </a>
      <div class="museum-body">
        <h2><a href="${objectUrl(obj)}">${escapeHtml(obj.name)}</a></h2>
        <p class="museum-meta">${escapeHtml(meta)}</p>
        ${reasons.join("")}
        <div class="card-links">
          <a href="${objectUrl(obj)}#observations">Подробнее и наблюдения</a>
          <a href="${mapUrl(obj)}">На карте</a>
        </div>
        ${photoCredit(obj)}
      </div>
    </article>`;
}

// Последние тревожные наблюдения со ссылкой на объект
function latestObservationsHtml(observations, objectsByRecord) {
  return `
    <h2>Последние тревожные наблюдения</h2>
    <div class="obs-list">${observations
      .map((obs) => {
        const obj = objectsByRecord.get(obs.object);
        return obj ? `<p class="obs-object"><a href="${objectUrl(obj)}">${escapeHtml(obj.name)}</a></p>${observationHtml(obs)}` : "";
      })
      .join("")}</div>`;
}

async function renderThreats() {
  const objects = await loadObjects();
  const objectsByRecord = new Map(objects.map((o) => [o.recordId, o]));

  // Наблюдения есть только при работающем сервере; без него показываем аварийные объекты
  let observations = [];
  if (await checkServer()) {
    observations = await fetchObservations(`status = "approved" && visited_on >= "${yearsAgo(OBSERVATION_YEARS)}"`);
  }

  // Последнее свежее наблюдение у каждого объекта (список уже отсортирован от новых к старым)
  const latestByObject = new Map();
  observations.forEach((obs) => {
    if (!latestByObject.has(obs.object)) latestByObject.set(obs.object, obs);
  });

  const items = [];
  objects.forEach((obj) => {
    const latest = latestByObject.get(obj.recordId);
    const observation = latest && ALARM_CONDITIONS.includes(latest.condition) ? latest : null;
    if (obj.status === "аварийный" || (observation && obj.status !== "утрачен")) items.push({ obj, observation });
  });
  items.sort(
    (a, b) =>
      severity(a) - severity(b) ||
      (b.observation?.visited_on || "").localeCompare(a.observation?.visited_on || "") ||
      a.obj.name.localeCompare(b.obj.name, "ru")
  );

  threatsList.innerHTML = items.length
    ? `<p class="results-count">Под угрозой: ${items.length}</p>${items.map(threatCardHtml).join("")}`
    : `<p class="form-hint">Сейчас в каталоге нет объектов в аварийном состоянии и тревожных наблюдений.</p>`;

  const alarming = observations.filter((obs) => ALARM_CONDITIONS.includes(obs.condition)).slice(0, LATEST_OBSERVATIONS);
  if (alarming.length) {
    observationsBox.innerHTML = latestObservationsHtml(alarming, objectsByRecord);
    observationsBox.hidden = false;
  }

  // Утраченные за последний год — чтобы помнить, чего уже не спасли
  const yearAgo = yearsAgo(1);
  const lost = objects.filter((o) => o.status === "утрачен" && o.status_changed_at && o.status_changed_at >= yearAgo);
  if (lost.length) {
    lostBox.innerHTML = `
      <h2>Утрачены за последний год</h2>
      <div class="mini-grid">${lost.map((o) => miniCardHtml(o, [o.region, dateLabel(o)].filter(Boolean).join(" · "))).join("")}</div>`;
    lostBox.hidden = false;
  }
}

renderThreats().catch((error) => {
  threatsList.innerHTML = `<p>Не удалось загрузить данные.</p>`;
  console.error(error);
});
