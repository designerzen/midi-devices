# MIDI devices

Open profiles for MIDI hardware: port names for auto-detection, MIDI control mappings, panel diagrams, icons, capabilities and setup notes. Any application can consume them.

**Browse the catalogue:** https://designerzen.github.io/midi-devices/

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

A static, read-only JSON API is published with the site. Every response is CORS-enabled and all links in it are absolute URLs.

| Endpoint | Returns |
| --- | --- |
| [`api/v1/index.json`](https://designerzen.github.io/midi-devices/api/v1/index.json) | Endpoint links and a summary of every device (name, manufacturer, abilities, port names, links) |
| `api/v1/devices.json` | Every full profile in one response |
| `api/v1/devices/{id}.json` | One full profile plus `manufacturerId` and `links` (`profile`, `icon`, `panel`, `base`, `catalogue`) |
| `api/v1/manufacturers.json` | Manufacturers with device counts and IDs |
| `api/v1/manufacturers/{id}.json` | One manufacturer with summaries of its devices |
| `api/v1/ports.json` | `byId` and `byName` maps from lowercased Web MIDI port IDs and names to device IDs |

Relative asset paths inside a profile (`icon`, `surface.src`, GUI element `src`) resolve against `links.base`. Responses carry `apiVersion` and `dataVersion`; breaking changes to the shape will move to a new `api/v2/`.

### JavaScript client

```js
import { createMidiDevicesClient } from "https://designerzen.github.io/midi-devices/client.js"

const devices = createMidiDevicesClient()
await devices.list()                      // summaries
await devices.device("korg-minilogue")    // full profile, or undefined
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
- `createMidiDeviceStore(getRoots)`: reads registry files from one or more roots (earlier roots win), for serving from Node or Electron.
- `midiDeviceFilesPlugin()`: Vite plugin that serves the registry at `<base>midi-devices/` in development and copies it into the build.

Raw files are also exported, e.g. `midi-devices/index.json`, `midi-devices/profile.schema.json` and `midi-devices/devices/korg/volca-fm/korg-volca-fm.json`.

## Adding a device

1. Create `devices/<manufacturer>/<model>/` with `<id>.json`, `icon.svg` and `panel.svg`. Folder and file names are lowercase kebab-case.
2. Set `"$schema": "../../profile.schema.json"` in the profile to get editor completion.
3. Run `npm install`, then `npm run build` to regenerate `devices/index.json` and `npm run validate` to check it.
4. `npm run preview` serves the catalogue locally.

Pushes to `main` are validated and published to GitHub Pages.
