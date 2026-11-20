# MIDI devices

Open profiles for MIDI hardware: port names for auto-detection, MIDI control mappings, panel diagrams, icons, capabilities and setup notes. Any application can consume them.

**Browse the catalogue:** https://designerzen.github.io/midi-devices/

The test page displays the package version, deployed commit and build time. Each `npm run build` reads the commit from Cloudflare Pages (`CF_PAGES_COMMIT_SHA`), GitHub Actions (`GITHUB_SHA`), or the local Git checkout, so every newly built commit has its own build identifier. Build metadata is also available in `version.json`, and API collections use `<package version>+<short commit>` as their `dataVersion`. Compare the displayed commit with the linked latest `main` commit to check whether deployment has caught up. Configure Cloudflare Pages to run `npm run build` and publish `dist`. The generated `_headers` requests revalidation of the page and build metadata, and catalog JSON requests include the build commit to distinguish cached revisions.

## Bumping the version

Every push to `main` automatically runs `npm run version:build` before validation and building in GitHub Actions. It sets the CI package and lockfile version to `<major>.<minor>.<base patch + GITHUB_RUN_NUMBER>`: with a committed base of `1.0.1`, workflow runs 42 and 43 build `1.0.43` and `1.0.44`. The page, `version.json`, and API `dataVersion` all use this generated version. Manual workflow runs on main use the same mechanism; rerunning a workflow run preserves its version. Workflow numbers include pull-request runs, so deployed versions can skip numbers. Version changes stay in the CI checkout without creating commits or tags.

Local and pull-request builds keep the committed package version. Use `npm run version:patch`, `npm run version:minor`, or `npm run version:major` to change the committed base version when needed; these update `package.json` and the local npm lockfile without creating a Git commit or tag. The API URL version (`api/v1`) and profile `schemaVersion` are separate format versions.

Click **Detect connected devices** to show dedicated cards for every browser-visible MIDI input and output, including unmatched devices. Recognized profiles show hardware diagrams and capabilities; every card includes live port metadata and a session-only profile selector. Inputs are opened for monitoring, with per-input event counts and a live table of the latest 200 messages (UTC time, input name, decoded message, and raw hexadecimal bytes). Enable **Include SysEx** and refresh detection to request the additional browser permission. Connect/disconnect changes update the cards automatically. Input/output pairing is based on the available profile, name and manufacturer; Web MIDI does not supply a physical USB identity.

Read the [complete API reference](docs/api.md) for response shapes, every client method, identifier matching, errors, caching, and self-hosting. The [profile and contribution guide](docs/profiles.md) explains MIDI mappings, panel geometry, and how to add devices and manufacturers.

See [classic MIDI and accessible hardware coverage](docs/coverage.md) for the DX7, D-50, JUNO-106, M1, TR-909 and other landmark devices, plus Soundbeam, Magic Flute, Skoog and Skwitch. The guide explains DIN MIDI interfaces, companion-app dependencies, and partial mappings.

