# API reference

The catalogue is a static, read-only collection of JSON and XML files generated at build time. Every device has its own URL in both formats. No account or API key is required. It describes hardware; it does not open MIDI ports, send MIDI messages, or provide a MIDI driver.

Base URL: `https://designerzen.github.io/midi-devices/api/v1/`

## Endpoints and response shapes

Use GET requests. Every `.json` endpoint below also has an equivalent `.xml` URL. Static hosts serve these files directly; query parameters do not filter static files. For a single endpoint that selects a device with an `id` query parameter, use the optional Node host described below.

| Path relative to the base | JSON response |
| --- | --- |
| `index.json` | Metadata, `count`, endpoint `links`, and `devices` containing summaries |
| `devices.json` | Metadata, `count`, and `devices` containing full profiles |
| `devices/{id}.json` | A full profile with `manufacturerId` and `links` |
| `manufacturers.json` | Metadata, `count`, and `manufacturers`; each has company descriptor fields, `count`, `deviceIds`, and generated `links` |
| `manufacturers/{id}.json` | Company descriptor fields, generated `links`, and `devices` containing summaries |
| `midi/{slug}.json` | The same full profile as the device endpoint, located through an identifier alias |
| `ports.json` | Metadata and `byId`, `byName`, `bySlug` dictionaries mapping identifiers to device IDs |

Metadata means `apiVersion` (`"v1"`), `dataVersion` (`<package version>+<short commit>`), and `generated` (ISO timestamp). Metadata appears on collection responses and the port map, **not** individual device, manufacturer, or alias responses. `dataVersion` identifies the package release and catalogue commit; rebuilding the same commit with the same package version preserves it. Use `npm run version:patch`, `npm run version:minor`, or `npm run version:major` to bump the package release before building.

A summary contains `id`, `name`, `manufacturer`, `manufacturerId`, `description`, `abilities`, `ids`, `portNames`, and `links`, when supplied by the profile. Full profiles additionally contain control mappings, setup notices, documentation, GUI layout, and panel geometry. See [the profile guide](profiles.md).

