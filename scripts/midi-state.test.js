import assert from "node:assert/strict"
import test from "node:test"
import { MidiState, noteName, formatValue } from "../site/midi-state.js"

test("notes keep velocity, release and polyphonic pressure per port and channel", () => {
	const state = new MidiState()
	state.receive("a", "Keys", [0x91, 60, 100], 0)
	state.receive("a", "Keys", [0xa1, 60, 40], 1)
	const channel = state.ports.get("a").channels.get(2)
	assert.deepEqual({ ...channel.notes.get(60) }, { number: 60, on: true, velocity: 100, pressure: 40, time: 1 })
	state.receive("a", "Keys", [0x91, 60, 0], 2)
	assert.equal(channel.notes.get(60).on, false)
	state.receive("a", "Keys", [0x91, 62, 90], 3)
	state.receive("a", "Keys", [0xb1, 123, 0], 4)
	assert.equal(channel.notes.get(62).on, false)
})

test("controllers, program, pressure and pitch bend hold their latest value", () => {
	const state = new MidiState()
	for (const data of [[0xb0, 74, 10], [0xb0, 74, 99], [0xc0, 5], [0xd0, 64], [0xe0, 0, 64]]) state.receive("a", "Synth", data, 0)
	const channel = state.ports.get("a").channels.get(1)
	assert.equal(channel.controllers.get(74).value, 99)
	assert.equal(channel.program.value, 5)
	assert.equal(channel.pressure.value, 64)
	assert.equal(channel.pitchBend.value, 8192)
	assert.equal(state.receive("a", "Synth", [0xf0, 1, 0xf7], 0), false)
})

test("clock ticks give a tempo and transport state", () => {
	const state = new MidiState()
	state.receive("a", "Seq", [0xfa], 0)
	for (let tick = 0; tick <= 24; tick++) state.receive("a", "Seq", [0xf8], tick * 500 / 24)
	const clock = state.ports.get("a").clock
	assert.equal(clock.running, true)
	assert.equal(Math.round(clock.bpm), 120)
})

test("expiry drops stale items but keeps held notes", () => {
	const state = new MidiState()
	state.receive("a", "Keys", [0x90, 60, 100], 0)
	state.receive("a", "Keys", [0xb0, 1, 20], 0)
	state.expire(10000, 5000)
	const channel = state.ports.get("a").channels.get(1)
	assert.ok(channel.notes.has(60))
	assert.equal(channel.controllers.size, 0)
	state.receive("a", "Keys", [0x80, 60, 0], 10000)
	state.expire(20000, 5000)
	assert.equal(state.ports.size, 0)
})

test("note names and value formats", () => {
	assert.equal(noteName(60), "C4")
	assert.equal(noteName(61), "C#4")
	assert.equal(formatValue(127, "percent"), "100%")
	assert.equal(formatValue(255, "hex", 16383), "00FF")
	assert.equal(formatValue(10, "hex"), "0A")
})