Teenage Engineering has 28 profiles, covering the OP synthesizers, MIDI-capable EP products, TX-6 and TP-7, POM-16/170, oplab interfaces and OP-Z expansions, ortho remote, all eight choir voices, and the CM-15 firmware endpoint. See [Teenage Engineering coverage](docs/coverage.md#teenage-engineering-midi-products) for connection requirements and mapping limits.

The catalogue includes Alesis Q49/Q49 MKII, M-Audio Keystation 49/61 MK3, Native Instruments KOMPLETE KONTROL A25/A49, and Nektar SE49/SE61. These keyboard profiles cover basic performance messages; their setup notes explain configurable controls and manual selection where port aliases have not been verified.

Also included: Novation Launchpad Mini MK3, Launchpad X, Circuit Tracks, Circuit Rhythm, and the original Arturia KeyStep 37. Launchpad X provides its documented Programmer-mode grid and button mappings and LPX MIDI port aliases. The other four profiles provide model-specific schematic surfaces and setup guidance; their USB port names remain unverified and require manual profile selection. Custom layouts and assignable encoders are left unbound rather than given assumed factory assignments. Manufacturer manuals and MIDI setup references are linked in each profile.

The catalogue contains **165 device profiles from 39 manufacturers**, plus a directory of **795 manufacturers**. The directory covers all **787 named SysEx manufacturer ID assignments** in the [official MIDI Association registry](https://midi.org/sysexidtable) snapshot retrieved on 19 November 2026. Reserved values and the ID-extension marker are excluded. Existing manufacturer names and artwork are preserved; newly imported entries link to the registry and have no device profiles, company website or logo until those are verified. See [manufacturer ID coverage](docs/coverage.md#official-midi-manufacturer-directory). The newest expansion adds Casio CT-S500/CT-S1000V, Studiologic SL73 Studio/SL88 Studio/SL88 Grand, OXI ONE MKII, Torso T1/S4, Faderfox EC4/UC4, Novation Launch Control XL 3 and Arturia BeatStep Pro. Five new manufacturers include company metadata and source-attributed logos. See [expanded manufacturer coverage](docs/coverage.md#expanded-manufacturer-and-controller-coverage) for setup and mapping limits.

Yamaha now has 15 profiles: DX7, the four reface models, MONTAGE M6/M7/M8x, MODX6+/7+/8+, CK61/76/88 and SEQTRAK. The 13 new Yamaha entries include setup references and model-specific control and connection schematics; see [Yamaha coverage](docs/coverage.md#yamaha-keyboards-and-seqtrak) for mapping limits.

CME additions include Xkey 25/37, Xkey Air 25/37, WIDI Master, WIDI Jack, WIDI Uhost, WIDI Bud Pro, U6MIDI Pro and H4MIDI WC, with company metadata, manufacturer artwork, setup references and schematic diagrams. See the [coverage guide](docs/coverage.md#cme-keyboards-and-midi-interfaces) for connection and mapping limits.

The previous expansion adds Elektron Digitakt II and Syntakt; Waldorf Blofeld Desktop and Streichfett; Dreadbox Typhon and Nymphes; Polyend Play+ and Tracker Mini; Sonicware LIVEN XFM and LIVEN Lofi-12; and IK Multimedia iRig Keys 2 and iRig Keys 2 Mini. Each new manufacturer includes company metadata, website and support links, and a shared logo. The profiles include selected-control schematics, connection inventories and manufacturer references; the Typhon profile supplies selected documented firmware 4.2 CC mappings. See the [coverage guide](docs/coverage.md) for model differences and mapping limits.

Other recent additions include Kontrol S49/S61/S88 MK3 and Maschine MK3 with NI Accessibility Helper setup guidance; SoftStep 2, 12 Step, QuNeo and original QuNexus for alternative foot or touch control; Launchkey 25/37/49/61 MK4, Launchpad Pro MK3, MPK mini IV and APC mini MK2. All include populated schematics and manufacturer references. See the [coverage guide](docs/coverage.md) for software dependencies, access methods and mapping limits.

## Layout

Device diagrams use the [NYU SynthAccess tactile symbol vocabulary](https://github.com/IDMNYU/synthaccess/tree/main/tactileSynthGuides): striped-ring knobs, distinct input/output/bidirectional jack shapes, switches, sliders and buttons. The catalogue includes source-backed controls and layouts for Superlative SB01, Roland V-STAGE 76/88 and the MIDI-equipped Korg ARP 2600 FS. Guide references are attached to the individual profiles. Original pre-MIDI instruments are not added as MIDI devices.

Every profile has a populated schematic surface, including Push 2, MPC2000XL, TR-909, Magic Flute, Skoog, Skwitch and the Soundbeam family. Component views separate external sensors or playing faces for clarity. These simplified drawings do not imply fixed MIDI assignments; configurable and app-dependent controls remain unbound. Layout sources are recorded in each profile's `diagramSources`.

```
devices/
  index.json                      [{ "id": "akai-mpk-mini-mk3", "path": "akai/mpk-mini-mk3" }, …]
  profile.schema.json             JSON Schema (draft 2020-12) for every profile
  manufacturer.schema.json        JSON Schema for company descriptors
  manufacturers.json              complete manufacturer directory index
  midi-manufacturers.json         official SysEx assignments and source snapshot metadata
  <manufacturer>/manufacturer.json company name, description, website, resources and logo source
  <manufacturer>/logo.svg          manufacturer logo shared by its devices
  <manufacturer>/<model>/
    <id>.json                     the device profile
    icon.svg                      copy of the manufacturer logo (stable device asset URL)
    panel.svg                     panel diagram; surface elements are positioned over it
```

The `id` inside each profile must match its filename. Asset paths inside a profile are relative to its folder.

Icons use manufacturer brand artwork, with sources recorded in [resources/manufacturer-logos.json](resources/manufacturer-logos.json). Raster-only sources are traced into SVG paths. Manufacturer logos remain the property of their respective owners. The diagram generator copies each manufacturer's `logo.svg` to its device icons.

Each manufacturer has a catalogue page at its folder URL, such as [`roland/`](https://designerzen.github.io/midi-devices/roland/). It shows a company information panel above every associated product in this catalogue. Product-card manufacturer links and the manufacturer selector open these pages. Company details come from `devices/<manufacturer>/manufacturer.json`, with verified logo paths relative to that folder; builds publish the raw descriptor alongside the page and include its metadata in the JSON/XML API. Manufacturer pages and the selector include entries without device profiles. These pages show official SysEx IDs and an empty device state; registry-only entries omit unverified websites and artwork.

## API

A static, read-only JSON and XML API is generated by `npm run build` and published with the site. Every `.json` endpoint below has an equivalent `.xml` URL, including a unique URL for each device. Generated `links` are absolute URLs; asset fields within profiles remain relative. CORS and HTTP caching depend on the deployment host.

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

For a single query endpoint, run `npm start` (Node 22+) and request `/api/v1/device?id=korg-minilogue&format=json` or `&format=xml` on `http://127.0.0.1:3000`. It serves only the requested device from the generated files. JSON is the default. GitHub Pages serves the static files; the query endpoint requires the Node host. See [query endpoint and XML details](docs/api.md#single-device-query-endpoint).

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
