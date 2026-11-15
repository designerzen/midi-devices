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

## Using the data

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
