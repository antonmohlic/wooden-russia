"""Создаёт или обновляет таблицы и правила доступа в PocketBase.

Запуск (PocketBase должен быть запущен):
    python backend/scripts/setup_schema.py

Скрипт можно запускать повторно: существующие таблицы обновляются, данные не трогаются.
"""
import sys

from pb import PocketBase

sys.stdout.reconfigure(encoding="utf-8")

# Кто считается админом сайта (не путать с администратором базы PocketBase)
IS_ADMIN = '@request.auth.role = "admin"'

# Письмо «Сброс пароля». {APP_URL}, {APP_NAME}, {TOKEN} подставляет PocketBase.
RESET_PASSWORD_TEMPLATE = {
    "subject": "Смена пароля — {APP_NAME}",
    "body": (
        "<p>Здравствуйте!</p>\n"
        "<p>Кто-то (надеемся, вы) попросил сменить пароль на сайте «{APP_NAME}».</p>\n"
        '<p><a class="btn" href="{APP_URL}/reset.html?token={TOKEN}" target="_blank" rel="noopener">Задать новый пароль</a></p>\n'
        "<p>Ссылка действует 30 минут и сработает один раз.</p>\n"
        "<p><i>Если вы не просили сменить пароль, просто не обращайте внимания на это письмо — пароль останется прежним.</i></p>\n"
    ),
}

OBJECT_TYPES = ["церковь", "часовня", "колокольня", "изба", "амбар", "мельница", "музей", "другое"]
STATUSES = ["сохранился", "аварийный", "утрачен"]


def text(name, required=False, max_length=0, pattern=""):
    return {"name": name, "type": "text", "required": required, "max": max_length, "pattern": pattern}


def number(name, required=False, only_int=False, min_value=None, max_value=None):
    return {"name": name, "type": "number", "required": required, "onlyInt": only_int, "min": min_value, "max": max_value}


def select(name, values, required=False):
    return {"name": name, "type": "select", "required": required, "values": values, "maxSelect": 1}


def autodates():
    return [
        {"name": "created", "type": "autodate", "onCreate": True, "onUpdate": False},
        {"name": "updated", "type": "autodate", "onCreate": True, "onUpdate": True},
    ]


def merge_fields(existing, wanted):
    """Сохраняет системные и уже существующие поля (с их id), добавляет недостающие."""
    by_name = {f["name"]: f for f in existing}
    result = list(existing)
    for field in wanted:
        if field["name"] in by_name:
            current = by_name[field["name"]]
            current.update({k: v for k, v in field.items() if k != "name"})
        else:
            result.append(field)
    return result


def upsert(pb, definition):
    existing = pb.get_collection(definition["name"])
    if existing:
        definition = {**definition, "fields": merge_fields(existing["fields"], definition["fields"])}
        pb.call("PATCH", f"/api/collections/{existing['id']}", definition)
        print("обновлена таблица", definition["name"])
    else:
        pb.call("POST", "/api/collections", definition)
        print("создана таблица", definition["name"])
    return pb.get_collection(definition["name"])


def main():
    pb = PocketBase()

    # --- Пользователи: добавляем роль и закрываем её от самостоятельного изменения ---
    users = upsert(pb, {
        "name": "users",
        "fields": [select("role", ["user", "admin"])],
        # Свой профиль видит сам пользователь, чужие — только админ (чтобы видеть авторов заявок)
        "listRule": f"id = @request.auth.id || {IS_ADMIN}",
        "viewRule": f"id = @request.auth.id || {IS_ADMIN}",
        # При регистрации и редактировании профиля роль задать нельзя — её выдаёт только администратор базы
        "createRule": "@request.body.role:isset = false",
        "updateRule": "id = @request.auth.id && @request.body.role:isset = false",
        "deleteRule": "id = @request.auth.id",
        "resetPasswordTemplate": RESET_PASSWORD_TEMPLATE,
        # Ссылка из письма действует 30 минут
        "passwordResetToken": {"duration": 1800},
    })

    # --- Объекты: читать могут все, менять — только админ сайта ---
    upsert(pb, {
        "name": "objects",
        "type": "base",
        "fields": [
            text("slug", required=True, max_length=100, pattern=r"^[a-z0-9-]+$"),
            text("name", required=True, max_length=300),
            select("type", OBJECT_TYPES, required=True),
            select("status", STATUSES),
            text("region", max_length=200),
            text("address", max_length=500),
            number("lat", required=True, min_value=-90, max_value=90),
            number("lon", required=True, min_value=-180, max_value=180),
            number("year", only_int=True, min_value=800, max_value=2100),
            text("year_text", max_length=50),
            number("century", only_int=True, min_value=8, max_value=21),
            number("founded", only_int=True, min_value=1800, max_value=2100),
            text("museum", max_length=100),
            text("origin", max_length=300),
            text("description", max_length=5000),
            text("wiki", max_length=500),
            text("website", max_length=500),
            text("photo", max_length=1000),
            text("photo_author", max_length=300),
            text("photo_license", max_length=100),
            text("photo_source", max_length=1000),
            *autodates(),
        ],
        "indexes": ["CREATE UNIQUE INDEX idx_objects_slug ON objects (slug)"],
        "listRule": "",
        "viewRule": "",
        "createRule": IS_ADMIN,
        "updateRule": IS_ADMIN,
        "deleteRule": IS_ADMIN,
    })

    # --- Заявки участников: новый объект, правка или удаление ---
    is_author = "author = @request.auth.id"
    upsert(pb, {
        "name": "submissions",
        "type": "base",
        "fields": [
            {"name": "author", "type": "relation", "required": True, "collectionId": users["id"],
             "maxSelect": 1, "cascadeDelete": True},
            select("kind", ["create", "update", "delete"], required=True),
            text("target", max_length=100),
            # Название объекта на момент подачи — чтобы заявку было понятно, даже если объект потом удалят
            text("target_name", max_length=300),
            {"name": "data", "type": "json", "maxSize": 200000},
            text("comment", max_length=2000),
            select("status", ["pending", "approved", "rejected"], required=True),
            text("admin_comment", max_length=2000),
            {"name": "reviewed_by", "type": "relation", "collectionId": users["id"], "maxSelect": 1},
            {"name": "reviewed_at", "type": "date"},
            *autodates(),
        ],
        # Участник видит только свои заявки, админ — все
        "listRule": f'@request.auth.id != "" && ({is_author} || {IS_ADMIN})',
        "viewRule": f'@request.auth.id != "" && ({is_author} || {IS_ADMIN})',
        # Подать заявку можно только от своего имени и только со статусом «на модерации»
        "createRule": (
            '@request.auth.id != "" && @request.body.author = @request.auth.id'
            ' && @request.body.status = "pending"'
            " && @request.body.admin_comment:isset = false"
            " && @request.body.reviewed_by:isset = false"
            " && @request.body.reviewed_at:isset = false"
        ),
        # Рассматривает заявки только админ
        "updateRule": IS_ADMIN,
        # Автор может отозвать заявку, пока она не рассмотрена
        "deleteRule": f'({is_author} && status = "pending") || {IS_ADMIN}',
    })

    print("Готово.")


if __name__ == "__main__":
    main()
