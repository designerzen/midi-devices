const normalise = value => String(value ?? "").trim().toLowerCase()

// Compare complete model names, retaining every generation/size qualifier.
export const midiModelKey = value => normalise(value).normalize("NFKC")
	.replace(/mk\s*(iii|ii|iv|i|[1-9]\d*)\b/g, (_, version) => `mk${({ i: 1, ii: 2, iii: 3, iv: 4 })[version] ?? version}`)
	.replace(/[^\p{L}\p{N}]+/gu, "")

function portNames(value) {
	const names = new Set()
	let name = String(value ?? "").trim()
	const wrapper = name.match(/^(?:midi(?:in|out)\d*|(?:midi\s+)?(?:input|output))\s*\((.+)\)$/i)
	if (wrapper) name = wrapper[1]
	name = name.replace(/^\d+\s*-\s*/, "").replace(/\s+\d+:\d+$/, "").trim()
	names.add(name)
	// ALSA often includes both the client and endpoint, separated by a colon.
	if (name.includes(":")) names.add(name.slice(name.indexOf(":") + 1).trim())
	for (const value of [...names]) {
		const base = value.replace(/(?:[\s:_-]+)(?:(?:midi\s*)?(?:in|out|input|output)|midi|port)(?:\s*[-:]?\s*\d+)?$/i, "").trim()
		names.add(base)
	}
	return [...names].filter(Boolean)
}

const keys = value => portNames(value).map(midiModelKey).filter(Boolean)
const unique = entries => entries.size === 1 ? [...entries][0] : undefined

export function createMidiMatcher(profiles) {
	const devices = [...profiles]
	const ids = new Map(), aliases = new Map(), wrappedAliases = new Map(), models = new Map()
	const add = (map, key, id) => {
		if (!key) return
		if (!map.has(key)) map.set(key, new Set())
		map.get(key).add(id)
	}
	const brands = new Map()
	for (const profile of devices) {
		for (const id of new Set([profile.id, ...(profile.ids ?? [])])) add(ids, normalise(id), profile.id)
		for (const alias of profile.portNames ?? []) {
			add(aliases, normalise(alias), profile.id)
			for (const key of keys(alias)) add(wrappedAliases, key, profile.id)
		}
		const brand = midiModelKey(profile.manufacturer)
		brands.set(profile.id, brand)
		const fullName = midiModelKey(profile.name)
		add(models, fullName, profile.id)
		if (brand && fullName.startsWith(brand)) add(models, fullName.slice(brand.length), profile.id)
		// Canonical IDs often contain the brand even when the display name does not.
		const id = midiModelKey(profile.id)
		add(models, id, profile.id)
		if (brand && id.startsWith(brand)) add(models, id.slice(brand.length), profile.id)
	}
	return port => {
		const byId = ids.get(normalise(port.id))
		if (byId) return unique(byId)
		const exact = aliases.get(normalise(port.name))
		if (exact) return unique(exact)
		const candidates = keys(port.name)
		const collect = map => new Set(candidates.flatMap(key => [...(map.get(key) ?? [])]))
		const verified = collect(wrappedAliases)
		if (verified.size) return unique(verified)
		const matches = collect(models)
		if (matches.size !== 1) return
		const id = unique(matches), brand = brands.get(id), reported = midiModelKey(port.manufacturer)
		// Manufacturer data is optional, but a conflicting manufacturer is not a match.
		if (reported && brand && !brand.includes(reported) && !reported.includes(brand)) return
		if (!reported && candidates.every(key => key.length < 3 || ["piano", "keyboard", "controller", "midi", "usb", "device", "drum", "synth"].includes(key))) return
		return id
	}
}
