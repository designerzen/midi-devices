import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import path from "node:path"
import test from "node:test"
import { fileURLToPath } from "node:url"
import { MIDI_DEVICE_DIRECTORY, createMidiDeviceStore } from "../index.js"
import { createSchemaValidator, SCHEMA_FILES } from "./schemas.js"

const read = async (file) => JSON.parse(await readFile(path.join(MIDI_DEVICE_DIRECTORY, file), "utf8"))

test("raw catalogue schemas validate the committed data and reject invalid paths and SysEx IDs", async () => {
	const schemas = createSchemaValidator()
	for (const file of ["index.json", "manufacturers.json", "midi-manufacturers.json"]) {
		const check = schemas.getSchema(file.replace(".json", ".schema.json"))
		assert.ok(check(await read(file)), JSON.stringify(check.errors))
	}
	const directory = schemas.getSchema("index.schema.json")
	assert.equal(directory([{ id: "korg-volca-keys", path: "../korg/volca-keys" }]), false)
	assert.equal(directory([{ id: "korg-volca-keys", path: "korg/volca-keys", extra: true }]), false)
	const companies = schemas.getSchema("manufacturers.schema.json")
	assert.equal(companies([{ id: "korg", name: "Korg", midiManufacturerIds: ["42"] }]), true)
	assert.equal(companies([{ id: "korg", name: "Korg", midiManufacturerIds: ["7F"] }]), false)
	const registry = await read("midi-manufacturers.json")
	const check = schemas.getSchema("midi-manufacturers.schema.json")
	assert.equal(check({ ...registry, retrievedAt: "yesterday" }), false)
	assert.equal(check({ ...registry, assignments: [{ hex: "00", name: "Extension marker", manufacturerId: "marker" }] }), false)
})

test("API device schema reuses nested MIDI validation and requires generated absolute links", async () => {
	const schemas = createSchemaValidator()
	const check = schemas.getSchema("api.schema.json#/$defs/device")
	const { $schema, ...raw } = await read("behringer/jt-mini/behringer-jt-mini.json")
	const links = Object.fromEntries(["self", "xml", "profile", "base", "icon", "panel", "manufacturer", "catalogue"]
		.map((key) => [key, `https://example.test/${key}`]))
	const device = { ...raw, manufacturerId: "behringer", links }
	assert.ok(check(device), JSON.stringify(check.errors))
	assert.ok(schemas.getSchema("api.schema.json")(device))
	assert.equal(check({ ...device, links: { ...links, icon: "icon.svg" } }), false)
	assert.equal(check({ ...device, unexpected: true }), false)
	assert.equal(check({ ...device, controls: [{ id: "bad-channel", label: "Cutoff", message: { type: "cc", number: 44, channel: 0 } }] }), false)
	assert.equal(check({ ...device, controls: [{ id: "bad-cc", label: "Cutoff", cc: 128 }] }), false)
	assert.equal(check({ ...device, controls: [{ id: "two-bindings", label: "Cutoff", cc: 44, message: { type: "cc", number: 44 } }] }), false)
})

test("API schemas cover collections, errors and registry-only manufacturers", async () => {
	const schemas = createSchemaValidator()
	const check = schemas.getSchema("api.schema.json")
	const meta = { apiVersion: "v1", dataVersion: "test", generated: "2026-11-21T12:00:00.000Z" }
	assert.equal(check({ ...meta, count: 0, devices: [] }), true)
	assert.equal(check({ ...meta, count: 0, manufacturers: [] }), true)
	assert.equal(check({ ...meta, byId: {}, byName: {}, bySlug: {} }), true)
	assert.equal(check({ ...meta, byId: { port: "../unknown" }, byName: {}, bySlug: {} }), false)
	assert.equal(check({ ...meta, apiVersion: "v2", count: 0, devices: [] }), false)
	assert.equal(check({ error: "Unknown device" }), true)
	const indexLinks = Object.fromEntries(["self", "devices", "device", "manufacturers", "midiManufacturers", "manufacturer", "midi", "ports", "schema", "client"]
		.map((key) => [key, `https://example.test/${key}`]))
	assert.equal(check({ ...meta, count: 0, devices: [], links: indexLinks }), true)
	const { $schema, links: resources, ...raw } = await read("apple/manufacturer.json")
	const links = Object.fromEntries(["self", "xml", "base", "profile", "catalogue"].map((key) => [key, `https://example.test/${key}`]))
	const company = { ...raw, resources, links, devices: [] }
	assert.ok(check(company), JSON.stringify(check.errors))
	const { devices, ...summary } = company
	assert.equal(check({ ...meta, count: 1, manufacturers: [{ ...summary, count: 0, deviceIds: [] }] }), true)
	assert.equal(check({ ...company, registryOnly: false }), false)
	const { midiManufacturerIds, ...withoutIds } = company
	assert.equal(check(withoutIds), false)
	assert.equal(check({ ...company, resources: [{ label: "Invalid", url: "javascript:alert(1)" }] }), false)
})

test("every schema is exposed through package exports and the raw store", async () => {
	const store = createMidiDeviceStore(() => [MIDI_DEVICE_DIRECTORY])
	for (const file of SCHEMA_FILES) {
		assert.equal(fileURLToPath(import.meta.resolve(`midi-devices/${file}`)), path.join(MIDI_DEVICE_DIRECTORY, file))
		const resource = await store.read(file)
		assert.equal(resource.type, "application/json")
		assert.deepEqual(JSON.parse(resource.bytes), await read(file))
	}
	assert.equal(await store.read("../api.schema.json"), null)
	assert.equal(await store.read("unknown.schema.json"), null)
	for (const [file, mime] of [["api.xsd", "application/xml"], ["api.xsl", "application/xslt+xml"]]) {
		assert.equal(fileURLToPath(import.meta.resolve(`midi-devices/${file}`)), path.join(MIDI_DEVICE_DIRECTORY, file))
		const resource = await store.read(file)
		assert.equal(resource.type, mime)
		assert.equal(resource.bytes.toString(), await readFile(path.join(MIDI_DEVICE_DIRECTORY, file), "utf8"))
	}
})
