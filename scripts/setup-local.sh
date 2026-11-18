#!/bin/sh
# Local setup, also used by CI: Garage config, containers, bucket and key, .env.local.
# Idempotent: rerunning keeps existing secrets and keys. The container provisioning below is
# exercised by every CI run; the only decision logic (filling .env.local) is scripts/lib/fill-env.mjs.
set -eu
cd "$(dirname "$0")/.."

rand() { openssl rand -hex "$1"; }

if [ ! -f docker/garage/garage.toml ]; then
  sed -e "s/__RPC_SECRET__/$(rand 32)/" -e "s/__ADMIN_TOKEN__/$(rand 16)/" \
    docker/garage/garage.toml.template > docker/garage/garage.toml
fi

docker compose up -d --wait db
docker compose up -d storage

g() { docker compose exec -T storage /garage "$@"; }
i=0
until g status >/dev/null 2>&1; do
  i=$((i + 1)); [ "$i" -gt 60 ] && { echo "Garage did not start" >&2; exit 1; }
  sleep 1
done

BUCKET=xmodoki-media
KEY=xmodoki-dev
NODE=$(g status 2>/dev/null | awk '/^[0-9a-f]{16}/{print $1; exit}')
if ! g layout show 2>/dev/null | grep -q "^$NODE.*dc1"; then
  g layout assign -z dc1 -c 1G "$NODE" >/dev/null
  VER=$(g layout show 2>/dev/null | awk '/apply --version/{print $NF; exit}')
  g layout apply --version "${VER:-1}" >/dev/null
fi
g bucket info "$BUCKET" >/dev/null 2>&1 || g bucket create "$BUCKET" >/dev/null
g key info "$KEY" >/dev/null 2>&1 || g key create "$KEY" >/dev/null
g bucket allow --read --write --owner "$BUCKET" --key "$KEY" >/dev/null
g bucket website --allow "$BUCKET" >/dev/null

KEY_ID=$(g key info "$KEY" | awk '/Key ID:/{print $3}')
KEY_SECRET=$(g key info --show-secret "$KEY" | awk '/Secret key:/{print $3}')

[ -f .env.local ] || cp .env.example .env.local
# Fills only empty values (scripts/lib/fill-env.mjs, tested): rerunning keeps existing secrets.
node scripts/fill-env.mjs .env.local \
  "BETTER_AUTH_SECRET=$(rand 32)" \
  "S3_ACCESS_KEY_ID=$KEY_ID" \
  "S3_SECRET_ACCESS_KEY=$KEY_SECRET" \
  "CRON_SECRET=$(rand 16)"
echo "setup-local: containers up, bucket $BUCKET ready, .env.local filled"
