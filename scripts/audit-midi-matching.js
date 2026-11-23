import { readFileSync } from "node:fs"
import { midiDeviceFolders, MIDI_DEVICE_DIRECTORY } from "../index.js"
import { createMidiMatcher } from "../site/midi-match.js"

const profiles = midiDeviceFolders().map(({ id, path }) => JSON.parse(readFileSync(`${MIDI_DEVICE_DIRECTORY}/${path}/${id}.json`, "utf8")))
const match = createMidiMatcher(profiles)
const normalise = value => String(value ?? "").trim().toLowerCase()
const oldMatch = name => profiles.find(profile => (profile.portNames ?? []).some(alias => normalise(alias) === normalise(name)))?.id
const checks = profiles.map(profile => ({ id: profile.id, name: profile.name,
	previousExactNameMatch: oldMatch(profile.name) === profile.id,
	completeModelNameMatch: match({ id: "opaque-test-id", name: profile.name }) === profile.id,
	windowsWrapperMatch: match({ id: "opaque-test-id", name: `MIDIIN2 (2- ${profile.name})` }) === profile.id,
	verifiedAliases: profile.portNames?.length ?? 0 }))
const report = {
	profiles: profiles.length,
	profilesWithDeclaredPortNames: checks.filter(check => check.verifiedAliases).length,
	canonicalIdsMatched: profiles.filter(profile => match({ id: profile.id }) === profile.id).length,
	previousExactDisplayNamesMatched: checks.filter(check => check.previousExactNameMatch).length,
	completeDisplayNamesMatched: checks.filter(check => check.completeModelNameMatch).length,
	windowsWrappedDisplayNamesMatched: checks.filter(check => check.windowsWrapperMatch).length,
	note: "Synthetic catalogue consistency checks, not a hardware compatibility test. Opaque/generic interface names and model families may require manual selection.",
	...(process.argv.includes("--details") ? { checks } : {})
}
console.log(JSON.stringify(report, null, 2))
if (report.canonicalIdsMatched !== profiles.length) process.exitCode = 1
