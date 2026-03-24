# Deploy `docs-site` to Zeabur (OaboutAI)

This guide configures the Hugo static site deployment for project `OaboutAI`.

## Target

- Project name: `OaboutAI`
- Project ID: `699f276deae0acb0cfea33b0`
- Service type: static website
- Repository root directory: `docs-site/`

## Service Configuration

Set the Zeabur service to build from the `docs-site/` directory.

Recommended build command:

```bash
hugo --gc --minify
```

Publish/output directory:

```text
public
```

## Prerequisites in Repo

- `docs-site/hugo.toml` configured
- `docs-site/go.mod` includes Hextra module
- Content validation workflow enabled in `.github/workflows/docs-site-ci.yml`

## CI/CD Flow

1. Developer or agent opens PR with site/content changes.
2. GitHub Actions validates metadata and runs Hugo build.
3. PR merges only after CI passes.
4. Zeabur Git auto-deploy pulls merged commit and publishes `public/`.

## Operational Checklist

1. In Zeabur dashboard, confirm this service points to the same branch used for production merges.
2. Confirm service root is `docs-site/` (not repository root).
3. Confirm build logs include successful Hugo module resolution (`github.com/imfing/hextra`).
4. Verify site URL root returns HTTP 200 after deploy.

## Troubleshooting

- Build fails with missing theme/module:
  - verify `go.mod` exists in `docs-site/`
  - verify network access to Hugo module source
- Service returns default/empty page:
  - verify root directory is set to `docs-site/`
  - verify output directory is `public`
- Content validation passes locally but fails in CI:
  - check keyword/topic IDs against `data/*.json`
  - check date format strictly `YYYY-MM-DD`
