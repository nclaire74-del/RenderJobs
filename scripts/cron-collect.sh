#!/usr/bin/env bash
#
# Collecte périodique pour le cron (fraîcheur « quasi temps réel »).
# Usage : cron-collect.sh [leger]
#   - sans argument : collecte COMPLÈTE (toutes les sources + purge)
#   - « leger »      : sources rapides seulement (cron fréquent ≈ 20 min)
#
# `flock -n` empêche deux collectes de se chevaucher (si la précédente tourne encore, on saute ce tour).
# Verrou distinct par mode pour que le complet et le léger ne se bloquent pas mutuellement.
set -euo pipefail

PROJET="/home/clara/ClaraAFJV"
MODE="${1:-complet}"
VERROU="/tmp/clara-collect-${MODE}.lock"

cd "$PROJET"
export PATH="/usr/bin:/usr/local/bin:$PATH"

if [ "$MODE" = "leger" ]; then
  exec flock -n "$VERROU" npm run --silent collect -- leger
else
  exec flock -n "$VERROU" npm run --silent collect
fi
