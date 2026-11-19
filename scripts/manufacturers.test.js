import assert from "node:assert/strict"
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import test from "node:test"
import Ajv from "ajv/dist/2020.js"
import { MIDI_DEVICE_DIRECTORY, createMidiDeviceStore } from "../index.js"
import { buildApi } from "./api.js"
import { readManufacturers } from "./manufacturers.js"

const read = async (relative) => JSON.parse(await readFile(path.join(MIDI_DEVICE_DIRECTORY, relative), "utf8"))

test("every official named SysEx assignment has exactly one manufacturer and retains its official name", async () => {
	const registry = await read("midi-manufacturers.json")
	const companies = readManufacturers(MIDI_DEVICE_DIRECTORY)
	const assigned = new Map()
	for (const company of companies) {
		for (const hex of company.midiManufacturerIds ?? []) {
			assert.match(hex, /^(?:0[1-9A-F]|[1-5][0-9A-F]|00 [0-7][0-9A-F] [0-7][0-9A-F])$/)
			assert.equal(assigned.has(hex), false, `Duplicate owner for ${hex}`)
			assigned.set(hex, company)
		}
	}
	assert.equal(registry.source, "https://midi.org/sysexidtable")
	assert.equal(registry.count, registry.assignments.length)
	assert.equal(assigned.size, registry.count)
	assert.equal(new Set(registry.assignments.map(({ hex }) => hex)).size, registry.count)
	for (const { hex, name, manufacturerId } of registry.assignments) {
		assert.equal(assigned.get(hex)?.id, manufacturerId)
		assert.ok(assigned.get(hex).midiRegistryNames.includes(name))
		assert.notEqual(name, "Reserved")
	}
	for (const { hex } of registry.excluded) assert.equal(assigned.has(hex), false)
	assert.equal(assigned.get("43").id, "yamaha")
	assert.equal(assigned.get("41").id, "roland")
	assert.equal(assigned.get("00 20 6B").id, "arturia")
	assert.equal(assigned.get("00 22 33").id, "midi-manufacturer-00-22-33")
	assert.deepEqual(companies.find(({ id }) => id === "pianodisc").midiManufacturerIds, ["00 00 2A", "00 02 5A"])
})

test("registry-only companies need verified IDs while device manufacturers still require artwork", async () => {
	const validate = new Ajv({ strict: false }).compile(await read("manufacturer.schema.json"))
	const company = await read("apple/manufacturer.json")
	assert.equal(validate(company), true)
	assert.equal(validate({ ...company, registryOnly: false }), false)
	const { midiManufacturerIds, ...withoutId } = company
	assert.equal(validate(withoutId), false)
	assert.equal(validate({ ...company, midiManufacturerIds: ["00", "7E"] }), false)
})

test("API publishes companies without devices and omits unverified logo and website links", async (t) => {
	const temporary = await mkdtemp(path.join(os.tmpdir(), "midi-registry-api-"))
	t.after(() => rm(temporary, { recursive: true, force: true }))
	const directory = path.join(temporary, "devices")
	await mkdir(path.join(directory, "apple"), { recursive: true })
	await writeFile(path.join(directory, "apple/manufacturer.json"), JSON.stringify(await read("apple/manufacturer.json")))
	const output = path.join(temporary, "dist")
	const result = await buildApi({ entries: [], devicesDirectory: directory, outDirectory: output, siteUrl: "https://example.test/", version: "test" })
	assert.deepEqual(result, { devices: 0, manufacturers: 1, aliases: 0 })
	const json = async (file) => JSON.parse(await readFile(path.join(output, "api/v1", file), "utf8"))
	const company = await json("manufacturers/apple.json")
	assert.deepEqual(company.devices, [])
	assert.deepEqual(company.midiManufacturerIds, ["11"])
	assert.equal(company.url, undefined)
	assert.equal(company.logo, undefined)
	assert.equal(company.links.logo, undefined)
	const collection = await json("manufacturers.json")
	assert.equal(collection.count, 1)
	assert.equal(collection.manufacturers[0].count, 0)
	assert.deepEqual(collection.manufacturers[0].deviceIds, [])
	assert.match(await readFile(path.join(output, "api/v1/manufacturers/apple.xml"), "utf8"), /key="midiManufacturerIds"/)
})

test("the raw store exposes both manufacturer indexes without allowing traversal", async () => {
	const store = createMidiDeviceStore(() => [MIDI_DEVICE_DIRECTORY])
	for (const file of ["manufacturers.json", "midi-manufacturers.json"]) {
		const resource = await store.read(file)
		assert.equal(resource.type, "application/json")
		assert.deepEqual(JSON.parse(resource.bytes), await read(file))
	}
	assert.equal(await store.read("../midi-manufacturers.json"), null)
})
