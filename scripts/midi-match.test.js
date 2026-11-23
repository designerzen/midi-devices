import assert from "node:assert/strict"
import test from "node:test"
import { readFileSync } from "node:fs"
import { createMidiMatcher } from "../site/midi-match.js"
import { midiDeviceFolders, MIDI_DEVICE_DIRECTORY } from "../index.js"

const profiles = midiDeviceFolders().map(({ id, path }) => JSON.parse(readFileSync(`${MIDI_DEVICE_DIRECTORY}/${path}/${id}.json`, "utf8")))
const match = createMidiMatcher(profiles)

test("all canonical IDs and declared aliases remain detectable across the full catalogue", () => {
	for (const profile of profiles) {
		assert.equal(match({ id: profile.id }), profile.id)
		for (const name of profile.portNames ?? []) assert.equal(match({ name }), profile.id, name)
	}
})

test("opaque browser IDs use complete model names even without declared port aliases", () => {
	for (const [name, id] of [["KeyStep 37", "arturia-keystep-37"], ["OP–Z", "teenage-engineering-op-z"], ["Circuit Tracks", "novation-circuit-tracks"], ["Nord Stage 4 88", "nord-stage-4-88"], ["Launchkey 37 [MK4]", "novation-launchkey-37-mk4"]]) {
		assert.equal(match({ id: "opaque-browser-id", name }), id, name)
	}
})

test("Windows, macOS and ALSA wrappers retain the complete device identity", () => {
	for (const name of ["2- Arturia KeyStep 37", "MIDIIN2 (Arturia KeyStep 37)", "KeyStep 37 MIDI 1", "KeyStep 37 MIDI Out", "KeyStep 37:KeyStep 37 MIDI 1 20:0"]) {
		assert.equal(match({ name }), "arturia-keystep-37", name)
	}
	assert.equal(match({ name: "MPK mini [MK III]" }), "akai-mpk-mini-mk3")
	assert.equal(match({ name: "MiniLabmkII" }), "arturia-minilab-mkii")
	assert.equal(match({ name: "MIDIIN2 (LPMiniMK3)" }), "novation-launchpad-mini-mk3")
	assert.equal(match({ name: "LPProMK3 MIDI (MIDI 1)" }), "novation-launchpad-pro-mk3")
})

test("model variants, DAW endpoints, virtual ports and generic interfaces are not guessed", () => {
	for (const name of ["Nord Stage 4", "KeyStep 37 mk2", "OP-1 field Virtual", "ArcanaStrum Virtual", "LPX DAW In", "USB MIDI", "MIDIIN2 (USB MIDI)", "Microsoft GS Wavetable Synth", "constructor", "__proto__"]) assert.equal(match({ name }), undefined, name)
	assert.equal(match({ name: "KeyStep 37", manufacturer: "Korg" }), undefined)
	const ambiguous = createMidiMatcher([{ id: "a-25", name: "Shared", manufacturer: "A" }, { id: "a-49", name: "Shared", manufacturer: "A" }])
	assert.equal(ambiguous({ name: "Shared" }), undefined)
})

test("canonical IDs take priority and absent ids arrays still include the canonical ID", () => {
	const match = createMidiMatcher([{ id: "device-one", ids: ["legacy-one"], name: "Device One" }, { id: "device-two", portNames: ["Other"], name: "Device Two" }])
	assert.equal(match({ id: "DEVICE-ONE", name: "Other" }), "device-one")
	assert.equal(match({ id: "legacy-one" }), "device-one")
})
