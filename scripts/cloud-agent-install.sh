#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if [[ ! -f package-lock.json ]]; then
  echo "package-lock.json is required for reproducible installs" >&2
  exit 1
fi

npm ci --legacy-peer-deps
