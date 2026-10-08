"""Выгружает объекты из базы в data/objects.json — резервную копию, которой сайт пользуется без сервера.

Запуск:
    python backend/scripts/export_objects.py                       # из локальной базы
    PB_ENV=.env.production python backend/scripts/export_objects.py # с сервера
"""
import json
import sys

from pb import PROJECT_DIR, PocketBase

sys.stdout.reconfigure(encoding="utf-8")

# Поля в том порядке, в каком их удобно читать в файле
FIELDS = [
    "name", "museum", "origin", "region", "address", "lat", "lon", "year", "year_text", "century",
    "founded", "status", "type", "description", "wiki", "website",
    "photo", "photo_author", "photo_license", "photo_source",
]


def main():
    pb = PocketBase()
    records = []
    page = 1
    while True:
        result = pb.call("GET", f"/api/collections/objects/records?perPage=500&page={page}&sort=created")
        records += result["items"]
        if page >= result["totalPages"]:
            break
        page += 1

    objects = []
    for record in records:
        obj = {"id": record["slug"]}
        for key in FIELDS:
            value = record.get(key)
            # Пустые значения не пишем: база отдаёт их как "" или 0
            if value in ("", None, 0) and key not in ("lat", "lon"):
                continue
            obj[key] = value
        objects.append(obj)

    path = PROJECT_DIR / "data" / "objects.json"
    path.write_text(json.dumps(objects, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Выгружено объектов: {len(objects)} → {path.relative_to(PROJECT_DIR)}")


if __name__ == "__main__":
    main()
