# Development

How to build, test, version and deploy the catalogue. To add or edit device profiles, see the [profile guide](profiles.md).

## Setup

You need Node 22 or later and Python 3.

```sh
npm ci
python -m pip install -r requirements-dev.txt   # XML schema validator used by the tests
```

## Commands

| Command | Does |
| --- | --- |
| `npm run build` | Regenerates `devices/index.json` and builds the site, API and client into `dist/`, then validates every generated XML response |
| `npm test` | Validates the profiles, then runs the Node and Python test suites |
| `npm run validate` | Checks the profiles, indexes and assets only |
| `npm run diagrams` | Regenerates every device's `panel.svg`, `interface.svg` and `connections.svg` from its profile and `scripts/diagram-layouts.json` |
| `npm run preview` | Builds, then serves `dist/` as a static site |
| `npm start` | Builds, then runs the Node host with the [single-device query endpoint](api.md#single-device-query-endpoint) |
| `npm run manufacturers:import` | Refreshes the [official manufacturer directory](profiles.md#official-manufacturer-ids) |

`dist/` is generated output and is not committed. Commit the regenerated `devices/index.json` together with profile changes.

## Repository layout

```text
devices/                          the published registry, also the npm package's data
  index.json                      [{ "id": "akai-mpk-mini-mk3", "path": "akai/mpk-mini-mk3" }, …]
  manufacturers.json              the complete manufacturer directory
  midi-manufacturers.json         official SysEx ID assignments, with source metadata
  *.schema.json, api.xsd, api.xsl schemas for the raw files and API responses
  <manufacturer>/
    manufacturer.json             company name, description, website, resources and logo source
    logo.svg                      manufacturer logo
    <model>/
      <id>.json                   the device profile; `id` must match the filename
      icon.svg                    copy of the manufacturer logo, so every device has a stable icon URL
      panel.svg                   panel diagram; surface elements are positioned over it
site/                             catalogue page and its browser modules
scripts/                          build, validation, diagram generation, Node host and tests
index.js, client.js               npm package entry points
```

Asset paths inside a profile are relative to its folder.

## Versions

Three version numbers are independent of each other:

- The **package version** in `package.json` identifies a release of the data.
- The **API version** (`api/v1/`) changes only when response shapes break.
- A profile's **`schemaVersion`** changes only when the profile format breaks.

Every push to `main` runs `npm run version:build` in GitHub Actions before validating and building. It sets the package version in the CI checkout to `<major>.<minor>.<base patch + GITHUB_RUN_NUMBER>`. With a committed base of `1.0.1`, workflow runs 42 and 43 build `1.0.43` and `1.0.44`. Run numbers include pull-request runs, so deployed versions can skip numbers. Re-running a workflow keeps its version, and CI never commits or tags the change.

Local and pull-request builds use the committed version. To change the committed base, run `npm run version:patch`, `version:minor` or `version:major`. These update `package.json` and the lockfile without creating a commit or tag.

## Build identity

Each build records the package version, commit and build time. The commit comes from `CF_PAGES_COMMIT_SHA` on Cloudflare Pages, `GITHUB_SHA` on GitHub Actions, or the local Git checkout. You can read it in three places:

- the footer of the catalogue page, which also links to the latest `main` commit so you can see whether a deployment has caught up
- `version.json` at the site root
- `dataVersion` (`<package version>+<short commit>`) on API collection responses

## Deployment

Pushes to `main` are validated, built and published to GitHub Pages by `.github/workflows/pages.yml`. To deploy on Cloudflare Pages, set the build command to `npm run build` and the output directory to `dist`.

The generated `_headers` file asks browsers to revalidate the page and `version.json`. Catalogue JSON requests carry the build commit, so a new deployment never serves stale cached data.

To host a mirror, set `SITE_URL` to its public root before building so that generated links point to it. See [hosting](api.md#hosting-and-reproducibility).
