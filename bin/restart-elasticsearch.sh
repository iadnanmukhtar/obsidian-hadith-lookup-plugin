#!/usr/bin/env bash

set -euo pipefail

# Restart Elasticsearch using the best available service manager.
if command -v brew >/dev/null 2>&1; then
  if brew services list 2>/dev/null | awk '$1=="elasticsearch"{found=1} END{exit found?0:1}'; then
    echo "Restarting Elasticsearch via brew services..."
    brew services restart elasticsearch
    exit 0
  fi
fi

if command -v systemctl >/dev/null 2>&1; then
  if systemctl list-unit-files --type=service 2>/dev/null | grep -q '^elasticsearch\\.service'; then
    echo "Restarting Elasticsearch via systemctl..."
    sudo systemctl restart elasticsearch
    exit 0
  fi
fi

if command -v service >/dev/null 2>&1; then
  echo "Restarting Elasticsearch via service..."
  sudo service elasticsearch restart
  exit 0
fi

echo "Could not find a supported method to restart Elasticsearch." >&2
exit 1
