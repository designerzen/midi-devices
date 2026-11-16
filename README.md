# MIDI devices

Open profiles for MIDI hardware: port names for auto-detection, MIDI control mappings, panel diagrams, icons, capabilities and setup notes. Any application can consume them.

**Browse the catalogue:** https://designerzen.github.io/midi-devices/

Read the [complete API reference](docs/api.md) for response shapes, every client method, identifier matching, errors, caching, and self-hosting. The [profile and contribution guide](docs/profiles.md) explains MIDI mappings, panel geometry, and how to add devices and manufacturers.

See [classic MIDI and accessible hardware coverage](docs/coverage.md) for the DX7, D-50, JUNO-106, M1, TR-909 and other landmark devices, plus Soundbeam, Magic Flute, Skoog and Skwitch. The guide explains DIN MIDI interfaces, companion-app dependencies, and partial mappings.

The catalogue includes Alesis Q49/Q49 MKII, M-Audio Keystation 49/61 MK3, Native Instruments KOMPLETE KONTROL A25/A49, and Nektar SE49/SE61. These keyboard profiles cover basic performance messages; their setup notes explain configurable controls and manual selection where port aliases have not been verified.

## Layout

```
devices/
  index.json                      [{ "id": "akai-mpk-mini-mk3", "path": "akai/mpk-mini-mk3" }, …]
  profile.schema.json             JSON Schema (draft 2020-12) for every profile
  <manufacturer>/<model>/
    <id>.json                     the device profile
    icon.svg                      small device icon
    panel.svg                     panel diagram; surface elements are positioned over it
```

The `id` inside each profile must match its filename. Asset paths inside a profile are relative to its folder.

## API

A static, read-only JSON API is published with the site. Generated `links` are absolute URLs; asset fields within profiles remain relative. CORS and HTTP caching depend on the deployment host.

| Endpoint | Returns |
| --- | --- |
| [`api/v1/index.json`](https://designerzen.github.io/midi-devices/api/v1/index.json) | Endpoint links and a summary of every device (name, manufacturer, abilities, port names, links) |
| `api/v1/devices.json` | Every full profile in one response |
| `api/v1/devices/{id}.json` | One full profile plus `manufacturerId` and `links` (`profile`, `icon`, `panel`, `base`, `catalogue`) |
| `api/v1/manufacturers.json` | Manufacturers with device counts and IDs |
| `api/v1/manufacturers/{id}.json` | One manufacturer with summaries of its devices |
| `api/v1/midi/{slug}.json` | The full profile for a device ID or Web MIDI port name, slugged: lowercase, other characters become `-` (`MPK mini 3` → [`midi/mpk-mini-3.json`](https://designerzen.github.io/midi-devices/api/v1/midi/mpk-mini-3.json)) |
| `api/v1/ports.json` | `byId`, `byName` and `bySlug` maps from lowercased Web MIDI port IDs and names to device IDs |

Relative asset paths inside a profile (`icon`, `surface.src`, GUI element `src`) resolve against `links.base`. Collection responses and the port map carry `apiVersion` and `dataVersion`; individual device and manufacturer responses do not. Breaking changes to the shape will move to a new `api/v2/`.

### JavaScript client

```js
import { createMidiDevicesClient } from "https://designerzen.github.io/midi-devices/client.js"

const devices = createMidiDevicesClient()
await devices.list()                      // summaries
await devices.device("korg-minilogue")    // full profile, or undefined
await devices.lookup("MPK mini 3")        // full profile by device ID or port name
await devices.manufacturer("roland")
await devices.search("roland drum")

const access = await navigator.requestMIDIAccess()
for (const port of access.inputs.values()) {
	const id = await devices.match(port)  // device ID for a connected port
}
```

`createMidiDevicesClient({ baseUrl, fetch })` accepts another API location (for example a pinned jsDelivr copy) and a custom `fetch`.

## Using the raw files

### Over HTTP

The `devices/` folder is published as the site root, with CORS enabled:

```js
const registry = "https://designerzen.github.io/midi-devices/"
const index = await (await fetch(new URL("index.json", registry))).json()
const { id, path } = index[0]
const profile = await (await fetch(new URL(`${path}/${id}.json`, registry))).json()
const icon = new URL(`${path}/${profile.icon ?? "icon.svg"}`, registry).href
```

Pinned versions are available from jsDelivr: `https://cdn.jsdelivr.net/gh/designerzen/midi-devices@<tag-or-sha>/devices/index.json`.

### As a package

```sh
npm install github:designerzen/midi-devices
```

```js
import { MIDI_DEVICE_DIRECTORY, midiDeviceFolders, createMidiDeviceStore, midiDeviceFilesPlugin } from "midi-devices"
```

- `MIDI_DEVICE_DIRECTORY`: absolute path of `devices/`.
- `midiDeviceFolders(root?)`: `{ id, path }` for every valid profile.
- `midiDeviceDirectory(id, root?)`: absolute device folder; throws for unknown IDs.
- `createMidiDeviceStore(getRoots)`: reads registry files from one or more roots (earlier roots win), for serving from Node or Electron.
- `midiDeviceFilesPlugin()`: Vite plugin that serves the registry at `<base>midi-devices/` in development and copies it into the build.

Raw files are also exported, e.g. `midi-devices/index.json`, `midi-devices/profile.schema.json` and `midi-devices/devices/korg/volca-fm/korg-volca-fm.json`.

The Node entry point uses filesystem APIs; browser applications should import `midi-devices/client.js` instead. A store exposes asynchronous `entries()` (sorted `{ id, path }` records), `list()` (IDs), and `read(relative)` (`{ type, bytes }` or `null` for missing or disallowed paths). Its roots callback returns filesystem paths in priority order. The Vite plugin serves raw profiles and assets, rather than the generated versioned API.

## Adding a device

1. Create `devices/<manufacturer>/<model>/` with `<id>.json`, `icon.svg` and `panel.svg`. Folder and file names are lowercase kebab-case.
2. Set `"$schema": "../../profile.schema.json"` in the profile to get editor completion.
3. Run `npm install`, then `npm run build` to regenerate `devices/index.json` and `npm run validate` to check it.
4. `npm run preview` serves the catalogue locally.

Pushes to `main` are validated and published to GitHub Pages.
