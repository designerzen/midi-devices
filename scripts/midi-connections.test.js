import assert from "node:assert/strict"
import test from "node:test"
import { connectedMidiDevices, describeMidiMessage } from "../site/midi-connections.js"

const devices = [["arcana-strum", { profile: { name: "Arcana Strum", ids: ["arcana-strum"], portNames: ["ArcanaStrum"] }, devicePath: "arcana/strum" }]]
const port = (id, name = "ArcanaStrum", manufacturer = "Arcana") => ({ id, name, manufacturer, version: "1.0", state: "connected", connection: "closed" })
const access = (inputs, outputs = []) => ({ inputs: new Map(inputs.map((p) => [p.id, p])), outputs: new Map(outputs.map((p) => [p.id, p])) })

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
