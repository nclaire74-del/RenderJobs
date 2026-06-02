#!/usr/bin/env bash
#
# Sauvegarde quotidienne de la base du projet (AUDIT §I : aucune sauvegarde dédiée auparavant).
# Critique dès qu'il y aura de l'état utilisateur (candidatures suivies) — perte irréversible sinon.
#
# Dump compressé dans backups/ + rotation (garde les 14 derniers). Lancé par cron (voir crontab).
set -euo pipefail

PROJET="/home/clara/ClaraAFJV"
DEST="$PROJET/backups"
mkdir -p "$DEST"

# Charge DATABASE_URL (postgresql://hub:…@localhost:5434/hub_emploi?sslmode=disable) sans l'exposer.
set -a
# shellcheck disable=SC1091
source "$PROJET/.env.local"
set +a

TS="$(date +%Y%m%d-%H%M%S)"
FICHIER="$DEST/hub_emploi-$TS.sql.gz"

pg_dump "$DATABASE_URL" | gzip > "$FICHIER"

# Rotation : ne conserver que les 14 dumps les plus récents.
ls -t "$DEST"/hub_emploi-*.sql.gz 2>/dev/null | tail -n +15 | xargs -r rm -f

echo "[$(date -Iseconds)] backup OK → $FICHIER ($(du -h "$FICHIER" | cut -f1))"
