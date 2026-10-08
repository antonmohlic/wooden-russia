#!/usr/bin/env bash
# Скачивает свежую копию базы с сервера на этот компьютер и проверяет её.
# Запуск из Git Bash в папке проекта:   bash backend/backup.sh
#
# Копии лежат в backups/ (не попадают в Git), хранятся последние 30.
set -euo pipefail

cd "$(dirname "$0")/.."
ENV_FILE="backend/.env.production"
SSH_TARGET=$(grep '^SSH=' "$ENV_FILE" | cut -d= -f2)
SSH_KEY=$(grep '^SSH_KEY=' "$ENV_FILE" | cut -d= -f2 | sed "s#^~#$HOME#")
KEEP=30

mkdir -p backups
STAMP=$(date +%Y-%m-%d_%H-%M)
FILE="backups/wooden-russia_${STAMP}.db.gz"

echo "Делаю копию базы на сервере…"
# sqlite3 .backup — согласованная копия, даже пока сайт работает и в базу пишут
ssh -i "$SSH_KEY" -o BatchMode=yes "$SSH_TARGET" '
  set -e
  TMP=$(mktemp /tmp/wr-backup-XXXXXX.db)
  sqlite3 /opt/wooden-russia/pb_data/data.db ".backup $TMP"
  gzip -c "$TMP"
  rm -f "$TMP"
' > "$FILE"

echo "Проверяю копию…"
# Ищем настоящий Python (на Windows «python» может оказаться заглушкой Microsoft Store)
PY=""
for candidate in python3 python py /c/python3104/python.exe; do
  if command -v "$candidate" >/dev/null 2>&1 && "$candidate" -c "import sqlite3" >/dev/null 2>&1; then
    PY="$candidate"; break
  fi
done
[ -n "$PY" ] || { echo "Не найден Python — копия скачана, но не проверена: $FILE"; exit 1; }
PYTHONIOENCODING=utf-8 "$PY" - "$FILE" <<'EOF'
import gzip, shutil, sqlite3, sys, tempfile, os
path = sys.argv[1]
with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp:
    with gzip.open(path, "rb") as src:
        shutil.copyfileobj(src, tmp)
db = sqlite3.connect(tmp.name)
check = db.execute("pragma integrity_check").fetchone()[0]
counts = {t: db.execute(f"select count(*) from {t}").fetchone()[0] for t in ("objects", "users", "submissions")}
db.close()
os.unlink(tmp.name)
if check != "ok":
    print("ОШИБКА: копия повреждена:", check)
    sys.exit(1)
print(f"Копия цела: объектов {counts['objects']}, пользователей {counts['users']}, заявок {counts['submissions']}")
EOF

echo "Сохранено: $FILE ($(du -h "$FILE" | cut -f1))"

# Удаляем самые старые копии, оставляем последние $KEEP
ls -1t backups/wooden-russia_*.db.gz | tail -n +$((KEEP + 1)) | xargs -r rm -f
echo "Копий на этом компьютере: $(ls -1 backups/wooden-russia_*.db.gz | wc -l)"
