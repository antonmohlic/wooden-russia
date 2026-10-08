"""Настройки PocketBase для сервера: название, адрес, ограничение частоты запросов, резервные копии, логи.

Запуск для сервера:
    PB_ENV=.env.production python backend/scripts/setup_settings.py
"""
import sys

from pb import PocketBase

sys.stdout.reconfigure(encoding="utf-8")


def main():
    pb = PocketBase()
    pb.call("PATCH", "/api/settings", {
        "meta": {
            "appName": "Открытый каталог деревянного зодчества России",
            "appURL": pb.url,
            # Имя отправителя писем; адрес отправителя задаётся вместе с почтовым сервером (SMTP)
            "senderName": "Открытый каталог деревянного зодчества",
        },
        # Ограничение частоты запросов: защита от перебора паролей и спама заявками.
        # Числа — сколько запросов разрешено с одного IP за duration секунд.
        "rateLimits": {
            "enabled": True,
            "rules": [
                {"label": "*:auth", "maxRequests": 5, "duration": 60},
                {"label": "/api/collections/users/records", "maxRequests": 10, "duration": 3600, "audience": "@guest"},
                {"label": "/api/collections/submissions/records", "maxRequests": 30, "duration": 3600, "audience": "@auth"},
                {"label": "/api/", "maxRequests": 300, "duration": 10},
            ],
        },
        # Резервная копия базы каждый день в 03:30, храним последние 14
        "backups": {"cron": "30 3 * * *", "cronMaxKeep": 14},
        # Журнал запросов храним неделю, чтобы не занимать диск
        "logs": {"maxDays": 7},
    })
    settings = pb.call("GET", "/api/settings")
    print("название:", settings["meta"]["appName"])
    print("адрес:", settings["meta"]["appURL"])
    print("ограничение запросов:", "включено" if settings["rateLimits"]["enabled"] else "выключено",
          f"({len(settings['rateLimits']['rules'])} правила)")
    print("резервные копии:", settings["backups"]["cron"], "| хранить:", settings["backups"]["cronMaxKeep"])
    print("логи хранятся дней:", settings["logs"]["maxDays"])


if __name__ == "__main__":
    main()
