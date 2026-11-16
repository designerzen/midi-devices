# API reference

The catalogue is a static, read-only collection of JSON files. No account or API key is required. It describes hardware; it does not open MIDI ports, send MIDI messages, or provide a MIDI driver.

Base URL: `https://designerzen.github.io/midi-devices/api/v1/`

## Endpoints and response shapes

Use GET requests. There is no server-side search, pagination, filtering, or write endpoint. Query parameters do not filter the catalogue.

| Path relative to the base | JSON response |
| --- | --- |
| `index.json` | Metadata, `count`, endpoint `links`, and `devices` containing summaries |
| `devices.json` | Metadata, `count`, and `devices` containing full profiles |
| `devices/{id}.json` | A full profile with `manufacturerId` and `links` |
| `manufacturers.json` | Metadata, `count`, and `manufacturers`; each has `id`, `name`, optional `url`, `count`, `deviceIds`, and `links.self` |
| `manufacturers/{id}.json` | `id`, `name`, optional `url`, `links.self`, and `devices` containing summaries |
| `midi/{slug}.json` | The same full profile as the device endpoint, located through an identifier alias |
| `ports.json` | Metadata and `byId`, `byName`, `bySlug` dictionaries mapping identifiers to device IDs |

Metadata means `apiVersion` (`"v1"`), `dataVersion` (package version), and `generated` (ISO timestamp). Metadata appears on collection responses and the port map, **not** individual device, manufacturer, or alias responses. `dataVersion` is not a unique build identifier; catalogue edits can share a package version.

A summary contains `id`, `name`, `manufacturer`, `manufacturerId`, `description`, `abilities`, `ids`, `portNames`, and `links`, when supplied by the profile. Full profiles additionally contain control mappings, setup notices, documentation, GUI layout, and panel geometry. See [the profile guide](profiles.md).

Device links include `self` (API JSON), `profile` (raw profile), `base` (asset directory), `icon`, `panel`, `manufacturer`, and `catalogue`. Generated `links` are absolute URLs. Fields within the original profile, including `icon`, `surface.src`, and GUI image `src`, remain relative:

```js
const base = "https://designerzen.github.io/midi-devices/api/v1/"
const response = await fetch(new URL("devices/korg-minilogue.json", base))
if (!response.ok) throw new Error(`Catalogue request failed: ${response.status}`)
const device = await response.json()
const panelUrl = new URL(device.surface.src, device.links.base).href
```

Unknown paths normally return the static host's HTTP 404 page, which may be HTML. Always check `response.ok` before parsing JSON. HTTP headers, caching, and CORS are controlled by your static host; the JSON generator does not configure them. Breaking API shape changes will use a new version directory.

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
