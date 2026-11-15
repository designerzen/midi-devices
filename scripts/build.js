// Regenerates devices/index.json and assembles the static site (registry + demo) in dist/.
import { cp, mkdir, rm, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { MIDI_DEVICE_DIRECTORY, createMidiDeviceStore } from "../index.js"

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const dist = path.join(root, "dist")
const index = JSON.stringify(await createMidiDeviceStore(() => [MIDI_DEVICE_DIRECTORY]).entries(), null, "\t") + "\n"

await writeFile(path.join(MIDI_DEVICE_DIRECTORY, "index.json"), index)
await rm(dist, { recursive: true, force: true })
await mkdir(dist, { recursive: true })
await cp(MIDI_DEVICE_DIRECTORY, dist, { recursive: true })
await cp(path.join(root, "site"), dist, { recursive: true })
await writeFile(path.join(dist, ".nojekyll"), "")
console.log(`Built ${JSON.parse(index).length} devices into ${path.relative(root, dist)}/`)
