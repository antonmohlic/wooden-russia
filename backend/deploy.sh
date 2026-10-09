#!/usr/bin/env bash
# Выкладка сайта на сервер: файлы сайта и миграции базы.
# Запуск из Git Bash в папке проекта:   bash backend/deploy.sh
#
# Берёт только то, что закоммичено в Git (незакоммиченные правки не уедут),
# база данных на сервере не перезаписывается.
set -euo pipefail

cd "$(dirname "$0")/.."
ENV_FILE="backend/.env.production"
SSH_TARGET=$(grep '^SSH=' "$ENV_FILE" | cut -d= -f2)
SSH_KEY=$(grep '^SSH_KEY=' "$ENV_FILE" | cut -d= -f2 | sed "s#^~#$HOME#")
# Путь к known_hosts указываем явно: новые версии ssh в Git для Windows неверно читают кириллицу в пути домашней папки
SSH_CMD=(ssh -i "$SSH_KEY" -o UserKnownHostsFile="$HOME/.ssh/known_hosts" -o BatchMode=yes "$SSH_TARGET")

if [ -n "$(git status --porcelain)" ]; then
  echo "Внимание: есть незакоммиченные изменения — на сервер уедет последняя закоммиченная версия."
fi

VERSION=$(git rev-parse --short HEAD)
echo "Выкладываю версию $VERSION на $SSH_TARGET…"

# Архив из Git: сайт (всё, кроме backend/) и миграции
git archive --format=tar HEAD -- . ':!backend' ':!.gitignore' ':!README.md' ':!.github' > /tmp/wr_site.tar
git archive --format=tar HEAD -- backend/pb_migrations backend/pb_hooks > /tmp/wr_migrations.tar

{ cat /tmp/wr_site.tar; } | "${SSH_CMD[@]}" "set -e
  rm -rf /opt/wooden-russia/pb_public.new && mkdir -p /opt/wooden-russia/pb_public.new
  tar -xf - -C /opt/wooden-russia/pb_public.new --no-same-owner
  echo '$VERSION' > /opt/wooden-russia/pb_public.new/version.txt
  # Номер версии в ссылках на скрипты и стили: браузеры сразу берут новые файлы, а не старые из кэша
  sed -i -E 's#(src=\"[a-z-]+\\.js)\"#\\1?v=$VERSION\"#g; s#(href=\"style\\.css)\"#\\1?v=$VERSION\"#g' /opt/wooden-russia/pb_public.new/*.html
  chmod -R a+rX /opt/wooden-russia/pb_public.new
  rm -rf /opt/wooden-russia/pb_public.old
  mv /opt/wooden-russia/pb_public /opt/wooden-russia/pb_public.old
  mv /opt/wooden-russia/pb_public.new /opt/wooden-russia/pb_public
  echo 'файлы сайта обновлены'"

cat /tmp/wr_migrations.tar | "${SSH_CMD[@]}" "set -e
  cd /tmp && rm -rf wr_mig && mkdir wr_mig && tar -xf - -C wr_mig --no-same-owner
  mkdir -p /opt/wooden-russia/pb_hooks
  changed=no
  if ! diff -rq wr_mig/backend/pb_migrations /opt/wooden-russia/pb_migrations >/dev/null; then
    cp wr_mig/backend/pb_migrations/* /opt/wooden-russia/pb_migrations/
    changed=yes
  fi
  if ! diff -rq wr_mig/backend/pb_hooks /opt/wooden-russia/pb_hooks >/dev/null; then
    rm -f /opt/wooden-russia/pb_hooks/*.pb.js
    cp wr_mig/backend/pb_hooks/*.pb.js /opt/wooden-russia/pb_hooks/
    changed=yes
  fi
  chmod -R a+rX /opt/wooden-russia/pb_migrations /opt/wooden-russia/pb_hooks
  if [ \$changed = yes ]; then
    systemctl restart pocketbase
    echo 'миграции и хуки обновлены, сервер перезапущен'
  else
    echo 'миграции и хуки без изменений'
  fi
  rm -rf wr_mig"

rm -f /tmp/wr_site.tar /tmp/wr_migrations.tar
echo "Готово: $(grep '^PB_URL=' "$ENV_FILE" | cut -d= -f2)"