Company fields come from `devices/<manufacturer>/manufacturer.json`: `schemaVersion`, `id`, `name`, `description`, `url`, `logo`, `logoSource`, and `resources` (the descriptor's labelled `links` array). `logo` is relative to `links.base`. Manufacturer `links` include `self`, `xml`, `base`, `profile` (raw descriptor), an optional `logo` (absolute SVG URL when verified), and `catalogue` (company page with associated products).

Manufacturer collections include entries with no device profiles (`count: 0`, `deviceIds: []`); individual responses return `devices: []`. Registered companies expose `midiManufacturerIds` (canonical uppercase hex byte strings, such as `43` or `00 20 6B`), `midiRegistryNames` (official company names) and `midiIdSource`. Newly imported entries use `registryOnly: true` and omit unverified `url`, `logo`, `logoSource` and `links.logo`. Company IDs remain stable folder slugs; multiple official SysEx IDs can belong to one company.

The root-level `manufacturers.json` contains all `{ id, name, midiManufacturerIds }` directory summaries. The root-level `midi-manufacturers.json` contains `source`, `retrievedAt`, `count`, `assignments` (`{ hex, name, manufacturerId }`) and `excluded` marker/reserved values. API `index.json` links to the latter via `links.midiManufacturers`. These two raw indexes are also exported as `midi-devices/manufacturers.json` and `midi-devices/midi-manufacturers.json`. SysEx IDs do not provide automatic browser port-name matching.

Device links include `self` (API JSON), `xml` (API XML), `profile` (raw JSON profile), `base` (asset directory), `icon`, `panel`, `manufacturer`, and `catalogue`. Generated `links` are absolute URLs. Fields within the original profile, including `icon`, `surface.src`, and GUI image `src`, remain relative:

```js
const base = "https://designerzen.github.io/midi-devices/api/v1/"
const response = await fetch(new URL("devices/korg-minilogue.json", base))
if (!response.ok) throw new Error(`Catalogue request failed: ${response.status}`)
const device = await response.json()
const panelUrl = new URL(device.surface.src, device.links.base).href
```

Unknown paths normally return the static host's HTTP 404 page, which may be HTML. Always check `response.ok` before parsing JSON. HTTP headers, caching, and CORS are controlled by your static host; the JSON generator does not configure them. Breaking API shape changes will use a new version directory.

## XML format

For example, fetch `devices/korg-minilogue.xml` for the same device data as `devices/korg-minilogue.json`. XML uses a `<response>` root, object properties as `<field key="…">`, and array entries as `<item>`. Every element has a `type` attribute (`object`, `array`, `string`, `number`, `boolean`, or `null`). This preserves numeric mapping keys, empty arrays and objects, nulls, and primitive types. Text and keys are XML-escaped. Links inside XML contain the same values as JSON, including the explicit `links.xml` device URL.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<response type="object"><field type="string" key="id">korg-minilogue</field></response>
```

This example shows only the ID field; actual responses contain the complete profile.

## Single-device query endpoint

Run `npm start` to build the files and start the optional Node API host (Node 22 or later). It reads the requested prebuilt file without loading or filtering the full catalogue:

```text
http://127.0.0.1:3000/api/v1/device?id=korg-minilogue
http://127.0.0.1:3000/api/v1/device?id=korg-minilogue&format=json
http://127.0.0.1:3000/api/v1/device?id=korg-minilogue&format=xml
```

Exactly one canonical device `id` is required. JSON is the default; `format` accepts `json` or `xml`. A successful response contains only that device, with the same bytes as its static file. Missing, malformed, or repeated IDs and unsupported formats return 400; unknown devices return 404. Errors use the selected format, except unsupported formats return JSON. GET and HEAD are supported; other methods return 405. The host also serves the static `/api/v1/` JSON and XML URLs and allows cross-origin reads.

Configure `PORT` (default `3000`) and `HOST` (default `127.0.0.1`) for your deployment. Set `SITE_URL` before building to make profile links point to the static site containing the assets. The Node host serves API data only. After changing profiles, rebuild with `npm run build`. To serve an existing build, run `node scripts/server.js`.

GitHub Pages hosts the unique static URLs in both formats. It cannot execute the query endpoint; deploy the Node host separately if you need that endpoint.

## Identifier matching

Device and manufacturer IDs are lowercase kebab-case, such as `korg-minilogue` and `native-instruments`. Manufacturer IDs come from the manufacturer folder, rather than a MIDI SysEx manufacturer number.

`match(port)` checks `port.id` against `byId` first, then `port.name` against `byName`. Both are trimmed and lowercased; matching is exact, with no substring or manufacturer fallback. Browser port IDs may be opaque or machine-specific. Profiles without verified port names require manual selection.

`lookup(identifier)` uses an alias URL: lowercase the identifier, replace each run of non-ASCII-alphanumeric characters with `-`, then remove leading/trailing hyphens. For example, `MPK mini 3` becomes `mpk-mini-3`. Aliases include canonical device IDs, profile `ids`, and `portNames`. The build rejects aliases claimed by different devices.

## JavaScript client

```js
import { createMidiDevicesClient, midiSlug } from "midi-devices/client.js"

const client = createMidiDevicesClient()
const results = await client.search("korg synth")
const profile = await client.device("korg-minilogue")
console.log(midiSlug("MPK mini 3")) // mpk-mini-3
```

For direct browser imports use `https://designerzen.github.io/midi-devices/client.js`. Node consumers need an environment with `fetch`, or must supply a compatible implementation.

| Method | Resolves to |
| --- | --- |
| `list()` | Array of device summaries |
| `all()` | Array of full profiles |
| `device(id)` | Full profile, or `undefined` for invalid IDs or any request failure |
| `lookup(identifier)` | Full profile, or `undefined` for empty aliases or any request failure |
| `manufacturers()` | Array of manufacturer summaries |
| `manufacturer(id)` | Manufacturer detail; rejects on request failure |
| `match({ id, name })` | Device ID or `undefined`; rejects on port-map request failure |
| `search(text)` | Summaries matching every whitespace-separated term, case-insensitively, across ID, name, manufacturer, description, and abilities; empty text returns all summaries |

Call `search` as a client method because it uses `this.list()`. Methods other than `device` and `lookup` propagate fetch, HTTP, and JSON parsing failures. Those two methods return `undefined` for network failures as well as unknown devices; use direct fetch if you need to distinguish the cases.

Each client instance caches successful requests, including in-flight promises. Failed requests are evicted so later calls can retry. Create a new client to refresh cached data.

```js
const client = createMidiDevicesClient({
  baseUrl: "https://example.com/api/v1/", // include the trailing slash
  fetch: globalThis.fetch
})

// Call from a user gesture in a browser that supports Web MIDI.
const access = await navigator.requestMIDIAccess()
for (const input of access.inputs.values()) {
  const id = await client.match(input)
  if (id) console.log(await client.device(id))
  else console.log("Select a profile manually for", input.name)
}
```

Web MIDI access requires browser support, a secure context, and user permission. Reading the catalogue itself does not require MIDI permission. A catalogue match identifies a profile; it does not establish that every listed control is available in the current hardware mode.

## Hosting and reproducibility

`npm run build` writes the API, raw profiles, assets, catalogue, and client into `dist/`. Set `SITE_URL` to the final public site root before building a mirror so generated links point to your deployment. The Vite file plugin serves raw registry files only; it does not generate `api/v1/`.

For reproducible raw data, pin a Git tag or commit in a jsDelivr URL ending in `/devices/index.json`. Generated API files live in the build output, so changing the client base URL to a source-repository CDN does not automatically provide a generated API there.
