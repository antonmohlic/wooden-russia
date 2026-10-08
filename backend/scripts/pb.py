"""Общие функции для служебных скриптов: подключение к PocketBase под администратором базы.

Адрес и пароль берутся из backend/.env.local (локальная база) или из файла,
указанного в переменной PB_ENV, например PB_ENV=.env.production (сервер).
Эти файлы не попадают в Git.
"""
import json
import os
import pathlib
import urllib.error
import urllib.request

BACKEND_DIR = pathlib.Path(__file__).resolve().parent.parent
PROJECT_DIR = BACKEND_DIR.parent


def load_env():
    env = {}
    env_file = os.environ.get("PB_ENV", ".env.local")
    for line in (BACKEND_DIR / env_file).read_text(encoding="utf-8").splitlines():
        if "=" in line and not line.startswith("#"):
            key, value = line.split("=", 1)
            env[key.strip()] = value.strip()
    return env


class PocketBase:
    def __init__(self):
        self.env = load_env()
        self.url = self.env["PB_URL"].rstrip("/")
        self.token = None
        auth = self.call("POST", "/api/collections/_superusers/auth-with-password", {
            "identity": self.env["PB_SUPERUSER_EMAIL"],
            "password": self.env["PB_SUPERUSER_PASSWORD"],
        })
        self.token = auth["token"]

    def call(self, method, path, body=None):
        headers = {"Content-Type": "application/json"}
        if self.token:
            headers["Authorization"] = self.token
        data = json.dumps(body).encode("utf-8") if body is not None else None
        request = urllib.request.Request(self.url + path, method=method, data=data, headers=headers)
        try:
            with urllib.request.urlopen(request) as response:
                text = response.read().decode("utf-8")
                return json.loads(text) if text else None
        except urllib.error.HTTPError as error:
            details = error.read().decode("utf-8")
            raise RuntimeError(f"{method} {path} -> {error.code}: {details}") from None

    def get_collection(self, name):
        try:
            return self.call("GET", f"/api/collections/{name}")
        except RuntimeError as error:
            if "-> 404" in str(error):
                return None
            raise
