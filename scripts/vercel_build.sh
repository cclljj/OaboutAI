#!/usr/bin/env bash
set -euo pipefail

APP_ID="${APP_ID:-oaboutai}"
TMP_ROOT="$(mktemp -d)"
COMPOSED_SITE="${TMP_ROOT}/site"
DATA_REPO_URL="${OABOUTAI_DATA_REPO_URL:-}"
DATA_REPO_REF="${OABOUTAI_DATA_REPO_REF:-main}"
DATA_REPO_TOKEN_ENV="${OABOUTAI_DATA_REPO_TOKEN_ENV:-OABOUTAI_DATA_REPO_TOKEN}"
DATA_REPO_SUBDIR="${OABOUTAI_DATA_REPO_SUBDIR:-obsidian}"

cleanup() {
  rm -rf "${TMP_ROOT}"
}
trap cleanup EXIT

compose_cmd=(
  python3 scripts/compose_site.py
  --app-id "${APP_ID}"
  --output "${COMPOSED_SITE}"
  --clean
)
if [[ -n "${DATA_REPO_URL}" ]]; then
  compose_cmd+=(
    --data-repo-url "${DATA_REPO_URL}"
    --data-repo-ref "${DATA_REPO_REF}"
    --data-repo-token-env "${DATA_REPO_TOKEN_ENV}"
    --data-repo-subdir "${DATA_REPO_SUBDIR}"
  )
fi
"${compose_cmd[@]}"

pushd "${COMPOSED_SITE}" >/dev/null
python3 scripts/compile_obsidian_articles.py
rm -rf data/obsidian
rm -f data/keyword_proposals.jsonl
npx --yes hugo-bin --gc --minify
popd >/dev/null

rm -rf public
mkdir -p public
cp -R "${COMPOSED_SITE}/public/." public/

echo "Vercel build prepared from composed app '${APP_ID}'."
