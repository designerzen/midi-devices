import assert from "node:assert/strict"
import test from "node:test"
import { connectedMidiDevices, describeMidiMessage, midiPortDetails, unmatchedDeviceEmail, unmatchedDeviceAgentPrompt, DEVICE_PROFILE_EMAIL } from "../site/midi-connections.js"

const devices = [["arcana-strum", { profile: { name: "Arcana Strum", ids: ["arcana-strum"], portNames: ["ArcanaStrum"] }, devicePath: "arcana/strum" }]]
const port = (id, name = "ArcanaStrum", manufacturer = "Arcana") => ({ id, name, manufacturer, version: "1.0", state: "connected", connection: "closed" })
const access = (inputs, outputs = []) => ({ inputs: new Map(inputs.map((p) => [p.id, p])), outputs: new Map(outputs.map((p) => [p.id, p])) })

test("unmatched device email preserves all port details and safely encodes special characters", () => {
	const ports = [
		{ direction: "Input", port: port("in?&#", "Keys & Pads + α", "Maker & Co") },
		{ direction: "Output", port: port("out-2", "Keys output", "") }
	]
	const email = new URL(unmatchedDeviceEmail(ports))
	assert.equal(email.pathname, "midi@awesomething.co.uk")
	assert.equal(email.searchParams.get("subject"), "Unmatched MIDI device: Keys & Pads + α")
	const body = email.searchParams.get("body")
	for (const entry of ports) {
		for (const [label, value] of midiPortDetails(entry)) assert.ok(body.includes(`${label}: ${value}`))
	}
	assert.ok(body.includes("Manufacturer: Not reported"))
	assert.ok(body.includes("Device model / additional notes:"))
})

test("unreported device details have useful email fallbacks", () => {
	const ports = [{ direction: "Input", port: {} }]
	const email = new URL(unmatchedDeviceEmail(ports))
	assert.equal(email.searchParams.get("subject"), "Unmatched MIDI device: Unnamed MIDI device")
	assert.ok(email.searchParams.get("body").includes("Port ID: Not reported"))
})

test("agent prompt preserves both endpoints as data and routes the completed profile to the catalog address", () => {
	const ports = [
		{ direction: "Input", port: port('in"1', 'Keys <&>\nα', "Maker & Co") },
		{ direction: "Output", port: port("out-2", "Keys output", "") }
	]
	const prompt = unmatchedDeviceAgentPrompt(ports)
	const metadata = JSON.parse(prompt.slice(prompt.indexOf("[\n")))
	assert.deepEqual(metadata, ports.map((entry) => Object.fromEntries(midiPortDetails(entry))))
	assert.ok(prompt.includes(DEVICE_PROFILE_EMAIL))
	assert.equal(new URL(unmatchedDeviceEmail(ports)).pathname, DEVICE_PROFILE_EMAIL)
	assert.ok(prompt.includes("email it as an attachment"))
	assert.ok(prompt.includes("detected port names/directions"))
	assert.ok(prompt.includes("complete addressed email draft"))
})

test("agent prompt investigates missing facts and supplies the profile contract without guessing aliases", () => {
	const prompt = unmatchedDeviceAgentPrompt([{ direction: "Input", port: {} }])
	assert.ok(prompt.includes('"Manufacturer": "Not reported"'))
	assert.ok(prompt.includes("asking me questions in small batches"))
	assert.ok(prompt.includes("ask follow-ups until every required detail is established"))
	assert.ok(prompt.includes("Do not guess"))
	assert.ok(prompt.includes("not stable model identifiers"))
	assert.ok(prompt.includes("configurable or unverified controls unbound"))
	assert.ok(prompt.includes("devices/<manufacturer>/<model>/<id>.json"))
	assert.ok(prompt.includes("devices/profile.schema.json"))
	assert.ok(prompt.includes("manufacturer.schema.json"))
	assert.ok(prompt.includes("run the repository build and tests"))
	assert.deepEqual(JSON.parse(unmatchedDeviceAgentPrompt([]).split("\n\n").at(-1)), [])
})

