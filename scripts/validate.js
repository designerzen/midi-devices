// Checks every profile against the schema, that its id matches its filename, that referenced
// assets exist, and that devices/index.json is current.
import { existsSync, readFileSync, readdirSync } from "node:fs"
import path from "node:path"
import Ajv from "ajv/dist/2020.js"
import { MIDI_DEVICE_DIRECTORY, createMidiDeviceStore } from "../index.js"

const read = (file) => JSON.parse(readFileSync(path.join(MIDI_DEVICE_DIRECTORY, file), "utf8"))
const validate = new Ajv({ allErrors: true, strict: false }).compile(read("profile.schema.json"))
const errors = []
const entries = await createMidiDeviceStore(() => [MIDI_DEVICE_DIRECTORY]).entries()

for (const { id, path: folder } of entries) {
	const profile = read(`${folder}/${id}.json`)
	if (!validate(profile)) {
		errors.push(...validate.errors.map((error) => `${folder}/${id}.json${error.instancePath} ${error.message}`))
	}
	const assets = [profile.icon ?? "icon.svg", profile.surface?.src ?? "panel.svg"]
	for (const asset of assets) {
		if (!existsSync(path.join(MIDI_DEVICE_DIRECTORY, folder, asset))) {
			errors.push(`${folder}: missing ${asset}`)
		}
	}
}

// A JSON file whose id does not match its filename is silently skipped by the loader.
for (const manufacturer of readdirSync(MIDI_DEVICE_DIRECTORY, { withFileTypes: true })) {
	if (!manufacturer.isDirectory()) continue
	for (const model of readdirSync(path.join(MIDI_DEVICE_DIRECTORY, manufacturer.name))) {
		const folder = `${manufacturer.name}/${model}`
		if (!entries.some((entry) => entry.path === folder)) {
			errors.push(`${folder}: no profile JSON whose id matches its filename`)
		}
	}
}

const committed = existsSync(path.join(MIDI_DEVICE_DIRECTORY, "index.json")) ? read("index.json") : []
if (JSON.stringify(committed) !== JSON.stringify(entries)) {
	errors.push("devices/index.json is out of date; run npm run build")
}

if (errors.length) {
	console.error(errors.join("\n"))
	process.exit(1)
}
console.log(`${entries.length} device profiles valid`)
