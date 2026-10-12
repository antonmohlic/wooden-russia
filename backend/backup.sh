#!/usr/bin/env bash
# Скачивает свежую копию базы и загруженных фото с сервера на этот компьютер и проверяет её.
# Запуск из Git Bash в папке проекта:   bash backend/backup.sh
#
# Вся работа — в backend/scripts/backup.py (его же запускает Планировщик Windows).
# Копии лежат в backups/ (не попадают в Git), хранятся последние 30; журнал — backups/backup.log.
set -euo pipefail
cd "$(dirname "$0")/.."
for candidate in /c/python3104/python.exe python3 python py; do
  if command -v "$candidate" >/dev/null 2>&1 && "$candidate" -c "import sqlite3" >/dev/null 2>&1; then
    exec "$candidate" backend/scripts/backup.py
  fi
done
echo "Не найден Python"; exit 1
