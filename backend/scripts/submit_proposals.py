"""Отправляет подготовленные объекты заявками от служебного аккаунта: «Новый объект» или «Правка».

Запуск:  PB_ENV=.env.production python backend/scripts/submit_proposals.py <файл.json>

Файл — список записей с полями таблицы objects (name, type, lat, lon, …) и полем comment для модератора.
- Новый объект: все поля; slug — желаемый адрес страницы (модератор увидит его и может изменить).
- Правка: target — slug существующего объекта, и только изменяемые поля.
Объекты не попадают на сайт сами: их нужно принять в «Модерации». Уже предложенные (то же название
или та же правка объекта в заявках бота на модерации) повторно не отправляются.
"""
import json
import sys
import time
import urllib.parse

from pb import PocketBase

sys.stdout.reconfigure(encoding="utf-8")

ALLOWED = {
    "name", "type", "status", "museum", "origin", "region", "address", "lat", "lon", "year", "year_text",
    "century", "founded", "description", "wiki", "website", "photo", "photo_author", "photo_license", "photo_source",
}


def main(path):
    proposals = json.loads(open(path, encoding="utf-8").read())
    admin = PocketBase()
    bot_email, bot_password = admin.env["BOT_EMAIL"], admin.env["BOT_PASSWORD"]

    # Входим как служебный аккаунт — заявки подаются по тем же правилам, что у людей
    bot = PocketBase.__new__(PocketBase)
    bot.env, bot.url, bot.token = admin.env, admin.url, None
    auth = bot.call("POST", "/api/collections/users/auth-with-password", {"identity": bot_email, "password": bot_password})
    bot.token, bot_id = auth["token"], auth["record"]["id"]

    pending = bot.call("GET", "/api/collections/submissions/records?perPage=500&filter="
                       + urllib.parse.quote(f'author = "{bot_id}" && status = "pending"'))["items"]
    already = {s["data"].get("name") for s in pending if s["kind"] == "create"}
    already_updates = {s["target"] for s in pending if s["kind"] == "update"}

    sent = 0
    for item in proposals:
        target = item.get("target", "")
        if target:
            # Правка: пустое значение тоже допустимо — так поле очищается
            data = {k: v for k, v in item.items() if k in ALLOWED}
            if target in already_updates:
                print("правка уже в очереди:", target)
                continue
            current = bot.call("GET", "/api/collections/objects/records?perPage=1&filter="
                               + urllib.parse.quote(f'slug = "{target}"'))["items"]
            if not current:
                print("нет объекта:", target)
                continue
            submission = {"kind": "update", "target": target, "target_name": current[0]["name"]}
            label = f"правка «{current[0]['name']}»"
        else:
            data = {k: v for k, v in item.items() if (k in ALLOWED or k == "slug") and v not in (None, "")}
            if data["name"] in already:
                print("уже в очереди:", data["name"])
                continue
            submission = {"kind": "create", "target": ""}
            label = data["name"]
        bot.call("POST", "/api/collections/submissions/records", {
            "author": bot_id, **submission, "data": data,
            "comment": item.get("comment", ""), "status": "pending",
        })
        sent += 1
        print("отправлено:", label)
        time.sleep(0.5)
    print(f"Готово: отправлено заявок {sent} из {len(proposals)}")


if __name__ == "__main__":
    main(sys.argv[1])
