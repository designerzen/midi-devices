// Regenerates devices/index.json and assembles the static site (registry, API and demo) in dist/.
import { readFileSync } from "node:fs"
import { cp, mkdir, rm, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { MIDI_DEVICE_DIRECTORY, createMidiDeviceStore } from "../index.js"
import { buildApi } from "./api.js"

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const dist = path.join(root, "dist")
const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"))
const siteUrl = process.env.SITE_URL || pkg.homepage
const entries = await createMidiDeviceStore(() => [MIDI_DEVICE_DIRECTORY]).entries()
const index = JSON.stringify(entries, null, "\t") + "\n"

await writeFile(path.join(MIDI_DEVICE_DIRECTORY, "index.json"), index)
await rm(dist, { recursive: true, force: true })
await mkdir(dist, { recursive: true })
await cp(MIDI_DEVICE_DIRECTORY, dist, { recursive: true })
await cp(path.join(root, "site"), dist, { recursive: true })
await cp(path.join(root, "client.js"), path.join(dist, "client.js"))
await writeFile(path.join(dist, ".nojekyll"), "")
const api = await buildApi({
	entries,
	devicesDirectory: MIDI_DEVICE_DIRECTORY,
	outDirectory: dist,
	siteUrl,
	version: pkg.version
})
console.log(
	`Built ${api.devices} devices, ${api.manufacturers} manufacturers and ${api.aliases} MIDI identifiers into dist/ for ${siteUrl}`
)
