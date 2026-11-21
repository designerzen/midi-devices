import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import path from "node:path"
import test from "node:test"
import { MIDI_DEVICE_DIRECTORY } from "../index.js"

const profile = async (manufacturer, model) => JSON.parse(await readFile(
	path.join(MIDI_DEVICE_DIRECTORY, manufacturer, model, `${manufacturer}-${model}.json`), "utf8"
))
const byCC = (device, number, channel) => device.controls.find((control) =>
	(control.cc ?? control.message?.number) === number && control.message?.channel === channel
)

test("Behringer Micro models preserve connector differences and documented controller ranges", async () => {
	const [original, midi, vector, ub1] = await Promise.all([
		profile("behringer", "jt-4000-micro"), profile("behringer", "jt-4000m-micro"),
		profile("behringer", "pro-vs-mini"), profile("behringer", "ub-1-micro")
	])
	assert.equal(original.connections.some(({ label }) => label === "MIDI IN"), false)
	assert.match(midi.connections.find(({ label }) => label === "MIDI IN").connector, /3\.5 mm TS MIDI/)
	assert.equal(byCC(original, 29), undefined)
	assert.equal(byCC(midi, 29).label, "Oscillator balance")
	assert.equal(byCC(vector, 74).max, 99)
	assert.equal(byCC(vector, 5).max, 31)
	assert.equal(byCC(ub1, 7).max, 9)
	assert.equal(byCC(ub1, 14), undefined)
	assert.equal(byCC(ub1, 15), undefined)
})

test("Circuit remote controls retain hardware channel partitions and bounded selection values", async () => {
	const tracks = await profile("novation", "circuit-tracks")
	assert.equal(byCC(tracks, 74, 1).label, "Synth 1: filter frequency")
	assert.equal(byCC(tracks, 74, 2).label, "Synth 2: filter frequency")
	assert.equal(byCC(tracks, 80, 1).id, "synth-1-macro-1")
	for (const number of [8, 18, 44, 50]) assert.equal(byCC(tracks, number, 10).max, 63)
	const rhythm = await profile("novation", "circuit-rhythm")
	for (let channel = 1; channel <= 8; channel++) {
		assert.equal(byCC(rhythm, 14, channel).max, 1)
		assert.equal(byCC(rhythm, 17, channel).min, 1)
		assert.equal(byCC(rhythm, 17, channel).max, 16)
		assert.equal(byCC(rhythm, 21, channel).min, 4)
		assert.equal(byCC(rhythm, 21, channel).max, 124)
	}
})

test("Sample 2 keeps per-part controls separate from its channel-one global reverb", async () => {
	const sample = await profile("korg", "volca-sample2")
	for (const number of [3, 35, 49, 50, 68, 70, 75]) assert.ok(byCC(sample, number))
	assert.equal(byCC(sample, 91, 1).label, "Reverb mix (global, channel 1)")
	assert.equal(byCC(sample, 91), undefined)
	assert.match(sample.notice, /external MIDI processor/)
	assert.match(sample.notice, /send both bytes in order/)
})
