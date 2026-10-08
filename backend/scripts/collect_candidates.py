"""Собирает кандидатов в каталог из категорий Википедии: деревянные храмы с координатами и свободными фото.

Запуск:  python backend/scripts/collect_candidates.py <файл-результата.json>

Для каждого кандидата: название, координаты, вступление статьи, год из Wikidata, фото с Commons
(только если файл на Commons и известен автор), категории. Описание своими словами пишется вручную.
"""
import json
import re
import sys

from pb import PocketBase
from wiki_api import category_members, commons_photo, page_info, wikidata_claims

sys.stdout.reconfigure(encoding="utf-8")

ROOT_CATEGORIES = [
    "Деревянные храмы России",
    "Храмы Архангельской области",
    "Храмы Мурманской области",
    "Русское деревянное зодчество",
    "Шатровые храмы",
]
MAX_DEPTH = 2

# Регион по словам в категориях и тексте статьи
REGIONS = [
    ("Архангельск", "Архангельская область"), ("Карели", "Республика Карелия"),
    ("Вологод", "Вологодская область"), ("Ленинград", "Ленинградская область"),
    ("Мурман", "Мурманская область"), ("Коми", "Республика Коми"), ("Новгород", "Новгородская область"),
    ("Костром", "Костромская область"), ("Пермск", "Пермский край"), ("Кировск", "Кировская область"),
    ("Санкт-Петербург", "Санкт-Петербург"), ("Нижегородск", "Нижегородская область"),
]


def walk(category, depth, seen_categories, titles):
    if category in seen_categories or depth > MAX_DEPTH:
        return
    seen_categories.add(category)
    titles.update(category_members(category, 0))
    for sub in category_members(category, 14):
        walk(sub.split(":", 1)[1], depth + 1, seen_categories, titles)


def detect_type(title):
    t = title.lower()
    if t.startswith(("церковь", "храм")) or "церковь" in t.split(" (")[0]:
        return "церковь"
    if "часовня" in t:
        return "часовня"
    if "колокольня" in t:
        return "колокольня"
    return None


def detect_region(texts):
    joined = " ".join(texts)
    for key, region in REGIONS:
        if key in joined:
            return region
    return ""


def year_from_wikidata(claims):
    """Год постройки из P571 (дата основания/создания), если указан с точностью до года."""
    for claim in claims.get("P571", []):
        value = claim.get("mainsnak", {}).get("datavalue", {}).get("value", {})
        match = re.match(r"\+(\d{3,4})-", value.get("time", ""))
        if match and value.get("precision", 0) >= 9:
            return int(match.group(1))
    return None


def main(out_path):
    titles, seen = set(), set()
    for root in ROOT_CATEGORIES:
        walk(root, 0, seen, titles)
    print(f"Статей в категориях: {len(titles)} (обойдено категорий: {len(seen)})")

    existing = PocketBase().call("GET", "/api/collections/objects/records?perPage=500&fields=name,wiki")["items"]
    existing_wiki = {o["wiki"].split("/wiki/")[-1].replace("_", " ") for o in existing if o["wiki"]}

    pages = []
    batch = sorted(titles)
    for i in range(0, len(batch), 20):
        pages += page_info(batch[i:i + 20])

    candidates = []
    for p in pages:
        if p.get("missing") or not p.get("coordinates"):
            continue
        intro = p.get("extract", "")
        kind = detect_type(p["title"])
        if not kind or "деревян" not in intro.lower():
            continue
        if p["title"] in existing_wiki:
            continue
        cats = [c["title"].split(":", 1)[1] for c in p.get("categories", [])]
        c = p["coordinates"][0]
        candidates.append({
            "title": p["title"],
            "type": kind,
            "lat": round(c["lat"], 6),
            "lon": round(c["lon"], 6),
            "wiki": p["fullurl"],
            "wikidata": p.get("pageprops", {}).get("wikibase_item"),
            "pageimage": p.get("pageimage"),
            "region_guess": detect_region(cats + [intro]),
            "categories": cats,
            "intro": intro,
        })
    print(f"Деревянных храмов с координатами (новых для сайта): {len(candidates)}")

    # Год из Wikidata
    ids = [c["wikidata"] for c in candidates if c["wikidata"]]
    claims = {}
    for i in range(0, len(ids), 50):
        claims.update(wikidata_claims(ids[i:i + 50]))
    for c in candidates:
        c["year_wikidata"] = year_from_wikidata(claims.get(c["wikidata"], {}).get("claims", {}))

    # Фото: только файлы с Commons с известным автором и лицензией
    for c in candidates:
        c["photo"] = commons_photo(c["pageimage"]) if c["pageimage"] else None
        if c["photo"] and not (c["photo"]["photo_author"] and c["photo"]["photo_license"]):
            c["photo"] = None

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(candidates, f, ensure_ascii=False, indent=1)
    with_photo = sum(1 for c in candidates if c["photo"])
    print(f"Сохранено: {len(candidates)}, из них со свободным фото: {with_photo}")


if __name__ == "__main__":
    main(sys.argv[1])
