# Device profiles and contributions

Profiles describe hardware independently of any application. The [JSON Schema](../devices/profile.schema.json) is the authoritative field reference. The registry currently includes controllers, synthesizers, drum machines, and grooveboxes; coverage varies by device.

## Reading a profile

| Field | Meaning |
| --- | --- |
| `schemaVersion` | Profile format version; currently `1`, separate from API version |
| `id`, `name`, `manufacturer` | Stable catalogue ID and display names |
| `ids`, `portNames` | Stable application identifiers and documented/observed MIDI port-name aliases; browser IDs may be opaque |
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
2. Create `devices/<manufacturer>/<model>/<id>.json` plus `icon.svg` and `panel.svg`. Use lowercase kebab-case. Copy the manufacturer's `devices/<manufacturer>/logo.svg` to `icon.svg`; icons show manufacturer branding. For a new manufacturer, add its actual logo as SVG paths and record the artwork source in `resources/manufacturer-logos.json`. Add the company descriptor described below; the build uses it for the manufacturer page and API entry.
3. Set `$schema` to `../../profile.schema.json`, `schemaVersion` to `1`, and `id` to the filename without `.json`. Include manufacturer metadata, useful setup notes, controls, and a GUI tree.
4. Only include port aliases observed on hardware or explicitly documented. Do not use generic aliases such as `USB MIDI` that can identify unrelated devices. An empty `portNames` array is preferable to a guessed match.

   The site and JavaScript client also compare unique complete model names when no verified alias matches. Driver wrappers and punctuation can be normalized without adding invented aliases to a profile. Keep model sizes and generations explicit: a family label such as `Nord Stage 4` cannot identify an 88, 73 or Compact variant. Run `npm run audit:midi` (or `node scripts/audit-midi-matching.js --details`) to check every canonical ID and synthetic display-name/Windows-wrapper case. This audit does not verify real driver strings or discover instruments behind a generic DIN interface.
5. Map verified messages only. Explain partial coverage; omit configurable encoders, DAW protocols, NRPN sequences, or SysEx features unless their behavior is verified and representable. Do not infer a device's complete MIDI implementation from its physical controls.
6. Draw original SVG assets and keep surface coordinates aligned with the panel. Clearly identify schematic illustrations. Ensure all asset paths are relative to the profile folder.
7. Run `npm ci`, `npm run build`, and `npm test`. Commit the regenerated `devices/index.json` alongside the profiles. `dist/` is generated output.

Validation checks schema compliance, required panel/icon assets, discoverable profile filenames, and index freshness. Building additionally checks MIDI alias collisions. These checks do not establish that mappings, port aliases, links, or artwork match real hardware: verify those against the sources and, when possible, the device.

For every manufacturer, add `devices/<manufacturer>/manufacturer.json` following [manufacturer.schema.json](../devices/manufacturer.schema.json). Set `$schema` to `../manufacturer.schema.json`, `schemaVersion` to `1`, and `id` to the folder name. Include the display `name`, a brief factual `description`, the official website in `url`, `logo: "logo.svg"`, useful `links` as `{ "label", "url" }` objects, and `logoSource` with the artwork `source` and `format`. A legacy brand may link to its current support provider, with that relationship explained in the description. Avoid unverified corporate details. Validation requires a descriptor for every manufacturer folder.

The build generates `/<manufacturer>/index.html`, showing the descriptor above all its catalogue products. Company JSON and logo links are available from the panel. Manufacturer API responses expose the descriptor's `links` array as `resources`, reserving `links` for generated API, descriptor, logo and catalogue URLs.

## Official manufacturer IDs

The catalogue includes all named assignments in the [MIDI Association SysEx ID table](https://midi.org/sysexidtable), including software producers and historical company names. `devices/midi-manufacturers.json` records the source URL, retrieval time, canonical hex byte strings, exact registered names and linked catalogue manufacturer IDs. It deduplicates repeated table rows and excludes the extension marker and reserved entries. This is a dated snapshot, not a live membership or company-status check.

`midiManufacturerIds` in a manufacturer descriptor contains uppercase, space-separated hex bytes: Yamaha is `43`; Arturia is `00 20 6B`. These identify the manufacturer namespace in SysEx, not a particular model, browser port ID or MIDI channel. A manufacturer can have several IDs. `midiRegistryNames` preserves the official registered names and `midiIdSource` identifies the registry. Existing folder IDs remain stable. A documented name reconciliation in the import script links entries such as Central Music Co. (CME) to the existing catalogue root. Companies without a verified correspondence retain separate records.

New directory entries use `registryOnly: true`; they require official ID metadata and a source link, but may omit `url`, `logo` and `logoSource`. Do not put the registry URL in the company website field or invent brand artwork. When adding device profiles, verify and add the company's website and artwork and remove `registryOnly`. Existing device manufacturers continue to require those fields. `devices/manufacturers.json` indexes all descriptors independently of device coverage.

Run `npm run manufacturers:import` to retrieve the current official table, or `python scripts/import-midi-manufacturers.py --html <saved-official-table.html>` for an offline import. Review the resulting assignments and reconciliation before release, then run `npm run build` and `npm test`. The importer rejects conflicting ID assignments and incomplete tables. It preserves existing company details and does not remove old entries automatically when a later source changes; validation flags stale IDs for review.
