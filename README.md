# MIDI devices

Open, machine-readable profiles for MIDI hardware. Each profile tells your app how to recognise a connected device by its port name, which CCs and notes its controls send, and how to draw its panel. Profiles also carry setup notes and links to manuals.

- **235 device profiles** from 43 manufacturers, including synths, controllers, drum machines, MIDI interfaces and accessible instruments
- **795 manufacturers**, covering every named entry in the [official MIDI SysEx ID registry](https://midi.org/sysexidtable)
- A free, static **JSON and XML API**, plus a JavaScript client and an npm package
- **SVG panel diagrams** with mapped hit areas, drawn with the [NYU SynthAccess](https://github.com/IDMNYU/synthaccess/tree/main/tactileSynthGuides) tactile symbol set

**[Browse the catalogue →](https://designerzen.github.io/midi-devices/)** Plug in a device and click *Detect connected devices* to see its profile, play it from the panel diagram and watch its MIDI live.

Detection matches stable application IDs, documented port aliases and unique complete model names, including common Windows/macOS/ALSA naming variations. Canonical catalogue IDs are not USB hardware IDs. Manufacturer pages detect against the full catalogue while displaying their selected manufacturer. Generic MIDI interfaces and ambiguous model families still require manual profile selection. Run `npm run audit:midi` for catalogue matching checks.

## Quick start

Identify a connected device and read its controls. This runs in any browser that supports Web MIDI and needs no API key or install:

```js
import { createMidiDevicesClient } from "https://designerzen.github.io/midi-devices/client.js"

const devices = createMidiDevicesClient()
const access = await navigator.requestMIDIAccess()

for (const input of access.inputs.values()) {
	const id = await devices.match(input) // "korg-minilogue", or undefined if unknown
	if (!id) continue
	const profile = await devices.device(id)
	console.log(profile.name, profile.controls)
	// Korg minilogue [{ id: "cutoff", label: "Filter cutoff", cc: 43, widget: "slider" }, …]
}
```

Without Web MIDI, look a device up by name, or search the catalogue:

```js
await devices.lookup("MPK mini 3")     // full profile, by device ID or port name
await devices.search("roland drum")    // summaries matching every word
```

## What a profile contains

Every device is one JSON file. A shortened example:

```json
{
	"id": "korg-minilogue",
	"name": "Korg minilogue",
	"manufacturer": "Korg",
	"portNames": ["minilogue", "minilogue KBD/KNOB", "minilogue SOUND"],
	"abilities": ["Velocity-sensitive keyboard", "Filter CC", "Envelope CC", "LFO CC"],
	"controls": [
		{ "id": "cutoff", "label": "Filter cutoff", "cc": 43, "widget": "slider" },
		{ "id": "resonance", "label": "Filter resonance", "cc": 44, "widget": "slider" }
	],
	"surface": { "src": "panel.svg", "elements": ["…"] },
	"notice": "Setup steps and known limits",
	"documentation": ["Links to manuals and MIDI implementation charts"]
}
```

| Field | Use it to |
| --- | --- |
| `portNames`, `ids` | Recognise the device from a Web MIDI port name |
| `controls` | Send or decode the device's CCs, notes, pitch bend, program changes and SysEx |
| `surface`, `gui` | Draw the panel and place interactive controls on it |
| `abilities`, `modes`, `notice` | Show what the device can do and how to set it up |
| `documentation`, `productUrl` | Link to the manufacturer's manuals and product pages |

Profiles only record mappings that have a documented source. Configurable controls are left unbound rather than guessed. The [profile guide](docs/profiles.md) defines every field, and [`profile.schema.json`](devices/profile.schema.json) validates them.

## Ways to use the data

### 1. The HTTP API

Base URL: `https://designerzen.github.io/midi-devices/api/v1/`. Every endpoint is also available as `.xml`.

| Endpoint | Returns |
| --- | --- |
| [`index.json`](https://designerzen.github.io/midi-devices/api/v1/index.json) | A summary of every device, with links to everything else |
| `devices/{id}.json` | One full profile, for example [`devices/korg-minilogue.json`](https://designerzen.github.io/midi-devices/api/v1/devices/korg-minilogue.json) |
| `midi/{slug}.json` | A full profile found by port name: `MPK mini 3` becomes [`midi/mpk-mini-3.json`](https://designerzen.github.io/midi-devices/api/v1/midi/mpk-mini-3.json) |
| `ports.json` | Maps from port IDs and names to device IDs |
| `devices.json` | Every full profile in one response |
| `manufacturers.json`, `manufacturers/{id}.json` | Companies, their SysEx IDs and their devices |

```sh
curl https://designerzen.github.io/midi-devices/api/v1/devices/korg-minilogue.json
```

The [API reference](docs/api.md) documents every response shape, the JSON Schemas, the XML format, errors and self-hosting.

### 2. The JavaScript client

`client.js` wraps the API, with caching and port matching. Import it from the site as in the quick start, or from the package as `midi-devices/client.js`. See the [client reference](docs/api.md#javascript-client).

### 3. The npm package

The package bundles the raw profiles and assets, so your app works offline:

```sh
npm install github:designerzen/midi-devices
```

```js
import { midiDeviceFolders, createMidiDeviceStore, midiDeviceFilesPlugin } from "midi-devices"
import minilogue from "midi-devices/devices/korg/minilogue/korg-minilogue.json" with { type: "json" }
```

It provides directory helpers for Node, a file store for Node or Electron, and a Vite plugin. The [package reference](docs/api.md#npm-package) describes each one.

### 4. The raw files

The `devices/` folder is published at the site root, and you can pin a version through jsDelivr:

```text
https://designerzen.github.io/midi-devices/index.json
https://cdn.jsdelivr.net/gh/designerzen/midi-devices@<tag-or-sha>/devices/index.json
```

## Contributing a device

Missing your hardware? Detect it on the [catalogue page](https://designerzen.github.io/midi-devices/). An unknown device's card includes a ready-made prompt that guides an AI agent through writing its profile, or you can email its port details.

To add a profile yourself:

1. Find the manufacturer's manual and MIDI implementation chart. Map only messages they document.
2. Create `devices/<manufacturer>/<model>/<id>.json` with `icon.svg` and `panel.svg` beside it. Set `"$schema": "../../profile.schema.json"` in the profile for editor completion.
3. Run `npm ci`, then `npm run build` to regenerate `devices/index.json`, then `npm test` to validate everything.
4. Run `npm run preview` to see the device in the catalogue, then open a pull request.

The [profile guide](docs/profiles.md) explains MIDI mappings, panel geometry and sourcing rules. The [development guide](docs/development.md) covers the build, tests and releases.

## Documentation

| Guide | Covers |
| --- | --- |
| [API reference](docs/api.md) | Endpoints, response shapes, schemas, XML, the client, the npm package and self-hosting |
| [Profile guide](docs/profiles.md) | Profile fields, MIDI mappings, panel layout, and adding devices and manufacturers |
| [Catalogue app](docs/catalogue-app.md) | Device detection, the live control panel, mapping learn mode and the MIDI monitor |
| [Device coverage](docs/coverage.md) | Which devices are included, and their setup requirements and mapping limits |
| [Control-library research](docs/control-libraries.md) | Sources for the Behringer, Circuit and Volca mappings |
| [Development](docs/development.md) | Building, testing, versioning and deployment |

[Harmoneasy](https://github.com/designerzen/harmoneasy) uses this package through its asset plugin and audiobus profile adapters, and mirrors these guides in its AI documentation. Its deployed app can carry a different profile version from this repository's `main` branch.

## Trademarks

Manufacturer names and logos belong to their owners and are used only to identify their products. Logo sources are recorded in [`resources/manufacturer-logos.json`](resources/manufacturer-logos.json).
