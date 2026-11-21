import assert from "node:assert/strict"
import test from "node:test"
import { readFileSync } from "node:fs"
import { MidiSurface, surfaceBindings, encodeMessage, decodeMessage } from "../site/midi-surface.js"

const profile = {
	controls: [{ id: "cutoff", cc: 74, min: 0, max: 127, step: 1 }, { id: "hold", cc: 64, widget: "toggle" }],
	surface: { elements: [{ id: "knob", control: "cutoff", kind: "knob" }, { id: "pedal", control: "hold", kind: "switch" }, { id: "key", kind: "key", message: { type: "note", number: 60 } }, { id: "unknown", kind: "button" }] }
}
const output = () => ({ state: "connected", sent: [], send(packet) { this.sent.push(packet) } })
const setup = (options = {}) => {
	const bindings = surfaceBindings(profile), target = output(), changes = [], errors = []
	return { bindings, target, changes, errors, engine: new MidiSurface({ bindings, output: target, changed: (...args) => changes.push(args), error: error => errors.push(error), ...options }) }
}

test("real catalogue surface IDs resolve to their documented CCs and virtual notes", () => {
	const volca = JSON.parse(readFileSync(new URL("../devices/korg/volca-bass/korg-volca-bass.json", import.meta.url)))
	const bindings = surfaceBindings(volca)
	assert.equal(bindings.find(binding => binding.control === "lfo-rate-knob").message.number, 41)
	assert.ok(bindings.some(binding => binding.message?.type === "note"))
	assert.ok(bindings.some(binding => !binding.message))
})

test("encoding respects explicit channels and all supported channel voice formats", () => {
	assert.deepEqual(encodeMessage({ type: "cc", number: 74 }, 100, 3), [0xb2, 74, 100])
	assert.deepEqual(encodeMessage({ type: "note", number: 36, channel: 10 }, 127, 3), [0x99, 36, 127])
	assert.deepEqual(encodeMessage({ type: "note", number: 36, channel: 10 }, 127, 3, true), [0x89, 36, 0])
	assert.deepEqual(encodeMessage({ type: "pitchBend" }, 8192), [0xe0, 0, 64])
	assert.deepEqual(encodeMessage({ type: "pitchBend" }, 16383), [0xe0, 127, 127])
	assert.deepEqual(encodeMessage({ type: "programChange" }, 12), [0xc0, 12])
	assert.deepEqual(encodeMessage({ type: "channelPressure" }, 90), [0xd0, 90])
	assert.equal(decodeMessage([0xe1, 3, 64]).value, 8195)
	assert.equal(decodeMessage([0x90, 60]), undefined)
	assert.equal(decodeMessage([0xf8]), undefined)
})

test("notes release on their original output/channel, even after routing changes", () => {
	const { engine, bindings, target } = setup()
	engine.press(bindings[2]); engine.press(bindings[2])
	engine.channel = 4
	const other = output(); engine.output = other
	engine.releaseAll(); engine.releaseAll()
	assert.deepEqual(target.sent, [[0x90, 60, 127], [0x80, 60, 0]])
	assert.deepEqual(other.sent, [])
})

test("hardware feedback matches channel/number, handles both note-off forms and never echoes", () => {
	const { engine, bindings, target, changes } = setup()
	engine.receive([0xb1, 74, 90]); engine.receive([0xb0, 73, 90])
	assert.equal(changes.length, 0)
	engine.receive([0xb0, 74, 90]); engine.receive([0x90, 60, 100])
	assert.equal(engine.values.get("knob"), 90)
	assert.equal(engine.values.get("key"), 100)
	engine.receive([0x90, 60, 0]); assert.equal(engine.values.get("key"), 0)
	engine.receive([0x90, 60, 99]); engine.receive([0x80, 60, 20])
	assert.equal(engine.values.get("key"), 0)
	engine.receive([0x90, 60, 99]); engine.receive([0xb0, 123, 0])
	assert.equal(engine.values.get("key"), 0)
	assert.equal(changes.at(-1)[2], "received")
	assert.deepEqual(target.sent, [])
	engine.press(bindings[1]); engine.release("pedal"); engine.press(bindings[1])
	assert.deepEqual(target.sent, [[0xb0, 64, 127], [0xb0, 64, 0]])
})

test("input-only, disconnected, unmapped and meter controls send nothing", () => {
	const { engine, bindings, target } = setup()
	engine.press(bindings[3])
	engine.output = undefined; engine.press(bindings[2])
	engine.receive([0x90, 60, 70]); assert.equal(engine.values.get("key"), 70)
	engine.output = target; target.state = "disconnected"; engine.press(bindings[2])
	target.state = "connected"; engine.set({ ...bindings[0], readOnly: true }, 40)
	assert.deepEqual(target.sent, [])
})

test("ranges, steps and discrete options constrain output; feedback retains actual hardware value", () => {
	const { engine, bindings, target } = setup()
	const stepped = { ...bindings[0], min: 10, max: 90, step: 5 }
	engine.set(stepped, 101); engine.set(stepped, 12); engine.set(stepped, 18)
	assert.deepEqual(target.sent.map(packet => packet[2]), [90, 10, 20])
	engine.set({ ...stepped, options: [{ value: 10 }, { value: 90 }] }, 65)
	assert.equal(target.sent.at(-1)[2], 90)
	engine.receive([0xb0, 74, 99]); assert.equal(engine.values.get("knob"), 99)
})

test("SysEx requires permission and valid bytes, and template feedback is matched exactly", () => {
	const binding = { id: "synth", min: 0, max: 127, message: { type: "sysex", bytes: [240, 125, "value", 247] } }
	binding.messages = [binding.message]
	const { engine, target, errors } = setup({ bindings: [binding] })
	engine.send(binding, 64); assert.equal(errors.length, 1); assert.deepEqual(target.sent, [])
	engine.sysexEnabled = true; engine.send(binding, 64)
	assert.deepEqual(target.sent, [[240, 125, 64, 247]])
	engine.receive([240, 124, 100, 247]); assert.equal(engine.values.get("synth"), 64)
	engine.receive([240, 125, 100, 247]); assert.equal(engine.values.get("synth"), 100)
	assert.throws(() => encodeMessage({ type: "sysex", bytes: [240, 200, 247] }, 1))
})

test("send failures do not claim success or leave partially sent notes held", () => {
	const { engine, bindings, changes, errors, target } = setup()
	let attempts = 0
	target.send = packet => { if (++attempts === 2) throw new Error("disconnected"); target.sent.push(packet) }
	engine.press({ ...bindings[2], messages: [{ type: "note", number: 60 }, { type: "note", number: 61 }] })
	assert.deepEqual(target.sent, [[0x90, 60, 127], [0x80, 60, 0]])
	assert.equal(changes.length, 0); assert.equal(engine.held.size, 0); assert.equal(errors.length, 1)
})
