// Автозаполнение по ссылке на статью Википедии и сведения о фото с Wikimedia Commons.
// Запросы идут прямо из браузера; параметр origin=* разрешает их с любого сайта.

// «https://ru.wikipedia.org/wiki/Пияла#История» → { lang: "ru", title: "Пияла" }
function parseWikiUrl(url) {
  try {
    const parsed = new URL(url.trim());
    const match = parsed.hostname.match(/^([a-z-]+)\.(?:m\.)?wikipedia\.org$/);
    if (!match || !parsed.pathname.startsWith("/wiki/")) return null;
    const title = decodeURIComponent(parsed.pathname.slice(6)).replace(/_/g, " ");
    return title ? { lang: match[1], title } : null;
  } catch {
    return null;
  }
}

async function wikiApi(host, params) {
  const query = new URLSearchParams({ format: "json", formatversion: "2", origin: "*", ...params });
  const response = await fetch(`https://${host}/w/api.php?${query}`);
  if (!response.ok) throw new Error("Википедия сейчас не отвечает. Попробуйте позже.");
  return response.json();
}

// Ссылка на файл Commons, пригодная для показа на сайте
function commonsFileUrl(fileName) {
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(fileName.replace(/ /g, "_"))}?width=1200`;
}

// Имя файла из любой ссылки на Commons: страница файла или Special:FilePath
function commonsFileName(url) {
  try {
    const parsed = new URL(url.trim());
    if (!/wikimedia\.org$/.test(parsed.hostname)) return null;
    const path = decodeURIComponent(parsed.pathname);
    const match = path.match(/\/wiki\/(?:File|Файл):(.+)$/) || path.match(/\/Special:FilePath\/(.+)$/);
    return match ? match[1].replace(/_/g, " ") : null;
  } catch {
    return null;
  }
}

function stripHtml(html) {
  const div = document.createElement("div");
  div.innerHTML = html || "";
  return div.textContent.replace(/\s+/g, " ").trim();
}

// Автор, лицензия и страница файла на Commons
async function fetchPhotoInfo(fileName) {
  const data = await wikiApi("commons.wikimedia.org", {
    action: "query",
    titles: `File:${fileName}`,
    prop: "imageinfo",
    iiprop: "extmetadata|url",
    iiextmetadatafilter: "Artist|LicenseShortName",
  });
  const page = data.query.pages[0];
  if (!page || page.missing || !page.imageinfo) throw new Error("Такого файла на Wikimedia Commons нет.");
  const info = page.imageinfo[0];
  const meta = info.extmetadata || {};
  const license = stripHtml(meta.LicenseShortName?.value);
  return {
    photo: commonsFileUrl(fileName),
    photo_author: stripHtml(meta.Artist?.value),
    photo_license: /public domain/i.test(license) ? "Общественное достояние" : license,
    photo_source: info.descriptionurl,
  };
}

// Первые предложения вступления — заготовка для описания
function firstSentences(text, maxLength = 600) {
  const clean = (text || "").replace(/\s+/g, " ").trim();
  if (clean.length <= maxLength) return clean;
  const cut = clean.slice(0, maxLength);
  const lastDot = cut.lastIndexOf(". ");
  return lastDot > 100 ? cut.slice(0, lastDot + 1) : `${cut}…`;
}

// Главная функция: всё, что удалось узнать по ссылке на статью
async function fetchFromWikipedia(url) {
  const parsed = parseWikiUrl(url);
  if (!parsed) throw new Error("Это не похоже на ссылку на статью Википедии.");

  const host = `${parsed.lang}.wikipedia.org`;
  const data = await wikiApi(host, {
    action: "query",
    titles: parsed.title,
    redirects: "1",
    prop: "coordinates|pageimages|extracts|info",
    inprop: "url",
    piprop: "name",
    exintro: "1",
    explaintext: "1",
  });
  const page = data.query.pages[0];
  if (!page || page.missing) throw new Error("Статья не найдена. Проверьте ссылку.");

  const result = {
    // Уточнение в скобках оставляем: «Церковь Петра и Павла (Вирма)» понятнее, чем просто «Церковь Петра и Павла»
    name: page.title,
    wiki: page.fullurl ? decodeURI(page.fullurl) : url.trim(),
    description: firstSentences(page.extract),
  };
  const coords = page.coordinates && page.coordinates[0];
  if (coords) {
    result.lat = Number(coords.lat.toFixed(6));
    result.lon = Number(coords.lon.toFixed(6));
  }
  if (page.pageimage) {
    try {
      Object.assign(result, await fetchPhotoInfo(page.pageimage));
    } catch {
      // Фото не обязательно: если сведения о нём не получены, заполним остальное
    }
  }
  return result;
}
