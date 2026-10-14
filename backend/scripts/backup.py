"""Скачивает свежую копию базы и загруженных фото с сервера на этот компьютер и проверяет её.

Запуск:  python backend/scripts/backup.py
Копии лежат в backups/ (не попадают в Git), хранятся последние 30. Журнал — backups/backup.log.

Работает без оболочки Git Bash (Python вызывает только ssh.exe), поэтому годится для Планировщика:
Git Bash при запуске из планировщика падает при создании процессов.
"""
import datetime
import gzip
import os
import pathlib
import shutil
import sqlite3
import subprocess
import sys
import tempfile

from pb import BACKEND_DIR, PROJECT_DIR

KEEP = 30
BACKUPS = PROJECT_DIR / "backups"
LOG = BACKUPS / "backup.log"


def log(message):
    line = f"{datetime.datetime.now():%Y-%m-%d %H:%M} {message}"
    print(line, flush=True)
    with LOG.open("a", encoding="utf-8") as f:
        f.write(line + "\n")


def env():
    values = {}
    for line in (BACKEND_DIR / ".env.production").read_text(encoding="utf-8").splitlines():
        if "=" in line and not line.startswith("#"):
            key, value = line.split("=", 1)
            values[key.strip()] = value.strip()
    return values


def ssh(settings, command, out_path):
    """Выполняет команду на сервере и пишет её вывод в файл."""
    key = os.path.expanduser(settings["SSH_KEY"])
    known_hosts = os.path.expanduser("~/.ssh/known_hosts")
    # ssh из Git для Windows: встроенный в Windows ssh требует особых прав на файл ключа.
    # Путь к known_hosts указываем явно: этот ssh неверно читает кириллицу в пути домашней папки.
    ssh_exe = r"C:\Program Files\Git\usr\bin\ssh.exe"
    if not os.path.exists(ssh_exe):
        ssh_exe = "ssh"
    with open(out_path, "wb") as out:
        result = subprocess.run(
            [ssh_exe, "-i", key, "-o", f"UserKnownHostsFile={known_hosts}", "-o", "BatchMode=yes",
             "-o", "ConnectTimeout=30", settings["SSH"], command],
            stdout=out, stderr=subprocess.PIPE, timeout=600,
            # Без окна консоли: из Планировщика (pythonw) ssh.exe иначе открывает своё окно,
            # и если его закрыть, копия обрывается (код 0xC000013A).
            creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
        )
    if result.returncode != 0:
        raise RuntimeError(result.stderr.decode("utf-8", "replace").strip() or f"ssh завершился с кодом {result.returncode}")


def verify(db_gz):
    """Распаковывает копию во временный файл и проверяет целостность базы."""
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp:
        with gzip.open(db_gz, "rb") as src:
            shutil.copyfileobj(src, tmp)
    try:
        db = sqlite3.connect(tmp.name)
        check = db.execute("pragma integrity_check").fetchone()[0]
        counts = {t: db.execute(f"select count(*) from {t}").fetchone()[0] for t in ("objects", "users", "submissions")}
        db.close()
    finally:
        os.unlink(tmp.name)
    if check != "ok":
        raise RuntimeError(f"копия повреждена: {check}")
    return counts


def prune(pattern):
    files = sorted(BACKUPS.glob(pattern), key=lambda p: p.stat().st_mtime, reverse=True)
    for old in files[KEEP:]:
        old.unlink()


def main():
    # Из Планировщика скрипт идёт через pythonw — без консоли, вывод только в журнал
    if sys.stdout:
        sys.stdout.reconfigure(encoding="utf-8")
    BACKUPS.mkdir(exist_ok=True)
    settings = env()
    stamp = f"{datetime.datetime.now():%Y-%m-%d_%H-%M}"
    db_file = BACKUPS / f"wooden-russia_{stamp}.db.gz"
    files_file = BACKUPS / f"wooden-russia_{stamp}_files.tar.gz"

    try:
        # sqlite3 .backup — согласованная копия, даже пока сайт работает и в базу пишут
        ssh(settings, 'set -e; TMP=$(mktemp /tmp/wr-backup-XXXXXX.db); '
                      'sqlite3 /opt/wooden-russia/pb_data/data.db ".backup $TMP"; gzip -c "$TMP"; rm -f "$TMP"', db_file)
        counts = verify(db_file)
        # Загруженные файлы (фото объектов, заявок, наблюдений) хранятся отдельно от базы
        ssh(settings, "tar -czf - -C /opt/wooden-russia/pb_data storage 2>/dev/null || true", files_file)
        if files_file.stat().st_size == 0:
            files_file.unlink()
            files_note = "файлов нет"
        else:
            files_note = f"фото и файлы {files_file.stat().st_size // 1024} КБ"
    except Exception as error:
        # Неудачную копию не оставляем: пустой файл легко принять за настоящую копию
        for path in (db_file, files_file):
            if path.exists():
                path.unlink()
        log(f"ОШИБКА: {error}")
        sys.exit(1)

    prune("wooden-russia_*.db.gz")
    prune("wooden-russia_*_files.tar.gz")
    log(f"Копия цела: объектов {counts['objects']}, пользователей {counts['users']}, заявок {counts['submissions']}; "
        f"база {db_file.stat().st_size // 1024} КБ, {files_note} → {db_file.name}")


if __name__ == "__main__":
    main()
