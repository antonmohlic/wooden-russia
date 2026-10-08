"""Отправляет подготовленные объекты заявками «Новый объект» от служебного аккаунта.

Запуск:  PB_ENV=.env.production python backend/scripts/submit_proposals.py <файл.json>

Файл — список объектов с полями таблицы objects (name, type, lat, lon, …) и полем comment для модератора.
Объекты не попадают на сайт сами: их нужно принять в «Модерации». Уже предложенные (то же название
в заявках бота на модерации) повторно не отправляются.
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
    already = {s["data"].get("name") for s in pending}

    sent = 0
    for item in proposals:
        data = {k: v for k, v in item.items() if k in ALLOWED and v not in (None, "")}
        if data["name"] in already:
            print("уже в очереди:", data["name"])
            continue
        bot.call("POST", "/api/collections/submissions/records", {
            "author": bot_id, "kind": "create", "target": "", "data": data,
            "comment": item.get("comment", ""), "status": "pending",
        })
        sent += 1
        print("отправлено:", data["name"])
        time.sleep(0.5)
    print(f"Готово: отправлено заявок {sent} из {len(proposals)}")


if __name__ == "__main__":
    main(sys.argv[1])
