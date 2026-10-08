"""Переносит объекты из data/objects.json в таблицу objects в PocketBase.

Запуск (PocketBase должен быть запущен, таблицы созданы):
    python backend/scripts/import_objects.py

Объект с таким же slug обновляется, новые добавляются.
"""
import json
import sys
import urllib.parse

from pb import PROJECT_DIR, PocketBase

sys.stdout.reconfigure(encoding="utf-8")


def main():
    pb = PocketBase()
    objects = json.loads((PROJECT_DIR / "data" / "objects.json").read_text(encoding="utf-8"))

    for obj in objects:
        record = {key: value for key, value in obj.items() if key != "id"}
        record["slug"] = obj["id"]

        query = urllib.parse.quote(f'slug = "{obj["id"]}"')
        found = pb.call("GET", f"/api/collections/objects/records?filter={query}&perPage=1")["items"]
        if found:
            pb.call("PATCH", f"/api/collections/objects/records/{found[0]['id']}", record)
            print("обновлён ", obj["id"])
        else:
            pb.call("POST", "/api/collections/objects/records", record)
            print("добавлен ", obj["id"])

    print(f"Готово: {len(objects)} объектов.")


if __name__ == "__main__":
    main()
