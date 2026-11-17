# Device profiles and contributions

Profiles describe hardware independently of any application. The [JSON Schema](../devices/profile.schema.json) is the authoritative field reference. The registry currently includes controllers, synthesizers, drum machines, and grooveboxes; coverage varies by device.

## Reading a profile

| Field | Meaning |
| --- | --- |
| `schemaVersion` | Profile format version; currently `1`, separate from API version |
| `id`, `name`, `manufacturer` | Stable catalogue ID and display names |
| `ids`, `portNames` | Known application identifiers and exact MIDI port-name aliases |
| `documentation`, `productUrl` | Sources for hardware behavior and setup |
| `abilities`, `hardwareControls` | Human-readable capabilities and physical controls |
| `notice` | Connection instructions, mode requirements, omissions, and mapping caveats |
| `controls` | Named MIDI mappings with optional widget hints |
| `gui` | Declarative UI tree for applications that choose to render it |
| `surface` | Panel image, intrinsic dimensions, and positioned interactive elements |

A control has either `cc` or `message`, never both. `cc: 1` is shorthand for a control-change mapping; a message can describe `cc`, `note`, `pitchBend`, `programChange`, `channelPressure`, or `sysex`. Explicit message channels use **1–16**, while MIDI status bytes encode channels as 0–15. CC and note numbers use 0–127. Pitch bend uses 0–16383 with a center of 8192. Rendering hints do not send MIDI by themselves.

```json
{
  "id": "modulation",
  "label": "Modulation",
  "cc": 1,
  "widget": "slider"
}
```

Surface positions are percentages of the image width and height, measured from its top-left corner. An element can refer to a control by ID or carry its own message. `learnable` indicates that an application may offer reassignment. Schematic diagrams are illustrations, and virtual note numbers may require octave adjustment or MIDI learn. Read the notice before treating a mapping as a factory hardware assignment.

## Adding a device or manufacturer

`python scripts/generate-diagrams.py` applies the [NYU SynthAccess tactile symbol vocabulary](https://github.com/IDMNYU/synthaccess/tree/ee1ef12cec3a3fb6be59a7861f7df8848be2dafe/tactileSynthGuides) to device layouts. Hollow hexagons identify inputs, striped hexagons outputs, dotted squares bidirectional jacks, and striped rings knobs. Buttons, two/three-way switches and slider tracks retain distinct shapes. These are original monochrome schematic drawings; upstream PDF artwork and braille are not embedded, and the layouts are not certified tactile print masters. New source inventories belong to the exact MIDI-capable model, with manufacturer documentation verifying any model-specific additions and MIDI assignments.

Surface `kind` preserves physical types such as `switch`, `switch3`, `input`, `output`, `bidirectional`, `jack`, `power`, `wheel`, `joystick`, `screen` and `horizontal-strip`, as well as the original key/pad/button/knob/fader types. Consumers should provide an unbound display fallback for unfamiliar kinds. A physical surface element only has a MIDI binding when its `control` or `message` field supplies one. Existing partial profiles without detailed layout inventories retain their documented virtual surfaces.

1. Consult the manufacturer's manual and MIDI implementation chart. Add direct source links to `documentation`; record firmware, mode, and configurable assignments in `notice` when relevant.
2. Create `devices/<manufacturer>/<model>/<id>.json` plus `icon.svg` and `panel.svg`. Use lowercase kebab-case. A new manufacturer needs no separate registration: its folder and profile metadata create the manufacturer API entry at build time.
3. Set `$schema` to `../../profile.schema.json`, `schemaVersion` to `1`, and `id` to the filename without `.json`. Include manufacturer metadata, useful setup notes, controls, and a GUI tree.
4. Only include port aliases observed on hardware or explicitly documented. Do not use generic aliases such as `USB MIDI` that can identify unrelated devices. An empty `portNames` array is preferable to a guessed match.
5. Map verified messages only. Explain partial coverage; omit configurable encoders, DAW protocols, NRPN sequences, or SysEx features unless their behavior is verified and representable. Do not infer a device's complete MIDI implementation from its physical controls.
6. Draw original SVG assets and keep surface coordinates aligned with the panel. Clearly identify schematic illustrations. Ensure all asset paths are relative to the profile folder.
7. Run `npm ci`, `npm run build`, and `npm test`. Commit the regenerated `devices/index.json` alongside the profiles. `dist/` is generated output.

Validation checks schema compliance, required panel/icon assets, discoverable profile filenames, and index freshness. Building additionally checks MIDI alias collisions. These checks do not establish that mappings, port aliases, links, or artwork match real hardware: verify those against the sources and, when possible, the device.
