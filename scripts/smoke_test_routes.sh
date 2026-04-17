#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-}"
if [[ -z "${BASE_URL}" ]]; then
  echo "BASE_URL is required, e.g. BASE_URL=https://oaboutai.vercel.app"
  exit 1
fi

BASE_URL="${BASE_URL%/}"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "${TMP_DIR}"' EXIT

assert_200() {
  local path="$1"
  local url="${BASE_URL}${path}"
  local out="${TMP_DIR}/resp_$(echo "${path}" | tr '/?&=' '____').html"
  local code
  code="$(curl -sS -L -o "${out}" -w "%{http_code}" "${url}")"
  if [[ "${code}" != "200" ]]; then
    echo "FAIL: ${url} returned HTTP ${code}"
    exit 1
  fi
  echo "OK  : ${url} -> 200"
}

assert_contains_regex() {
  local path="$1"
  local pattern="$2"
  local url="${BASE_URL}${path}"
  local out="${TMP_DIR}/resp_$(echo "${path}" | tr '/?&=' '____').html"
  local code
  code="$(curl -sS -L -o "${out}" -w "%{http_code}" "${url}")"
  if [[ "${code}" != "200" ]]; then
    echo "FAIL: ${url} returned HTTP ${code}"
    exit 1
  fi
  if ! grep -Eq "${pattern}" "${out}"; then
    echo "FAIL: ${url} missing expected marker pattern: ${pattern}"
    exit 1
  fi
  echo "OK  : ${url} contains marker"
}

find_existing_entry_path() {
  local sitemap_url="${BASE_URL}/sitemap.xml"
  local loc

  extract_entry_loc() {
    local url="$1"
    curl -sS "${url}" \
      | grep -Eo '<loc>https?://[^<]*/(zh-tw/)?entry/[^<]*/</loc>' \
      | sed -E 's#^<loc>##; s#</loc>$##' \
      | head -n 1 || true
  }

  loc="$(extract_entry_loc "${sitemap_url}")"

  if [[ -z "${loc}" ]]; then
    local sitemap_children
    sitemap_children="$(curl -sS "${sitemap_url}" \
      | grep -Eo '<loc>https?://[^<]*/(en|zh-tw)/sitemap.xml</loc>' \
      | sed -E 's#^<loc>##; s#</loc>$##' || true)"

    if [[ -n "${sitemap_children}" ]]; then
      while IFS= read -r child_sitemap; do
        [[ -z "${child_sitemap}" ]] && continue
        loc="$(extract_entry_loc "${child_sitemap}")"
        if [[ -n "${loc}" ]]; then
          break
        fi
      done <<< "${sitemap_children}"
    fi
  fi

  if [[ -z "${loc}" ]]; then
    echo "FAIL: no /entry/<slug>/ URL found in sitemap (${sitemap_url})" >&2
    exit 1
  fi

  local path="${loc#${BASE_URL}}"
  if [[ "${path}" == "${loc}" ]]; then
    path="$(echo "${loc}" | sed -E 's#^https?://[^/]+##')"
  fi
  echo "${path}"
}

# wait for deployment edge propagation
retry=0
until curl -sS -I "${BASE_URL}" >/dev/null 2>&1; do
  retry=$((retry + 1))
  if [[ "${retry}" -ge 20 ]]; then
    echo "FAIL: ${BASE_URL} not reachable after retries"
    exit 1
  fi
  sleep 6
done

# Core pages
assert_contains_regex "/" 'data-oa-protected-view="?home_recent'
assert_contains_regex "/items/" 'data-oa-protected-view="?items_list'
assert_contains_regex "/item/?slug=smoke-test" 'data-oa-protected-view="?item_single'
ENTRY_PATH="$(find_existing_entry_path)"
assert_contains_regex "${ENTRY_PATH}" 'data-oa-protected-view="?item_single'
assert_contains_regex "/topics/" 'data-oa-protected-view="?topics_catalog'
assert_contains_regex "/keywords/" 'data-oa-term-type="?keywords'
assert_contains_regex "/types/" 'data-oa-term-type="?types'

# Rewrite compatibility pages
assert_200 "/items/smoke-legacy-slug/"
assert_200 "/keywords/smoke-term/"
assert_200 "/types/webpage/"
assert_200 "/zh-tw/items/smoke-legacy-slug/"
assert_200 "/zh-tw/keywords/smoke-term/"
assert_200 "/zh-tw/types/webpage/"

echo "Smoke tests passed for ${BASE_URL}"
