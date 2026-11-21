// Checks every profile against the schema, that its id matches its filename, that referenced
// assets exist, and that devices/index.json is current.
import { existsSync, readFileSync, readdirSync } from "node:fs"
import path from "node:path"
import Ajv from "ajv/dist/2020.js"
import { MIDI_DEVICE_DIRECTORY, createMidiDeviceStore } from "../index.js"
import { readManufacturers } from "./manufacturers.js"

const read = (file) => JSON.parse(readFileSync(path.join(MIDI_DEVICE_DIRECTORY, file), "utf8"))
const validate = new Ajv({ allErrors: true, strict: false }).compile(read("profile.schema.json"))
const validateManufacturer = new Ajv({ allErrors: true, strict: false }).compile(read("manufacturer.schema.json"))
const errors = []
const entries = await createMidiDeviceStore(() => [MIDI_DEVICE_DIRECTORY]).entries()

for (const { id, path: folder } of entries) {
	const profile = read(`${folder}/${id}.json`)
	const logo = path.join(MIDI_DEVICE_DIRECTORY, folder.split("/")[0], "logo.svg")
	const icon = path.join(MIDI_DEVICE_DIRECTORY, folder, profile.icon ?? "icon.svg")
	if (!existsSync(logo)) errors.push(`${folder}: missing manufacturer logo.svg`)
	else if (existsSync(icon) && !readFileSync(icon).equals(readFileSync(logo))) {
		errors.push(`${folder}: icon must match manufacturer logo.svg`)
	}
	if (!profile.diagrams) errors.push(`${folder}: missing panel, connections and interface diagrams`)
	if (!validate(profile)) {
		errors.push(...validate.errors.map((error) => `${folder}/${id}.json${error.instancePath} ${error.message}`))
	}
	const assets = [profile.icon ?? "icon.svg", profile.surface?.src ?? "panel.svg", ...Object.values(profile.diagrams ?? {})]
	for (const asset of assets) {
		if (!existsSync(path.join(MIDI_DEVICE_DIRECTORY, folder, asset))) {
			errors.push(`${folder}: missing ${asset}`)
		}
	}
	for (const [kind, asset] of Object.entries(profile.diagrams ?? {})) {
		const file = path.join(MIDI_DEVICE_DIRECTORY, folder, asset)
		if (!existsSync(file)) continue
		const svg = readFileSync(file, "utf8")
		const ids = [...svg.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1])
		if (new Set(ids).size !== ids.length) errors.push(`${folder}/${asset}: duplicate SVG element IDs`)
		if (!svg.includes("<title") || !svg.includes("<desc")) errors.push(`${folder}/${asset}: missing accessible title or description`)
		for (const [, colour] of svg.matchAll(/(?:fill|stroke)="([^"]+)"/g)) {
			if (!["#000", "#fff", "none", "currentColor", "url(#tactile-stripes)", "url(#tactile-dots)"].includes(colour)) errors.push(`${folder}/${asset}: non-monochrome colour ${colour}`)
		}
		if (asset === profile.surface?.src) {
			const prefix = svg.includes('data-diagram-style="wireframe"') ? `${id}-panel--surface--` : ""
			for (const element of profile.surface?.elements ?? []) {
				if (!ids.includes(prefix + element.id)) errors.push(`${folder}/${asset}: missing surface element ${element.id}`)
			}
		}
	}
	const controlIds = new Set((profile.controls ?? []).map((control) => control.id))
	for (const element of profile.surface?.elements ?? []) {
		if (element.control && !controlIds.has(element.control)) errors.push(`${folder}: unknown control ${element.control}`)
		const { x, y, width, height } = element.position
		if (x + width > 100.001 || y + height > 100.001) errors.push(`${folder}: surface element ${element.id} exceeds the diagram bounds`)
	}
}

// A JSON file whose id does not match its filename is silently skipped by the loader.
for (const manufacturer of readdirSync(MIDI_DEVICE_DIRECTORY, { withFileTypes: true })) {
	if (!manufacturer.isDirectory()) continue
	const descriptorFile = `${manufacturer.name}/manufacturer.json`
	try {
		const descriptor = read(descriptorFile)
		if (!validateManufacturer(descriptor)) errors.push(...validateManufacturer.errors.map((error) => `${descriptorFile}${error.instancePath} ${error.message}`))
		if (descriptor.id !== manufacturer.name) errors.push(`${descriptorFile}: id must match manufacturer folder`)
		if (descriptor.logo && !existsSync(path.join(MIDI_DEVICE_DIRECTORY, manufacturer.name, descriptor.logo))) errors.push(`${descriptorFile}: missing logo`)
		if (descriptor.registryOnly && entries.some((entry) => entry.path.startsWith(`${manufacturer.name}/`))) errors.push(`${descriptorFile}: registry-only manufacturer has device profiles`)
	} catch (error) {
		errors.push(`${descriptorFile}: ${error.message}`)
	}
	for (const model of readdirSync(path.join(MIDI_DEVICE_DIRECTORY, manufacturer.name), { withFileTypes: true })) {
		if (!model.isDirectory()) continue
		const folder = `${manufacturer.name}/${model.name}`
		if (!entries.some((entry) => entry.path === folder)) {
			errors.push(`${folder}: no profile JSON whose id matches its filename`)
		}
	}
}

const manufacturers = readManufacturers(MIDI_DEVICE_DIRECTORY)
const manufacturerIndex = manufacturers.map(({ id, name, midiManufacturerIds = [] }) => ({ id, name, midiManufacturerIds }))
if (JSON.stringify(read("manufacturers.json")) !== JSON.stringify(manufacturerIndex)) errors.push("devices/manufacturers.json is out of date; run npm run build")
const officialRegistry = read("midi-manufacturers.json")
const owners = new Map()
for (const company of manufacturers) {
	for (const hex of company.midiManufacturerIds ?? []) {
		if (owners.has(hex)) errors.push(`MIDI manufacturer ID ${hex} is assigned to both ${owners.get(hex)} and ${company.id}`)
		owners.set(hex, company.id)
	}
}
const officialIds = new Set()
for (const assignment of officialRegistry.assignments) {
	if (officialIds.has(assignment.hex)) errors.push(`Duplicate official assignment: ${assignment.hex}`)
	officialIds.add(assignment.hex)
	if (owners.get(assignment.hex) !== assignment.manufacturerId) errors.push(`Official assignment ${assignment.hex} is missing or belongs to the wrong manufacturer`)
	const company = manufacturers.find(({ id }) => id === assignment.manufacturerId)
	if (!company?.midiRegistryNames?.includes(assignment.name)) errors.push(`Official name is missing for ${assignment.hex}`)
}
for (const hex of owners.keys()) {
	if (!officialIds.has(hex)) errors.push(`Manufacturer ID ${hex} is not in the official registry snapshot`)
}
if (officialRegistry.count !== officialIds.size) errors.push("Official manufacturer assignment count does not match the snapshot")

const committed = existsSync(path.join(MIDI_DEVICE_DIRECTORY, "index.json")) ? read("index.json") : []
if (JSON.stringify(committed) !== JSON.stringify(entries)) {
	errors.push("devices/index.json is out of date; run npm run build")
}

if (errors.length) {
	console.error(errors.join("\n"))
	process.exit(1)
}
console.log(`${entries.length} device profiles valid`)
