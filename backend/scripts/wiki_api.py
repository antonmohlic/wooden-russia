"""Запросы к Википедии, Wikidata и Wikimedia Commons с паузами и повторами (сервисы ограничивают частоту)."""
import json
import re
import time
import urllib.error
import urllib.parse
import urllib.request

UA = {"User-Agent": "wooden-russia-catalog/1.0 (https://github.com/antonmohlic/wooden-russia)"}
RU_WIKI = "https://ru.wikipedia.org/w/api.php"
WIKIDATA = "https://www.wikidata.org/w/api.php"
COMMONS = "https://commons.wikimedia.org/w/api.php"


def get(url, params, pause=0.4):
    params = {"format": "json", "formatversion": 2, **params}
    request = urllib.request.Request(url + "?" + urllib.parse.urlencode(params), headers=UA)
    for attempt in range(8):
        try:
            with urllib.request.urlopen(request, timeout=60) as response:
                time.sleep(pause)
                return json.load(response)
        except urllib.error.HTTPError as error:
            if error.code not in (429, 500, 502, 503, 504):
                raise
            time.sleep(int(error.headers.get("Retry-After") or 0) or 10 * (attempt + 1))
        except (urllib.error.URLError, TimeoutError):
            time.sleep(10 * (attempt + 1))
    raise RuntimeError(f"Сервис не отвечает: {url}")


def category_members(category, namespace=0):
    """Страницы (namespace=0) или подкатегории (namespace=14) категории Википедии."""
    titles, cont = [], {}
    while True:
        data = get(RU_WIKI, {"action": "query", "list": "categorymembers", "cmtitle": f"Категория:{category}",
                             "cmnamespace": namespace, "cmlimit": 500, **cont})
        titles += [m["title"] for m in data["query"]["categorymembers"]]
        if "continue" not in data:
            return titles
        cont = data["continue"]


def page_info(titles):
    """Координаты, фото, вступление, Wikidata и категории для пачки статей (до 20)."""
    data = get(RU_WIKI, {"action": "query", "titles": "|".join(titles), "redirects": 1,
                         "prop": "coordinates|pageimages|extracts|pageprops|info|categories",
                         "piprop": "name", "exintro": 1, "explaintext": 1, "exlimit": "max",
                         "ppprop": "wikibase_item", "inprop": "url", "cllimit": "max", "clshow": "!hidden"})
    return data["query"]["pages"]


def wikidata_claims(ids):
    """Свойства Wikidata для пачки элементов (до 50)."""
    data = get(WIKIDATA, {"action": "wbgetentities", "ids": "|".join(ids), "props": "claims"}, pause=1.0)
    return data.get("entities", {})


def commons_photo(file_name):
    """Автор, лицензия и ссылка на файл Commons, или None, если файла там нет."""
    data = get(COMMONS, {"action": "query", "titles": f"File:{file_name}", "prop": "imageinfo",
                         "iiprop": "extmetadata|url", "iiextmetadatafilter": "Artist|LicenseShortName"})
    page = data["query"]["pages"][0]
    if page.get("missing") or "imageinfo" not in page:
        return None
    info = page["imageinfo"][0]
    meta = info.get("extmetadata", {})
    strip = lambda html: re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", html or "")).strip()
    license_name = strip(meta.get("LicenseShortName", {}).get("value"))
    return {
        "photo": "https://commons.wikimedia.org/wiki/Special:FilePath/"
                 + urllib.parse.quote(file_name.replace(" ", "_")) + "?width=1200",
        "photo_author": strip(meta.get("Artist", {}).get("value")),
        "photo_license": "Общественное достояние" if re.search(r"public domain", license_name, re.I) else license_name,
        "photo_source": info["descriptionurl"],
    }
