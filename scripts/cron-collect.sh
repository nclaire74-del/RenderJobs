#!/usr/bin/env bash
#
# Collecte périodique pour le cron (fraîcheur « temps réel »).
# Usage : cron-collect.sh [express|leger]
#   - sans argument : collecte COMPLÈTE (toutes les sources + purge, ≈ 2 h)
#   - « leger »      : sources rapides seulement (cron fréquent ≈ 20 min)
#   - « express »    : flux curés à 1 requête (AFJV, Games-Career, GameJobs.co), cron ≈ 5 min
#
# `flock -n` empêche deux collectes de se chevaucher (si la précédente tourne encore, on saute ce tour).
# Verrou distinct par mode pour que les trois cadences ne se bloquent pas mutuellement.
set -euo pipefail

PROJET="/home/clara/ClaraAFJV"
MODE="${1:-complet}"
VERROU="/tmp/clara-collect-${MODE}.lock"

cd "$PROJET"
export PATH="/usr/bin:/usr/local/bin:$PATH"

if [ "$MODE" = "complet" ]; then
  exec flock -n "$VERROU" npm run --silent collect
else
  exec flock -n "$VERROU" npm run --silent collect -- "$MODE"
fi
