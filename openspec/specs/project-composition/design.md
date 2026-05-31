# Project Composition Design

## Main Files

- `core/`: reusable Hugo app core.
- `apps/oaboutai/`: current app overlay.
- `scripts/compose_site.py`: wrapper entrypoint.
- `core/scripts/compose_site.py`: implementation.
- `apps/oaboutai/app.toml`: app identity and language contract.
- `apps/oaboutai/hugo.toml`: Hugo config, menus, taxonomies, params.
- `core/layouts/**`: shell layouts and protected view markers.
- `core/layouts/partials/custom/head-end.html`: Supabase meta injection, labels JSON, keyword catalog JSON, JS loading, canonical host redirect, Vercel analytics toggles.
- `vercel.json`: production rewrites.

## Composition Algorithm

`compose_site.py` resolves:

- repo root from the script path
- app root from `apps/<app-id>`
- output root from `--output` or `.build/<app-id>`

The command optionally deletes the output with `--clean`, copies `core/`, overlays `apps/<app-id>/`, injects private data if configured, then copies `api/`, package manifests, and Vercel config.

## Private Data Injection

Private data injection is controlled by:

- `--data-repo-url`
- `--data-repo-ref`
- `--data-repo-token-env`
- `--data-repo-subdir`

The GitHub tarball API is used for private repo fetches. Tar extraction rejects unsafe paths. The configured subdirectory must contain `en` and `zh-tw` language folders. In non-CI contexts, the script may fall back to existing local `data/obsidian`.

## Shell Route Inventory

English and Traditional Chinese content stubs exist for:

- home
- `items`
- `item`
- `digest`
- `admin`
- `archive`
- `archive/monthly`
- `search`
- `favorites`
- `topics`
- individual topic pages generated from `topics.json`

## Protected View Marker Inventory

- `home_recent`
- `items_list`
- `item_single`
- `admin`
- `favorites`
- `search`
- `digest`
- `archive`
- `topics_catalog`
- `terms_catalog`
- `topic`

## Replication Notes

A replica must preserve the `data-oa-protected-view` contract because `core/assets/js/oa-app.js` uses those markers as its runtime mount points.

If the Vercel rewrite table changes, update both `vercel.json` and the composed-site Vercel config generated in `.github/workflows/docs-site-ci.yml`.

