#!/usr/bin/env bash
set -euo pipefail

APP_ID="${APP_ID:-oaboutai}"
TMP_ROOT="$(mktemp -d)"
COMPOSED_SITE="${TMP_ROOT}/site"

cleanup() {
  rm -rf "${TMP_ROOT}"
}
trap cleanup EXIT

python3 scripts/compose_site.py --app-id "${APP_ID}" --output "${COMPOSED_SITE}" --clean

pushd "${COMPOSED_SITE}" >/dev/null
python3 scripts/sync_topics.py
rm -f data/keyword_proposals.jsonl
npx --yes hugo-bin --gc --minify
popd >/dev/null

rm -rf public
mkdir -p public
cp -R "${COMPOSED_SITE}/public/." public/

echo "Vercel build prepared from composed app '${APP_ID}'."