test("recognized inputs and outputs get a profile and retain all live metadata", () => {
	const input = port("input-1")
	const output = port("output-1")
	const groups = connectedMidiDevices(access([input], [output]), devices)
	assert.equal(groups.length, 1)
	assert.equal(groups[0].id, "arcana-strum")
	assert.equal(groups[0].device.devicePath, "arcana/strum")
	assert.deepEqual(groups[0].ports.map((p) => [p.direction, p.port]), [["Input", input], ["Output", output]])
})

test("unmatched and output-only devices remain visible even with no catalog", () => {
	const unknown = port("unknown", "USB controller", "Other manufacturer")
	const output = port("out", "External synth", "")
	const groups = connectedMidiDevices(access([unknown], [output]), [])
	assert.equal(groups.length, 2)
	assert.equal(groups[0].id, undefined)
	assert.equal(groups[0].ports[0].port, unknown)
	assert.equal(groups[1].ports[0].direction, "Output")
})

test("duplicate names are not discarded and disconnected ports are removed", () => {
	const disconnected = { ...port("gone"), state: "disconnected" }
	const midi = access([port("in-1"), port("in-2"), disconnected], [port("out-1"), port("out-2")])
	const groups = connectedMidiDevices(midi, devices)
	assert.equal(groups.length, 2)
	assert.deepEqual(groups.map((g) => g.ports.map((p) => p.port.id)), [["in-1", "out-1"], ["in-2", "out-2"]])
	midi.inputs.delete("in-1")
	midi.outputs.delete("out-1")
	assert.equal(connectedMidiDevices(midi, devices).length, 1)
})

test("manual profile selection enriches unknown ports without changing their metadata", () => {
	const input = port("unverified", "Unverified port", "")
	const midi = access([input])
	const assignments = new Map([["Input:unverified", "arcana-strum"]])
	assert.equal(connectedMidiDevices(midi, devices, assignments)[0].id, "arcana-strum")
	assert.equal(connectedMidiDevices(midi, devices, assignments)[0].ports[0].port, input)
	assignments.clear()
	assert.equal(connectedMidiDevices(midi, devices, assignments)[0].id, undefined)
})

test("matching stays exact and IDs take priority over aliases", () => {
	const input = port("ARCANA-STRUM", "Different name")
	assert.equal(connectedMidiDevices(access([input]), devices)[0].id, "arcana-strum")
	assert.equal(connectedMidiDevices(access([port("opaque", "ArcanaStrum Virtual")]), devices)[0].id, undefined)
})

test("incoming monitor describes channel, note, controller and system messages", () => {
	assert.equal(describeMidiMessage([0x92, 60, 100]), "Ch 3 · Note on · C4 (60) · velocity 100")
	assert.equal(describeMidiMessage([0x90, 60, 0]), "Ch 1 · Note off · C4 (60) · velocity 0")
	assert.equal(describeMidiMessage([0x81, 60, 40]), "Ch 2 · Note off · C4 (60) · velocity 40")
	assert.equal(describeMidiMessage([0xBF, 74, 127]), "Ch 16 · CC 74 · value 127")
	assert.match(describeMidiMessage([0xA0, 60, 90]), /Poly pressure/)
	assert.match(describeMidiMessage([0xC0, 10]), /Program change/)
	assert.match(describeMidiMessage([0xD0, 80]), /Channel pressure/)
	assert.equal(describeMidiMessage([0xE0, 0, 64]), "Ch 1 · Pitch bend · value 8192")
	assert.equal(describeMidiMessage([0xF0, 0, 32, 41, 0xF7]), "SysEx")
	assert.equal(describeMidiMessage([0xF8]), "Clock")
	assert.equal(describeMidiMessage([0xFA]), "Start")
	assert.equal(describeMidiMessage([0xFC]), "Stop")
	assert.equal(describeMidiMessage([0xFE]), "Active sensing")
	assert.equal(describeMidiMessage([]), "Empty MIDI message")
})
